import type { Centavos } from '../../shared/money.ts';
import type { Evento, Obligacion } from '../../shared/schemas/eventos.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import { completarIndicadores, indicadoresVacios, type IndicadoresFinancieros } from './proyeccion.ts';

/** Catálogo de cuentas del libro mayor simulado (partida doble). */
export const CUENTAS = {
  '1100': 'Caja',
  '1200': 'Inventario',
  '1210': 'Inventario en tránsito',
  '2100': 'Obligaciones pendientes por insolvencia',
  '3100': 'Capital social',
  '4100': 'Ventas brutas',
  '4110': 'Descuentos sobre ventas',
  '4120': 'Cancelaciones',
  '4130': 'Devoluciones sobre ventas',
  '4200': 'Ingresos por envío',
  '5100': 'Costo de ventas',
  '6100': 'Marketing',
  '6200': 'Logística',
  '6300': 'Comisiones de pago',
  '6400': 'Operación',
  '6500': 'Almacenaje',
  '6600': 'Mermas',
  '6700': 'Contenido de fichas',
} as const;
export type Cuenta = keyof typeof CUENTAS;

export interface Movimiento {
  cuenta: Cuenta;
  debe: Centavos;
  haber: Centavos;
}

export interface Asiento {
  id: string;
  ronda: number;
  dia: number;
  seqEvento: number | null;
  tipoEvento: string;
  movimientos: Movimiento[];
}

export interface LibroMayor {
  empresa: EmpresaId;
  asientos: Asiento[];
}

const cargo = (cuenta: Cuenta, monto: Centavos): Movimiento => ({ cuenta, debe: monto, haber: 0 });
const abono = (cuenta: Cuenta, monto: Centavos): Movimiento => ({ cuenta, debe: 0, haber: monto });

function obligatorio(cuentaGasto: Cuenta, ob: Obligacion): Movimiento[] {
  return [cargo(cuentaGasto, ob.monto), abono('1100', ob.pagado), abono('2100', ob.pendiente)];
}

/** Reglas de contabilización: cada evento económico produce un asiento balanceado. */
export function movimientosDeEvento(e: Evento): Movimiento[] {
  switch (e.tipo) {
    case 'capital_inicial':
      return [cargo('1100', e.datos.monto), abono('3100', e.datos.monto)];
    case 'orden_emitida':
      return [
        cargo('1210', e.datos.orden.costoTotal),
        abono('1100', e.datos.orden.costoTotal),
        cargo('6200', e.datos.flete),
        abono('1100', e.datos.flete),
      ];
    case 'orden_recibida':
      return [cargo('1200', e.datos.costoTotal), abono('1210', e.datos.costoTotal)];
    case 'ficha_mejorada':
      return [cargo('6700', e.datos.costo), abono('1100', e.datos.costo)];
    case 'campana_ejecutada':
      return [cargo('6100', e.datos.gasto), abono('1100', e.datos.gasto)];
    case 'gasto_operativo':
      return obligatorio('6400', e.datos.obligacion);
    case 'almacenaje':
      return obligatorio('6500', e.datos.obligacion);
    case 'pedido_creado': {
      const costo = e.datos.pedido.lineas.reduce((a, l) => a + l.costo, 0);
      return [cargo('5100', costo), abono('1200', costo)];
    }
    case 'pedido_cobrado':
      return [
        cargo('1100', e.datos.cobrado),
        cargo('4110', e.datos.descuento),
        abono('4100', e.datos.bruto),
        abono('4200', e.datos.envioCobrado),
      ];
    case 'comision_pago':
      return obligatorio('6300', e.datos.obligacion);
    case 'pedido_cancelado':
      return [
        cargo('4120', e.datos.netoLineas),
        cargo('4200', e.datos.envioCobrado),
        abono('1100', e.datos.reembolso.pagado),
        abono('2100', e.datos.reembolso.pendiente),
        cargo('1200', e.datos.costoRevertido),
        abono('5100', e.datos.costoRevertido),
      ];
    case 'pedido_enviado':
      return obligatorio('6200', e.datos.obligacion);
    case 'devolucion_procesada':
      return [
        cargo('4130', e.datos.reembolso.monto),
        abono('1100', e.datos.reembolso.pagado),
        abono('2100', e.datos.reembolso.pendiente),
        cargo(e.datos.reabastecido ? '1200' : '6600', e.datos.costo),
        abono('5100', e.datos.costo),
        ...obligatorio('6200', e.datos.logistica),
      ];
    case 'pasivo_pagado':
      return [cargo('2100', e.datos.monto), abono('1100', e.datos.monto)];
    default:
      return [];
  }
}

