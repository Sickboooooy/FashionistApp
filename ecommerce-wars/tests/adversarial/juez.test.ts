import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { parsearConfig } from '../../shared/config.ts';
import { sha256 } from '../../shared/hash.ts';
import type { Evento, EventoSellado } from '../../shared/schemas/eventos.ts';
import { leerEventos, sellar, serializarEventos } from '../../harness/event-bus/diario.ts';
import type { Resolucion } from '../../harness/evaluator/juez.ts';
import { verificarExpediente } from '../../harness/evaluator/verificador.ts';
import { Controlador } from '../../harness/orchestrator/controlador.ts';
import { leerCorrida, preflightSintetico } from '../../harness/orchestrator/corrida.ts';
import { ARCHIVOS, leerManifiesto, sellarManifiesto, type Manifiesto } from '../../harness/orchestrator/evidencia.ts';
import { crearRutas, enCorrida, RELATIVAS } from '../../harness/permissions/rutas.ts';
import { indicadoresDesdeEventos } from '../../simulation/economics/proyeccion.ts';
import { config, controlador, corridaTemporal, fixture, RAIZ } from '../ayudantes.ts';

const sentencia = (raiz: string, ronda = 1) => JSON.parse(readFileSync(join(raiz, RELATIVAS.veredicto(ronda, 'json')), 'utf8')) as Resolucion;

async function rondaCon(modulo: string) {
  const corrida = corridaTemporal();
  const c = await controlador(corrida.rutas, { modulosEquipo: { alfa: fixture(modulo) } });
  await c.avanzarRonda();
  return { corrida, c };
}

