# BRECHAS_MERCADO_REAL — E-COMMERCE WARS frente al comercio electrónico de moda en México

**Comité de Evaluación Científica, Económica y Tecnológica** · Postmortem · 2026-10-20
**Estado:** análisis de solo lectura. No se modificó código, reglas ni registros. Nada de lo que aparece aquí se ha incorporado al simulador.

**Autoría:**
- Síntesis del orquestador del comité.
- Memo D (especialista en comercio electrónico): fuentes externas, consultadas el 2026-10-20.
- Memo A (economista de mercado): formas funcionales y ausencias.
- Memo C1 (sistemas multiagente): artefactos de los agentes.

**Convenciones:**
- **[HECHO]** es algo verificado en código (`ruta:línea`, relativa a `ecommerce-wars/`) o en una fuente citada.
- **[INFERENCIA]** es una deducción a partir de hechos.
- **[HIPÓTESIS]** es algo por probar.
- **[RECOMENDACIÓN]** es una propuesta que requiere aprobación humana.
- Ninguna cifra externa se presenta como medición del simulador. Las cifras de terceros llevan su fuente, su tipo y su fecha. Ver §3.

---

## 0. Conclusión

E-COMMERCE WARS es hoy un **mercado sintético cerrado**, sin calibrar con datos reales:
- 9,000 clientes fijos y 4 segmentos;
- 232 parámetros numéricos fijados a mano (conteo de solo lectura del memo D);
- formas funcionales elegidas por el diseñador.

La única "calibración" que hubo ajustó el mercado para equilibrar el **resultado** entre dos estrategias fijas, con las mismas semillas que después se reportaron (`docs/ARQUITECTURA.md:97-106`). No se calibró contra momentos observados del mercado real.

**[INFERENCIA, alta]** Por eso ninguna magnitud del simulador se puede leer como pronóstico del mercado mexicano: conversión, ticket, ROAS, márgenes, efecto de descuentos ni "quién gana". Lo que sí ofrece es un **laboratorio controlado y reproducible** para estudiar mecanismos dentro del modelo. Cerrar las brechas de este documento es condición para usarlo con fines comerciales (ver `DICTAMEN_JUEZ.md`).

---

## 1. Brechas del modelo de mercado (verificadas en código)

### 1.1 Demanda y decisión del cliente

| # | Brecha | Evidencia | Consecuencia | Severidad |
|---|---|---|---|---|
| D1 | **La elección de tienda no depende del precio.** El logit entre ALFA, OMEGA y la opción externa usa solo conciencia, lealtad y variedad. | [HECHO] `simulation/customers/decision.ts:47-64` | Un precio alto no cuesta tráfico, solo conversión. Favorece el posicionamiento premium. | Alta |
| D2 | El precio se evalúa contra un **ancla fija de configuración** (`precio_referencia`), no contra el precio de mercado. Los descuentos repetidos no erosionan la disposición a pagar. | [HECHO] `decision.ts:83` | Las promociones permanentes no tienen costo de reputación. | Media |
| D3 | **El descuento cuenta dos veces:** por el precio final y por un bono de promoción. | [HECHO] `decision.ts:83,90` | [INFERENCIA, media; cálculo estilizado del memo A] La respuesta al descuento es muy elástica y abre una vía de juego por descuento profundo sin explorar. | Alta |
| D4 | **La lealtad cuenta dos veces** (elección de tienda y utilidad) y no decae. | [HECHO] `decision.ts:59,88`; `simulation/market/motor.ts:158-166` (solo decae la conciencia) | La conversión crece casi sin techo: ALFA pasa de 3.7 % a 14.4 % en `runs/prueba-base`. Amplifica la ventaja de calidad. | Alta |
| D5 | **La calidad es observable antes de comprar.** No hay asimetría de información ni reputación que construir. | [HECHO] `decision.ts:80-82` | Sobrevalora las estrategias de calidad frente a un mercado real. | Media |
| D6 | No hay saciedad ni tiempo entre compras. `recurrente` es solo una etiqueta. | [HECHO] `simulation/market/visitas.ts:9-15`; `pedidos.ts:61,69` | La recurrencia está mal especificada. | Media |
| D7 | Una "visita" es un cliente que ya decidió comprar en una categoría, no una sesión web. | [HECHO] `procesarVisita` (memo D §1) | La conversión simulada no es comparable con la de un sitio real sin redefinir la métrica. | Media (de medición) |
| D8 | Población estática: no hay altas, bajas, boca a boca ni crecimiento. | [HECHO] `simulation/customers/poblacion.ts:29-56` | Mercado cerrado. | Media |

