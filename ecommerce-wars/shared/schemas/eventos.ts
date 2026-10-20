import { z } from 'zod';
import type { Centavos } from '../money.ts';
import type { EmpresaId, Principal, Severidad } from '../types/dominio.ts';

/** Pago obligatorio: lo que no alcanza a cubrir la caja se registra como pasivo. */
export interface Obligacion {
  monto: Centavos;
  pagado: Centavos;
  pendiente: Centavos;
}

export interface LineaPedido {
  sku: string;
  unidades: number;
  precioLista: Centavos;
  /** Descuento total de la línea (promoción por artículo + prorrateo de compra múltiple). */
  descuento: Centavos;
  /** precioLista * unidades - descuento. */
  neto: Centavos;
  costo: Centavos;
  calidad: number;
}

export interface Pedido {
  id: string;
  clienteId: string;
  segmento: string;
  origen: 'organico' | 'campana';
  canal: string | null;
  campanaId: string | null;
  recurrente: boolean;
  lineas: LineaPedido[];
  bruto: Centavos;
  descuento: Centavos;
  envioCobrado: Centavos;
  /** bruto - descuento + envioCobrado. */
  cobrado: Centavos;
}

export interface TraficoDia {
  visitasOrganicas: number;
  visitasPagadas: number;
  cambiosEntrantes: number;
  cambiosSalientes: number;
  sinStock: Record<string, number>;
  abandonos: number;
  noConvertidas: number;
  pedidos: number;
}

export interface CambioEstrategia {
  campo: string;
  anterior: string | number | null;
  nuevo: string | number | null;
}

/** Catálogo cerrado de eventos. Todo hecho económico del experimento es uno de estos. */
export interface DatosPorTipo {
  ronda_iniciada: { semilla: number; modo: 'prueba' | 'oficial'; hashConfig: string; diaGlobalInicio: number };
  capital_inicial: { monto: Centavos };
  plan_recibido: { hashPlan: string; estrategia: string };
  decision_registrada: {
    rol: string;
    resumen: string;
    hipotesis: { texto: string; metrica: string; valor: number };
    presupuestoComprometido: Centavos;
    hashDecision: string;
  };
  estrategia_cambiada: { estrategia: string; cambios: CambioEstrategia[] };
  precio_cambiado: { sku: string; anterior: Centavos; nuevo: Centavos };
  campana_iniciada: {
    campanaId: string;
    canal: string;
    segmento: string;
    angulo: string;
    mensaje: string;
    presupuestoDiario: Centavos;
    dias: number[];
  };
  campana_detenida: {
    campanaId: string;
    motivo: 'fin_periodo';
    gastoTotal: Centavos;
    impresiones: number;
    clics: number;
    visitas: number;
  };
  decision_rechazada: { rol: string; codigo: string; detalle: string };
  plan_aplicado: {
    hashPlan: string;
    ordenes: number;
    campanas: number;
    promociones: number;
    preciosCambiados: number;
    listado: string[];
  };
  orden_emitida: {
    orden: {
      id: string;
      sku: string;
      proveedorId: string;
      unidades: number;
      costoUnitario: Centavos;
      costoTotal: Centavos;
      calidad: number;
      diaLlegadaEstimada: number;
      origen: 'plan' | 'reposicion';
    };
    flete: Centavos;
  };
  orden_rechazada: {
    sku: string;
    proveedorId: string;
    unidades: number;
    costoTotal: Centavos;
    motivo: string;
    origen: 'plan' | 'reposicion';
  };
  orden_recibida: {
    ordenId: string;
    sku: string;
    unidades: number;
    costoTotal: Centavos;
    calidad: number;
    retrasoDias: number;
  };
  ficha_mejorada: { sku: string; costo: Centavos; calidadAnterior: number; calidadNueva: number };
  ficha_rechazada: { sku: string; motivo: string };
  campana_ejecutada: {
    campanaId: string;
    canal: string;
    segmento: string;
    angulo: string;
    gasto: Centavos;
    impresiones: number;
    clics: number;
    visitas: number;
    presion: boolean;
  };
  campana_pausada: { campanaId: string; motivo: string };
  gasto_operativo: { obligacion: Obligacion };
  almacenaje: { unidades: number; obligacion: Obligacion };
  /** Alta del pedido: el inventario sale de existencias (costo de ventas). */
  pedido_creado: { pedido: Pedido };
  /** Cobro simulado aprobado: se reconoce el ingreso. */
  pedido_cobrado: {
    pedidoId: string;
    bruto: Centavos;
    descuento: Centavos;
    envioCobrado: Centavos;
    cobrado: Centavos;
  };
  comision_pago: { pedidoId: string; obligacion: Obligacion };
  /** netoLineas/envioCobrado son 0 si el pedido nunca se cobró (pago rechazado). */
  pedido_cancelado: {
    pedidoId: string;
    motivo: 'pago_rechazado' | 'cliente';
    netoLineas: Centavos;
    envioCobrado: Centavos;
    costoRevertido: Centavos;
    lineas: Array<{ sku: string; unidades: number; costo: Centavos; calidad: number }>;
    reembolso: Obligacion;
  };
  pedido_enviado: { pedidoId: string; obligacion: Obligacion };
  devolucion_procesada: {
    devolucionId: string;
    pedidoId: string;
    sku: string;
    unidades: number;
    costo: Centavos;
    reabastecido: boolean;
    reembolso: Obligacion;
    logistica: Obligacion;
  };
  pasivo_pagado: { monto: Centavos };
  insolvencia: { concepto: string; pendiente: Centavos };
  trafico_diario: TraficoDia;
  cierre_dia: { cajas: Record<EmpresaId, Centavos> };
  memoria_actualizada: { hashMemoria: string; lecciones: string[] };
  incidente: {
    codigo: string;
    severidad: Severidad;
    principal: string;
    detalle: string;
  };
  cierre_periodo: {
    hashEstadoFinal: string;
    eventosMercado: number;
    hashResumen: string;
    hashLibros: Record<EmpresaId, string>;
  };
  veredicto_emitido: {
    expediente: string;
    resultado: 'ganador' | 'sin_ganador' | 'ronda_invalida';
    ganador: EmpresaId | null;
    hashExpediente: string;
    hashVeredicto: string;
  };
}

