# REPORTE_POSTMORTEM — E-COMMERCE WARS

**Comité de Evaluación Científica, Económica y Tecnológica** · 2026-10-20
**Estado de la investigación:** **solo lectura**. No se modificaron el código, las reglas, la configuración, los resultados ni los registros del repositorio. Tampoco se hicieron commits, despliegues ni publicaciones, y no se ejecutó el torneo oficial. La comprobación está en §10.

Los otros entregables están en la misma carpeta:
- `BRECHAS_MERCADO_REAL.md`
- `MATRIZ_MEJORAS.md`
- `EXPERIMENTOS_V2.md`
- `ROADMAP_V2.md`
- `DICTAMEN_JUEZ.md`

Los memos y los datos de soporte están en `anexos/`.

---

## 0. Ficha técnica

| Elemento | Valor | Verificación |
|---|---|---|
| Objeto | `FashionistApp/ecommerce-wars/` | — |
| Control de versiones | **No versionado.** El HEAD del repo es `0f2a027`, y `ecommerce-wars/` aparece como *untracked* | `git status` |
| Huella del código probado | `hashArbolCodigo` = `c808707c36d2656fcb36f8cc638dec1a63157d1b9a888466ec33ab31a2fbbd99`. Coincide con el `hashCodigo` del preflight de `runs/prueba-base` y `runs/prueba-7` | `node -e` de solo lectura |
| Reglas | `config/experiment.json`, SHA-256 `1921ec29…0d9c`, `version_reglas` 1.0.0. El candado dice: `"autorizadoPor": "Sesión de construcción — pendiente de confirmación humana"` | `shasum`, lectura |
| Entorno | macOS 15.7.2 arm64, Node v24.14.0. Disco con **unos 0.5 GB libres de 228 GiB** | `df`, `node --version` |
| Pruebas | `npm test`: 93 pruebas, 93 aprobadas, 0 fallidas | ejecutado en el repo (§3) |

### Comité: qué se ejecutó de verdad

Cada rol se ejecutó como un **subagente independiente real**, con instrucciones propias y sin ver el trabajo de los demás salvo cuando se indica:
- **A**, economista: realismo de mercado.
- **B**, científico de datos: reanálisis estadístico **ciego** de los datos crudos.
- **C**, sistemas multiagente, en dos subagentes: C1 (agentes y aprendizaje) y C2 (confiabilidad e integridad).
- **D**, comercio electrónico: brechas y fuentes externas.
- **E**, auditor adversarial: revisó memos, datos y borradores.
- **F**, juez metodológico: redactó el dictamen a partir de todo lo anterior.

El **orquestador** coordinó al comité. Además diseñó y ejecutó los experimentos exploratorios en una copia del código fuera del repo y redactó este reporte.

**Limitación:** todos los miembros son instancias del mismo modelo de lenguaje. La independencia es de proceso y de contexto, no de formación ni de criterio. No sustituye una revisión humana externa.

### Convención de etiquetas

- **[HECHO]**: verificado, con archivo y línea, comando y salida, o fuente citada.
- **[INFERENCIA]**: deducción razonada a partir de hechos.
- **[HIPÓTESIS]**: conjetura que se puede probar.
- **[RECOMENDACIÓN]**: requiere aprobación humana.

**Todo resultado de §4 es EXPLORATORIO.** No estaba prerregistrado y lo diseñó y ejecutó el propio comité durante el postmortem. Esos resultados deben confirmarse con semillas nuevas según `EXPERIMENTOS_V2.md`, E0.

---

## 1. Resumen ejecutivo: qué aprendimos realmente

1. **El software cumple lo que promete como sistema de registro determinista, pero no como sistema de evidencia auténtica.** [HECHO]
   - Lo que se cumple:
     - las 93 pruebas pasan;
     - `verificar` supera las dos corridas;
     - una reejecución desde otra ruta reproduce los 20,603 eventos con cuerpos idénticos;
     - la ronda 1 del War Room en vivo es idéntica, hash por hash, a la del torneo sin interfaz.
   - Lo que falla:
     - la cadena de hashes **no prueba autoría**: no hay firmas ni anclaje externo;
     - truncar la última ronda o alterar la sentencia en Markdown no se detecta;
     - la reanudación tiene ventanas no transaccionales;
     - un proceso agente puede enviar señales a otros procesos Node del usuario. C2 lo demostró con procesos ficticios; E confirmó las precondiciones en el código, pero no lo reprodujo en vivo.
   - Detalle en §5 y en el memo C2.
2. **El torneo oficial, tal como está sellado, no aportaría información.** [HECHO + INFERENCIA, alta] La semilla sellada (20261019) es la de `runs/prueba-base`, que terminó **sin ganador** en la ronda 12. Los agentes son deterministas, así que el resultado oficial ya se conoce.
3. **La "competencia pareja" del README no se sostiene.** [HECHO, exploratorio] Fuera de muestra (semillas 900001–900040):
   - ALFA vende más que OMEGA en el **82 %** de las semillas, con IC95 [68, 91] %;
   - ALFA tiene una cuota media de ventas netas del **56.2 %** [54.3, 57.9];
   - la regla 2× declara ganador en **14/40** corridas (35 %, IC95 [22, 51] %), frente al "1 de 10" que reporta el README con las semillas de calibración.
4. **La regla de victoria 2× no controla el error de declarar un ganador por azar.** [HECHO, exploratorio; confirmado por el reanálisis ciego de B] Cuando **ambas empresas usan la misma estrategia**, la regla declara un "ganador":
   - en el **17.5–25 %** de los torneos de 12 rondas, según el nulo comparable: espejo OMEGA-OMEGA o nulo por desplazamiento de B;
   - en el **67.5 %** en el espejo ALFA-ALFA, que es más volátil.
   
   Con la ventaja real de ALFA, la tasa es del 35 %: apenas el doble del nulo comparable. Una victoria 2× **no es, por sí sola, evidencia de superioridad estratégica**.
5. **La ventaja sigue a la estrategia (perfil), no a la identidad de la empresa.** [HECHO, exploratorio]
   - Al intercambiar los perfiles, la cuota de la empresa "alfa" pasa de 56.2 % a 44.4 %.
   - En espejo, la cuota es 50.5 % y 49.4 %, sin sesgo de posición detectable.
