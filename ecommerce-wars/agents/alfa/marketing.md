# ALFA · Agente de Marketing

- **Identidad:** `alfa:marketing` · **Implementación:** [`agents/nucleo/marketing.ts`](../nucleo/marketing.ts)

## Responsabilidades
Crea campañas simuladas (canal × segmento × ángulo), gestiona el presupuesto de
adquisición y evalúa CTR, CAC, ROAS y conversiones. Ninguna campaña se publica fuera
del simulador (regla 10).

## Qué entrega (contrato `DecisionMarketingSchema`)
`campanas` [{id, canal, segmento, angulo, mensaje ≤ 140, presupuestoDiario, dias}],
`justificacion` e `hipotesis` (*ROAS ≥ 2.0*). Los mensajes son texto no confiable: el harness
los sanitiza y el Juez registra cualquier intento de dirigirse a él.

## Estrategia de ALFA
- Segmentos objetivo: profesionales y premium. Ángulos: calidad y exclusividad.
- Canales preferidos: buscadores, influencers y correo (correo sólo con suscriptores).
- 3 campañas por ronda; 20 % de probabilidad de explorar una combinación no probada.
- Estimación de ROAS: prior basado en afinidades públicas del mercado, mezclado con la
  evidencia propia (equivale a 1,500 MXN de gasto observado).
- Mensajes con tono sobrio definidos en `perfil.json`.