### 1.2 Competencia y estructura de mercado

| # | Brecha | Evidencia | Consecuencia | Severidad |
|---|---|---|---|---|
| C1 | **Las empresas no compiten por publicidad.** ALFA apunta a profesionales y premium; OMEGA a jóvenes y cazadores. La presión de subasta exige el mismo canal **y** el mismo segmento. | [HECHO] `agents/*/perfil.json:18`; `simulation/market/publicidad.ts:24`. Presión activada en 0/555 y 0/117 campañas-día (memo A). | La "competencia por atención" de la especificación (AGENTS.md §6) no ocurre. El mercado queda repartido de hecho. | Alta |
| C2 | **La opción externa es una constante** (`opcion_externa` = 1.3). No reacciona a precios ni representa marketplaces. | [HECHO] `decision.ts:50-52`; `config/experiment.json` | No hay competencia de plataformas. | Alta |
| C3 | No hay marketplaces ni plataformas transfronterizas. | [HECHO] `simulation/**` no los modela | [HECHO, fuente] COFECE (dictamen preliminar IEBC-001-2022, DOF 13-02-2024): Amazon y Mercado Libre suman más del 85 % del lado de vendedores en marketplaces. ANAM: tasa global de 33.5 % para paquetería (vigencia 2026 sin confirmar). | Alta para la estrategia de canal |
| C4 | Hay exactamente 2 empresas, con `rivalDe` binario. | [HECHO] `shared/types/dominio.ts:1,23-25` | No hay entrada ni salida de competidores. | Media |

### 1.3 Costos, finanzas e impuestos

| # | Brecha | Evidencia | Consecuencia | Severidad |
|---|---|---|---|---|
| F1 | **No hay IVA.** Los precios se tratan como netos. | [HECHO] búsqueda sin resultados en `simulation/`, `agents/`, `harness/`, `shared/`, `config/`. [HECHO, fuente] LIVA art. 1 (16 %); LFPC art. 7 Bis (precio total con impuestos). | [INFERENCIA, alta] Si los precios son al consumidor, alrededor de 16/116 ≈ 13.8 % de lo cobrado en ventas gravadas no es ingreso. Las ventas netas y los márgenes están sobrestimados. | Alta |
| F2 | No hay inflación ni variación de costos. | [HECHO] `simulation/suppliers/proveedores.ts:20-22` | Según el memo D, el boletín 619/26 del INPC de septiembre de 2026 reporta «Ropa y calzado» +0.83 % mensual y +2.53 % anual. **E confirmó el boletín (08-10-2026), pero no pudo reverificar el subíndice exacto.** El modelo no tiene presión sobre márgenes. | Media |
| F3 | No hay crédito ni plazos. El cobro es inmediato y el pago al proveedor es al contado. | [HECHO] `pedidos.ts:93`; `proveedores.ts:61`; `simulation/economics/tesoreria.ts:32-47` | La rotación de capital es irrealmente alta: unos 100k MXN generan entre 150k y 190k de ventas por semana. | Media |
| F4 | Los costos fijos son muy livianos: 800 MXN/día, sin nómina, renta ni plataforma. | [HECHO] `config/experiment.json` (`costos`) | Las utilidades operativas quedan sobrestimadas. | Media |

### 1.4 Pagos y fraude

| # | Brecha | Evidencia real | Consecuencia | Severidad |
|---|---|---|---|---|
| P1 | El rechazo de pago es fijo (1.5 %). No hay embudo de pago, reintentos ni distinción de método. | [Fuente oficial según el memo D; **E no la pudo reverificar**] Banxico SIE CF621: aceptación de pagos con tarjeta en comercio electrónico de 69.75–70.44 % por número de solicitudes (jul-2025 a mar-2026). **Las definiciones difieren:** Banxico cuenta solicitudes, incluidos reintentos y filtros antifraude; el simulador cuenta pedidos. No significa «30 % de pedidos perdidos». | El bloque de pagos no está calibrado, pero hay una fuente oficial para hacerlo. | Media-alta |
| P2 | No hay contracargos. | Banxico CF621, según el memo D (sin reverificar por E): 0.34–0.39 % por número. | El margen está sobrestimado. | Media |
| P3 | No hay meses sin intereses, OXXO/efectivo ni contra entrega. | [HECHO, encuesta] AMVO 2026, versión pública (panel no probabilístico, n = 911): débito 69 %, crédito 54 %, efectivo en cadenas 23 %, contra entrega 14 %, entre otros. PDF obtenido de un espejo de terceros; hay que solicitar el original y sus términos. | El riesgo de no pago y los ciclos de cobro no existen en el modelo. | Media |
| P4 | La comisión es plana (3.5 %). | No se encontró una fuente oficial de comisiones de adquirencia. | Queda sin validar. | Baja-media |

