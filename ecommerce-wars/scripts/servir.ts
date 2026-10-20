import { fork, spawnSync, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import type { Principal } from '../shared/types/dominio.ts';
import { cargarConfig } from '../shared/config.ts';
import { hashArbolCodigo, leerPreflight } from '../harness/orchestrator/corrida.ts';
import { banderasPermiso } from '../harness/permissions/acl.ts';
import { sandboxDeRedDisponible } from '../harness/permissions/sandbox.ts';
import { crearRutas, enCodigo, enCorrida, prepararEstructura, raizCodigoPorDefecto, RELATIVAS, rutaConfig, type Rutas } from '../harness/permissions/rutas.ts';

/*
 * Lanzador local del War Room y las tiendas. Cada proceso corre con el modelo de
 * permisos de Node y sólo las rutas de su identidad:
 *   harness  → escribe datos y evidencia (nunca sentencias)
 *   tribunal → sólo lectura
 *   tiendas  → leen lo público y lo propio; escriben sólo sus pedidos de demostración
 * Todo escucha en 127.0.0.1. El token del observador vive sólo en memoria.
 */

const { values } = parseArgs({
  options: {
    semilla: { type: 'string' },
    corrida: { type: 'string' },
    modo: { type: 'string', default: 'prueba' },
    'autorizado-por': { type: 'string' },
    'ms-por-dia': { type: 'string', default: '1500' },
    puerto: { type: 'string', default: '4100' },
  },
});

const raizCodigo = raizCodigoPorDefecto();
const modo = values.modo === 'oficial' ? 'oficial' : 'prueba';
const puertos = { tribunal: Number(values.puerto), alfa: 4101, omega: 4102 };
const token = randomBytes(24).toString('base64url');
const MensajeSchema = z.union([
  z.strictObject({ tipo: z.literal('control'), accion: z.string(), valor: z.number().optional() }),
  z.strictObject({ tipo: z.literal('reiniciar'), semilla: z.number().int().nonnegative() }),
]);

function rutaCorrida(semilla: number | undefined, nueva: boolean): string {
  if (values.corrida && !nueva) return resolve(values.corrida);
  if (modo === 'oficial') return raizCodigo;
  const base = join(raizCodigo, 'runs', `prueba-${semilla ?? 'base'}`);
  if (!nueva || !existsSync(base)) return base;
  for (let n = 2; ; n++) if (!existsSync(`${base}-${n}`)) return `${base}-${n}`;
}

function asegurarPreflight(rutas: Rutas, anterior: Rutas | null): void {
  const destino = enCorrida(rutas, RELATIVAS.preflight);
  if (existsSync(destino)) return;
  // Sólo se reutiliza un preflight hecho con las mismas reglas y el mismo código.
  const previo = anterior ? leerPreflight(anterior) : null;
  if (anterior && previo?.hashConfig === cargarConfig(rutaConfig(rutas)).hash && previo.hashCodigo === hashArbolCodigo(rutas.raizCodigo)) {
    copyFileSync(enCorrida(anterior, RELATIVAS.preflight), destino);
    return;
  }
  process.stdout.write('Ejecutando pruebas críticas (preflight)…\n');
  const r = spawnSync(process.execPath, [enCodigo(rutas, 'scripts', 'preflight.ts'), '--corrida', rutas.raizCorrida], { stdio: 'inherit' });
  if (r.status !== 0) {
    process.stderr.write('Las pruebas críticas fallaron: no se inicia la competencia.\n');
    process.exit(1);
  }
}

function lanzar(principal: Principal, script: string, rutas: Rutas, entorno: Record<string, string>): ChildProcess {
  const hijo = fork(script, [], {
    execArgv: banderasPermiso(principal, rutas),
    env: { PATH: process.env.PATH ?? '', NODE_NO_WARNINGS: '1', EW_RAIZ_CODIGO: rutas.raizCodigo, EW_RAIZ_CORRIDA: rutas.raizCorrida, ...entorno },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  hijo.on('exit', (codigo) => {
    if (codigo !== 0 && codigo !== null) process.stderr.write(`[${principal}] terminó con código ${codigo}\n`);
  });
  return hijo;
}

let semillaActual = values.semilla === undefined ? undefined : Number(values.semilla);
let rutas = crearRutas(rutaCorrida(semillaActual, false), raizCodigo);
prepararEstructura(rutas);
asegurarPreflight(rutas, null);

let servicio: ChildProcess;
let tiendas: ChildProcess[] = [];

function iniciarCorrida(): void {
  const idCorrida = modo === 'oficial' ? 'oficial' : rutas.raizCorrida.split('/').pop() ?? 'prueba';
  servicio = lanzar('harness', enCodigo(rutas, 'harness', 'orchestrator', 'servicio.ts'), rutas, {
    EW_SANDBOX_RED: sandboxDeRedDisponible() ? '1' : '0',
    EW_MODO: modo,
    EW_ID_CORRIDA: idCorrida,
    EW_MS_POR_DIA: String(values['ms-por-dia']),
    ...(semillaActual !== undefined ? { EW_SEMILLA: String(semillaActual) } : {}),
    ...(values['autorizado-por'] ? { EW_AUTORIZADO_POR: values['autorizado-por'] } : {}),
  });
  servicio.on('message', (m) => warRoom.send?.(m));
  tiendas = (['alfa', 'omega'] as const).map((e) => lanzar(`${e}:tienda`, enCodigo(rutas, 'apps', e, 'server.ts'), rutas, { EW_PUERTO: String(puertos[e]) }));
}

const warRoom = lanzar('tribunal', enCodigo(rutas, 'apps', 'tribunal', 'server.ts'), rutas, {
  EW_PUERTO: String(puertos.tribunal),
  EW_TOKEN_OBSERVADOR: token,
});
iniciarCorrida();

warRoom.on('message', (crudo) => {
  const m = MensajeSchema.safeParse(crudo);
  if (!m.success) return;
  if (m.data.tipo === 'control') {
    servicio.send(m.data);
    return;
  }
  if (modo === 'oficial') return;
  const anterior = rutas;
  const semilla = m.data.semilla;
  servicio.removeAllListeners('message');
  // Se espera a que terminen los procesos anteriores para liberar los puertos de las tiendas.
  void Promise.all([servicio, ...tiendas].map(detener)).then(() => {
    semillaActual = semilla;
    rutas = crearRutas(rutaCorrida(semillaActual, true), raizCodigo);
    prepararEstructura(rutas);
    asegurarPreflight(rutas, anterior);
    iniciarCorrida();
    warRoom.send({ tipo: 'corrida', raizCorrida: rutas.raizCorrida });
  });
});

function detener(p: ChildProcess): Promise<void> {
  if (p.exitCode !== null || p.signalCode !== null) return Promise.resolve();
  return new Promise((resolver) => {
    p.once('exit', () => resolver());
    p.kill();
  });
}

function terminar(): void {
  for (const p of [servicio, warRoom, ...tiendas]) p.kill();
  process.exit(0);
}
process.on('SIGINT', terminar);
process.on('SIGTERM', terminar);

const corrida = existsSync(enCorrida(rutas, RELATIVAS.corrida)) ? JSON.parse(readFileSync(enCorrida(rutas, RELATIVAS.corrida), 'utf8')).id : 'nueva';
process.stdout.write(
  [
    '',
    `E-COMMERCE WARS · corrida ${corrida} (${modo}) en ${rutas.raizCorrida}`,
    `  War Room (público):      http://127.0.0.1:${puertos.tribunal}`,
    `  War Room (privilegiado): http://127.0.0.1:${puertos.tribunal}/#acceso=${token}`,
    `  Tienda ALFA:             http://127.0.0.1:${puertos.alfa}`,
    `  Tienda OMEGA:            http://127.0.0.1:${puertos.omega}`,
    '  La simulación inicia en pausa. Ctrl+C para detener todo.',
    '',
  ].join('\n'),
);
