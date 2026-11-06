# Revista con videos HyperFrames y eliminación del módulo Viajes

**Fecha:** 2026-11-05 · **Estado:** aprobado en brainstorming; falta el plan de implementación · **Rama:** `feat/revista-videos`, creada desde `main`

## Objetivo

1. Cambiar las imágenes fijas (SVG) de las 5 tarjetas de plantilla de la sección Revista por **videos cortos en bucle** renderizados con HyperFrames. La dirección es «Hojeo editorial»: la portada se arma, la página gira y aparece el interior con fotos reales del catálogo.
2. Quitar de la app **todo el módulo de Viajes**: frontend, backend, esquema y menciones fijas en el frontend.

## Fuera de alcance

- El video de cabecera de la página Revista. Solo cambian las tarjetas.
- Infraestructura de pruebas de React. El cliente no la tiene y no se agrega.
- El render en la nube de HeyGen y cualquier servicio de pago.
- Rediseñar la vista previa (`magazine-preview.tsx`). Solo compara ids; no muestra nombres.
- Los 21 errores de `tsc` previos y ajenos a este trabajo (en `server/routes.ts`, `server/storage.ts`, `server/vite.ts`, `server/services/api-testing.ts` y `server/seedProducts.ts`).
- El POST del cliente a `/api/preferences` (`preference-manager.tsx:117`), que no existe en el servidor. Es un defecto previo y no se corrige aquí.

## Parte A · Videos de la Revista

### A1. Plantillas: nombres visibles nuevos

Los identificadores internos (`MagazineTemplate = 'vogue' | 'elle' | 'bazaar' | 'vanity' | 'anna'`) **no cambian**, para no romper la vista previa, los datos guardados ni el API. Solo cambian el nombre y la descripción visibles:

| id | Nombre visible | Premium | Paleta y tipografía | Maqueta interior |
|---|---|---|---|---|
| `vogue` | Clásica | no | Crema y negro; serif de alto contraste; acento rojo | 1 foto grande y una columna de texto |
| `elle` | Moderna | no | Rosa y coral; sans gruesa | Cuadrícula 2×2 con 4 looks |
| `bazaar` | Galería | sí | Negro y blanco con dorado; serif itálica espaciada | Tira de 3 fotos con pies de foto |
| `vanity` | Editorial | sí | Marfil y sepia; serif clásica | 1 foto y texto a dos columnas con capitular |
| `anna` | Anna Signature | sí | Negro y oro (marca propia) | 2 fotos con marco dorado y destello |

Ningún video, imagen ni texto visible reproduce el nombre o la cabecera de una revista real.

### A2. Guion común (6 s, bucle sin corte)

| Tramo | Contenido |
|---|---|
| 0–1.2 s | La portada se arma sobre el fondo vacío: el título entra letra a letra, la figura aparece con un zoom lento y entran los titulares |
| 1.2–1.4 s | La portada completa queda quieta |
| 1.4–2.3 s | La portada gira sobre su borde izquierdo, como una página |
| 2.3–4.9 s | El interior: entran escalonadas de 1 a 4 fotos, según la maqueta, con sus pies de foto |
| 4.9–5.6 s | La página se cierra y vuelve la portada completa |
| 5.6–6.0 s | Título, figura y titulares se desvanecen hasta dejar el fondo vacío con su marco |

**Estado del bucle:**
- El fotograma 0 y el último (6.0 s) son idénticos: solo el fondo de la plantilla con su marco, sin título, figura ni titulares. Así el bucle no tiene salto.
- La imagen fija (A4) se toma a **1.25 s**, dentro del tramo quieto de 1.2 a 1.4 s, con la portada completa. Como la portada no se mueve en ese tramo, da igual en qué fotograma exacto caigan `ffmpeg -ss 1.25` y el `#t=1.25` del navegador: los dos se ven idénticos.

### A3. Fotos del interior

Las fotos salen de `products/`, el catálogo propio del repo, con **tratamiento editorial**:
- encuadre cerrado que oculta los ganchos y las claves del proveedor (p. ej. «ML-359»);
- tono cálido: sepia suave, saturación más baja y contraste más alto;
- degradado inferior con un pie de foto que da el nombre de la prenda.

El recorte y el tono se aplican **antes**, con FFmpeg (`scripts/tratar-fotos.sh`), porque el contrato de HyperFrames prohíbe filtros CSS sobre imágenes. El degradado y el pie de foto sí son CSS. Todo se hace en local, sin servicios externos.

### A4. Fuente y render

