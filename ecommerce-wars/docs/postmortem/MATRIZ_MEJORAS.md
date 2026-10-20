# MATRIZ_MEJORAS — Mejoras propuestas, priorizadas

**Comité de Evaluación Científica, Económica y Tecnológica** · Postmortem de E-COMMERCE WARS · 2026-10-20

**Estado:** propuestas. **No se implementó ninguna.** Todas requieren aprobación humana nominal. La columna **¿Reglas?** indica si la mejora cambia las reglas selladas, el modelo o los agentes. En ese caso exige una versión nueva de reglas y un resello firmado por una persona, y nunca se aplica sobre la configuración del torneo oficial vigente.

## Leyendas

**Prioridad**
- **P0**: bloquea cualquier uso científico u oficial.
- **P1**: necesaria antes de usar el sistema con fines comerciales.
- **P2**: mejora la calidad o habilita investigación futura.

**Impacto y esfuerzo**
- **Impacto** A/M/B: alto, medio o bajo.
- **Esfuerzo** S/M/L: días, una o dos semanas, o más de dos semanas-persona. Es una estimación del comité, sin fuente externa.

**Fuentes**
- Memos: A (economía), B (estadística), C1 (agentes), C2 (confiabilidad), D (comercio electrónico) y O (orquestador).
- Las evidencias con `ruta:línea` son relativas a `ecommerce-wars/`.

---

## 0. Contención

| ID | Hallazgo y evidencia | Mejora | Imp. | Esf. | Riesgo si no se hace | Prior. | ¿Reglas? | Fase | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| M-01 | [HECHO] La semilla sellada para el oficial (20261019, `config/experiment.json`) es la de `runs/prueba-base`: sin ganador en R12. Los agentes son deterministas, así que el resultado oficial ya se conoce. | No correr el oficial con esa semilla. Elegir la semilla por compromiso y revelación tras congelar el código, y volver a sellar. | A | S | Un torneo "oficial" sin información nueva, cuyo resultado pudo conocerse de antemano | **P0** | Sí (semilla) | 0 | C2 |
| M-02 | [HECHO] Hay afirmaciones que no se sostienen. "Competencia pareja" (`README.md:103`): ALFA vende más en el 82 % de las semillas fuera de muestra. El "1 victoria de 10" es una tasa dentro de muestra; fuera de muestra es 14/40 (35 %). La recalibración se describe como "simétrica" (`docs/ARQUITECTURA.md:102`). Se habla de "agentes autónomos" (`README.md:5`) y de "aprendizaje entre rondas" (`docs/BLOQUEOS.md:37`; `docs/ARQUITECTURA.md:95`). La cobertura de ramas declarada es 83.4 %; la medida, 83.14 %. | Reescribir el README y la arquitectura: el banco dentro de muestra, el lenguaje de "adaptación heurística" y los resultados fuera de muestra con IC. | A | S | Conclusiones engañosas difundidas | **P0** | No (docs) | 0 | A, B, C1, O |
| M-03 | [HECHO] `ecommerce-wars/` no está en git; el HEAD del repositorio es `0f2a027` y no lo incluye. | Commit y tag firmados del árbol exacto, con la huella anclada. | A | S | Imposible probar qué código produjo qué evidencia | **P0** | No | 0 | C2, O |
| M-04 | [HECHO] Quedan unos 0.5 GB libres en disco. Hubo 7 abortos por `ENOSPC`. Una corrida ocupa unos 80 MB. | Liberar al menos 2 GB y vigilar el espacio. | A | S | Corridas corruptas o irrecuperables | **P0** | No | 0 | O, C2 |

## 1A. Integridad, durabilidad y reanudación

