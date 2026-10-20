# ROADMAP_V2 — De simulación educativa a laboratorio predictivo de investigación comercial

**Comité de Evaluación Científica, Económica y Tecnológica** · Postmortem de E-COMMERCE WARS · 2026-10-20

**Estado:** propuesta. **Toda fase y todo cambio requieren aprobación humana nominal antes de ejecutarse.** No se modificaron código, reglas ni registros.

Este roadmap ordena las mejoras de `MATRIZ_MEJORAS.md` (identificadores **M-xx**) y los experimentos de `EXPERIMENTOS_V2.md` (**E0.x** y **1–9**). Cada fase tiene una **puerta de salida** verificable. Ninguna fase empieza si la anterior no superó su puerta, salvo las tareas marcadas como paralelizables.

Las estimaciones de esfuerzo son de los miembros del comité y **no tienen fuente externa**. Sirven para ordenar, no para presupuestar.

---

## Fase 0 · Contención (antes de cualquier otra cosa)

**Objetivo.** No producir evidencia engañosa con el sistema actual.

| Acción | Ref. | Quién decide |
|---|---|---|
| **No ejecutar el torneo oficial con la semilla sellada 20261019.** Ya se corrió en `runs/prueba-base` y su resultado se conoce: sin ganador en R12. | M-01 | Responsable humano del experimento |
| Corregir las afirmaciones públicas que no se sostienen: "competencia pareja", "1 victoria en 10" presentada como tasa, "ajuste simétrico", "aprendizaje" y "agentes autónomos". Marcar el banco como **dentro de muestra**. | M-02 | Responsable humano |
| Versionar el árbol exacto con un commit y un tag firmados. Hoy `ecommerce-wars/` no está en git. | M-03 | Responsable humano |
| Liberar disco: ≥ 2 GB libres. Hoy hay unos 0.5 GB y hubo 7 abortos por `ENOSPC`. | M-04 | Operador |

**Puerta de salida:**
- documentación corregida y aprobada;
- tag firmado con la huella `c808707c…` (o la que corresponda);
- decisión escrita de no correr el oficial con la semilla actual.

**Esfuerzo:** 0.5–1 día-persona.

---

## Fase 1 · Mejoras inmediatas (robustez, integridad y artefactos)

**Objetivo.** Que la evidencia del sistema sea **auténtica, durable y libre de artefactos conocidos** antes de usarla para ciencia.

**Bloque 1A — Integridad y operación.** Paralelizable.
- Candado de corrida (M-10).
- `aprender` idempotente (M-11).
- Tolerancia y reparación de colas de diario desgarradas, sin caída del War Room (M-12).
- `fsync` de archivo y directorio, o un servicio de *commit* durable (M-13).
- Comprobación de espacio libre (M-14).
- Commit en dos fases del expediente y la sentencia; `.md` derivable o con hash (M-15).
- Verificación de manifiestos antes de reanudar (M-16).
- Huella de código ampliada y verificada al arrancar; `modulosEquipo` prohibido en modo oficial (M-17).

**Bloque 1B — Aislamiento y autenticidad.**
- `--disable-sigusr1` en todo proceso Node sin restricciones y agentes bajo otro UID (M-20).
- Canario de red con fallo cerrado, sellado en la cadena (M-21).
- bubblewrap en Linux (M-22).
- Firmas Ed25519 por principal (M-23).
- Anclaje externo de hashes por ronda: RFC 3161 o Rekor, **solo hashes**, sin datos (M-24).
- Sello de reglas con firma personal (M-25).
- Incidentes de acceso reportados por el harness, no por el agente (M-26).

**Bloque 1C — Artefactos de modelo y agentes.** Cambian reglas o agentes, así que requieren versión nueva y resello.
- Corregir el redondeo de fichas (`ventas.ts:91-95`) (M-30).
- Seguimiento de precio del rival sobre el precio de lista, no sobre la liquidación del día 7 (M-31).
- Quitar `semilla` de la vista y retirar `simulation/` y `config/` del ACL de los agentes (M-32).
- Rotular el ROAS y el CAC como "atribuidos" (M-33).

**Puerta de salida:**
1. Las 15 pruebas de fallo del memo C2 §5 existen y pasan en una matriz de CI con Linux y macOS.
2. Cada fallo inyectado con kill -9 termina en *mismo hash final* o en *rechazo documentado*.
3. En modo oficial, la prueba de red **falla** en lugar de omitirse si no hay aislamiento.
4. `verificar` detecta: truncamiento frente a la cabeza anclada, sustitución del módulo de equipo y alteración del `.md`.

**Esfuerzo:** 1A, 6–10 días-persona; 1B, 8–15; 1C, 2–4.