### 1.5 Publicidad y medición

| # | Brecha | Evidencia | Consecuencia | Severidad |
|---|---|---|---|---|
| M1 | **El ROAS y el "CAC" son atribuidos (último contacto), no incrementales.** La visita pagada desplaza a la orgánica del mismo cliente ese día. | [HECHO] `visitas.ts:18-27`; `simulation/economics/proyeccion.ts:365-371,648-649` | [INFERENCIA, alta] Los ROAS de 2 a 17 que se observan sobrestiman el efecto causal. La regla de aprendizaje de marketing se alimenta de esa señal sesgada. | **Alta**, porque puede llevar a sobreinvertir |
| M2 | CPM, CPC y CTR son constantes. La presión de subasta es binaria y no hay pujas, *quality score* ni fatiga creativa. | [HECHO] `publicidad.ts:24,48,58-84` | Los rendimientos decrecientes son parciales: solo hay tope de frecuencia y saturación de conciencia. | Media |
| M3 | La atribución es perfecta: no hay pérdida de señal. | [HECHO] código; [HECHO, fuente] Google (17-10-2025) retiró varias APIs de Privacy Sandbox, pero las cookies de terceros siguen siendo elección del usuario en Chrome. | No representa la medición ruidosa que tiene un comercio real. | Media |
| M4 | **El prior de marketing de los agentes es exactamente la estructura de CTR del simulador.** | [HECHO] `agents/nucleo/marketing.ts:48-50` contra `publicidad.ts:58` | Es un conocimiento de "caja blanca" imposible en el mercado real. Infla el desempeño aparente del bandido. | Media |

### 1.6 Operación, logística y producto

| # | Brecha | Evidencia | Consecuencia | Severidad |
|---|---|---|---|---|
| O1 | No hay talla ni color. Hay 12 SKU sin variantes. | [HECHO] `simulation/inventory/inventario.ts` | El quiebre parcial por talla y las devoluciones por talla, centrales en moda, no existen. No hay fuente pública mexicana verificable para cuantificarlos (memo D). | Alta en moda |
| O2 | No hay tiempo de entrega, zonas, entregas fallidas ni daños. El envío cuesta 110 MXN fijos. | [HECHO] `pedidos.ts`; `config` | [HECHO, encuesta] AMVO 2026: «que mi compra llegue dañada» 45 % y «tiempos no cumplidos» 38 % como puntos de dolor. Solo es contraste cualitativo. | Media |
| O3 | Los proveedores no tienen capacidad, quiebre ni cambios de precio. La única falla es un retraso de 1–2 días. | [HECHO] `proveedores.ts:64` | El riesgo de suministro es casi trivial (ver el experimento V2-4). | Media |
| O4 | La ventana de devolución es aleatoria de 2 a 6 días, sin regla legal. | [HECHO] `pedidos.ts:169`; [HECHO, fuente] LFPC art. 56 (revocación en 5 días hábiles tras la entrega en ventas a distancia; su aplicación requiere opinión legal) | Las devoluciones están mal ubicadas en el tiempo: cuentan en la ronda en que se procesan, no en la de la venta. | Media |

### 1.7 Calendario

| # | Brecha | Evidencia | Consecuencia |
|---|---|---|---|
| T1 | No hay calendario anual. La fecha simulada (2027-01-04 a 2027-03-28) es solo una etiqueta. Solo existen la estacionalidad semanal, un seno de 6 rondas y ruido. | [HECHO] `motor.ts:73-80`; `shared/calendario.ts` | [HECHO, fuentes] Buen Fin 2025 (SE, comunicado 121: 13 al 17-nov-2025; el comercio electrónico fue el 26 % de la facturación con tarjeta). EMEC de INEGI publica series mensuales de los subsectores 463 y 469. Sin calendario, el modelo no sirve para planear inventario. |

