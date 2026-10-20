# EXPERIMENTOS_V2 — Diseño de experimentos (no ejecutados)

**Comité de Evaluación Científica, Económica y Tecnológica** · Postmortem de E-COMMERCE WARS · 2026-10-20

**Estado:** solo diseño. **Ningún experimento de este documento se ejecutó.** Todos requieren aprobación humana previa. Los que cambian reglas o modelo requieren además:
- una **versión nueva** de las reglas;
- un **sello propio** firmado por una persona;
- un directorio de corridas propio.

La configuración sellada del torneo oficial no se toca.

**Autoría:**
- Diseños 1, 2, 3, 5, 7 y 8: memo A (economista).
- Diseños 4 y 6: memo C1 (sistemas multiagente).
- Diseño 9: memo D (comercio electrónico).
- Protocolo común, armonización y cifras de potencia: orquestador, con sus datos exploratorios (`REPORTE_POSTMORTEM.md` §4) y la revisión del miembro B.

**Etiquetas:** [HECHO], [INFERENCIA], [HIPÓTESIS] y [RECOMENDACIÓN], como en el resto de entregables.

---

## 0. Protocolo común (vale para todos los experimentos)

### 0.1 Separación de etapas

Responde a la Investigación B (equidad competitiva).

| Etapa | Propósito | Semillas | Qué se puede cambiar | Qué queda prohibido |
|---|---|---|---|---|
| **(a) Calibración** | Ajustar parámetros del mercado contra **momentos objetivo externos** fijados de antemano (`BRECHAS_MERCADO_REAL.md` §4), no contra el resultado competitivo | Bloque CAL | Parámetros del mercado | Mirar resultados de victoria o de paridad entre empresas |
| **(b) Selección** | Elegir entre variantes de modelo o de agente (por ejemplo, perfiles) | Bloque SEL, disjunto de CAL | Variantes prerregistradas | Recalibrar el mercado |
| **(c) Evaluación fuera de muestra** | Estimar efectos con intervalos de confianza | Bloque EVA, que se abre **una sola vez** tras sellar el código, la configuración y el plan de análisis | Nada | Cualquier ajuste posterior a la apertura |
| **(d) Torneo oficial** | Ejercicio supervisado y público | Semilla OFICIAL por compromiso y revelación (§0.3) | Nada | Reutilizar una semilla ya corrida |

**[HECHO]**
- La calibración de la V1 violó esta separación: se calibró y se reportó con las semillas 20261019–20261028 (`docs/ARQUITECTURA.md:97-106`; `README.md:103`).
- La semilla sellada para el torneo oficial, 20261019, es la misma de `runs/prueba-base`. Su resultado ya se conoce: sin ganador tras 12 rondas (memo C2, R1).

### 0.2 Semillas que no deben usarse como evidencia confirmatoria

- `7` (`runs/prueba-7`).
- `20261019–20261028` (calibración y banco de la V1).
- `900001–900040` (exploración de este postmortem).
- Cualquier semilla usada en `tests/` o en un piloto.

Los rangos fijos que proponen los memos A (960001–960220) y C1 (920001–020, 930001–100, 940001–060) **no se usan tal cual**. Las semillas definitivas se derivan con el procedimiento de §0.3.

### 0.3 Compromiso de semillas — [RECOMENDACIÓN]

1. Antes de correr, se publica fuera del equipo el `sha256` de la lista de semillas de cada bloque más un *nonce* secreto, junto con el plan de análisis. Así queda constancia de *cuándo* se fijaron.
2. Los bloques se **generan** a partir de un valor que el experimentador no controla, por ejemplo `derivarSemilla(compromiso, 'EVA', i)`. Esto evita escoger semillas favorables.
3. La semilla del torneo oficial se revela **después** de congelar el código, con un tag git firmado y su hash anclado (memo C2 §6).

Los rangos de la tabla son **ilustrativos**; los definitivos salen de este procedimiento.

| Bloque | Uso | Tamaño sugerido |
|---|---|---|
| DES (desarrollo y piloto) | Depurar, estimar varianzas, iterar prompts | 20–40 |
| CAL / SEL | Calibración y selección | Según el experimento |
| EVA (confirmatorio) | Análisis prerregistrado | Según la potencia (§0.5) |
| RES (reserva) | Ampliación solo si el piloto la justifica y se prerregistra | Igual que EVA |

### 0.4 Reglas de ejecución