---

## Fase 2 · Validación estadística

**Objetivo.** Saber qué afirmaciones del simulador son robustas, con qué incertidumbre y con qué regla de decisión.

**Acciones:**
1. Adoptar el **protocolo de etapas** (CAL → SEL → EVA → OFICIAL) con semillas comprometidas por hash (EXPERIMENTOS_V2 §0.1–0.3) (M-40).
2. Correr **E0.1–E0.5** con semillas nuevas:
   - simetría del harness;
   - intercambio de perfiles;
   - aprendizaje en factorial y por componente;
   - efecto del defecto de fichas;
   - **características operativas de la regla de victoria**.
3. Con los resultados de E0.5, **proponer a la autoridad humana** una regla de victoria con error tipo I y potencia conocidos. El comité **no** modifica la regla vigente (M-41). Opciones, con las advertencias del memo B §4.5:
   - **Criterio multisemilla** (preferente). Por ejemplo, M = 20 semillas y una prueba de signos o z sobre la cuota acumulada. En la exploración dio una potencia de 0.88–0.99 con un error nominal del 5 %.
   - **Ventaja acumulada dentro de una sola corrida.** No separa el nulo de la ventaja, porque conserva la suerte de la semilla. Una prueba secuencial sobre rondas dentro de la corrida tendría un tamaño muy superior al nominal, porque 12 rondas equivalen a unas 1.7 observaciones. **No se recomienda como criterio principal.**
   - **Margen o utilidad en lugar de ingreso.** Cambia lo que se estima y favorece por diseño al modelo premium: como regla por ronda da 40/40 a ALFA y 0.93 de falsos positivos en el espejo OMEGA. Solo debería usarse con una prueba multisemilla.
4. Formato de torneo **multisemilla**: el veredicto se emite sobre la distribución de resultados, no sobre una trayectoria (M-42).
5. Flujos aleatorios por empresa (números aleatorios comunes) para reducir la varianza de los pareos (M-43).
6. War Room 2.0, primera parte (M-50 a M-53):
   - bandas multisemilla;
   - etiqueta epistémica por métrica: observada, atribuida, contrafactual o experimental;
   - panel "¿quién gana con otra métrica?";
   - contrafactual de un periodo con la misma semilla.

**Dependencias:**
- E0.4 requiere la versión corregida de los agentes, del bloque 1C (M-30).
- El prerregistro debe declarar sobre qué versión se confirma cada E0: la V1 sellada o la corregida.

**Puerta de salida:**
- E0 publicado con prerregistro, hashes y código.
- Tasa de falsos positivos y potencia de la regla de victoria documentadas.
- Decisión humana sobre la regla.
- La simetría del harness confirmada por TOST.

**Esfuerzo:** 8–15 días-persona. Cómputo: 1–2 h en-proceso, con ≥ 2 GB de disco.

---

## Fase 3 · Mayor realismo económico

**Objetivo.** Cerrar las brechas de **mecanismo** de mayor severidad (`BRECHAS_MERCADO_REAL.md` §1) y medir su efecto con experimentos.

**Acciones (versiones nuevas de reglas, cada una sellada):**
- **Demanda:** elección de tienda sensible al precio, revisión del doble conteo del descuento y de la lealtad, decaimiento de la lealtad y saciedad (M-60, M-61).
- **Finanzas:** IVA y contracargos con embudo de pago (M-62); crédito y plazos (M-63).
- **Calendario anual** y choques exógenos (M-64).
- **Proveedores** con capacidad y fallas (M-65).
- **Publicidad** con CTR decreciente, presión continua e incrementalidad (M-66).
- Opción externa reactiva o canal de marketplace (M-67).
- Experimentos: **2, 3, 5** primero; luego **1, 4, 7 y 8a**; **8b** solo con un AGENTS.md nuevo autorizado.

**Puerta de salida:**
- Cada mecanismo nuevo tiene prueba de neutralidad (hash idéntico con el parámetro neutro) y un experimento con IC.
- Se publica la descomposición de la ventaja de ALFA por mecanismo (experimento 3).
- Ninguna afirmación se apoya en una sola semilla.

**Esfuerzo:** 30–60 días-persona.

---

## Fase 4 · Agentes inteligentes híbridos

**Objetivo.** Evaluar si un LLM aporta decisiones mejores, de forma **auditable y reproducible**.

**Prerrequisitos:** Fases 1B y 1C completas (aislamiento con fallo cerrado, vista saneada, firmas).