### 1.8 Artefactos internos que contaminan la comparación (no son del mercado real)

| # | Artefacto | Evidencia | Efecto |
|---|---|---|---|
| X1 | **Defecto de punto flotante en las fichas de ALFA.** `Math.ceil((0.8−0.5)/0.15)` = 3, porque el cociente es 2.0000000000000004. | [HECHO, reproducido por el orquestador] `agents/nucleo/ventas.ts:91-95`; `node -e` | ALFA lleva 5 SKU a una ficha de 0.95 en lugar de 0.8: un paso de más por SKU, que cuesta 600 MXN y da más calidad percibida. OMEGA no se ve afectada. |
| X2 | **OMEGA copia liquidaciones temporales de ALFA como precio de lista.** El escaparate que ven los agentes es la foto del día 7. | [HECHO] `harness/orchestrator/controlador.ts:590`; `ventas.ts:33-36`. Con la semilla 20261019, 8 de 8 seguimientos de precio coinciden con liquidaciones de fin de semana de ALFA (memo C1). | La reacción al rival responde a un artefacto, no a una estrategia. |
| X3 | La semilla de la corrida está en la vista de los agentes y su ACL permite leer `simulation/` y `config/`. | [HECHO] `harness/orchestrator/vistas.ts:101`; `harness/permissions/acl.ts:23-30` | Los agentes actuales no lo explotan. Un agente LLM o de RL podría reconstruir el ruido del mercado ("oráculo"). |

---

## 2. Fuentes públicas para calibrar o validar

Todas fueron consultadas por el miembro D el 2026-10-20. El orquestador no repitió cada consulta. El auditor adversarial (E) revisó tres:
- **Confirmó** la LFPDPPP (DOF 20-03-2025) y la existencia del boletín INPC 619/26 (08-10-2026).
- **No pudo verificar** las cifras de Banxico CF621 (el cuadro del SIE no se pudo recuperar) ni el subíndice exacto «Ropa y calzado».

Esas cifras se citan aquí tal como las reporta el memo D, con esa salvedad (ver `REPORTE_POSTMORTEM.md` §9). La tabla completa, con 22 fuentes, está en el memo D. Aquí van las útiles para calibrar.

| Fuente | Tipo | Edición consultada | Qué podría calibrar | Términos de uso | Limitación principal |
|---|---|---|---|---|---|
| INEGI ENDUTIH 2025 | Oficial (encuesta en hogares) | Comunicado 16-06-2026 (datos 2025) | Proporción de usuarios que compran en línea (37.3 % en 2025); población compradora | Libre uso con crédito (inegi.org.mx/inegi/terminos.html, verificado) | Ropa agregada con otras categorías; declarativa |
| INEGI EMEC (subsectores 463 y 469) | Oficial (encuesta a empresas) | Boletín 398/26, 23-06-2026 | **Estacionalidad mensual** y calendario anual | Libre uso INEGI | Índices, no niveles por tienda; 469 mezcla todas las categorías |
| INEGI INPC «Ropa y calzado» | Oficial (índice de precios) | Boletín 619/26, 08-10-2026 | Deriva de precios (experimento V2-1); deflactor del piloto | Libre uso INEGI | No es precio por SKU ni por canal |
| INEGI ENIGH 2024 | Oficial (encuesta en hogares) | 30-07-2025 | Presupuestos por segmento (vestido y calzado ≈ 3.8 % del gasto corriente monetario del hogar) | Libre uso INEGI | Gasto por hogar, no por compra ni por canal |
| Banxico SIE CF621 | Oficial (dato de pagos) | Trimestral 2015 a ene–mar 2026 | Aceptación, contracargos y devoluciones con tarjeta en comercio electrónico | **No se encontraron términos de uso** | La unidad es la solicitud o autorización, no el pedido; todas las categorías |
| AMVO, Estudio de Venta Online 2026 (versión pública) | Asociación: estimación más panel no probabilístico | Edición 2026 | Mezcla de métodos de pago, puntos de dolor logísticos | **No se encontraron términos**; PDF de un espejo de terceros | Inconsistencias internas (fechas de levantamiento, cifras de Hot Sale) |
| COFECE IEBC-001-2022 | Oficial (autoridad de competencia) | DOF 13-02-2024 (preliminar) | Diseño de un canal marketplace | Publicación del DOF | Preliminar; datos de 2022 |
| SE, Buen Fin 2025 | Oficial (con datos de terceros) | 14-12-2025 | Choque de demanda por evento | gob.mx (licencia no verificada) | Mezcla de definiciones |
| Google Trends | Estimación de un proveedor (índice muestral) | Consultado | Forma y momento de las tendencias por categoría | Términos generales de Google | Índice relativo de 0 a 100, no volumen |

