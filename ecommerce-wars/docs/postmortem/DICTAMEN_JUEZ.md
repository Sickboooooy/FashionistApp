# DICTAMEN DEL JUEZ METODOLÓGICO

**Dictamen n.º CECET-EW-F-001/2026**

| Campo | Contenido |
|---|---|
| Fecha | 2026-10-20 |
| Órgano | Comité de Evaluación Científica, Económica y Tecnológica de E-COMMERCE WARS. Miembro F, juez metodológico |
| Objeto | Responder a la pregunta de la §10 de la misión: «¿Qué condiciones técnicas, económicas, estadísticas y metodológicas deben cumplirse para que E-COMMERCE WARS deje de ser únicamente una simulación educativa y se convierta en una herramienta confiable para experimentar con estrategias comerciales aplicables al mercado real?» |
| Versión evaluada | Código: `hashArbolCodigo` `c808707c36d2656fcb36f8cc638dec1a63157d1b9a888466ec33ab31a2fbbd99`. Reglas: `config/experiment.json`, SHA-256 `1921ec29…0d9c`, `version_reglas` 1.0.0, con el candado «Sesión de construcción — pendiente de confirmación humana». **Sin commit**: `ecommerce-wars/` no está versionado (HEAD del repositorio: `0f2a027`). |
| Naturaleza | Dictamen **consultivo**. No modifica sentencias, reglas selladas, configuración ni registros. No autoriza ninguna acción: toda medida que propone requiere la aprobación nominal de una persona. |
| Insumos | `REPORTE_POSTMORTEM.md`, `BRECHAS_MERCADO_REAL.md`, `MATRIZ_MEJORAS.md`, `EXPERIMENTOS_V2.md`, `ROADMAP_V2.md` y los memos A, B, C1, C2, D y E (`anexos/memos/`) |

**Etiquetas:**
- **[HECHO]**: verificado.
- **[EXPLORATORIO]**: cifra de la exploración del postmortem, no prerregistrada.
- **[INFERENCIA]**: deducción razonada.
- **[HIPÓTESIS]**: conjetura por probar.
- **[RECOMENDACIÓN]**: requiere aprobación humana.

## Respuesta breve

Hoy el sistema **no es apto**. Para llegar a serlo debe superar, en este orden, seis etapas:
1. contención y evidencia atribuible;
2. integridad, aislamiento y eliminación de artefactos;
3. validación estadística confirmatoria, con una regla de decisión de error conocido;
4. realismo económico de los mecanismos que hoy determinan el resultado;
5. validación predictiva contra datos reales;
6. un piloto supervisado en modo sombra.

Las etapas 1 a 3 lo convierten en un laboratorio confiable **dentro del modelo**. Solo las etapas 4 a 6 permiten hablar de aplicabilidad al mercado real, y esa aplicabilidad vale únicamente para el comercio y el periodo validados.

---

## 1. Antecedentes y evidencia valorada

### 1.1 Qué se examinó y con qué peso

| Fuente | Método | Peso en este dictamen |
|---|---|---|
| Verificaciones del orquestador sobre el repositorio (REPORTE §2.1, §3) | `npm test` (93/93), `verificar` sobre `prueba-base` y `prueba-7`, hashes, lectura de código y documentos | **Alto** para hechos de software: son reejecutables |
| Exploración del orquestador (REPORTE §4) | 24 conjuntos y 630 corridas en modo en-proceso, sobre una copia con la misma huella; semillas 20261019–28 y 900001–040 | **Medio**: exploratoria, no prerregistrada, diseñada e interpretada por el mismo comité |
| Memo A (economía) | Código y configuración citados; dos cálculos estilizados que no son el motor | Alto en formas funcionales; bajo-medio en magnitudes estilizadas |
| Memo B (reanálisis ciego) | Código propio; no abrió el análisis del orquestador hasta terminar | **Alto** como réplica: coincide con el orquestador hasta ±1 peso en los extremos de los IC. Su ceguera es de **análisis, no de datos**: usa las mismas corridas |
| Memo C1 (agentes) | Mecanismo leído en el código; memoria reconstruida y validada contra `memoria.json`; una sola semilla | Alto en mecanismo; ilustrativo en efecto |
| Memo C2 (confiabilidad) | Inyección de fallos EXP-0 a EXP-11 sobre una copia, en modo en-proceso; sin Linux | Alto para los fallos reproducidos. EXP-8 se probó sobre procesos ficticios |
| Memo D (comercio electrónico) | 22 fuentes externas consultadas el 2026-10-20 | Medio. E verificó solo una muestra; CF621 quedó **no verificable** |
| Memo E (auditoría adversarial) | Intentó refutar 12 afirmaciones con código propio | **Alto**: es la única revisión orientada a refutar. Sus correcciones ya se aplicaron |

**Comprobaciones propias de F** [HECHO], todas de solo lectura:
- `config/experiment.json:6` contiene `"semilla": 20261019`, y su SHA-256 es `1921ec29…`.
- El candado dice «pendiente de confirmación humana».
- `README.md:103` dice «competencia pareja».
- `README.md:3-5` dice «agentes autónomos» pero no contiene la palabra «aprendizaje».
- `anexos/datos/` contiene 24 conjuntos con 630 corridas, más 2 de reproducción.
- Hay 7 registros con `ENOSPC` en `anexos/datos/logs-enospc/`.
- El disco tenía **552 MiB libres** al redactar este dictamen.

### 1.2 Grado de la evidencia

- **Hechos verificados:** determinismo (20,603 eventos con cuerpos idénticos desde otra ruta); conciliación en todas las corridas; Juez y reconstructor coinciden en 50/50; la semilla oficial es la de `prueba-base`; segmentos disjuntos (presión de subasta en 0/555 y 0/117); elección de tienda ciega al precio; defecto de las fichas; ausencia de firmas; truncamiento y `.md` alterado no detectados (EXP-6b, EXP-7); `aprender` no idempotente (EXP-1); sin candado de corrida (EXP-3).
- **Resultados exploratorios:** P(2×) fuera de muestra de 0.35 [0.22, 0.51]; cuota de ALFA de 56.2 % [54.3, 57.9]; tasas con estrategias idénticas; ablación de la memoria; intercambio y espejos; sensibilidad; efecto de la recalibración.
- **Inferencias:** el torneo oficial reproduciría «sin ganador» (alta); la regla 2× no controla el error tipo I; las magnitudes del simulador no sirven como pronóstico.
- **Hipótesis:** sobreajuste del bloque de calibración (B §5.3); mecanismos concretos de la ventaja de ALFA (A §2.1, C1 H-perfil); ejecución de código en el harness vía EXP-8 en Linux.