6. **El resultado depende de la calibración y de parámetros arbitrarios.** [HECHO, exploratorio]
   - Con el mercado anterior a la recalibración, ALFA gana a 2× en el 85 % de las semillas fuera de muestra.
   - Con el mercado vigente, en el 35 %.
   - [HECHO, miembro B] Mover un solo parámetro de mercado un ±20 % cambia el resultado del torneo, es decir, si hay o no ganador, en **el 20–55 % de las semillas**.
   - La P(2×) observada oscila entre 0.05 y 0.60, contra 0.50 de referencia. Parte de esa caída es **regresión a la media**: la referencia en esas 20 semillas fue alta, 10/20 frente a 4/20 en las otras 20 (memo B §7). Solo `actividad_diaria` ×1.2 resultó nominalmente significativo.
   - La recalibración se hizo y se reportó con las mismas semillas.
7. **El "aprendizaje" es adaptación heurística, pero sí importa.** [HECHO + exploratorio]
   - Hay EWMA de demanda, precio con pasos de ±3 %, un bandido ε-greedy y trinquetes de presupuesto (memo C1).
   - Si se apaga **solo el canal de memoria entre rondas** de ALFA, su venta neta cae **38.5k MXN por ronda** [28.7k, 47.9k], unos 19 %, y las victorias 2× bajan de 35 % a 3 %. La reacción al estado sigue activa: inventario, liquidaciones y seguimiento de precio. Lo que se mide es la memoria, no "toda la adaptación".
   - Las "hipótesis" de los agentes no retroalimentan nada.
8. **El mercado es un andamiaje fijo con poca emergencia.** [HECHO]
   - Los segmentos objetivo de ambas empresas son disjuntos: nunca compiten en publicidad.
   - La elección de tienda no depende del precio.
   - El descuento y la lealtad se cuentan dos veces.
   - No hay IVA, inflación, crédito, calendario anual, marketplaces ni tallas.
   - Ningún parámetro está calibrado con datos reales (`BRECHAS_MERCADO_REAL.md`).
9. **Hay dos artefactos que contaminan la comparación ALFA-OMEGA.** [HECHO]
   - Un defecto de punto flotante sube las fichas de ALFA a 0.95 en lugar de 0.8.
   - OMEGA copia como precio de lista las liquidaciones de fin de semana de ALFA.
10. **No hubo riesgo de insolvencia observable.** [HECHO, exploratorio] En ningún panel la caja bajó de la reserva: 0 rondas por empresa, sobre 480 en los paneles de 40 semillas y 240 en los de sensibilidad. En todas las corridas los libros concilian. Las finanzas del modelo son holgadas: cobro inmediato, sin IVA ni costos de estructura.

**Pruebas exitosas no equivalen a validación económica.** Las 93 pruebas verifican que el software hace lo que su diseño dice. No verifican que el diseño represente un mercado real. Ese segundo paso no se ha dado.

---

## 2. Método

### 2.1 Verificaciones de solo lectura sobre el repositorio

- `npm test`: 93/93.
- `npm run verificar`, sin escrituras (confirmado en el código de `scripts/verificar.ts`), sobre `runs/prueba-base` y `runs/prueba-7`.
- Hashes de la configuración, el candado y el árbol de código.
- Lectura de README, `docs/ARQUITECTURA.md`, `docs/BLOQUEOS.md`, `docs/API.md`, configuración, motor, agentes, perfiles, harness, pruebas, `reports/banco` y `reports/reproducibilidad`.

### 2.2 Experimentos exploratorios del orquestador (fuera del repo)

- **Código.** Copia del árbol en el scratchpad, con la misma huella `c808707c…`. Las variantes de configuración y perfil se hicieron **solo en copias**, cada una con su propio candado "postmortem-scratch (no oficial)" (`anexos/exp/variantes.py`).
- **Ejecución.** `Controlador` en modo `en-proceso`, preflight sintético, 12 rondas (`anexos/exp/correr.ts`). Las corridas temporales se borraron después de extraer el resumen por ronda.
- **Variantes:**
  - reglas oficiales (con la parada del Juez);
  - "sin parada" (`multiplicador_ventas` = 1000; la victoria se evalúa post hoc);
  - ablación de la memoria (`aprender` sin efecto) en ALFA, en OMEGA y en ambas;
  - intercambio de perfiles;
  - espejo ALFA-ALFA y OMEGA-OMEGA;
  - mercado previo a la recalibración;
  - ±20 % en `peso_calidad`, `peso_precio`, `peso_promo`, `umbral_compra`, `actividad_diaria` y `opcion_externa`.
- **Semillas:**
  - dentro de muestra: 20261019–20261028;
  - fuera de muestra: 900001–900040, o 900001–900020 en la sensibilidad.
  - **Desde ahora, estas semillas tampoco sirven como evidencia confirmatoria.**
- **Volumen.** 24 conjuntos y 630 corridas, más 2 corridas de reproducción. Los cuenta el miembro F en `anexos/datos/`. SHA-256 de cada conjunto en §11 y en `anexos/datos/hashes-datos.txt`.
- **Estadística** (`anexos/exp/analizar.py`):
  - la unidad es la semilla;
  - bootstrap de 10,000 remuestreos con RNG fijo 20261020;
  - IC de Wilson para proporciones;
  - diferencias pareadas por semilla.
- **Reanálisis independiente.** El miembro B rehízo los cálculos a ciegas con su propio código (`anexos/memos/B-datos.md`).
- **Sonda en vivo del War Room**, levantado desde la copia (`anexos/exp/sonda-warroom.mjs`, `anexos/datos/sonda-warroom.txt`). Hizo 21 comprobaciones. Las 4 que aparecieron como fallas eran errores de la propia sonda, revisados a mano y anotados en el archivo:
  - 202 frente a 200;
  - campos esperados en la sentencia pública;
  - una instantánea desfasada del SSE;
  - `fetch` descarta la cabecera `Host`, así que se repitió con `curl` y se obtuvo 421.

### 2.3 Validaciones del propio método

Todas son **[HECHO]**:
- **Réplica del banco del README.** Las semillas 20261019–28 reproducen `reports/banco/resultado.json` **ronda a ronda**, con medias de 18,854,051 y 15,151,450 centavos.
- **Reconstructor post hoc de la victoria.** Coincide con el Juez en **50/50** corridas en ganador y ronda.
- **La parada no altera la dinámica.** Las corridas "sin parada" y las oficiales dan los mismos ganadores fuera de muestra: 12 de ALFA y 2 de OMEGA.
- **Reproducción desde la copia en otra ruta.** Los 20,603 eventos de `prueba-base` tienen cuerpos idénticos. Los archivos del expediente también son idénticos, salvo `manifiesto.json`, que incluye `hashPreflight` (en la copia, el preflight era sintético).

