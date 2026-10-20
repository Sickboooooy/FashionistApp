# Arquitectura de E-COMMERCE WARS

Documento técnico para quien quiera auditar, extender o reproducir el experimento.
La especificación está en [`AGENTS.md`](../AGENTS.md); la API local en [`API.md`](API.md);
los bloqueos y limitaciones conocidos en [`BLOQUEOS.md`](BLOQUEOS.md).

## 1. Procesos y permisos

```
scripts/servir.ts (lanzador, sin restricciones; crea directorios y genera el token)
 ├─ harness/orchestrator/servicio.ts   identidad harness    lee todo · escribe data/, reports/evidence, rounds, telemetria
 │    ├─ agents/nucleo/runner.ts        identidad alfa:*     lee público + privado ALFA + agents/alfa · escribe data/private/alfa
 │    ├─ agents/nucleo/runner.ts        identidad omega:*    lee público + privado OMEGA + agents/omega · escribe data/private/omega
 │    └─ harness/evaluator/proceso-juez.ts identidad juez   lee todo · escribe sólo reports/verdicts
 ├─ apps/tribunal/server.ts             identidad tribunal   lee todo · NO escribe nada (War Room)
 ├─ apps/alfa/server.ts                 identidad alfa:tienda  lee público + privado ALFA · escribe data/private/alfa/tienda
 └─ apps/omega/server.ts                identidad omega:tienda
```

Cada proceso hijo corre con `node --permission` y las banderas `--allow-fs-read/--allow-fs-write`
derivadas de [`harness/permissions/acl.ts`](../harness/permissions/acl.ts). La misma matriz
la aplica en código [`AlmacenRestringido`](../harness/permissions/almacen.ts), que además
**reporta** cada intento denegado (el runtime sólo lo bloquea). Los hijos reciben un entorno
vacío: el token del observador nunca llega a los agentes. Todo escucha en `127.0.0.1`.

`npm run torneo` usa la misma topología sin el War Room: el CLI hace de harness y lanza
los procesos aislados de agentes y Juez.

## 2. Una ronda (7 días simulados)

| Fase | Quién | Eventos sellados |
|---|---|---|
| Apertura | harness | `ronda_iniciada` (ROUND_STARTED) |
| Decisión | cada equipo en su proceso → harness valida | `plan_recibido`, `decision_rechazada`, `decision_registrada` ×5 (AGENT_DECISION_RECORDED), `estrategia_cambiada` (STRATEGY_CHANGED), `plan_aplicado`, `incidente` |
| Día 1 | motor aplica planes | `precio_cambiado` (PRICE_CHANGED), `campana_iniciada` (CAMPAIGN_STARTED), `ficha_mejorada`, `orden_emitida` (INVENTORY_PURCHASED) |
| Días 1–7 | motor | `orden_recibida`, `gasto_operativo`, `almacenaje`, `campana_ejecutada`, `pedido_creado` (ORDER_CREATED), `pedido_cobrado` (ORDER_PAID_SIMULATED), `comision_pago`, `pedido_cancelado` (ORDER_CANCELLED), `pedido_enviado`, `devolucion_procesada` (ORDER_REFUNDED), `trafico_diario`, `cierre_dia` |
| Cierre | motor | `campana_detenida` (CAMPAIGN_STOPPED) |
| Contabilidad | Finanzas de cada empresa | (libro mayor y reporte en su directorio privado) |
| Expediente | harness | `cierre_periodo` (ROUND_CLOSED) + `reports/evidence/ronda-NN/` |
| Juicio | Juez en su proceso | `veredicto_emitido` (JUDGE_VERDICT) + `reports/verdicts/ronda-NN.{json,md}` |
| Aprendizaje | Director de cada empresa | `memoria_actualizada` |

El motor es paso a paso ([`simulation/market/motor.ts`](../simulation/market/motor.ts):
`abrirPeriodo` → `simularDia` × 7 → `cerrarPeriodo`). Cada día usa flujos aleatorios
derivados de `(semilla, ronda, día, nombre)`: avanzar por días, por semanas, pausar o
cambiar la velocidad produce exactamente la misma historia.

## 3. Motor de mercado

- **Población**: 9,000 clientes sintéticos (`simulation/customers/poblacion.ts`) en 4 segmentos con presupuesto, sensibilidad al precio, peso de calidad y preferencias por categoría. Sus rasgos se derivan de la semilla; sólo la relación (lealtad, compras) vive en el estado.
- **Tráfico orgánico**: cada cliente sale a comprar con probabilidad `actividad × estacionalidad semanal × ciclo por ronda × ruido`; elige ALFA, OMEGA o "otra tienda" por logit (conciencia de marca, lealtad, variedad disponible).
- **Tráfico pagado** ([`publicidad.ts`](../simulation/market/publicidad.ts)): CPM (redes, display, influencers), CPC con volumen de búsqueda (buscadores) y envíos (correo, sólo a suscriptores). Si ambas empresas compiten por el mismo canal y segmento el mismo día, el costo sube 25 % y las búsquedas se reparten (competencia por atención).
- **Decisión del cliente** ([`decision.ts`](../simulation/customers/decision.ts)): utilidad = calidad percibida (producto + ficha) − precio relativo × sensibilidad + lealtad + promoción + afinidad del anuncio − penalización si excede el presupuesto. Con probabilidad del segmento compara con la tienda rival y puede cambiarse. Compra con probabilidad sigmoide; puede añadir un segundo artículo; abandona el carrito según el costo de envío.
- **Pedido** ([`pedidos.ts`](../simulation/market/pedidos.ts)): alta (sale el inventario a costo promedio), cobro simulado (1.5 % rechazados), comisión 3.5 %, cancelación del cliente (2.5 %), envío ($110), devoluciones programadas 2–6 días después (reembolso, logística inversa, reingreso u merma).
- **Proveedores** ([`proveedores.ts`](../simulation/suppliers/proveedores.ts)): costo, calidad, días de entrega, confiabilidad (retrasos) y mínimo de compra. Las órdenes se pagan al emitirse.
- **Caja** ([`tesoreria.ts`](../simulation/economics/tesoreria.ts)): ningún gasto discrecional puede dejar la caja bajo la reserva obligatoria (7 días de operación). Los pagos obligatorios que no alcancen se registran como pasivo, que se liquida con los siguientes cobros. La caja nunca es negativa.

