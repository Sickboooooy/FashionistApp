import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Promocion } from '../../simulation/market/estado.ts';
import { cotizarCarrito, precioEfectivo, type Tarifario } from '../../simulation/market/precios.ts';
import { config } from '../ayudantes.ts';

const ci = config();
const jeans = ci.producto.get('JEA-SLM')!;

function tarifario(promociones: Promocion[], gratisDesde = 100_000): Tarifario {
  return { precios: { 'JEA-SLM': 100_000, 'GOR-BAS': 30_000 }, promociones, envio: { costo: 9_900, gratisDesde } };
}

test('se aplica el mejor descuento vigente, sin acumular descuentos por artículo', () => {
  const t = tarifario([
    { id: 'a', tipo: 'descuento', alcance: 'todo', objetivo: null, pct: 10, dias: [1] },
    { id: 'b', tipo: 'descuento', alcance: 'categoria', objetivo: 'jeans', pct: 25, dias: [1] },
    { id: 'c', tipo: 'descuento', alcance: 'sku', objetivo: 'JEA-SLM', pct: 50, dias: [2] },
  ]);
  const pe = precioEfectivo(t, jeans, 1);
  assert.equal(pe.descuentoPct, 25);
  assert.equal(pe.precioFinal, 75_000);
  assert.equal(precioEfectivo(t, jeans, 2).descuentoPct, 50, 'la promoción por SKU sólo vale su día');
  assert.equal(precioEfectivo(t, jeans, 3).descuentoPct, 0);
});

test('la compra múltiple se prorratea exactamente entre las líneas', () => {
  const t = tarifario([{ id: 'm', tipo: 'compra_multiple', minUnidades: 2, pct: 10, dias: [1] }]);
  const cot = cotizarCarrito(t, ci.producto, [{ sku: 'JEA-SLM', unidades: 1 }, { sku: 'GOR-BAS', unidades: 1 }], 1);
  assert.equal(cot.subtotal, 117_000);
  assert.equal(cot.descuento, 13_000);
  assert.equal(cot.lineas.reduce((a, l) => a + l.descuento, 0), cot.descuento);
  assert.equal(cot.lineas.reduce((a, l) => a + l.neto, 0), cot.subtotal);
  assert.equal(cot.promocionMultipleId, 'm');
});

test('el envío es gratis a partir del umbral', () => {
  const sinEnvio = cotizarCarrito(tarifario([], 100_000), ci.producto, [{ sku: 'JEA-SLM', unidades: 1 }], 1);
  assert.equal(sinEnvio.envio, 0);
  const conEnvio = cotizarCarrito(tarifario([], 100_001), ci.producto, [{ sku: 'JEA-SLM', unidades: 1 }], 1);
  assert.equal(conEnvio.envio, 9_900);
  assert.equal(conEnvio.total, 109_900);
});

test('un SKU desconocido no se puede cotizar', () => {
  assert.throws(() => cotizarCarrito(tarifario([]), ci.producto, [{ sku: 'XXX-YYY', unidades: 1 }], 1), /desconocido/);
});