### 2.4 Incidentes durante el postmortem

**[HECHO]** El disco del equipo estaba lleno: 486 MiB libres. Siete procesos de simulación abortaron por `ENOSPC` (`anexos/datos/logs-enospc/`). Se detuvieron, se limpiaron los temporales del scratchpad y se relanzaron con concurrencia 2, guardado incremental y un freno a 300 MB. Los conjuntos afectados se regeneraron completos y ninguno se usó a medias. El incidente sirvió además como prueba real de un modo de fallo (§5.4).

---

## 3. Verificación de las afirmaciones del reporte de construcción

| # | Afirmación (fuente) | Veredicto | Evidencia |
|---|---|---|---|
| 1 | "93/93 pruebas en verde" (`README.md:98`) | **Confirmada** | `npm test` en el repo: 93 pruebas, 93 aprobadas, 0 fallidas. **Matiz:** en una de tres corridas bajo carga alta (promedio de carga ≈ 17) con cobertura instrumentada, 2 pruebas fallaron y 7 se cancelaron. Al repetir, 93/93. Hay sensibilidad a tiempos, pero no se identificaron cuáles pruebas fueron. |
| 2 | "cobertura 94.8 % líneas, 83.4 % ramas" (`README.md:98`) | **Parcial**: las líneas se confirman, las ramas aparecen ligeramente sobredeclaradas | En la copia: 94.83 % de líneas y **83.14 %** de ramas (E: PARCIAL). La cobertura de ramas varía entre corridas. Una corrida bajo carga dio 83.75 %, pero tuvo pruebas fallidas. |
| 3 | "War Room en vivo probado de punta a punta" (`README.md:99`) | **Confirmada** | Sonda en vivo (§2.2): acceso privilegiado, control por IPC, redacción pública, reanudación SSE sin huecos ni duplicados (728 eventos), Host ajeno → 421 y sentencias inmutables (PUT, PATCH, DELETE y POST → 405). La ronda 1 en vivo coincide con la de `runs/prueba-7`, incluido `hashExpediente` `46cb7e1f…`. |
| 4 | "con la semilla 7 ALFA gana en la ronda 3 ($166,622 vs $77,336, V1–V7)" (`README.md:99`) | **Confirmada** | `runs/prueba-7/reports/verdicts/ronda-03.json` y `verificar` superado. **Matiz:** es una sola semilla. Ver §4: la regla 2× no distingue estrategia de azar. |
| 5 | "red bloqueada para agentes y Juez en macOS" (`README.md:100`) | **Confirmada en macOS, parcial como garantía** | C2 EXP-0 (`EPERM` con sandbox). Sin embargo: Linux no tiene bloqueo; la prueba se *omite* y el preflight aprueba igual; el bloqueo no se registra en la cadena; una variable de entorno lo desactiva; y no bloquea señales entre procesos (C2 EXP-8). |
| 6 | "20,603 eventos sellados, `npm run verificar` superado" (`README.md:101`) | **Confirmada** | `anexos/datos/verificar-prueba-base.txt` |
| 7 | "Reproducibilidad: misma semilla → diario, expedientes y sentencias idénticos" (`README.md:102`) | **Confirmada con condición** | Los cuerpos de los eventos son idénticos. Los hashes del expediente y de la cadena dependen además del `preflight.json`. `reports/reproducibilidad/resultado.json` no registra la huella del código con que se generó. |
| 8 | "Banco… competencia pareja (ALFA $188.5k vs OMEGA $151.5k); 1 victoria de ALFA" (`README.md:103`) | **Cifras confirmadas. Interpretación refutada.** | La réplica es exacta. Pero: (a) las semillas son las de calibración, así que el resultado está **dentro de muestra**; (b) ALFA lidera 104 de 114 rondas (memo A); (c) fuera de muestra, la victoria ocurre en 14/40 y ALFA vende más en el 82 % de las semillas. |
| 9 | "los agentes de una empresa no pueden leer lo de la otra" (`README.md:57`) | **Confirmada en modo proceso** | `tests/adversarial/aislamiento.test.ts`; C2 EXP-0c (también los symlinks). El modo en-proceso no aísla, pero el modo oficial lo prohíbe. |
| 10 | "el Juez y `npm run verificar` detectan cualquier alteración" (`docs/BLOQUEOS.md:46-47`) | **Refutada en sentido literal** | No detectan: cambiar el `.md` de la sentencia (C2 EXP-6b); truncar la ronda final (EXP-7); sustituir el módulo de equipo (EXP-6); regenerar toda la cadena con acceso de escritura (hecho del orquestador). |
| 11 | "Al reiniciar el proceso retoma desde el diario sin duplicar eventos" / "Idempotente" (`controlador.ts:76,724`) | **Parcial** | Hay ventanas no documentadas: `aprender` duplicado con divergencia silenciosa (C2 EXP-1); `ErrorDeterminismo` antes de `cierre_periodo` (EXP-2); `.md` perdido (EXP-4). |
| 12 | "agentes autónomos" (`README.md:5`); "aprendizaje entre rondas" (`docs/BLOQUEOS.md:37`; `docs/ARQUITECTURA.md:95`) | **Parcial** | Es adaptación heurística acotada por el perfil (memo C1). Su efecto es medible (§4.4). |
| 13 | Recalibración "simétrica para ambas empresas" (`docs/ARQUITECTURA.md:102`) | **Formalmente cierta, sustantivamente engañosa** | `calidad_neutral` (0.6) coincide con la calidad de OMEGA. Bajar `peso_calidad` perjudica casi solo a ALFA (memo A §2.2). Con el mercado previo, la cuota de ALFA era 64.1 %; ahora es 56.2 %. |
| 14 | Torneo oficial con "semilla sellada" (`README.md:60-79`) | **Problema metodológico** | La semilla sellada es la de `prueba-base`, así que el resultado ya se conoce (§1.2). |

---

## 4. Resultados estadísticos (EXPLORATORIOS)

La unidad es la semilla. Los montos están en MXN por ronda. Los intervalos son IC95 por bootstrap. "sp" significa sin parada: 12 rondas completas, con la victoria evaluada post hoc con V1, V3, V4, V5 y V6.

### 4.1 Frecuencia de victoria con las reglas oficiales

| Conjunto | n | Gana ALFA | Gana OMEGA | Sin ganador | P(algún ganador), IC95 Wilson |
|---|---|---|---|---|---|
| Dentro de muestra (20261019–28) | 10 | 1 | 0 | 9 | 0.10 [0.02, 0.40] |
| Fuera de muestra (900001–040) | 40 | 12 | 2 | 26 | 0.35 [0.22, 0.51] |

