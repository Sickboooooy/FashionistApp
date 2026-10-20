import { z } from 'zod';

/**
 * Contratos tipados de decisión. Cada rol entrega un objeto estricto: cualquier
 * campo no declarado (p. ej. "ventasReportadas") hace fallar la validación.
 * Los límites que dependen del experimento (precios, MOQ, longitudes) se validan
 * después contra config/experiment.json en harness/orchestrator/validacion.ts.
 */
const Sku = z.string().regex(/^[A-Z]{3}-[A-Z]{3}$/);
const Id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/);
const Centavos = z.number().int().nonnegative();
const Dias = z.array(z.number().int().min(1).max(31)).min(1).max(31);
const Texto = z.string().max(4000);

/** Métricas observables al cierre de la ronda contra las que se contrasta cada hipótesis. */
export const METRICAS_HIPOTESIS = [
  'ventas_netas',
  'margen_contribucion',
  'utilidad_operativa',
  'roas',
  'tasa_servicio',
  'conversion',
  'ticket_promedio',
  'caja_final',
] as const;
export type MetricaHipotesis = (typeof METRICAS_HIPOTESIS)[number];

export const HipotesisSchema = z.strictObject({
  texto: z.string().min(1).max(1000),
  metrica: z.enum(METRICAS_HIPOTESIS),
  valor: z.number().finite(),
});

export const DecisionDirectorSchema = z.strictObject({
  hipotesis: HipotesisSchema,
  estrategia: z.string().min(1).max(4000),
  presupuesto: z.strictObject({
    inventario: Centavos,
    marketing: Centavos,
    fichas: Centavos,
    reserva: Centavos,
  }),
  prioridades: z.array(z.string().max(300)).max(12),
});

export const DecisionComprasSchema = z.strictObject({
  hipotesis: HipotesisSchema,
  ordenes: z
    .array(z.strictObject({ sku: Sku, proveedorId: z.string(), unidades: z.number().int().positive() }))
    .max(200),
  reposicion: z
    .array(
      z.strictObject({
        sku: Sku,
        proveedorId: z.string(),
        puntoReorden: z.number().int().nonnegative(),
        cantidad: z.number().int().positive(),
      }),
    )
    .max(100),
  justificacion: Texto,
});

export const CampanaSchema = z.strictObject({
  id: Id,
  canal: z.string(),
  segmento: z.string(),
  angulo: z.string(),
  mensaje: z.string().max(4000),
  presupuestoDiario: Centavos,
  dias: Dias,
});

export const DecisionMarketingSchema = z.strictObject({
  hipotesis: HipotesisSchema,
  campanas: z.array(CampanaSchema).max(100),
  justificacion: Texto,
});

export const PromocionSchema = z.discriminatedUnion('tipo', [
  z.strictObject({
    id: Id,
    tipo: z.literal('descuento'),
    alcance: z.enum(['sku', 'categoria', 'todo']),
    objetivo: z.string().nullable(),
    pct: z.number().int().min(1).max(95),
    dias: Dias,
  }),
  z.strictObject({
    id: Id,
    tipo: z.literal('compra_multiple'),
    minUnidades: z.number().int().min(2).max(10),
    pct: z.number().int().min(1).max(95),
    dias: Dias,
  }),
]);

export const DecisionVentasSchema = z.strictObject({
  hipotesis: HipotesisSchema,
  precios: z.array(z.strictObject({ sku: Sku, precio: Centavos.positive() })).max(200),
  listado: z.array(Sku).max(200),
  promociones: z.array(PromocionSchema).max(100),
  envio: z.strictObject({ costo: Centavos, gratisDesde: Centavos }),
  fichas: z.array(z.strictObject({ sku: Sku, pasos: z.number().int().min(1).max(10) })).max(100),
  justificacion: Texto,
});

export const AlertaFinancieraSchema = z.strictObject({
  nivel: z.enum(['info', 'advertencia', 'critica']),
  mensaje: z.string().max(500),
});

export const DecisionFinanzasSchema = z.strictObject({
  hipotesis: HipotesisSchema,
  aprobado: z.boolean(),
  proyeccionCajaFinal: z.number().int(),
  ajustes: z.array(z.string().max(500)).max(50),
  alertas: z.array(AlertaFinancieraSchema).max(50),
});

export const PlanPeriodoSchema = z.strictObject({
  empresa: z.enum(['alfa', 'omega']),
  ronda: z.number().int().positive(),
  director: DecisionDirectorSchema,
  compras: DecisionComprasSchema,
  marketing: DecisionMarketingSchema,
  ventas: DecisionVentasSchema,
  finanzas: DecisionFinanzasSchema,
});

export type Hipotesis = z.infer<typeof HipotesisSchema>;
export type DecisionDirector = z.infer<typeof DecisionDirectorSchema>;
export type DecisionCompras = z.infer<typeof DecisionComprasSchema>;
export type DecisionMarketing = z.infer<typeof DecisionMarketingSchema>;
export type DecisionVentas = z.infer<typeof DecisionVentasSchema>;
export type DecisionFinanzas = z.infer<typeof DecisionFinanzasSchema>;
export type AlertaFinanciera = z.infer<typeof AlertaFinancieraSchema>;
export type PlanPeriodo = z.infer<typeof PlanPeriodoSchema>;
