# OMEGA · Agente de Compras

- **Identidad:** `omega:compras` · **Implementación:** [`agents/nucleo/compras.ts`](../nucleo/compras.ts)

## Responsabilidades
Estima demanda, elige proveedores, compra inventario dentro del presupuesto y declara
reposición automática; evita quiebres y exceso de inventario. Contrato `DecisionComprasSchema`
con hipótesis *tasa de servicio ≥ 90 %*.

## Estrategia de OMEGA
- Pesos de proveedor: costo 0.55 · velocidad 0.30 · calidad 0.15 → Importadora Exprés
  (entrega en 1 día) y Textiles del Bajío para jeans y camisas.
- Cobertura objetivo: 1.2 semanas; demanda inicial alta en básicos (playeras, sudaderas, tenis).
- Reposición agresiva gracias a proveedores rápidos.