| ID | Hallazgo y evidencia | Mejora | Imp. | Esf. | Riesgo si no se hace | Prior. | ¿Reglas? | Fase | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| M-10 | [HECHO, EXP-3] Dos harness sobre la misma corrida dejan 766 `seq` duplicados y un diario corrupto. | Candado `.harness.lock` con `wx`, PID y detección de candado obsoleto. | A | S | Corrupción silenciosa | **P0** | No | 1A | C2 |
| M-11 | [HECHO, EXP-1] Si se reanuda tras `aprender`, la memoria se aplica dos veces. La historia diverge **sin hallazgos** del Juez. | `aprender` idempotente: guardar `ultimaRondaAprendida` o versionar la memoria por ronda. | A | S | Historias distintas "válidas" para la misma semilla | **P0** | Sí (agentes) | 1A | C2 |
| M-12 | [HECHO, EXP-5] Una línea desgarrada en el diario provoca `SyntaxError` en la reanudación y en `verificar`, y tumba el War Room (`apps/tribunal/fuente.ts:82`, `server.ts:72-75`). | Detectar la cola incompleta, reparar de forma explícita con incidente sellado y no caer. | A | S | Corrida irrecuperable y caída del War Room | **P0** | No | 1A | C2 |
| M-13 | [HECHO] Sin `fsync` en modo War Room (Node 24 con `--permission`). Fuera del diario nunca se hace `fsync` de archivo ni de directorio. No se comprueba el retorno de `writeSync` (`diario.ts:123`). | `fsync` de archivo y directorio, o un servicio de *commit* durable en el lanzador. Bucle de escritura completa. | A | M | Pérdida de evidencia ante un corte de energía | P1 | No | 1A | C2 |
| M-14 | [HECHO] No se comprueba el espacio libre (`grep statfs` = 0). Se observaron 7 abortos por `ENOSPC` a mitad de ronda. | `statfsSync` antes de cada ronda; pausa con mensaje claro y limpieza de `.tmp-*`. | M | S | Abortos no reanudables | P1 | No | 1A | C2, O |
| M-15 | [HECHO, EXP-4/EXP-6b] El `.md` de la sentencia puede perderse o alterarse sin que se detecte. `rounds/`, `resultados.json` y `reporte-final.md` no están protegidos. | Commit en dos fases del expediente y la sentencia; el `.md` derivable o con su hash en el JSON; cubrir todos los artefactos en `integridad.ts`. | A | M | Alteración visible al público no detectada | **P0** | No | 1A | C2 |
| M-16 | [HECHO, EXP-10] `#reanudar` carga `estado-final.json` sin verificar el manifiesto. Con la caja alterada, el verificador de R2 da 0 hallazgos. | Verificar manifiestos y continuidad antes de reanudar; fallo cerrado. | A | S | Estado manipulado entre reinicios | **P0** | No | 1A | C2 |
| M-17 | [HECHO] La huella de código excluye `scripts/`, `apps/`, `config/`, `node_modules/`, `package*.json` y el binario de Node (`corrida.ts:45,54`). Solo se compara en el primer veredicto. `modulosEquipo` se acepta en oficial sin registrarse (EXP-6). | Ampliar la huella, verificarla al arrancar, llevarla al génesis y prohibir `modulosEquipo` en oficial. | A | S | Equipo sustituido con integridad "OK" | **P0** | No | 1A | C2 |
| M-18 | [HECHO] Ventanas de reanudación no documentadas (EXP-2: `ErrorDeterminismo`) y reintento sobre el estado en memoria en el servicio (memo C2, F8). | Diario como WAL con marcas de fase; avanzar hacia adelante en lugar de rechazar; ante un error, controlador marcado como "dañado". | M | M | Pérdida de corridas largas | P1 | No | 1A | C2 |
| M-19 | [HECHO] En la ejecución sin interfaz (CLI, en-proceso) no hay plazo para agentes colgados (`ejecutor.ts:58-88`) ni pruebas de *timeout*. | Plazo también en en-proceso y pruebas de *timeout*. | B | S | Cuelgues | P2 | No | 1A | C2 |

## 1B. Aislamiento y autenticidad

