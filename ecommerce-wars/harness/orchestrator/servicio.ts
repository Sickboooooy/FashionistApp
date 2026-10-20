import { z } from 'zod';
import { rutasDadas } from '../permissions/rutas.ts';
import { Reloj } from '../scheduler/reloj.ts';
import { Controlador } from './controlador.ts';

/*
 * Servicio del harness para el War Room. Lo lanza scripts/servir.ts con
 * `node --permission` (identidad 'harness'): escribe datos y evidencia, nunca
 * sentencias. Recibe controles por IPC y publica su estado tras cada paso.
 */

const ControlSchema = z.strictObject({
  tipo: z.literal('control'),
  accion: z.enum(['pausar', 'reanudar', 'dia', 'semana', 'velocidad']),
  valor: z.number().int().min(0).max(60_000).optional(),
});

const entorno = z
  .object({
    EW_RAIZ_CORRIDA: z.string().min(1),
    EW_RAIZ_CODIGO: z.string().min(1),
    EW_MODO: z.enum(['prueba', 'oficial']).default('prueba'),
    EW_SEMILLA: z.coerce.number().int().nonnegative().optional(),
    EW_ID_CORRIDA: z.string().optional(),
    EW_AUTORIZADO_POR: z.string().optional(),
    EW_MS_POR_DIA: z.coerce.number().int().nonnegative().default(1500),
  })
  .parse(process.env);

const enviar = (mensaje: unknown) => process.send?.(mensaje);
const controlador = await Controlador.iniciar({
  rutas: rutasDadas(entorno.EW_RAIZ_CORRIDA, entorno.EW_RAIZ_CODIGO),
  modo: entorno.EW_MODO,
  semilla: entorno.EW_SEMILLA,
  autorizadoPor: entorno.EW_AUTORIZADO_POR ?? null,
  idCorrida: entorno.EW_ID_CORRIDA,
  aislamiento: 'proceso',
});
const reloj = new Reloj({ msPorDia: entorno.EW_MS_POR_DIA, pausado: true });
let ocupado = false;
let ultimoError: string | null = null;

function publicarEstado(): void {
  enviar({ tipo: 'estado', estado: { ...controlador.estado(), pausado: reloj.pausado, msPorDia: reloj.msPorDia, ocupado, ultimoError } });
}

async function paso(fn: () => Promise<void>): Promise<void> {
  ocupado = true;
  publicarEstado();
  try {
    await fn();
    ultimoError = null;
  } catch (error) {
    ultimoError = error instanceof Error ? error.message : String(error);
    reloj.pausar();
  } finally {
    ocupado = false;
    publicarEstado();
  }
}

process.on('message', (crudo: unknown) => {
  const m = ControlSchema.safeParse(crudo);
  if (!m.success) return;
  switch (m.data.accion) {
    case 'pausar':
      reloj.pausar();
      break;
    case 'reanudar':
      reloj.reanudar();
      break;
    case 'velocidad':
      reloj.fijarVelocidad(m.data.valor ?? reloj.msPorDia);
      break;
    case 'dia':
      if (reloj.pausado) void paso(() => controlador.avanzarDia());
      break;
    case 'semana':
      if (reloj.pausado) void paso(() => controlador.avanzarRonda());
      break;
  }
  publicarEstado();
});

publicarEstado();
const latido = setInterval(publicarEstado, 5000);
while (!controlador.terminado) {
  await reloj.esperarTurno();
  if (controlador.terminado) break;
  await paso(() => controlador.avanzarDia());
}
publicarEstado();
clearInterval(latido);
