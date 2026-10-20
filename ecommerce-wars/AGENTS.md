# AGENTS.md — E-COMMERCE WARS
## Laboratorio de competencia comercial multiagente
Versión: 1.0
Idioma: Español
Estado: EXPERIMENTAL / SIMULACIÓN

> Especificación original del experimento. La implementación y sus decisiones
> técnicas están en [README.md](README.md), [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
> y [docs/BLOQUEOS.md](docs/BLOQUEOS.md).

# 1. MISIÓN

Construir y ejecutar un experimento reproducible de comercio
electrónico donde dos empresas de ropa, ALFA y OMEGA,
compitan en un mercado económico enteramente simulado.

Cada empresa tendrá:
- Una tienda web independiente y funcional.
- Un presupuesto inicial de 100,000 MXN ficticios.
- Un catálogo comparable de ropa y accesorios.
- Inventarios, precios y proveedores sintéticos.
- Agentes autónomos especializados.
- Estrategias comerciales y campañas independientes.
- Contabilidad, métricas y memoria de decisiones.

Un JUEZ independiente supervisará la competencia,
verificará evidencias y determinará al ganador.

OBJETIVO:
La primera empresa que alcance ventas netas iguales
o superiores al doble de las de su competidor en un
periodo comercial válido será candidata a ganadora.

No se permiten transacciones económicas reales.

# 2. REGLAS INMUTABLES

1. Las dos empresas comienzan con idéntico capital.
2. Ninguna empresa puede modificar las reglas del mercado.
3. Los agentes de una empresa no pueden leer información
   privada ni instrucciones internas de su competidora.
4. Toda decisión económica debe generar un registro.
5. El Juez no puede intervenir en decisiones comerciales.
6. Está prohibido fabricar ventas, clientes o conversiones.
7. El motor de mercado debe usar reglas transparentes.
8. Las operaciones deben ser deterministas con semilla fija.
9. Los cambios en reglas requieren autorización humana.
10. Los agentes nunca deben usar dinero real, contratar
    servicios de pago ni publicar anuncios reales.
11. Ningún agente puede desplegar públicamente sin permiso.
12. El Juez tiene autoridad para suspender una ronda inválida.

# 3. ESTRUCTURA DEL REPOSITORIO

```
ecommerce-wars/
  AGENTS.md
  README.md
  package.json
  apps/
    alfa/
    omega/
    tribunal/
  agents/
    alfa/
      director.md
      compras.md
      marketing.md
      ventas.md
      finanzas.md
    omega/
      director.md
      compras.md
      marketing.md
      ventas.md
      finanzas.md
    juez/
      AGENTS.md
      juez.md
      auditor.md
      verificador.md
  harness/
    orchestrator/
    scheduler/
    evaluator/
    event-bus/
    permissions/
  simulation/
    market/
    customers/
    suppliers/
    inventory/
    economics/
    scenarios/
  shared/
    schemas/
    types/
    contracts/
  data/
    public/
    private/
      alfa/
      omega/
  reports/
    rounds/
    verdicts/
    evidence/
  tests/
    unit/
    integration/
    adversarial/
  config/
    experiment.json
```

Los directorios podrán ajustarse por necesidades técnicas
justificadas y documentadas.

# 4. AGENTES DE CADA EMPRESA

## DIRECTOR GENERAL

Responsable de:
- Definir estrategia comercial.
- Asignar presupuesto.
- Coordinar a los demás agentes.
- Evaluar resultados por periodo.
- Proponer cambios para mejorar rentabilidad.

No puede alterar registros históricos ni reglas.

## AGENTE DE COMPRAS

Responsable de:
- Analizar demanda estimada.
- Seleccionar proveedores sintéticos.
- Comprar inventario ficticio.
- Gestionar costos, existencias y reposiciones.
- Evitar inventario excesivo y quiebres de stock.

## AGENTE DE MARKETING

Responsable de:
- Crear campañas publicitarias simuladas.
- Seleccionar segmentos de clientes.
- Probar mensajes, promociones y creatividades.
- Gestionar presupuesto de adquisición.
- Evaluar CTR, CAC, ROAS y conversiones.

Cada empresa deberá desarrollar campañas propias.
No se permitirá copiar información privada del rival.

## AGENTE DE VENTAS

Responsable de:
- Optimizar fichas de productos.
- Proponer precios y descuentos.
- Diseñar promociones y estrategias de conversión.
- Mejorar la experiencia de compra.
- Analizar abandono de carrito y recurrencia.

## AGENTE FINANCIERO

Responsable de:
- Mantener libro mayor simulado.
- Registrar ingresos, costos y gastos.
- Calcular utilidad, margen y flujo de efectivo.
- Advertir sobre insolvencia.
- Verificar disponibilidad presupuestaria.

Todas las operaciones deben ser conciliables.

# 5. JUEZ DEL EXPERIMENTO

El Juez será independiente de ambas empresas.

Funciones:
- Supervisar la igualdad de condiciones iniciales.
- Verificar integridad de los datos.
- Auditar transacciones.
- Detectar manipulación de resultados.
- Validar el cierre de cada periodo.
- Resolver incidentes conforme a reglas predefinidas.
- Emitir resoluciones motivadas y verificables.

El Juez no tendrá facultad para cambiar retroactivamente
los criterios de victoria.

Cada resolución contendrá:
- Identificador del expediente.
- Periodo examinado.
- Evidencias verificadas.
- Hechos acreditados.
- Reglas aplicadas.
- Incidencias detectadas.
- Resultado.
- Hash SHA-256 del expediente de evidencia.

Los hashes acreditan integridad del registro,
no la veracidad de los datos de origen.

# 6. ECONOMÍA SIMULADA

Capital inicial:
ALFA: 100,000 MXN
OMEGA: 100,000 MXN

Periodo estándar: 7 días simulados.

Ambas empresas reciben acceso al mismo universo
de proveedores y categorías de productos.

El motor generará:
- Clientes sintéticos con preferencias diversas.
- Presupuestos de compra.
- Sensibilidad al precio.
- Demanda variable.
- Estacionalidad.
- Costos logísticos.
- Devoluciones.
- Competencia por atención.
- Respuestas probabilísticas a campañas.

El comportamiento del cliente no será controlado
por los agentes comerciales.

Las compras de inventario, ventas, devoluciones,
gastos de campaña y costos operativos se registrarán
en un libro mayor de partida doble o mecanismo
equivalente verificable.

# 7. CONDICIÓN DE VICTORIA

Una empresa podrá ganar cuando:

ventas_netas_A >= 2 * ventas_netas_B

O recíprocamente:

ventas_netas_B >= 2 * ventas_netas_A

CONDICIONES ADICIONALES:
- Ambas empresas completaron el mismo periodo.
- Existe una muestra mínima de 20 pedidos válidos
  para la empresa candidata.
- La empresa candidata registra al menos 10,000 MXN
  de ventas netas en el periodo.
- El margen de contribución de la candidata es positivo.
- No existen infracciones graves sin resolver.
- El Juez validó los registros y cálculos.

Ventas netas = ventas cobradas simuladas menos
descuentos, cancelaciones y devoluciones.

Si ambas empresas registran cero ventas, no hay ganador.

Si ninguna satisface las condiciones, comienza otra ronda.

El resultado es un ganador bajo las reglas del experimento,
no una demostración de superioridad comercial universal.

# 8. HARNESS DE ORQUESTACIÓN

Implementar un harness que:
1. Inicialice agentes y permisos.
2. Cargue configuración y semilla aleatoria.
3. Entregue información autorizada a cada agente.
4. Solicite decisiones estructuradas.
5. Valide presupuestos y restricciones.
6. Ejecute acciones en el simulador.
7. Registre eventos y resultados.
8. Actualice memoria operativa de cada empresa.
9. Evalúe desempeño al cierre del periodo.
10. Remita evidencia al Juez.

Cada agente deberá operar mediante contratos tipados.

Prohibido ejecutar acciones económicas directamente
desde texto libre sin validación previa.

# 9. INDEPENDENCIA Y SEGURIDAD

Separar físicamente y mediante permisos:
- Datos privados de ALFA.
- Datos privados de OMEGA.
- Estado del mercado.
- Evidencias judiciales.
- Configuración inmutable del experimento.

Los agentes comerciales no podrán escribir en:
- reports/verdicts/
- harness/evaluator/
- config/experiment.json

La información externa o generada por agentes debe
tratarse como entrada no confiable.

No usar credenciales reales ni datos personales reales.

# 10. APRENDIZAJE ENTRE RONDAS

Al concluir cada periodo:
- Evaluar las decisiones tomadas.
- Identificar errores y oportunidades.
- Calcular métricas de rendimiento.
- Actualizar estrategias comerciales.
- Conservar historial y justificaciones.

El aprendizaje podrá modificar decisiones futuras,
pero no los resultados históricos ni las reglas.

# 11. PRUEBAS OBLIGATORIAS

Crear pruebas para:
- Igualdad de capital inicial.
- Aislamiento entre competidores.
- Imposibilidad de gastar más del saldo.
- Control de inventarios.
- Conciliación contable.
- Cálculo de ventas netas.
- Criterios de victoria.
- Determinismo con semilla fija.
- Protección de evidencias.
- Intentos adversariales de manipulación del Juez.

Ninguna ronda será válida si fallan pruebas críticas.

# 12. INTERFAZ VISUAL

Crear tres aplicaciones:

ALFA:
Tienda funcional con catálogo, carrito,
checkout simulado, promociones y seguimiento.

OMEGA:
Tienda funcional independiente con los mismos
componentes comerciales esenciales, pero diseño
y estrategia diferenciados.

TRIBUNAL:
Panel de observación con:
- Capital disponible.
- Ventas netas.
- Pedidos.
- Inventarios.
- Campañas activas.
- Costos.
- Margen de contribución.
- Cronología de decisiones.
- Alertas de integridad.
- Resoluciones del Juez.

El tribunal debe permitir revisar rondas históricas.

# 13. ORDEN DE IMPLEMENTACIÓN

FASE 1: Definir reglas, esquemas y arquitectura.
FASE 2: Crear motor económico y pruebas.
FASE 3: Construir las dos tiendas.
FASE 4: Implementar agentes y permisos.
FASE 5: Integrar harness y registro de eventos.
FASE 6: Construir tribunal y auditoría.
FASE 7: Ejecutar simulaciones de prueba.
FASE 8: Corregir defectos y verificar reproducibilidad.
FASE 9: Iniciar torneo supervisado.

No iniciar la siguiente fase con errores críticos abiertos.

# 14. ENTREGABLES

- Dos tiendas operativas en entorno local.
- Harness funcional.
- Simulador económico.
- Agentes documentados.
- Tribunal con panel de métricas.
- Pruebas automatizadas.
- Expedientes verificables por ronda.
- README con instrucciones reproducibles.
- Reporte final del experimento.

# 15. INSTRUCCIÓN FINAL

Construir un sistema funcional, no una maqueta.

No declarar completada una funcionalidad que no
haya sido implementada y probada.

Si existe un bloqueo técnico, documentarlo.

El experimento debe permitir observar cómo los
agentes toman decisiones, compiten, fallan,
aprenden y son evaluados por un Juez independiente.

PRINCIPIO RECTOR:
Ningún resultado sin evidencia.
Ninguna victoria sin verificación.

# 16. E-COMMERCE WAR ROOM — DASHBOARD EN VIVO

OBJETIVO:
Crear un centro de monitoreo interactivo y persistente
que permita observar, comparar y auditar la competencia
entre ALFA y OMEGA mientras ocurre.

## 16.1. Métricas en tiempo real

Mostrar por empresa:
- Ventas brutas y netas.
- Pedidos válidos y cancelados.
- Conversión y ticket promedio.
- Margen de contribución y utilidad.
- Presupuesto disponible.
- Inventario y productos agotados.
- CAC, ROAS y rendimiento de campañas.
- Participación en el mercado simulado.
- Evolución de ventas por periodo.

Actualizar las vistas automáticamente con cada evento
confirmado por el motor de simulación.

## 16.2. Observatorio de estrategias

Registrar para cada decisión:
- Agente responsable.
- Empresa.
- Fecha y tiempo lógico de simulación.
- Estrategia propuesta.
- Hipótesis comercial.
- Presupuesto comprometido.
- Resultado observado.
- Diferencia respecto a la estrategia anterior.

Mostrar comparaciones entre estrategias sin revelar
información privada a los agentes competidores.

El observador humano podrá ver la información completa
desde una vista privilegiada y protegida.

## 16.3. Motor de eventos

Implementar una arquitectura basada en eventos.

Eventos mínimos:
- ROUND_STARTED
- INVENTORY_PURCHASED
- PRICE_CHANGED
- CAMPAIGN_STARTED
- CAMPAIGN_STOPPED
- ORDER_CREATED
- ORDER_PAID_SIMULATED
- ORDER_CANCELLED
- ORDER_REFUNDED
- STRATEGY_CHANGED
- AGENT_DECISION_RECORDED
- ROUND_CLOSED
- JUDGE_VERDICT

Usar Server-Sent Events (SSE) o WebSocket para
actualizar el dashboard sin recargar la página.

Mantener secuencias numeradas y permitir
reconexión sin pérdida de eventos.

## 16.4. Tribunal en vivo

El Juez dispondrá de:
- Comparador de ventas y márgenes.
- Cronología de decisiones.
- Alertas de irregularidades.
- Estado de pruebas críticas.
- Expedientes por ronda.
- Evidencias y hashes SHA-256.
- Explicación verificable de cada veredicto.

El dashboard no podrá modificar sentencias ni
registros económicos históricos.

## 16.5. Simulación y velocidad

Permitir:
- Pausar y reanudar el mercado.
- Ejecutar un día simulado.
- Ejecutar una semana simulada.
- Acelerar la simulación.
- Reproducir rondas anteriores.
- Reiniciar escenarios con semilla controlada.

El tiempo de simulación será independiente del
tiempo real del ordenador.

## 16.6. Supervisión y evaluación

Medir:
- Calidad de decisiones de cada agente.
- Cumplimiento de restricciones.
- Coste computacional por decisión.
- Latencia del harness.
- Número de errores y recuperaciones.
- Rendimiento económico por estrategia.

Comparar estrategias usando escenarios repetibles
y semillas controladas.

## 16.7. Criterios de aceptación

El módulo estará terminado cuando:
1. Ambas tiendas emitan eventos verificables.
2. El dashboard refleje cada evento confirmado.
3. Los indicadores coincidan con el libro mayor.
4. Se puedan consultar estrategias históricas.
5. El Juez detecte y reporte inconsistencias.
6. El sistema soporte reconexiones y reproducción.
7. Las pruebas automatizadas críticas sean exitosas.

No utilizar datos reales de clientes ni pagos reales.
