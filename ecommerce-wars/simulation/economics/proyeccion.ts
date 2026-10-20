import type { Evento } from '../../shared/schemas/eventos.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';

/*
 * Proyección de indicadores a partir del diario de eventos.
 *
 * Este módulo NO tiene importaciones en tiempo de ejecución: lo usan el auditor del
 * Juez (Node) y el War Room (navegador, servido sin tipos). Es una ruta de cálculo
 * independiente del libro mayor que lleva el agente de Finanzas; ambas deben coincidir.
 *
 * Fórmulas (también en docs/ARQUITECTURA.md):
 *   ventasNetas        = ventasBrutas − descuentos − cancelaciones − devoluciones
 *   margenContribucion = ventasNetas + ingresosEnvio − costoVentas − mermas
 *                        − logistica − comisiones − marketing
 *   utilidadOperativa  = margenContribucion − operacion − almacenaje − fichas
 */

export interface IndicadoresFinancieros {
  ventasBrutas: number;
  descuentos: number;
  cancelaciones: number;
  devoluciones: number;
  ventasNetas: number;
  ingresosEnvio: number;
  costoVentas: number;
  mermas: number;
  marketing: number;
  logistica: number;
  comisiones: number;
  operacion: number;
  almacenaje: number;
  fichas: number;
  margenContribucion: number;
  utilidadOperativa: number;
}

type EventoEntrada = Evento & { seq?: number };
const EMPRESAS_PROYECCION: readonly EmpresaId[] = ['alfa', 'omega'];

export function indicadoresVacios(): IndicadoresFinancieros {
  return {
    ventasBrutas: 0,
    descuentos: 0,
    cancelaciones: 0,
    devoluciones: 0,
    ventasNetas: 0,
    ingresosEnvio: 0,
    costoVentas: 0,
    mermas: 0,
    marketing: 0,
    logistica: 0,
    comisiones: 0,
    operacion: 0,
    almacenaje: 0,
    fichas: 0,
    margenContribucion: 0,
    utilidadOperativa: 0,
  };
}

export function completarIndicadores(base: IndicadoresFinancieros): IndicadoresFinancieros {
  const ventasNetas = base.ventasBrutas - base.descuentos - base.cancelaciones - base.devoluciones;
  const margenContribucion =
    ventasNetas + base.ingresosEnvio - base.costoVentas - base.mermas - base.logistica - base.comisiones - base.marketing;
  return {
    ...base,
    ventasNetas,
    margenContribucion,
    utilidadOperativa: margenContribucion - base.operacion - base.almacenaje - base.fichas,
  };
}

/** Efecto de un evento sobre un acumulador de indicadores (el acumulador es local del llamador). */
function acumularFinanciero(ind: IndicadoresFinancieros, e: EventoEntrada): void {
  switch (e.tipo) {
    case 'pedido_creado':
      ind.costoVentas += e.datos.pedido.lineas.reduce((a, l) => a + l.costo, 0);
      break;
    case 'pedido_cobrado':
      ind.ventasBrutas += e.datos.bruto;
      ind.descuentos += e.datos.descuento;
      ind.ingresosEnvio += e.datos.envioCobrado;
      break;
    case 'pedido_cancelado':
      ind.cancelaciones += e.datos.netoLineas;
      ind.ingresosEnvio -= e.datos.envioCobrado;
      ind.costoVentas -= e.datos.costoRevertido;
      break;
    case 'devolucion_procesada':
      ind.devoluciones += e.datos.reembolso.monto;
      ind.costoVentas -= e.datos.costo;
      if (!e.datos.reabastecido) ind.mermas += e.datos.costo;
      ind.logistica += e.datos.logistica.monto;
      break;
    case 'orden_emitida':
      ind.logistica += e.datos.flete;
      break;
    case 'pedido_enviado':
      ind.logistica += e.datos.obligacion.monto;
      break;
    case 'campana_ejecutada':
      ind.marketing += e.datos.gasto;
      break;
    case 'comision_pago':
      ind.comisiones += e.datos.obligacion.monto;
      break;
    case 'gasto_operativo':
      ind.operacion += e.datos.obligacion.monto;
      break;
    case 'almacenaje':
      ind.almacenaje += e.datos.obligacion.monto;
      break;
    case 'ficha_mejorada':
      ind.fichas += e.datos.costo;
      break;
    default:
      break;
  }
}

