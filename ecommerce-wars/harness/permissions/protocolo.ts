import type { IntentoDenegado } from './almacen.ts';

/**
 * Protocolo de los procesos aislados: una entrada JSON por stdin y una única
 * línea JSON de respuesta por stdout. La telemetría la mide el propio hijo.
 */
export interface TelemetriaProceso {
  cpuUsuarioUs: number;
  cpuSistemaUs: number;
  memoriaMaxKb: number;
}

export interface RespuestaProceso<T> {
  ok: boolean;
  resultado?: T;
  error?: string;
  incidentes: IntentoDenegado[];
  telemetria: TelemetriaProceso;
}

export const MARCA_RESPUESTA = '@@EW-RESPUESTA@@';

async function leerEntrada(): Promise<unknown> {
  const trozos: Buffer[] = [];
  for await (const t of process.stdin) trozos.push(t as Buffer);
  return JSON.parse(Buffer.concat(trozos).toString('utf8'));
}

function telemetria(): TelemetriaProceso {
  const cpu = process.cpuUsage();
  return { cpuUsuarioUs: cpu.user, cpuSistemaUs: cpu.system, memoriaMaxKb: process.resourceUsage().maxRSS };
}

export async function atenderComoProceso<T>(
  manejador: (entrada: unknown, registrarIncidente: (i: IntentoDenegado) => void) => Promise<T> | T,
): Promise<void> {
  const incidentes: IntentoDenegado[] = [];
  let respuesta: RespuestaProceso<T>;
  try {
    const entrada = await leerEntrada();
    const resultado = await manejador(entrada, (i) => incidentes.push(i));
    respuesta = { ok: true, resultado, incidentes, telemetria: telemetria() };
  } catch (error) {
    const codigo = (error as NodeJS.ErrnoException | undefined)?.code;
    if (codigo === 'ERR_ACCESS_DENIED') {
      incidentes.push({ principal: 'harness', operacion: 'lectura', ruta: String((error as { resource?: string }).resource ?? '?'), motivo: 'bloqueado por el runtime (--permission)' });
    }
    respuesta = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      incidentes,
      telemetria: telemetria(),
    };
  }
  process.stdout.write(`${MARCA_RESPUESTA}${JSON.stringify(respuesta)}\n`);
}
