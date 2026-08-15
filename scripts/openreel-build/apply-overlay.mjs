import { readFileSync, writeFileSync } from "node:fs";

const root = process.argv[2];
const mainPath = `${root}/apps/web/src/main.tsx`;

// ---- main.tsx (skip service worker when embedded in studio) ----
let main = readFileSync(mainPath, "utf8");
if (!main.includes("get(\"studio\")")) {
  main = main.replace(
    'registerServiceWorker().then((registration) => {\n  if (registration) {\n  }\n});',
    'if (new URLSearchParams(window.location.search).get("studio") !== "1") {\n  registerServiceWorker().then((registration) => {\n    if (registration) {\n    }\n  });\n}'
  );
  writeFileSync(mainPath, main);
}

console.log("openreel overlay applied");
