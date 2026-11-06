# Videos de Revista (HyperFrames)

Fuente de los 5 videos en bucle de las tarjetas de plantilla de Revista
(`client/public/videos/revista/`). Una composición por plantilla, 600×800, 6 s.

| Composición | Plantilla | Fotos (`assets/fotos/`) |
|---|---|---|
| `vogue.html` | Clásica | top-rayas-manga-corta |
| `elle.html` | Moderna | sueter-rosa-diamante, jogger-wide-leg-beige, sueter-rayas-bw, pantalon-wide-leg-sage |
| `bazaar.html` | Galería | pantalon-rayado-studio, cardigan-vintage, sueter-rayas-bw |
| `vanity.html` | Editorial | sueter-rosa-diamante |
| `anna.html` | Anna Signature | top-rayas-manga-corta, pantalon-wide-leg-sage |

Base común: `assets/hojeo.css` (estructura y maquetas) y `assets/hojeo.js` (línea de tiempo).
Las reglas `font-family` se repiten en el `<style>` de cada composición: HyperFrames solo
inyecta las fuentes que aparecen nombradas en el HTML de la composición.

## Requisitos

- Node ≥ 22
- FFmpeg (`brew install ffmpeg`)
- La CLI fijada `hyperframes@0.9.17`. Descarga su propio Chrome; compruébalo con `npx --yes hyperframes@0.9.17 doctor`.
- Telemetría desactivada: `export HYPERFRAMES_NO_TELEMETRY=1`.
- Conexión a internet al renderizar: HyperFrames descarga GSAP y las fuentes de Google (Playfair Display, EB Garamond, etc.).

## Volver a generar

    scripts/tratar-fotos.sh     # recorta y da tono a las fotos de products/ (scripts/recortes.txt)
    scripts/render.sh           # renderiza, recodifica con ffmpeg y extrae la imagen fija (1.25 s)
    scripts/render.sh bazaar    # solo una composición (acepta varios ids)

`render.sh` usa QP 28 por defecto. Si algún MP4 pasa de 500 KB, súbelo: `QP=30 scripts/render.sh`.
El render intermedio es sin pérdida y se fuerza un fotograma clave al final (5.96 s) para que el
bucle no tenga salto; si cambias la duración (6 s) o los fps (30), ajusta esos tiempos en `render.sh`.

Revisar una composición antes de renderizar:

    npx --yes hyperframes@0.9.17 lint vogue.html
    scripts/revisar.sh vogue      # check + fotogramas clave en renders/snapshots/vogue/
