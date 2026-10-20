import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { cargarConfig } from '../shared/config.ts';
import { Controlador } from '../harness/orchestrator/controlador.ts';
import { preflightSintetico } from '../harness/orchestrator/corrida.ts';
import { leerManifiesto } from '../harness/orchestrator/evidencia.ts';
import { crearRutas, raizCodigoPorDefecto, rutaConfig } from '../harness/permissions/rutas.ts';

/**
 * Fase 8: corre el torneo varias veces en directorios aislados y compara los
 * hashes de diario, expedientes y sentencias. Misma semilla ⇒ idénticos;
 * semilla distinta ⇒ distintos.
 */
const { values } = parseArgs({
  options: {
    rondas: { type: 'string', default: '3' },
    aislamiento: { type: 'string', default: 'en-proceso' },
    semilla: { type: 'string' },
  },
});
const raiz = raizCodigoPorDefecto();
const ci = cargarConfig(rutaConfig(crearRutas(raiz, raiz)));
const rondas = Number(values.rondas);
const semilla = values.semilla ? Number(values.semilla) : ci.cfg.semilla;
const aislamiento = values.aislamiento === 'proceso' ? 'proceso' : 'en-proceso';

async function correr(s: number) {
  const dir = mkdtempSync(join(tmpdir(), 'ew-repro-'));
  try {
    const c = await Controlador.iniciar({ rutas: crearRutas(dir, raiz), modo: 'prueba', semilla: s, aislamiento, preflight: preflightSintetico(ci.hash), rondasMaximas: rondas });
    for (let r = 0; r < rondas && !c.terminado; r++) await c.avanzarRonda();
    const cerradas = c.estado().ronda;
    return {
      semilla: s,
      rondas: cerradas,
      ultimoHash: c.estado().ultimoHash,
      expedientes: Array.from({ length: cerradas }, (_, i) => leerManifiesto(c.rutas, i + 1)?.hashExpediente ?? null),
      sentencias: c.proyeccion.veredictos.map((v) => v.hashVeredicto),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const a = await correr(semilla);
const b = await correr(semilla);
const otra = await correr(semilla + 1);
const identicas = a.ultimoHash === b.ultimoHash && JSON.stringify(a.expedientes) === JSON.stringify(b.expedientes) && JSON.stringify(a.sentencias) === JSON.stringify(b.sentencias);
const distintas = otra.ultimoHash !== a.ultimoHash;
const resultado = { comprobadoEn: new Date().toISOString(), aislamiento, rondasSolicitadas: rondas, identicasConMismaSemilla: identicas, distintasConOtraSemilla: distintas, corridas: [a, b, otra] };

mkdirSync(join(raiz, 'reports', 'reproducibilidad'), { recursive: true });
writeFileSync(join(raiz, 'reports', 'reproducibilidad', 'resultado.json'), `${JSON.stringify(resultado, null, 2)}\n`);
process.stdout.write(
  [
    `Corrida A (semilla ${a.semilla}): ${a.rondas} rondas · ${a.ultimoHash}`,
    `Corrida B (semilla ${b.semilla}): ${b.rondas} rondas · ${b.ultimoHash}`,
    `Corrida C (semilla ${otra.semilla}): ${otra.rondas} rondas · ${otra.ultimoHash}`,
    `Misma semilla ⇒ diario, ${a.expedientes.length} expedientes y ${a.sentencias.length} sentencias idénticos: ${identicas ? 'SÍ' : 'NO'}`,
    `Otra semilla ⇒ historia distinta: ${distintas ? 'SÍ' : 'NO'}`,
    '',
  ].join('\n'),
);
process.exit(identicas && distintas ? 0 : 1);
