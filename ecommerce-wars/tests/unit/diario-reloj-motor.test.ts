import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { hashCanonico } from '../../shared/hash.ts';
import type { Evento } from '../../shared/schemas/eventos.ts';
import { Diario, hashGenesis, verificarCadena } from '../../harness/event-bus/diario.ts';
import { Reloj } from '../../harness/scheduler/reloj.ts';
import { estadoInicial, planVacio } from '../../simulation/market/estado.ts';
import { abrirPeriodo, cerrarPeriodo, periodoCompleto, simularDia, simularPeriodo } from '../../simulation/market/motor.ts';
import { config, corridaTemporal } from '../ayudantes.ts';

const evento = (n: number): Evento =>
  ({ ronda: 1, dia: 1, actor: 'harness', empresa: null, tipo: 'cierre_dia', datos: { cajas: { alfa: n, omega: n } } }) as Evento;

test('el diario encadena hashes y continúa la secuencia al reabrirse', () => {
  const { rutas, limpiar } = corridaTemporal();
  try {
    const ruta = join(rutas.raizCorrida, 'diario.jsonl');
    const genesis = hashGenesis('a'.repeat(64), 1);
    const d1 = Diario.abrir(ruta, genesis);
    const primeros = d1.publicar([evento(1), evento(2)]);
    assert.deepEqual(primeros.map((e) => e.seq), [0, 1]);
    assert.equal(primeros[0]?.prevHash, genesis);
    assert.equal(primeros[1]?.prevHash, primeros[0]?.hash);
    const d2 = Diario.abrir(ruta, genesis);
    assert.equal(d2.publicar([evento(3)])[0]?.seq, 2);
    assert.equal(verificarCadena(d2.leer(), genesis).ok, true);
  } finally {
    limpiar();
  }
});

test('un diario alterado se rechaza al abrirlo', () => {
  const { rutas, limpiar } = corridaTemporal();
  try {
    const ruta = join(rutas.raizCorrida, 'diario.jsonl');
    const genesis = hashGenesis('b'.repeat(64), 1);
    Diario.abrir(ruta, genesis).publicar([evento(1), evento(2)]);
    writeFileSync(ruta, readFileSync(ruta, 'utf8').replace('"alfa":1', '"alfa":999'));
    assert.throws(() => Diario.abrir(ruta, genesis), /diario corrupto/);
  } finally {
    limpiar();
  }
});

test('el reloj pausa, reanuda y cambia de velocidad sin perder turnos', async () => {
  const reloj = new Reloj({ msPorDia: 5, pausado: true });
  let turnos = 0;
  const espera = reloj.esperarTurno().then(() => turnos++);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(turnos, 0, 'en pausa no avanza');
  reloj.reanudar();
  await espera;
  assert.equal(turnos, 1);
  reloj.fijarVelocidad(999_999);
  assert.equal(reloj.msPorDia, 60_000, 'la velocidad se acota');
});

test('simular día por día produce exactamente lo mismo que el periodo completo', () => {
  const ci = config();
  const inicial = estadoInicial(ci);
  const planes = { alfa: planVacio(inicial.empresas.alfa), omega: planVacio(inicial.empresas.omega) };
  planes.alfa = { ...planes.alfa, ordenes: [{ sku: 'PLY-BAS', proveedorId: 'PRV-EXP', unidades: 40 }], listado: ['PLY-BAS'] };
  const completo = simularPeriodo({ ci, estado: inicial, ronda: 1, planes });

  const { sesion } = abrirPeriodo({ ci, estado: inicial, ronda: 1, planes });
  while (!periodoCompleto(sesion)) simularDia(sesion);
  const porDias = cerrarPeriodo(sesion);
  assert.equal(hashCanonico(porDias.eventos), hashCanonico(completo.eventos));
  assert.equal(hashCanonico(porDias.estado), hashCanonico(completo.estado));
  assert.equal(inicial.empresas.alfa.caja, ci.cfg.capital_inicial, 'la entrada no se modifica');
});

test('el motor exige rondas en secuencia', () => {
  const ci = config();
  const inicial = estadoInicial(ci);
  const planes = { alfa: planVacio(inicial.empresas.alfa), omega: planVacio(inicial.empresas.omega) };
  assert.throws(() => simularPeriodo({ ci, estado: inicial, ronda: 2, planes }), /fuera de secuencia/);
});
