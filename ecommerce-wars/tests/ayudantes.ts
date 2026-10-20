import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cargarConfig, type ConfigIndexada } from '../shared/config.ts';
import { Controlador, type OpcionesControlador } from '../harness/orchestrator/controlador.ts';
import { preflightSintetico } from '../harness/orchestrator/corrida.ts';
import { crearRutas, raizCodigoPorDefecto, rutaConfig, type Rutas } from '../harness/permissions/rutas.ts';

export const RAIZ = raizCodigoPorDefecto();

let ciCache: ConfigIndexada | null = null;
export function config(): ConfigIndexada {
  ciCache ??= cargarConfig(rutaConfig(crearRutas(RAIZ, RAIZ)));
  return ciCache;
}

export interface CorridaTemporal {
  rutas: Rutas;
  limpiar(): void;
}

export function corridaTemporal(prefijo = 'ew-prueba-'): CorridaTemporal {
  const dir = mkdtempSync(join(tmpdir(), prefijo));
  return { rutas: crearRutas(dir, RAIZ), limpiar: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Controlador de prueba: en-proceso y con preflight sintético salvo que se indique otra cosa. */
export function controlador(rutas: Rutas, extra: Partial<OpcionesControlador> = {}): Promise<Controlador> {
  return Controlador.iniciar({
    rutas,
    modo: 'prueba',
    aislamiento: 'en-proceso',
    preflight: preflightSintetico(config().hash),
    ...extra,
  });
}

export const fixture = (nombre: string): string => join(RAIZ, 'tests', 'adversarial', 'fixtures', nombre);
