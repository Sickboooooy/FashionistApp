import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { leerEventos } from '../../harness/event-bus/diario.ts';
import type { Resolucion } from '../../harness/evaluator/juez.ts';
import { construirVista } from '../../harness/orchestrator/vistas.ts';
import { banderasPermiso } from '../../harness/permissions/acl.ts';
import { ejecutarAislado } from '../../harness/permissions/sandbox.ts';
import { enCorrida, prepararEstructura, RELATIVAS } from '../../harness/permissions/rutas.ts';
import type { Escaparate } from '../../shared/contracts/vista.ts';
import { controlador, corridaTemporal, fixture, RAIZ } from '../ayudantes.ts';

describe('aislamiento entre competidores', () => {
  test('un proceso de ALFA no puede leer lo privado de OMEGA ni escribir sentencias, aun usando fs directamente', async () => {
    const { rutas, limpiar } = corridaTemporal();
    try {
      prepararEstructura(rutas);
      writeFileSync(enCorrida(rutas, 'data/private/omega/secreto.json'), '{"caja":1}');
      writeFileSync(enCorrida(rutas, 'data/private/alfa/propio.json'), '{"ok":true}');
      const r = await ejecutarAislado<Record<string, { ok: boolean; codigo: string | null }>>({
        principal: 'alfa:director',
        rutas,
        script: fixture('proceso-espia.ts'),
        entrada: { raizCorrida: rutas.raizCorrida },
        timeoutMs: 20_000,
      });
      assert.equal(r.ok, true, r.error ?? r.stderr);
      const res = r.resultado!;
      assert.deepEqual(res.leerPropio, { ok: true, codigo: null });
      assert.deepEqual(res.escribirPropio, { ok: true, codigo: null });
      assert.deepEqual(res.leerRival, { ok: false, codigo: 'ERR_ACCESS_DENIED' });
      assert.deepEqual(res.escribirSentencia, { ok: false, codigo: 'ERR_ACCESS_DENIED' });
      assert.equal(existsSync(enCorrida(rutas, 'reports/verdicts/ronda-01.json')), false);
    } finally {
      limpiar();
    }
  });

  test('el espionaje queda registrado como infracción grave y la empresa pierde la candidatura de la ronda', async () => {
    const { rutas, limpiar } = corridaTemporal();
    try {
      const c = await controlador(rutas, { aislamiento: 'proceso', modulosEquipo: { alfa: fixture('equipo-espia.ts') } });
      await c.avanzarRonda();
      const bitacora = JSON.parse(readFileSync(enCorrida(rutas, 'data/private/alfa/espia.json'), 'utf8'));
      assert.deepEqual(bitacora, { porAlmacen: 'denegado', directo: 'ERR_ACCESS_DENIED' }, 'ambas vías bloqueadas');

      const incidentes = leerEventos(enCorrida(rutas, RELATIVAS.diario)).filter((e) => e.tipo === 'incidente' && e.empresa === 'alfa');
      assert.ok(incidentes.some((e) => e.tipo === 'incidente' && e.datos.codigo === 'acceso_denegado' && e.datos.severidad === 'grave'));

      const s = JSON.parse(readFileSync(enCorrida(rutas, RELATIVAS.veredicto(1, 'json')), 'utf8')) as Resolucion;
      assert.ok(s.incidencias.some((h) => h.codigo === 'acceso_denegado' && h.empresa === 'alfa'));
      assert.equal(s.comprobaciones?.alfa.find((x) => x.regla === 'V6')?.cumple, false);
      assert.notEqual(s.ganador, 'alfa');
    } finally {
      limpiar();
    }
  });

  test('la vista que reciben los agentes sólo contiene lo propio y lo público', async () => {
    const { rutas, limpiar } = corridaTemporal();
    try {
      const c = await controlador(rutas);
      await c.avanzarRonda();
      const estado = JSON.parse(readFileSync(enCorrida(rutas, RELATIVAS.expediente(1), 'estado-final.json'), 'utf8'));
      const escaparate = JSON.parse(readFileSync(enCorrida(rutas, RELATIVAS.escaparate('omega')), 'utf8')) as Escaparate;
      const vista = construirVista({ ci: c.ci, empresa: 'alfa', ronda: 2, estado, historial: [], escaparateRival: escaparate, resultados: [] });
      assert.equal(vista.empresa, 'alfa');
      assert.equal(vista.propio.caja, estado.empresas.alfa.caja);
      assert.deepEqual(Object.keys(vista).sort(), ['diaGlobalInicio', 'diasPorPeriodo', 'empresa', 'historial', 'propio', 'publico', 'reglas', 'ronda', 'semillaAgente']);
      const claves = Object.keys(vista.publico.escaparateRival?.productos[0] ?? {}).sort();
      assert.deepEqual(claves, ['calidadFicha', 'categoria', 'descuentoPct', 'disponibilidad', 'nombre', 'precioFinal', 'precioLista', 'sku']);
      assert.ok(!('existencias' in (vista.publico.escaparateRival ?? {})), 'el rival no expone unidades exactas');
      for (const t of vista.propio.enTransito) assert.deepEqual(Object.keys(t).sort(), ['diaLlegadaEstimada', 'proveedorId', 'sku', 'unidades']);
    } finally {
      limpiar();
    }
  });

  test('las instrucciones internas (perfil) de una empresa no son legibles para el proceso de la otra', () => {
    const { rutas, limpiar } = corridaTemporal();
    try {
      const banderas = banderasPermiso('omega:director', rutas);
      assert.ok(banderas.includes(`--allow-fs-read=${join(RAIZ, 'agents', 'omega')}`));
      assert.ok(!banderas.some((b) => b.includes(join('agents', 'alfa'))));
    } finally {
      limpiar();
    }
  });
});