**Importante.** **[HECHO]** Ninguna de estas fuentes sustituye datos de un comercio. Elasticidades, devoluciones por talla, CAC incremental, mezcla de meses sin intereses y comisiones de adquirencia **no tienen fuente pública verificable** (memo D §2). Solo un piloto con datos agregados puede medirlas.

---

## 3. Lo que este postmortem NO afirma

- **No** afirma que las cifras del simulador (conversión de 8–14 %, ticket de 600–1,300 MXN, devoluciones de 6–8 %, ROAS de 2–17) sean altas o bajas respecto del mercado real. No hay fuente pública comparable con definiciones homologadas.
- **No** presenta como benchmark las cifras de prensa sobre Hot Sale. Las fuentes son inconsistentes entre sí (memo D §2.5).
- **No** usa las devoluciones con tarjeta de Banxico (0.69–0.86 %) como tasa de devolución de moda. Cubren todas las categorías y solo pagos con tarjeta.

---

## 4. Ruta para cerrar brechas — [RECOMENDACIÓN] (requiere aprobación humana)

1. **Antes de cualquier calibración:** fijar la lista de **momentos objetivo externos** (conversión por sesión, ticket, devoluciones, estacionalidad y mezcla de pagos) y sus fuentes. Usar semillas de calibración disjuntas de las de evaluación (ver `EXPERIMENTOS_V2.md` §0).
2. **Cambios de modelo** (versión nueva de reglas, resellada por una persona, nunca sobre la configuración sellada actual):
   - IVA;
   - embudo de pago y contracargos;
   - calendario anual;
   - opción externa reactiva o canal de marketplace;
   - talla y color;
   - decaimiento de la lealtad y saciedad;
   - elección de tienda sensible al precio;
   - revisión del doble conteo de descuento y lealtad.
3. **Medición:** rotular el ROAS y el CAC como "atribuidos" y añadir **incrementalidad contrafactual con la misma semilla**. El motor ya es determinista; se necesitan flujos aleatorios por empresa para el pareo (memo A §2.4; memo C1 §10.4).
4. **Fase 9A, sin socio:** contrastar la forma estacional con EMEC y la mezcla de pagos con Banxico y AMVO. Es condición necesaria, no suficiente.
5. **Fase 9B, piloto con un comercio colaborador:** agregados semanales disociados dentro de su infraestructura, sin datos personales ni con hash, con umbral de celda k ≥ 10, convenio y revisión legal (nueva LFPDPPP, DOF 20-03-2025, art. 9-III sobre disociación; hay que confirmar con jurídico si existe un reglamento nuevo). Evaluación con origen rodante contra un ingenuo estacional (`EXPERIMENTOS_V2.md`, experimento 9).
6. **Nunca:** pagos reales, anuncios reales, *scraping* contra términos de uso, contacto con clientes, ni marcas o nombres reales en el simulador o el War Room.

---

## 5. Límites a la extrapolación (resumen)

| Pregunta | ¿Responde hoy el simulador? |
|---|---|
| ¿Qué mecanismos del modelo producen la ventaja de ALFA? | **Sí**, como inferencia causal *dentro del modelo* mediante ablaciones e intercambios con la misma semilla. |
| ¿Qué estrategia vende más en el mercado real? | **No.** Mercado no calibrado, formas funcionales sin validar y sin competencia publicitaria. |
| ¿Cuánto rinde un peso de publicidad? | **No.** El ROAS es atribuido, no incremental, y el CTR y CPM son fijos. |
| ¿Conviene un descuento del X %? | **No.** El descuento cuenta dos veces y el ancla de precio es fija. |
| ¿Cuánto margen deja una venta? | **No.** No hay IVA, contracargos, nómina ni plataforma. |
| ¿El software es íntegro y reproducible? | **Sí, con límites**: integridad interna sin autenticidad (ver `REPORTE_POSTMORTEM.md` §5). |