export function indicadoresDesdeEventos(
  eventos: readonly EventoEntrada[],
  empresa: EmpresaId,
  ronda?: number,
): IndicadoresFinancieros {
  const ind = indicadoresVacios();
  for (const e of eventos) {
    if (e.empresa === empresa && (ronda === undefined || e.ronda === ronda)) acumularFinanciero(ind, e);
  }
  return completarIndicadores(ind);
}

interface SeguimientoPedido {
  ronda: number;
  unidades: number;
  devueltas: number;
  pagado: boolean;
  cancelado: boolean;
  campanaId: string | null;
  neto: number;
  clienteId: string;
  recurrente: boolean;
}

/**
 * Pedido válido: creado en la ronda, cobrado, no cancelado y no devuelto en su
 * totalidad al cierre de esa misma ronda.
 */
function esValido(p: SeguimientoPedido): boolean {
  return p.pagado && !p.cancelado && p.devueltas < p.unidades;
}

export function pedidosValidosDesdeEventos(eventos: readonly EventoEntrada[], empresa: EmpresaId, ronda: number): number {
  const pedidos = new Map<string, SeguimientoPedido>();
  for (const e of eventos) {
    if (e.empresa !== empresa || e.ronda !== ronda) continue;
    seguirPedido(pedidos, e);
  }
  return [...pedidos.values()].filter((p) => p.ronda === ronda && esValido(p)).length;
}

function seguirPedido(pedidos: Map<string, SeguimientoPedido>, e: EventoEntrada): void {
  if (e.tipo === 'pedido_creado') {
    const p = e.datos.pedido;
    pedidos.set(p.id, {
      ronda: e.ronda,
      unidades: p.lineas.reduce((a, l) => a + l.unidades, 0),
      devueltas: 0,
      pagado: false,
      cancelado: false,
      campanaId: p.campanaId,
      neto: p.bruto - p.descuento,
      clienteId: p.clienteId,
      recurrente: p.recurrente,
    });
  } else if (e.tipo === 'pedido_cobrado') {
    const p = pedidos.get(e.datos.pedidoId);
    if (p) p.pagado = true;
  } else if (e.tipo === 'pedido_cancelado') {
    const p = pedidos.get(e.datos.pedidoId);
    if (p) p.cancelado = true;
  } else if (e.tipo === 'devolucion_procesada') {
    const p = pedidos.get(e.datos.pedidoId);
    if (p) p.devueltas += e.datos.unidades;
  }
}

// ---------------------------------------------------------------------------
// Proyección completa para el War Room.
// El acumulador se actualiza in situ: procesa decenas de miles de eventos en
// streaming y una copia por evento sería O(n²). Hacia fuera sólo se entregan
// instantáneas planas (instantanea()), nunca referencias al acumulador.
// ---------------------------------------------------------------------------

export interface MetricasCampana {
  campanaId: string;
  ronda: number;
  canal: string;
  segmento: string;
  angulo: string;
  mensaje: string;
  presupuestoDiario: number;
  activa: boolean;
  gasto: number;
  impresiones: number;
  clics: number;
  visitas: number;
  pedidos: number;
  ingresos: number;
}

interface AcumuladoEmpresa {
  financiero: IndicadoresFinancieros;
  caja: number;
  pedidosCreados: number;
  pedidosPagados: number;
  cancelacionesCliente: number;
  pagosRechazados: number;
  devoluciones: number;
  visitasOrganicas: number;
  visitasPagadas: number;
  abandonos: number;
  noConvertidas: number;
  cambiosEntrantes: number;
  cambiosSalientes: number;
  sinStock: Record<string, number>;
  ordenesCompra: number;
  unidadesCompradas: number;
  unidadesRecibidas: number;
  ordenesRechazadas: number;
  pedidosCampana: number;
  ingresosCampana: number;
}