**Acciones:**
1. Intermediario de LLM en el harness con **casete** sellado: el modelo exacto, el prompt canónico y la respuesta se encadenan al diario, y la reproducción falla cerrada (M-70).
2. Pruebas de contrato y metamórficas de los planes (M-71).
3. Experimento **6**, con bloques de desarrollo y de prueba separados y K réplicas.
4. Aprendizaje por refuerzo solo como brazo de investigación, con aleatorización de dominio y configuraciones reservadas.

**Restricciones:**
- Contratar cualquier servicio de LLM requiere aprobación humana explícita y un presupuesto aprobado. El costo queda **a cotizar**.
- No usar datos reales en los prompts.

**Puerta de salida:**
- La reproducción del casete da el 100 % de los hashes.
- Cero violaciones de ACL.
- H6.1, H6.2 y H6.3 se resuelven con IC prerregistrados.

**Esfuerzo:** 20–40 días-persona, más el costo de API a cotizar.

---

## Fase 5 · Validación con datos reales

**Objetivo.** Medir el error predictivo del simulador frente a la realidad.

**Acciones:**
1. **Experimento 9A**, sin socio: forma estacional frente a INEGI EMEC y mezcla de pagos frente a Banxico CF621 y AMVO, con las advertencias de definición.
2. **Revisión legal:** nueva LFPDPPP (DOF 20-03-2025), LFPC art. 76 Bis y confirmación de si hay un reglamento nuevo. Convenio de colaboración con un comercio (M-80).
3. **Experimento 9B**, con agregados disociados, k ≥ 10, origen rodante y configuración sellada por fold.

**Restricciones:** sin datos personales (ni siquiera con hash), sin pagos reales, sin anuncios reales y sin contacto con clientes.

**Puerta de salida:** H9 aceptada según sus criterios: WAPE ≤ 0.9 × el ingenuo en 4 de 6 folds, cobertura al 80 % dentro de [70, 90] % y ningún fold por encima de 2× el ingenuo. Si se rechaza, se vuelve a la Fase 3 con el diagnóstico.

**Esfuerzo:** 9A, 2–3 semanas-persona. 9B, 7–12 semanas-persona sumando legal, comercio y modelo.

---

## Fase 6 · Piloto comercial supervisado

**Objetivo.** Usar el simulador como **herramienta de apoyo a decisiones** de un comercio real, bajo supervisión humana y sin automatización de gasto.

**Etapas:**
1. **Modo sombra (4–8 semanas).** El simulador recomienda y nadie ejecuta las recomendaciones. Se compara lo recomendado con lo que el comercio hizo y con el resultado observado.
2. **Experimentos reales acotados.** Solo con aprobación por escrito del comercio y de la autoridad del proyecto. Pruebas A/B o *holdouts* de precio o de promoción, con presupuesto y límites de pérdida definidos de antemano. **Cada acción la ejecuta una persona**, nunca un agente.
3. **Criterios de suspensión inmediata:**
   - error predictivo por encima del umbral de la Fase 5;
   - cualquier incidente de privacidad;
   - pérdida por encima del límite.

**Restricciones permanentes:**
- Los agentes **nunca** ejecutan compras, pagos ni campañas reales.
- Los datos del comercio nunca entran en la cadena pública ni en `runs/`.

**Puerta de salida.** Esta puerta decide si el sistema pasa a ser una "herramienta confiable":
- Dictamen favorable en el modo sombra, con la calidad de las recomendaciones medida por *regret* frente a la alternativa ejecutada. Ese dictamen debe ser de **revisores humanos externos**: un estadístico, un economista y un especialista en seguridad, ajenos a la construcción (CM-5 del dictamen). Un comité formado solo por instancias de un modelo de lenguaje no basta.
- Cero incidentes de privacidad.
- Error predictivo dentro de los umbrales en datos fuera del periodo de calibración.

---

## Vista resumida

| Fase | Se puede empezar | Depende de | Puerta (resumen) |
|---|---|---|---|
| 0 Contención | Ya | — | Docs corregidos, tag firmado, decisión sobre la semilla |
| 1 Inmediatas | Tras la fase 0 | 0 | Pruebas de fallo y aislamiento en CI con Linux y macOS |
| 2 Estadística | Tras 1A (1B en paralelo); E0.4 tras 1C | 1A; 1C para E0.4 | E0 publicado y regla de victoria decidida por una persona |
| 3 Realismo | Tras la fase 2 | 2 | Mecanismos con neutralidad y experimentos con IC |
| 4 Híbridos | Tras 1B, 1C y 2 | 1B, 1C, 2 | Casete al 100 % y H6 resuelta |
| 5 Datos reales | 9A tras la fase 2; 9B tras 3 y legal | 2, 3, legal | H9 aceptada |
| 6 Piloto | Tras la fase 5 | 5 | Modo sombra favorable |
