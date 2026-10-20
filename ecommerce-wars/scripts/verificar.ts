import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { cargarConfig } from '../shared/config.ts';
import { hashCanonico } from '../shared/hash.ts';
import { leerEventos } from '../harness/event-bus/diario.ts';
import { auditar } from '../harness/evaluator/auditor.ts';
import { revisarIntegridad } from '../harness/evaluator/integridad.ts';
import { verificarExpediente } from '../harness/evaluator/verificador.ts';
import { configDeCorrida, leerCorrida } from '../harness/orchestrator/corrida.ts';
import { leerManifiesto } from '../harness/orchestrator/evidencia.ts';
import { crearRutas, enCorrida, RELATIVAS, rutaConfig } from '../harness/permissions/rutas.ts';

/**
 * Verificación independiente y de sólo lectura de una corrida: candado de reglas,
 * cadena del diario, hashes de cada expediente, reejecución determinista de cada
 * ronda, auditoría contable y hash de cada sentencia. No escribe nada.
 */
const { values } = parseArgs({ options: { corrida: { type: 'string', default: '.' } } });
const rutas = crearRutas(resolve(values.corrida ?? '.'));
const corrida = leerCorrida(rutas);
if (!corrida) {
  process.stderr.write(`No hay corrida en ${rutas.raizCorrida} (falta corrida.json).\n`);
  process.exit(2);
}
const ci = configDeCorrida(cargarConfig(rutaConfig(rutas)), corrida);
const escribir = (linea = '') => process.stdout.write(`${linea}\n`);
let problemas = 0;

escribir(`Corrida ${corrida.id} · modo ${corrida.modo} · semilla ${corrida.semilla} · reglas v${corrida.versionReglas}`);
const integridad = revisarIntegridad(rutas, ci, corrida);
escribir(`Candado de reglas: ${integridad.candado.ok ? 'OK' : 'FALLA'} — ${integridad.candado.detalle}`);
escribir(`Diario: ${integridad.diario.ok ? 'OK' : 'FALLA'} — ${integridad.diario.eventos} eventos, último hash ${integridad.diario.ultimoHash}`);
for (const e of integridad.diario.errores) escribir(`   ✘ ${e}`);
escribir(`Pruebas críticas: ${integridad.preflight?.ok ? `OK (${integridad.preflight.aprobadas}/${integridad.preflight.total}${integridad.preflight.sintetico ? ', sintético' : ''})` : 'FALLA o ausentes'}`);
if (!integridad.ok) problemas++;

const diario = leerEventos(enCorrida(rutas, RELATIVAS.diario));
for (let ronda = 1; leerManifiesto(rutas, ronda); ronda++) {
  const v = verificarExpediente({ rutas, ci, corrida, ronda });
  const hallazgos = [...v.hallazgos];
  if (v.datos) {
    const acumulados = diario.filter((e) => e.seq <= v.datos!.manifiesto.seqFin);
    hallazgos.push(...auditar({ ci, ronda, eventosRonda: v.datos.eventos.filter((e) => e.ronda === ronda), eventosAcumulados: acumulados, estadoFinal: v.datos.estadoFinal, libros: v.datos.libros, reportes: v.datos.reportes }).hallazgos);
  }
  const rutaSentencia = enCorrida(rutas, RELATIVAS.veredicto(ronda, 'json'));
  let sentencia = 'sin sentencia';
  if (existsSync(rutaSentencia)) {
    const s = JSON.parse(readFileSync(rutaSentencia, 'utf8')) as Record<string, unknown> & { hashVeredicto: string; resultado: string; ganador: string | null };
    const { hashVeredicto, ...cuerpo } = s;
    sentencia = `${s.resultado}${s.ganador ? ` ${s.ganador.toUpperCase()}` : ''} · hash ${hashCanonico(cuerpo) === hashVeredicto ? 'íntegro' : 'ALTERADO'}`;
    if (hashCanonico(cuerpo) !== hashVeredicto) problemas++;
  }
  const serios = hallazgos.filter((h) => h.severidad !== 'leve');
  escribir(`Ronda ${ronda}: ${serios.length === 0 ? 'OK' : `${serios.length} hallazgos graves o críticos`} (reejecución determinista incluida) · ${sentencia}`);
  for (const h of hallazgos) escribir(`   [${h.severidad}] ${h.codigo}${h.empresa ? ` (${h.empresa})` : ''}: ${h.detalle}`);
  problemas += serios.filter((h) => h.severidad === 'critica').length;
}

escribir();
escribir('Los hashes acreditan la integridad del registro, no la veracidad de los datos de origen.');
escribir(problemas === 0 ? 'VERIFICACIÓN SUPERADA' : `VERIFICACIÓN CON ${problemas} PROBLEMAS`);
process.exit(problemas === 0 ? 0 : 1);