### 1.3 Limitaciones del propio comité

1. **Todas las instancias, incluida la de F, son un mismo modelo de lenguaje.** La independencia es de proceso y contexto, no de formación ni de criterio. Los errores compartidos no se detectan por consenso.
2. **No hubo revisión humana externa.** Ningún estadístico, economista, especialista en seguridad o jurista humano revisó el trabajo.
3. El mismo comité **diseñó, ejecutó e interpretó** la exploración. B replicó el análisis, pero no la generación de datos.
4. Una sola versión de código. Se usó el modo en-proceso por costo y no se probó en Linux.
5. E no reprodujo EXP-8 en vivo, ni pudo verificar CF621 ni el subíndice del INPC.
6. F leyó todos los entregables antes de dictar. No es ciego a sus conclusiones.

---

## 2. Considerandos

**Primero. La validez del software y la validez económica del modelo son dos cosas distintas.** Las 93 pruebas, `verificar` y la conciliación al 100 % acreditan que el programa hace lo que su diseño dice; ninguna contrasta el diseño con un mercado. El modelo tiene 232 parámetros fijados a mano, ninguno calibrado con datos reales [HECHO, memo D], y su estructura es la de un mercado repartido de hecho: segmentos disjuntos, elección de tienda ciega al precio, descuento y lealtad contados dos veces, lealtad sin decaimiento, y sin IVA, crédito, calendario anual ni marketplace. Incluso los mecanismos causales que se identifiquen dentro del modelo son propiedades de formas funcionales elegidas por el diseñador.

**Segundo. El registro es íntegro, pero no auténtico.** La cadena detecta ediciones parciales, pero no el truncamiento de la ronda final (EXP-7), la alteración del `.md` de la sentencia (EXP-6b), la sustitución del módulo de equipo (EXP-6) ni la regeneración completa por quien tiene escritura. No hay firmas ni anclaje externo; la autorización humana es texto libre, y la reanudación puede divergir en silencio (EXP-1). El expediente de una corrida no prueba nada **frente al operador**.

**Tercero. Una victoria 2× no prueba superioridad estratégica.** Las razones:
1. Un torneo es una sola trayectoria. El ICC de la cuota es 0.565, así que 12 rondas equivalen a unas 1.7 observaciones independientes [EXPLORATORIO, B].
2. La regla es un máximo sobre 12 «miradas», unas 4 a 7 efectivas.
3. Con estrategias **idénticas**, declara ganador en el 17.5–25 % de los torneos, según el nulo comparable. Con la ventaja real de ALFA, en el 35 %: apenas el doble [EXPLORATORIO].
4. Su probabilidad de disparo depende de la volatilidad de la interacción, no solo de la ventaja.
5. V3–V6 nunca fueron limitantes, así que la regla se reduce a V1.
6. 2 de las 14 victorias fuera de muestra fueron para OMEGA, la empresa peor en promedio.
7. Mover un solo parámetro ±20 % cambia que haya o no ganador en el 20–55 % de las semillas [EXPLORATORIO, B §7].

Sí es cierto que, cuando la regla declara ganador, este coincide con el líder acumulado de esa semilla [EXPLORATORIO, B]. El problema no es la semilla, sino generalizar a partir de ella. La victoria de ALFA con la semilla 7 (ronda 3, $166,622 frente a $77,336) es una anécdota verificada, no evidencia.

**Cuarto. El torneo oficial ya está jugado.**
- La semilla sellada, 20261019, es la de `runs/prueba-base`. Es también la primera del bloque de calibración, porque `banco.ts` usa `cfg.semilla + i`. Esa corrida terminó sin ganador en la ronda 12 [HECHO].
- E comparó ronda a ronda: 96 comparaciones, 0 diferencias. El `modo` solo entra en los hashes.
- Que el modo oficial reproduciría ese resultado es [INFERENCIA, alta].
- El sello de reglas, además, no tiene autorización humana.
- Ejecutarlo produciría un resultado sin información nueva, ya conocido por quien calibró, pero con apariencia de confirmación oficial. No implica mala fe, pero no es una evaluación ciega.

**Quinto. La recalibración se hizo dentro de muestra y contra el resultado.**
- Se movieron `peso_calidad` (2.2 → 1.6) y los presupuestos para equilibrar el desenlace entre dos estrategias fijas, con las mismas semillas que luego se reportaron [HECHO].
- Fue formalmente simétrica, pero sustantivamente asimétrica: `calidad_neutral` = 0.6 coincide con la calidad de OMEGA [INFERENCIA, alta, A].
- Fuera de muestra, redujo la cuota de ALFA de 64.1 % a 56.2 % y P(2×) de 0.85 a 0.35 [EXPLORATORIO]. El efecto medio se generaliza, pero no hay paridad.
- La homogeneidad anómala del bloque de calibración (DE de la cuota 0.020 frente a 0.060, p = 0.02, prueba formulada después de ver los datos) es compatible con sobreajuste [HIPÓTESIS].
- `docs/ARQUITECTURA.md` dice «9 de 10» y con el código actual se obtiene «10 de 10» [HECHO, B]: la medición documentada no es atribuible a una versión.
- El banco del README es dentro de muestra y no valida nada.