function acumuladoVacio(): AcumuladoEmpresa {
  return {
    financiero: indicadoresVacios(),
    caja: 0,
    pedidosCreados: 0,
    pedidosPagados: 0,
    cancelacionesCliente: 0,
    pagosRechazados: 0,
    devoluciones: 0,
    visitasOrganicas: 0,
    visitasPagadas: 0,
    abandonos: 0,
    noConvertidas: 0,
    cambiosEntrantes: 0,
    cambiosSalientes: 0,
    sinStock: {},
    ordenesCompra: 0,
    unidadesCompradas: 0,
    unidadesRecibidas: 0,
    ordenesRechazadas: 0,
    pedidosCampana: 0,
    ingresosCampana: 0,
  };
}

export interface DecisionObservada {
  seq: number;
  ronda: number;
  diaGlobal: number;
  empresa: EmpresaId;
  actor: string;
  rol: string;
  resumen: string;
  hipotesis: { texto: string; metrica: string; valor: number };
  presupuestoComprometido: number;
  hashDecision: string;
  observado: number | null;
  cumplida: boolean | null;
}

export interface CambioEstrategiaObservado {
  seq: number;
  ronda: number;
  empresa: EmpresaId;
  estrategia: string;
  cambios: Array<{ campo: string; anterior: string | number | null; nuevo: string | number | null }>;
}

export interface Alerta {
  seq: number;
  ronda: number;
  dia: number;
  empresa: EmpresaId | null;
  nivel: 'info' | 'advertencia' | 'grave' | 'critica';
  codigo: string;
  detalle: string;
}

export interface VeredictoObservado {
  seq: number;
  ronda: number;
  expediente: string;
  resultado: string;
  ganador: EmpresaId | null;
  hashExpediente: string;
  hashVeredicto: string;
}

export interface Proyeccion {
  ultimoSeq: number;
  ultimoHash: string | null;
  ronda: number;
  dia: number;
  diasPorPeriodo: number;
  rondaAbierta: boolean;
  empresas: Record<EmpresaId, AcumuladoEmpresa>;
  porRonda: Map<number, Record<EmpresaId, AcumuladoEmpresa>>;
  inventario: Record<EmpresaId, Record<string, number>>;
  listado: Record<EmpresaId, string[]>;
  precios: Record<EmpresaId, Record<string, number>>;
  campanas: Record<EmpresaId, Record<string, MetricasCampana>>;
  pedidos: Map<string, SeguimientoPedido & { empresa: EmpresaId }>;
  clientes: Record<EmpresaId, Set<string>>;
  decisiones: DecisionObservada[];
  estrategias: CambioEstrategiaObservado[];
  alertas: Alerta[];
  veredictos: VeredictoObservado[];
}

export function crearProyeccion(diasPorPeriodo: number): Proyeccion {
  return {
    ultimoSeq: -1,
    ultimoHash: null,
    ronda: 0,
    dia: 0,
    diasPorPeriodo,
    rondaAbierta: false,
    empresas: { alfa: acumuladoVacio(), omega: acumuladoVacio() },
    porRonda: new Map(),
    inventario: { alfa: {}, omega: {} },
    listado: { alfa: [], omega: [] },
    precios: { alfa: {}, omega: {} },
    campanas: { alfa: {}, omega: {} },
    pedidos: new Map(),
    clientes: { alfa: new Set(), omega: new Set() },
    decisiones: [],
    estrategias: [],
    alertas: [],
    veredictos: [],
  };
}

function acumuladosDeRonda(p: Proyeccion, ronda: number): Record<EmpresaId, AcumuladoEmpresa> {
  let r = p.porRonda.get(ronda);
  if (!r) {
    r = { alfa: acumuladoVacio(), omega: acumuladoVacio() };
    p.porRonda.set(ronda, r);
  }
  return r;
}

function sumarInventario(p: Proyeccion, empresa: EmpresaId, sku: string, delta: number): void {
  p.inventario[empresa][sku] = (p.inventario[empresa][sku] ?? 0) + delta;
}

