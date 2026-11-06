# Revista con videos HyperFrames y eliminación de Viajes · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir las 5 imágenes SVG de las tarjetas de plantilla de Revista por videos cortos en bucle hechos con HyperFrames, y quitar de la app todo el módulo de Viajes.

**Architecture:**
- **Nombres de plantilla:** `shared/magazine-templates.ts` es la fuente única, sin marcas reales, y la usan cliente y servidor.
- **Videos:** el proyecto HyperFrames en `media/revista/` tiene 5 composiciones independientes de 600×800 que comparten CSS y una línea de tiempo GSAP en `assets/`. Un script las renderiza y FFmpeg las recodifica a MP4 ligero, con imagen fija, en `client/public/videos/revista/`.
- **Reproducción:** `TemplatePreviewVideo` reproduce cada video en bucle mientras está en pantalla y muestra la imagen fija cuando no puede reproducirlo.
- **Viajes:** se borra en frontend, backend y esquema.

**Tech Stack:** React 18 + Vite (cliente), Express + tsx (servidor), Drizzle (`shared/schema.ts`), HyperFrames CLI 0.9.17 (HTML + GSAP 3.15 → MP4), FFmpeg, `node:test` + tsx.

**Spec:** `docs/superpowers/specs/2026-11-05-revista-videos-y-quitar-viajes-design.md`. Léelo antes de empezar.

**Reglas generales para quien ejecute:**
- **Rama y directorio:** rama `feat/revista-videos`; directorio de trabajo `/Users/macbookfabian/Applications/FashionistApp/FashionistApp`.
- **Commits:** **nunca** agregues los cambios previos sin confirmar de `package.json`, `package-lock.json` y `.github/` (son del usuario). Usa siempre `git add <rutas exactas>`, nunca `git add -A` ni `git add .`.
- **HyperFrames:** todo comando lleva `HYPERFRAMES_NO_TELEMETRY=1` y la versión fijada `npx --yes hyperframes@0.9.17 …`.
- **Disco:** el equipo tiene poco espacio. Antes de renderizar, comprueba con `df -h /System/Volumes/Data` que hay al menos 2 GB libres.
- **Cuándo hacer commit:** el spec pide dos commits, uno por parte (Tareas 11 y 16). Entre tareas no se hace commit, pero cada tarea deja el árbol compilando.

---

## Mapa de archivos

**Crear**

| Archivo | Responsabilidad |
|---|---|
| `shared/magazine-templates.ts` | ids, nombres visibles, descripciones, estilo para prompts, premium; función con valor por defecto |
| `tests/magazine-templates.test.ts` | pruebas unitarias del módulo anterior |
| `client/src/components/magazine/template-preview-video.tsx` | `<video>` en bucle con IntersectionObserver e imagen fija de respaldo |
| `media/revista/hyperframes.json`, `media/revista/meta.json` | configuración del proyecto HyperFrames (generada con `init`) |
| `media/revista/.gitignore` | ignora `renders/` y `.hyperframes/` |
| `media/revista/README.md` | requisitos y comandos para volver a renderizar |
| `media/revista/scripts/recortes.txt` | recorte de cada foto, en fracciones |
| `media/revista/scripts/tratar-fotos.sh` | recorta y da tono editorial a las fotos de `products/` → `assets/fotos/` |
| `media/revista/scripts/render.sh` | renderiza las 5 composiciones y genera el MP4 y el JPG finales |
| `media/revista/assets/hojeo.css` | estructura y maquetas comunes |
| `media/revista/assets/hojeo.js` | línea de tiempo común de 6 s |
| `media/revista/assets/fotos/*.jpg` | 7 fotos tratadas (generadas) |
| `media/revista/{vogue,elle,bazaar,vanity,anna}.html` | las 5 composiciones |
| `client/public/videos/revista/{vogue,elle,bazaar,vanity,anna}.{mp4,jpg}` | videos e imágenes fijas finales (generados) |

**Modificar**

| Archivo | Cambio |
|---|---|
| `client/src/components/magazine/template-selector.tsx` | usa el módulo compartido y el componente de video |
| `server/services/magazine-service.ts` (`:219`) | nombre y estilo de la plantilla en el prompt |
| `server/services/pdf-service.ts` (`:92`) | nombre visible en el pie del PDF |
| `client/src/services/geminiService.ts` (`:30`, `:179`), `server/services/gemini-image-service.ts` (`:183`), `server/services/pollinations-service.ts` (`:139`), `server/services/fashion-prompt-generator.ts` (`:53`) | quitar marcas reales de los prompts |
| `client/src/App.tsx`, `client/src/components/navbar.tsx`, `client/src/components/text-input-modal.tsx`, `client/src/components/preference-manager.tsx`, `client/src/contexts/preferences-context.tsx` | quitar Viajes |
| `server/routes.ts`, `server/storage.ts`, `shared/schema.ts` | quitar Viajes |
| `README.md`, `replit.md` | quitar Viajes y agregar el aviso sobre `db:push` |

**Borrar**
- `client/src/pages/trips.tsx`
- `client/src/pages/packing-lists.tsx`
- `client/public/images/magazines/{anna,bazaar,elle,vanity,vogue}-template.svg`

---

## Parte A · Videos de Revista

### Tarea 0: Preparación y líneas base

**Files:** ninguno del repo. Las salidas van a `/tmp/revista-base/`.

- [ ] **Paso 1: Comprobar la rama y el estado del árbol**

Run: `git branch --show-current && git status --short | grep -v '^??'`

Expected: `feat/revista-videos`. Solo deben aparecer los cambios previos del usuario: ` M .github/...`, ` M package-lock.json` y ` M package.json`.

- [ ] **Paso 2: Guardar la línea base de TypeScript**

```bash
mkdir -p /tmp/revista-base
npx tsc --noEmit -p tsconfig.json > /tmp/revista-base/tsc-antes.txt 2>&1 || true
grep -c "error TS" /tmp/revista-base/tsc-antes.txt
grep "error TS" /tmp/revista-base/tsc-antes.txt | cut -d'(' -f1 | sort | uniq -c
```

Expected: `50` errores en total, repartidos así:

| Archivo | Errores |
|---|---|
| `client/src/pages/packing-lists.tsx` | 20 |
| `client/src/pages/trips.tsx` | 6 |
| `server/routes.ts` | 12 |
| `server/seedProducts.ts` | 1 |
| `server/services/api-testing.ts` | 1 |
| `server/storage.ts` | 9 |
| `server/vite.ts` | 1 |

- [ ] **Paso 3: Guardar la línea base del build**

Run: `npm run build > /tmp/revista-base/build-antes.txt 2>&1; echo "salida=$?"`

Expected: anota el código de salida. Si ya falla antes de tocar nada, el criterio pasa a ser «el build no empeora» y hay que avisar al revisor.

- [ ] **Paso 4: Instalar FFmpeg**

Run: `brew install ffmpeg && ffmpeg -version | head -1 && ffprobe -version | head -1`

Expected: dos líneas, `ffmpeg version …` y `ffprobe version …`.

- [ ] **Paso 5: Revisar el entorno de HyperFrames**

Run: `HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.9.17 doctor --json | head -60`

Expected: `"ok": true`, o solo con Chrome pendiente. Si falta Chrome:
1. `HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.9.17 browser ensure`
2. Repite `doctor`.

---

### Tarea 1: Módulo compartido de plantillas (TDD)

**Files:**
- Create: `shared/magazine-templates.ts`
- Test: `tests/magazine-templates.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `tests/magazine-templates.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAGAZINE_TEMPLATE_IDS,
  MAGAZINE_TEMPLATES,
  DEFAULT_MAGAZINE_TEMPLATE,
  getMagazineTemplate,
  isMagazineTemplateId,
} from '../shared/magazine-templates';

const REAL_MAGAZINE_NAMES = /\b(vogue|elle|bazaar|harper|vanity)\b/i;

test('las cinco plantillas tienen sus nombres visibles nuevos', () => {
  const nombres = MAGAZINE_TEMPLATE_IDS.map((id) => MAGAZINE_TEMPLATES[id].nombre);
  assert.deepEqual(nombres, ['Clásica', 'Moderna', 'Galería', 'Editorial', 'Anna Signature']);
});

