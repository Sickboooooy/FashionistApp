# 🗺️ Roadmap — Anna Style: la SaaS de estilismo con IA para tiendas de moda

> Generado por un brainstorm multi‑agente (9 especialistas + síntesis) contrastado contra el código real del repo.
> Fecha: 2026‑07‑01.

## ⭐ North Star

**Anna Style: el sistema operativo de estilismo con IA para tiendas de moda de LATAM.** Cualquier boutique sube su catálogo y sus clientes obtienen un estilista personal (chat + probador) que arma looks **completos, comprables y en stock**, con el inventario real de esa tienda.

## 🧭 Resumen ejecutivo

El modelo es **B2B2C**: la *tienda* paga para que sus *clientes* reciban un estilista IA que vende su catálogo. Hoy el producto es un demo B2C monousuario muy bonito (diseño "Liquid Glass" premium, varias features de IA), pero para volverse SaaS necesita cuatro cimientos que hoy no existen y que desbloquean todo lo demás:

1. **Persistencia real** — `db.ts` es un mock no‑op; todo vive en `MemStorage` y se pierde al reiniciar.
2. **Multi‑tenancy** — `products`/`users`/`outfits` no tienen `storeId` ni existe tabla `stores`; dos tiendas compartirían catálogo y clientes.
3. **Auth real** — no hay Passport/sesión/`req.user`; el `userId` viaja spoofeable por URL/body.
4. **Outfits comprables** — los outfits generados no enlazan a `products` reales (solo `garmentIds`) ni se persisten.

Sin esos cuatro, cada feature nueva nace endeudada. La estrategia: primero **quick wins de credibilidad** + encender lo que ya está construido, luego los cimientos (persistencia → tenant → auth → outfits shoppable), y recién después escalar motor de outfits, embeddings, billing y widget embebible.

## 🏆 Diferenciadores defendibles

1. **Estilista conversacional (Grok/xAI) grounded al catálogo real** vía tool‑calling: nunca inventa SKUs, precios ni stock. Ningún competidor de clóset (Whering/Acloset) ni buscador visual (Syte/Vue.ai) lo ofrece conversacionalmente en español mexicano. ✅ **Ya construido y funcionando.**
2. **Outfits shoppable**: la IA arma looks completos (top+bottom+shoes+accesorio) con `products.id` reales, precio total en MXN y botón "comprar el look" → sube el ticket promedio (AOV).
3. **Marca blanca instantánea** sobre el sistema Liquid Glass: cada tienda pone su logo y color; widget embebible ("pega una línea") en su Shopify/Tiendanube sin migrar.
4. **LATAM/México nativo**: precios en centavos MXN, tallas MX, CFDI/IVA, distribución por WhatsApp.
5. **Panel de ROI para la tienda**: "la IA generó X looks, Y try‑ons y $Z en ventas atribuidas" + "huecos de catálogo" (80 clientes pidieron blazer y no hay stock) — inteligencia de negocio que justifica la retención.

---

## ✅ Ya entregado en esta sesión — Chatbot "Anna" (Grok/xAI)

- `server/services/grok-service.ts` — cliente xAI (SDK OpenAI, `baseURL https://api.x.ai/v1`), **tool‑calling** (`buscar_productos`, `recomendar_outfit`) grounded al inventario real, product cards, anti‑alucinación.
- `POST /api/chat` + `GET /api/chat/status` en `server/routes.ts`.
- **Blindaje de seguridad** (defensa en profundidad): reglas inquebrantables en el system prompt, guarda de entrada anti prompt‑injection/extracción/jailbreak, filtro de salida que redacta secretos y bloquea fugas del prompt, `max_tokens` para evitar uso como generador libre, y **rate limiter dedicado** (`/api/chat`, 40 msg/10 min por IP).
- `client/src/components/chat/stylist-chat.tsx` — widget flotante Liquid Glass (framer‑motion, product cards, sugerencias rápidas), montado global en `App.tsx`.
- Verificado en vivo: responde en español, arma looks con productos reales en MXN, no inventa stock, y **bloquea intentos de inyección**.

> Setup: la clave está en `.env` (gitignored) como `XAI_API_KEY`. Modelo configurable con `XAI_MODEL` (default `grok-3`).

---

## 🚦 Roadmap Now / Next / Later

### NOW — cimientos y credibilidad
| Iniciativa | Por qué | Esfuerzo |
|---|---|---|
| **Persistencia real** `DatabaseStorage` (Drizzle+Neon) implementando `IStorage`, fail‑closed sin DB | Sin esto todo se pierde al reiniciar; bloquea billing/analítica | L |
| **Cablear el chatbot Anna** (ruta + widget) | Game‑changer pedido por el dueño | S ✅ **hecho** |
| **Fundación multi‑tenant**: tabla `stores` + `storeId` (nullable, default tienda demo) + middleware `resolveTenant` | Sin esto dos tiendas comparten catálogo/clientes | L |
| **Quick wins de marca**: moneda MXN, quitar productos mock, PDF real, filtro `stock>0` | Bugs visibles que erosionan confianza en el checkout | S |

### NEXT — monetizable
| Iniciativa | Por qué | Esfuerzo |
|---|---|---|
| **Auth real** (Passport + session + roles owner/staff/cliente) | Bloqueante para manejar datos de clientes de terceros | L |
| **Outfits shoppable**: tabla `outfit_items` + composición que devuelve `productIds` reales | El diferenciador de venta; prerequisito de carrito | M |
| **Cerrar el embudo**: carrito + wishlist + "comprar el look" + Stripe Checkout en MXN | Sin compra no hay B2B2C | L |
| **Portal de tienda + ingesta de catálogo** (alta manual + CSV) con auto‑tagging Gemini | Sin ingesta self‑service no hay activación de tiendas | L |
| **Medidor de créditos de IA** + gating por plan (`meterAI`) | Un abuso quema el margen | M |
| **Dashboard de analítica** (funnel try‑on→compra, huecos de catálogo) | Argumento de retención/upsell | M |