| ID | Hallazgo y evidencia | Mejora | Imp. | Esf. | Riesgo si no se hace | Prior. | ¿Reglas? | Fase | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| M-20 | [HECHO, C2, EXP-8 con procesos ficticios] Un proceso con `--permission` y `sandbox-exec` puede enviar señales a otro proceso Node del mismo usuario y abrir su inspector con `process._debugProcess`. E confirmó las precondiciones en el código: el harness corre sin `--permission` en `scripts/torneo.ts:43-51`, existe `--disable-sigusr1` y no se usa, y según la documentación de Node `_debugProcess` no está limitado. **E no reprodujo la señal ni el inspector en vivo.** [INFERENCIA, solo Linux] Esto permitiría ejecutar código en el harness. | `--disable-sigusr1` en todo Node sin restricciones; agentes bajo otro UID o en un espacio de nombres de PID (bwrap). Prueba con un agente hostil. | A | M | Disponibilidad (matar al harness) y, en Linux, ejecución de código en el harness | **P0** | No | 1B | C2 |
| M-21 | [HECHO] La red solo está bloqueada en macOS. En Linux la prueba se **omite** y el preflight aprueba igual (`tests/adversarial/endurecimiento.test.ts:12`). `redBloqueada` solo queda en la telemetría. `EW_PERMITIR_RED_AGENTES` lo desactiva incluso en oficial. | Canario de red con fallo cerrado, sellado en la cadena; prohibir la variable en oficial. | A | S | Agentes con red sin que nadie lo note | **P0** | No | 1B | C2 |
| M-22 | [HECHO] Node 24 no restringe la red. `--allow-net` existe desde la v25.0.0 con estabilidad 1.1 (docs consultadas el 2026-10-20). | Linux: bubblewrap (`--unshare-net --unshare-pid --unshare-ipc`). `--allow-net` solo como defensa adicional. | A | M | Sin aislamiento multiplataforma | P1 | No | 1B | C2 |
| M-23 | [HECHO] No hay firmas (`grep sign/ed25519` = 0). El campo `actor` lo fija el harness. Con escritura sobre los archivos se puede regenerar la cadena entera (el orquestador lo reprodujo: 20,603/20,603 eventos). | Firmas Ed25519 por principal, con claves entregadas por stdin y sus públicas en el génesis. | A | M | Integridad sin autenticidad | P1 | No | 1B | C2, O |
| M-24 | [HECHO, EXP-7] Truncar la última ronda no se detecta. No hay anclaje externo. | Anclar por ronda (solo hashes) con RFC 3161 o Sigstore Rekor; sellar `torneo_terminado`. | A | M | Historias recortadas "íntegras" | P1 | No | 1B | C2 |
| M-25 | [HECHO] El sello de reglas acepta cualquier texto (`sellar-reglas.ts:11-21`). El candado vigente dice "pendiente de confirmación humana". | Firma personal (ssh-keygen -Y o minisign) sobre `hashConfig`, la huella y la semilla comprometida. | A | S | Autorización humana no verificable | **P0** | No | 1B | C2 |
| M-26 | [HECHO, EXP-9] Los incidentes de acceso los declara el propio agente, que puede suprimirlos adelantando su respuesta. | Contabilizar las denegaciones en el harness o el SO, no en el hijo. | M | M | Infracciones invisibles | P1 | No | 1B | C2 |

## 1C. Artefactos del modelo y de los agentes

| ID | Hallazgo y evidencia | Mejora | Imp. | Esf. | Riesgo si no se hace | Prior. | ¿Reglas? | Fase | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| M-30 | [HECHO, reproducido por O] `Math.ceil((0.8−0.5)/0.15)` = 3 en `agents/nucleo/ventas.ts:91-95`. ALFA lleva fichas a 0.95 en lugar de 0.8; OMEGA no se ve afectada. | Redondeo con tolerancia o pasos enteros. Medir su efecto (E0.4). | M | S | Ventaja de ALFA atribuida a la estrategia cuando es un defecto | **P0** | Sí (agentes) | 1C | C1, O |
| M-31 | [HECHO, semilla 20261019] El seguimiento de precio de OMEGA copia liquidaciones de fin de semana de ALFA como precio de lista, porque ve la foto del día 7 (`controlador.ts:590`; `ventas.ts:33-36`). | Usar el precio de lista del rival o detectar las promociones temporales. | M | S | Reacción al rival basada en un artefacto | P1 | Sí (agentes) | 1C | C1, A |
| M-32 | [HECHO] La `semilla` está en la vista de los agentes (`vistas.ts:101`) y el ACL les permite leer `simulation/` y `config/`. | Vista saneada y ACL mínimo para los agentes. | A (V2 con LLM/RL) | S | "Oráculo": predicción perfecta del ruido | P0 para la V2 | Sí | 1C | C1 |
| M-33 | [HECHO] ROAS y CAC con atribución de último contacto: la visita pagada desplaza a la orgánica (`visitas.ts:18-27`; `proyeccion.ts:365-371`). | Rotular como "atribuido" y añadir incrementalidad contrafactual. | A | S | Sobreinversión aparente | P1 | No (medición) | 1C | A, C1, D |
| M-34 | [HECHO] Las hipótesis de los agentes son autodeclaradas y no retroalimentan. El observatorio usa techos, y la nota de Finanzas da 0 por construcción cuando la caja crece (`harness/evaluator/calidad.ts`). | Hipótesis con intervalo y alternativa, puntuadas con reglas propias (*interval score*) y devueltas a la memoria. Quitar los techos. | M | M | El "observatorio" confunde resultado con calidad de decisión | P1 | Sí (agentes) | 1C | C1 |

## 2. Validación estadística y reglas de decisión

