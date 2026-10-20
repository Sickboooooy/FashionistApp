# Escenarios

El escenario del experimento (universo de productos, proveedores, segmentos de clientes,
canales, ángulos y parámetros de mercado) vive en [`config/experiment.json`](../../config/experiment.json),
no en este directorio: así queda bajo el mismo candado de reglas (`config/experiment.lock.json`)
y cualquier cambio exige autorización humana (regla 9).

Variantes reproducibles del mismo escenario se obtienen con la **semilla**, que cambia la
población de clientes, el ruido de demanda y las respuestas a campañas, pero no las reglas:

```bash
npm run torneo -- --semilla 7          # corrida de prueba en runs/prueba-7/
npm run banco -- --semillas 10         # 10 escenarios consecutivos y comparación de estrategias
```

Para un escenario con reglas distintas: editar `config/experiment.json`, volver a sellarlo con
`npm run sellar-reglas -- --autorizado-por "Nombre"` y ejecutar `npm test` (las pruebas críticas
deben seguir aprobando antes de cualquier ronda válida).
