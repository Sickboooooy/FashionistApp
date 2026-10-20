# E-COMMERCE WARS

Laboratorio de competencia comercial multiagente. Dos tiendas de ropa sintéticas, **ALFA**
(Atelier ALFA, calidad curada) y **OMEGA** (OMEGA Pulso, volumen y tendencia), compiten en
un mercado enteramente simulado, cada una con 100,000 MXN ficticios y cinco agentes autónomos
(Director, Compras, Marketing, Ventas, Finanzas). Un **Juez** independiente audita cada semana
simulada y emite resoluciones selladas con SHA-256. Un **War Room** permite observar la
competencia en vivo.

**No hay dinero, clientes, anuncios ni pagos reales.** Todo corre en `127.0.0.1`.

- Especificación: [`AGENTS.md`](AGENTS.md)
- Arquitectura: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) · API local: [`docs/API.md`](docs/API.md)
- Bloqueos y limitaciones: [`docs/BLOQUEOS.md`](docs/BLOQUEOS.md)
- Agentes: [`agents/alfa/`](agents/alfa/), [`agents/omega/`](agents/omega/), [`agents/juez/`](agents/juez/)

## Requisitos

- Node.js **≥ 23.6** (probado con 24.14). Ejecuta TypeScript de forma nativa: no hay paso de build.
- macOS o Linux. Sin servicios externos ni credenciales.

```bash
cd ecommerce-wars
npm install
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Las 93 pruebas (unitarias, integración, adversariales) |
| `npm run test:cobertura` | Pruebas con cobertura (umbral 80 %) |
| `npm run typecheck` | Verificación de tipos |
| `npm run preflight -- --corrida <dir>` | Pruebas críticas → `reports/evidence/preflight.json` de esa corrida |
| `npm run torneo` | Torneo de **prueba** sin interfaz en `runs/prueba-base/` (corre el preflight si falta) |
| `npm run torneo -- --semilla 7` | Otro escenario reproducible en `runs/prueba-7/` |
| `npm run verificar -- --corrida runs/prueba-base` | Verificación independiente: hashes, cadena, continuidad, reejecución determinista de cada ronda, auditoría y sentencias |
| `npm run servir -- --semilla 7` | War Room + tiendas en vivo sobre `runs/prueba-7/` (inicia en pausa) |
| `npm run reproducibilidad` | Corre el torneo dos veces con la misma semilla y una con otra; compara hashes |
| `npm run banco -- --semillas 10 --rondas 12` | Compara estrategias en escenarios repetibles → `reports/banco/` |
| `npm run sellar-reglas -- --autorizado-por "Nombre"` | Sella `config/experiment.json` (autorización humana de reglas) |

## War Room y tiendas

```bash
npm run servir -- --semilla 7 --ms-por-dia 1500
```

El lanzador imprime cuatro direcciones:

- War Room público `http://127.0.0.1:4100` — resultados públicos, sentencias, escaparates, integridad.
- War Room privilegiado `http://127.0.0.1:4100/#acceso=<token>` — métricas completas, observatorio de estrategias, tribunal, controles (pausar, un día, una semana, velocidad, reiniciar con semilla), reproducción de rondas, supervisión. El token se genera en cada arranque y sólo vive en memoria.
- Tienda ALFA `http://127.0.0.1:4101` y tienda OMEGA `http://127.0.0.1:4102` — catálogo, carrito, checkout simulado (sin datos de pago), promociones, seguimiento y eventos verificables. Los pedidos hechos ahí son demostraciones y no participan en la competencia.

La simulación inicia en pausa. El tiempo simulado es independiente del reloj: pausar o
acelerar no cambia ningún resultado. Cada proceso corre con `node --permission`: el War Room
no puede escribir, los agentes de una empresa no pueden leer lo de la otra y sólo el Juez
escribe sentencias.

## Torneo oficial (fase 9, supervisado)

El torneo oficial corre en la raíz del proyecto (`data/`, `reports/`), con la semilla sellada,
y exige que una persona lo autorice:

```bash
# 1. Revisar config/experiment.json y sellarlo con tu nombre (reemplaza el sello de construcción)
npm run sellar-reglas -- --autorizado-por "Nombre Apellido"
# 2. Ejecutarlo en vivo desde el War Room…
npm run servir -- --modo oficial --autorizado-por "Nombre Apellido"
#    …o sin interfaz
npm run torneo -- --modo oficial --autorizado-por "Nombre Apellido"
# 3. Verificarlo
npm run verificar -- --corrida .
```

El torneo termina cuando el Juez valida a un ganador (ventas netas ≥ 2 × las de la rival,
≥ 20 pedidos válidos, ≥ 10,000 MXN, margen de contribución positivo, sin infracciones
graves, registros validados), cuando suspende una ronda por incidencias críticas o al
cumplirse 12 rondas. El reporte final queda en `reports/reporte-final.md`.

## Qué produce una corrida

```
<corrida>/
  corrida.json                    modo, semilla, hash de reglas, autorización
  data/public/                    escaparates de ambas tiendas, resultados públicos, reglas del mercado
  data/private/<empresa>/         eventos propios, decisiones, memoria, libro mayor, reportes, historial
  reports/evidence/diario.jsonl   diario único encadenado con SHA-256
  reports/evidence/ronda-NN/      expediente de la ronda + manifiesto
  reports/verdicts/ronda-NN.*     resolución del Juez (JSON + Markdown)
  reports/rounds/ronda-NN.json    resumen para el tribunal (calidad de decisiones, conciliación, estrategia)
  reports/telemetria/             latencia, CPU y memoria por decisión (fuera de la cadena de hashes)
  reports/reporte-final.md        reporte final del experimento
```

## Estado verificado

- 93/93 pruebas en verde; cobertura 94.8 % de líneas, 83.4 % de ramas.
- War Room en vivo probado de punta a punta (`npm run servir -- --semilla 7`): harness restringido, agentes y Juez sin red, controles por IPC; con la semilla 7 ALFA gana en la ronda 3 ($166,622 vs $77,336, todas las condiciones V1–V7).
- Revisión de seguridad independiente aplicada: red bloqueada para agentes y Juez en macOS (`sandbox-exec`), validación de todo lo que escriben los agentes (libro mayor, respuestas de proceso), historial del harness fuera de su alcance, invariantes del modo oficial y huella del código probado, sentencia pública redactada, validación de `Host`. Ver [`docs/BLOQUEOS.md`](docs/BLOQUEOS.md).
- Simulación de prueba de 12 rondas en procesos aislados con el código final (`runs/prueba-base`): 20,603 eventos sellados, `npm run verificar` superado (incluye la reejecución determinista de las 12 rondas). Sin ganador: ninguna empresa alcanzó el doble de ventas de la otra.
- Reproducibilidad: misma semilla → diario, expedientes y sentencias idénticos; otra semilla → historia distinta.
- Banco de 10 semillas × 12 rondas: competencia pareja (ventas netas medias ALFA $188.5k vs OMEGA $151.5k por ronda); 1 victoria de ALFA.

> El resultado es un ganador bajo las reglas del experimento, no una demostración de
> superioridad comercial universal. Los hashes acreditan la integridad del registro, no la
> veracidad de los datos de origen.
