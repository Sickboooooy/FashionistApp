# API local de E-COMMERCE WARS

Todas las apps escuchan sólo en `127.0.0.1`. Toda respuesta JSON usa el sobre:

```json
{ "ok": true, "datos": { }, "error": null }
```

Los montos son **enteros en centavos MXN ficticios** (`110800` = $1,108.00). Las fechas
`fecha`/`fechaSimulada` son tiempo simulado (`YYYY-MM-DD`), no del reloj del ordenador.

Política de seguridad de contenido (CSP) de las tres apps: `script-src 'self'`,
`style-src 'self'` (sin estilos ni scripts en línea, sin CDNs, sin Google Fonts),
`connect-src 'self'`, `img-src 'self' data:`. Todo texto que provenga de agentes
(mensajes de campaña, estrategias, hipótesis) es **no confiable**: se inserta con
`textContent`, nunca con `innerHTML`.

| App | Puerto | Proceso | Permisos de archivo |
|---|---|---|---|
| War Room / Tribunal | 4100 | `apps/tribunal/server.ts` | sólo lectura |
| Tienda ALFA | 4101 | `apps/alfa/server.ts` | lee público + privado ALFA; escribe sólo `data/private/alfa/tienda/` |
| Tienda OMEGA | 4102 | `apps/omega/server.ts` | lee público + privado OMEGA; escribe sólo `data/private/omega/tienda/` |

Arranque conjunto: `npm run servir` (ver README). Archivos estáticos: cada tienda sirve
`apps/<empresa>/public/` y después `apps/shared/public/`; el War Room sirve
`apps/tribunal/public/`, después `apps/shared/public/`, y módulos TypeScript sin tipos en
`/m/simulation/economics/proyeccion.ts` y `/m/shared/calendario.ts`.

---

## Tiendas (ALFA :4101, OMEGA :4102)

### `GET /api/tienda`
```ts
{
  empresa: 'alfa' | 'omega',
  marca: { nombre: string, lema: string, descripcion: string },
  escaparate: Escaparate | null,      // null antes de la ronda 1
  categorias: string[],
  ciudades: string[],                 // opciones válidas del checkout
  fechaSimulada: string | null,
  aviso: string                       // texto legal de pedido de demostración
}
// Escaparate (shared/contracts/vista.ts)
{
  empresa, ronda: number, dia: number, diaGlobal: number,
  productos: Array<{ sku, nombre, categoria, precioLista, precioFinal, descuentoPct,
                     disponibilidad: 'disponible' | 'pocas' | 'agotado', calidadFicha: number /*0..1*/ }>,
  promociones: Array<{ id, tipo: 'descuento', alcance: 'sku'|'categoria'|'todo', objetivo: string|null, pct, dias: number[] }
                   | { id, tipo: 'compra_multiple', minUnidades, pct, dias: number[] }>,
  envio: { costo: number, gratisDesde: number },
  anuncios: Array<{ canal, segmento, angulo, mensaje /* NO CONFIABLE */ }>
}
```

### `POST /api/checkout` — pedido de demostración
Cuerpo estricto (cualquier campo extra → 400; no existen campos de pago):
```json
{ "items": [{ "sku": "JEA-SLM", "cantidad": 1 }], "cliente": { "alias": "Ana", "ciudad": "Puebla" } }
```
`cantidad` 1–5, hasta 10 items, `alias` 2–40 caracteres (letras, números, espacio, `.'-`),
`ciudad` ∈ `ciudades`. Respuesta `201`:
```ts
{ pedido: { id: 'DEMO-ALFA-0001', creadoEn, cliente, lineas: [{ sku, nombre, unidades, precioLista, descuento, neto }],
            subtotal, descuento, envio, total, ronda, dia }, aviso: string }
```
Errores `409`: tienda sin abrir, producto no listado o agotado. La cotización usa la misma
función del motor (`simulation/market/precios.ts`), incluidas promociones y envío gratis.

