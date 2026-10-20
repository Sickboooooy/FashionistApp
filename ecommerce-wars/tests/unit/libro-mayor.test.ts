import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Evento } from '../../shared/schemas/eventos.ts';
import { EMPRESAS } from '../../shared/types/dominio.ts';
import {
  contabilizar,
  erroresDeAsiento,
  indicadoresContables,
  movimientosDeEvento,
  saldos,
  verificarPartidaDoble,
} from '../../simulation/economics/libro-mayor.ts';
import { indicadoresDesdeEventos } from '../../simulation/economics/proyeccion.ts';
import { estadoInicial, type PlanAplicado } from '../../simulation/market/estado.ts';
import { simularPeriodo } from '../../simulation/market/motor.ts';
import { config } from '../ayudantes.ts';

function rondaConActividad() {
  const ci = config();
  const inicial = estadoInicial(ci);
  // SKU de categorías que ambos proveedores surten (el motor sólo recibe planes ya validados).
  const skus = ['PLY-BAS', 'PLY-GRA', 'VES-MID', 'SUD-CAP', 'TEN-URB', 'BOL-TOT'];
  const plan = (proveedor: string): PlanAplicado => ({
    ordenes: skus.map((sku) => ({ sku, proveedorId: proveedor, unidades: 30 })),
    reposicion: [],
    campanas: [{ id: 'c1', canal: 'redes_sociales', segmento: 'jovenes_tendencia', angulo: 'tendencia', mensaje: 'x', presupuestoDiario: 50_000, dias: [1, 2, 3, 4, 5, 6, 7] }],
    precios: {},
    listado: skus,
    promociones: [{ id: 'p1', tipo: 'descuento', alcance: 'todo', objetivo: null, pct: 15, dias: [5, 6, 7] }],
    envio: { costo: 9900, gratisDesde: 79900 },
    fichas: [{ sku: skus[0] as string, pasos: 1 }],
  });
  return simularPeriodo({ ci, estado: inicial, ronda: 1, planes: { alfa: plan('PRV-ALT'), omega: plan('PRV-EXP') } });
}

test('cada tipo de evento económico produce un asiento balanceado', () => {
  const { eventos } = rondaConActividad();
  const tipos = new Set<string>();
  for (const e of eventos) {
    const movimientos = movimientosDeEvento(e);
    if (movimientos.length === 0) continue;
    tipos.add(e.tipo);
    const debe = movimientos.reduce((a, m) => a + m.debe, 0);
    const haber = movimientos.reduce((a, m) => a + m.haber, 0);
    assert.equal(debe, haber, `${e.tipo} descuadrado`);
  }
  for (const t of ['capital_inicial', 'orden_emitida', 'orden_recibida', 'pedido_creado', 'pedido_cobrado', 'pedido_enviado', 'comision_pago', 'campana_ejecutada', 'gasto_operativo']) {
    assert.ok(tipos.has(t), `faltó contabilizar ${t}`);
  }
});

test('el libro mayor concilia con los eventos, la caja y el inventario del estado', () => {
  const { estado, eventos } = rondaConActividad();
  for (const empresa of EMPRESAS) {
    const libro = contabilizar(empresa, eventos);
    assert.deepEqual(verificarPartidaDoble(libro), []);
    assert.deepEqual(indicadoresContables(libro, 1), indicadoresDesdeEventos(eventos, empresa, 1));
    const s = saldos(libro);
    const emp = estado.empresas[empresa];
    assert.equal(s['1100'], emp.caja, 'caja');
    assert.equal(s['1200'], Object.values(emp.existencias).reduce((a, x) => a + x.valor, 0), 'inventario');
    assert.equal(s['1210'], estado.transito.filter((o) => o.empresa === empresa).reduce((a, o) => a + o.costoTotal, 0), 'tránsito');
    assert.equal(-s['3100'], config().cfg.capital_inicial, 'capital');
    const total = Object.values(s).reduce((a, b) => a + b, 0);
    assert.equal(total, 0, 'la suma de saldos deudores y acreedores es cero');
  }
});

test('un asiento descuadrado se detecta', () => {
  const errores = erroresDeAsiento({
    id: 'AS-X',
    ronda: 1,
    dia: 1,
    seqEvento: null,
    tipoEvento: 'manual',
    movimientos: [
      { cuenta: '1100', debe: 100, haber: 0 },
      { cuenta: '4100', debe: 0, haber: 99 },
    ],
  });
  assert.equal(errores.length, 1);
});

test('un pago con pasivo pendiente se registra contra obligaciones por insolvencia', () => {
  const e = {
    ronda: 1,
    dia: 1,
    actor: 'mercado',
    empresa: 'alfa',
    tipo: 'gasto_operativo',
    datos: { obligacion: { monto: 1000, pagado: 400, pendiente: 600 } },
  } as Evento;
  assert.deepEqual(movimientosDeEvento(e), [
    { cuenta: '6400', debe: 1000, haber: 0 },
    { cuenta: '1100', debe: 0, haber: 400 },
    { cuenta: '2100', debe: 0, haber: 600 },
  ]);
});
