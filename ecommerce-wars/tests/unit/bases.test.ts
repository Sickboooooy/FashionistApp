import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fechaSimulada } from '../../shared/calendario.ts';
import { parsearConfig } from '../../shared/config.ts';
import { hashCanonico, jsonCanonico } from '../../shared/hash.ts';
import { prorratear } from '../../shared/money.ts';
import { crearRng, derivarSemilla, rngPara } from '../../shared/rng.ts';
import { RAIZ } from '../ayudantes.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('el generador pseudoaleatorio es determinista por semilla y etiquetas', () => {
  const a = rngPara(42, 'mercado', 1, 3);
  const b = rngPara(42, 'mercado', 1, 3);
  const c = rngPara(42, 'mercado', 1, 4);
  const serie = (r: ReturnType<typeof crearRng>) => Array.from({ length: 20 }, () => r.siguiente());
  const sa = serie(a);
  assert.deepEqual(sa, serie(b));
  assert.notDeepEqual(sa, serie(c));
  assert.ok(sa.every((x) => x >= 0 && x < 1));
  assert.equal(derivarSemilla(42, 'x'), derivarSemilla(42, 'x'));
});

test('las distribuciones del generador respetan sus rangos', () => {
  const r = crearRng(7);
  for (let i = 0; i < 500; i++) {
    const n = r.entero(3, 5);
    assert.ok(n >= 3 && n <= 5 && Number.isInteger(n));
    const b = r.binomial(100, 0.3);
    assert.ok(b >= 0 && b <= 100);
    assert.ok(r.poisson(4) >= 0);
  }
  assert.deepEqual([...r.barajar([1, 2, 3, 4])].sort(), [1, 2, 3, 4]);
});

test('el JSON canónico no depende del orden de las claves', () => {
  assert.equal(jsonCanonico({ b: 1, a: { d: [3, { y: 1, x: 2 }], c: 'z' } }), '{"a":{"c":"z","d":[3,{"x":2,"y":1}]},"b":1}');
  assert.equal(hashCanonico({ x: 1, y: 2 }), hashCanonico({ y: 2, x: 1 }));
  assert.equal(jsonCanonico({ a: undefined, b: 1 }), '{"b":1}');
  assert.throws(() => jsonCanonico({ a: Number.NaN }), /no finito/);
});

test('el prorrateo reparte exactamente el total', () => {
  for (const [total, pesos] of [
    [1000, [1, 1, 1]],
    [7, [3, 5]],
    [0, [1, 2]],
    [12_345, [0.1, 0.7, 0.2]],
  ] as Array<[number, number[]]>) {
    const partes = prorratear(total, pesos);
    assert.equal(partes.reduce((a, b) => a + b, 0), total);
    assert.ok(partes.every(Number.isInteger));
  }
});

test('el tiempo simulado se calcula desde la fecha de inicio, no desde el reloj', () => {
  assert.equal(fechaSimulada('2027-01-04', 1), '2027-01-04');
  assert.equal(fechaSimulada('2027-01-04', 8), '2027-01-11');
});

test('la configuración se valida estrictamente', () => {
  const crudo = JSON.parse(readFileSync(join(RAIZ, 'config', 'experiment.json'), 'utf8'));
  assert.doesNotThrow(() => parsearConfig(JSON.stringify(crudo)));
  assert.throws(() => parsearConfig(JSON.stringify({ ...crudo, campo_inventado: true })), /inválido/);
  const segmentos = crudo.segmentos.map((s: { proporcion: number }, i: number) => (i === 0 ? { ...s, proporcion: 0.9 } : s));
  assert.throws(() => parsearConfig(JSON.stringify({ ...crudo, segmentos })), /proporciones/);
});