**Sexto. Hay artefactos que contaminan la comparación y pueden explotarse.** El defecto de las fichas lleva 5 SKU de ALFA a 0.95; OMEGA copia como precio de lista las liquidaciones del día 7; el prior de marketing es la estructura de CTR del propio simulador; la semilla está en la vista y el ACL permite leer `simulation/` y `config/`. Los agentes actuales no explotan los dos últimos, pero un optimizador LLM o RL sí lo haría (oráculo, Goodhart). Hasta medirlos (E0.4), la comparación ALFA–OMEGA mezcla estrategia y defecto.

**Séptimo. El «aprendizaje» es adaptación heurística, pero tiene efecto.** Apagar solo el **canal de memoria entre rondas** de ALFA reduce sus ventas netas en 38,490 MXN por ronda [−47,914, −28,659] y su P(2×) de 0.35 a 0.03 [EXPLORATORIO]. Las hipótesis de los agentes no retroalimentan nada. «Aprendizaje» y «agentes autónomos» sobreprometen.

**Octavo. No hay evidencia alguna sobre el mercado real.** Hay fuentes públicas para la forma estacional (EMEC) y los pagos (CF621, con salvedad de definición y sin reverificar por E). Elasticidades, devoluciones por talla, incrementalidad publicitaria y meses sin intereses **no tienen fuente pública verificable**; solo un piloto con agregados disociados puede medirlos. El marco de datos personales cambió (nueva LFPDPPP, DOF 20-03-2025, confirmada por E).

**Noveno. Proporcionalidad.** Determinismo, cadena sellada, capacidad contrafactual (`simularPeriodo`) y conciliación contable son una buena base para un laboratorio de mecanismos y conviene preservarlas. El camino es factible pero largo: las estimaciones del comité, sin fuente externa, van de 0.5–1 día-persona (Fase 0) a 7–12 semanas-persona (Fase 9B).

---

## 3. Dictamen sobre el estado actual

E-COMMERCE WARS, en la versión evaluada, es una **simulación educativa determinista, con un registro íntegro frente a ediciones parciales pero sin autenticidad**. Sirve como demostración y como prototipo de laboratorio de mecanismos internos.

**No es apta como herramienta de experimentación comercial aplicable al mercado real.** Tampoco es una fuente de evidencia confirmatoria sobre la superioridad de una estrategia, ni siquiera dentro del propio modelo.

Fundamentos:
1. Ningún parámetro está calibrado contra el mercado.
2. Su regla de decisión no tiene error controlado.
3. La única evidencia competitiva es exploratoria o está dentro de muestra.
4. La evidencia no es auténtica frente a quien tiene escritura.
5. Hay artefactos de agente sin medir.

| Nivel | Descripción | Se alcanza al cerrar |
|---|---|---|
| N0 | Demostración educativa | Estado actual (con elementos parciales de N1) |
| N1 | Laboratorio reproducible, íntegro y atribuible | Fases 0 y 1 |
| N2 | Inferencia con error controlado dentro del modelo | Fase 2 |
| N3 | Mecanismos económicos defendibles | Fase 3 |
| N4 | Validado predictivamente para un comercio y un periodo | Fase 5 |
| N5 | Herramienta supervisada de apoyo a decisiones | Fase 6 |

«Herramienta confiable para experimentar con estrategias aplicables al mercado real» exige **N4** como mínimo para experimentar, y **N5** para apoyar decisiones reales.

---

## 4. Condiciones necesarias

**Prioridad:**
- **B**, bloqueante: impide cualquier uso científico u oficial.
- **N**, necesaria para el uso comercial.
- **D**, deseable.

Cada condición tiene un criterio verificable y la evidencia que se exige. Todas son [RECOMENDACIÓN].

### 4.1 Técnicas (CT)

| ID | Prio. | Condición | Criterio de cumplimiento | Evidencia exigida | Ref. |
|---|---|---|---|---|---|
| CT-1 | B | Código congelado y atribuible | Commit y tag firmados del árbol exacto. Huella ampliada a `scripts/`, `apps/`, `config/`, lockfile, `node_modules/` y binario de Node, llevada al génesis y verificada **al arrancar**. `modulosEquipo` rechazado en modo oficial | Tag con hash anclado. Prueba que altera `scripts/verificar.ts`, `package-lock.json` o el módulo de equipo y es rechazada al arrancar (C2 §5.11–5.12) | M-03, M-17 |
| CT-2 | B | Margen de disco | ≥ 2 GB libres antes de cualquier campaña; `statfs` en cada ronda, con pausa limpia | `df` registrado. Prueba de disco lleno sin línea desgarrada y reanudable (C2 §5.4) | M-04, M-14 |
| CT-3 | B | Reanudación transaccional y exclusión mutua | Candado de corrida; `aprender` idempotente; commit en dos fases; manifiestos verificados antes de reanudar; WAL con marcas de fase | Matriz de kill -9 (C2 §5.1): cada punto termina en el **mismo hash final** o en un **rechazo documentado**. EXP-1, 2, 3, 4 y 10, repetidos, dan el resultado correcto | M-10, M-11, M-16, M-18 |
| CT-4 | B | Integridad de todo lo visible | `verificar` cubre `.md`, `rounds/`, `resultados.json` y el reporte final. Cola desgarrada reportada sin caída. Cabeza de la cadena anclada | EXP-5, EXP-6b y EXP-7 detectados en CI | M-12, M-15, M-24 |
| CT-5 | B | Aislamiento con fallo cerrado | Canario de red sellado en la cadena. En modo oficial, la prueba de red **falla** (no se omite) si no hay aislamiento. bwrap en Linux. `--disable-sigusr1` en todo Node sin restricciones. Agentes con otro UID o en otro espacio de PID. `EW_PERMITIR_RED_AGENTES` prohibida | CI en Linux y macOS. Un agente hostil que usa `kill(ppid)` o `_debugProcess` produce un incidente y no abre el inspector (C2 §5.2, §5.10) | M-20, M-21, M-22 |
| CT-6 | N | Autenticidad | Firmas Ed25519 por principal. Anclaje externo **solo de hashes** (RFC 3161 o Rekor). Incidentes contados por el harness o el SO | Re-sellar sin clave falla. Una cadena regenerada se detecta frente al ancla. EXP-9 ya no suprime incidentes | M-23, M-24, M-26 |
| CT-7 | N | Durabilidad | `fsync` de archivo y directorio, o un servicio de *commit* durable. Bucle de escritura completa | Pruebas de escritura corta y de corte de energía (C2 §5.5–5.6) | M-13 |
| CT-8 | B con LLM o RL; N en otro caso | Vista saneada y casete | Sin `semilla` en la vista; ACL sin `simulation/` ni `config/`; casete sellado con reproducción que falla cerrada | Prueba de aislamiento sobre claves anidadas; reproducción del casete al 100 % | M-32, M-70, M-71 |
| CT-9 | D | Plazos en modo en-proceso; vista pública sin tamaños de archivo | Pruebas de *timeout*; vista revisada | — | M-19, M-54 |

