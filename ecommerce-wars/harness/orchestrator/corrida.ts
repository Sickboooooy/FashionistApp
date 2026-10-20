import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';
import { indexarConfig, type ConfigIndexada } from '../../shared/config.ts';
import { sha256 } from '../../shared/hash.ts';
import { enCorrida, RELATIVAS, rutaCandado, type Rutas } from '../permissions/rutas.ts';

/** Metadatos de una corrida. `creadaEn` es tiempo real: nunca entra en un hash. */
export const CorridaSchema = z.strictObject({
  id: z.string().min(1).max(80),
  modo: z.enum(['prueba', 'oficial']),
  semilla: z.number().int().nonnegative(),
  semillaConfig: z.number().int().nonnegative(),
  hashConfig: z.string().regex(/^[0-9a-f]{64}$/),
  versionReglas: z.string(),
  autorizadoPor: z.string().max(120).nullable(),
  aislamiento: z.enum(['proceso', 'en-proceso']),
  creadaEn: z.string(),
});
export type Corrida = z.infer<typeof CorridaSchema>;

/** Candado de reglas: la configuración vigente sólo vale si su hash fue sellado por una persona. */
export const CandadoSchema = z.strictObject({
  hashConfig: z.string().regex(/^[0-9a-f]{64}$/),
  versionReglas: z.string(),
  autorizadoPor: z.string().min(1).max(120),
  selladoEn: z.string(),
});
export type Candado = z.infer<typeof CandadoSchema>;

/** Resultado determinista de las pruebas críticas (sin duraciones ni fechas). */
export const PreflightSchema = z.strictObject({
  aprobado: z.boolean(),
  total: z.number().int().nonnegative(),
  aprobadas: z.number().int().nonnegative(),
  fallidas: z.number().int().nonnegative(),
  archivos: z.array(z.string()),
  hashConfig: z.string(),
  /** Hash del código probado (agents, harness, shared, simulation, tests); null en preflights sintéticos. */
  hashCodigo: z.string().regex(/^[0-9a-f]{64}$/).nullable().optional(),
  sintetico: z.boolean(),
});
export type Preflight = z.infer<typeof PreflightSchema>;

export const DIRECTORIOS_CODIGO = ['agents', 'harness', 'shared', 'simulation', 'tests'] as const;

/** Huella del código que se ejecuta y se prueba: si cambia tras el preflight, las rondas no son válidas. */
export function hashArbolCodigo(raizCodigo: string): string {
  const archivos: string[] = [];
  const recorrer = (dir: string) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, d.name);
      if (d.isDirectory()) recorrer(ruta);
      else if (/\.(ts|json)$/.test(d.name)) archivos.push(ruta);
    }
  };
  for (const d of DIRECTORIOS_CODIGO) if (existsSync(join(raizCodigo, d))) recorrer(join(raizCodigo, d));
  return sha256(
    archivos
      .map((a) => relative(raizCodigo, a))
      .sort()
      .map((rel) => `${rel}:${sha256(readFileSync(join(raizCodigo, rel)))}`)
      .join('\n'),
  );
}

export function leerJsonSiExiste<T>(ruta: string, esquema: z.ZodType<T>): T | null {
  return existsSync(ruta) ? esquema.parse(JSON.parse(readFileSync(ruta, 'utf8'))) : null;
}

export const leerCorrida = (rutas: Rutas): Corrida | null => leerJsonSiExiste(enCorrida(rutas, RELATIVAS.corrida), CorridaSchema);
export const leerCandado = (rutas: Rutas): Candado | null => leerJsonSiExiste(rutaCandado(rutas), CandadoSchema);
export const leerPreflight = (rutas: Rutas): Preflight | null => leerJsonSiExiste(enCorrida(rutas, RELATIVAS.preflight), PreflightSchema);

/** Configuración efectiva de la corrida: igual a la sellada salvo la semilla (sólo en modo prueba). */
export function configDeCorrida(base: ConfigIndexada, corrida: Pick<Corrida, 'semilla'>): ConfigIndexada {
  if (corrida.semilla === base.cfg.semilla) return base;
  return indexarConfig(structuredClone({ ...base.cfg, semilla: corrida.semilla }), base.hash);
}

/** Preflight declarado por un test: válido sólo en corridas de prueba. */
export function preflightSintetico(hashConfig: string): Preflight {
  return { aprobado: true, total: 0, aprobadas: 0, fallidas: 0, archivos: [], hashConfig, hashCodigo: null, sintetico: true };
}
