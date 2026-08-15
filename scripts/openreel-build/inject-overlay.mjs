/**
 * Post-build: injects the standalone studio-overlay.js into the OpenReel editor's index.html.
 * Usage: node inject-overlay.mjs <dist-dir> <overlay-script-path>
 */
import { readFileSync, writeFileSync } from "node:fs";

const distDir = process.argv[2];
const overlayPath = process.argv[3];

if (!distDir || !overlayPath) {
  console.error("Usage: node inject-overlay.mjs <dist-dir> <overlay-script-path>");
  process.exit(1);
}

const htmlPath = `${distDir}/index.html`;
const html = readFileSync(htmlPath, "utf8");
const overlayScript = readFileSync(overlayPath, "utf8");

if (html.includes("SpikeClip studio overlay")) {
  console.log("overlay already injected, skipping");
  process.exit(0);
}

const injected = html.replace(
  "</body>",
  `<script>/* SpikeClip studio overlay */\n${overlayScript}\n</script>\n</body>`
);

writeFileSync(htmlPath, injected);
console.log("overlay injected into", htmlPath);
