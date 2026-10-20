# ALFA · Agente Financiero

- **Identidad:** `alfa:finanzas` · **Implementación:** [`agents/nucleo/finanzas.ts`](../nucleo/finanzas.ts)

## Antes del periodo: disponibilidad presupuestaria
Verifica que órdenes + campañas + fichas quepan en el disponible (caja − reserva
obligatoria). Si no, recorta campañas, luego órdenes y luego fichas, y lo deja en `ajustes`.
Proyecta la caja final (`proyeccionCajaFinal`) y emite alertas de insolvencia.
Entrega `DecisionFinanzasSchema` con `aprobado` e `hipotesis` (*caja final ≥ proyección conservadora*).

## Después del periodo: libro mayor
Lee sus propios eventos sellados (`data/private/alfa/eventos.jsonl`), los contabiliza en
partida doble con el catálogo de cuentas de [`simulation/economics/libro-mayor.ts`](../../simulation/economics/libro-mayor.ts),
guarda `data/private/alfa/libro-mayor.json` y entrega un `ReporteFinanciero`
(ventas netas, margen de contribución, utilidad operativa, caja, inventario, pasivo, hash del libro).

## Conciliación
El auditor del Juez recalcula los mismos indicadores por una ruta independiente (directo de
los eventos) y los compara con el libro y con este reporte. Cualquier diferencia es una
infracción grave (`discrepancia_contable`).