- **Sin paro temprano.** Cada corrida dura R rondas fijas (12 o 24). El dictamen V1–V7 se registra por ronda como variable observada.
  - [HECHO, exploración] Cambiar el multiplicador de victoria **no altera la dinámica**. Con `multiplicador_ventas` = 1000, el reconstructor post hoc coincide con el Juez en 50/50 corridas. Las corridas sin parada y con parada dan los mismos ganadores en las semillas 900001–040: 12 de ALFA y 2 de OMEGA.
- **Unidad de análisis: la semilla.** Las rondas están autocorrelacionadas y comparten estado.
- **Métrica primaria común:** `G = media por ronda de log(VN_ALFA / VN_OMEGA)`. Los efectos se expresan como diferencias pareadas por semilla, tratamiento menos control.
- **Estadística:**
  - IC 95 % por bootstrap sobre semillas (BCa) y Wilcoxon de rangos con signo;
  - corrección de Holm dentro de cada experimento;
  - TOST para las hipótesis de "sin cambio".
- **Guardas obligatorias en cada corrida:** conciliación del libro contra los eventos al 100 %, cero incidencias críticas y `npm run verificar` superado.
- **Neutralidad del código:** con los parámetros nuevos en su valor neutro, el diario debe tener el mismo hash que el motor sin cambios para la misma semilla.
- **Flujos aleatorios por empresa** (memo A §2.4; memo C1 §10.4).
  - [HECHO] Hoy los flujos del mercado se comparten entre empresas (`simulation/market/motor.ts:71`). Por eso cambiar una política altera los sorteos de la otra empresa.
  - El pareo sigue siendo válido, pero con más varianza.
  - Si se cambia el motor, el brazo de control se vuelve a correr con el motor nuevo.

### 0.5 Potencia y tamaño de muestra

Las cifras son exploratorias de este postmortem (`REPORTE_POSTMORTEM.md` §4). Todas son **[HECHO]** salvo que se indique otra cosa.

| Magnitud | Estimación | Fuente |
|---|---|---|
| DE entre semillas de G (estrategias V1, fuera de muestra) | 0.238 (n = 40) | `sp_oos` |
| DE de G dentro de muestra | 0.076 (n = 10) | `sp_ins` |
| DE de G en bloques de 10 semillas fuera de muestra | 0.12 a 0.35 | `sp_oos` |
| DE de la diferencia pareada ΔG (ablación del aprendizaje de ALFA) | 0.184 | `sp_oos_sinaprender_alfa` frente a `sp_oos` |
| DE de ΔG (intercambio de perfiles) | 0.37 | `sp_intercambio` |
| Autocorrelación lag 1 de log(VN_A/VN_O) por ronda, media entre semillas | −0.17 | `sp_oos` |

**[INFERENCIA, alta]** La DE dentro de muestra (0.076) subestima unas 3 veces la variabilidad real. El memo A planificó con 0.082, calculada sobre el banco con parada, que incluye una corrida truncada en R6, y obtuvo unas 42 semillas. Con paneles completos, el orquestador y el auditor E obtienen 0.076. **El plan de A queda subpotenciado unas 3 veces** y no debe usarse.

Con la DE fuera de muestra, el tamaño pareado para detectar |ΔG| = δ con α = 0.05 y potencia 0.8 es `n ≈ 7.85·(σ_d/δ)²`:

| σ_d | δ = 0.05 | δ = 0.10 |
|---|---|---|
| 0.18 | ≈ 102 semillas | ≈ 26 |
| 0.37 | ≈ 430 | ≈ 108 |

Sin pareo, con σ = 0.24 y δ = 0.10, hacen falta unas 90 semillas por brazo.

**[RECOMENDACIÓN]** Reestimar σ_d en el bloque DES de cada experimento antes de fijar el tamaño de EVA.

### 0.6 Costo de cómputo de referencia

**[HECHO, medido en este equipo]**

| Concepto | Valor |
|---|---|
| Torneo de 12 rondas en modo en-proceso, aislado | ≈ 3 s |
| Lo mismo con 2 corridas concurrentes | ≈ 7.4 s por corrida |
| Torneo con procesos aislados | ≈ 14 s de fases según la telemetría de `runs/prueba-base` (memo A) |
| Disco por corrida de 12 rondas | **≈ 80 MB** (`runs/prueba-base`) |

**[HECHO]** El equipo tiene unos 500 MB libres de 228 GiB. En este postmortem hubo 7 abortos por `ENOSPC`.

