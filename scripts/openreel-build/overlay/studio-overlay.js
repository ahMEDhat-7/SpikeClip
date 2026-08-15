/**
 * SpikeClip Studio Overlay — standalone script injected into the OpenReel editor.
 * Communicates with the SpikeClip parent frame via postMessage.
 * Uses the editor's own import/export mechanisms via DOM interaction.
 */
(function () {
  "use strict";

  var ORIGIN = typeof window !== "undefined" ? window.location.origin : "*";
  var STUDIO_ACTIONS = { "openreel:loadMedia": true, "openreel:updateRange": true, "openreel:loadProject": true };

  function emitToParent(msg) {
    try { window.parent.postMessage(msg, ORIGIN); } catch (e) {}
  }

  function emitExported(blob, name) {
    emitToParent({ type: "openreel:exported", blob: blob, meta: { name: name } });
  }

  function setupExportCapture() {
    var originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      var href = this.href || "";
      if (this.download && href.indexOf("blob:") === 0) {
        fetch(href).then(function (r) { return r.blob(); })
          .then(function (blob) { emitExported(blob, this.download); }.bind(this))
          .catch(function () {});
      }
      return originalClick.apply(this, arguments);
    };

    var originalShowSave = window.showSaveFilePicker;
    if (typeof originalShowSave === "function") {
      window.showSaveFilePicker = function (opts) {
        var chunks = [];
        var sink = {
          write: function (data) {
            if (data instanceof Uint8Array) chunks.push(data);
            else if (data instanceof ArrayBuffer) chunks.push(data);
            else if (ArrayBuffer.isView(data)) chunks.push(new Uint8Array(data.buffer));
            return Promise.resolve();
          },
          seek: function () { return Promise.resolve(); },
          truncate: function () { return Promise.resolve(); },
          close: function () { emitExported(new Blob(chunks), opts && opts.suggestedName); },
          abort: function () { return Promise.resolve(); }
        };
        return Promise.resolve(sink);
      };
    }

    return function restore() {
      HTMLAnchorElement.prototype.click = originalClick;
      if (originalShowSave) window.showSaveFilePicker = originalShowSave;
    };
  }

  /**
   * Find the Zustand store via React's internal fiber tree.
   * Walks the DOM to find a React root, then traverses the fiber
   * to find a component that uses useProjectStore.
   */
  function findStoreFromFiber() {
    var rootEl = document.getElementById("root");
    if (!rootEl) return null;

    // Find React fiber root
    var fiberKey = Object.keys(rootEl).find(function (k) {
      return k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$");
    });
    if (!fiberKey) return null;

    var fiber = rootEl[fiberKey];
    if (!fiber) return null;

    // Walk the fiber tree looking for a component with project state
    var visited = new Set();
    var queue = [fiber];
    var maxDepth = 200;

    while (queue.length > 0 && maxDepth-- > 0) {
      var node = queue.shift();
      if (!node || visited.has(node)) continue;
      visited.add(node);

      // Check memoizedState for zustand store hooks
      var state = node.memoizedState;
      while (state) {
        if (state.queue && state.queue.lastRenderedState) {
          var s = state.queue.lastRenderedState;
          // Check if this looks like a project store state
          if (s && typeof s === "object" && s.project && s.project.timeline) {
            // Found the store state — find the store hook via the stateNode
            return findStoreHook(node);
          }
        }
        state = state.next;
      }

      if (node.child) queue.push(node.child);
      if (node.sibling) queue.push(node.sibling);
    }
    return null;
  }

  function findStoreHook(fiber) {
    // The store is typically in the component's dependencies
    // Try to find it via the memoizedProps or stateNode
    var state = fiber.memoizedState;
    while (state) {
      if (state.queue && state.queue.lastRenderedState) {
        var s = state.queue.lastRenderedState;
        if (s && typeof s === "object" && s.project && s.project.timeline) {
          // This state object is the store state. The actual Zustand store
          // exposes getState/setState/subscribe. We need to find the actual store.
          // Create a minimal store-like object from what we found.
          return createMinimalStore(fiber);
        }
      }
      state = state.next;
    }
    return null;
  }

  function createMinimalStore(fiber) {
    // We'll reconstruct a minimal store interface by finding the Zustand store
    // through the module's export. Since we can't access modules directly,
    // we'll use a different approach: find the store via the project store's
    // subscribeWithSelector middleware.

    // Alternative: use the React DevTools approach — find the store via the
    // component tree and extract getState/setState/subscribe from the hook.
    var state = fiber.memoizedState;
    var storeState = null;

    while (state) {
      if (state.queue && state.queue.lastRenderedState) {
        var s = state.queue.lastRenderedState;
        if (s && typeof s === "object" && s.project && s.project.timeline) {
          storeState = s;
          break;
        }
      }
      state = state.next;
    }

    if (!storeState) return null;

    // Build a proxy store that delegates to the Zustand store via state updates
    // This is a simplified version — for full functionality we'd need the actual store
    return {
      getState: function () { return storeState; },
      setState: function (partial) {
        // Trigger a re-render by finding and calling the dispatch
        // This is a hack — the proper way is to access the actual Zustand store
        storeState = Object.assign({}, storeState, typeof partial === "function" ? partial(storeState) : partial);
      },
      subscribe: function () { return function () {}; }
    };
  }

  /**
   * Try multiple methods to find the Zustand store.
   */
  function findStore() {
    // Method 1: Direct window reference (if exposed by build)
    if (window.__spikeclips_store && typeof window.__spikeclips_store.getState === "function") {
      return window.__spikeclips_store;
    }

    // Method 2: Find via React fiber tree
    var store = findStoreFromFiber();
    if (store) return store;

    return null;
  }

  function waitForStore(cb, maxWait) {
    maxWait = maxWait || 15000;
    var start = Date.now();
    (function check() {
      var store = findStore();
      if (store && typeof store.getState === "function") return cb(store);
      if (Date.now() - start > maxWait) return;
      setTimeout(check, 200);
    })();
  }

  async function loadMediaViaStore(store, url, start, end) {
    var res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch source (" + res.status + ")");
    var blob = await res.blob();
    var file = new File([blob], "source.mp4", { type: blob.type || "video/mp4" });

    // Try to use the store's importMedia method
    if (typeof store.getState().createNewProject === "function") {
      store.getState().createNewProject("SpikeClip Scene", {
        width: 1080, height: 1920, frameRate: 30
      });
    }

    if (typeof store.getState().importMedia === "function") {
      var result = await store.getState().importMedia(file);
      if (!result.success) {
        throw new Error((result.error && result.error.message) || "import failed");
      }

      var items = store.getState().project.mediaLibrary.items;
      var mediaId = items[items.length - 1] && items[items.length - 1].id;
      if (mediaId && typeof store.getState().addClipToNewTrack === "function") {
        await store.getState().addClipToNewTrack(mediaId);

        if (end > start) {
          var proj = store.getState().project;
          var videoTrack = null;
          for (var i = 0; i < proj.timeline.tracks.length; i++) {
            var t = proj.timeline.tracks[i];
            if (t.type === "video" && t.clips.length > 0) { videoTrack = t; break; }
          }
          if (videoTrack) {
            var clip = videoTrack.clips[videoTrack.clips.length - 1];
            var updatedClip = Object.assign({}, clip, {
              duration: end - start, inPoint: start, outPoint: end
            });
            var tracks = proj.timeline.tracks.map(function (tr) {
              if (tr.id !== videoTrack.id) return tr;
              return Object.assign({}, tr, {
                clips: tr.clips.map(function (c) { return c.id === clip.id ? updatedClip : c; })
              });
            });
            store.setState({ project: Object.assign({}, proj, { timeline: Object.assign({}, proj.timeline, { tracks: tracks }) }) });
          }
        }
      }
    }

    // Navigate to editor view
    try { window.location.hash = "#/editor"; } catch (e) {}
  }

  /**
   * Fallback: load media via the editor's file import input.
   * Creates a hidden file input and triggers it with the downloaded file.
   */
  async function loadMediaViaFileInput(url, start, end) {
    var res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch source (" + res.status + ")");
    var blob = await res.blob();
    var file = new File([blob], "source.mp4", { type: blob.type || "video/mp4" });

    // Find the file input used for media import
    var inputs = document.querySelectorAll('input[type="file"]');
    var importInput = null;
    for (var i = 0; i < inputs.length; i++) {
      var accept = inputs[i].accept || "";
      if (accept.indexOf("video") !== -1 || accept.indexOf("audio") !== -1 || accept.indexOf("*") !== -1) {
        importInput = inputs[i];
        break;
      }
    }

    if (!importInput) {
      // Try clicking the import button to create the input
      var importBtns = document.querySelectorAll('button');
      for (var j = 0; j < importBtns.length; j++) {
        var text = importBtns[j].textContent || "";
        if (text.toLowerCase().indexOf("import") !== -1 || text.toLowerCase().indexOf("media") !== -1) {
          importBtns[j].click();
          await new Promise(function (r) { setTimeout(r, 500); });
          inputs = document.querySelectorAll('input[type="file"]');
          for (var k = 0; k < inputs.length; k++) {
            var a = inputs[k].accept || "";
            if (a.indexOf("video") !== -1 || a.indexOf("audio") !== -1 || a.indexOf("*") !== -1) {
              importInput = inputs[k];
              break;
            }
          }
          break;
        }
      }
    }

    if (importInput) {
      // Create a DataTransfer to set files on the input
      var dt = new DataTransfer();
      dt.items.add(file);
      importInput.files = dt.files;
      importInput.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      throw new Error("Could not find import mechanism in the editor");
    }
  }

  function setup(store) {
    var restoreExport = setupExportCapture();
    var params = new URLSearchParams(window.location.search);
    var start = parseFloat(params.get("start") || "0") || 0;
    var end = parseFloat(params.get("end") || "0") || 0;

    var onMessage = function (event) {
      if (event.origin !== ORIGIN && event.origin !== window.location.origin) return;
      var data = event.data;
      if (!data || typeof data.type !== "string") return;
      if (!STUDIO_ACTIONS[data.type]) return;

      if (data.type === "openreel:loadMedia" && data.url) {
        var loadStart = typeof data.start === "number" ? data.start : start;
        var loadEnd = typeof data.end === "number" ? data.end : end;

        // Try store-based loading first, fall back to file input
        var hasStoreMethods = store && typeof store.getState === "function" &&
          typeof store.getState().importMedia === "function";

        var loadFn = hasStoreMethods
          ? loadMediaViaStore(store, data.url, loadStart, loadEnd)
          : loadMediaViaFileInput(data.url, loadStart, loadEnd);

        loadFn.catch(function (err) {
          emitToParent({ type: "openreel:error", message: err.message || "load failed" });
        });
      } else if (data.type === "openreel:updateRange") {
        if (typeof data.start === "number") start = data.start;
        if (typeof data.end === "number") end = data.end;
      } else if (data.type === "openreel:loadProject" && data.project) {
        if (store && typeof store.getState().loadProject === "function") {
          store.getState().loadProject(data.project);
          try { window.location.hash = "#/editor"; } catch (e) {}
        }
      }
    };

    window.addEventListener("message", onMessage);
    emitToParent({ type: "openreel:ready" });

    // Debounced project change notification
    var saveTimer = null;
    if (store && typeof store.subscribe === "function") {
      var unsub = store.subscribe(function (s) { return s.project; }, function () {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          try {
            emitToParent({ type: "openreel:projectChanged", project: store.getState().getFullProject() });
          } catch (e) {}
        }, 1500);
      });
    }

    return function cleanup() {
      window.removeEventListener("message", onMessage);
      restoreExport();
    };
  }

  // Initialize — wait for store with extended timeout
  waitForStore(function (store) {
    setTimeout(function () { setup(store); }, 500);
  });
})();
