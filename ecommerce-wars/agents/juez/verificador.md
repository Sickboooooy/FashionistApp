# Verificador · Integridad y reproducibilidad

**Código:** [`harness/evaluator/verificador.ts`](../../harness/evaluator/verificador.ts) · revisión rápida en [`harness/evaluator/integridad.ts`](../../harness/evaluator/integridad.ts)

| Regla | Comprobación | Severidad si falla |
|---|---|---|
| I1 | `config/experiment.json` coincide con el candado sellado por una persona y con el de la corrida | crítica (`configuracion_alterada`) |
| I2 | El manifiesto no fue alterado; cada archivo del expediente coincide con su SHA-256 | crítica (`integridad_evidencia`) |
| I3 | La cadena de eventos del expediente es íntegra, termina donde dice el manifiesto y es idéntica al diario global | crítica |
| I4 | La ronda 1 parte del estado inicial con capital idéntico y del génesis; cada ronda enlaza el hash y el estado final de la anterior | crítica (`continuidad_estado`) |
| I5 | Pruebas críticas aprobadas, con la misma configuración; una corrida oficial no acepta preflight sintético | crítica (`preflight_fallido`) |
| I6 | **Reejecución determinista:** el periodo se vuelve a simular desde el estado inicial y los planes aplicados; eventos de mercado y estado final deben ser idénticos | crítica (`determinismo`) |

La reejecución (I6) es la defensa más fuerte contra ventas fabricadas: aunque un atacante
re-selle toda la cadena y el manifiesto, el motor con la semilla fija no reproduce los
pedidos inventados. Ver `tests/adversarial/juez.test.ts`.
