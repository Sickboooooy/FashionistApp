import { aplicarTasa } from '../../shared/money.ts';
import type { LineaPedido, Obligacion, Pedido } from '../../shared/schemas/eventos.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import { ajustarLealtad } from '../customers/decision.ts';
import type { Cliente } from '../customers/poblacion.ts';
import { abonar, cargarObligacion } from '../economics/tesoreria.ts';
import { agregarUnidades, retirarUnidades } from '../inventory/inventario.ts';
import { emitir, type ContextoDia, type Visitante } from './contexto.ts';
import type { EstadoEmpresa } from './estado.ts';
import type { CotizacionCarrito } from './precios.ts';

function registrarInsolvencia(ctx: ContextoDia, empresa: EmpresaId, concepto: string, ob: Obligacion): void {
  if (ob.pendiente > 0) emitir(ctx, 'insolvencia', empresa, { concepto, pendiente: ob.pendiente });
}

function reingresar(emp: EstadoEmpresa, lineas: ReadonlyArray<{ sku: string; unidades: number; costo: number; calidad: number }>): void {
  for (const l of lineas) {
    const actual = emp.existencias[l.sku];
    if (!actual) throw new RangeError(`reingresar: SKU desconocido ${l.sku}`);
    emp.existencias[l.sku] = agregarUnidades(actual, l.unidades, l.costo, l.calidad);
  }
}

function suscribirCorreo(emp: EstadoEmpresa, clienteId: string): void {
  if (emp.listaCorreo.includes(clienteId)) return;
  emp.listaCorreo = [...emp.listaCorreo, clienteId].sort();
}

function probabilidadDevolucion(ctx: ContextoDia, emp: EstadoEmpresa, linea: LineaPedido): number {
  const base = ctx.ci.producto.get(linea.sku)?.devolucion_base ?? 0;
  const ficha = emp.fichas[linea.sku] ?? 0;
  return Math.min(1, base * (1.4 - 0.8 * ficha) * (1.2 - 0.4 * linea.calidad));
}

/**
 * Alta, cobro simulado y programación logística de un pedido.
 * Devuelve false si el pago simulado fue rechazado (el inventario regresa).
 */
export function crearPedido(
  ctx: ContextoDia,
  empresa: EmpresaId,
  cliente: Cliente,
  visitante: Visitante,
  cot: CotizacionCarrito,
): boolean {
  const { ci } = ctx;
  const m = ci.cfg.mercado;
  const rng = ctx.rng.logistica;
  const emp = ctx.estado.empresas[empresa];
  const contadores = ctx.estado.contadores[empresa];
  contadores.pedido++;
  const id = `${empresa.toUpperCase()}-${String(contadores.pedido).padStart(6, '0')}`;

  const lineas: LineaPedido[] = cot.lineas.map((l) => {
    const actual = emp.existencias[l.sku];
    if (!actual) throw new RangeError(`crearPedido: SKU desconocido ${l.sku}`);
    const retiro = retirarUnidades(actual, l.unidades);
    emp.existencias[l.sku] = retiro.existencia;
    return { ...l, costo: retiro.costo, calidad: retiro.calidad };
  });
  const comprasPrevias = ctx.estado.relaciones[cliente.id]?.[empresa]?.compras ?? 0;
  const pedido: Pedido = {
    id,
    clienteId: cliente.id,
    segmento: cliente.segmento,
    origen: visitante.origen,
    canal: visitante.canal,
    campanaId: visitante.campanaId,
    recurrente: comprasPrevias > 0,
    lineas,
    bruto: cot.bruto,
    descuento: cot.descuento,
    envioCobrado: cot.envio,
    cobrado: cot.total,
  };
  emitir(ctx, 'pedido_creado', empresa, { pedido });

  const costoTotal = lineas.reduce((a, l) => a + l.costo, 0);
  if (rng.probabilidad(m.prob_pago_rechazado)) {
    reingresar(emp, lineas);
    emitir(ctx, 'pedido_cancelado', empresa, {
      pedidoId: id,
      motivo: 'pago_rechazado',
      netoLineas: 0,
      envioCobrado: 0,
      costoRevertido: costoTotal,
      lineas: lineas.map(({ sku, unidades, costo, calidad }) => ({ sku, unidades, costo, calidad })),
      reembolso: { monto: 0, pagado: 0, pendiente: 0 },
    });
    return false;
  }

  const pasivoLiquidado = abonar(emp, pedido.cobrado);
  emitir(ctx, 'pedido_cobrado', empresa, {
    pedidoId: id,
    bruto: pedido.bruto,
    descuento: pedido.descuento,
    envioCobrado: pedido.envioCobrado,
    cobrado: pedido.cobrado,
  });
  if (pasivoLiquidado > 0) emitir(ctx, 'pasivo_pagado', empresa, { monto: pasivoLiquidado });

  const comision = cargarObligacion(emp, aplicarTasa(pedido.cobrado, ci.cfg.costos.comision_pago));
  emitir(ctx, 'comision_pago', empresa, { pedidoId: id, obligacion: comision });
  registrarInsolvencia(ctx, empresa, 'comision_pago', comision);

  ajustarLealtad(ctx, cliente.id, empresa, m.lealtad.por_compra);
  const relacion = ctx.estado.relaciones[cliente.id]?.[empresa];
  if (relacion) relacion.compras = comprasPrevias + 1;
  if (rng.probabilidad(m.prob_suscripcion_correo)) suscribirCorreo(emp, cliente.id);

  const cancelar = rng.probabilidad(m.prob_cancelacion);
  const [minDias, maxDias] = m.dias_devolucion;
  const devoluciones = cancelar
    ? []
    : lineas
        .map((l, indiceLinea) => ({ indiceLinea, devuelve: rng.probabilidad(probabilidadDevolucion(ctx, emp, l)), dias: rng.entero(minDias, maxDias) }))
        .filter((d) => d.devuelve)
        .map(({ indiceLinea, dias }) => ({ indiceLinea, diasHastaProceso: dias }));
  ctx.pedidosDelDia.push({ empresa, pedido, cancelar, devoluciones });
  return true;
}