- Prueba de Fisher para la diferencia: p = 0.25. **[INFERENCIA]** Con n = 10, el "1 de 10" era compatible con tasas de hasta 40 %. No es una estimación útil.
- Rondas en que se dio la victoria fuera de muestra: 2, 3, 3, 3, 4, 5, 5, 5, 6, 6, 7, 9 (OMEGA), 10 y 11 (OMEGA).

### 4.2 Desempeño fuera de muestra (`sp_oos`, n = 40)

| Métrica | ALFA | OMEGA |
|---|---|---|
| Ventas netas por ronda | 203,304 [193,019, 213,320] | 157,165 [150,721, 163,743] |
| Utilidad operativa por ronda | 65,389 [61,812, 68,846] | 28,903 [27,428, 30,319] |
| Diferencia de ventas netas (ALFA − OMEGA) | 46,139 [32,794, 58,734] | — |
| Cuota de ALFA en ventas netas | 56.2 % [54.3, 57.9] | — |
| Semillas en las que ALFA vende más en 12 rondas | 82 % [68, 91] | — |
| Rondas con caja por debajo de la reserva | 0 / 480 | 0 / 480 |
| Rondas con margen de contribución ≤ 0 | 0 / 480 | 1 / 480 |
| Incidencias (leve, grave, crítica) | 0 / 0 / 0 | |
| Conciliación del libro contra los eventos | 100 % | 100 % |

**Variabilidad.**
- La desviación estándar entre semillas de G (media de log(VN_A/VN_O)) es **0.238** fuera de muestra, contra **0.076** dentro de muestra.
- En bloques de 10 semillas fuera de muestra varía entre 0.12 y 0.35.
- La autocorrelación de lag 1 por ronda es −0.17.
- **[INFERENCIA, alta]** Diez semillas no bastan para estimar la variabilidad, y la planificación de muestra hecha con datos dentro de muestra la subestima unas 3 veces (`EXPERIMENTOS_V2.md` §0.5).

### 4.3 ¿Es adecuado el umbral 2×?

Se responde con la probabilidad de declarar algún ganador en 12 rondas o menos, variando el umbral k y manteniendo V3–V6.

| Escenario | k = 1.5 | k = 2.0 (vigente) | k = 2.5 | k = 3.0 |
|---|---|---|---|---|
| **Nulo:** espejo ALFA-ALFA (misma estrategia) | 0.90 | **0.68** [0.52, 0.80] | 0.45 | 0.25 |
| **Nulo:** espejo OMEGA-OMEGA | 0.78 | **0.25** [0.14, 0.40] | 0.10 | 0.03 |
| **Nulo por desplazamiento** (miembro B: `sp_oos` con la log-razón centrada en 0 por semilla) | 0.70 | **0.175** [0.09, 0.32] | 0.10 | 0.025 |
| Estrategias V1, mercado vigente | 0.90 | 0.35 [0.22, 0.50] | 0.07 | 0.03 |
| Estrategias V1, mercado previo a la recalibración | 1.00 | 0.85 [0.71, 0.93] | 0.40 | 0.25 |

[HECHO, exploratorio] Otros datos de la regla:
- Rondas individuales con razón ≥ 2: 23 % en el espejo ALFA, 4.4 % en el espejo OMEGA y 6.0 % en el original.
- [HECHO, miembro B] El ICC de la cuota por ronda, con la semilla como grupo, es 0.565. Da un efecto de diseño de 7.2, así que **12 rondas equivalen a unas 1.7 observaciones independientes**.
- [HECHO, miembro B] Las 12 rondas funcionan como unas 4 a 7 "miradas" efectivas.
- [HECHO, miembro B] V3–V6 nunca fueron limitantes en estos datos: no hubo incidencias graves ni críticas, y los mínimos de pedidos y ventas siempre se cumplieron. En la práctica, la regla se reduce a V1.
- [HECHO, miembro B] Cuando la regla declara un ganador con k ≥ 1.5, ese ganador coincide siempre con el líder acumulado de las 12 rondas de su propia semilla.

**[INFERENCIA, alta]**
- La regla evalúa **12 oportunidades por corrida** sobre una sola trayectoria y se detiene en la primera, lo que equivale a una comparación múltiple.
- En un mercado con fuerte dependencia de la trayectoria (lealtad sin decaimiento, conciencia acumulada, competencia en subasta cuando los segmentos coinciden), estrategias idénticas divergen con frecuencia más de 2×.
- En consecuencia, **una victoria 2× no tiene una tasa de error tipo I controlada** y su frecuencia depende tanto del mercado como de la estrategia.
- El umbral es **inadecuado como prueba de superioridad estratégica**. Funciona como regla de juego, y como tal la fijaron las reglas selladas.
- **No se propone cambiarlo sin autorización humana.** La alternativa se evalúa en E0.5 y la decide la autoridad del experimento.
- [HECHO, exploratorio, miembro B] Un estimando **multisemilla** de referencia, que se informaría junto a la regla vigente, funcionaría así: M = 20 semillas, se declara ganador si lidera la cuota acumulada en 15 de las 20 o más.
  - Potencia de 0.88 ante la ventaja actual, que sube a 0.99 con M = 40.
  - Error nominal del 5 %.
  - Las alternativas evaluadas, con sus limitaciones, son: acumulado de N rondas dentro de una corrida (no separa el nulo de la ventaja), prueba secuencial dentro de la corrida (tamaño inflado por el ICC) y margen en lugar de ingreso (cambia el estimando y favorece por diseño al modelo premium). Están en el memo B §4.

**Matiz.** El espejo crea un mercado distinto del original: con el mismo perfil, ambas empresas apuntan a los mismos segmentos y compiten en subasta, lo que no ocurre entre ALFA y OMEGA (memo C1 §14). Es un nulo válido de "estrategias iguales", no del mercado original con las estrategias neutralizadas.

### 4.4 Equidad, aprendizaje y calibración: diferencias pareadas contra `sp_oos`

n = 40.