**[RECOMENDACIÓN]**
- Asegurar al menos 2 GB libres antes de cualquier campaña experimental.
- Borrar cada corrida después de extraer su resumen.
- Comprobar el espacio libre en cada ronda (memo C2 §4.3).

Las horas-persona de este documento son **estimaciones de los miembros, sin fuente externa**. Ningún experimento implica dinero real.

### 0.7 Plantilla de prerregistro (obligatoria)

Cada experimento debe registrar:
- hipótesis con dirección y umbral;
- métrica primaria y secundarias;
- brazos;
- bloque de semillas con su hash;
- versión de reglas y huella de código;
- plan de análisis y correcciones;
- criterio de aceptación o rechazo;
- criterios de exclusión (una corrida con incidencia crítica se reporta, no se descarta en silencio);
- persona responsable que autoriza.

---

## E0. Réplicas confirmatorias de la exploración del postmortem (prioritarias)

Estos hallazgos se observaron en la exploración (`REPORTE_POSTMORTEM.md` §4) y **deben confirmarse** con semillas nuevas antes de citarse como evidencia. No requieren cambios de reglas, salvo E0.4.

| ID | Hipótesis falsable | Brazos | Métrica | Aceptación o rechazo |
|---|---|---|---|---|
| E0.1 | **Simetría del harness.** Con el mismo perfil en ambas empresas, E[G] = 0. | Espejo ALFA-ALFA, espejo OMEGA-OMEGA, y cada uno con etiquetas invertidas | G y cuota de ALFA | Se acepta la simetría si TOST da equivalencia dentro de ±0.05. Si el IC 95 % excluye 0, se rechaza y es un hallazgo crítico. |
| E0.2 | **La ventaja sigue al perfil, no a la etiqueta.** G(intercambio) ≈ −G(original). | Original frente a intercambio, pareados | G + G_intercambio | Se acepta si el IC 95 % de G + G_int contiene 0 con un semiancho ≤ 0.1. |
| E0.3 | **Aprendizaje.** Apagar la memoria de ALFA reduce G en al menos 0.10. | Factorial 2×2 (memoria de ALFA y de OMEGA, activa o nula), más ablación por componente: precio, EWMA de demanda, bandido, participaciones y cobertura (memo C1 §14) | ΔG, Δ ventas netas por empresa e interacción | Se rechaza si el IC 95 % de ΔG incluye valores > −0.10. |
| E0.4 | **El defecto de las fichas** (`ventas.ts:91-95`) explica una fracción no trivial de G. | V1 frente a V1 con el redondeo corregido (versión nueva del agente) | ΔG | Informativo. Si |ΔG| ≥ 0.05, el defecto se declara factor de confusión de toda la evidencia V1. |
| E0.5 | **Características operativas de la regla de victoria.** Con estrategias idénticas (espejo), P(algún "ganador" a 2× en ≤ 12 rondas) ≤ 0.05. | Espejos (nulo) y original (alternativa) | Tasa de falsos positivos y sensibilidad por umbral k ∈ {1.25, 1.5, 2, 2.5, 3} y por horizonte | [HECHO, exploración] Fue 0.675 en el espejo ALFA-ALFA, 0.25 en el espejo OMEGA-OMEGA y 0.175 en el nulo por desplazamiento (miembro B), frente a 0.35 con la ventaja real. Si se confirma, la regla 2× **no** es una prueba de superioridad estratégica (ver el dictamen). |

**Costo:** unas 12 configuraciones × 100–200 semillas × 3 s, es decir 1–2 h de cómputo en-proceso. Con 2 corridas concurrentes, el pico de disco ronda los 160 MB. Se estiman 8–16 horas-persona.

---

## Experimento 1 · Inflación y variación de costos

- **Hipótesis falsables:**
  - **H1a (homogeneidad).** Con inflación general al mismo π semanal en costos, precios de referencia y presupuestos, los resultados reales no cambian: |ΔG| < 0.05 y |Δ(margen/VN)| < 1 pp, por TOST. Si se rechaza, el código tiene rigideces nominales: el umbral de 10,000 MXN, los mínimos de campaña (`agents/nucleo/marketing.ts:9-10`), los redondeos y los costos fijos.
  - **H1b (presión de costos).** Con +2 % semanal compuesto solo en los costos de proveedor, ninguna empresa traslada el costo al precio antes de que se active su piso (`ventas.ts:30`). El margen sobre VN cae en ambas y |ΔG| < 0.05.
  - **H1c (traspaso).** Con π = 5 % semanal, el piso de ALFA se activa hacia la semana 6–7 y el de OMEGA hacia la 11. Tras la activación G sube, porque los segmentos de ALFA son inelásticos en el modelo. Se rechaza si ΔG ≤ 0.
