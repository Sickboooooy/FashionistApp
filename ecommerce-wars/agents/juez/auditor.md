# Auditor · Conciliación contable

**Código:** [`harness/evaluator/auditor.ts`](../../harness/evaluator/auditor.ts)

El auditor nunca confía en lo que reportan las empresas: recalcula todo desde los
eventos sellados por el motor de mercado.

## Comprobaciones por empresa
| Regla | Comprobación | Hallazgo si falla |
|---|---|---|
| C1 | Libro mayor de Finanzas presente y en partida doble | `discrepancia_contable` (grave) |
| C1 | Libro idéntico a recontabilizar los eventos | `discrepancia_contable` |
| C1 | Indicadores del libro = indicadores desde eventos (ruta independiente) | `discrepancia_contable` |
| C1 | Reporte financiero = indicadores desde eventos; hash del libro coincide | `discrepancia_contable` |
| C1 | Caja, inventario, tránsito y pasivo del libro = estado final del mercado | `discrepancia_contable` |
| C2 | La caja nunca fue negativa en ningún evento de la historia | `integridad_evidencia` (crítica) |
| C2 | Ningún gasto discrecional invadió la reserva obligatoria ni ocurrió con pasivo | `discrepancia_contable` |
| C2 | Inventario por SKU nunca negativo y final = estado | `discrepancia_contable` |
| C3 | Todo evento de pedido lo emitió el motor (`actor: mercado`) | `venta_fabricada` (grave) |
| C3 | Cada cobro corresponde a un pedido creado; cada cliente existe en la población | `venta_fabricada` |

## Fórmulas (idénticas en libro y eventos)
- Ventas netas = ventas brutas − descuentos − cancelaciones − devoluciones.
- Margen de contribución = ventas netas + ingresos por envío − costo de ventas − mermas − logística − comisiones − marketing.
- Utilidad operativa = margen de contribución − operación − almacenaje − contenido de fichas.
