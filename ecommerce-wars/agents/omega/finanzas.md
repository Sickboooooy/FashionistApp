# OMEGA · Agente Financiero

- **Identidad:** `omega:finanzas` · **Implementación:** [`agents/nucleo/finanzas.ts`](../nucleo/finanzas.ts)

Mismas obligaciones que cualquier agente financiero:

1. **Antes del periodo:** verifica que lo comprometido quepa en el disponible (caja −
   reserva obligatoria), recorta si no, proyecta la caja final y advierte insolvencia.
2. **Después del periodo:** contabiliza en partida doble sus propios eventos sellados
   (`data/private/omega/eventos.jsonl`), guarda `data/private/omega/libro-mayor.json` y entrega
   el `ReporteFinanciero` de la ronda.
3. **Conciliación:** el auditor del Juez compara su libro y su reporte contra los eventos.
   Una diferencia es infracción grave y deja a OMEGA sin candidatura en esa ronda.

La estrategia de volumen de OMEGA (promociones frecuentes, envío gratis desde $599) presiona
el margen de contribución: es el indicador que este agente vigila primero.
