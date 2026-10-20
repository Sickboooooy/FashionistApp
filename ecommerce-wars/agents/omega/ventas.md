# OMEGA · Agente de Ventas

- **Identidad:** `omega:ventas` · **Implementación:** [`agents/nucleo/ventas.ts`](../nucleo/ventas.ts)

## Responsabilidades
Precios, surtido visible, promociones, envío y fichas; vigila conversión, abandono y
recurrencia. Contrato `DecisionVentasSchema`, hipótesis *conversión ≥ objetivo*.

## Estrategia de OMEGA
- Precio base: referencia × 0.92 (rango 0.75–1.10), piso de 1.3× costo.
- **Sigue el precio público de ALFA**: si ALFA vende un SKU disponible 5 % más barato,
  OMEGA se coloca 2 % por debajo (dentro de su piso de margen). Sólo usa el escaparate
  público, nunca datos privados.
- Promoción semanal: −20 % en la categoría con más inventario relativo (días 5–7).
- Compra múltiple: 2 o más piezas, 10 % extra todos los días.
- Liquidación de 30 % para SKU con exceso de inventario.
- Envío gratis desde $599.