### `GET /api/pedidos?limite=12`
Pedidos sintéticos recientes: `[{ id, fecha, total, unidades, estado: 'pagado'|'enviado'|'cancelado'|'con devolución' }]`.

### `GET /api/pedidos/:id`
- Demo (`DEMO-…`): `{ id, tipo: 'demo', aviso, pedido, etapas: [{ estado, alcanzado }] }` (avanza con el reloj real; es sólo demostración).
- Sintético (`ALFA-000123`): `{ id, tipo: 'sintetico', pedido: { lineas: [{ sku, nombre, unidades, neto }], total, envio }, etapas: [{ estado, fecha, seq, hash, alcanzado }] }`.

### `GET /api/eventos?limite=50`
Eventos verificables de la propia tienda, del más reciente al más antiguo. Sólo lo que un visitante
podría observar: cambios de precio, campañas y el ciclo de pedidos (sin montos); nunca compras a
proveedores ni presupuestos:
`[{ seq, ronda, dia, fecha, codigo, resumen, hash, prevHash, verificado: boolean }]`.
`verificado` = el servidor recalculó `sha256(prevHash | json_canónico(evento))` y coincide.

---

## War Room (:4100)

Sesión privilegiada: el lanzador imprime `http://127.0.0.1:4100/#acceso=<token>`. La página
toma el token del fragmento (que nunca viaja al servidor), llama `POST /api/acceso` y borra el
fragmento con `history.replaceState`. Se crea la cookie `ew_observador` (HttpOnly, SameSite=Strict).

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /api/sesion` | público | `{ privilegiado, tokenConfigurado, controlDisponible }` |
| `POST /api/acceso` `{ token }` | público | inicia sesión privilegiada |
| `POST /api/salir` | público | cierra sesión |
| `GET /api/estado` | público (control sólo privilegiado) | `{ corrida: {id, modo, semilla, versionReglas} \| null, control: EstadoControl \| null, ultimoSeq, fechaInicio, diasPorPeriodo, criterios }` |
| `GET /api/corridas` | público | `[{ id, ruta, modo, semilla, rondasCerradas, activa }]` |
| `GET /api/publico` | público | `{ ronda, dia, fechaSimulada, resultados: ResultadoPublico[], escaparates: {alfa, omega}, veredictos, integridadDiario }` |
| `GET /api/instantanea` | privilegiado | `InstantaneaProyeccion` + `{ fechaSimulada, integridadDiario, control }` |
| `GET /api/historico` | privilegiado | `[{ ronda, empresas: { alfa: ResumenEmpresa, omega: ResumenEmpresa } }]` |
| `GET /api/eventos?desde=&limite=` | público (redactado) / privilegiado | eventos sellados |
| `GET /api/stream` | público (redactado) / privilegiado | SSE, ver abajo |
| `GET /api/rondas?corrida=` | público (resumen privado sólo privilegiado) | `[{ ronda, ventasNetas: {alfa, omega}, sentencia: {resultado, ganador, resolucion, hashVeredicto} \| null, resumen? }]` |
| `GET /api/rondas/:n?corrida=` | privilegiado | `{ resumen: ResumenRondaArchivo, sentencia: Resolucion \| null, manifiesto: Manifiesto }` |
| `GET /api/rondas/:n/eventos?corrida=` | privilegiado | eventos sellados de la ronda (para reproducirla) |
| `GET /api/veredictos/:n?corrida=` | público (redactada) / privilegiado (completa) | sentencia. La pública trae `vistaPublica: true`, `hechosPublicos` (ventas netas y pedidos válidos), comprobaciones sin detalle e incidencias sin detalle |
| `GET /api/veredictos/:n?formato=md` | privilegiado | sentencia completa en Markdown |
| `GET /api/integridad?corrida=` | público | `IntegridadCorrida` (candado, diario, expedientes, sentencias, preflight) |
| `GET /api/pruebas?corrida=` | público | `{ preflight, ejecucion: { ejecutadoEn, ms, codigoSalida } }` |
| `GET /api/supervision?corrida=` | privilegiado | `{ telemetria: ResumenTelemetria, ultimos: RegistroTelemetria[], rondas: [...], banco }` |
| `POST /api/control` `{ accion, valor? }` | privilegiado + cabecera `X-War-Room: 1` | `accion`: `pausar` · `reanudar` · `dia` · `semana` · `velocidad` (`valor` = ms reales por día simulado, 0–60000). `dia`/`semana` sólo en pausa. |
| `POST /api/reiniciar` `{ semilla }` | privilegiado + `X-War-Room: 1` | crea una corrida de prueba nueva con esa semilla (la anterior se conserva intacta) |

Tipos de referencia (fuente de verdad, leer el archivo):
- `InstantaneaProyeccion`, `ResumenEmpresa`, `MetricasCampana`, `DecisionObservada`, `Alerta`: `simulation/economics/proyeccion.ts`
- `ResumenRondaArchivo`: `harness/orchestrator/resumen.ts`
- `Resolucion`: `harness/evaluator/juez.ts` · `IntegridadCorrida`: `harness/evaluator/integridad.ts`
- `Manifiesto`: `harness/orchestrator/evidencia.ts` · `RegistroTelemetria`, `ResumenTelemetria`: `harness/orchestrator/telemetria.ts`
- `EstadoControl` = `EstadoControlador` (`harness/orchestrator/controlador.ts`) + `{ pausado, msPorDia, ocupado, ultimoError }`

### SSE `GET /api/stream`
- Cada evento: `id: <corrida>:<seq>` · `event: <CÓDIGO>` · `data: <EventoSellado JSON>` (el `seq` también viene en `data`). Al cambiar de corrida, el servidor cierra los flujos y una reconexión con un id de otra corrida empieza desde cero.
- Máximo 32 conexiones SSE simultáneas; peticiones con `Host` distinto de `127.0.0.1:<puerto>`/`localhost:<puerto>` reciben 421.
- Códigos del apartado 16.3: `ROUND_STARTED`, `INVENTORY_PURCHASED`, `PRICE_CHANGED`, `CAMPAIGN_STARTED`,
  `CAMPAIGN_STOPPED`, `ORDER_CREATED`, `ORDER_PAID_SIMULATED`, `ORDER_CANCELLED`, `ORDER_REFUNDED`,
  `STRATEGY_CHANGED`, `AGENT_DECISION_RECORDED`, `ROUND_CLOSED`, `JUDGE_VERDICT`.
  Eventos internos (tráfico, costos, comisiones…) llegan como `event: INTERNO` (sólo privilegiado).
- `event: CONTROL` (sin `id`, sólo privilegiado): estado del controlador tras cada paso.
- Reconexión: `EventSource` reenvía `Last-Event-ID`; el servidor transmite todo lo posterior. También `?desde=<seq>`.
- Vista pública: sólo `ROUND_STARTED`, `PRICE_CHANGED`, `CAMPAIGN_STARTED`, `CAMPAIGN_STOPPED`, `ROUND_CLOSED`, `JUDGE_VERDICT`, con datos redactados (sin presupuestos ni gasto).
- Latido `: latido` cada 15 s.

Para pintar KPIs en vivo, lo recomendado es: conectar el SSE, y ante cada lote de eventos
pedir `GET /api/instantanea` (privilegiado) o `GET /api/publico` con un retardo de ≤ 500 ms.

### Verificación en el navegador
El hash de una sentencia es `sha256(json_canónico(sentencia sin hashVeredicto))`, donde el JSON
canónico ordena las claves de cada objeto alfabéticamente, sin espacios y omitiendo `undefined`
(ver `shared/hash.ts`). El navegador puede recalcularlo con `crypto.subtle.digest('SHA-256', …)`.