- **Variables controladas:** semilla, perfiles, resto de la configuración, R (12, o 24 en H1c) y trayectoria de π (determinista o con flujo propio).
- **Variables observadas:**
  - G;
  - ventas netas, margen y utilidad por empresa;
  - margen bruto %;
  - traspaso Δprecio/Δcosto por SKU;
  - unidades, ticket y quiebres;
  - caja e insolvencia;
  - ronda del primer margen ≤ 0.
- **Diseño:** pareado por semilla con 6 brazos: control, H1b, H1b con logística indexada, H1a, volatilidad de costos con σ = 3 % semanal, y H1c. Se agrega un brazo con perfiles intercambiados sobre H1b.
- **Métricas de éxito:** IC 95 % de ΔG con semiancho ≤ 0.05 (requiere el n de §0.5) y un TOST de H1a concluyente.
- **Riesgos de sesgo:**
  - Los agentes calculan el costo con una fórmula fija (`agents/nucleo/comun.ts:48-50`). Si no ven el costo indexado, el experimento mide la heurística y no el mercado.
  - Interacción con el aprendizaje de precios.
  - Comparaciones múltiples.
- **Cambios requeridos:**
  - índice de costos en la configuración;
  - indexación en `simulation/suppliers/proveedores.ts:20-22`, `pedidos.ts:146` y `customers/decision.ts:83,97`;
  - exponer el índice en la vista (cambio simétrico en los agentes).
- **Costo estimado:** 7 brazos × (40 DES + n EVA). Con n = 100 son unas 1,000 corridas, ≈ 1 h en-proceso, y 12–20 horas-persona.
- **Aceptación o rechazo:** según cada hipótesis, con Holm.

## Experimento 2 · Descuentos agresivos

- **Hipótesis falsables:**
  - **H2a.** Con OMEGA al 35 % en todo el catálogo y todos los días, sus ventas netas por ronda suben al menos 50 % frente al control, y su margen sigue > 0 en al menos 80 % de las rondas.
  - **H2b.** Al 50 %, el margen de OMEGA es ≤ 0 en al menos 50 % de las rondas, de modo que no podría ganar por V5.
  - **H2c (doble conteo).** Una rebaja equivalente del precio de lista, sin etiqueta de promoción, produce como mucho el 60 % del aumento de H2a. Esto mide el peso de `peso_promo` (`decision.ts:90`).
  - **H2d.** El mismo tratamiento aplicado a ALFA tiene un efecto menor en logaritmo.
- **Variables controladas:** semillas, mercado, resto del perfil y R = 12.
- **Variables observadas:**
  - ventas netas, pedidos, unidades y ticket;
  - descuento sobre ventas brutas;
  - margen, utilidad y caja;
  - quiebres y devoluciones;
  - lealtad y cambios de tienda;
  - incidencia de V1 y V5.
- **Diseño:** pareado con 8 brazos: control; OMEGA al 30, 35 y 50 %; rebaja de lista equivalente al 35 %; ALFA al 20 y 35 %; y "guerra" con ambas al 35 %. Se agrega un brazo con la cobertura de inventario escalada.
- **Métricas de éxito:** IC de Δlog VN con semiancho ≤ 0.05, y separar el efecto de la etiqueta del efecto del precio.
- **Riesgos de sesgo:**
  - El inventario limita el efecto: los quiebres confunden.
  - El modelo no erosiona el ancla de precio, así que mide **la regla del modelo** y no el consumidor real (`BRECHAS_MERCADO_REAL.md` D2–D3).
  - Goodhart sobre la métrica de victoria.
- **Cambios requeridos:**
  - variantes de perfil (`descuentoMax`, `diasPromocion`);
  - alcance "todo" en las promociones (`ventas.ts:57-66`);
  - un interruptor de mercado para el bono de promoción (H2c).
- **Costo estimado:** unas 1,100 corridas, ≈ 1 h, y 10–16 horas-persona.
- **Aceptación o rechazo:** por hipótesis, con Holm.

