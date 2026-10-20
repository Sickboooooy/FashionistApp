import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filtrar } from '../../shared/schemas/eventos.ts';
import { abonar, cargarObligacion, disponible, gastar, puedeGastar } from '../../simulation/economics/tesoreria.ts';
import { estadoInicial, planVacio, type EstadoEmpresa, type PlanAplicado } from '../../simulation/market/estado.ts';
import { simularPeriodo } from '../../simulation/market/motor.ts';
import { config } from '../ayudantes.ts';

const empresa = (caja: number, pasivo = 0): EstadoEmpresa => ({ ...estadoInicial(config()).empresas.alfa, caja, pasivo });

test('el gasto discrecional nunca invade la reserva obligatoria', () => {
  const reserva = config().cfg.reserva_obligatoria;
  const e = empresa(reserva + 1000);
  assert.equal(disponible(e, reserva), 1000);
  assert.equal(puedeGastar(e, 1000, reserva), true);
  assert.equal(puedeGastar(e, 1001, reserva), false);
  assert.throws(() => gastar(e, 1001, reserva), /excede el disponible/);
  assert.equal(e.caja, reserva + 1000, 'un gasto rechazado no toca la caja');
});

test('con pasivo pendiente no hay gasto discrecional', () => {
  const e = empresa(5_000_000, 1);
  assert.equal(disponible(e, 0), 0);
  assert.equal(puedeGastar(e, 1, 0), false);
});

test('una obligación mayor a la caja deja caja en cero y el resto como pasivo', () => {
  const e = empresa(300);
  const ob = cargarObligacion(e, 1000);
  assert.deepEqual(ob, { monto: 1000, pagado: 300, pendiente: 700 });
  assert.equal(e.caja, 0);
  assert.equal(e.pasivo, 700);
  assert.equal(abonar(e, 500), 500, 'el ingreso liquida primero el pasivo');
  assert.equal(e.pasivo, 200);
  assert.equal(e.caja, 0);
});

test('el motor rechaza órdenes de compra que exceden el saldo y la caja nunca queda negativa', () => {
  const ci = config();
  const inicial = estadoInicial(ci);
  const compraImposible: PlanAplicado = {
    ...planVacio(inicial.empresas.alfa),
    ordenes: ci.cfg.productos.map((p) => ({ sku: p.sku, proveedorId: 'PRV-ALT', unidades: 2000 })),
    listado: ci.cfg.productos.map((p) => p.sku),
  };
  const { estado, eventos } = simularPeriodo({ ci, estado: inicial, ronda: 1, planes: { alfa: compraImposible, omega: planVacio(inicial.empresas.omega) } });
  const rechazadas = filtrar(eventos, 'orden_rechazada', 'alfa');
  assert.ok(rechazadas.length > 0, 'debió rechazar órdenes por saldo');
  assert.ok(rechazadas.every((e) => e.datos.motivo === 'saldo_insuficiente'));
  const emitidas = filtrar(eventos, 'orden_emitida', 'alfa');
  const gastado = emitidas.reduce((a, e) => a + e.datos.orden.costoTotal + e.datos.flete, 0);
  assert.ok(gastado <= ci.cfg.capital_inicial - ci.cfg.reserva_obligatoria);
  for (const e of filtrar(eventos, 'cierre_dia')) assert.ok(e.datos.cajas.alfa >= 0 && e.datos.cajas.omega >= 0);
  assert.ok(estado.empresas.alfa.caja >= 0);
});