### LATER — escala y foso
| Iniciativa | Por qué | Esfuerzo |
|---|---|---|
| **RAG semántico** con pgvector en Neon (embeddings de estilo) + hybrid search | El term‑overlap actual falla con sinónimos | L |
| **Style Engine determinista** (color/silueta/ocasión/clima) | Consistencia y explicabilidad real de los looks | M |
| **Flat‑lay y try‑on multi‑prenda reales** con Gemini 2.5 Flash Image (`@google/genai` ya instalado) | Hoy el flat‑lay es un SVG placeholder | M |
| **Widget/SDK embebible** (script de una línea, Shadow DOM) | Multiplica el alcance sin migrar la tienda | XL |
| **Billing B2B** (planes MXN, Stripe Connect + CFDI, recargas) | Ingreso recurrente + expansion | L |
| **Canal WhatsApp** (Cloud API) + personalización por historial | Canal #1 de comercio conversacional en México | L |

---

## 📅 Plan de 30 días

- **Semana 1 — Persistencia + credibilidad.** `DatabaseStorage` (Drizzle/Neon) para users/products/outfits/preferences, fail‑closed sin `DATABASE_URL`; `db:push`. En paralelo: corregir `€`→MXN en `product-search.tsx`/`product-suggestions.tsx` (usar `priceFormatted`), eliminar mocks Zara/Mango/H&M, filtro `stock>0` en `recommendProducts`.
- **Semana 2 — Encender el chatbot** *(ya adelantado esta sesión)*. Pulir: streaming SSE ("escribiendo en vivo"), persistir el hilo con `sessionId` anónimo en `localStorage`, reemplazar el PDF simulado por PDFKit real.
- **Semana 3 — Fundación multi‑tenant.** Tabla `stores` + `storeId` nullable en products/outfits/users; migrar el seed a la tienda `anna-style`; middleware `resolveTenant`; `GET /api/stores/current` para branding.
- **Semana 4 — Auth + primer paso shoppable.** `setupAuth(app)` con Passport local + roles; `POST /api/products` (alta manual); tabla `outfit_items` y `/api/generate-outfits` resolviendo cada pieza contra el inventario. **Demo end‑to‑end**: tienda demo → chat arma un look shoppable con SKUs reales en stock, en MXN.

---

## 💰 Recomendación de pricing (B2B, la tienda paga)

Suscripción base en MXN + bolsa de **créditos de IA** + overage, calibrado contra costos reales (FLUX schnell $0.003 / dev $0.055 / pro $0.15, DALL‑E $0.04–0.12, try‑on ModelsLab ~$0.002, Grok por token). 1 crédito ≈ $0.006 USD de costo, se vende a ~$0.02–0.05 (margen bruto objetivo >75%).

| Plan | Precio | Incluye |
|---|---|---|
| **Free** | $0 | 1 tienda, ≤25 productos, 50 créditos/mes (Pollinations+Gemini), marca "Powered by Anna Style" |
| **Starter** | $499 MXN/mes | 150 productos, 1,500 créditos, try‑on ModelsLab, 2 seats, sin marca |
| **Pro** | $1,499 MXN/mes | Productos ilimitados, 6,000 créditos, FLUX‑dev + chatbot Grok, revista PDF branded, analítica, 5 seats |
| **Enterprise** | desde $4,999 MXN/mes | FLUX‑pro + GPT‑4o, multi‑sucursal, API/widget, SSO, onboarding |

Trial 14 días; anual con 2 meses gratis. **No negociable antes de cobrar:** (1) middleware `meterAI` de gating por créditos; (2) billing exige Postgres y fail‑closed sin DB; (3) Enterprise necesita CFDI/IVA 16% vía PAC (p.ej. Facturama). Segundo motor opcional: comisión por venta atribuida (take‑rate 3–8% de GMV vía Stripe Connect), solo con tracking server‑side.

---

## ⚡ Top quick wins (horas, alto impacto)

1. ✅ **Cablear el chatbot** (hecho esta sesión).
2. **Moneda €→MXN**: usar `priceFormatted` y quitar "Precio (€)"/"129,00€" en `product-search.tsx` y `product-suggestions.tsx`.
3. **Eliminar productos mock** (Zara/Mango/H&M con URLs de Unsplash) del frontend; mostrar estado vacío o el catálogo real.
4. **Filtrar `stock>0`** en `recommendProducts` (anti‑alucinación de stock).
5. **PDF real** con PDFKit en `/api/export-magazine-pdf` (hoy es `Buffer.from("PDF simulado…")`).
6. **`POST /api/products`** (alta manual) reusando `insertProductSchema` — destraba el alta de catálogo.
7. **Persistir outfits generados** con el `POST /api/outfits` que ya existe.
8. **Open Graph en español** + imagen OG en `client/index.html` para que los links en WhatsApp se vean bien.

---

### 🐞 Bugs/deuda pre‑existentes detectados (no introducidos en esta sesión)
- `db.ts` es un mock que devuelve `[]`; persistencia 100% en memoria.
- ~50 errores de `tsc` pre‑existentes (react‑query v5 `onSuccess`, `error` unknown en catches, `implicit any`) — no bloquean el dev runtime (tsx/Vite transpilan sin type‑check), pero conviene sanearlos.
- El error handler global en `server/index.ts` **re‑lanza** tras responder y hay un `uncaughtException → process.exit(1)`: cualquier error que llegue ahí tumba el server. Conviene quitar el `throw err;`.