test('ningún texto visible ni de prompt nombra una revista real', () => {
  for (const id of MAGAZINE_TEMPLATE_IDS) {
    const { nombre, descripcion, estilo } = MAGAZINE_TEMPLATES[id];
    for (const texto of [nombre, descripcion, estilo]) {
      assert.doesNotMatch(texto, REAL_MAGAZINE_NAMES, `${id}: "${texto}"`);
    }
  }
});

test('solo Clásica y Moderna son gratuitas', () => {
  const gratuitas = MAGAZINE_TEMPLATE_IDS.filter((id) => !MAGAZINE_TEMPLATES[id].isPremium);
  assert.deepEqual(gratuitas, ['vogue', 'elle']);
});

test('isMagazineTemplateId reconoce solo ids válidos', () => {
  assert.equal(isMagazineTemplateId('anna'), true);
  assert.equal(isMagazineTemplateId('Vogue'), false);
  assert.equal(isMagazineTemplateId(''), false);
});

test('getMagazineTemplate usa Clásica para ids desconocidos', () => {
  assert.equal(DEFAULT_MAGAZINE_TEMPLATE, 'vogue');
  assert.equal(getMagazineTemplate('bazaar').nombre, 'Galería');
  assert.equal(getMagazineTemplate('plantilla-inexistente').nombre, 'Clásica');
});
```

- [ ] **Paso 2: Ejecutarla y verla fallar**

Run: `node --import tsx --test tests/magazine-templates.test.ts`

Expected: FAIL con `ERR_MODULE_NOT_FOUND`, porque `shared/magazine-templates` todavía no existe.

- [ ] **Paso 3: Implementar el módulo**

Crea `shared/magazine-templates.ts`:

```ts
/**
 * Fuente única de las plantillas de Revista.
 * Los ids son internos (datos guardados y API) y no cambian.
 * Los nombres visibles no usan marcas de revistas reales.
 */
export const MAGAZINE_TEMPLATE_IDS = ['vogue', 'elle', 'bazaar', 'vanity', 'anna'] as const;

export type MagazineTemplateId = (typeof MAGAZINE_TEMPLATE_IDS)[number];

export interface MagazineTemplateInfo {
  id: MagazineTemplateId;
  nombre: string;
  descripcion: string;
  /** Descripción del estilo visual, pensada para los prompts de IA. */
  estilo: string;
  isPremium: boolean;
}

export const MAGAZINE_TEMPLATES: Readonly<Record<MagazineTemplateId, MagazineTemplateInfo>> = {
  vogue: {
    id: 'vogue',
    nombre: 'Clásica',
    descripcion: 'Diseño clásico con una imagen principal y espacio editorial minimalista.',
    estilo: 'editorial clásico de alta moda: crema y negro, serif de alto contraste y una imagen protagonista',
    isPremium: false,
  },
  elle: {
    id: 'elle',
    nombre: 'Moderna',
    descripcion: 'Diseño moderno con página dividida para mostrar varios conjuntos.',
    estilo: 'editorial moderno y juvenil: rosa y coral, tipografía sans gruesa y una cuadrícula de looks',
    isPremium: false,
  },
  bazaar: {
    id: 'bazaar',
    nombre: 'Galería',
    descripcion: 'Presentación en galería con espacio para los detalles de cada prenda.',
    estilo: 'galería de alta costura: blanco y negro con dorado, serif itálica y una tira de fotografías con pies de foto',
    isPremium: true,
  },
  vanity: {
    id: 'vanity',
    nombre: 'Editorial',
    descripcion: 'Diseño sofisticado con enfoque en contenido editorial extenso.',
    estilo: 'revista de moda y cultura: marfil y sepia, serif clásica y texto largo a dos columnas',
    isPremium: true,
  },
  anna: {
    id: 'anna',
    nombre: 'Anna Signature',
    descripcion: 'Exclusivo diseño premium con detalles dorados y presentación de lujo.',
    estilo: 'lujo de la marca Anna Signature: negro y oro, marcos dorados y presentación exclusiva',
    isPremium: true,
  },
};

export const DEFAULT_MAGAZINE_TEMPLATE: MagazineTemplateId = 'vogue';

export function isMagazineTemplateId(value: string): value is MagazineTemplateId {
  return (MAGAZINE_TEMPLATE_IDS as readonly string[]).includes(value);
}

/** Devuelve la plantilla del id, o Clásica si el id no es conocido. */
export function getMagazineTemplate(id: string): MagazineTemplateInfo {
  return MAGAZINE_TEMPLATES[isMagazineTemplateId(id) ? id : DEFAULT_MAGAZINE_TEMPLATE];
}
```

- [ ] **Paso 4: Ejecutar la prueba y verla pasar**

Run: `node --import tsx --test tests/magazine-templates.test.ts`

Expected: `ℹ pass 5` y `ℹ fail 0` (formato de Node 24).

---

### Tarea 2: Nombres de plantilla en el servidor

**Files:**
- Modify: `server/services/magazine-service.ts` (imports en `:1-5` y código en `:208-219`)
- Modify: `server/services/pdf-service.ts` (import en `:9` y código en `:92`)

- [ ] **Paso 1: Prompt de la revista**

En `server/services/magazine-service.ts`:

1. Agrega este import justo después de `import { GoogleGenerativeAI } from "@google/generative-ai";`:

```ts
import { getMagazineTemplate } from "@shared/magazine-templates";
```

2. En `generateMagazinePrompt`, agrega una línea después de la desestructuración. Esta línea:

```ts
  const { outfits, template, userPreferences, userName } = request;
```

queda así:

```ts
  const { outfits, template, userPreferences, userName } = request;
  const plantilla = getMagazineTemplate(template);
```

3. Cambia esta línea:

```ts
La revista usará la plantilla "${template}".`;
```

por esta:

```ts
La revista usará la plantilla "${plantilla.nombre}", de estilo ${plantilla.estilo}.`;
```

- [ ] **Paso 2: Pie del PDF**

En `server/services/pdf-service.ts`:

1. Agrega este import justo después de `import PDFDocument from "pdfkit";`:

```ts
import { getMagazineTemplate } from "@shared/magazine-templates";
```

2. Cambia esta línea:

```ts
        .text(`Generado por Anna Style · ${content.template}`, { align: "center" });
```

por esta:

```ts
        .text(`Generado por Anna Style · ${getMagazineTemplate(content.template).nombre}`, { align: "center" });
```

- [ ] **Paso 3: Comprobar los tipos de estos archivos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "magazine-service|pdf-service|magazine-templates" || echo "sin errores en estos archivos"`

Expected: `sin errores en estos archivos`

---

### Tarea 3: Quitar marcas reales de los prompts

**Files:**
- `client/src/services/geminiService.ts:30` y `:179`
- `server/services/gemini-image-service.ts:183`
- `server/services/pollinations-service.ts:139`
- `server/services/fashion-prompt-generator.ts:53`

- [ ] **Paso 1: Reemplazos exactos**

| Archivo | Texto actual | Texto nuevo |
|---|---|---|
| `client/src/services/geminiService.ts:30` | `You are Anna, a high-end fashion editor and stylist for Vogue.` | `You are Anna, a high-end fashion editor and stylist for a leading fashion magazine.` |
| `client/src/services/geminiService.ts:179` | `photorealistic, 8k resolution, Vogue magazine aesthetic.` | `photorealistic, 8k resolution, high-fashion magazine aesthetic.` |
| `server/services/gemini-image-service.ts:183` | `   - Referencias de revistas (Vogue, Harper's Bazaar, etc.)` | `   - Referencias editoriales de revistas de alta moda` |
| `server/services/pollinations-service.ts:139` | `high-fashion editorial photography, Vogue magazine style, professional studio lighting` | `high-fashion editorial photography, high-fashion magazine style, professional studio lighting` |
| `server/services/fashion-prompt-generator.ts:53` | `minimalist composition, Italian Vogue style",` | `minimalist composition, Italian high-fashion editorial style",` |

Las claves de los mapas (`vogue:`, `elle:` en `fashion-prompt-generator.ts`) **no cambian**.

- [ ] **Paso 2: Verificar**

Run: `grep -rn -E "Vogue|Bazaar|Vanity|Harper" client/src/services server/services || echo "sin marcas en prompts"`