### 4.2 Económicas (CE)

| ID | Prio. | Condición | Criterio de cumplimiento | Evidencia exigida | Ref. |
|---|---|---|---|---|---|
| CE-1 | B | Artefactos eliminados y medidos | Versión nueva de agentes, resellada, sin el defecto de fichas, sin la copia de liquidaciones y con un prior que no sea la estructura de CTR del simulador | E0.4 publicado. Si \|ΔG\| ≥ 0.05, toda la evidencia V1 se declara confundida | M-30, M-31; BRECHAS X1, X2, M4 |
| CE-2 | N | Mecanismos de demanda defendibles | Elección de tienda sensible al precio; doble conteo de descuento y lealtad revisado; decaimiento de la lealtad; saciedad | Por mecanismo: neutralidad (mismo hash con el parámetro neutro) y experimento con IC. Descomposición de la ventaja (exp. 2 y 3) | M-60, M-61 |
| CE-3 | N | Estado de resultados realista | IVA, embudo de pago y contracargos, crédito y plazos, costos fijos con nómina, renta y plataforma | P&L por pedido. Contraste de órdenes de magnitud en 9A, con advertencias de definición | M-62, M-63; BRECHAS F1–F4, P1–P4 |
| CE-4 | N | Calendario anual y choques | Calendario contrastado con EMEC 463 y 469; choques exógenos | Experimento 7; correlación con EMEC (9A) | M-64 |
| CE-5 | N | Competencia por atención y medición incremental | Segmentos solapables; CTR decreciente; presión continua; ROAS y CAC rotulados «atribuidos»; ROAS incremental contrafactual | Experimento 5 (H5b, H5c) | M-33, M-66 |
| CE-6 | N | Calibración contra momentos externos | Momentos objetivo y fuentes fijados **antes** de ver resultados competitivos. Solo un subconjunto pequeño y prerregistrado de los 232 parámetros. Cada parámetro rotulado como supuesto, fuente pública o piloto | Prerregistro sellado; tabla de procedencia por parámetro | M-81; BRECHAS §4.1 |
| CE-7 | N, condicionada | Marketplace, talla y color, proveedores con capacidad | Obligatoria si la decisión que se evalúa depende del canal, de la talla o del suministro | Experimentos 4 y 8; datos del piloto para talla | M-65, M-67, M-68 |
| CE-8 | D | Métricas paralelas | Panel «¿quién gana con otra métrica?» | — | M-52 |

### 4.3 Estadísticas (CS)

| ID | Prio. | Condición | Criterio de cumplimiento | Evidencia exigida | Ref. |
|---|---|---|---|---|---|
| CS-1 | B | Protocolo de etapas y semillas comprometidas | CAL → SEL → EVA → OFICIAL con bloques disjuntos. Antes de correr se publica fuera del equipo el hash de la lista de semillas más un *nonce*. Las semillas se **derivan** de un valor que el experimentador no controla | Compromiso fechado; derivación verificable por terceros | M-40; EXPERIMENTOS §0.1–0.3 |
| CS-2 | B | Réplica confirmatoria de la exploración | E0.1–E0.5 con semillas nuevas y sus criterios. Por ejemplo, E0.1: simetría por TOST dentro de ±0.05 | Prerregistro, código, hashes y resultados publicados | E0.1–E0.5 |
| CS-3 | B | Regla de decisión con error conocido | Falsos positivos ≤ 0.05 bajo el nulo prerregistrado y potencia ≥ 0.8 ante el efecto mínimo de interés, decididos por una persona. La regla 2× puede seguir como regla de juego, pero no como prueba | Características operativas (E0.5); decisión escrita | M-41, M-42 |
| CS-4 | B | Inferencia por semilla y tamaño suficiente | La semilla es la unidad. σ_d se reestima en un bloque DES y el n de EVA se calcula con ella. Referencia [EXPLORATORIO]: unas 102 semillas pareadas para δ = 0.05 con σ_d = 0.18. Holm. Ningún hallazgo con una sola semilla | Plan de potencia en el prerregistro | EXPERIMENTOS §0.4–0.5 |
| CS-5 | N | Números aleatorios comunes y reportes atribuibles | Flujos por empresa y entidad; control re-corrido con el motor nuevo; modo sin parada; huella en todo reporte | Prueba de neutralidad; metadatos en `banco` y `reproducibilidad` | M-43, M-44 |
| CS-6 | N | Robustez | Malla prerregistrada sobre `umbral_compra`, `peso_calidad`, `peso_precio` y `actividad_diaria`, con interacciones. Se publica la región donde la conclusión se sostiene | Informe de robustez | Memo B §8.5 |
| CS-7 | N | Validación predictiva | H9: WAPE ≤ 0.9 × el ingenuo estacional en al menos 4 de 6 folds; cobertura al 80 % dentro de [70, 90] %; ningún fold por encima de 2 × el ingenuo. Origen rodante y evaluación ciega | Informe 9B con configuración sellada por fold | Exp. 9; Fase 5 |
| CS-8 | D | Incertidumbre visible | Bandas multisemilla, etiqueta epistémica, *regret* contrafactual | — | M-50, M-51, M-53 |

### 4.4 Metodológicas (CM)

