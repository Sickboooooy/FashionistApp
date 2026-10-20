import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { hashCanonico } from '../../shared/hash.ts';
import { CODIGOS_WAR_ROOM, codigoWarRoom } from '../../shared/schemas/eventos.ts';
import { EMPRESAS } from '../../shared/types/dominio.ts';
import { hashEvento, leerEventos } from '../../harness/event-bus/diario.ts';
import { revisarIntegridad } from '../../harness/evaluator/integridad.ts';
import type { Resolucion } from '../../harness/evaluator/juez.ts';
import type { Controlador } from '../../harness/orchestrator/controlador.ts';
import type { ResumenRondaArchivo } from '../../harness/orchestrator/resumen.ts';
import { enCorrida, RELATIVAS } from '../../harness/permissions/rutas.ts';
import { contabilizar, indicadoresContables, saldos, type LibroMayor } from '../../simulation/economics/libro-mayor.ts';
import { indicadoresDesdeEventos } from '../../simulation/economics/proyeccion.ts';
import { controlador, corridaTemporal, type CorridaTemporal } from '../ayudantes.ts';

const RONDAS_MAX = 4;
let corrida: CorridaTemporal;
let c: Controlador;
let rondas = 0;

before(async () => {
  corrida = corridaTemporal();
  c = await controlador(corrida.rutas, { rondasMaximas: RONDAS_MAX });
  await c.correrHastaFin();
  rondas = c.estado().ronda;
});
after(() => corrida.limpiar());

const leer = <T>(relativa: string): T => JSON.parse(readFileSync(enCorrida(corrida.rutas, relativa), 'utf8')) as T;

describe('torneo completo de punta a punta', () => {
  test('el torneo termina con un motivo y un reporte final', () => {
    const estado = c.estado();
    assert.equal(estado.fase, 'terminado');
    assert.ok(estado.motivoFin);
    assert.ok(rondas >= 1 && rondas <= RONDAS_MAX);
    assert.ok(existsSync(enCorrida(corrida.rutas, 'reports/reporte-final.md')));
  });

  test('la revisión de integridad de toda la corrida es correcta', () => {
    const r = revisarIntegridad(corrida.rutas, c.ci, c.corrida);
    assert.equal(r.ok, true, JSON.stringify({ diario: r.diario.errores, exp: r.expedientes.flatMap((e) => e.errores), sen: r.sentencias.flatMap((s) => s.errores) }));
    assert.equal(r.expedientes.length, rondas);
    assert.equal(r.sentencias.length, rondas);
  });

  test('cada resolución contiene todos los elementos del apartado 5 y su hash es verificable', () => {
    const sellados = leerEventos(enCorrida(corrida.rutas, RELATIVAS.diario)).filter((e) => e.tipo === 'veredicto_emitido');
    for (let n = 1; n <= rondas; n++) {
      const s = leer<Resolucion>(RELATIVAS.veredicto(n, 'json'));
      for (const campo of ['expediente', 'periodo', 'evidenciasVerificadas', 'hechosAcreditados', 'reglasAplicadas', 'incidencias', 'resultado', 'hashExpediente', 'hashVeredicto'] as const) {
        assert.ok(s[campo] !== undefined && s[campo] !== null, `ronda ${n}: falta ${campo}`);
      }
      const { hashVeredicto, ...cuerpo } = s;
      assert.equal(hashCanonico(cuerpo), hashVeredicto);
      assert.ok(sellados.some((e) => e.ronda === n && e.tipo === 'veredicto_emitido' && e.datos.hashVeredicto === hashVeredicto));
      assert.ok(s.evidenciasVerificadas.length >= 9);
      assert.match(s.nota, /no la veracidad/);
    }
  });

  test('los indicadores coinciden con el libro mayor de cada empresa en cada ronda', () => {
    const eventos = leerEventos(enCorrida(corrida.rutas, RELATIVAS.diario));
    for (const e of EMPRESAS) {
      const libro = leer<LibroMayor>(RELATIVAS.privado(e, 'libro-mayor.json'));
      assert.equal(hashCanonico(libro), hashCanonico(contabilizar(e, eventos)), 'el libro del agente financiero corresponde a los eventos');
      for (let n = 1; n <= rondas; n++) {
        assert.deepEqual(indicadoresContables(libro, n), indicadoresDesdeEventos(eventos, e, n), `${e} ronda ${n}`);
        const resumen = leer<ResumenRondaArchivo>(RELATIVAS.resumenRonda(n));
        assert.equal(resumen.empresas[e].conciliacion.libroVsEventos, true);
      }
      const estadoFinal = JSON.parse(readFileSync(enCorrida(corrida.rutas, RELATIVAS.expediente(rondas), 'estado-final.json'), 'utf8'));
      assert.equal(saldos(libro)['1100'], estadoFinal.empresas[e].caja, 'caja del libro = caja del estado');
    }
  });

  test('ambas tiendas emiten eventos verificables con los 13 códigos del War Room', () => {
    const eventos = leerEventos(enCorrida(corrida.rutas, RELATIVAS.diario));
    const codigos = new Set(eventos.map((e) => codigoWarRoom(e.tipo)).filter((x) => x !== null));
    for (const codigo of CODIGOS_WAR_ROOM) assert.ok(codigos.has(codigo), `nunca se emitió ${codigo}`);
    for (const empresa of EMPRESAS) {
      const propios = leerEventos(enCorrida(corrida.rutas, RELATIVAS.privado(empresa, 'eventos.jsonl')));
      assert.ok(propios.some((e) => e.tipo === 'pedido_cobrado'), `${empresa} sin ventas`);
      assert.ok(propios.every((e) => e.empresa === empresa && hashEvento(e, e.seq, e.prevHash) === e.hash));
    }
  });

  test('cada decisión registra agente, hipótesis, presupuesto y resultado observado', () => {
    assert.equal(c.proyeccion.decisiones.length, rondas * 2 * 5);
    for (const d of c.proyeccion.decisiones) {
      assert.match(d.actor, /^(alfa|omega):(director|compras|marketing|ventas|finanzas)$/);
      assert.ok(d.hipotesis.texto.length > 0);
      assert.ok(Number.isInteger(d.presupuestoComprometido));
      assert.notEqual(d.cumplida, undefined);
    }
    assert.ok(c.proyeccion.estrategias.length >= 2, 'STRATEGY_CHANGED al menos en la ronda 1');
  });

  test('cada ronda cierra con aprendizaje registrado y resultados públicos', () => {
    const memorias = leerEventos(enCorrida(corrida.rutas, RELATIVAS.diario)).filter((e) => e.tipo === 'memoria_actualizada');
    assert.equal(memorias.length, rondas * 2);
    const publicos = leer<unknown[]>(RELATIVAS.resultadosPublicos);
    assert.equal(publicos.length, rondas);
  });
});