Expected: `sin marcas en prompts`. El comentario de `fashion-prompt-generator.ts:3` dice «VOGUE» en mayúsculas, pero no es un prompt y la búsqueda distingue mayúsculas, así que no cuenta.

---

### Tarea 4: Proyecto HyperFrames y fotos tratadas

**Files:**
- Create: `media/revista/hyperframes.json` y `media/revista/meta.json` (los genera `init`)
- Create: `media/revista/.gitignore`, `media/revista/scripts/recortes.txt` y `media/revista/scripts/tratar-fotos.sh`
- Generate: `media/revista/assets/fotos/*.jpg`

- [ ] **Paso 1: Crear el proyecto y limpiar lo que no se usa**

```bash
HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.9.17 init media/revista --skip-skills < /dev/null
ls media/revista
```

Expected: `AGENTS.md  CLAUDE.md  hyperframes.json  index.html  meta.json  package.json`.

Borra lo que no se va a usar:
- `index.html`, porque las composiciones se renderizan con `-c`;
- `package.json`, porque no hace falta un paquete anidado;
- `AGENTS.md` y `CLAUDE.md`, porque los anidados confundirían a los agentes del repo.

```bash
rm media/revista/index.html media/revista/package.json media/revista/AGENTS.md media/revista/CLAUDE.md
ls media/revista
```

Expected: `hyperframes.json  meta.json`

- [ ] **Paso 2: `.gitignore` del proyecto**

Crea `media/revista/.gitignore`:

```gitignore
# Renders intermedios y artefactos de snapshot de HyperFrames
renders/
.hyperframes/
```

- [ ] **Paso 3: Tabla de recortes**

Crea `media/revista/scripts/recortes.txt`:

```text
# foto (sin .jpg en products/)   x     y     ancho  alto   ← fracciones de la imagen original
top-rayas-manga-corta            0.00  0.00  1.00   1.00
sueter-rosa-diamante             0.12  0.20  0.76   0.76
sueter-rayas-bw                  0.10  0.22  0.80   0.75
jogger-wide-leg-beige            0.05  0.05  0.90   0.90
pantalon-wide-leg-sage           0.12  0.30  0.76   0.70
pantalon-wide-leg-cafe           0.12  0.30  0.76   0.68
cardigan-vintage                 0.05  0.235 0.48   0.24
```

- [ ] **Paso 4: Script de tratamiento**

Crea `media/revista/scripts/tratar-fotos.sh`:

```bash
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
```

Run: `chmod +x media/revista/scripts/tratar-fotos.sh && media/revista/scripts/tratar-fotos.sh && ls -la media/revista/assets/fotos`

Expected: 7 líneas `tratada: …` y 7 JPG de 480 px de ancho.

- [ ] **Paso 5: Revisar las fotos a ojo**

Abre cada JPG de `media/revista/assets/fotos/` con la herramienta Read, que muestra imágenes.

Criterio:
- no se ven ganchos, etiquetas, claves (como «ML-359») ni el logo «studio moda»;
- la prenda llena el encuadre;
- ninguna se ve borrosa. `cardigan-vintage` (295 px de origen) y `jogger-wide-leg-beige` (395 px) se amplían a 480 px. Si se ven blandas, abre su recorte o cámbialas por otra foto de `products/`, y actualiza la composición y el README.

Si alguna falla, ajusta su línea en `recortes.txt` y vuelve a correr el script.

---

### Tarea 5: Base común y primera composición (Clásica)

**Files:**
- Create: `media/revista/assets/hojeo.css`, `media/revista/assets/hojeo.js`, `media/revista/vogue.html`

- [ ] **Paso 1: CSS común**

Crea `media/revista/assets/hojeo.css`:

```css
/* Estructura común del «Hojeo editorial» (600×800). Cada composición define la paleta
   y la tipografía con variables --hj-* en su propio <style>. */
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 600px; height: 800px; overflow: hidden; background: var(--hj-fondo-exterior, #000); }
#root { position: relative; width: 100%; height: 100%; }

/* Libro: la portada gira sobre el interior */
.hj-libro { position: absolute; inset: 0; perspective: 1600px; }

/* Interior */
.hj-interior {
  position: absolute; inset: 0; padding: 44px 40px 34px;
  display: flex; flex-direction: column; gap: 18px;
  background: var(--hj-papel); color: var(--hj-tinta);
}
.hj-int-cab {
  display: flex; justify-content: space-between; align-items: baseline;
  padding-bottom: 10px; border-bottom: 1px solid var(--hj-acento);
}
.hj-int-tit { font-family: var(--hj-fuente-titulo); font-style: italic; font-size: 30px; }
.hj-int-num { font-family: var(--hj-fuente-texto); font-size: 13px; letter-spacing: 0.3em; color: var(--hj-acento); }
.hj-int-cuerpo { flex: 1; min-height: 0; display: grid; gap: 14px; }
.hj-int-pie { font-family: var(--hj-fuente-texto); font-size: 12px; letter-spacing: 0.35em; text-align: center; color: var(--hj-acento); }

.hj-foto { position: relative; overflow: hidden; border-radius: 3px; background: #1a1512; }
.hj-foto img { display: block; width: 100%; height: 100%; object-fit: cover; }
.hj-foto::after { content: ""; position: absolute; inset: 0; background: linear-gradient(transparent 58%, rgba(15, 12, 9, 0.62)); }
.hj-foto figcaption { position: absolute; left: 12px; bottom: 10px; z-index: 1; font-family: var(--hj-fuente-texto); font-size: 15px; color: #fff; }
.hj-texto { font-family: var(--hj-fuente-texto); font-size: 15px; line-height: 1.55; color: var(--hj-tinta); }

/* Maquetas interiores (una por plantilla) */
.hj-l-clasica { grid-template-columns: 1.6fr 1fr; }
.hj-l-moderna { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.hj-l-galeria { grid-template-columns: 1fr 1fr 1fr; }
.hj-l-galeria .hj-foto figcaption { font-size: 13px; }
.hj-l-editorial { grid-template-columns: 1fr 1.25fr; }
.hj-l-editorial .hj-texto { column-count: 2; column-gap: 16px; font-size: 13.5px; }
.hj-l-editorial .hj-texto::first-letter { float: left; font-family: var(--hj-fuente-titulo); font-size: 52px; line-height: 0.9; padding-right: 6px; color: var(--hj-acento); }
.hj-l-anna { grid-template-columns: 1fr 1fr; padding: 6px; }
.hj-l-anna .hj-foto { outline: 1.5px solid var(--hj-acento); outline-offset: 5px; }

/* Portada */
.hj-portada { position: absolute; inset: 0; background: var(--hj-portada-fondo); backface-visibility: hidden; }
.hj-marco { position: absolute; inset: 16px; border: 1.5px solid var(--hj-acento); }
.hj-cabecera {
  position: absolute; top: 54px; width: 100%; text-align: center; white-space: nowrap; line-height: 1;
  font-family: var(--hj-fuente-cabecera); font-style: var(--hj-cabecera-estilo, normal);
  font-size: var(--hj-cabecera-tam, 86px); letter-spacing: var(--hj-cabecera-espaciado, 0.04em);
  color: var(--hj-cabecera-color);
}
.hj-letra { display: inline-block; }
.hj-sub { position: absolute; top: 158px; width: 100%; text-align: center; font-family: var(--hj-fuente-texto); font-size: 15px; letter-spacing: 0.45em; color: var(--hj-acento); }
.hj-figura { position: absolute; left: 50%; top: 200px; width: 200px; height: 440px; margin-left: -100px; }
.hj-cabeza { width: 66px; height: 66px; margin: 0 auto; border-radius: 50%; background: var(--hj-figura); }
.hj-cuerpo {
  width: 200px; height: 368px; margin-top: 6px; background: var(--hj-figura);
  clip-path: polygon(38% 0, 62% 0, 70% 16%, 66% 28%, 100% 100%, 0 100%, 34% 28%, 30% 16%);
}
.hj-linea { position: absolute; left: 44px; font-family: var(--hj-fuente-texto); color: var(--hj-tinta-portada); }
#linea-1 { bottom: 92px; font-size: 24px; font-weight: 700; letter-spacing: 0.06em; color: var(--hj-acento); }
#linea-2 { bottom: 62px; font-size: 17px; }
```