| ID | Prio. | Condición | Criterio de cumplimiento | Evidencia exigida | Ref. |
|---|---|---|---|---|---|
| CM-1 | B | Torneo oficial informativo | No usar 20261019. Semilla nueva por compromiso y revelación tras congelar el código. Resello con firma personal | Decisión escrita; compromiso fechado; candado firmado | M-01, M-25 |
| CM-2 | B | Afirmaciones públicas corregidas | Las del resolutivo 3, en `README.md`, `docs/ARQUITECTURA.md` y `docs/BLOQUEOS.md` | Diff de la documentación aprobado por una persona | M-02 |
| CM-3 | B | Aprobación humana nominal y trazable | Ningún cambio, experimento ni resello sin la autorización firmada de una persona identificada | Registro de autorizaciones | ROADMAP; MATRIZ |
| CM-4 | B | Separación entre exploración y confirmación | Lo del REPORTE §4 se cita siempre como exploratorio. Las semillas quemadas se excluyen. Los rangos fijos propuestos en los memos A y C1 no se usan tal cual | Etiquetas en todo documento | EXPERIMENTOS §0.2–0.3 |
| CM-5 | N | Revisión humana externa | Al menos un estadístico, un economista y un especialista en seguridad, humanos y ajenos a la construcción y al comité, revisan las fases 2, 3 y 5. La puerta de la Fase 6 no puede descansar solo en instancias del mismo modelo | Informes firmados | Propuesta de este dictamen; no figura en la MATRIZ |
| CM-6 | N | Historial de análisis | Documentar el intento revertido de recalibrar OMEGA, la versión con que se obtuvo «9 de 10» y todo camino descartado | Registro en `docs/` | Memo A §7.2; memo B §5.2 |
| CM-7 | N | Marco legal y de datos del piloto | Revisión jurídica de la LFPDPPP (DOF 20-03-2025, art. 9-III), de si existe un reglamento y de la LFPC (art. 76 Bis). Convenio. Solo agregados disociados con k ≥ 10, sin datos personales ni siquiera con hash. Custodia fuera de `runs/`. Constancia de destrucción | Opinión legal y convenio firmados; prueba de reidentificación | M-80; memo D §4 |
| CM-8 | N | Uso supervisado | Modo sombra de 4–8 semanas. Acciones reales solo con aprobación escrita y ejecutadas por personas. Límites de pérdida y criterios de suspensión definidos de antemano | Bitácora del piloto | Fase 6 |
| CM-9 | D | Validez externa ampliada | Más de un comercio. Resultados publicados como válidos «para ese comercio y periodo» | — | Exp. 9 |

### 4.5 Los cinco bloques bloqueantes principales

1. **Contención:**
   - no correr el oficial con la semilla quemada y resellar con firma personal (CM-1);
   - corregir las afirmaciones públicas (CM-2);
   - liberar disco (CT-2).
2. **Evidencia atribuible y transaccional:** CT-1, CT-3 y CT-4.
3. **Aislamiento con fallo cerrado:** CT-5.
4. **Artefactos eliminados y medidos:** CE-1 y E0.4.
5. **Validación estadística confirmatoria:**
   - protocolo de semillas comprometidas;
   - E0;
   - regla de decisión con error tipo I y potencia conocidos;
   - todo lo anterior corresponde a CS-1 a CS-4.

---

## 5. Riesgos

La probabilidad y el impacto son juicios cualitativos de F [INFERENCIA].

| # | Riesgo | Prob. | Impacto | Señal temprana | Mitigación |
|---|---|---|---|---|---|
| R-01 | **Sobreajuste:** calibrar o elegir variantes con las mismas semillas con que se reporta | Alta (ya ocurrió) | Alto | Menor dispersión dentro que fuera de muestra; resultados que no replican en EVA | CS-1, CE-6, CM-4 |
| R-02 | **Goodhart:** optimizar la regla de victoria (p. ej., descuento profundo con margen apenas positivo) en lugar del objetivo comercial | Media; alta con LLM o RL | Alto | Más VN con margen cercano a 0 | CS-3, CE-8, exp. 2 |
| R-03 | **Oráculo:** reconstruir el ruido con la semilla visible o explotar el prior de caja blanca | Baja hoy; alta con LLM o RL | Muy alto | Pronósticos anómalamente precisos; lecturas de `config/` | CT-8 antes de la Fase 4 |
| R-04 | **Artefactos atribuidos a la estrategia** (fichas, día 7) | Alta (están presentes) | Medio-alto | Diferencias que desaparecen al corregir el código | CE-1, E0.4 |
| R-05 | **Leer las pruebas exitosas del software como validación económica** | Alta | Alto | Citar «93/93» o «verificar superado» como prueba de realismo | CM-2; rótulo de calibración por parámetro; resolutivo 8 |
| R-06 | **Reputacional por el README:** «competencia pareja», «1 victoria», «detectan cualquier alteración», «agentes autónomos» | Alta mientras no se corrijan | Medio-alto | Que se citen o difundan | CM-2 de inmediato |
| R-07 | **Integridad:** regenerar o truncar la historia sin dejar rastro | Media | Alto | Sin ancla externa ni hashes publicados | CT-4, CT-6 |
| R-08 | **Autenticidad:** autorizaciones y actores que no se pueden verificar | Alta (estado actual) | Alto | `autorizadoPor` como texto libre | CT-6, CM-1, CM-3 |
| R-09 | **Señales e inspector entre procesos** (EXP-8, no reproducido en vivo por E) | Baja con los agentes actuales; media-alta con agentes no programados | Alto. En Linux, ejecución de código en el harness [INFERENCIA] | Caída inexplicada del harness; puerto 9229 abierto | CT-5 |
| R-10 | **Linux sin aislamiento de red:** la prueba se omite y el preflight aprueba | Alta si se corre en Linux | Alto | Prueba de red «omitida» | CT-5 |
| R-11 | **Disco lleno** | Alta (552 MiB libres; 7 abortos) | Medio-alto | `ENOSPC`; `.tmp-*` huérfanos | CT-2 |
| R-12 | **Reanudación no transaccional y divergencia silenciosa** | Media | Alto | `rondasAnalizadas` mayor que la ronda; dos procesos sobre una corrida | CT-3 |
| R-13 | **Torneo oficial con la semilla quemada leído como confirmación** | Media | Alto | Planear la fase 9 sin resello | CM-1 |
| R-14 | **Legal y privacidad en el piloto:** reidentificación, transmisión sin autorización (LFPC art. 76 Bis), finalidad no cubierta por el aviso (LFPDPPP art. 11) | Media | Muy alto | Solicitudes de datos por cliente o con hash; celdas con k < 10 | CM-7 |
| R-15 | **Acción real no supervisada en el piloto** | Baja con controles | Muy alto | Un agente con acceso a una pasarela o a una cuenta de anuncios | CM-8; restricción permanente |
| R-16 | **Monocultivo de revisores** (un solo modelo) | Alta | Medio-alto | Ausencia de discrepancias; errores compartidos | CM-5 |
| R-17 | **Calibrar con fuentes no verificadas** (CF621, subíndice del INPC) | Media | Medio | Cifras sin reverificar | Reverificación humana; rótulo de fuente |
| R-18 | **Validez externa limitada** (un solo comercio) | Alta | Medio | Generalizar los resultados de 9B | CM-9 |

