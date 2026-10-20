import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { Diario, hashGenesis } from '../../harness/event-bus/diario.ts';
import { evaluarRonda } from '../../harness/evaluator/juez.ts';
import { revisarIntegridad } from '../../harness/evaluator/integridad.ts';
import { verificarExpediente } from '../../harness/evaluator/verificador.ts';
import { leerCorrida } from '../../harness/orchestrator/corrida.ts';
import { crearRutas, enCorrida, RELATIVAS, type Rutas } from '../../harness/permissions/rutas.ts';
import { FuenteDiario } from '../../apps/tribunal/fuente.ts';
import { config, controlador, corridaTemporal, RAIZ, type CorridaTemporal } from '../ayudantes.ts';

let original: CorridaTemporal;
const copias: string[] = [];

before(async () => {
  original = corridaTemporal();
  const c = await controlador(original.rutas);
  await c.avanzarRonda();
  await c.avanzarRonda();
});
after(() => {
  original.limpiar();
  for (const d of copias) rmSync(d, { recursive: true, force: true });
});

/** Copia independiente de la corrida para manipularla sin afectar a las demás pruebas. */
function copia(): Rutas {
  const dir = mkdtempSync(join(tmpdir(), 'ew-manipulada-'));
  copias.push(dir);
  cpSync(original.rutas.raizCorrida, dir, { recursive: true });
  return crearRutas(dir, RAIZ);
}

function editar(rutas: Rutas, relativa: string, fn: (texto: string) => string): void {
  const ruta = enCorrida(rutas, relativa);
  writeFileSync(ruta, fn(readFileSync(ruta, 'utf8')));
}

function hallazgos(rutas: Rutas, ronda = 1) {
  const corrida = leerCorrida(rutas)!;
  return verificarExpediente({ rutas, ci: config(), corrida, ronda }).hallazgos;
}

describe('protección de evidencias', () => {
  test('el expediente íntegro no tiene hallazgos', () => {
    assert.deepEqual(hallazgos(original.rutas, 1), []);
    assert.deepEqual(hallazgos(original.rutas, 2), []);
  });

  test('alterar un monto en los eventos del expediente se detecta como incidencia crítica', () => {
    const r = copia();
    editar(r, `${RELATIVAS.expediente(1)}/eventos.jsonl`, (t) => t.replace(/"cobrado":(\d+)/, (_, n) => `"cobrado":${Number(n) + 100000}`));
    const h = hallazgos(r);
    assert.ok(h.some((x) => x.codigo === 'integridad_evidencia' && x.severidad === 'critica'));
  });

  test('alterar el estado final o el manifiesto rompe sus hashes', () => {
    const r = copia();
    editar(r, `${RELATIVAS.expediente(1)}/estado-final.json`, (t) => t.replace(/"caja": (\d+)/, (_, n) => `"caja": ${Number(n) + 1}`));
    assert.ok(hallazgos(r).some((x) => x.detalle.includes('estado-final.json')));

    const r2 = copia();
    editar(r2, `${RELATIVAS.expediente(1)}/manifiesto.json`, (t) => t.replace(/"seqFin": (\d+)/, (_, n) => `"seqFin": ${Number(n) - 1}`));
    assert.ok(hallazgos(r2).some((x) => x.detalle.includes('manifiesto fue alterado')));
  });

  test('la ronda siguiente detecta que se alteró la anterior (continuidad)', () => {
    const r = copia();
    editar(r, `${RELATIVAS.expediente(1)}/estado-final.json`, (t) => t.replace(/"caja": (\d+)/, (_, n) => `"caja": ${Number(n) + 50_000}`));
    assert.ok(hallazgos(r, 2).some((x) => x.codigo === 'continuidad_estado'));
  });

  test('una sentencia modificada después de emitirse se detecta', () => {
    const r = copia();
    editar(r, RELATIVAS.veredicto(1, 'json'), (t) => t.replace(/"motivo": "[^"]*"/, '"motivo": "ALFA gana por decreto"'));
    const corrida = leerCorrida(r)!;
    const revision = revisarIntegridad(r, config(), corrida);
    assert.equal(revision.ok, false);
    assert.ok(revision.sentencias[0]?.errores.some((e) => e.includes('modificada')));
  });

  test('las sentencias son inmutables: el Juez se niega a reescribirlas', () => {
    const r = copia();
    assert.throws(() => evaluarRonda(r, 1), /inmutable/);
  });

  test('un diario con una línea alterada o truncado se rechaza', () => {
    const r = copia();
    const genesis = hashGenesis(config().hash, config().cfg.semilla);
    editar(r, RELATIVAS.diario, (t) => {
      const lineas = t.split('\n');
      lineas.splice(5, 1);
      return lineas.join('\n');
    });
    assert.throws(() => Diario.abrir(enCorrida(r, RELATIVAS.diario), genesis), /corrupto/);

    const fuente = new FuenteDiario(enCorrida(r, RELATIVAS.diario), config(), genesis);
    fuente.sondear();
    assert.equal(fuente.integridad().ok, false, 'el War Room también lo detecta');
  });
});
