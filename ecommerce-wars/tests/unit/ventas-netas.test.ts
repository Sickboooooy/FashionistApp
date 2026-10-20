import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Evento, Pedido } from '../../shared/schemas/eventos.ts';
import { indicadoresDesdeEventos, pedidosValidosDesdeEventos } from '../../simulation/economics/proyeccion.ts';

const base = { ronda: 1, dia: 1, actor: 'mercado' as const, empresa: 'alfa' as const };
const obligacion = (monto: number) => ({ monto, pagado: monto, pendiente: 0 });

function pedido(id: string, bruto: number, descuento: number, unidades = 1, costo = 30_000): Pedido {
  return {
    id,
    clienteId: 'C-0001',
    segmento: 'premium',
    origen: 'organico',
    canal: null,
    campanaId: null,
    recurrente: false,
    lineas: [{ sku: 'JEA-SLM', unidades, precioLista: bruto / unidades, descuento, neto: bruto - descuento, costo, calidad: 0.7 }],
    bruto,
    descuento,
    envioCobrado: 0,
    cobrado: bruto - descuento,
  };
}

function cobrado(p: Pedido): Evento[] {
  return [
    { ...base, tipo: 'pedido_creado', datos: { pedido: p } },
    { ...base, tipo: 'pedido_cobrado', datos: { pedidoId: p.id, bruto: p.bruto, descuento: p.descuento, envioCobrado: p.envioCobrado, cobrado: p.cobrado } },
  ] as Evento[];
}

const eventos: Evento[] = [
  ...cobrado(pedido('ALFA-1', 100_000, 10_000)),
  ...cobrado(pedido('ALFA-2', 20_000, 0)),
  {
    ...base,
    tipo: 'pedido_cancelado',
    datos: { pedidoId: 'ALFA-2', motivo: 'cliente', netoLineas: 20_000, envioCobrado: 0, costoRevertido: 30_000, lineas: [{ sku: 'JEA-SLM', unidades: 1, costo: 30_000, calidad: 0.7 }], reembolso: obligacion(20_000) },
  },
  ...cobrado(pedido('ALFA-3', 50_000, 0)),
  {
    ...base,
    dia: 4,
    tipo: 'devolucion_procesada',
    datos: { devolucionId: 'DEV-1', pedidoId: 'ALFA-3', sku: 'JEA-SLM', unidades: 1, costo: 30_000, reabastecido: true, reembolso: obligacion(50_000), logistica: obligacion(9_000) },
  },
  { ...base, tipo: 'campana_ejecutada', datos: { campanaId: 'c1', canal: 'buscadores', segmento: 'premium', angulo: 'calidad', gasto: 5_000, impresiones: 100, clics: 4, visitas: 3, presion: false } },
] as Evento[];

test('ventas netas = cobradas − descuentos − cancelaciones − devoluciones', () => {
  const ind = indicadoresDesdeEventos(eventos, 'alfa', 1);
  assert.equal(ind.ventasBrutas, 170_000);
  assert.equal(ind.descuentos, 10_000);
  assert.equal(ind.cancelaciones, 20_000);
  assert.equal(ind.devoluciones, 50_000);
  assert.equal(ind.ventasNetas, 90_000);
});

test('el margen de contribución resta costos variables y marketing', () => {
  const ind = indicadoresDesdeEventos(eventos, 'alfa', 1);
  // costo de ventas: 3 × 30,000 creados − 30,000 cancelado − 30,000 devuelto y reabastecido
  assert.equal(ind.costoVentas, 30_000);
  assert.equal(ind.logistica, 9_000);
  assert.equal(ind.marketing, 5_000);
  assert.equal(ind.margenContribucion, 90_000 - 30_000 - 9_000 - 5_000);
});

test('un pedido cancelado o devuelto por completo no es un pedido válido', () => {
  assert.equal(pedidosValidosDesdeEventos(eventos, 'alfa', 1), 1);
});

test('los indicadores de una empresa ignoran los eventos de la otra', () => {
  const ind = indicadoresDesdeEventos(eventos, 'omega', 1);
  assert.equal(ind.ventasNetas, 0);
  assert.equal(pedidosValidosDesdeEventos(eventos, 'omega', 1), 0);
});

test('sin ventas, las ventas netas son cero (nunca negativas por ausencia de datos)', () => {
  assert.equal(indicadoresDesdeEventos([], 'alfa', 1).ventasNetas, 0);
});
