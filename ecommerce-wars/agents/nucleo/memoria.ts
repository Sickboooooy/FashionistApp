import { z } from 'zod';
import type { Config } from '../../shared/config.ts';
import type { Perfil } from './perfil.ts';

const Participacion = z.number().min(0).max(1);

/**
 * Memoria operativa de la empresa (data/private/<empresa>/memoria.json). El
 * aprendizaje sólo escribe aquí: puede cambiar decisiones futuras, nunca
 * resultados históricos ni reglas.
 */
export const MemoriaSchema = z.strictObject({
  version: z.literal(1),
  empresa: z.enum(['alfa', 'omega']),
  rondasAnalizadas: z.number().int().nonnegative(),
  demandaSku: z.record(z.string(), z.number().nonnegative()),
  multiplicadorPrecio: z.record(z.string(), z.number().positive()),
  brazos: z.record(
    z.string(),
    z.strictObject({
      gasto: z.number().nonnegative(),
      ingresos: z.number().nonnegative(),
      pedidos: z.number().int().nonnegative(),
      rondas: z.number().int().nonnegative(),
    }),
  ),
  participaciones: z.strictObject({ inventario: Participacion, marketing: Participacion, fichas: Participacion }),
  coberturaSemanas: z.number().positive(),
  ultimaVentaNeta: z.number().int(),
  lecciones: z.array(z.strictObject({ ronda: z.number().int(), texto: z.string().max(400) })).max(40),
});

export type Memoria = z.infer<typeof MemoriaSchema>;

export const RUTA_MEMORIA = (empresa: string): string => `data/private/${empresa}/memoria.json`;

export function memoriaInicial(perfil: Perfil, cfg: Config): Memoria {
  return {
    version: 1,
    empresa: perfil.empresa,
    rondasAnalizadas: 0,
    demandaSku: Object.fromEntries(cfg.productos.map((p) => [p.sku, perfil.demandaInicialSemanal[p.sku] ?? 10])),
    multiplicadorPrecio: Object.fromEntries(cfg.productos.map((p) => [p.sku, 1])),
    brazos: {},
    participaciones: { ...perfil.participaciones },
    coberturaSemanas: perfil.coberturaSemanas,
    ultimaVentaNeta: 0,
    lecciones: [],
  };
}

export function claveBrazo(canal: string, segmento: string, angulo: string): string {
  return `${canal}|${segmento}|${angulo}`;
}
