import { z } from 'zod';

const Rango = z.tuple([z.number(), z.number()]).refine(([a, b]) => a <= b, { message: 'rango invertido' });
const Participacion = z.number().min(0).max(1);
const Centavos = z.number().int().nonnegative();

/** Instrucciones estratégicas privadas de una empresa (agents/<empresa>/perfil.json). */
export const PerfilSchema = z.strictObject({
  empresa: z.enum(['alfa', 'omega']),
  nombre: z.string().min(1).max(80),
  posicionamiento: z.string().min(1).max(300),
  multiplicadorPrecio: z.number().positive(),
  rangoMultiplicador: Rango,
  margenMinimoSobreCosto: z.number().min(1),
  seguirPrecioRival: z.boolean(),
  pesosProveedor: z.strictObject({ calidad: z.number(), costo: z.number(), velocidad: z.number() }),
  participaciones: z.strictObject({ inventario: Participacion, marketing: Participacion, fichas: Participacion }),
  limitesParticipacion: z.strictObject({ inventario: Rango, marketing: Rango, fichas: Rango }),
  coberturaSemanas: z.number().positive().max(6),
  demandaInicialSemanal: z.record(z.string(), z.number().nonnegative()),
  surtido: z.array(z.string()).min(1),
  segmentosObjetivo: z.array(z.string()).min(1),
  canalesPreferidos: z.array(z.string()).min(1),
  angulos: z.array(z.string()).min(1),
  brazosPorRonda: z.number().int().min(1).max(8),
  exploracion: Participacion,
  roasMinimo: z.number().positive(),
  promociones: z.strictObject({
    descuentoMax: z.number().int().min(0).max(95),
    descuentoLiquidacion: z.number().int().min(0).max(95),
    diasPromocion: z.array(z.number().int().positive()).min(1),
    envioGratisDesde: Centavos,
    costoEnvio: Centavos,
    compraMultiple: z.strictObject({ minUnidades: z.number().int().min(2), pct: z.number().int().min(1).max(95) }).nullable(),
    promocionSemanal: z.boolean(),
  }),
  fichasObjetivo: Participacion,
  mensajes: z.record(z.string(), z.string().max(140)),
});

export type Perfil = z.infer<typeof PerfilSchema>;
