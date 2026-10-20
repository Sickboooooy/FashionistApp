import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { leerManifiesto } from '../../harness/orchestrator/evidencia.ts';
import { controlador, corridaTemporal } from '../ayudantes.ts';

async function correr(rondas: number, opciones: { semilla?: number; porDias?: boolean } = {}) {
  const corrida = corridaTemporal();
  const c = await controlador(corrida.rutas, { semilla: opciones.semilla, rondasMaximas: 12 });
  for (let r = 0; r < rondas && !c.terminado; r++) {
    if (opciones.porDias) for (let d = 0; d < c.ci.cfg.dias_por_periodo; d++) await c.avanzarDia();
    else await c.avanzarRonda();
  }
  const manifiestos = Array.from({ length: rondas }, (_, i) => leerManifiesto(corrida.rutas, i + 1)?.hashExpediente ?? null);
  const veredictos = c.proyeccion.veredictos.map((v) => v.hashVeredicto);
  const resultado = { ultimoHash: c.estado().ultimoHash, manifiestos, veredictos };
  corrida.limpiar();
  return resultado;
}

describe('determinismo con semilla fija', () => {
  test('dos corridas con la misma semilla producen diarios, expedientes y sentencias idénticos', async () => {
    const a = await correr(2);
    const b = await correr(2);
    assert.equal(a.ultimoHash, b.ultimoHash);
    assert.deepEqual(a.manifiestos, b.manifiestos);
    assert.deepEqual(a.veredictos, b.veredictos);
    assert.ok(a.manifiestos.every((h) => h !== null));
  });

  test('una semilla distinta produce una historia distinta', async () => {
    const a = await correr(1);
    const b = await correr(1, { semilla: 7 });
    assert.notEqual(a.ultimoHash, b.ultimoHash);
  });

  test('avanzar día por día equivale a avanzar por semana (el ritmo no altera resultados)', async () => {
    const semanas = await correr(2);
    const dias = await correr(2, { porDias: true });
    assert.equal(dias.ultimoHash, semanas.ultimoHash);
  });
});
