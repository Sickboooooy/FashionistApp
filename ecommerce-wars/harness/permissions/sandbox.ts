import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import type { Principal } from '../../shared/types/dominio.ts';
import { banderasPermiso } from './acl.ts';
import { MARCA_RESPUESTA, type RespuestaProceso } from './protocolo.ts';
import type { Rutas } from './rutas.ts';

const SALIDA_MAXIMA = 8 * 1024 * 1024;
const MEMORIA_MAXIMA_MB = 512;
const SANDBOX_EXEC = '/usr/bin/sandbox-exec';
/** Perfil de sandbox de macOS: todo lo demás lo limita `--permission`; aquí sólo se niega la red. */
const PERFIL_SIN_RED = '(version 1)(allow default)(deny network*)';

const CONTROL = new RegExp('[\\u{0}-\\u{1f}\\u{7f}\\u{200b}-\\u{200f}\\u{2028}-\\u{202e}\\u{2060}-\\u{206f}\\u{feff}]', 'gu');
const textoAcotado = (maximo: number) => z.string().transform((s) => s.replace(CONTROL, ' ').slice(0, maximo));

/** El hijo es no confiable: su respuesta se valida y se acota antes de usarla. */
const RespuestaSchema = z.object({
  ok: z.boolean(),
  resultado: z.unknown().optional(),
  error: textoAcotado(500).optional(),
  incidentes: z
    .array(
      z.object({
        principal: textoAcotado(60),
        operacion: z.enum(['lectura', 'escritura']),
        ruta: textoAcotado(300),
        motivo: textoAcotado(200),
      }),
    )
    .max(50),
  telemetria: z.object({
    cpuUsuarioUs: z.number().nonnegative(),
    cpuSistemaUs: z.number().nonnegative(),
    memoriaMaxKb: z.number().nonnegative(),
  }),
});

export interface OpcionesAislado {
  principal: Principal;
  rutas: Rutas;
  script: string;
  entrada: unknown;
  timeoutMs: number;
  lecturaExtra?: readonly string[];
  escrituraExtra?: readonly string[];
}

export interface ResultadoAislado<T> extends RespuestaProceso<T> {
  ms: number;
  codigoSalida: number | null;
  stderr: string;
  /** true si el sistema operativo negó la red al proceso (macOS: sandbox-exec). */
  redBloqueada: boolean;
}

/**
 * Comando para lanzar el hijo. En macOS se envuelve con sandbox-exec para negar la
 * red: el modelo de permisos de Node 24 no la restringe (ver docs/BLOQUEOS.md).
 */
export function sandboxDeRedDisponible(): boolean {
  if (process.platform !== 'darwin' || process.env.EW_PERMITIR_RED_AGENTES === '1') return false;
  // Un harness que ya corre con --permission no puede consultar /usr/bin: el lanzador
  // (sin restricciones) lo detecta y lo informa por EW_SANDBOX_RED.
  if (process.env.EW_SANDBOX_RED !== undefined) return process.env.EW_SANDBOX_RED === '1';
  try {
    return existsSync(SANDBOX_EXEC);
  } catch {
    return false;
  }
}

export function comandoAislado(argumentosNode: readonly string[]): { comando: string; argumentos: string[]; redBloqueada: boolean } {
  if (sandboxDeRedDisponible()) {
    return { comando: SANDBOX_EXEC, argumentos: ['-p', PERFIL_SIN_RED, process.execPath, ...argumentosNode], redBloqueada: true };
  }
  return { comando: process.execPath, argumentos: [...argumentosNode], redBloqueada: false };
}

/**
 * Ejecuta un script en un proceso Node con el modelo de permisos activado: el
 * sistema de archivos queda limitado a la política del principal, sin red cuando
 * el sistema lo permite, con memoria acotada, entorno vacío y plazo máximo.
 */
export function ejecutarAislado<T>(opciones: OpcionesAislado): Promise<ResultadoAislado<T>> {
  const banderas = banderasPermiso(opciones.principal, opciones.rutas, {
    lectura: [opciones.script, ...(opciones.lecturaExtra ?? [])],
    escritura: opciones.escrituraExtra ?? [],
  });
  const { comando, argumentos, redBloqueada } = comandoAislado([`--max-old-space-size=${MEMORIA_MAXIMA_MB}`, ...banderas, opciones.script]);
  const inicio = performance.now();
  return new Promise((resolver) => {
    const hijo = spawn(comando, argumentos, {
      cwd: opciones.rutas.raizCodigo,
      env: { PATH: process.env.PATH ?? '', NODE_NO_WARNINGS: '1', LANG: 'es_MX.UTF-8' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let vencido = false;
    const plazo = setTimeout(() => {
      vencido = true;
      hijo.kill('SIGKILL');
    }, opciones.timeoutMs);
    const fallo = (error: string, codigo: number | null): ResultadoAislado<T> => ({
      ok: false,
      error,
      incidentes: [],
      telemetria: { cpuUsuarioUs: 0, cpuSistemaUs: 0, memoriaMaxKb: 0 },
      ms: performance.now() - inicio,
      codigoSalida: codigo,
      stderr,
      redBloqueada,
    });

    hijo.stdout.setEncoding('utf8').on('data', (d: string) => {
      if (stdout.length < SALIDA_MAXIMA) stdout += d;
    });
    hijo.stderr.setEncoding('utf8').on('data', (d: string) => {
      if (stderr.length < 64 * 1024) stderr += d;
    });
    hijo.on('error', (error) => {
      clearTimeout(plazo);
      resolver(fallo(`no se pudo iniciar el proceso: ${error.message}`, null));
    });
    hijo.on('close', (codigo) => {
      clearTimeout(plazo);
      if (vencido) return resolver(fallo(`tiempo agotado (${opciones.timeoutMs} ms)`, codigo));
      const linea = stdout.split('\n').find((l) => l.startsWith(MARCA_RESPUESTA));
      if (!linea) return resolver(fallo(`el proceso terminó sin respuesta (código ${codigo})`, codigo));
      let crudo: unknown;
      try {
        crudo = JSON.parse(linea.slice(MARCA_RESPUESTA.length));
      } catch {
        return resolver(fallo('respuesta ilegible del proceso', codigo));
      }
      const r = RespuestaSchema.safeParse(crudo);
      if (!r.success) return resolver(fallo('respuesta del proceso con formato inválido', codigo));
      resolver({
        ...(r.data as RespuestaProceso<T>),
        incidentes: r.data.incidentes.map((i) => ({ ...i, principal: i.principal as Principal })),
        ms: performance.now() - inicio,
        codigoSalida: codigo,
        stderr,
        redBloqueada,
      });
    });
    hijo.stdin.on('error', () => {});
    hijo.stdin.end(JSON.stringify(opciones.entrada));
  });
}
