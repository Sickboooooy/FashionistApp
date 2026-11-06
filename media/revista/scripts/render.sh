#!/usr/bin/env bash
# Renderiza las 5 composiciones de Revista y deja en client/public/videos/revista/
# un MP4 ligero (H.264, sin audio, faststart) y su imagen fija (1.25 s) por plantilla.
# Requiere ffmpeg. Ajusta QP si algún video pasa de 500 KB (por defecto 28; más alto, más ligero).
#
# Bucle sin salto: el render intermedio es sin pérdida (--crf 0) y la recodificación usa QP
# constante con un fotograma clave también en el último fotograma (5.96 s). Así el primero y
# el último se codifican igual. Con CRF, el fondo oscuro de Anna quedaba en SSIM 0.96.
set -euo pipefail
cd "$(dirname "$0")/.."
export HYPERFRAMES_NO_TELEMETRY=1

DESTINO=../../client/public/videos/revista
QP="${QP:-28}"
mkdir -p renders "$DESTINO"

for id in vogue elle bazaar vanity anna; do
  npx --yes hyperframes@0.9.17 render -c "$id.html" --crf 0 --fps 30 -o "renders/$id.mp4"
  ffmpeg -nostdin -loglevel error -y -i "renders/$id.mp4" -an -c:v libx264 -preset slow -qp "$QP" \
    -force_key_frames 0,5.96 -pix_fmt yuv420p -movflags +faststart "$DESTINO/$id.mp4"
  ffmpeg -nostdin -loglevel error -y -ss 1.25 -i "$DESTINO/$id.mp4" -frames:v 1 -q:v 3 "$DESTINO/$id.jpg"
  echo "listo: $id"
done
ls -l "$DESTINO"