export type TipoEvento = keyof DatosPorTipo;

/** Códigos públicos del War Room (apartado 16.3) y su correspondencia con el catálogo interno. */
export const CODIGOS_WAR_ROOM = [
  'ROUND_STARTED',
  'INVENTORY_PURCHASED',
  'PRICE_CHANGED',
  'CAMPAIGN_STARTED',
  'CAMPAIGN_STOPPED',
  'ORDER_CREATED',
  'ORDER_PAID_SIMULATED',
  'ORDER_CANCELLED',
  'ORDER_REFUNDED',
  'STRATEGY_CHANGED',
  'AGENT_DECISION_RECORDED',
  'ROUND_CLOSED',
  'JUDGE_VERDICT',
] as const;
export type CodigoWarRoom = (typeof CODIGOS_WAR_ROOM)[number];

const CODIGO_POR_TIPO: Partial<Record<TipoEvento, CodigoWarRoom>> = {
  ronda_iniciada: 'ROUND_STARTED',
  orden_emitida: 'INVENTORY_PURCHASED',
  precio_cambiado: 'PRICE_CHANGED',
  campana_iniciada: 'CAMPAIGN_STARTED',
  campana_detenida: 'CAMPAIGN_STOPPED',
  campana_pausada: 'CAMPAIGN_STOPPED',
  pedido_creado: 'ORDER_CREATED',
  pedido_cobrado: 'ORDER_PAID_SIMULATED',
  pedido_cancelado: 'ORDER_CANCELLED',
  devolucion_procesada: 'ORDER_REFUNDED',
  estrategia_cambiada: 'STRATEGY_CHANGED',
  decision_registrada: 'AGENT_DECISION_RECORDED',
  cierre_periodo: 'ROUND_CLOSED',
  veredicto_emitido: 'JUDGE_VERDICT',
};

export function codigoWarRoom(tipo: string): CodigoWarRoom | null {
  return CODIGO_POR_TIPO[tipo as TipoEvento] ?? null;
}

export type Evento<T extends TipoEvento = TipoEvento> = {
  [K in T]: {
    ronda: number;
    dia: number;
    actor: Principal;
    empresa: EmpresaId | null;
    tipo: K;
    datos: DatosPorTipo[K];
  };
}[T];

export type EventoSellado = Evento & { seq: number; prevHash: string; hash: string };

export type EventoDe<K extends TipoEvento> = Extract<Evento, { tipo: K }>;

export function esTipo<K extends TipoEvento>(evento: Evento, tipo: K): evento is EventoDe<K> {
  return evento.tipo === tipo;
}

export function filtrar<K extends TipoEvento>(
  eventos: readonly Evento[],
  tipo: K,
  empresa?: EmpresaId,
  ronda?: number,
): Array<EventoDe<K>> {
  return eventos.filter(
    (e): e is EventoDe<K> =>
      e.tipo === tipo && (empresa === undefined || e.empresa === empresa) && (ronda === undefined || e.ronda === ronda),
  );
}

/** Esquema del sobre sellado, para validar eventos leídos de disco (entrada no confiable). */
export const EventoSelladoSchema = z.strictObject({
  seq: z.number().int().nonnegative(),
  ronda: z.number().int().nonnegative(),
  dia: z.number().int().nonnegative(),
  actor: z.string().min(1),
  empresa: z.enum(['alfa', 'omega']).nullable(),
  tipo: z.string().min(1),
  datos: z.record(z.string(), z.unknown()),
  prevHash: z.string().regex(/^[0-9a-f]{64}$/),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
});