---

## 6. Plan de acción

El plan sigue `ROADMAP_V2.md`. Ninguna fase empieza si la anterior no superó su puerta. Las únicas excepciones son las tareas que el roadmap marca como paralelizables.

**Roles humanos.** Este dictamen no designa personas.
- **RHE:** responsable humano del experimento.
- **OP:** operador.
- **RS:** responsable de seguridad.
- **REI:** revisor estadístico independiente.
- **AJ:** asesoría jurídica.
- **RC:** representante del comercio colaborador.

| Fase | Condiciones que cierra | Puerta de salida (verificable) | Autoriza | Afirmación habilitada al salir |
|---|---|---|---|---|
| **0 · Contención** | CM-1, CM-2, CM-3, CT-2; tag de CT-1 | Documentación corregida y aprobada. Tag firmado con la huella. Decisión escrita de no correr el oficial con 20261019. ≥ 2 GB libres | RHE; OP (disco) | Ninguna nueva. Demostración educativa con afirmaciones corregidas |
| **1 · Integridad, aislamiento y artefactos** (1A, 1B, 1C) | CT-1, CT-3 a CT-7; versión resellada para CE-1 | Las 15 pruebas de C2 §5 en CI con Linux y macOS. Kill -9 termina en el mismo hash o en un rechazo documentado. La red falla cerrada. `verificar` detecta truncamiento, sustitución de equipo y `.md` alterado | RHE + RS | N1: «el registro es íntegro y atribuible» |
| **2 · Validación estadística** | CS-1 a CS-5; E0.4 para CE-1 | E0 publicado con prerregistro y hashes. Falsos positivos y potencia de la regla documentados. Decisión humana sobre la regla. Simetría confirmada por TOST | RHE, con visto bueno de REI | N2: «dentro del modelo, la estrategia X supera a Y con error controlado» |
| **3 · Realismo económico** | CE-2 a CE-7, CS-6 | Neutralidad e IC por mecanismo. Descomposición de la ventaja (exp. 3). Ninguna afirmación de una sola semilla | RHE + REI + economista externo (CM-5) | N3: «el mecanismo M explica E en un modelo con estructura defendible» |
| **4 · Híbridos** (opcional; fuera de la ruta crítica) | CT-8 | Casete reproducido al 100 %. Cero violaciones de ACL. H6.1–H6.3 resueltas | RHE + RS + aprobación de presupuesto | Comparación LLM frente a agentes programados, solo dentro del modelo |
| **5 · Datos reales** | CE-6, CS-7, CM-7 | 9A completado. Opinión legal y convenio firmados. H9 aceptada en 9B. Si se rechaza, se vuelve a la Fase 3 | RHE + AJ + RC; evaluación ciega de REI | N4: «predice los KPI agregados de ese comercio y periodo mejor que el ingenuo» |
| **6 · Piloto supervisado** | CM-5, CM-8 | *Regret* medido frente a lo ejecutado. Cero incidentes de privacidad. Error dentro de los umbrales fuera del periodo de calibración. **Dictamen humano externo** favorable | RHE + RC + AJ | N5: «herramienta supervisada de apoyo a decisiones para ese comercio» |

**Notas al plan:**
1. E0.4 requiere la versión corregida de los agentes (bloque 1C). El prerregistro de la Fase 2 debe declarar sobre qué versión se confirma cada E0: la V1 sellada o la corregida.
2. La Fase 4 no es requisito de la aplicabilidad comercial.
3. Los agentes **nunca** ejecutan compras, pagos ni campañas reales, en ninguna fase.

---

## 7. Resolutivos

1. **Estado.** Se clasifica E-COMMERCE WARS como una simulación educativa determinista con registro íntegro frente a ediciones parciales y sin autenticidad, de nivel N0. No es apta como herramienta de experimentación comercial aplicable al mercado real.
2. **(a)** Se recomienda **no ejecutar el torneo oficial con la semilla 20261019**. Cualquier torneo oficial futuro requiere:
   - una semilla nueva por compromiso y revelación, fijada tras congelar el código;
   - un resello con firma personal.
3. **(b)** Se recomienda **corregir las afirmaciones públicas**:
   - «competencia pareja» (`README.md:103`);
   - el «1 de 10» presentado como tasa, que debe marcarse como dentro de muestra;
   - la cobertura de ramas «83.4 %», cuando se midió 83.14 %;
   - «agentes autónomos» (`README.md:5`);
   - «aprendizaje» (`docs/ARQUITECTURA.md:95`, `docs/BLOQUEOS.md:37`), que debe decir «adaptación heurística entre rondas»;
   - el ajuste «simétrico» (`docs/ARQUITECTURA.md:102`);
   - que se «detectan cualquier alteración» (`docs/BLOQUEOS.md:46-47`).