| Variante | Δ VN ALFA | Δ VN OMEGA | Δ cuota ALFA (pp) | P(2×) |
|---|---|---|---|---|
| ALFA sin memoria | −38,490 [−47,914, −28,659] | +1,398 [−2,398, 5,259] | −5.05 [−6.46, −3.57] | 0.03 |
| OMEGA sin memoria | +3,897 [−150, 7,870] | −13,960 [−20,435, −7,581] | +2.58 [1.40, 3.83] | 0.42 |
| Ambas sin memoria | −36,404 [−45,918, −26,446] | −9,657 [−15,778, −3,736] | −3.10 [−4.71, −1.33] | 0.00 |
| Perfiles intercambiados | −46,803 [−57,556, −35,504] | +39,952 [27,401, 51,528] | −11.79 [−14.49, −8.83] | 0.30 (12 de 12 para el perfil ALFA) |
| Mercado previo a la recalibración | +20,455 [8,140, 32,423] | −33,789 [−40,441, −27,460] | +7.95 [6.09, 9.84] | 0.85 |

Cuota de ALFA en paneles absolutos: 56.2 % (V1), 44.4 % (intercambio), 50.5 % (espejo ALFA) y 49.4 % (espejo OMEGA).

**Curva de cuota de ALFA por ronda (R1 → R12):**
- con memoria: 56.8 → 53.9;
- ALFA sin memoria: 56.8 → 47.9;
- ambas sin memoria: 56.8 → 50.0.

**[INFERENCIA]**
- La ventaja inicial (R1) es estructural del perfil.
- La memoria de ALFA la sostiene a lo largo de las rondas.
- Sin memoria, OMEGA alcanza a ALFA hacia la R8.
- La ablación solo apaga el canal de memoria, no la reacción al estado (memo C1 §14).

### 4.5 Sensibilidad (±20 %, un parámetro a la vez)

Semillas 900001–020, pareadas. En esas 20 semillas, la referencia es P(2×) = 0.50, con 10 victorias de 10 para ALFA.

| Parámetro | Δ cuota ALFA (pp) con −20 % | con +20 % | P(2×) con −20 % | con +20 % | Δ tamaño de mercado (MXN/ronda) |
|---|---|---|---|---|---|
| `umbral_compra` | −1.44 [−4.63, 2.08] | **−8.16** [−10.75, −5.69] | 0.25 | 0.15 | +212k / −182k |
| `peso_calidad` | **−3.59** [−5.12, −1.95] | +2.33 [0.19, 4.55] | 0.25 | 0.40 | −24k / +10k |
| `peso_precio` | +2.11 [−0.36, 4.67] | **−3.41** [−5.62, −1.18] | 0.60 | 0.25 | −8k / +7k |
| `actividad_diaria` | +0.59 [−1.85, 3.19] | −2.22 [−4.95, 0.81] | 0.40 | **0.05** | −25k / +23k |
| `peso_promo` | +0.16 | −0.81 | 0.40 | 0.45 | n.s. |
| `opcion_externa` | +0.46 | −0.47 | 0.35 | 0.45 | n.s. |

**[INFERENCIA]**
- La cuota responde de forma moderada, unos ±2–8 pp.
- La **probabilidad de victoria** cambia mucho: entre 0.05 y 0.60 contra 0.50, porque la regla 2× es un umbral sobre la cola de la distribución.
  - Advertencia de B (§7): en 11 de las 12 variantes P(2×) queda por debajo de la referencia, y las 20 semillas de referencia tienen una P(2×) alta (10/20 frente a 4/20 en 900021–040). Parte de la caída es **regresión a la media**, y solo `actividad_diaria` ×1.2 es nominalmente significativo.
  - La conclusión robusta es otra: con ±20 % en un solo parámetro, el resultado (si hay o no ganador) cambia en el 20–55 % de las semillas.
- **El resultado de "quién gana el torneo" depende de parámetros sin respaldo empírico.**

### 4.6 Riesgo de insolvencia

**[HECHO]** En ningún panel ni variante la caja de una empresa bajó de la reserva de 5,600 MXN. La caja mínima observada fue de 8,322 MXN, en el espejo OMEGA.

- Las rondas con margen ≤ 0 aparecen sobre todo en el espejo OMEGA (15 y 14 de 480) y en el mercado previo a la recalibración (OMEGA, 15 de 480).
- **[INFERENCIA]** El riesgo de insolvencia en el modelo es bajo por diseño: cobro inmediato, sin IVA, costos fijos livianos y presupuestos acotados por Finanzas.
- Esto **no** es evidencia sobre el riesgo real (`BRECHAS_MERCADO_REAL.md` §1.3).

---

## 5. Hallazgos por investigación prioritaria

### A. Realismo del mercado: qué está predefinido y qué emerge

Memo A.

- **[HECHO] Predefinido:**
  - población estática de 9,000 clientes y 4 segmentos con rangos fijos;
  - forma logit de elección de tienda, ciega al precio;
  - utilidad lineal en el precio relativo a un ancla fija;
  - doble conteo del descuento y de la lealtad;
  - lealtad sin decaimiento;
  - CTR y CPM constantes;
  - costos constantes;
  - proveedores sin capacidad;
  - estacionalidad semanal más un seno de 6 rondas;
  - perfiles con segmentos objetivo **disjuntos** y rangos de precio que no se solapan en el centro.
- **[HECHO] Emergente:**
  - reparto de tráfico orgánico;
  - conversión;
  - quiebres;
  - calidad efectiva vendida, incluida la reposición urgente con proveedores peores;
  - precios dentro de los rangos;
  - reparto del presupuesto;
  - lealtad y conciencia acumuladas;
  - caja y razón de ventas.
- **[INFERENCIA, alta]** La emergencia está muy acotada. El resultado agregado lo determinan en buena medida la configuración y los perfiles: la cuota de ALFA en R1 es 56.8 % antes de cualquier aprendizaje.

### B. Equidad competitiva y recalibración

- **[HECHO]** El mercado se recalibró para equilibrar el **resultado** entre dos estrategias fijas, con las mismas semillas que luego se reportaron (`docs/ARQUITECTURA.md:97-106`).
- **[TESTIMONIO del orquestador, no verificable en archivos]** Antes hubo un intento de recalibrar el perfil de OMEGA, que empeoró las cosas y se revirtió. No quedó registrado en el repositorio (memo A §2.2). Por eso debe documentarse (CM-6 del dictamen).
- **[HECHO, exploratorio]** Fuera de muestra, la recalibración redujo la ventaja de ALFA: la cuota bajó de 64.1 % a 56.2 % y P(2×) de 0.85 a 0.35. **No logró paridad.**
- **[HECHO, miembro B]** El bloque de calibración quedó anormalmente homogéneo tras recalibrar. La dispersión de la cuota entre semillas es 0.020, frente a 0.060 fuera de muestra (p = 0.02). Es compatible con un sobreajuste del ajuste a esas semillas, pero B formuló la prueba después de ver los datos: **[HIPÓTESIS]**.
- **[HECHO, miembro B]** Hay una discrepancia documental. `docs/ARQUITECTURA.md` §7 dice que, antes de recalibrar, "ALFA ganaba en 9 de 10 semillas". Con el código actual y el mercado previo, en esas mismas semillas, gana en 10 de 10. **[INFERENCIA]** El código cambió después de esa medición y el documento no registra con qué versión se hizo.
- **[RECOMENDACIÓN]** Protocolo CAL → SEL → EVA → OFICIAL con semillas comprometidas por hash (`EXPERIMENTOS_V2.md` §0.1–0.3).

