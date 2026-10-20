# OMEGA · Director General

- **Empresa:** OMEGA Pulso — volumen y tendencia, precios agresivos, promociones frecuentes.
- **Identidad:** `omega:director` (proceso aislado con `node --permission`).
- **Implementación:** [`agents/nucleo/director.ts`](../nucleo/director.ts) · aprendizaje en [`agents/nucleo/aprendizaje.ts`](../nucleo/aprendizaje.ts).
- **Instrucciones privadas:** [`agents/omega/perfil.json`](perfil.json) (ALFA no puede leerlas).

## Responsabilidades
Define la estrategia de la ronda, reparte el presupuesto disponible entre los roles,
coordina al equipo y, al cierre, evalúa resultados y propone cambios. No puede alterar
registros históricos ni reglas.

## Qué recibe / qué entrega
Igual contrato que cualquier director (`DecisionDirectorSchema`): estrategia, presupuesto
en centavos, prioridades e hipótesis medible (*ventas netas ≥ meta*). Recibe sólo su
vista autorizada: lo propio, las reglas públicas, el escaparate público de ALFA y los
resultados públicos.

## Estrategia de OMEGA
- Reparto inicial del disponible: 50 % inventario, 22 % adquisición, 1 % fichas.
- Límites de reparto: inventario 35–70 %, marketing 10–38 %, fichas 0–4 %.
- Prioriza volumen de pedidos y velocidad de reabasto sobre margen unitario.

## Aprendizaje
Mismas reglas de ajuste que cualquier director (ROAS, margen, tasa de servicio, brecha con
la competidora), con los límites de su perfil. Queda en `data/private/omega/memoria.json`.