## Experimento 3 · Lealtad y recurrencia

- **Hipótesis falsables:**
  - **H3a.** Con `lealtad.por_calidad` = 0, G cae al menos 50 %.
  - **H3b.** Con un decaimiento de la lealtad de 0.98 por día, la pendiente de la conversión por ronda cae al menos 50 % en ambas empresas.
  - **H3c.** Quitar el doble conteo de la lealtad reduce G en al menos 0.05.
  - **H3d.** Con `peso_lealtad` = 0, G ≤ 0.10, es decir, el liderazgo de ALFA depende de la lealtad.
  - **H3e.** Con saciedad por categoría (14–28 días) bajan la conversión tardía y la proporción de recurrentes.
- **Variables controladas:** semilla, perfiles, resto del mercado y R = 24.
- **Variables observadas:**
  - G y su trayectoria;
  - conversión por ronda;
  - recurrentes;
  - distribución de la lealtad;
  - retención por cohorte;
  - devoluciones;
  - cuota orgánica por segmento.
- **Diseño:** pareado, con los brazos L1–L5 y L1 con intercambio. Como opción, un factorial 2³ con descomposición de Shapley de G.
- **Métricas de éxito:** atribuir al menos 70 % de G a mecanismos identificados, con IC.
- **Riesgos de sesgo:**
  - Las ablaciones crean mercados contrafactuales irreales: el resultado es una **atribución dentro del modelo**.
  - Interacción con el aprendizaje.
- **Cambios requeridos:** L1 y L4 solo tocan la configuración. L2, L3 y L5 tocan código (`motor.ts:158-166`, `decision.ts:59,88`, `visitas.ts:9-15`).
- **Costo estimado:** 7 brazos × 140 semillas × 24 rondas (≈ 6 s cada una), es decir ≈ 1.6 h, y 16–32 horas-persona.
- **Aceptación o rechazo:** umbrales por hipótesis, con Holm.

## Experimento 4 · Escasez y fallas de proveedor

- **Hipótesis falsables:**
  - **H4.1.** Ante una caída de PRV-EXP en R4–R6, la pérdida relativa de ventas netas en R4–R8 es mayor para OMEGA que para ALFA. EXP es el proveedor preferido de OMEGA en 6 de 8 categorías. Se refuta si el IC 95 % de (pérdida OMEGA − pérdida ALFA) incluye 0 o es negativo.
  - **H4.2.** Con los agentes V1, la interacción choque × aprendizaje es nula.
  - **H4.3.** Un agente con memoria de confiabilidad por proveedor reduce la pérdida en al menos δ.
- **Variables controladas:** versión de reglas, perfiles, semillas, calendario y magnitud de los choques (con un flujo aleatorio **propio**: `'shock', proveedor, ronda`) y R = 12 sin parada.
- **Variables manipuladas:**
  - choque: ninguno, caída de EXP, PAC o BAJ, capacidad al 50 %, o costo +20 %;
  - aprendizaje: activo o nulo;
  - perfiles: original o intercambiados;
  - información: aviso público o detección propia.
- **Variables observadas:**
  - ventas netas, utilidad y margen;
  - servicio y `sinStock`;
  - órdenes retrasadas;
  - caja mínima y rondas con caja bajo la reserva;
  - **tiempo de recuperación**: rondas hasta volver a ±10 % del contrafactual;
  - cambios de proveedor.
- **Diseño:** pareo con choque frente a sin choque por celda. El conjunto de choques es **simétrico**: cada proveedor cae a su turno, para no escoger la falla que perjudica a una sola empresa. Métrica primaria: `L = (VN_choque − VN_sin)/VN_sin` en R4–R8.
- **Riesgos de sesgo:**
  - escoger el calendario después de ver resultados;
  - desincronización de los números aleatorios;
  - truncamiento por victoria;
  - comparaciones múltiples.
- **Cambios requeridos:** capacidad diaria compartida con asignación determinista, caídas, cumplimiento parcial, choques de costo y variabilidad de los tiempos de entrega. Requiere versión nueva de reglas y resello.
- **Costo estimado:** 6 × 2 × 2 celdas × 100 semillas, unas 2,400 corridas, que tardan 2–6 h según el aislamiento. Se estiman 16–24 horas-persona.
- **Aceptación o rechazo:** H4.1 se acepta si el límite inferior del IC 95 % es > 0 y la estimación es ≥ δ.

