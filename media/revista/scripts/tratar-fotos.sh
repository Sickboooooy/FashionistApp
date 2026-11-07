#!/usr/bin/env bash
# Recorta las fotos de products/ (oculta ganchos y claves del proveedor) y les da un tono
# editorial cálido. Escribe en media/revista/assets/fotos/. Requiere ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/.."

ORIGEN=../../products
DESTINO=assets/fotos
TONO="eq=contrast=1.08:saturation=0.82:brightness=-0.01,colorchannelmixer=rr=0.96:rg=0.06:gr=0.03:gg=0.95:gb=0.02:br=0.02:bg=0.05:bb=0.86"

mkdir -p "$DESTINO"
grep -v -E '^\s*(#|$)' scripts/recortes.txt | while read -r foto x y ancho alto; do
  # -nostdin: sin esto ffmpeg consume las líneas siguientes del bucle.
  ffmpeg -nostdin -loglevel error -y -i "$ORIGEN/$foto.jpg" \
    -vf "crop=iw*$ancho:ih*$alto:iw*$x:ih*$y,scale=480:-2:flags=lanczos,$TONO" \
    -q:v 3 "$DESTINO/$foto.jpg"
  echo "tratada: $foto"
done
