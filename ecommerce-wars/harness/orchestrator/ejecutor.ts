import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import type { VistaEmpresa } from '../../shared/contracts/vista.ts';
import type { EmpresaId, RolComercial } from '../../shared/types/dominio.ts';
import type { EquipoEmpresa } from '../../agents/nucleo/equipo.ts';
import type { ResumenVeredicto } from '../evaluator/juez.ts';
import { AlmacenRestringido, type IntentoDenegado } from '../permissions/almacen.ts';
import { ejecutarAislado, type ResultadoAislado } from '../permissions/sandbox.ts';
import { enCodigo, type Rutas } from '../permissions/rutas.ts';

export type OperacionEquipo = 'decidir' | 'contabilizar' | 'aprender';

export interface Ejecutor {
  equipo<T>(empresa: EmpresaId, operacion: OperacionEquipo, ronda: number, vista?: VistaEmpresa): Promise<ResultadoAislado<T>>;
  juez(ronda: number): Promise<ResultadoAislado<ResumenVeredicto>>;
}

export interface OpcionesEjecutor {
  aislamiento: 'proceso' | 'en-proceso';
  modulos?: Partial<Record<EmpresaId, string>>;
  timeoutMs: number;
}

/**
 * Ejecuta equipos comerciales y al Juez. En modo 'proceso' (el del torneo) cada
 * llamada es un proceso Node con --permission; 'en-proceso' existe para pruebas
 * rápidas y conserva el control de acceso lógico del AlmacenRestringido.
 */
export function crearEjecutor(rutas: Rutas, opciones: OpcionesEjecutor): Ejecutor {
  const runner = enCodigo(rutas, 'agents', 'nucleo', 'runner.ts');
  const procesoJuez = enCodigo(rutas, 'harness', 'evaluator', 'proceso-juez.ts');

  if (opciones.aislamiento === 'proceso') {
    return {
      equipo: (empresa, operacion, ronda, vista) => {
        const modulo = opciones.modulos?.[empresa] ?? null;
        return ejecutarAislado({
          principal: `${empresa}:director`,
          rutas,
          script: runner,
          entrada: { operacion, empresa, ronda, raizCodigo: rutas.raizCodigo, raizCorrida: rutas.raizCorrida, modulo, vista },
          timeoutMs: opciones.timeoutMs,
          lecturaExtra: modulo ? [dirname(modulo)] : [],
        });
      },
      juez: (ronda) =>
        ejecutarAislado({
          principal: 'juez',
          rutas,
          script: procesoJuez,
          entrada: { raizCodigo: rutas.raizCodigo, raizCorrida: rutas.raizCorrida, ronda },
          timeoutMs: opciones.timeoutMs * 4,
        }),
    };
  }

  const medir = async <T>(fn: (registrar: (i: IntentoDenegado) => void) => Promise<T> | T): Promise<ResultadoAislado<T>> => {
    const incidentes: IntentoDenegado[] = [];
    const cpu = process.cpuUsage();
    const inicio = performance.now();
    try {
      const resultado = structuredClone(await fn((i) => incidentes.push(i)));
      const uso = process.cpuUsage(cpu);
      return {
        ok: true,
        resultado,
        incidentes,
        telemetria: { cpuUsuarioUs: uso.user, cpuSistemaUs: uso.system, memoriaMaxKb: process.resourceUsage().maxRSS },
        ms: performance.now() - inicio,
        codigoSalida: 0,
        stderr: '',
        redBloqueada: false,
      };
    } catch (error) {
      const uso = process.cpuUsage(cpu);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        incidentes,
        telemetria: { cpuUsuarioUs: uso.user, cpuSistemaUs: uso.system, memoriaMaxKb: process.resourceUsage().maxRSS },
        ms: performance.now() - inicio,
        codigoSalida: 1,
        stderr: '',
        redBloqueada: false,
      };
    }
  };

  return {
    equipo: <T>(empresa: EmpresaId, operacion: OperacionEquipo, ronda: number, vista?: VistaEmpresa) =>
      medir<T>(async (registrar) => {
        const modulo = opciones.modulos?.[empresa] ?? enCodigo(rutas, 'agents', 'nucleo', 'equipo.ts');
        const equipo = (await import(pathToFileURL(modulo).href)).default as EquipoEmpresa;
        const almacen = (rol: RolComercial) => new AlmacenRestringido(rutas, `${empresa}:${rol}`, registrar);
        const copia = vista ? structuredClone(vista) : undefined;
        switch (operacion) {
          case 'decidir':
            return equipo.decidir(copia as VistaEmpresa, almacen) as T;
          case 'contabilizar':
            return equipo.contabilizar(empresa, ronda, almacen) as T;
          case 'aprender':
            return equipo.aprender(copia as VistaEmpresa, almacen) as T;
        }
      }),
    juez: (ronda) =>
      medir(async () => {
        const { evaluarRonda } = await import('../evaluator/juez.ts');
        return evaluarRonda(rutas, ronda);
      }),
  };
}