function aplicarOperativo(a: AcumuladoEmpresa, e: EventoEntrada, p: Proyeccion): void {
  acumularFinanciero(a.financiero, e);
  switch (e.tipo) {
    case 'pedido_creado':
      a.pedidosCreados++;
      break;
    case 'pedido_cobrado': {
      a.pedidosPagados++;
      const seguido = p.pedidos.get(e.datos.pedidoId);
      if (seguido?.campanaId) {
        a.pedidosCampana++;
        a.ingresosCampana += seguido.neto;
      }
      break;
    }
    case 'pedido_cancelado':
      if (e.datos.motivo === 'pago_rechazado') a.pagosRechazados++;
      else a.cancelacionesCliente++;
      break;
    case 'devolucion_procesada':
      a.devoluciones++;
      break;
    case 'trafico_diario':
      a.visitasOrganicas += e.datos.visitasOrganicas;
      a.visitasPagadas += e.datos.visitasPagadas;
      a.abandonos += e.datos.abandonos;
      a.noConvertidas += e.datos.noConvertidas;
      a.cambiosEntrantes += e.datos.cambiosEntrantes;
      a.cambiosSalientes += e.datos.cambiosSalientes;
      for (const [sku, n] of Object.entries(e.datos.sinStock)) a.sinStock[sku] = (a.sinStock[sku] ?? 0) + n;
      break;
    case 'orden_emitida':
      a.ordenesCompra++;
      a.unidadesCompradas += e.datos.orden.unidades;
      break;
    case 'orden_recibida':
      a.unidadesRecibidas += e.datos.unidades;
      break;
    case 'orden_rechazada':
      a.ordenesRechazadas++;
      break;
    default:
      break;
  }
}

function aplicarCampana(p: Proyeccion, e: EventoEntrada): void {
  if (!e.empresa) return;
  const propias = p.campanas[e.empresa];
  if (e.tipo === 'campana_iniciada') {
    propias[`${e.ronda}:${e.datos.campanaId}`] = {
      campanaId: e.datos.campanaId,
      ronda: e.ronda,
      canal: e.datos.canal,
      segmento: e.datos.segmento,
      angulo: e.datos.angulo,
      mensaje: e.datos.mensaje,
      presupuestoDiario: e.datos.presupuestoDiario,
      activa: true,
      gasto: 0,
      impresiones: 0,
      clics: 0,
      visitas: 0,
      pedidos: 0,
      ingresos: 0,
    };
    return;
  }
  const clave = `${e.ronda}:${'campanaId' in e.datos ? String(e.datos.campanaId) : ''}`;
  const c = propias[clave];
  if (!c) return;
  if (e.tipo === 'campana_ejecutada') {
    c.gasto += e.datos.gasto;
    c.impresiones += e.datos.impresiones;
    c.clics += e.datos.clics;
    c.visitas += e.datos.visitas;
  } else if (e.tipo === 'campana_detenida') {
    c.activa = false;
  }
}

function nivelAlerta(e: EventoEntrada): Alerta['nivel'] | null {
  switch (e.tipo) {
    case 'incidente':
      return e.datos.severidad === 'leve' ? 'advertencia' : e.datos.severidad;
    case 'decision_rechazada':
    case 'insolvencia':
      return 'advertencia';
    case 'orden_rechazada':
    case 'ficha_rechazada':
      return 'info';
    case 'campana_pausada':
      return e.datos.motivo === 'saldo_insuficiente' ? 'info' : null;
    default:
      return null;
  }
}

function detalleAlerta(e: EventoEntrada): { codigo: string; detalle: string } {
  switch (e.tipo) {
    case 'incidente':
      return { codigo: e.datos.codigo, detalle: e.datos.detalle };
    case 'decision_rechazada':
      return { codigo: `rechazo_${e.datos.rol}`, detalle: `${e.datos.codigo}: ${e.datos.detalle}` };
    case 'insolvencia':
      return { codigo: 'insolvencia', detalle: `${e.datos.concepto}: pendiente ${e.datos.pendiente}` };
    case 'orden_rechazada':
      return { codigo: 'orden_rechazada', detalle: `${e.datos.sku} ×${e.datos.unidades}: ${e.datos.motivo}` };
    case 'ficha_rechazada':
      return { codigo: 'ficha_rechazada', detalle: `${e.datos.sku}: ${e.datos.motivo}` };
    case 'campana_pausada':
      return { codigo: 'campana_pausada', detalle: `${e.datos.campanaId}: ${e.datos.motivo}` };
    default:
      return { codigo: e.tipo, detalle: '' };
  }
}