## Experimento 5 · Rendimientos decrecientes de campañas

- **Hipótesis falsables:**
  - **H5a.** Con un CTR que decrece con la frecuencia, `CTR·exp(−β(f−1))` con β = 0.5, la empresa con mayor gasto por persona del segmento pierde más en logaritmo.
  - **H5b.** Con segmentos solapados (ambas apuntan a los cuatro), la presión de subasta se activa en al menos 30 % de las campañas-día, el costo por visita pagada sube al menos 15 % y |ΔG| ≥ 0.05.
  - **H5c.** El ROAS atribuido sobrestima el incremental en al menos 30 %. El incremental se mide con un brazo de campañas apagadas.
  - **H5d.** Las ventas son cóncavas en el presupuesto, con m ∈ {0, 0.5, 1, 2, 4}.
- **Variables controladas:** semillas, mercado orgánico y precios.
- **Variables observadas:**
  - gasto, impresiones, frecuencia, alcance y clics;
  - visitas pagadas y duplicados descartados;
  - CPM y CPC efectivos, y tasa de presión;
  - conciencia y visitas orgánicas;
  - ROAS atribuido e incremental;
  - ventas netas, margen y G.
- **Diseño:** pareado, con unos 14 brazos y R = 12.
- **Métricas de éxito:** curvas de dosis-respuesta con IC por punto y razón atribuido/incremental con semiancho ≤ 0.2.
- **Riesgos de sesgo:**
  - Los límites de participación del perfil restringen la dosis.
  - El bandido reacciona al tratamiento.
  - Con segmentos solapados importa la prioridad de duplicados por orden de empresa (`visitas.ts:18-27`). Hay que alternarla.
- **Cambios requeridos:** CTR en función de la frecuencia y presión continua (`publicidad.ts`), variantes de perfil y un modo de dosis en el harness.
- **Costo estimado:** unas 2,000 corridas, ≈ 2 h, y 16–24 horas-persona.
- **Aceptación o rechazo:** por hipótesis, con Holm.

## Experimento 6 · Agentes LLM frente a agentes programados

- **Hipótesis falsables:**
  - **H6.1.** Un equipo híbrido, en el que el LLM propone y un validador determinista corrige, con el mismo perfil y la misma vista que ALFA programada y frente a la misma OMEGA programada, obtiene ventas netas acumuladas al menos δ mayores. δ se prerregistra; por ejemplo, 5 %. Se refuta si el límite inferior del IC 95 % pareado es ≤ 0.
  - **H6.2.** No aumentan los planes inválidos, las incidencias de `texto_sospechoso` o `acceso_denegado` ni las rondas con caja bajo la reserva.
  - **H6.3.** La mejora persiste cuando el validador interviene en menos del 20 % de los campos. Si no persiste, el mérito es de la capa de restricciones.
- **Brazos:**
  - (A) programado frente a programado;
  - (B) LLM en ALFA;
  - (C) LLM en OMEGA;
  - (D) LLM frente a LLM;
  - (E) B y C con etiquetas de empresa intercambiadas;
  - (F) opcional: LLM sin perfil.
- **Variables controladas:**
  - versión de reglas;
  - **identificador exacto del modelo** (snapshot fechado, sin alias);
  - plantilla de prompt con hash y parámetros de muestreo;
  - **vista saneada**: sin `semilla` y sin acceso a `simulation/` ni `config/` (`BRECHAS_MERCADO_REAL.md` X3);
  - presupuesto de tokens y llamadas por ronda.
- **Variables observadas:** las métricas del experimento 4, más tasa de intervención, planes inválidos, tokens y latencia, *regret* contrafactual y divergencia entre réplicas.
- **Diseño:**
  - Un bloque de desarrollo para iterar el prompt, separado de un bloque de prueba sellado. El prompt no se modifica después de abrir el bloque de prueba.
  - K ≥ 2 réplicas por semilla, todas grabadas.
  - **Queda prohibido quedarse con la mejor de N.** El análisis es por intención de tratar: los fallos que terminan en plan neutro cuentan.
- **Determinismo:**
  - Se usa un **casete** de respuestas: prompt canónico con hash, modelo, parámetros y respuesta cruda, con el hash encadenado al diario. La reproducción falla cerrada si falta una entrada.
  - La llamada la hace un **intermediario del harness**; el agente sigue sin red.
  - [HECHO, fuente citada en el memo C1] La temperatura 0 no garantiza determinismo. Hay no invarianza al tamaño de lote en la inferencia (Thinking Machines, 10-sep-2025), y el proveedor declara que el determinismo con `seed` "no está garantizado" (OpenAI Cookbook).