Todos los parámetros están en [`config/experiment.json`](../config/experiment.json): son públicos
e idénticos para ambas empresas (regla 7).

## 4. Contabilidad: dos rutas que deben coincidir

1. **Libro mayor** ([`libro-mayor.ts`](../simulation/economics/libro-mayor.ts)), llevado por el agente de Finanzas: partida doble con 18 cuentas (caja, inventario, tránsito, pasivo, capital, ventas brutas, descuentos, cancelaciones, devoluciones, ingresos por envío, costo de ventas, marketing, logística, comisiones, operación, almacenaje, mermas, fichas).
2. **Proyección desde eventos** ([`proyeccion.ts`](../simulation/economics/proyeccion.ts)), usada por el auditor y por el War Room (el navegador ejecuta el mismo archivo, servido sin tipos).

```
ventasNetas        = ventasBrutas − descuentos − cancelaciones − devoluciones
margenContribucion = ventasNetas + ingresosEnvio − costoVentas − mermas − logistica − comisiones − marketing
utilidadOperativa  = margenContribucion − operacion − almacenaje − fichas
pedido válido      = cobrado, no cancelado y no devuelto por completo al cierre de su ronda
```

Las pruebas `tests/unit/libro-mayor.test.ts` y `tests/integration/torneo.test.ts` exigen
igualdad exacta (al centavo) entre ambas rutas, y caja/inventario del libro = estado del mercado.

## 5. Evidencia

- **Diario** `reports/evidence/diario.jsonl`: todos los eventos, `seq` consecutiva y
  `hash = sha256(prevHash | json_canónico(evento))`, con génesis `sha256(config, semilla)`.
- **Expediente** `reports/evidence/ronda-NN/`: `estado-inicial.json`, `planes.json` (propuesto,
  aplicado y rechazos), `eventos.jsonl` (tramo del diario), `estado-final.json`, `libros/*.json`,
  `reportes/*.json`, `resumen.json` y `manifiesto.json` (SHA-256 de cada archivo, rango de la
  cadena, hash del expediente anterior y hash propio).
- **Sentencia** `reports/verdicts/ronda-NN.json` + `.md`, con `hashVeredicto` sobre su contenido canónico.
- **Telemetría** `reports/telemetria/registros.jsonl`: tiempo real (latencia, CPU, memoria). Vive
  fuera de la cadena a propósito: no es determinista.

## 6. Agentes

Las dos empresas usan el mismo código de roles ([`agents/nucleo/`](../agents/nucleo/)) con
instrucciones privadas distintas ([`agents/alfa/perfil.json`](../agents/alfa/perfil.json),
[`agents/omega/perfil.json`](../agents/omega/perfil.json)): mismas capacidades, estrategias
diferentes. El contrato `EquipoEmpresa` (`decidir`, `contabilizar`, `aprender`) permite
sustituir cualquier equipo (así se prueban los equipos adversariales de `tests/adversarial/fixtures/`).
Los agentes son **políticas deterministas con aprendizaje** (no LLM); ver BLOQUEOS.md §4.

## 7. Calibración previa al sellado de reglas

El banco de escenarios (`npm run banco`, 10 semillas) mostró con la primera calibración
que ALFA ganaba en 9 de 10 semillas: el segmento premium (15 % de la población) generaba la
mayor parte de sus ventas y los cazadores de ofertas casi no compraban (precios por encima
de su presupuesto). Antes de sellar las reglas se ajustó, de forma simétrica para ambas
empresas: `utilidad.peso_calidad` 2.2 → 1.6 y presupuestos de jóvenes (400–1,600 MXN) y
cazadores (300–1,100 MXN). Resultado con 12 rondas: ventas netas medias por ronda ALFA
$188.5k vs OMEGA $151.5k, ninguna ronda con margen negativo, 1 victoria (ALFA) en 10 semillas.
Con dos estrategias competentes, la condición de "doble de ventas" es exigente.

## 8. Decisiones técnicas

- TypeScript ejecutado nativamente por Node 24 (sin compilación); una sola dependencia de
  ejecución (`zod`) para los contratos.
- Dinero en enteros de centavos; prorrateos exactos; costo promedio ponderado con residuo
  en la última unidad.
- JSON canónico (claves ordenadas) para todo lo que se hashea; nada con tiempo real entra en hashes.
- Frontends en HTML/CSS/JS sin frameworks ni CDNs, con CSP estricta (`script-src 'self'`).