/** Fin del día: cada pedido cobrado se cancela (reembolso total) o se envía. */
export function cerrarPedidosDelDia(ctx: ContextoDia): void {
  const { costos, mercado } = ctx.ci.cfg;
  for (const enCurso of ctx.pedidosDelDia) {
    const { empresa, pedido } = enCurso;
    const emp = ctx.estado.empresas[empresa];
    if (enCurso.cancelar) {
      reingresar(emp, pedido.lineas);
      const reembolso = cargarObligacion(emp, pedido.cobrado);
      emitir(ctx, 'pedido_cancelado', empresa, {
        pedidoId: pedido.id,
        motivo: 'cliente',
        netoLineas: pedido.bruto - pedido.descuento,
        envioCobrado: pedido.envioCobrado,
        costoRevertido: pedido.lineas.reduce((a, l) => a + l.costo, 0),
        lineas: pedido.lineas.map(({ sku, unidades, costo, calidad }) => ({ sku, unidades, costo, calidad })),
        reembolso,
      });
      registrarInsolvencia(ctx, empresa, 'reembolso_cancelacion', reembolso);
      continue;
    }

    const envio = cargarObligacion(emp, costos.envio_salida);
    emitir(ctx, 'pedido_enviado', empresa, { pedidoId: pedido.id, obligacion: envio });
    registrarInsolvencia(ctx, empresa, 'envio', envio);

    const calidadMedia = pedido.lineas.reduce((a, l) => a + l.calidad * l.unidades, 0) /
      Math.max(1, pedido.lineas.reduce((a, l) => a + l.unidades, 0));
    ajustarLealtad(ctx, pedido.clienteId, empresa, mercado.lealtad.por_calidad * (calidadMedia - mercado.utilidad.calidad_neutral));

    const contadores = ctx.estado.contadores[empresa];
    for (const d of enCurso.devoluciones) {
      const linea = pedido.lineas[d.indiceLinea];
      if (!linea) continue;
      contadores.devolucion++;
      ctx.estado.devoluciones.push({
        id: `DEV-${empresa.toUpperCase()}-${String(contadores.devolucion).padStart(6, '0')}`,
        empresa,
        pedidoId: pedido.id,
        clienteId: pedido.clienteId,
        sku: linea.sku,
        unidades: linea.unidades,
        reembolso: linea.neto,
        costo: linea.costo,
        calidad: linea.calidad,
        diaProceso: ctx.diaGlobal + d.diasHastaProceso,
      });
    }
  }
  ctx.pedidosDelDia = [];
}

/** Devoluciones que vencen hoy: reembolso, logística inversa y reingreso o merma. */
export function procesarDevoluciones(ctx: ContextoDia): void {
  const { costos, mercado } = ctx.ci.cfg;
  const vencen = ctx.estado.devoluciones.filter((d) => d.diaProceso <= ctx.diaGlobal);
  if (vencen.length === 0) return;
  ctx.estado.devoluciones = ctx.estado.devoluciones.filter((d) => d.diaProceso > ctx.diaGlobal);
  for (const d of vencen) {
    const emp = ctx.estado.empresas[d.empresa];
    const reembolso = cargarObligacion(emp, d.reembolso);
    const logistica = cargarObligacion(emp, costos.logistica_devolucion);
    const reabastecido = ctx.rng.logistica.probabilidad(mercado.prob_reabastecer_devolucion);
    if (reabastecido) reingresar(emp, [d]);
    ajustarLealtad(ctx, d.clienteId, d.empresa, mercado.lealtad.por_devolucion);
    emitir(ctx, 'devolucion_procesada', d.empresa, {
      devolucionId: d.id,
      pedidoId: d.pedidoId,
      sku: d.sku,
      unidades: d.unidades,
      costo: d.costo,
      reabastecido,
      reembolso,
      logistica,
    });
    registrarInsolvencia(ctx, d.empresa, 'devolucion', reembolso);
    registrarInsolvencia(ctx, d.empresa, 'logistica_devolucion', logistica);
  }
}
