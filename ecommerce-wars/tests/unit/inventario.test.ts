import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filtrar } from '../../shared/schemas/eventos.ts';
import { agregarUnidades, retirarUnidades } from '../../simulation/inventory/inventario.ts';
import { estadoInicial, planVacio, type PlanAplicado } from '../../simulation/market/estado.ts';
import { simularPeriodo } from '../../simulation/market/motor.ts';
import { config } from '../ayudantes.ts';

const vacia = { sku: 'PLY-BAS', unidades: 0, valor: 0, calidad: 0 };

test('las altas promedian costo y calidad ponderados', () => {
  const a = agregarUnidades(vacia, 10, 10_000, 0.5);
  const b = agregarUnidades(a, 30, 45_000, 0.9);
  assert.equal(b.unidades, 40);
  assert.equal(b.valor, 55_000);
  assert.equal(b.calidad, 0.8);
});

test('no se pueden retirar más unidades de las existentes', () => {
  const ex = agregarUnidades(vacia, 3, 3_000, 0.6);
  assert.throws(() => retirarUnidades(ex, 4), /existencia insuficiente/);
  assert.throws(() => retirarUnidades(ex, 0), /unidades inválidas/);
});

test('la última unidad se lleva el residuo: el valor nunca queda descuadrado', () => {
  let ex = agregarUnidades(vacia, 3, 1_000, 0.6);
  let costo = 0;
  for (let i = 0; i < 3; i++) {
    const r = retirarUnidades(ex, 1);
    costo += r.costo;
    ex = r.existencia;
  }
  assert.equal(costo, 1_000);
  assert.deepEqual(ex, { sku: 'PLY-BAS', unidades: 0, valor: 0, calidad: 0 });
});

test('en el mercado, las unidades vendidas nunca superan las recibidas', () => {
  const ci = config();
  const inicial = estadoInicial(ci);
  const plan: PlanAplicado = {
    ...planVacio(inicial.empresas.alfa),
    ordenes: [{ sku: 'PLY-BAS', proveedorId: 'PRV-EXP', unidades: 25 }],
    listado: ['PLY-BAS'],
  };
  const { estado, eventos } = simularPeriodo({ ci, estado: inicial, ronda: 1, planes: { alfa: plan, omega: plan } });
  for (const empresa of ['alfa', 'omega'] as const) {
    const recibidas = filtrar(eventos, 'orden_recibida', empresa).reduce((a, e) => a + e.datos.unidades, 0);
    const vendidas = filtrar(eventos, 'pedido_creado', empresa).reduce((a, e) => a + e.datos.pedido.lineas.reduce((s, l) => s + l.unidades, 0), 0);
    const reingresadas = filtrar(eventos, 'pedido_cancelado', empresa).reduce((a, e) => a + e.datos.lineas.reduce((s, l) => s + l.unidades, 0), 0);
    const devueltas = filtrar(eventos, 'devolucion_procesada', empresa).filter((e) => e.datos.reabastecido).reduce((a, e) => a + e.datos.unidades, 0);
    assert.ok(vendidas > 0, `${empresa} debió vender algo`);
    assert.equal(estado.empresas[empresa].existencias['PLY-BAS']?.unidades, recibidas - vendidas + reingresadas + devueltas);
    assert.ok(Object.values(estado.empresas[empresa].existencias).every((x) => x.unidades >= 0 && x.valor >= 0));
  }
});