- **Riesgos de sesgo:**
  - ajustar el prompt con semillas de prueba;
  - fuga del oráculo;
  - conocimiento previo del modelo sobre los nombres;
  - actualización del modelo a mitad del experimento;
  - atribuir al LLM lo que hace el validador;
  - *gaming* del Juez;
  - caché compartida entre empresas.
- **Costo estimado:**
  - Llamadas = semillas × K × 12 × llamadas por ronda × empresas con LLM. Ejemplo: 60 × 2 × 12 × 1 × 4 = 5,760.
  - [HECHO, medido por C1] En R12, la entrada es de unos 30 KB de historial más unos 16 KB de configuración, escaparate y resultados. La salida ronda los 4.5 KB.
  - **El precio por token queda a cotizar.** No se contrata ningún servicio sin aprobación humana explícita.
  - Se estiman 40–80 horas-persona, porque incluye el intermediario y el casete.
- **Aceptación o rechazo:** H6.1 se acepta solo si se cumplen las cuatro condiciones:
  1. el IC excluye el 0 en la dirección prevista y la estimación es ≥ δ;
  2. se cumple H6.2;
  3. la reproducción del casete reproduce el 100 % de los hashes;
  4. hay cero violaciones de ACL.

## Experimento 7 · Crisis de demanda y recuperación

- **Hipótesis falsables:**
  - **H7a.** Con `actividad_diaria` ×0.6 en R7–R9, las ventas de ambas caen en proporción (|ΔG| < 0.05 por TOST), y sube P(margen ≤ 0), más en la empresa con más inventario comprometido.
  - **H7b.** Con presupuestos ×0.75 y sensibilidad al precio ×1.25, G cae al menos 0.10 durante el choque.
  - **H7c.** La empresa con más lealtad acumulada recupera el 90 % de su VN de control en menos rondas.
  - **H7d.** El suavizado de demanda de los agentes produce un efecto látigo: días de inventario ≥ 1.5× el control tras la recuperación.
- **Variables controladas:** semillas, perfiles, R = 24 y misma fase del ciclo.
- **Variables observadas:**
  - ventas netas, margen y utilidad;
  - caja, pasivo e insolvencia;
  - inventario, liquidaciones y mermas;
  - G por ronda;
  - rondas hasta la recuperación;
  - conversión por segmento.
- **Diseño:** pareado con 6 brazos. Incluye un brazo de robustez de fase, con el choque en R4–R6, para no confundirlo con el ciclo de 6 rondas (`motor.ts:73`).
- **Métricas de éxito:** curvas de impulso-respuesta con IC por ronda.
- **Riesgos de sesgo:** confusión con el ciclo determinista, choque elegido a mano y horizonte distinto del oficial.
- **Cambios requeridos:** calendario de choques en la configuración y multiplicadores en `motor.ts:73-80`, `decision.ts:87,97` y `visitas.ts:99`.
- **Costo estimado:** unas 850 corridas de 24 rondas, ≈ 1.5 h, y 14–20 horas-persona.
- **Aceptación o rechazo:** por hipótesis, con Holm.

## Experimento 8 · Tercer competidor

- **8a (entrante exógeno, barato).** Una tercera opción no estratégica, con precio, calidad y conciencia fijos, que entra en R5.
  - **H8a.** Un entrante de bajo precio reduce más la VN de OMEGA que la de ALFA: Δlog VN_O − Δlog VN_A ≤ −0.10.
  - **H8b.** Un entrante premium produce el patrón inverso.
  - **H8c.** La pérdida conjunta de ALFA y OMEGA es menor que el 50 % de la cuota que gana el entrante; el resto sale de la opción externa.
- **8b (tercera empresa estratégica, caro).** Requiere **redefinir la regla de victoria**, por ejemplo "≥ 2× cada rival". Es un cambio de reglas con un AGENTS.md nuevo.
- **Variables controladas:** semillas, R = 12, ronda de entrada y parámetros del entrante prerregistrados. Se hace un barrido de 3×3 en precio y calidad para no escoger valores a mano.
- **Variables observadas:**
  - cuotas a tres bandas, registrando la opción externa;
  - IHH y cuota por segmento;
  - matriz de cambios de tienda;
  - respuesta de precios;
  - ventas netas, margen y G.