### C. Aprendizaje de los agentes

Memo C1 y §4.4.

- **[HECHO]** Los cinco roles son funciones puras en secuencia. Lo que "aprenden":
  - EWMA de demanda (α = 0.5) con censura mal corregida;
  - precio con pasos de ±3 %, que funciona como **trinquete a la baja**: con la semilla 20261019, ALFA tuvo 3 subidas y 62 bajadas;
  - bandido ε-greedy que solo explora brazos nunca probados;
  - participaciones de presupuesto como trinquetes que llegan al tope del perfil.
- **[HECHO]** Además:
  - las "hipótesis" se evalúan pero no vuelven a los agentes;
  - nadie consume la estrategia textual del Director;
  - Finanzas siempre aprueba.
- **[HECHO, exploratorio]** El canal de memoria explica la mayor parte de la ventaja que ALFA sostiene en el tiempo (§4.4).
- **Arquitecturas para la V2** (memo C1 §11), sin implementar nada:

| Arquitectura | Reproducibilidad | Auditabilidad | Costo | Riesgo principal |
|---|---|---|---|---|
| Estática | total | muy alta | mínimo | sobreajuste humano del perfil |
| Adaptativa (actual) | total | alta | mínimo | prior de "caja blanca" y artefactos |
| LLM | solo con casete | media-baja | alto, a cotizar | oráculo y *gaming* del Juez |
| Híbrida (el LLM propone y la política valida) | con casete | alta en la capa de control | igual que LLM | atribuir al LLM lo que hace el validador |
| RL | si se versionan los pesos | baja | entrenamiento alto | explotación de artefactos del simulador |

- Las pruebas controladas propuestas están en `EXPERIMENTOS_V2.md`, E0.3 y experimento 6.

### D. Robustez estadística

Detalle en §4 y en el memo B.

- La frecuencia de victoria, los márgenes y la variabilidad ya están estimados.
- El umbral 2× no controla falsos positivos.
- Diez semillas no bastan.
- Un torneo de una sola semilla es una sola trayectoria de un proceso de alta varianza.
- **[RECOMENDACIÓN]** La autoridad humana debería considerar un formato multisemilla, con criterios de error tipo I y de potencia documentados (M-41, M-42).

### E. Aproximación al mercado real

Ver `BRECHAS_MERCADO_REAL.md`.

- **[HECHO]** Ningún parámetro está calibrado con datos reales.
- Existen fuentes públicas útiles: INEGI EMEC, INPC, ENIGH y ENDUTIH; Banxico CF621. Sus definiciones no coinciden directamente con las del simulador.
- Las magnitudes clave (elasticidades, devoluciones por talla, incrementalidad, meses sin intereses) **no tienen fuente pública verificable**. Requieren un piloto con datos agregados y disociados (experimento 9).

### F. Confiabilidad operativa

Memo C2.

| Propiedad | Estado | Evidencia clave |
|---|---|---|
| **Integridad** (detectar alteraciones) | **Parcial.** La cadena SHA-256, los manifiestos y la reejecución determinista detectan ediciones parciales. | No detecta truncar la cola, alterar el `.md`, sustituir el equipo ni regenerar la cadena completa (EXP-6, 6b, 7) |
| **Autenticidad** (quién produjo cada registro) | **Ausente.** No hay firmas, el génesis es público, el `actor` lo pone el harness, la autorización humana es texto libre y los incidentes de acceso los autodeclara el agente. | `grep` de firmas = 0; EXP-9 |
| **Aislamiento** (confidencialidad y red) | **Parcial.** Sistema de archivos sí (`--permission`). Red solo en macOS y sin fallo cerrado. Señales e inspector entre procesos del mismo usuario. | EXP-0, EXP-0c y EXP-8. EXP-8 lo demostró C2 con procesos ficticios; E confirmó las precondiciones pero no lo reprodujo. [HECHO, documentación de Node] `--allow-net` existe desde la v25.0.0 con estabilidad 1.1 |
| **Disponibilidad** (reanudación y tolerancia) | **Parcial.** Reanuda entre días. Falla o diverge en ventanas no documentadas. No hay exclusión mutua. No hay `fsync` en modo War Room. Una cola desgarrada tumba el War Room. Hubo 7 abortos reales por `ENOSPC`. | EXP-1, 2, 3, 4, 5; `logs-enospc` |

El diseño propuesto, sin implementar, está en el memo C2 §4:
- bubblewrap en Linux;
- `--disable-sigusr1` y otro UID para los agentes;
- WAL con marcas de fase;
- commit en dos fases;
- `fsync` de archivo y directorio;
- candado de corrida;
- `aprender` idempotente;
- firmas Ed25519 por principal;
- anclaje RFC 3161 o Rekor, solo de hashes;
- huella de código ampliada y verificada al arrancar.

---

## 6. Qué está respaldado, qué no y hasta dónde se puede extrapolar

### 6.1 Respaldado de forma reproducible

Hechos verificados y re-ejecutables:
- El motor es determinista dado (código, configuración, semilla, preflight). Los cuerpos de los eventos se reproducen bit a bit desde otra ruta y en otro modo de aislamiento.
- La contabilidad concilia el 100 % de las veces: 0 fallos en 630 corridas.
- El Juez aplica V1–V7 como están escritas, y el reconstructor independiente coincide en 50/50 corridas.
- El aislamiento de archivos entre empresas funciona en modo proceso, y la red está bloqueada en macOS.
- El War Room es de solo lectura sobre sentencias y registros, redacta la vista pública y su SSE reanuda sin pérdidas.
- Las cifras del banco del README se reproducen exactas.

### 6.2 Respaldado solo como exploración (pendiente de confirmación, E0)

