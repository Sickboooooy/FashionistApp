import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, test } from 'node:test';
import type { Resolucion } from '../../harness/evaluator/juez.ts';
import { comandoAislado, ejecutarAislado } from '../../harness/permissions/sandbox.ts';
import { enCorrida, prepararEstructura, RELATIVAS } from '../../harness/permissions/rutas.ts';
import { controlador, corridaTemporal, fixture } from '../ayudantes.ts';

describe('endurecimiento tras la revisión de seguridad', () => {
  test('en macOS los procesos de agentes no tienen red (no pueden consultar la tienda rival)', { skip: comandoAislado([]).redBloqueada ? false : 'sin sandbox de red en esta plataforma' }, async () => {
    const servidor = createServer((_, res) => res.end('datos privados de OMEGA')).listen(0, '127.0.0.1');
    await new Promise((r) => servidor.once('listening', r));
    const { port } = servidor.address() as AddressInfo;
    const { rutas, limpiar } = corridaTemporal();
    try {
      prepararEstructura(rutas);
      const r = await ejecutarAislado<{ conecto: boolean; codigo?: string }>({
        principal: 'alfa:director',
        rutas,
        script: fixture('proceso-red.ts'),
        entrada: { url: `http://127.0.0.1:${port}/api/eventos` },
        timeoutMs: 20_000,
      });
      assert.equal(r.ok, true, r.error);
      assert.equal(r.redBloqueada, true);
      assert.equal(r.resultado?.conecto, false);
    } finally {
      servidor.close();
      limpiar();
    }
  });

  test('una respuesta malformada de un proceso hijo se rechaza sin tumbar al harness', async () => {
    const { rutas, limpiar } = corridaTemporal();
    try {
      prepararEstructura(rutas);
      const r = await ejecutarAislado({ principal: 'alfa:director', rutas, script: fixture('proceso-respuesta-falsa.ts'), entrada: {}, timeoutMs: 20_000 });
      assert.equal(r.ok, false);
      assert.match(r.error ?? '', /formato inválido/);
      assert.deepEqual(r.incidentes, []);
    } finally {
      limpiar();
    }
  });

  test('un libro mayor corrupto se atribuye sólo a su empresa y no anula la ronda ni detiene el torneo', async () => {
    const { rutas, limpiar } = corridaTemporal();
    try {
      const c = await controlador(rutas, { modulosEquipo: { alfa: fixture('equipo-libro-corrupto.ts') } });
      await c.avanzarRonda();
      assert.equal(c.terminado, false, 'el torneo sigue');
      const s = JSON.parse(readFileSync(enCorrida(rutas, RELATIVAS.veredicto(1, 'json')), 'utf8')) as Resolucion;
      assert.notEqual(s.resultado, 'ronda_invalida');
      assert.ok(s.incidencias.some((h) => h.codigo === 'discrepancia_contable' && h.empresa === 'alfa' && h.severidad === 'grave'));
      assert.ok(!s.incidencias.some((h) => h.severidad === 'critica'));
      assert.equal(s.comprobaciones?.alfa.find((x) => x.regla === 'V6')?.cumple, false);
      assert.equal(s.comprobaciones?.omega.find((x) => x.regla === 'V6')?.cumple, true, 'OMEGA no paga por la falta de ALFA');
    } finally {
      limpiar();
    }
  });
});