4. **(c)** **Ninguna propuesta** de este dictamen ni de los entregables se implementa sin la aprobación nominal y trazable de una persona. Este dictamen no autoriza nada.
5. **(d)** Las semillas **20261019–20261028, 900001–900040 y 7** quedan **excluidas de la evidencia confirmatoria**. Se recomienda excluir también las semillas usadas en `tests/` y en cualquier piloto.
6. **(e)** Este dictamen **no altera sentencias, reglas selladas ni registros históricos**. `runs/prueba-base`, `runs/prueba-7`, `reports/` y el candado vigente permanecen como están.
7. Los resultados del REPORTE §4 se citan como exploratorios hasta que E0 los confirme.
8. Ninguna victoria 2×, incluida la de la semilla 7, se presenta como evidencia de superioridad estratégica. Ninguna prueba de software se presenta como validación económica.
9. Ningún uso científico u oficial procede sin cumplir las condiciones B de la §4. Ningún uso comercial procede sin cumplir además las condiciones N y superar las puertas de las Fases 5 y 6.
10. Se recomienda una revisión humana externa (CM-5) antes de dar por definitivo este postmortem.
11. Antes de cualquier nueva corrida, el operador libera al menos 2 GB de disco.
12. Se remiten al orquestador las observaciones de la §9.

---

## 8. Votos particulares

**VP-1. ¿De dónde viene la ventaja de ALFA?** C1 (H-perfil) la atribuye a la cadena de calidad, los segmentos y la ausencia de competencia publicitaria, «no al aprendizaje» [HIPÓTESIS]. A (§2.1) la atribuye a mecanismos dinámicos, porque su cálculo estático estilizado da una razón ALFA/OMEGA de 0.91 [HIPÓTESIS]. B (§10.4) concluye que «proviene casi por completo del aprendizaje de ALFA». Los datos [EXPLORATORIO]: la cuota de ALFA en R1 es 0.568 en las cuatro celdas, antes de cualquier memoria; sin memoria en ninguna empresa cae hacia 0.50 en R12; el efecto del perfil es +0.059 y el de la memoria de ALFA, +0.054. **Valoración de F:** ninguna posición pura se sostiene; hay una ventaja inicial estructural que la memoria sostiene. La hipótesis de C1 queda debilitada para el canal de memoria; la de A debe explicar la ventaja que ya existe en R1; la frase de B exige siempre el matiz «canal de memoria», como señaló E. Se resuelve con E0.3, E0.4 y el experimento 3.

**VP-2. El espejo como nulo.** E (§2.6, §4) presenta el 27/40 del espejo ALFA-ALFA como «la refutación más contundente» de la regla 2×. B (§4.1) y C1 (§14) advierten que ese espejo es otro mercado (se activa la subasta y la volatilidad sube a 0.549): es un nulo pesimista, y el comparable da 17.5–25 %. B informa además que, centrando cada semilla por separado, la tasa cae a 1/40, un límite inferior que elimina la suerte propia de la semilla. **Valoración de F:** la conclusión cualitativa se sostiene, porque un torneo de una semilla incluye esa suerte; la magnitud depende del nulo y debe fijarse en E0.5 con un nulo prerregistrado.

**VP-3. ¿Funcionó la recalibración?** `docs/ARQUITECTURA.md` §7 la da por exitosa. A la califica de sobreajuste respecto del resultado y de asimétrica [INFERENCIA, alta]. B muestra que el efecto medio se generaliza fuera de muestra (−0.08 frente a −0.10; cuota media 0.556 frente a 0.562, p = 0.76), sin paridad, y considera el sobreajuste solo una hipótesis de dispersión. **Valoración de F:** redujo la ventaja de forma generalizable, pero no logró paridad y apuntó al objetivo equivocado (el resultado, no momentos externos). «Funcionó» como ajuste de espectáculo, no como calibración.

**VP-4. Tamaño de muestra.** A planifica unas 42 semillas (y 20 + 60 en sus diseños) con una DE de 0.082. E y EXPERIMENTOS §0.5 corrigen a 0.076 dentro de muestra y 0.238 fuera, y estiman unas 102 semillas pareadas para δ = 0.05. B da 20–40 semillas para el torneo multisemilla sobre la cuota y entre 88 y 350 para estimar P(2×); no contradice a los demás, porque responde a otros estimandos. **Valoración de F:** el plan de A no se usa; cada experimento fija n con la σ_d de su bloque DES.

**VP-5. Alcance de EXP-8 y de las fuentes.** C2 califica EXP-8 como [HECHO] en procesos ficticios y de gravedad alta; E lo deja en PARCIAL. D marca CF621 como [HECHO, A]; E lo considera NO VERIFICABLE. **Valoración de F:** M-20 se mantiene en P0 por precaución, sin presentar como demostrada la explotación en el harness. Las cifras de CF621 no se usan para calibrar hasta que una persona recupere el cuadro.

**VP-6. Margen como métrica de victoria.** A (§7.6) propone evaluar el margen o la utilidad. B (§4.5) advierte que, como regla por ronda, favorece por diseño al modelo premium (40/40) y eleva el falso positivo a 0.93 en el espejo OMEGA-OMEGA. **Valoración de F:** reportarla en paralelo, sí; usarla como regla de decisión, solo con una prueba multisemilla.

**VP-7. Sensibilidad de P(2×).** El REPORTE (§1.6, §4.5) dice que P(2×) se mueve entre 0.05 y 0.60. B (§7) atribuye parte de esa variación a regresión a la media (la referencia en esas 20 semillas era 10/20, frente a 4/20 en las otras 20); solo `actividad_diaria` ×1.2 resulta nominalmente significativo. **Valoración de F:** la conclusión robusta es la de B: con ±20 % en un parámetro, el resultado cambia en el 20–55 % de las semillas.

---

## 9. Observaciones al orquestador

