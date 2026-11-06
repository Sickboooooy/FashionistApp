#!/usr/bin/env bash
# Revisa una composición con `check` y saca fotogramas clave con `snapshot`.
# check/snapshot solo aceptan un proyecto con index.html, así que la composición se
# monta en una carpeta temporal. Uso: scripts/revisar.sh vogue
set -euo pipefail
cd "$(dirname "$0")/.."
export HYPERFRAMES_NO_TELEMETRY=1
id="${1:?uso: scripts/revisar.sh <id>}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cp -R assets hyperframes.json "$tmp"/
cp "$id.html" "$tmp/index.html"
mkdir -p "renders/snapshots/$id"
# check sale con código 1 si hay errores: se guarda el JSON completo, se resumen los
# errores y advertencias, y se continúa con el snapshot igualmente.
npx --yes hyperframes@0.9.17 check "$tmp" --json > "renders/check-$id.json" || true
node -e '
const d = require(process.argv[1]); const out = [];
(function w(x) {
  if (Array.isArray(x)) return x.forEach(w);
  if (x && typeof x === "object") {
    if (["error", "warning"].includes(x.severity)) out.push(`${x.severity} ${x.code || ""} ${x.selector || x.elementId || ""} ${String(x.message || "").slice(0, 140)}`);
    Object.values(x).forEach(w);
  }
})(d);
console.log("ok:", d.ok); console.log(out.join("\n") || "sin errores ni advertencias");
' "$PWD/renders/check-$id.json"
npx --yes hyperframes@0.9.17 snapshot "$tmp" --at 0,1.25,1.85,3.6,5.3,5.95 -o "renders/snapshots/$id"
ls "renders/snapshots/$id"