- Con estas reglas, ALFA lidera fuera de muestra.
- La ventaja sigue al perfil.
- La memoria sostiene la ventaja de ALFA.
- La regla 2× tiene una tasa de falsos positivos alta bajo estrategias iguales.
- El resultado es sensible a parámetros arbitrarios.

### 6.3 No respaldado

- Que exista "paridad" competitiva.
- Que una victoria 2× indique la estrategia superior.
- Que los agentes "aprendan" en sentido técnico.
- Que la evidencia sea auténtica frente a un operador con permisos de escritura.
- Cualquier afirmación sobre el mercado real: conversión, ticket, ROAS, efecto de descuentos, márgenes, "calidad vence a volumen".

### 6.4 Límites de extrapolación

Las conclusiones valen **dentro del modelo**, con su versión de reglas 1.0.0, su huella de código y sus perfiles. Ninguna se puede trasladar al comercio real sin las fases 3 y 5 del `ROADMAP_V2.md`. Incluso los mecanismos causales identificados dentro del modelo (lealtad, calidad) son propiedades de formas funcionales elegidas a mano.

---

## 7. War Room 2.0: propuestas (correlación frente a causalidad)

Consolidado de los memos A §6, C1 §15 y D §6. Ninguna se implementó.

| Propuesta | Tipo de lectura | Cómo se obtiene |
|---|---|---|
| Etiqueta epistémica por métrica: observada, atribuida, contrafactual o experimental | — | Metadatos de la interfaz |
| ROAS y CAC renombrados como "atribuidos", más ROAS y CAC **incrementales** | Atribuido = correlacional; incremental = causal dentro del modelo | Re-simular el periodo sin la campaña con la misma semilla y números aleatorios comunes |
| Bandas multisemilla y probabilidad de que el resultado se invierta | Incertidumbre | Ensamble de semillas |
| Percentil del resultado real frente a un ensamble de ruido, y *regret* frente a un menú de alternativas | Separa suerte de habilidad | `simularPeriodo` con estado fijo (`verificador.ts:188`) |
| Panel "¿quién gana con otra métrica?" (VN, pedidos, margen, utilidad) | Descriptivo | Ya calculable (memo A §2.3) |
| Participación incluida la opción externa; embudo por segmento; matriz de cambios de tienda | Descriptivo | Registrar `elegirTienda → null` |
| Elasticidades propia y cruzada | Causal dentro del modelo | Perturbaciones aleatorias de precio en un gemelo |
| Paneles de ablación, intercambio y espejo con IC; cascada de la brecha por campo de perfil | Causal dentro del modelo | E0 y factorial (memo C1 §14) |
| Estado de calibración por parámetro: supuesto, fuente pública o piloto | Validez externa | Metadatos de la configuración |
| P&L real por pedido (IVA, contracargos, comisión por método) | Descriptivo, tras cambiar el modelo | Fase 3 |
| Estado del aislamiento sellado en la cadena (canario de red), integridad que incluya `.md` y `rounds/`, y "cola incompleta" sin caída | Confiabilidad | Memo C2 §4 |

---

## 8. Cómo mejorar el comportamiento económico de los agentes

Objetivo 4 de la misión. Todo es [RECOMENDACIÓN] y requiere una versión nueva de agentes y un resello.

1. **Quitar artefactos antes de optimizar:**
   - el redondeo de fichas (M-30);
   - el seguimiento de liquidaciones temporales (M-31);
   - la semilla en la vista (M-32).
2. **Decidir con el margen, no con el inventario.** El precio debería responder a una estimación de elasticidad y de margen, no solo a existencias. Hoy el trinquete erosiona la prima de ALFA de ×1.12 a 0.99.
3. **ROAS incremental en el bandido.** Hoy la rampa de marketing se alimenta del ROAS atribuido, que está sesgado al alza. Además, el bandido debería usar exploración con incertidumbre (UCB o Thompson) y descontar la evidencia vieja, porque el entorno no es estacionario.
4. **Cerrar el ciclo de las hipótesis:**
   - predicción con intervalo y una alternativa explícita;
   - puntuación con reglas propias;
   - el resultado vuelve a la memoria;
   - las metas las fija el harness, no el agente.
5. **Reglas de bajada** para la participación de inventario, aprendizaje para las fichas y memoria de confiabilidad de proveedores (experimento 4).
6. **Respetar el reparto del Director** en la validación, y que Finanzas pueda rechazar planes.
7. **Medir la calidad de decisión con *regret* contrafactual**, no con puntuaciones con techo (M-34, M-53).

---

## 9. Auditoría adversarial (miembro E)

Memo completo en `anexos/memos/E-auditoria.md`. E intentó refutar las afirmaciones de mayor peso con su propio código. Después de recibir su memo, el orquestador aplicó las correcciones obligatorias que se listan al final de esta sección.

### Lo que resistió la auditoría

Todas son **CONFIRMADAS**:
- La semilla oficial ya está jugada. `base_ins` con la semilla 20261019 coincide con `runs/prueba-base` en 96/96 comparaciones, sin ganador en R12. El `modo` solo entra en los hashes.
- El defecto de redondeo en las fichas. ALFA aplica 17 pasos y OMEGA 10; ALFA termina con 5 SKU en 0.95.
- Los segmentos objetivo son disjuntos y la presión de subasta nunca se activó: 0/555 y 0/117.
- La elección de tienda es ciega al precio.
- Los números del orquestador se reproducen exactamente: 14/40 (A12/O2), 1/10, 27/40 en el espejo, cuota del 56.2 %, −38,490 MXN por ronda y la ventaja sigue al perfil (efecto de etiqueta de unos +0.6 pp).
- `gana()` es fiel a `victoria.ts`.
- "Sin parada" no altera la dinámica: 10,166 comparaciones, 0 diferencias.
- La copia del código es idéntica a la del repo, y cada variante cambia solo lo declarado.
- El repositorio no se modificó: 452 archivos, `497cf308…`.

### Lo que E refutó o debilitó

| Afirmación | Veredicto de E |
|---|---|
| "Competencia pareja" (`README.md:103`) | **REFUTADA** |
| Cobertura de ramas del 83.4 % (`README.md:98`) | **PARCIAL**: medido 83.14 % |
| Plan de muestra del memo A (≈ 42 semillas) | Subpotenciado unas 3 veces. La DE dentro de muestra es 0.076, no 0.082, y fuera de muestra es 0.238 |
| EXP-8 (señales e inspector) | **PARCIAL**: precondiciones confirmadas en código y documentación, sin reproducción en vivo |
| Cifras de Banxico CF621 | **NO VERIFICABLE** por E: el cuadro del SIE no se pudo recuperar |
| Subíndice INPC «Ropa y calzado» | **PARCIAL**: el boletín 619/26 está confirmado, el subíndice exacto no se pudo extraer |
| LFPDPPP (DOF 20-03-2025) | **CONFIRMADA** |