/** Contabiliza los eventos de una empresa. Lanza si algún asiento no cuadra. */
export function contabilizar(empresa: EmpresaId, eventos: ReadonlyArray<Evento & { seq?: number }>): LibroMayor {
  const asientos: Asiento[] = [];
  for (const e of eventos) {
    if (e.empresa !== empresa) continue;
    const movimientos = movimientosDeEvento(e).filter((m) => m.debe !== 0 || m.haber !== 0);
    if (movimientos.length === 0) continue;
    const asiento: Asiento = {
      id: `AS-${empresa.toUpperCase()}-${String(asientos.length + 1).padStart(6, '0')}`,
      ronda: e.ronda,
      dia: e.dia,
      seqEvento: e.seq ?? null,
      tipoEvento: e.tipo,
      movimientos,
    };
    const errores = erroresDeAsiento(asiento);
    if (errores.length > 0) throw new Error(`asiento inválido (${e.tipo}): ${errores.join('; ')}`);
    asientos.push(asiento);
  }
  return { empresa, asientos };
}

export function erroresDeAsiento(asiento: Asiento): string[] {
  const errores: string[] = [];
  let debe = 0;
  let haber = 0;
  for (const m of asiento.movimientos) {
    if (!(m.cuenta in CUENTAS)) errores.push(`cuenta desconocida ${m.cuenta}`);
    if (!Number.isSafeInteger(m.debe) || !Number.isSafeInteger(m.haber) || m.debe < 0 || m.haber < 0) {
      errores.push(`monto inválido en ${m.cuenta}`);
    }
    debe += m.debe;
    haber += m.haber;
  }
  if (debe !== haber) errores.push(`${asiento.id}: debe ${debe} ≠ haber ${haber}`);
  return errores;
}

export function verificarPartidaDoble(libro: LibroMayor): string[] {
  return libro.asientos.flatMap(erroresDeAsiento);
}

/** Saldo deudor (debe − haber) por cuenta. Con `ronda`, sólo los movimientos de esa ronda. */
export function saldos(libro: LibroMayor, filtro: { ronda?: number; hastaRonda?: number } = {}): Record<Cuenta, Centavos> {
  const resultado = Object.fromEntries(Object.keys(CUENTAS).map((c) => [c, 0])) as Record<Cuenta, Centavos>;
  for (const a of libro.asientos) {
    if (filtro.ronda !== undefined && a.ronda !== filtro.ronda) continue;
    if (filtro.hastaRonda !== undefined && a.ronda > filtro.hastaRonda) continue;
    for (const m of a.movimientos) resultado[m.cuenta] += m.debe - m.haber;
  }
  return resultado;
}

/** Estado de resultados del periodo, derivado exclusivamente del libro mayor. */
export function indicadoresContables(libro: LibroMayor, ronda: number): IndicadoresFinancieros {
  const s = saldos(libro, { ronda });
  // `0 - x` y no `-x`: un saldo cero debe dar 0, nunca -0.
  return completarIndicadores({
    ...indicadoresVacios(),
    ventasBrutas: 0 - s['4100'],
    descuentos: s['4110'],
    cancelaciones: s['4120'],
    devoluciones: s['4130'],
    ingresosEnvio: 0 - s['4200'],
    costoVentas: s['5100'],
    mermas: s['6600'],
    marketing: s['6100'],
    logistica: s['6200'],
    comisiones: s['6300'],
    operacion: s['6400'],
    almacenaje: s['6500'],
    fichas: s['6700'],
  });
}
