import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filtrar } from '../../shared/schemas/eventos.ts';
import { estadoInicial, planVacio } from '../../simulation/market/estado.ts';
import { simularPeriodo } from '../../simulation/market/motor.ts';
import { config } from '../ayudantes.ts';

test('ambas empresas inician con idéntico capital de 100,000 MXN', () => {
  const ci = config();
  const e = estadoInicial(ci);
  assert.equal(ci.cfg.capital_inicial, 10_000_000);
  assert.equal(e.empresas.alfa.caja, ci.cfg.capital_inicial);
  assert.equal(e.empresas.omega.caja, ci.cfg.capital_inicial);
});

test('fuera del identificador, el estado inicial de ALFA y OMEGA es idéntico', () => {
  const e = estadoInicial(config());
  const { empresa: _a, ...alfa } = e.empresas.alfa;
  const { empresa: _o, ...omega } = e.empresas.omega;
  assert.deepEqual(alfa, omega);
  assert.deepEqual(e.conciencia.alfa, e.conciencia.omega);
  assert.deepEqual(e.contadores.alfa, e.contadores.omega);
});

test('la ronda 1 registra un evento de capital inicial idéntico para cada empresa', () => {
  const ci = config();
  const inicial = estadoInicial(ci);
  const { eventos } = simularPeriodo({
    ci,
    estado: inicial,
    ronda: 1,
    planes: { alfa: planVacio(inicial.empresas.alfa), omega: planVacio(inicial.empresas.omega) },
  });
  const capital = filtrar(eventos, 'capital_inicial');
  assert.equal(capital.length, 2);
  assert.deepEqual(
    capital.map((e) => [e.empresa, e.datos.monto]),
    [
      ['alfa', ci.cfg.capital_inicial],
      ['omega', ci.cfg.capital_inicial],
    ],
  );
});