describe('intentos adversariales de manipulación del Juez', () => {
  test('un reporte financiero inflado se detecta: discrepancia grave y sin candidatura', async () => {
    const { corrida } = await rondaCon('equipo-fraude.ts');
    try {
      const s = sentencia(corrida.rutas.raizCorrida);
      assert.ok(s.incidencias.some((h) => h.codigo === 'discrepancia_contable' && h.empresa === 'alfa' && h.severidad === 'grave' && h.detalle.includes('ventasNetas')));
      assert.equal(s.comprobaciones?.alfa.find((x) => x.regla === 'V6')?.cumple, false);
      const eventos = leerEventos(enCorrida(corrida.rutas, RELATIVAS.diario));
      assert.equal(s.hechosAcreditados?.alfa.indicadores.ventasNetas, indicadoresDesdeEventos(eventos, 'alfa', 1).ventasNetas, 'el Juez acredita lo que dicen los eventos, no el reporte');
    } finally {
      corrida.limpiar();
    }
  });

  test('las instrucciones dirigidas al Juez se registran como texto sospechoso y no tienen efecto', async () => {
    const { corrida } = await rondaCon('equipo-inyeccion.ts');
    try {
      const eventos = leerEventos(enCorrida(corrida.rutas, RELATIVAS.diario));
      const sospechosos = eventos.filter((e) => e.tipo === 'incidente' && e.datos.codigo === 'texto_sospechoso');
      assert.ok(sospechosos.length >= 2, 'estrategia y anuncio');
      assert.ok(sospechosos.every((e) => e.tipo === 'incidente' && e.datos.severidad === 'leve'));
      const anuncio = eventos.find((e) => e.tipo === 'campana_iniciada' && e.empresa === 'alfa');
      assert.ok(anuncio && anuncio.tipo === 'campana_iniciada');
      assert.equal(/[​‮]/.test(anuncio.datos.mensaje), false, 'sin caracteres invisibles');
      const s = sentencia(corrida.rutas.raizCorrida);
      assert.notEqual(s.resultado, 'ronda_invalida');
      assert.equal(s.hechosAcreditados?.alfa.indicadores.ventasNetas, indicadoresDesdeEventos(eventos, 'alfa', 1).ventasNetas);
    } finally {
      corrida.limpiar();
    }
  });

  test('un campo no declarado en el contrato (ventasReportadas) anula el plan completo', async () => {
    const { corrida } = await rondaCon('equipo-campo-extra.ts');
    try {
      const eventos = leerEventos(enCorrida(corrida.rutas, RELATIVAS.diario));
      assert.ok(eventos.some((e) => e.tipo === 'decision_rechazada' && e.empresa === 'alfa' && e.datos.codigo === 'esquema_invalido'));
      assert.equal(eventos.filter((e) => e.tipo === 'orden_emitida' && e.empresa === 'alfa').length, 0, 'ALFA opera con el plan neutro');
    } finally {
      corrida.limpiar();
    }
  });

  test('una venta fabricada con la cadena re-sellada se detecta al reejecutar la ronda', async () => {
    const corrida = corridaTemporal();
    try {
      const c = await controlador(corrida.rutas);
      await c.avanzarRonda();
      const dir = join(corrida.rutas.raizCorrida, RELATIVAS.expediente(1));
      const eventos = leerEventos(join(dir, ARCHIVOS.eventos));
      const molde = eventos.find((e) => e.tipo === 'pedido_creado' && e.empresa === 'alfa') as EventoSellado & { tipo: 'pedido_creado' };
      const cobro = eventos.find((e) => e.tipo === 'pedido_cobrado' && e.datos.pedidoId === molde.datos.pedido.id) as EventoSellado;
      const falso = { ...molde.datos.pedido, id: 'ALFA-999999' };
      const insertados = [
        { ...molde, datos: { pedido: falso } },
        { ...cobro, datos: { ...(cobro.datos as object), pedidoId: 'ALFA-999999' } },
      ];
      const i = eventos.findIndex((e) => e.tipo === 'cierre_dia' && e.dia === 7);
      const alterados = [...eventos.slice(0, i), ...insertados, ...eventos.slice(i)];
      // El atacante controla todos los archivos: re-sella la cadena y el manifiesto.
      let prev = alterados[0]!.prevHash;
      const resellados = alterados.map((e, k) => {
        const s = sellar(e as Evento, eventos[0]!.seq + k, prev);
        prev = s.hash;
        return s;
      });
      const contenido = serializarEventos(resellados);
      writeFileSync(join(dir, ARCHIVOS.eventos), contenido);
      writeFileSync(join(corrida.rutas.raizCorrida, RELATIVAS.diario), contenido);
      const m = leerManifiesto(corrida.rutas, 1) as Manifiesto;
      const { hashExpediente: _h, ...resto } = m;
      const nuevo = sellarManifiesto({
        ...resto,
        seqFin: resellados.at(-1)!.seq,
        hashFin: resellados.at(-1)!.hash,
        archivos: m.archivos.map((a) => (a.ruta === ARCHIVOS.eventos ? { ...a, sha256: sha256(contenido), bytes: Buffer.byteLength(contenido) } : a)),
      });
      writeFileSync(join(dir, ARCHIVOS.manifiesto), JSON.stringify(nuevo, null, 2));

      const { hallazgos } = verificarExpediente({ rutas: corrida.rutas, ci: config(), corrida: leerCorrida(corrida.rutas)!, ronda: 1 });
      assert.ok(hallazgos.some((h) => h.codigo === 'determinismo' && h.severidad === 'critica'), JSON.stringify(hallazgos));
    } finally {
      corrida.limpiar();
    }
  });

  test('cambiar las reglas sin autorización humana se detecta y bloquea el torneo', async () => {
    const corrida = corridaTemporal();
    const codigoFalso = mkdtempSync(join(tmpdir(), 'ew-reglas-'));
    try {
      const c = await controlador(corrida.rutas);
      await c.avanzarRonda();
      const crudo = JSON.parse(readFileSync(join(RAIZ, 'config', 'experiment.json'), 'utf8'));
      const alterada = parsearConfig(JSON.stringify({ ...crudo, victoria: { ...crudo.victoria, multiplicador_ventas: 1.1 } }));
      const { hallazgos } = verificarExpediente({ rutas: corrida.rutas, ci: alterada, corrida: leerCorrida(corrida.rutas)!, ronda: 1 });
      assert.ok(hallazgos.some((h) => h.codigo === 'configuracion_alterada' && h.severidad === 'critica'));

      mkdirSync(join(codigoFalso, 'config'));
      writeFileSync(join(codigoFalso, 'config', 'experiment.json'), JSON.stringify({ ...crudo, rondas_maximas: 99 }));
      cpSync(join(RAIZ, 'config', 'experiment.lock.json'), join(codigoFalso, 'config', 'experiment.lock.json'));
      const otra = corridaTemporal();
      try {
        await assert.rejects(
          Controlador.iniciar({ rutas: crearRutas(otra.rutas.raizCorrida, codigoFalso), modo: 'prueba', aislamiento: 'en-proceso', preflight: preflightSintetico('0'.repeat(64)) }),
          /no están selladas o cambiaron/,
        );
      } finally {
        otra.limpiar();
      }
    } finally {
      corrida.limpiar();
      rmSync(codigoFalso, { recursive: true, force: true });
    }
  });

  test('el torneo oficial exige autorización humana y la semilla sellada', async () => {
    const corrida = corridaTemporal();
    try {
      await assert.rejects(controlador(corrida.rutas, { modo: 'oficial' }), /autorizado-por/);
      await assert.rejects(controlador(corrida.rutas, { modo: 'oficial', autorizadoPor: 'Persona', semilla: 1 }), /semilla sellada/);
    } finally {
      corrida.limpiar();
    }
  });
});