1. **`REPORTE_POSTMORTEM.md` §2.2:** dice «22 conjuntos y unas 680 corridas». La §11 dice «22 conjuntos más la reproducción». En la §6.1 y la §10 aparece «unas 680 corridas». En cambio, `anexos/datos/` y `hashes-datos.txt` contienen **24 conjuntos y 630 corridas**, más 2 de reproducción, y el memo B también cuenta 24. Conviene conciliar.
2. **`REPORTE_POSTMORTEM.md` §11:** remite a `anexos/HASHES.txt`, que **no existe** en este momento.
3. **`REPORTE_POSTMORTEM.md` §10:** la «Huella "después": *(se registra al cierre en esta sección)*» sigue pendiente.
4. **«Aprendizaje entre rondas»:** se cita en `README.md:3-5` en el REPORTE §3, fila 12; en la MATRIZ M-02 («Se habla de "aprendizaje" y "agentes autónomos" (`README.md:3-5`)»), y en el memo C1 §9. Pero `README.md:3-5` solo dice «agentes autónomos». La expresión está en `docs/BLOQUEOS.md:37` («políticas programáticas con aprendizaje entre rondas»), en `docs/ARQUITECTURA.md:95` y en `AGENTS.md:300`. C1 §9 llama «honesta» a esa misma documentación.
5. **MATRIZ M-62:** «[HECHO, fuente] Banxico CF621: contracargos de 0.34–0.39 %» no lleva la salvedad «no reverificado por E» que sí aparece en BRECHAS §1.4 y §2.
6. **ROADMAP Fase 2, acción 3:** propone como ejemplos «ventaja acumulada … con prueba secuencial» y «métrica de margen o utilidad en lugar de ingreso» sin las advertencias del memo B §4.5. Según B, la prueba secuencial dentro de una corrida infla el tamaño, y el margen favorece al modelo premium (falso positivo de 0.93 en el espejo OMEGA-OMEGA). El REPORTE §4.3 sí incluye esas advertencias.
7. **REPORTE §1, punto 6, y §4.5:** «mueve la probabilidad de victoria entre 0.05 y 0.60» no recoge la advertencia de regresión a la media del memo B §7 (ver VP-7).
8. **REPORTE §5.B:** etiqueta como [HECHO] el intento revertido de recalibrar a OMEGA. El memo A §2.2 lo da como «dato del orquestador, no verificado en archivos». Debería figurar como testimonio no verificable.
9. **ROADMAP, vista resumida:** la Fase 2 «depende de 1A», pero E0.4 requiere la versión corregida del bloque 1C (M-30). Además, no se indica sobre qué versión se confirman E0.1–E0.3 y E0.5.
10. **EXPERIMENTOS §0.2:** omite «cualquier semilla usada en `tests/`», que sí figura en el memo B §8. Por otra parte, los memos A §5.0 (960001–960220) y C1 §12–13 (920001–020, 930001–100 y 940001–060) proponen rangos fijos, lo que contradice la derivación no controlada de §0.3. Conviene declarar explícitamente que esos rangos no se usan.
11. **Memo A §5.0, párrafo 7, y diseños V2-1 a V2-8:** siguen indicando «20 + 60» semillas y un MDE de unos 0.03, con σ_d ≤ 0.082. La σ_d observada es 0.184 (EXPERIMENTOS §0.5). Los entregables ya lo corrigen, pero el memo, leído solo, induce a error.
12. **ROADMAP Fase 6:** la puerta «Dictamen favorable del comité» descansa en instancias del mismo modelo. Se sugiere exigir un dictamen humano externo (CM-5).
13. **REPORTE §1, punto 10:** dice «0 de 480 rondas por empresa en cada panel», pero los paneles de sensibilidad tienen 20 semillas, es decir, 240 rondas.
14. Menor: el memo E, fila 10, cita `README.md:96`, `:97`, `:99` y `:100`. Las líneas correctas son 98, 99, 101 y 102. El REPORTE las cita bien.

---

## Nota del orquestador (posterior al dictamen; no forma parte del texto de F)

El texto anterior es el de F, sin cambios. Su copia exacta está en `anexos/memos/F-dictamen.md`.

Estas son las observaciones de la §9 y lo que se hizo con cada una en los demás entregables:

| Obs. | Resolución |
|---|---|
| 1 | Se corrigió a **24 conjuntos y 630 corridas, más 2 de reproducción**, en REPORTE §2.2, §6.1 y §11. |
| 2 | Se creó `anexos/HASHES.txt`, con el SHA-256 de entregables, memos, scripts y datos. |
| 3 | La huella "después" quedó registrada en REPORTE §10. Es idéntica a la de "antes": 452 archivos, `497cf308…`. |
| 4 | REPORTE §3, fila 12, y MATRIZ M-02 citan ahora `README.md:5` («agentes autónomos») y `docs/BLOQUEOS.md:37` / `docs/ARQUITECTURA.md:95` («aprendizaje entre rondas»). |
| 5 | Se añadió a MATRIZ M-62 la salvedad «E no pudo reverificar CF621». |
| 6 | ROADMAP Fase 2, acción 3, incluye ahora las advertencias del memo B §4.5: el criterio multisemilla como opción preferente, la prueba secuencial dentro de una corrida desaconsejada y el margen solo con una prueba multisemilla. |
| 7 | Se añadió a REPORTE §1.6 y §4.5 la advertencia de regresión a la media, junto con el resultado robusto: el desenlace cambia en el 20–55 % de las semillas. |
| 8 | REPORTE §5.B presenta ahora el intento revertido de recalibrar OMEGA como **testimonio no verificable**. |
| 9 | En ROADMAP, la Fase 2 declara que E0.4 depende del bloque 1C y que el prerregistro debe indicar la versión. |
| 10 | EXPERIMENTOS §0.2 añade las semillas de `tests/` y declara que los rangos fijos de los memos A y C1 no se usan. |
| 11 | El memo A se conserva como se entregó, porque es evidencia del proceso. Su plan de muestra queda **sustituido** por EXPERIMENTOS §0.5, como ya indica VP-4. |
| 12 | La puerta de la Fase 6 en el ROADMAP exige ahora un dictamen humano externo (CM-5). |
| 13 | REPORTE §1.10 distingue entre 480 rondas por empresa (paneles de 40 semillas) y 240 (paneles de sensibilidad). |
| 14 | El memo E se conserva como se entregó. Las líneas correctas del README están en el REPORTE §3. |
