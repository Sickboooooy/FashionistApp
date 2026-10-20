import type { EmpresaId } from '../../shared/types/dominio.ts';
import type { AlmacenRestringido } from '../permissions/almacen.ts';
import { RELATIVAS } from '../permissions/rutas.ts';

/**
 * Telemetría de supervisión (apartado 16.6): latencia, CPU y memoria por decisión,
 * errores y recuperaciones. Es tiempo real del ordenador, por eso vive fuera de la
 * cadena de hashes y fuera de los expedientes: no afecta el determinismo.
 */
export interface RegistroTelemetria {
  momento: string;
  tipo: 'agente' | 'juez' | 'fase';
  ronda: number;
  empresa: EmpresaId | null;
  operacion: string;
  ms: number;
  cpuUsuarioUs: number;
  cpuSistemaUs: number;
  memoriaMaxKb: number;
  ok: boolean;
  error: string | null;
  recuperacion: string | null;
  /** Si el sistema operativo negó la red al proceso (sólo agentes y Juez). */
  redBloqueada?: boolean;
}

export class Telemetria {
  readonly #almacen: AlmacenRestringido;

  constructor(almacen: AlmacenRestringido) {
    this.#almacen = almacen;
  }

  registrar(registro: Omit<RegistroTelemetria, 'momento'>): void {
    const linea: RegistroTelemetria = { momento: new Date().toISOString(), ...registro, ms: Math.round(registro.ms * 100) / 100 };
    this.#almacen.anexarTexto(`${RELATIVAS.telemetria}/registros.jsonl`, `${JSON.stringify(linea)}\n`);
  }
}

export interface ResumenTelemetria {
  registros: number;
  errores: number;
  recuperaciones: number;
  porOperacion: Record<string, { n: number; msMedio: number; msMax: number; cpuMedioMs: number; memoriaMaxKb: number; errores: number }>;
}

export function resumirTelemetria(registros: readonly RegistroTelemetria[]): ResumenTelemetria {
  const porOperacion: ResumenTelemetria['porOperacion'] = {};
  for (const r of registros) {
    const clave = `${r.tipo}:${r.operacion}`;
    const actual = porOperacion[clave] ?? { n: 0, msMedio: 0, msMax: 0, cpuMedioMs: 0, memoriaMaxKb: 0, errores: 0 };
    const n = actual.n + 1;
    porOperacion[clave] = {
      n,
      msMedio: (actual.msMedio * actual.n + r.ms) / n,
      msMax: Math.max(actual.msMax, r.ms),
      cpuMedioMs: (actual.cpuMedioMs * actual.n + (r.cpuUsuarioUs + r.cpuSistemaUs) / 1000) / n,
      memoriaMaxKb: Math.max(actual.memoriaMaxKb, r.memoriaMaxKb),
      errores: actual.errores + (r.ok ? 0 : 1),
    };
  }
  return {
    registros: registros.length,
    errores: registros.filter((r) => !r.ok).length,
    recuperaciones: registros.filter((r) => r.recuperacion !== null).length,
    porOperacion,
  };
}
