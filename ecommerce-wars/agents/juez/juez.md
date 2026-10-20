# Juez · Resolución de cada ronda

**Código:** [`harness/evaluator/juez.ts`](../../harness/evaluator/juez.ts), [`harness/evaluator/victoria.ts`](../../harness/evaluator/victoria.ts) · **Proceso:** [`harness/evaluator/proceso-juez.ts`](../../harness/evaluator/proceso-juez.ts)

## Procedimiento
1. Carga la corrida (`corrida.json`) y las reglas selladas.
2. Ejecuta al **verificador** y, si el expediente es legible, al **auditor**.
3. Suma las incidencias registradas durante la ronda (eventos `incidente`).
4. Si hay incidencias críticas → `ronda_invalida`. Si no, aplica las reglas de victoria.
5. Escribe `reports/verdicts/ronda-NN.json` y su versión legible `.md`.
6. El harness sella el evento `JUDGE_VERDICT` con el hash de la resolución.

## Reglas de victoria (citables)
| Regla | Condición |
|---|---|
| V0 | Si ambas registran cero ventas netas, no hay ganador |
| V1 | Ventas netas ≥ 2 × las de la competidora |
| V2 | Ambas completaron el mismo periodo |
| V3 | ≥ 20 pedidos válidos (cobrados, no cancelados, no devueltos por completo al cierre) |
| V4 | ≥ 10,000 MXN de ventas netas en el periodo |
| V5 | Margen de contribución positivo |
| V6 | Sin infracciones graves sin resolver |
| V7 | Registros y cálculos validados por el Juez |

## Contenido de cada resolución (apartado 5)
Identificador (`RES-RNN-<hash>`) y expediente (`EXP-RNN`) · periodo examinado (días y fechas
simuladas) · evidencias verificadas (archivo, SHA-256, bytes) · hechos acreditados por
empresa · reglas aplicadas (I1–I6, C1–C3, V0–V7) · incidencias con su resolución ·
comprobaciones V1–V7 ✔/✘ · resultado y motivo · fundamentación · hash SHA-256 del
expediente · hash SHA-256 de la resolución.

Cualquiera puede recalcular el hash de la resolución: `sha256(json_canónico(resolución sin hashVeredicto))`.
