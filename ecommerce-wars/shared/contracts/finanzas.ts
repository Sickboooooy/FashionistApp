import { z } from 'zod';

const Entero = z.number().int();

export const IndicadoresSchema = z.strictObject({
  ventasBrutas: Entero,
  descuentos: Entero,
  cancelaciones: Entero,
  devoluciones: Entero,
  ventasNetas: Entero,
  ingresosEnvio: Entero,
  costoVentas: Entero,
  mermas: Entero,
  marketing: Entero,
  logistica: Entero,
  comisiones: Entero,
  operacion: Entero,
  almacenaje: Entero,
  fichas: Entero,
  margenContribucion: Entero,
  utilidadOperativa: Entero,
});

/** Reporte que el agente de Finanzas entrega al cierre; el auditor lo concilia contra los eventos. */
export const ReporteFinancieroSchema = z.strictObject({
  empresa: z.enum(['alfa', 'omega']),
  ronda: z.number().int().positive(),
  indicadores: IndicadoresSchema,
  saldos: z.strictObject({
    caja: Entero,
    inventario: Entero,
    inventarioTransito: Entero,
    pasivo: Entero,
    capital: Entero,
  }),
  asientos: z.number().int().nonnegative(),
  balanceado: z.boolean(),
  hashLibro: z.string().regex(/^[0-9a-f]{64}$/),
  alertas: z.array(z.string().max(500)).max(50),
});

export type ReporteFinanciero = z.infer<typeof ReporteFinancieroSchema>;

/** El libro mayor lo escribe un agente: se valida antes de copiarlo a la evidencia o auditarlo. */
export const LibroMayorSchema = z.strictObject({
  empresa: z.enum(['alfa', 'omega']),
  asientos: z
    .array(
      z.strictObject({
        id: z.string().max(40),
        ronda: Entero.nonnegative(),
        dia: Entero.nonnegative(),
        seqEvento: Entero.nonnegative().nullable(),
        tipoEvento: z.string().max(40),
        movimientos: z
          .array(z.strictObject({ cuenta: z.string().regex(/^\d{4}$/), debe: Entero.nonnegative(), haber: Entero.nonnegative() }))
          .max(20),
      }),
    )
    .max(500_000),
});