### Correcciones aplicadas por el orquestador

1. M-20 y §1: se quitó "verificado por E" de EXP-8.
2. Esta sección se reescribió. Antes afirmaba de forma prematura que las correcciones ya estaban aplicadas.
3. §3, fila 2: la cobertura de ramas pasa a "Parcial".
4. `EXPERIMENTOS_V2.md` §0.5: se alinea la DE dentro de muestra (0.076) y se marca el plan de A como subpotenciado.
5. `BRECHAS_MERCADO_REAL.md`: CF621 y el subíndice del INPC se marcan como no reverificados por E.
6. La ablación se describe siempre como "canal de memoria entre rondas".

**Pendiente, solo para una persona.** E dejó unos 96 KB de scripts en el scratchpad (`tmp/E-auditoria/`), fuera del repo y sin efecto alguno.

---

## 10. Limitaciones de este postmortem

- **Los experimentos son exploratorios, no prerregistrados.** Los diseñó el mismo comité que los interpreta. n = 40 (o 20 en sensibilidad). Una sola versión de código.
- Los números aleatorios comunes son imperfectos, porque los flujos aleatorios del mercado se comparten entre empresas. La ablación y el intercambio cambian también los sorteos del rival.
- El modo en-proceso se usó por costo. La equivalencia con el modo proceso está acreditada por la prueba `reanudacion-y-procesos.test.ts` y por la comparación de la sonda en vivo, pero no se re-verificó en las ~680 corridas.
- No se probó en Linux.
- El comité es un solo modelo de lenguaje en varias instancias. No hubo revisión humana externa.
- Las fuentes externas las consultó el miembro D el 2026-10-20. E repitió una muestra de ellas, no todas.
- El disco casi lleno obligó a reducir la concurrencia y a no conservar corridas completas: solo se guardan los resúmenes por ronda.

### Comprobación de no modificación del repositorio

Huella "antes": 452 archivos, SHA-256 combinado `497cf308442cff3b6c504f73f5679374855f5eafa58885db3fbb04e526d6357b`. Método:
```
find . -path ./node_modules -prune -o -type f -print | LC_ALL=C sort
shasum -a 256 <cada archivo>
shasum -a 256 <lista de hashes>
```

Huella "después" (2026-10-20, al cierre): **452 archivos, `497cf308442cff3b6c504f73f5679374855f5eafa58885db3fbb04e526d6357b`**. Es **idéntica** a la de "antes": `cmp` de las dos listas de hashes, sin diferencias. El miembro E la había recalculado antes de forma independiente, con el mismo resultado. El HEAD del repositorio no cambió (`0f2a027`) y `ecommerce-wars/` sigue sin versionar. No se hicieron commits.

**[HECHO]** Los entregables y los anexos se escribieron **fuera** del repositorio git, en `FashionistApp/postmortem-ecommerce-wars/`, que es hermano de la raíz del repo y no es un repositorio.

---

## 11. Anexo: artefactos y SHA-256

### Del repositorio (sin modificar)

| Archivo | SHA-256 |
|---|---|
| `config/experiment.json` | `1921ec29ad5771fc919c3cedaa373511e96375aee6c677ef7139451e1afb0d9c` |
| `config/experiment.lock.json` | `7c3e9aeba7097357fbacb96903bb4f47a5f74ca7cbc02001a5ccf9228a96f50d` |
| `README.md` | `4c62e15740f273c0d437837a175d93f9c23a8e42768d73bfdcb55be1c432c0bb` |
| `docs/ARQUITECTURA.md` | `66c5bf5d38f83b8e39065f8c08c1594773c58135c7169327f95c45e11426693c` |
| `docs/BLOQUEOS.md` | `ea9768362eaee5eaa411b5b4564be99a99902fdc00dae65eee8e3b75c888fbb7` |
| `reports/banco/resultado.json` | `69209b0f932f411c6edb55278d4ee69546d86b2e54b6824527048f87eff3d274` |
| `reports/reproducibilidad/resultado.json` | `590a38ecf3a742f8b2adc98247577233c3b62e57c2f2d4e79f951a25fd29429b` |
| `runs/prueba-base/reports/evidence/diario.jsonl` (último hash de cadena `baf29b20…266f`) | `88e92a17b4bed563ef7e3088684246066bad413add21f194de92a5a9c0078ff5` |
| `runs/prueba-base/reports/verdicts/ronda-12.json` | `3b466bc7d737964d249988f77d767df77accb58a70534cae8b126468ada33ab0` |
| `runs/prueba-7/reports/evidence/diario.jsonl` (último hash de cadena `68edbd66…bf1b`) | `b9e37ccba0e160eba34310205c7a8c2c0252f86d851bb1a7f24d231f3274215c` |
| `runs/prueba-7/reports/verdicts/ronda-03.json` | `c515de59544cbd752fcbc59eb5fada96c8e9113f977e66db4ef379abf351e6f9` |
| Árbol de código (`hashArbolCodigo`) | `c808707c36d2656fcb36f8cc638dec1a63157d1b9a888466ec33ab31a2fbbd99` |

### Del postmortem

Copias en `anexos/`.

| Archivo | SHA-256 |
|---|---|
| `exp/correr.ts` | `2d81197424123534eb1dc8ab7ac43eb8f167b2d98a4b40ac906ccc7ff5660957` |
| `exp/equipo-sin-aprender.ts` | `16df1b37f24b149cced6645e9f980dc538d3b3c792cf8d67efa30d4c32c37fa3` |
| `exp/variantes.py` | `89bb2c648925e7de14af65b75d9dc124ef426b8c8eab3106e41330905ae7500b` |
| `exp/analizar.py` | `41dbc2cd2223b53fbbc59ffdd6beca726ec83016cc005905f2e7069e96a60815` |
| `exp/sonda-warroom.mjs` | `314001c9bb2b91a55e0ae06773c979026568454290903dabb0bf018678804d5f` |
| `datos/sonda-warroom.txt` | `245adafd91d57298046542012fab8d83ba427ce2e1618ed4946dfa2b8402efaf` |
| `datos/*.json` (24 conjuntos más la reproducción) | ver `anexos/datos/hashes-datos.txt` |
| Memos A, B, C1, C2, D, E y F | ver `anexos/HASHES.txt` |
