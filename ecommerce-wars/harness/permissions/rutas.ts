import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Dos raíces: el código (inmutable durante la corrida) y la corrida (data/ y
 * reports/). La corrida oficial vive en la raíz del proyecto; las corridas de
 * prueba creadas desde el War Room viven en runs/<id>/ con la misma estructura.
 */
export interface Rutas {
  readonly raizCodigo: string;
  readonly raizCorrida: string;
}

/**
 * Raíz del proyecto. Se resuelve bajo demanda: dentro de un proceso aislado la
 * raíz misma no es legible y un realpath al importar el módulo fallaría.
 */
export function raizCodigoPorDefecto(): string {
  return realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'));
}

export function crearRutas(raizCorrida?: string, raizCodigo?: string): Rutas {
  const codigo = raizCodigo ?? raizCodigoPorDefecto();
  const corrida = raizCorrida ?? codigo;
  if (!existsSync(corrida)) mkdirSync(corrida, { recursive: true });
  return Object.freeze({ raizCodigo: realpathSync(codigo), raizCorrida: realpathSync(corrida) });
}

/**
 * Directorios de una corrida. Deben existir ANTES de lanzar procesos aislados:
 * `--allow-fs-write=<dir>` sobre un directorio inexistente al arrancar no
 * autoriza crear archivos dentro (comportamiento del modelo de permisos de Node).
 */
export const DIRECTORIOS_CORRIDA = [
  'data/public/escaparates',
  'data/private/alfa/tienda',
  'data/private/omega/tienda',
  'data/harness/alfa',
  'data/harness/omega',
  'reports/evidence',
  'reports/rounds',
  'reports/verdicts',
  'reports/telemetria',
] as const;

export function prepararEstructura(r: Rutas): void {
  for (const d of DIRECTORIOS_CORRIDA) {
    const ruta = join(r.raizCorrida, d);
    if (!existsSync(ruta)) mkdirSync(ruta, { recursive: true });
  }
}

/** Rutas ya resueltas por el proceso padre; no toca el sistema de archivos. */
export function rutasDadas(raizCorrida: string, raizCodigo: string): Rutas {
  return Object.freeze({ raizCodigo, raizCorrida });
}

export const enCodigo = (r: Rutas, ...partes: string[]): string => join(r.raizCodigo, ...partes);
export const enCorrida = (r: Rutas, ...partes: string[]): string => join(r.raizCorrida, ...partes);

export const rutaConfig = (r: Rutas): string => enCodigo(r, 'config', 'experiment.json');
export const rutaCandado = (r: Rutas): string => enCodigo(r, 'config', 'experiment.lock.json');

/** Rutas relativas a la raíz de la corrida. */
export const RELATIVAS = {
  corrida: 'corrida.json',
  diario: 'reports/evidence/diario.jsonl',
  preflight: 'reports/evidence/preflight.json',
  telemetria: 'reports/telemetria',
  resultadosPublicos: 'data/public/resultados.json',
  mercadoPublico: 'data/public/mercado.json',
  escaparate: (empresa: string) => `data/public/escaparates/${empresa}.json`,
  privado: (empresa: string, archivo: string) => `data/private/${empresa}/${archivo}`,
  /** Estado que el harness guarda por empresa y que ningún agente puede escribir. */
  historial: (empresa: string) => `data/harness/${empresa}/historial.json`,
  expediente: (ronda: number) => `reports/evidence/ronda-${String(ronda).padStart(2, '0')}`,
  resumenRonda: (ronda: number) => `reports/rounds/ronda-${String(ronda).padStart(2, '0')}.json`,
  veredicto: (ronda: number, ext: 'json' | 'md') => `reports/verdicts/ronda-${String(ronda).padStart(2, '0')}.${ext}`,
} as const;