- [ ] **Paso 2: Línea de tiempo común**

Crea `media/revista/assets/hojeo.js`:

```js
/* Línea de tiempo común del «Hojeo editorial» (6 s, bucle sin corte).
   0–1.2 s se arma la portada · 1.2–1.4 s quieta · 1.4–2.3 s gira la página ·
   2.3–4.9 s entran las fotos · 4.9–5.6 s se cierra · 5.6–6.0 s vuelve al fondo vacío.
   El fotograma 0 y el último muestran solo el fondo con su marco. */
window.construirHojeo = function construirHojeo(idComposicion) {
  const tl = gsap.timeline({ paused: true });
  const letras = gsap.utils.toArray("#cabecera .hj-letra");
  const fotos = gsap.utils.toArray(".hj-foto");
  const portada = [...letras, "#subtitulo", "#figura", "#linea-1", "#linea-2"];

  tl.fromTo(letras, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: { amount: 0.5 } }, 0.1);
  tl.fromTo("#figura", { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out" }, 0.2);
  tl.fromTo("#subtitulo", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" }, 0.55);
  tl.fromTo(["#linea-1", "#linea-2"], { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", stagger: 0.1 }, 0.7);

  tl.fromTo("#portada", { rotationY: 0, transformOrigin: "0% 50%" }, { rotationY: -110, duration: 0.9, ease: "power2.inOut" }, 1.4);
  tl.fromTo(fotos, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: { amount: 0.6 } }, 2.3);

  tl.fromTo("#portada", { rotationY: -110 }, { rotationY: 0, duration: 0.7, ease: "power2.inOut", immediateRender: false }, 4.9);
  tl.fromTo(portada, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power1.in", immediateRender: false }, 5.6);
  tl.fromTo(fotos, { opacity: 1 }, { opacity: 0, duration: 0.01, immediateRender: false }, 5.6);

  window.__timelines[idComposicion] = tl;
  tl.seek(0);
};
```

- [ ] **Paso 3: Composición Clásica**

Crea `media/revista/vogue.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=600, height=800" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="assets/hojeo.css" />
    <style>
      :root {
        --hj-papel: #faf7f0;
        --hj-tinta: #1c1916;
        --hj-acento: #b3322a;
        --hj-portada-fondo: linear-gradient(#faf7f0, #e9dfcd);
        --hj-figura: linear-gradient(#403b36, #111);
        --hj-tinta-portada: #2a2622;
        --hj-fuente-cabecera: "Playfair Display";
        --hj-fuente-titulo: "Playfair Display";
        --hj-fuente-texto: "EB Garamond";
        --hj-cabecera-color: #141210;
        --hj-cabecera-tam: 86px;
        --hj-cabecera-espaciado: 0.06em;
      }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="vogue" data-start="0" data-duration="6" data-width="600" data-height="800">
      <section class="hj-libro">
        <div class="hj-interior" data-layout-allow-overlap>
          <header class="hj-int-cab"><span class="hj-int-tit">El look de la semana</span><span class="hj-int-num">N.º 12</span></header>
          <div class="hj-int-cuerpo hj-l-clasica">
            <figure class="hj-foto" id="foto-1"><img src="assets/fotos/top-rayas-manga-corta.jpg" alt="" /><figcaption>Rayas al sol</figcaption></figure>
            <p class="hj-texto">Líneas limpias, punto ligero y un contraste que nunca falla. La pieza que resuelve la semana, de la oficina a la cena.</p>
          </div>
          <footer class="hj-int-pie">ESTILO ANNA · EDICIÓN OTOÑO</footer>
        </div>
        <div class="hj-portada" id="portada" data-layout-allow-occlusion>
          <div class="hj-marco"></div>
          <h1 class="hj-cabecera" id="cabecera"><span class="hj-letra">C</span><span class="hj-letra">L</span><span class="hj-letra">Á</span><span class="hj-letra">S</span><span class="hj-letra">I</span><span class="hj-letra">C</span><span class="hj-letra">A</span></h1>
          <p class="hj-sub" id="subtitulo">MODA 2026</p>
          <div class="hj-figura" id="figura"><div class="hj-cabeza"></div><div class="hj-cuerpo"></div></div>
          <p class="hj-linea" id="linea-1">El nuevo lujo silencioso</p>
          <p class="hj-linea" id="linea-2">Tendencias · Otoño</p>
        </div>
      </section>
    </div>
    <script src="assets/hojeo.js"></script>
    <script>window.construirHojeo("vogue");</script>
  </body>
</html>
```

- [ ] **Paso 4: Lint**

Run: `cd media/revista && HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.9.17 lint vogue.html --json; cd -`

Expected: `"ok": true` y `"errorCount": 0`. Corrige cada error con su `fixHint`. Valora cada advertencia.

- [ ] **Paso 5: Script de revisión (check y snapshot)**

`check` y `snapshot` solo aceptan una carpeta de proyecto con `index.html`; no aceptan archivos sueltos ni `-c`. Tampoco sirve poner un `index.html` junto a las 5 composiciones, porque `lint` falla con `multiple_root_compositions`. La solución es montar cada composición como `index.html` en una carpeta temporal.

Crea `media/revista/scripts/revisar.sh`:

```bash
#!/usr/bin/env bash
# Revisa una composición con `check` y saca fotogramas clave con `snapshot`.
# check/snapshot solo aceptan un proyecto con index.html, así que la composición se
# monta en una carpeta temporal. Uso: scripts/revisar.sh vogue
set -euo pipefail
cd "$(dirname "$0")/.."
export HYPERFRAMES_NO_TELEMETRY=1
id="$1"
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
```

Run: `chmod +x media/revista/scripts/revisar.sh && media/revista/scripts/revisar.sh vogue`

Expected: `ok: true` con 0 errores. El JSON completo queda en `media/revista/renders/check-vogue.json`.

Advertencias normales, que no hay que perseguir:
- `content_overlap` entre `#linea-1` y `#linea-2` hacia 1.75–1.875 s y 5.25 s, durante el giro de página;
- `text_below_floor` en `#subtitulo`;
- `line_unread` en los titulares de portada.
- El `data-layout-allow-overlap` de `.hj-interior` silencia el `content_overlap` intencional: la portada se apoya sobre el título y el texto del interior.
- El `data-layout-allow-occlusion` de `#portada` no basta para eso, pero se queda.

- [ ] **Paso 6: Revisar los fotogramas clave**

Abre con Read los PNG de `media/revista/renders/snapshots/vogue/`. La carpeta `renders/` está en `.gitignore`. Además de los fotogramas pedidos, `snapshot` escribe `frame-06-at-5.82s.png` (portada a medio desvanecer) y `contact-sheet.jpg`; los dos son esperados.

Abre cada PNG con Read y comprueba:

| Tiempo | Qué debe verse |
|---|---|
| 0 s | Solo el fondo crema con el marco rojo |
| 1.25 s | Portada completa: CLÁSICA, MODA 2026, la figura y los dos titulares |
| 1.85 s | La portada a media vuelta, con el interior apareciendo |
| 3.6 s | El interior completo, con su foto y pie |
| 5.3 s | La portada cerrándose |
| 5.95 s | Otra vez solo el fondo con el marco |

---

### Tarea 6: Las otras cuatro composiciones

**Files:** Create `media/revista/elle.html`, `bazaar.html`, `vanity.html` y `anna.html`

Las cuatro copian la estructura de `vogue.html`. Solo cambian los datos de esta lista; todo lo demás queda igual:

1. Las variables de `:root`.
2. `data-composition-id` y el argumento de `construirHojeo(...)`, iguales al id del archivo.
3. El texto de la cabecera, con una `<span class="hj-letra">` por letra.
4. `#subtitulo`, `#linea-1` y `#linea-2`.
5. `.hj-int-tit`.
6. La clase de maqueta de `.hj-int-cuerpo`.
7. Las fotos, en orden: cada `<figure>` lleva el id `foto-1`, `foto-2`, … y la ruta `assets/fotos/<foto>.jpg`.

- [ ] **Paso 1: `elle.html` (Moderna)**

Variables de `:root`:

```css
--hj-papel: #fff5f6; --hj-tinta: #1d1d1f; --hj-acento: #9c2f46;
--hj-portada-fondo: linear-gradient(#ffe9ea, #f6c9cf);
--hj-figura: linear-gradient(#d64561, #7a1f33); --hj-tinta-portada: #1d1d1f;
--hj-fuente-cabecera: "Archivo Black"; --hj-fuente-titulo: "Montserrat"; --hj-fuente-texto: "Inter";
--hj-cabecera-color: #1d1d1f; --hj-cabecera-tam: 78px; --hj-cabecera-espaciado: -0.01em;
```

| Campo | Valor |
|---|---|
| Cabecera | MODERNA |
| `#subtitulo` | TENDENCIAS |
| `#linea-1` | 30 looks con color |
| `#linea-2` | Street style · Primavera |
| `.hj-int-tit` | Tus looks de la semana |
| Maqueta | `hj-l-moderna`, sin `.hj-texto` |

| Foto | Pie |
|---|---|
| `sueter-rosa-diamante` | Rosa diamante |
| `jogger-wide-leg-beige` | Wide leg arena |
| `sueter-rayas-bw` | Rayas clásicas |
| `pantalon-wide-leg-sage` | Wide leg salvia |

- [ ] **Paso 2: `bazaar.html` (Galería)**

Variables de `:root`:

```css
--hj-fondo-exterior: #000; --hj-papel: #151515; --hj-tinta: #f2f2f2; --hj-acento: #d4af37;
--hj-portada-fondo: linear-gradient(#111, #262626);
--hj-figura: linear-gradient(#e9e9e9, #7d7d7d); --hj-tinta-portada: #e9e9e9;
--hj-fuente-cabecera: "Playfair Display"; --hj-fuente-titulo: "Playfair Display"; --hj-fuente-texto: "EB Garamond";
--hj-cabecera-color: #f2f2f2; --hj-cabecera-estilo: italic; --hj-cabecera-tam: 76px; --hj-cabecera-espaciado: 0.12em;
```

| Campo | Valor |
|---|---|
| Cabecera | GALERÍA |
| `#subtitulo` | ALTA COSTURA |
| `#linea-1` | Elegancia atemporal |
| `#linea-2` | Galería · Edición 12 |
| `.hj-int-tit` | Galería de la temporada |
| Maqueta | `hj-l-galeria`, sin `.hj-texto` |

| Foto | Pie |
|---|---|
| `pantalon-wide-leg-cafe` | Wide leg café |
| `cardigan-vintage` | Cárdigan vintage |
| `sueter-rayas-bw` | Rayas clásicas |

- [ ] **Paso 3: `vanity.html` (Editorial)**

Variables de `:root`:

```css
--hj-papel: #f3efe8; --hj-tinta: #2a2622; --hj-acento: #6b5114;
--hj-portada-fondo: linear-gradient(#f3efe8, #ddd3c4);
--hj-figura: linear-gradient(#6b5a45, #2a2622); --hj-tinta-portada: #2a2622;
--hj-fuente-cabecera: "Playfair Display"; --hj-fuente-titulo: "Playfair Display"; --hj-fuente-texto: "EB Garamond";
--hj-cabecera-color: #2a2622; --hj-cabecera-tam: 74px; --hj-cabecera-espaciado: 0.06em;
```

| Campo | Valor |
|---|---|
| Cabecera | EDITORIAL |
| `#subtitulo` | MODA, ARTE Y CULTURA |
| `#linea-1` | La nueva silueta del otoño |
| `#linea-2` | Ensayo · Tendencias |
| `.hj-int-tit` | La nueva silueta |
| Maqueta | `hj-l-editorial`: primero la foto, después el texto |

| Foto | Pie |
|---|---|
| `sueter-rosa-diamante` | Rosa diamante |

Texto:

```html
<p class="hj-texto">El otoño llega con prendas que se sienten antes de verse: punto suave, tonos empolvados y volúmenes que abrazan sin apretar. La silueta se relaja, pero la intención se mantiene. Un suéter de textura marcada basta para ordenar el conjunto; lo demás acompaña en silencio. Así se escribe la temporada: con piezas que duran y combinaciones que no necesitan explicarse.</p>
```

- [ ] **Paso 4: `anna.html` (Anna Signature)**

Variables de `:root`:

```css
--hj-fondo-exterior: #000; --hj-papel: #0d0b09; --hj-tinta: #efe7d6; --hj-acento: #d4af37;
--hj-portada-fondo: radial-gradient(ellipse at 50% 45%, rgba(212, 175, 55, 0.3), transparent 65%), linear-gradient(#171310, #000);
--hj-figura: linear-gradient(#f6df9a, #d4af37 55%, #9c7a1e); --hj-tinta-portada: #e7c477;
--hj-fuente-cabecera: "Playfair Display"; --hj-fuente-titulo: "Playfair Display"; --hj-fuente-texto: "EB Garamond";
--hj-cabecera-color: #e7c477; --hj-cabecera-estilo: italic; --hj-cabecera-tam: 96px; --hj-cabecera-espaciado: 0.02em;
```

| Campo | Valor |
|---|---|
| Cabecera | Anna (letras `A` `n` `n` `a`) |
| `#subtitulo` | SIGNATURE |
| `#linea-1` | Colección de lujo |
| `#linea-2` | Hecho a mano · Edición limitada |
| `.hj-int-tit` | Selección Signature |
| Maqueta | `hj-l-anna`, sin `.hj-texto` |

| Foto | Pie |
|---|---|
| `top-rayas-manga-corta` | Rayas al sol |
| `pantalon-wide-leg-sage` | Wide leg salvia |

- [ ] **Paso 5: Lint, check y snapshot de las cuatro**

Repite el Paso 4 de la Tarea 5 y `scripts/revisar.sh <id>` (Pasos 5 y 6) con `elle.html`, `bazaar.html`, `vanity.html` y `anna.html`. Criterios:

`ok: true` en las cuatro.
- Si aparece un `contrast_aa_failure`, oscurece el `--hj-acento` de esa composición. Los valores del plan (`#9c2f46` en Moderna, `#6b5114` en Editorial) ya pasan.
- Si el error está en el pie de una foto, oscurece el degradado de `.hj-foto::after` en `hojeo.css`.
- a 0 s y a 5.95 s solo se ve el fondo con su marco;
- a 1.25 s se ve la portada completa;
- a 3.6 s se ve el interior con todas sus fotos y pies.

Revisa además dos riesgos de desborde:
- «EDITORIAL», a 74 px, es la cabecera más ancha y no debe tocar el marco. Si lo toca, baja `--hj-cabecera-tam` en esa composición.
- El texto de Editorial no debe desbordar su bloque. Si lo hace, baja su `font-size` en `.hj-l-editorial .hj-texto`.

---

### Tarea 7: Render y archivos finales

**Files:**
- Create: `media/revista/scripts/render.sh`
- Generate: `client/public/videos/revista/{vogue,elle,bazaar,vanity,anna}.{mp4,jpg}`

- [ ] **Paso 1: Script de render**

Crea `media/revista/scripts/render.sh`:

```bash
#!/usr/bin/env bash
# Renderiza las 5 composiciones de Revista y deja en client/public/videos/revista/
# un MP4 ligero (H.264, sin audio, faststart) y su imagen fija (1.25 s) por plantilla.
# Requiere ffmpeg. Ajusta CRF si algún video pasa de 500 KB (por defecto 26).
set -euo pipefail
cd "$(dirname "$0")/.."
export HYPERFRAMES_NO_TELEMETRY=1

DESTINO=../../client/public/videos/revista
CRF="${CRF:-26}"
mkdir -p renders "$DESTINO"

for id in vogue elle bazaar vanity anna; do
  npx --yes hyperframes@0.9.17 render -c "$id.html" --quality delivery --fps 30 -o "renders/$id.mp4"
  ffmpeg -nostdin -loglevel error -y -i "renders/$id.mp4" -an -c:v libx264 -preset slow -crf "$CRF" \
    -pix_fmt yuv420p -movflags +faststart "$DESTINO/$id.mp4"
  ffmpeg -nostdin -loglevel error -y -ss 1.25 -i "$DESTINO/$id.mp4" -frames:v 1 -q:v 3 "$DESTINO/$id.jpg"
  echo "listo: $id"
done
ls -l "$DESTINO"
```