| ID | Hallazgo y evidencia | Mejora | Imp. | Esf. | Riesgo si no se hace | Prior. | ¿Reglas? | Fase | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| M-40 | [HECHO] Se calibró y se reportó con las mismas semillas. [HECHO, exploración] La DE de G dentro de muestra (0.076) es unas 3 veces menor que fuera de muestra (0.238). | Protocolo CAL → SEL → EVA → OFICIAL con semillas comprometidas por hash (EXPERIMENTOS_V2 §0). | A | S | Sobreajuste y conclusiones no replicables | **P0** | No | 2 | A, B, O |
| M-41 | [HECHO, exploración; B lo confirma a ciegas] Con estrategias **idénticas**, la regla 2× declara "ganador" en el 17.5–25 % de las corridas en los nulos comparables y en el 67.5 % en el espejo ALFA-ALFA, más volátil. Con la ventaja real de ALFA lo hace en el 35 %, aunque ALFA vende más en el 82 % de las semillas. 12 rondas equivalen a unas 1.7 observaciones independientes (ICC 0.565). | Evaluar las características operativas (E0.5) y **proponer a la autoridad humana** una regla con error tipo I y potencia conocidos. Referencia de B: multisemilla con M = 20 y umbral de 15/20, que da potencia de 0.88 y error nominal del 5 %. El comité no modifica la regla vigente. | A | M | Victorias que no distinguen la estrategia del ruido | **P0** | Sí (si se adopta) | 2 | B, O |
| M-42 | [INFERENCIA] Un torneo de una sola semilla es una sola trayectoria de un proceso con mucha varianza. | Torneo oficial multisemilla o veredicto sobre la distribución de resultados. | A | M | "Ganador" por azar | P1 | Sí | 2 | B, O |
| M-43 | [HECHO] Los flujos aleatorios del mercado se comparten entre empresas (`motor.ts:71`). | Flujos por empresa y entidad (números aleatorios comunes). | M | M | Experimentos pareados con más varianza | P1 | Sí (motor) | 2 | A, C1 |
| M-44 | [HECHO] El banco (`scripts/banco.ts`) promedia rondas de corridas truncadas por la victoria y no registra hashes de código ni de configuración. Lo mismo `reports/reproducibilidad`. | Modo experimental sin parada y metadatos de huella en todos los reportes. | M | S | Sesgo por regla de detención y reportes no atribuibles a una versión | P1 | No | 2 | A, O |

## 2b. War Room 2.0

| ID | Hallazgo y evidencia | Mejora | Imp. | Esf. | Riesgo si no se hace | Prior. | ¿Reglas? | Fase | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| M-50 | [HECHO] El War Room muestra una trayectoria sin incertidumbre. | Bandas multisemilla y probabilidad de inversión del resultado. | A | M | Sobreinterpretar una semilla | P1 | No | 2 | B, D |
| M-51 | [HECHO] No distingue correlación de causalidad. | Etiqueta epistémica por métrica: observada, atribuida, contrafactual (misma semilla) o experimental (IC multisemilla). | A | S | Lecturas causales indebidas | P1 | No | 2 | A, C1, D |
| M-52 | [HECHO, una semilla] El ganador cambia según la métrica: OMEGA tiene más pedidos válidos en 12/12 rondas de `prueba-base` y ALFA más ventas netas. | Panel "¿quién gana con otra métrica?" (VN, pedidos, margen, utilidad). | M | S | Elegir una métrica que decide el resultado sin decirlo | P2 | No | 2 | A |
| M-53 | [HECHO] El motor es determinista y `simularPeriodo` ya existe (`verificador.ts:188`). | Contrafactual de un periodo con la misma semilla (*regret* y percentil frente a un ensamble de ruido). | A | M | Sin medición de calidad de decisión | P1 | No | 2 | C1, A |
| M-54 | [HECHO, sonda en vivo del orquestador] La sentencia pública publica los `bytes` de `libros/<empresa>.json`. | Omitir los tamaños en la vista pública (canal lateral débil). | B | S | Filtración menor | P2 | No | 2 | O |

## 3. Realismo económico