/** Aplica un evento sellado a la proyección. Ignora eventos ya aplicados (seq ≤ último). */
export function aplicarEvento(p: Proyeccion, e: EventoEntrada & { hash?: string }): void {
  const seq = e.seq ?? p.ultimoSeq + 1;
  if (seq <= p.ultimoSeq) return;
  p.ultimoSeq = seq;
  p.ultimoHash = e.hash ?? p.ultimoHash;

  if (e.tipo === 'ronda_iniciada') {
    p.ronda = e.ronda;
    p.dia = 0;
    p.rondaAbierta = true;
  } else if (e.tipo === 'cierre_dia') {
    p.dia = e.dia;
    p.empresas.alfa.caja = e.datos.cajas.alfa;
    p.empresas.omega.caja = e.datos.cajas.omega;
    const r = acumuladosDeRonda(p, e.ronda);
    r.alfa.caja = e.datos.cajas.alfa;
    r.omega.caja = e.datos.cajas.omega;
  } else if (e.tipo === 'cierre_periodo') {
    p.rondaAbierta = false;
    evaluarDecisiones(p, e.ronda);
  } else if (e.tipo === 'veredicto_emitido') {
    p.veredictos.push({ seq, ronda: e.ronda, ...e.datos });
  }

  const empresa = e.empresa;
  if (!empresa) {
    // Incidencias sin empresa (p. ej. fallo del Juez) también son alertas del tribunal.
    const nivelGlobal = nivelAlerta(e);
    if (nivelGlobal) p.alertas.push({ seq, ronda: e.ronda, dia: e.dia, empresa: null, nivel: nivelGlobal, ...detalleAlerta(e) });
    return;
  }

  if (e.tipo === 'capital_inicial') {
    p.empresas[empresa].caja = e.datos.monto;
  }
  if (e.tipo === 'pedido_creado') {
    const ped = e.datos.pedido;
    p.pedidos.set(ped.id, {
      empresa,
      ronda: e.ronda,
      unidades: ped.lineas.reduce((a, l) => a + l.unidades, 0),
      devueltas: 0,
      pagado: false,
      cancelado: false,
      campanaId: ped.campanaId,
      neto: ped.bruto - ped.descuento,
      clienteId: ped.clienteId,
      recurrente: ped.recurrente,
    });
    for (const l of ped.lineas) sumarInventario(p, empresa, l.sku, -l.unidades);
  }

  aplicarOperativo(p.empresas[empresa], e, p);
  aplicarOperativo(acumuladosDeRonda(p, e.ronda)[empresa], e, p);
  aplicarCampana(p, e);

  switch (e.tipo) {
    case 'pedido_cobrado': {
      const ped = p.pedidos.get(e.datos.pedidoId);
      if (ped) {
        ped.pagado = true;
        p.clientes[empresa].add(ped.clienteId);
        if (ped.campanaId) {
          const c = p.campanas[empresa][`${ped.ronda}:${ped.campanaId}`];
          if (c) {
            c.pedidos++;
            c.ingresos += ped.neto;
          }
        }
      }
      break;
    }
    case 'pedido_cancelado': {
      const ped = p.pedidos.get(e.datos.pedidoId);
      if (ped) ped.cancelado = true;
      for (const l of e.datos.lineas) sumarInventario(p, empresa, l.sku, l.unidades);
      break;
    }
    case 'devolucion_procesada': {
      const ped = p.pedidos.get(e.datos.pedidoId);
      if (ped) ped.devueltas += e.datos.unidades;
      if (e.datos.reabastecido) sumarInventario(p, empresa, e.datos.sku, e.datos.unidades);
      break;
    }
    case 'orden_recibida':
      sumarInventario(p, empresa, e.datos.sku, e.datos.unidades);
      break;
    case 'precio_cambiado':
      p.precios[empresa][e.datos.sku] = e.datos.nuevo;
      break;
    case 'plan_aplicado':
      p.listado[empresa] = [...e.datos.listado];
      break;
    case 'decision_registrada':
      p.decisiones.push({
        seq,
        ronda: e.ronda,
        diaGlobal: (e.ronda - 1) * p.diasPorPeriodo,
        empresa,
        actor: e.actor,
        rol: e.datos.rol,
        resumen: e.datos.resumen,
        hipotesis: { ...e.datos.hipotesis },
        presupuestoComprometido: e.datos.presupuestoComprometido,
        hashDecision: e.datos.hashDecision,
        observado: null,
        cumplida: null,
      });
      break;
    case 'estrategia_cambiada':
      p.estrategias.push({ seq, ronda: e.ronda, empresa, estrategia: e.datos.estrategia, cambios: e.datos.cambios.map((c) => ({ ...c })) });
      break;
    default:
      break;
  }

  const nivel = nivelAlerta(e);
  if (nivel) p.alertas.push({ seq, ronda: e.ronda, dia: e.dia, empresa, nivel, ...detalleAlerta(e) });
}

