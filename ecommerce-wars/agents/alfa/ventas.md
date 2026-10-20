# ALFA · Agente de Ventas

- **Identidad:** `alfa:ventas` · **Implementación:** [`agents/nucleo/ventas.ts`](../nucleo/ventas.ts)

## Responsabilidades
Fija precios, decide qué productos se listan, diseña promociones y envío, y mejora fichas
de producto. Vigila conversión, abandono de carrito y recurrencia (desde su historial).

## Qué entrega (contrato `DecisionVentasSchema`)
`precios`, `listado`, `promociones` (descuento por SKU/categoría/todo o compra múltiple),
`envio` {costo, gratisDesde}, `fichas` [{sku, pasos}] e `hipotesis` (*conversión ≥ objetivo*).

## Estrategia de ALFA
- Precio base: referencia × 1.12 (rango aprendido 0.95–1.40) y nunca menos de 1.45× costo.
- No sigue los precios de OMEGA.
- Sin promoción semanal; sólo liquidación de 12 % los días 6–7 para SKU con más de 2.5
  semanas de inventario.
- Envío gratis desde $1,299; envío normal $99.
- Fichas: objetivo de calidad 0.80 en los seis SKU de mayor demanda.

## Aprendizaje
Ajusta el multiplicador de precio por SKU: +3 % si se agotó con demanda insatisfecha,
−3 % con inventario sobrante, −6 % si no vendió nada.