- **Riesgos de sesgo:** el entrante no aprende, así que no es un competidor real, y sus parámetros determinan el resultado.
- **Cambios requeridos:**
  - 8a: `decision.ts:47-64` y comparación contra la mejor alternativa en `visitas.ts:78-89`.
  - 8b: refactorizar todo lo binario (`shared/types/dominio.ts`, motor, ACL, vistas, War Room y pruebas).
- **Costo estimado:**
  - 8a: unas 600 corridas y 12–20 horas-persona.
  - 8b: **60–120 horas-persona**.
- **Aceptación o rechazo:** según el IC de cada hipótesis.

## Experimento 9 · Validación contra datos reales

- **Hipótesis falsable (H9).** Calibrado con fuentes públicas y con los meses 1..t de un comercio colaborador, el simulador predice los KPI agregados del mes t+1 mejor que un ingenuo estacional y con intervalos bien calibrados. Los KPI son: pedidos, venta neta **sin IVA**, ticket, tasa de devolución y mezcla de canales.
  - **H9-causal:** acierta el signo de las intervenciones reales de precio o de promoción.
- **Fases:**
  - **9A, sin socio:** se contrasta la forma estacional simulada con INEGI EMEC 463 y 469, y la mezcla de pagos con Banxico CF621 y AMVO. Es condición necesaria, no suficiente.
  - **9B, con socio:** agregados semanales disociados (`BRECHAS_MERCADO_REAL.md` §4).
- **Variables:**
  - **Independientes:** calendario, precios y promociones planeados, presupuesto planeado por canal y deriva del INPC.
  - **Dependientes:** los KPI de H9.
  - **De control:** versión sellada por fold, semilla (varias semillas para los intervalos) y una definición homologada de "visita" frente a "sesión".
- **Diseño:**
  - Origen rodante con al menos 6 folds y separación temporal estricta.
  - Solo covariables conocidas de antemano.
  - Configuración sellada en cada fold antes de ver t+1.
  - Evaluación ciega por un miembro que no calibró.
  - Por identificabilidad, se calibra solo un subconjunto pequeño y prerregistrado de los 232 parámetros.
- **Métricas:** WAPE, MASE frente al ingenuo estacional, cobertura al 80 % y al 95 %, y acierto de signo en intervenciones.
- **Riesgos de sesgo:**
  - un solo comercio, con validez externa limitada;
  - la atribución que reporta la plataforma;
  - fuga temporal y sobreajuste;
  - ruido de privacidad diferencial;
  - choques regulatorios;
  - diferencias de definición: IVA, sesión frente a visita.
- **Costo estimado** ([HIPÓTESIS] del miembro D):
  - 9A: 2–3 semanas-persona.
  - 9B: revisión legal de 1–2 semanas-persona, más 2–4 semanas del comercio y 4–6 semanas de extensión del modelo y evaluación.
  - Gasto en anuncios y pagos reales: **cero**.
- **Aceptación:** para venta neta y pedidos deben cumplirse las tres condiciones:
  - WAPE ≤ 0.9 × el WAPE del ingenuo en al menos 4 de 6 folds;
  - cobertura al 80 % dentro de [70 %, 90 %];
  - ningún fold por encima de 2× el ingenuo.
- **Rechazo:** si no se cumple lo anterior.
- **Inconcluso:** si hay menos de 12 meses de historia o se suprime más del 20 % de las celdas clave.
- El resultado se publica como validez **para ese comercio y periodo**.

---

## Resumen de dependencias y orden sugerido

| Orden | Experimentos | ¿Cambia reglas o modelo? | Depende de |
|---|---|---|---|
| 1 | E0.1–E0.5 | Solo E0.4 (agente) | Protocolo §0, ≥ 2 GB de disco |
| 2 | 2, 3 (L1 y L4), 5 (H5c) | Sí (configuración o perfiles) | E0 y flujos aleatorios por empresa |
| 3 | 1, 4, 7, 8a | Sí (motor) | Neutralidad del código |
| 4 | 6 | Sí (agentes e intermediario) | Vista saneada, casete y aislamiento con fallo cerrado (`MATRIZ_MEJORAS.md`) |
| 5 | 9A, luego 9B | Sí (IVA, calendario, pagos) | Revisión legal y convenio |
| — | 8b | Sí (reglas de victoria) | AGENTS.md nuevo y autorización |
