import assert from 'node:assert/strict';
import { test } from 'node:test';
import { controlador, corridaTemporal } from '../ayudantes.ts';

test('tras una interrupción a mitad de ronda, el harness retoma sin duplicar ni alterar eventos', async () => {
  const continua = corridaTemporal();
  const interrumpida = corridaTemporal();
  try {
    const a = await controlador(continua.rutas);
    await a.avanzarRonda();
    await a.avanzarRonda();

    const b1 = await controlador(interrumpida.rutas);
    for (let d = 0; d < 10; d++) await b1.avanzarDia();
    assert.equal(b1.estado().ronda, 2);
    assert.equal(b1.estado().dia, 3);

    const b2 = await controlador(interrumpida.rutas);
    assert.equal(b2.estado().ronda, 2, 'retoma la ronda en curso');
    assert.equal(b2.estado().dia, 3, 'retoma el día en curso');
    assert.equal(b2.estado().ultimoSeq, b1.estado().ultimoSeq, 'no duplica eventos');
    await b2.avanzarRonda();
    assert.equal(b2.estado().ultimoHash, a.estado().ultimoHash, 'mismo resultado que sin interrupción');
  } finally {
    continua.limpiar();
    interrumpida.limpiar();
  }
});

test('los equipos en procesos aislados (--permission) deciden exactamente igual que en proceso', async () => {
  const aislada = corridaTemporal();
  const local = corridaTemporal();
  try {
    const a = await controlador(aislada.rutas, { aislamiento: 'proceso' });
    const b = await controlador(local.rutas, { aislamiento: 'en-proceso' });
    await a.avanzarRonda();
    await b.avanzarRonda();
    assert.equal(a.estado().ultimoHash, b.estado().ultimoHash);
    assert.equal(a.proyeccion.veredictos.length, 1);
  } finally {
    aislada.limpiar();
    local.limpiar();
  }
});