- **Proyecto HyperFrames** en `media/revista/`: una composición por plantilla sobre una base común (estilos, guion y tratamiento de fotos).
- **Fotos:** se copian, reducidas, de `products/` a `media/revista/assets/`, para que el proyecto sea autocontenido y no dependa de rutas `../`. El README indica qué foto usa cada plantilla.
- **CLI fijada en `npx hyperframes@0.9.17`** (versión actual en npm; requiere Node ≥ 22). **No** se agrega a `package.json`.
- **Requisitos de sistema:** Node ≥ 22 (hay 24) y FFmpeg (falta; se instala con Homebrew). La CLI usa su propio Chrome. `npx hyperframes@0.9.17 doctor` debe pasar.
- **Paso de FFmpeg después del render:** recodifica a H.264 sin pista de audio, con la tasa de bits necesaria para quedar por debajo de 500 KB, `-movflags +faststart` y la extracción de la imagen fija.
- **`media/revista/README.md`** documenta los requisitos, el comando de render, el paso de FFmpeg y la extracción de la imagen fija. Todos los comandos usan la versión fijada `hyperframes@0.9.17`.
- **Salida en `client/public/videos/revista/`:**
  - `<id>.mp4`: H.264, 600×800, 30 fps, 6 s, sin audio; objetivo, menos de 500 KB.
  - `<id>.jpg`: imagen fija tomada a 1.25 s, con la portada completa.
- **Los 5 SVG de `client/public/images/magazines/` se eliminan.** Quedan sin uso y llevan nombres de revistas reales.

### A5. Componente `TemplatePreviewVideo`

Archivo: `client/src/components/magazine/template-preview-video.tsx`.

- **Props:** `src` (mp4), `poster` (jpg) y `label` (texto accesible).
- **Video:** `<video muted loop playsInline preload="metadata" poster>` con `aria-label` tomado de `label`.
- **Sin salto al arrancar:** el `src` lleva el fragmento `#t=1.25`, así la primera reproducción empieza en el mismo fotograma que la imagen fija. Los bucles siguientes recorren los 6 s completos.
- **Reproducción:** en bucle **mientras al menos un 40 % del elemento de video esté en pantalla** (`IntersectionObserver`). Fuera de pantalla, el video se pausa.
- **Respaldo con imagen fija:** se muestra solo un `<img>` con `poster` y el mismo `alt` en tres casos:
  - con `prefers-reduced-motion: reduce`;
  - si el video falla (`onError`);
  - si `video.play()` se rechaza con `NotAllowedError` (reproducción automática bloqueada).
- **Otros rechazos de `play()`** (p. ej. `AbortError`, cuando un desplazamiento rápido pausa el video antes de arrancar) se ignoran: la tarjeta vuelve a intentarlo al reaparecer.
- El observer se limpia al desmontar.

### A6. Integración

- **Fuente única de los nombres:** `shared/magazine-templates.ts` exporta, por id, `{ nombre, descripcion, estilo, isPremium }`, junto con una función que da un valor por defecto («Clásica») para ids desconocidos. La usan el cliente y el servidor, así los nombres no se desincronizan.
- **`template-selector.tsx`:**
  - Toma nombre, descripción y premium de `shared/magazine-templates.ts`, y agrega `videoPath` y `posterPath`.
  - El `<img>` se sustituye por `TemplatePreviewVideo`.
  - Se conservan el velo «Solo Premium», la selección y el estado deshabilitado.
- **Nombres en el servidor:** dos lugares usan el id crudo. En ambos, `template` llega como `string`, así que se usa el valor por defecto si el id no es conocido.
  - `server/services/magazine-service.ts:219` lo pasa al prompt («plantilla "vogue"»). Se sustituye por el nombre visible y el `estilo` de `shared/magazine-templates.ts`.
  - `server/services/pdf-service.ts:92` lo imprime en el pie del PDF exportado (`Generado por Anna Style · ${content.template}`). Se sustituye por el nombre visible de `shared/magazine-templates.ts`.
- **Marcas reales dentro de los textos de prompt:** se reemplazan por una descripción de estilo equivalente (p. ej. «Vogue magazine style» → «high-fashion magazine editorial style») en:
  - `client/src/services/geminiService.ts:30` y `:179`;
  - `server/services/gemini-image-service.ts:183`;
  - `server/services/pollinations-service.ts:139`;
  - `server/services/fashion-prompt-generator.ts:53` («Italian Vogue style»).
- Las claves internas de los mapas (p. ej. `vogue:` en `fashion-prompt-generator.ts`) no cambian.

