#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OR="$ROOT/vendor/openreel-video"
OVERLAY="$ROOT/scripts/openreel-build"

cd "$OR"

echo "==> installing deps"
pnpm install

echo "==> building wasm"
pnpm build:wasm

echo "==> applying studio overlay"
node "$OVERLAY/apply-overlay.mjs" "$OR"

echo "==> building web (base /openreel-editor/)"
pnpm --filter @openreel/web build --base=/openreel-editor/

echo "==> injecting standalone overlay script into HTML"
node "$OVERLAY/inject-overlay.mjs" "$OR/apps/web/dist" "$OVERLAY/overlay/studio-overlay.js"

echo "==> copying dist into SpikeClip"
mkdir -p "$ROOT/apps/web/public/openreel-editor"
rm -rf "$ROOT/apps/web/public/openreel-editor/"*
cp -r "$OR/apps/web/dist/." "$ROOT/apps/web/public/openreel-editor/"

echo "==> reverting submodule to clean upstream"
cd "$OR"
git checkout -- .

echo "==> done. Editor at apps/web/public/openreel-editor (index.html served at /openreel-editor/)"