- [ ] **Paso 2: Renderizar**

Run: `df -h /System/Volumes/Data | tail -1 && chmod +x media/revista/scripts/render.sh && media/revista/scripts/render.sh`

Expected: 5 líneas `listo: …` y 10 archivos en `client/public/videos/revista/`. En cada render aparece un recuadro `✗ No composition found / No index.html file found`; es inofensivo con `-c` (sale con código 0 y escribe los 180 fotogramas), no lo persigas.

- [ ] **Paso 3: Verificar duración, tamaño, ausencia de audio y peso**

```bash
for f in client/public/videos/revista/*.mp4; do
  echo "$f $(stat -f %z "$f") bytes"
  ffprobe -v error -show_entries format=duration:stream=codec_type,width,height -of compact "$f"
done
```

Expected, en cada archivo:
- `duration` entre 5.9 y 6.1;
- una sola línea `stream|codec_type=video|width=600|height=800`, sin `codec_type=audio`;
- menos de 512000 bytes.

Si alguno pasa de ese peso, vuelve a renderizar con `CRF=28 media/revista/scripts/render.sh` y mide de nuevo.

- [ ] **Paso 4: Comprobar que el bucle no salta**

```bash
for id in vogue elle bazaar vanity anna; do
  f=client/public/videos/revista/$id.mp4
  ffmpeg -loglevel error -y -i "$f" -vf "select=eq(n\,0)" -frames:v 1 /tmp/revista-base/$id-primero.png
  ffmpeg -loglevel error -y -sseof -0.05 -i "$f" -frames:v 1 /tmp/revista-base/$id-ultimo.png
  ffmpeg -loglevel error -i /tmp/revista-base/$id-primero.png -i /tmp/revista-base/$id-ultimo.png -lavfi ssim -f null - 2>&1 | grep -o "All:[0-9.]*" | sed "s/^/$id /"
done
```

Expected: `All:` ≥ 0.98 en las cinco. Abre además un par de PNG con Read y confirma que solo muestran el fondo con su marco.

- [ ] **Paso 5: Revisar las imágenes fijas**

Abre con Read los cinco `client/public/videos/revista/*.jpg`.

Criterio: cada uno muestra la portada completa, con cabecera, figura y titulares, y sin que haya empezado el giro.

---

### Tarea 8: Componente `TemplatePreviewVideo`

**Files:** Create `client/src/components/magazine/template-preview-video.tsx`

El cliente no tiene infraestructura de pruebas de React (spec, «Fuera de alcance»). El componente se verifica en el navegador, en la Tarea 10.

- [ ] **Paso 1: Crear el componente**

```tsx
import { FC, useEffect, useRef, useState } from 'react';

interface TemplatePreviewVideoProps {
  src: string;
  poster: string;
  label: string;
}

// Proporción del video que debe estar en pantalla para reproducirse.
const VISIBLE_THRESHOLD = 0.4;
// La imagen fija es el fotograma de 1.25 s; la primera reproducción arranca ahí para no saltar.
const POSTER_TIME_FRAGMENT = '#t=1.25';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TemplatePreviewVideo: FC<TemplatePreviewVideoProps> = ({ src, poster, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPoster, setShowPoster] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || showPoster) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
          return;
        }
        video.play().catch((error: unknown) => {
          // Solo un bloqueo de reproducción automática deja la imagen fija; un AbortError
          // por desplazamiento rápido se ignora y se reintenta al volver a verse.
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            setShowPoster(true);
          }
        });
      },
      { threshold: VISIBLE_THRESHOLD },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [showPoster]);

  if (showPoster) {
    return <img src={poster} alt={label} className="w-full h-full object-cover" />;
  }

  return (
    <video
      ref={videoRef}
      src={`${src}${POSTER_TIME_FRAGMENT}`}
      poster={poster}
      aria-label={label}
      className="w-full h-full object-cover"
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setShowPoster(true)}
    />
  );
};

export default TemplatePreviewVideo;
```