## Parte B · Eliminar el módulo Viajes

### B1. Frontend

- Se borran `client/src/pages/trips.tsx` y `client/src/pages/packing-lists.tsx`.
- **`App.tsx`:** salen los imports y las rutas `/trips` y `/trips/:tripId/packing-lists`. Esas URL caen en el `NotFound` que ya existe.
- **`navbar.tsx`:** sale el ítem `VIAJES`.
- **`text-input-modal.tsx`:** sale la opción de ocasión «Viaje».
- **`preferences-context.tsx` y `preference-manager.tsx`:** sale la ocasión `Travel` con su ícono `fa-plane`.
- **No se agrega filtro para datos guardados.** Hoy no puede existir ninguna preferencia `Travel` guardada:
  - no hay base de datos;
  - el almacenamiento en memoria no persiste entre reinicios;
  - el cliente nunca lee lo que guarda (`localStorage` solo se escribe) y envía sus preferencias a `/api/preferences`, un endpoint que no existe.

### B2. Backend y esquema

- **`server/routes.ts`:** salen todos los endpoints de viajes, listas de equipaje y artículos (`/api/users/:userId/trips`, `/api/trips…` y los de packing lists e items).
- **`server/storage.ts`:**
  - salen de `IStorage`, de la implementación en memoria y de `DatabaseStorage` los métodos de Trip, PackingList y PackingItem;
  - salen `buildRecommendedPackingList`, `generatePackingListForTrip`, los `Map` y contadores asociados, sus imports y el comentario de viajes de la línea ~770.
- **`shared/schema.ts`:** salen las tablas `trips`, `packing_lists` y `packing_items`, con sus schemas de inserción y sus tipos.

### B3. Base de datos

No hay ninguna base configurada: no existe `.env` local y `apphosting.yaml` no define `DATABASE_URL`, así que no hay tablas que borrar ahora.

En el `README.md` se agrega esta advertencia: si se conecta una Postgres que ya tenga esas tablas, `npm run db:push` pedirá confirmación para borrarlas junto con sus datos, así que conviene respaldar antes.

### B4. Documentación

Salen las menciones del módulo de viajes en `README.md` y `replit.md`.

## Verificación

1. `npm run check` (tsc), en esta misma copia de trabajo, con sus `node_modules` y los cambios de dependencias sin confirmar que ya tiene. La línea base actual es de 50 errores. Al quitar Viajes desaparecen 29 (`packing-lists.tsx`, `trips.tsx` y 3 de `storage.ts`).
   - Se esperan **21**, y deben ser exactamente los de la lista «Fuera de alcance».
   - No se acepta ningún error en archivos nuevos ni en líneas modificadas por este trabajo.
2. `npm run build` sin errores.
3. `npx hyperframes@0.9.17 lint <id>.html` sin errores para cada una de las 5 composiciones. El lint de la carpeta completa no aplica, porque no hay `index.html`. `check` y `snapshot` se ejecutan con `scripts/revisar.sh`, que monta cada composición como `index.html` en una carpeta temporal.
4. `ffprobe` sobre cada MP4: duración de 6 s ± 0.1, 600×800, sin pista de audio y menos de 500 KB. Si alguno pasa de 500 KB, se baja la tasa de bits antes de aceptarlo.
5. Bucle sin salto: en cada video, el primer y el último fotograma coinciden visualmente (comparación de capturas). Ambos deben mostrar solo el fondo con su marco (A2).
6. En el navegador, con el servidor de desarrollo:
   - las 5 tarjetas se reproducen al verse, sin errores en la consola;
   - con «reducir movimiento» se ven las imágenes fijas;
   - `/trips` muestra la página 404;
   - el navbar ya no muestra «VIAJES».
7. Búsqueda final en `client/`, `server/` y `shared/`:
   - **Sin distinguir mayúsculas,** cero resultados para `trip`, `packing`, `viaje`, `travel`, `equipaje` y `fa-plane`.
   - **Distinguiendo mayúsculas,** cero resultados para `Vogue`, `Elle`, `Bazaar` y `Vanity`. Así siguen permitidas las claves de id en minúscula (`vogue`, `elle`, `bazaar`, `vanity`).

## Commits

1. `feat(revista): videos HyperFrames en las tarjetas de plantilla` (Parte A)
2. `refactor: elimina el módulo de viajes` (Parte B)

Cada commit incluye **solo** los archivos de este trabajo. Los cambios previos sin confirmar en `package.json`, `package-lock.json` y `.github/` no se agregan. Sin push hasta que el usuario lo pida.