| ID | Hallazgo y evidencia | Mejora | Imp. | Esf. | Riesgo si no se hace | Prior. | ¿Reglas? | Fase | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| M-60 | [HECHO] Elección de tienda ciega al precio (`decision.ts:47-64`); doble conteo del descuento (`:83,90`) y de la lealtad sin decaimiento (`:59,88`). | Revisar las formas funcionales; experimentos 2 y 3. | A | M | Resultados determinados por supuestos de diseño | P1 | Sí | 3 | A |
| M-61 | [HECHO] Sin saciedad ni tiempo de recompra; población estática. | Saciedad por categoría y dinámica de población. | M | M | Recurrencia irreal | P2 | Sí | 3 | A |
| M-62 | [HECHO] No hay IVA ni contracargos, y el rechazo de pago es fijo (1.5 %). Según el memo D, Banxico CF621 reporta contracargos de 0.34–0.39 %. **E no pudo reverificar esa cifra**, así que no debe usarse para calibrar hasta que una persona recupere el cuadro. | IVA, embudo de pago y contracargos. | A | M | Márgenes sobrestimados | P1 | Sí | 3 | D |
| M-63 | [HECHO] Cobro inmediato, sin crédito ni plazos. | Plazos de cobro y pago, crédito con interés. | M | M | Rotación de capital irreal | P2 | Sí | 3 | A |
| M-64 | [HECHO] Sin calendario anual. | Calendario (Hot Sale, Buen Fin, temporadas) calibrado con INEGI EMEC; choques (experimento 7). | A | M | Inútil para planear inventario | P1 | Sí | 3 | D, A |
| M-65 | [HECHO] Proveedores sin capacidad ni fallas reales. | Experimento 4. | M | M | Riesgo de suministro trivial | P2 | Sí | 3 | C1 |
| M-66 | [HECHO] CTR y CPM fijos; la presión de subasta nunca se activa porque los segmentos son disjuntos. | CTR decreciente, presión continua, segmentos solapables (experimento 5). | A | M | No hay competencia por atención | P1 | Sí | 3 | A |
| M-67 | [HECHO] La opción externa es constante; no hay marketplace. [HECHO, fuente] Según COFECE, más del 85 % del lado vendedor se concentra en dos plataformas. | Opción externa reactiva o canal marketplace; experimento 8. | A | L | Ignora el canal dominante | P2 | Sí | 3 | D |
| M-68 | [HECHO] No hay talla ni color. | Dimensión de talla con devoluciones por motivo (requiere piloto). | A en moda | L | Mecanismo central de la moda ausente | P2 | Sí | 3/5 | D |

## 4–5. Agentes híbridos y datos reales

| ID | Hallazgo y evidencia | Mejora | Imp. | Esf. | Riesgo si no se hace | Prior. | ¿Reglas? | Fase | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| M-70 | [HECHO, fuentes citadas en C1] Los LLM no son deterministas ni siquiera con temperatura 0. | Intermediario en el harness con casete sellado y reproducción que falla cerrada. | A | M | Torneos irreproducibles | P1 (fase 4) | Sí | 4 | C1 |
| M-71 | [HECHO] Validación no impone el reparto del Director (`validacion.ts:238-254`). | Pruebas de contrato y metamórficas de los planes. | M | S | Un LLM ignora restricciones sin rechazo | P1 (fase 4) | Sí | 4 | C1 |
| M-80 | [HECHO, fuente] Nueva LFPDPPP (DOF 20-03-2025): la disociación evita la necesidad de consentimiento (art. 9-III). No se verificó si existe reglamento. | Revisión legal, convenio y protocolo de datos agregados (k ≥ 10). | A | M | Riesgo legal y reputacional | P1 (fase 5) | No | 5 | D |
| M-81 | [HECHO] Ninguno de los 232 parámetros está calibrado con datos reales. | Experimento 9A (fuentes públicas) y 9B (piloto). | A | L | Simulación sin validez externa | P1 | Sí | 5 | D |

---

## Resumen por prioridad

- **P0, antes de cualquier uso científico u oficial:**
  - contención: M-01, M-02, M-03, M-04;
  - integridad: M-10, M-11, M-12, M-15, M-16, M-17;
  - aislamiento y autorización: M-20, M-21, M-25;
  - artefactos de agentes: M-30, y M-32 para la V2;
  - validación estadística: M-40, M-41.
- **P1, antes de un uso comercial:**
  - integridad y aislamiento: M-13, M-14, M-18, M-22, M-23, M-24, M-26;
  - agentes y medición: M-31, M-33, M-34;
  - validación y War Room: M-42, M-43, M-44, M-50, M-51, M-53;
  - realismo económico: M-60, M-62, M-64, M-66;
  - agentes híbridos y datos reales: M-70, M-71, M-80, M-81.
- **P2:** M-19, M-52, M-54, M-61, M-63, M-65, M-67, M-68.
