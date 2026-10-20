# ALFA · Agente de Compras

- **Identidad:** `alfa:compras` · **Implementación:** [`agents/nucleo/compras.ts`](../nucleo/compras.ts)

## Responsabilidades
Estima la demanda por SKU, elige proveedor sintético, compra inventario dentro del
presupuesto del Director y declara reglas de reposición automática. Evita quiebres y
exceso de inventario.

## Qué entrega (contrato `DecisionComprasSchema`)
`ordenes` [{sku, proveedorId, unidades}], `reposicion` [{sku, proveedorId, puntoReorden,
cantidad}], `justificacion` e `hipotesis` (*tasa de servicio ≥ 90 %*).
El harness valida cada orden (proveedor surte la categoría, mínimo de compra, saldo).

## Estrategia de ALFA
- Pesos de elección de proveedor: calidad 0.6 · costo 0.25 · velocidad 0.15; con la tienda
  vacía la velocidad pesa el doble (un pedido que llega el día 5 vende poco).
- En operación normal prefiere Taller Pacífico (calidad 0.90) y Calzado León para tenis.
- Cobertura objetivo: 1.3 semanas de demanda pronosticada; si no alcanza el presupuesto,
  escala la cobertura de todos los SKU antes que dejar huecos en el surtido.
- Reposición: punto de reorden = demanda diaria × (días de entrega + 1); lote = 5 días.

## Aprendizaje
La demanda por SKU se actualiza con suavizado exponencial (ventas + 12 % de los quiebres
observados como venta perdida).