// ---------------------------------------------------------------------------
// Resúmenes e instantáneas
// ---------------------------------------------------------------------------

export interface ResumenEmpresa {
  financiero: IndicadoresFinancieros;
  caja: number;
  pedidosCreados: number;
  pedidosPagados: number;
  pedidosValidos: number;
  cancelados: number;
  pagosRechazados: number;
  devoluciones: number;
  visitas: number;
  visitasPagadas: number;
  conversion: number;
  ticketPromedio: number;
  tasaAbandono: number;
  tasaServicio: number;
  cac: number | null;
  roas: number | null;
  sinStock: Record<string, number>;
  unidadesCompradas: number;
  unidadesRecibidas: number;
  ordenesRechazadas: number;
}

function proporcion(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

function resumir(a: AcumuladoEmpresa, pedidosValidos: number): ResumenEmpresa {
  const financiero = completarIndicadores(a.financiero);
  const visitas = a.visitasOrganicas + a.visitasPagadas + a.cambiosEntrantes - a.cambiosSalientes;
  const quiebres = Object.values(a.sinStock).reduce((x, y) => x + y, 0);
  return {
    financiero,
    caja: a.caja,
    pedidosCreados: a.pedidosCreados,
    pedidosPagados: a.pedidosPagados,
    pedidosValidos,
    cancelados: a.cancelacionesCliente,
    pagosRechazados: a.pagosRechazados,
    devoluciones: a.devoluciones,
    visitas,
    visitasPagadas: a.visitasPagadas,
    conversion: proporcion(a.pedidosPagados, visitas),
    ticketPromedio: proporcion(financiero.ventasNetas, pedidosValidos),
    tasaAbandono: proporcion(a.abandonos, a.abandonos + a.pedidosPagados),
    tasaServicio: a.pedidosPagados + quiebres > 0 ? a.pedidosPagados / (a.pedidosPagados + quiebres) : 1,
    cac: a.pedidosCampana > 0 ? financiero.marketing / a.pedidosCampana : null,
    roas: financiero.marketing > 0 ? a.ingresosCampana / financiero.marketing : null,
    sinStock: { ...a.sinStock },
    unidadesCompradas: a.unidadesCompradas,
    unidadesRecibidas: a.unidadesRecibidas,
    ordenesRechazadas: a.ordenesRechazadas,
  };
}

function validosDe(p: Proyeccion, empresa: EmpresaId, ronda?: number): number {
  let n = 0;
  for (const ped of p.pedidos.values()) {
    if (ped.empresa === empresa && (ronda === undefined || ped.ronda === ronda) && esValido(ped)) n++;
  }
  return n;
}

export function resumenRonda(p: Proyeccion, ronda: number): Record<EmpresaId, ResumenEmpresa> | null {
  const r = p.porRonda.get(ronda);
  if (!r) return null;
  return { alfa: resumir(r.alfa, validosDe(p, 'alfa', ronda)), omega: resumir(r.omega, validosDe(p, 'omega', ronda)) };
}

/** Valor observado de una métrica de hipótesis en el resumen de la ronda. */
export function valorObservado(metrica: string, r: ResumenEmpresa): number | null {
  switch (metrica) {
    case 'ventas_netas':
      return r.financiero.ventasNetas;
    case 'margen_contribucion':
      return r.financiero.margenContribucion;
    case 'utilidad_operativa':
      return r.financiero.utilidadOperativa;
    case 'roas':
      return r.roas;
    case 'tasa_servicio':
      return r.tasaServicio;
    case 'conversion':
      return r.conversion;
    case 'ticket_promedio':
      return r.ticketPromedio;
    case 'caja_final':
      return r.caja;
    default:
      return null;
  }
}

function evaluarDecisiones(p: Proyeccion, ronda: number): void {
  const resumen = resumenRonda(p, ronda);
  if (!resumen) return;
  for (const d of p.decisiones) {
    if (d.ronda !== ronda) continue;
    const observado = valorObservado(d.hipotesis.metrica, resumen[d.empresa]);
    d.observado = observado;
    d.cumplida = observado === null ? null : observado >= d.hipotesis.valor;
  }
}

export interface InstantaneaProyeccion {
  ultimoSeq: number;
  ultimoHash: string | null;
  ronda: number;
  dia: number;
  diaGlobal: number;
  rondaAbierta: boolean;
  acumulado: Record<EmpresaId, ResumenEmpresa>;
  rondaActual: Record<EmpresaId, ResumenEmpresa> | null;
  historico: Array<{ ronda: number; empresas: Record<EmpresaId, ResumenEmpresa> }>;
  participacion: Record<EmpresaId, number>;
  inventario: Record<EmpresaId, Record<string, number>>;
  agotados: Record<EmpresaId, string[]>;
  precios: Record<EmpresaId, Record<string, number>>;
  campanas: Record<EmpresaId, Array<MetricasCampana & { ctr: number; cac: number | null; roas: number | null }>>;
  clientesUnicos: Record<EmpresaId, number>;
  decisiones: DecisionObservada[];
  estrategias: CambioEstrategiaObservado[];
  alertas: Alerta[];
  veredictos: VeredictoObservado[];
}

/** Copia plana y serializable del estado de la proyección. */
export function instantanea(p: Proyeccion, opciones: { maxAlertas?: number } = {}): InstantaneaProyeccion {
  const acumulado = {
    alfa: resumir(p.empresas.alfa, validosDe(p, 'alfa')),
    omega: resumir(p.empresas.omega, validosDe(p, 'omega')),
  };
  const historico = [...p.porRonda.keys()]
    .sort((a, b) => a - b)
    .map((ronda) => ({ ronda, empresas: resumenRonda(p, ronda) as Record<EmpresaId, ResumenEmpresa> }));
  const totalNetas = acumulado.alfa.financiero.ventasNetas + acumulado.omega.financiero.ventasNetas;
  const campanas = {} as InstantaneaProyeccion['campanas'];
  const agotados = {} as InstantaneaProyeccion['agotados'];
  for (const empresa of EMPRESAS_PROYECCION) {
    campanas[empresa] = Object.values(p.campanas[empresa]).map((c) => ({
      ...c,
      ctr: proporcion(c.clics, c.impresiones),
      cac: c.pedidos > 0 ? c.gasto / c.pedidos : null,
      roas: c.gasto > 0 ? c.ingresos / c.gasto : null,
    }));
    agotados[empresa] = p.listado[empresa].filter((sku) => (p.inventario[empresa][sku] ?? 0) <= 0);
  }
  const maxAlertas = opciones.maxAlertas ?? 200;
  return {
    ultimoSeq: p.ultimoSeq,
    ultimoHash: p.ultimoHash,
    ronda: p.ronda,
    dia: p.dia,
    diaGlobal: Math.max(0, (p.ronda - 1) * p.diasPorPeriodo + p.dia),
    rondaAbierta: p.rondaAbierta,
    acumulado,
    rondaActual: p.ronda > 0 ? resumenRonda(p, p.ronda) : null,
    historico,
    participacion: {
      alfa: proporcion(acumulado.alfa.financiero.ventasNetas, totalNetas),
      omega: proporcion(acumulado.omega.financiero.ventasNetas, totalNetas),
    },
    inventario: { alfa: { ...p.inventario.alfa }, omega: { ...p.inventario.omega } },
    agotados,
    precios: { alfa: { ...p.precios.alfa }, omega: { ...p.precios.omega } },
    campanas,
    clientesUnicos: { alfa: p.clientes.alfa.size, omega: p.clientes.omega.size },
    decisiones: p.decisiones.map((d) => ({ ...d, hipotesis: { ...d.hipotesis } })),
    estrategias: p.estrategias.map((s) => ({ ...s, cambios: s.cambios.map((c) => ({ ...c })) })),
    alertas: p.alertas.slice(-maxAlertas).map((a) => ({ ...a })),
    veredictos: p.veredictos.map((v) => ({ ...v })),
  };
}
