import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { hashCanonico, sha256 } from '../../shared/hash.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import type { PlanAplicado } from '../../simulation/market/estado.ts';
import type { AlmacenRestringido } from '../permissions/almacen.ts';
import { enCorrida, RELATIVAS, type Rutas } from '../permissions/rutas.ts';
import type { Rechazo } from './validacion.ts';

/*
 * Expediente de evidencia por ronda (reports/evidence/ronda-NN/). El manifiesto
 * lista cada archivo con su SHA-256 y se sella con el hash canónico de sí mismo,
 * encadenado al expediente anterior. Los hashes acreditan integridad del
 * registro, no la veracidad de los datos de origen.
 */

const Hex = z.string().regex(/^[0-9a-f]{64}$/);

export const ArchivoExpedienteSchema = z.strictObject({ ruta: z.string(), sha256: Hex, bytes: z.number().int().nonnegative() });
export type ArchivoExpediente = z.infer<typeof ArchivoExpedienteSchema>;

export const ManifiestoSchema = z.strictObject({
  expediente: z.string(),
  ronda: z.number().int().positive(),
  modo: z.enum(['prueba', 'oficial']),
  versionReglas: z.string(),
  hashConfig: Hex,
  semilla: z.number().int().nonnegative(),
  hashPreflight: Hex,
  hashExpedienteAnterior: Hex.nullable(),
  seqInicio: z.number().int().nonnegative(),
  seqFin: z.number().int().nonnegative(),
  prevHashInicio: Hex,
  hashFin: Hex,
  archivos: z.array(ArchivoExpedienteSchema),
  hashExpediente: Hex,
});
export type Manifiesto = z.infer<typeof ManifiestoSchema>;

export interface PlanRonda {
  propuesto: unknown;
  aplicado: PlanAplicado;
  rechazos: Rechazo[];
}
export type PlanesRonda = Record<EmpresaId, PlanRonda>;

export const ARCHIVOS = {
  estadoInicial: 'estado-inicial.json',
  planes: 'planes.json',
  eventos: 'eventos.jsonl',
  estadoFinal: 'estado-final.json',
  libro: (e: EmpresaId) => `libros/${e}.json`,
  reporte: (e: EmpresaId) => `reportes/${e}.json`,
  resumen: 'resumen.json',
  manifiesto: 'manifiesto.json',
} as const;

export const nombreExpediente = (ronda: number): string => `EXP-R${String(ronda).padStart(2, '0')}`;

export function serializar(valor: unknown): string {
  return `${JSON.stringify(valor, null, 2)}\n`;
}

export function escribirEnExpediente(almacen: AlmacenRestringido, ronda: number, nombre: string, contenido: string): ArchivoExpediente {
  almacen.escribirTexto(`${RELATIVAS.expediente(ronda)}/${nombre}`, contenido);
  return { ruta: nombre, sha256: sha256(contenido), bytes: Buffer.byteLength(contenido) };
}

export function sellarManifiesto(datos: Omit<Manifiesto, 'hashExpediente'>): Manifiesto {
  return { ...datos, hashExpediente: hashCanonico(datos) };
}

export function hashManifiesto(m: Manifiesto): string {
  const { hashExpediente: _omitido, ...resto } = m;
  return hashCanonico(resto);
}

export function rutaEnExpediente(rutas: Rutas, ronda: number, nombre: string): string {
  return enCorrida(rutas, RELATIVAS.expediente(ronda), nombre);
}

export function leerDeExpediente(rutas: Rutas, ronda: number, nombre: string): string | null {
  const ruta = rutaEnExpediente(rutas, ronda, nombre);
  return existsSync(ruta) ? readFileSync(ruta, 'utf8') : null;
}

export function leerManifiesto(rutas: Rutas, ronda: number): Manifiesto | null {
  const crudo = leerDeExpediente(rutas, ronda, ARCHIVOS.manifiesto);
  return crudo === null ? null : ManifiestoSchema.parse(JSON.parse(crudo));
}