- [ ] **Paso 2: Comprobar los tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep template-preview-video || echo "sin errores"`

Expected: `sin errores`

---

### Tarea 9: Integrar en el selector y borrar los SVG

**Files:**
- Modify: `client/src/components/magazine/template-selector.tsx:1-109`
- Delete: `client/public/images/magazines/*.svg`

- [ ] **Paso 1: Reemplazar la definición de plantillas**

En `template-selector.tsx`, sustituye el bloque que va desde el comentario `// Define las plantillas disponibles` hasta el `];` que cierra el array `templates` (línea 54) por esto:

```tsx
import {
  MAGAZINE_TEMPLATE_IDS,
  MAGAZINE_TEMPLATES,
  type MagazineTemplateId,
  type MagazineTemplateInfo,
} from '@shared/magazine-templates';
import TemplatePreviewVideo from './template-preview-video';

// Se reexporta para no cambiar los imports existentes (magazine-view, magazine-preview).
export type MagazineTemplate = MagazineTemplateId;

interface Template extends MagazineTemplateInfo {
  videoPath: string;
  posterPath: string;
}

const templates: Template[] = MAGAZINE_TEMPLATE_IDS.map((id) => ({
  ...MAGAZINE_TEMPLATES[id],
  videoPath: `/videos/revista/${id}.mp4`,
  posterPath: `/videos/revista/${id}.jpg`,
}));
```

Después, sube las dos sentencias `import` nuevas al principio del archivo, junto a los imports que ya existen (líneas 1–5). El resto del bloque se queda donde estaba el array.

- [ ] **Paso 2: Usar los campos nuevos en la tarjeta**

Dentro de `TemplateCard`, haz estos tres cambios:

- `<GoldText>{template.name}</GoldText>` pasa a ser `<GoldText>{template.nombre}</GoldText>`.
- `<CardDescription className="text-sm">{template.description}</CardDescription>` pasa a ser `<CardDescription className="text-sm">{template.descripcion}</CardDescription>`.
- El bloque `<img src={`${template.imagePath}?v=2`} … />` se sustituye por esto:

```tsx
          <TemplatePreviewVideo
            src={template.videoPath}
            poster={template.posterPath}
            label={`Vista previa animada de la plantilla ${template.nombre}`}
          />
```

No cambian `isPremium`, `id`, el velo «Solo Premium» ni el botón: `template.isPremium` y `template.id` siguen existiendo.

- [ ] **Paso 3: Comprobar que el alias `@shared` resuelve en el cliente**

Run: `grep -n "@shared" vite.config.ts tsconfig.json`

Expected: el alias `@shared` aparece en los dos archivos (ya existe).

- [ ] **Paso 4: Borrar los SVG y confirmar que nadie los usa**

```bash
git rm client/public/images/magazines/anna-template.svg client/public/images/magazines/bazaar-template.svg client/public/images/magazines/elle-template.svg client/public/images/magazines/vanity-template.svg client/public/images/magazines/vogue-template.svg
grep -rn "images/magazines" client/src || echo "sin referencias"
```

Expected: `sin referencias`

- [ ] **Paso 5: Comprobar los tipos**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "template-selector|magazine-view|magazine-preview" || echo "sin errores"`

Expected: `sin errores`

---

### Tarea 10: Verificar la Parte A en el navegador

**Files:** ninguno.

- [ ] **Paso 1: Levantar el servidor de desarrollo**

En macOS, AirPlay ocupa el puerto 5000, así que usa el 5050. Arranca en segundo plano:

```bash
PORT=5050 npm run dev > /tmp/revista-base/dev.log 2>&1 &
```

Espera a que el log diga `serving on port 5050` y comprueba que el video se sirve:

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5050/videos/revista/anna.mp4`

Expected: `200`

- [ ] **Paso 2: Captura del paso 1 de Revista (videos)**

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --window-size=1280,2200 --virtual-time-budget=6000 --autoplay-policy=no-user-gesture-required \
  --screenshot=/tmp/revista-base/revista-videos.png http://localhost:5050/magazine
```

Abre `/tmp/revista-base/revista-videos.png` con Read y comprueba:
- se ven las 5 tarjetas con sus nombres nuevos (Clásica, Moderna, Galería, Editorial y Anna Signature);
- cada tarjeta muestra su portada animada o su imagen fija; ninguna sale en blanco;
- las premium llevan el velo «Solo Premium».

- [ ] **Paso 3: Captura con reducir movimiento**

Repite el comando del Paso 2 agregando `--force-prefers-reduced-motion` y guardando en `/tmp/revista-base/revista-reducido.png`.

Criterio: se ven las 5 imágenes fijas, cada una con su portada completa.

- [ ] **Paso 4: Errores de consola**

```bash
cat > /tmp/revista-base/consola.mjs <<'EOF'
// Usa el protocolo DevTools de Chrome headless para listar errores de consola en /magazine.
import { spawn } from 'node:child_process';
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', 'about:blank']);
await new Promise((r) => setTimeout(r, 1500));
const [page] = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
const errores = [];
let id = 0;
const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errores.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') errores.push(m.params.exceptionDetails.text);
};
await new Promise((r) => (ws.onopen = r));
send('Runtime.enable');
send('Page.navigate', { url: 'http://localhost:5050/magazine' });
await new Promise((r) => setTimeout(r, 6000));
console.log(errores.length ? errores.join('\n') : 'sin errores de consola');
ws.close();
chrome.kill();
EOF
node /tmp/revista-base/consola.mjs
```

Expected: `sin errores de consola`. Puede haber errores previos ajenos a Revista, por ejemplo de APIs de IA sin clave; en ese caso, anótalos para el revisor.

- [ ] **Paso 5: Detener el servidor**

Run: `kill %1 2>/dev/null || pkill -f "tsx server/index.ts"`

---

### Tarea 11: Commit de la Parte A

**Files:** los de las Tareas 1–9 y `media/revista/README.md`.

- [ ] **Paso 1: README del proyecto de video**

Crea `media/revista/README.md`:

```markdown
# Videos de Revista (HyperFrames)

Fuente de los 5 videos en bucle de las tarjetas de plantilla de Revista
(`client/public/videos/revista/`). Una composición por plantilla, 600×800, 6 s.

| Composición | Plantilla | Fotos (`assets/fotos/`) |
|---|---|---|
| `vogue.html` | Clásica | top-rayas-manga-corta |
| `elle.html` | Moderna | sueter-rosa-diamante, jogger-wide-leg-beige, sueter-rayas-bw, pantalon-wide-leg-sage |
| `bazaar.html` | Galería | pantalon-wide-leg-cafe, cardigan-vintage, sueter-rayas-bw |
| `vanity.html` | Editorial | sueter-rosa-diamante |
| `anna.html` | Anna Signature | top-rayas-manga-corta, pantalon-wide-leg-sage |

Base común: `assets/hojeo.css` (estructura y maquetas) y `assets/hojeo.js` (línea de tiempo).

## Requisitos

- Node ≥ 22
- FFmpeg (`brew install ffmpeg`)
- La CLI fijada `hyperframes@0.9.17`. Descarga su propio Chrome; compruébalo con `npx --yes hyperframes@0.9.17 doctor`.
- Telemetría desactivada: `export HYPERFRAMES_NO_TELEMETRY=1`.
- Conexión a internet al renderizar: HyperFrames descarga GSAP y las fuentes de Google (Playfair Display, EB Garamond, etc.).

## Volver a generar

    scripts/tratar-fotos.sh     # recorta y da tono a las fotos de products/ (scripts/recortes.txt)
    scripts/render.sh           # renderiza, recodifica con ffmpeg y extrae la imagen fija (1.25 s)

`render.sh` acepta `CRF=28 scripts/render.sh` si algún MP4 pasa de 500 KB.

Revisar una composición antes de renderizar:

    npx --yes hyperframes@0.9.17 lint vogue.html
    scripts/revisar.sh vogue      # check + fotogramas clave en renders/snapshots/vogue/
```

- [ ] **Paso 2: Agregar solo los archivos de esta parte**

```bash
git add shared/magazine-templates.ts tests/magazine-templates.test.ts \
  server/services/magazine-service.ts server/services/pdf-service.ts \
  client/src/services/geminiService.ts server/services/gemini-image-service.ts \
  server/services/pollinations-service.ts server/services/fashion-prompt-generator.ts \
  client/src/components/magazine/template-preview-video.tsx \
  client/src/components/magazine/template-selector.tsx \
  media/revista/.gitignore media/revista/hyperframes.json media/revista/meta.json \
  media/revista/README.md media/revista/scripts media/revista/assets \
  media/revista/vogue.html media/revista/elle.html media/revista/bazaar.html \
  media/revista/vanity.html media/revista/anna.html \
  client/public/videos/revista
git status --short | grep -v '^??'
```

Expected:
- solo los archivos de esta parte aparecen preparados con `A`, `M` o `D`; los 5 SVG figuran como `D` porque se borraron con `git rm` en la Tarea 9;
- ` M package.json`, ` M package-lock.json` y ` M .github/...` siguen **sin** preparar (columna izquierda vacía).

- [ ] **Paso 3: Ejecutar la prueba unitaria**

Run: `node --import tsx --test tests/magazine-templates.test.ts`

Expected: `ℹ pass 5` y `ℹ fail 0` (formato de Node 24)

- [ ] **Paso 4: Commit**

```bash
git commit -m "feat(revista): videos HyperFrames en las tarjetas de plantilla"
git log --oneline -1
```

---

## Parte B · Eliminar el módulo Viajes

### Tarea 12: Frontend

**Files:**
- Delete: `client/src/pages/trips.tsx`, `client/src/pages/packing-lists.tsx`
- Modify: `client/src/App.tsx:21-22,43-44`, `client/src/components/navbar.tsx:17`, `client/src/components/text-input-modal.tsx:140`, `client/src/components/preference-manager.tsx:37,300`, `client/src/contexts/preferences-context.tsx:25`

- [ ] **Paso 1: Borrar las páginas**

Run: `git rm client/src/pages/trips.tsx client/src/pages/packing-lists.tsx`

- [ ] **Paso 2: `App.tsx`**

Borra estas cuatro líneas:

```tsx
import TripsPage from "@/pages/trips";
import PackingListsPage from "@/pages/packing-lists";
```

```tsx
          <Route path="/trips" component={TripsPage} />
          <Route path="/trips/:tripId/packing-lists" component={PackingListsPage} />
```

La ruta final `<Route component={NotFound} />` se queda; es la que atenderá `/trips`.

- [ ] **Paso 3: `navbar.tsx`**

Borra esta línea:

```tsx
    { name: 'VIAJES', path: '/trips', icon: 'fa-plane' },
```

- [ ] **Paso 4: `text-input-modal.tsx`**

Borra esta línea:

```tsx
              <option>Viaje</option>
```

- [ ] **Paso 5: `preference-manager.tsx`**

Borra estas dos líneas:

```tsx
    { name: 'Travel', priority: 0.25, label: 'Low Priority' },
```

```tsx
                          occasion.name === 'Travel' ? 'fa-plane' :
```

- [ ] **Paso 6: `preferences-context.tsx`**

Borra esta línea:

```tsx
    { name: 'Travel', priority: 0.25 },
```

- [ ] **Paso 7: Verificar el frontend**

Run: `grep -rn -i -E "trip|packing|viaje|travel|equipaje|fa-plane" client/src || echo "frontend limpio"`

Expected: `frontend limpio`

---

### Tarea 13: Rutas del servidor

**Files:** Modify `server/routes.ts:647-1025` (aprox.)

- [ ] **Paso 1: Borrar el bloque de viajes**

En `server/routes.ts`, borra el bloque que va:
- **desde** la línea de este comentario:

  ```ts
    // Rutas para planificación de viajes
  ```

- **hasta** la línea `  });` que cierra el endpoint de generación de lista de equipaje. Lo reconoces porque su `catch` registra `"Error al generar lista de equipaje:"`, y está justo antes de esta línea, que se queda:

  ```ts
    // 🔍 RUTAS DE DEBUGGING Y TESTING PARA APIS DE IA
  ```

Deja una línea en blanco entre el bloque anterior y `// 🔍 RUTAS DE DEBUGGING…`.

- [ ] **Paso 2: Comprobar el resultado**

Run: `grep -n -i -E "trip|packing|viaje|equipaje" server/routes.ts || echo "rutas limpias"`

Expected: `rutas limpias`

---

### Tarea 14: Almacenamiento y esquema

**Files:** Modify `server/storage.ts`, `shared/schema.ts:126-185`

- [ ] **Paso 1: Imports de `storage.ts`**

Borra estas tres líneas del import de `@shared/schema`:

```ts
  trips, Trip, InsertTrip,
  packingLists, PackingList, InsertPackingList,
  packingItems, PackingItem, InsertPackingItem
```

Después, quita la coma final de la línea anterior, `products, Product, InsertProduct`.

- [ ] **Paso 2: Interfaz `IStorage`**

Borra desde `  // Trip planning methods` hasta `  generatePackingListForTrip(tripId: number, userId: number): Promise<PackingList>;`, ambas incluidas. La línea siguiente, `}`, cierra la interfaz y se queda.

- [ ] **Paso 3: Función compartida**

Borra `buildRecommendedPackingList` completa:
- **desde** el bloque de comentario `/**` que precede a `export async function buildRecommendedPackingList(` (su texto empieza «Genera una lista de equipaje recomendada…»);
- **hasta** su llave de cierre `}`, que está justo antes de `export class MemStorage implements IStorage {`.

- [ ] **Paso 4: Campos y constructor de `MemStorage`**

Borra estas seis declaraciones:

```ts
  private trips: Map<number, Trip>;
  private packingLists: Map<number, PackingList>;
  private packingItems: Map<number, PackingItem>;
```

```ts
  private currentTripId: number;
  private currentPackingListId: number;
  private currentPackingItemId: number;
```

Y estas seis asignaciones del constructor:

```ts
    this.trips = new Map();
    this.packingLists = new Map();
    this.packingItems = new Map();
```

```ts
    this.currentTripId = 1;
    this.currentPackingListId = 1;
    this.currentPackingItemId = 1;
```

- [ ] **Paso 5: Métodos de `MemStorage`**

Dentro de `MemStorage`, borra **desde** la primera aparición de `  // Trip methods` **hasta** el método `generatePackingListForTrip`, inclusive. Ese método es este:

```ts
  // Generación automática de lista de equipaje (lógica compartida con DatabaseStorage)
  async generatePackingListForTrip(tripId: number, userId: number): Promise<PackingList> {
    return buildRecommendedPackingList(this, tripId, userId);
  }
```

El `}` que viene después cierra `MemStorage` y se queda.

- [ ] **Paso 6: Comentario de `DatabaseStorage`**

En el comentario que precede a `export class DatabaseStorage`, sustituye estas líneas:

```ts
 * Se usa cuando hay DATABASE_URL. Persiste catálogos, outfits, viajes, etc.
 * Las FKs con onDelete: "cascade" (packing_lists → trips, packing_items → packing_lists)
 * hacen que borrar un viaje/lista limpie sus dependientes automáticamente.
```

por esta:

```ts
 * Se usa cuando hay DATABASE_URL. Persiste catálogos, outfits, preferencias y diseños.
```

- [ ] **Paso 7: Métodos de `DatabaseStorage`**

Dentro de `DatabaseStorage`, borra **desde** la segunda aparición de `  // Trip methods` **hasta** el método `generatePackingListForTrip`, inclusive. Es el último método de la clase y devuelve `buildRecommendedPackingList(this, tripId, userId);`.

- [ ] **Paso 8: Esquema**

En `shared/schema.ts`, borra desde `// Tablas para planificación de viajes` hasta `export type InsertPackingItem = z.infer<typeof insertPackingItemSchema>;`, ambas incluidas.

Luego comprueba si `boolean` sigue en uso:

Run: `grep -n "boolean(" shared/schema.ts | head -3`

Si no aparece ninguna llamada `boolean(`, quita `boolean` del import de `drizzle-orm/pg-core`, al principio del archivo. Si aparece, déjalo.

- [ ] **Paso 9: Verificar el backend**

Run: `grep -rn -i -E "trip|packing|viaje|travel|equipaje" server shared || echo "backend limpio"`

Expected: `backend limpio`

---

### Tarea 15: Documentación

**Files:**
- Modify `README.md`: borrar las líneas 159, 208 y 349, y agregar una nota nueva.
- Modify `replit.md`: borrar la línea 53.

- [ ] **Paso 1: `README.md`**

Borra estas tres líneas:

```markdown
- [ ] Viajes y packing lists
```

```markdown
| `/trips` | Gestión de viajes |
```

```markdown
- **trips/packing_lists**: Planificación de viajes
```

Al final de la sección `### Error de base de datos` (dentro de Troubleshooting), agrega:

```markdown
> **Módulo de viajes eliminado:** el esquema ya no define `trips`, `packing_lists` ni
> `packing_items`. Si conectas una Postgres que aún tenga esas tablas, `npm run db:push`
> pedirá confirmación para borrarlas junto con sus datos. Respalda la base antes de aceptar.
```

- [ ] **Paso 2: `replit.md`**

Borra esta línea:

```markdown
- **Trips & Packing**: Travel planning functionality
```

- [ ] **Paso 3: Verificar**

Run: `grep -n -i -E "viaje|travel|/trips|packing" README.md replit.md`

Expected: solo la nota nueva de `README.md` sobre el módulo de viajes eliminado. «Stripe» no aparece porque la búsqueda no usa `trip` suelto.

---

### Tarea 16: Verificación final y commit de la Parte B

**Files:** ninguno nuevo.

- [ ] **Paso 1: TypeScript contra la línea base**

```bash
npx tsc --noEmit -p tsconfig.json > /tmp/revista-base/tsc-despues.txt 2>&1 || true
grep -c "error TS" /tmp/revista-base/tsc-despues.txt
grep "error TS" /tmp/revista-base/tsc-despues.txt | cut -d'(' -f1 | sort | uniq -c
```

Expected: `21` errores, repartidos así, y ninguno en `shared/`, `client/` ni `media/`:

| Archivo | Errores |
|---|---|
| `server/routes.ts` | 12 |
| `server/seedProducts.ts` | 1 |
| `server/services/api-testing.ts` | 1 |
| `server/storage.ts` | 6 |
| `server/vite.ts` | 1 |

- [ ] **Paso 2: Build**

Run: `npm run build > /tmp/revista-base/build-despues.txt 2>&1; echo "salida=$?"`

Expected: `salida=0`, o el mismo resultado que la línea base de la Tarea 0.

- [ ] **Paso 3: Búsquedas finales del spec**

```bash
grep -rn -i -E "trip|packing|viaje|travel|equipaje|fa-plane" client server shared || echo "sin viajes"
grep -rn -E "Vogue|Elle|Bazaar|Vanity" client server shared || echo "sin marcas"
```

Expected: `sin viajes` y `sin marcas`

- [ ] **Paso 4: Prueba unitaria**

Run: `node --import tsx --test tests/magazine-templates.test.ts`

Expected: `ℹ pass 5` y `ℹ fail 0` (formato de Node 24)

- [ ] **Paso 5: Navegador**

Levanta `PORT=5050 npm run dev` igual que en la Tarea 10 y ejecuta:

```bash
curl -s http://localhost:5050/trips | grep -o "<title>[^<]*</title>"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=1280,900 \
  --virtual-time-budget=4000 --screenshot=/tmp/revista-base/trips.png http://localhost:5050/trips
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=1440,900 \
  --virtual-time-budget=4000 --screenshot=/tmp/revista-base/navbar.png http://localhost:5050/
```

Abre los dos PNG con Read y comprueba:
- `trips.png` muestra la página 404 de la app;
- `navbar.png` muestra el menú sin «VIAJES».

Después detén el servidor.

- [ ] **Paso 6: Commit de la Parte B**

```bash
git add client/src/App.tsx client/src/components/navbar.tsx client/src/components/text-input-modal.tsx \
  client/src/components/preference-manager.tsx client/src/contexts/preferences-context.tsx \
  server/routes.ts server/storage.ts shared/schema.ts README.md replit.md
git status --short | grep -v '^??'
git commit -m "refactor: elimina el módulo de viajes"
git log --oneline -3
```

Expected:
- dos commits nuevos encima de los del spec;
- ` M package.json`, ` M package-lock.json` y ` M .github/...` siguen sin preparar;
- las páginas borradas entran en el commit porque las preparó `git rm` en la Tarea 12.

**Sin push.** El usuario decide cuándo.
