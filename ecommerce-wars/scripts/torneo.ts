import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { formatoMXN } from '../shared/money.ts';
import { resumenRonda } from '../simulation/economics/proyeccion.ts';
import { Controlador } from '../harness/orchestrator/controlador.ts';
import { crearRutas, enCorrida, raizCodigoPorDefecto, RELATIVAS } from '../harness/permissions/rutas.ts';

/**
 * Torneo sin interfaz. Por defecto es una simulación de prueba en runs/<id>/.
 * El torneo oficial (fase 9) corre en la raíz del proyecto y exige que una
 * persona lo autorice: --modo oficial --autorizado-por "Nombre".
 */
const { values } = parseArgs({
  options: {
    modo: { type: 'string', default: 'prueba' },
    'autorizado-por': { type: 'string' },
    semilla: { type: 'string' },
    corrida: { type: 'string' },
    rondas: { type: 'string' },
    aislamiento: { type: 'string', default: 'proceso' },
  },
});

const modo = values.modo === 'oficial' ? 'oficial' : 'prueba';
const semilla = values.semilla === undefined ? undefined : Number(values.semilla);
if (semilla !== undefined && (!Number.isSafeInteger(semilla) || semilla < 0)) throw new Error('--semilla debe ser un entero no negativo');
const raizCodigo = raizCodigoPorDefecto();
const raizCorrida = values.corrida
  ? resolve(values.corrida)
  : modo === 'oficial'
    ? raizCodigo
    : join(raizCodigo, 'runs', `prueba-${semilla ?? 'base'}`);
const rutas = crearRutas(raizCorrida, raizCodigo);

if (!existsSync(enCorrida(rutas, RELATIVAS.preflight))) {
  process.stdout.write('Ejecutando pruebas críticas (preflight)…\n');
  const r = spawnSync(process.execPath, [join(raizCodigo, 'scripts', 'preflight.ts'), '--corrida', raizCorrida], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
}

const controlador = await Controlador.iniciar({
  rutas,
  modo,
  semilla,
  autorizadoPor: values['autorizado-por'] ?? null,
  aislamiento: values.aislamiento === 'en-proceso' ? 'en-proceso' : 'proceso',
  rondasMaximas: values.rondas ? Number(values.rondas) : undefined,
  idCorrida: modo === 'oficial' ? 'oficial' : `prueba-${semilla ?? 'base'}`,
});

process.stdout.write(`Corrida ${controlador.corrida.id} · modo ${modo} · semilla ${controlador.corrida.semilla} · ${raizCorrida}\n`);
while (!controlador.terminado) {
  await controlador.avanzarRonda();
  const { ronda } = controlador.estado();
  const r = resumenRonda(controlador.proyeccion, ronda);
  const veredicto = controlador.proyeccion.veredictos.find((v) => v.ronda === ronda);
  if (r) {
    process.stdout.write(
      `R${String(ronda).padStart(2, '0')}  ALFA ${formatoMXN(r.alfa.financiero.ventasNetas).padStart(14)} (${r.alfa.pedidosValidos} pv)` +
        `  OMEGA ${formatoMXN(r.omega.financiero.ventasNetas).padStart(14)} (${r.omega.pedidosValidos} pv)` +
        `  → ${veredicto?.resultado ?? '?'}${veredicto?.ganador ? ` ${veredicto.ganador.toUpperCase()}` : ''}` +
        `\n     expediente ${veredicto?.hashExpediente ?? '—'} · sentencia ${veredicto?.hashVeredicto ?? '—'}\n`,
    );
  }
}
const final = controlador.estado();
process.stdout.write(`\n${final.motivoFin}\nÚltimo hash del diario: ${final.ultimoHash}\nReporte: ${join(raizCorrida, 'reports', 'reporte-final.md')}\n`);
