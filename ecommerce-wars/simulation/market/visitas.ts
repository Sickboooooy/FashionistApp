import { rivalDe, type EmpresaId } from '../../shared/types/dominio.ts';
import { ajustarLealtad, elegirTienda, mejorOferta, sigmoide, type Oferta } from '../customers/decision.ts';
import type { Cliente } from '../customers/poblacion.ts';
import type { ContextoDia, Visitante } from './contexto.ts';
import { cotizarCarrito, hayCompraMultiple } from './precios.ts';
import { crearPedido } from './pedidos.ts';

/** Clientes que hoy salen a comprar por iniciativa propia (sin anuncio). */
export function generarOrganicos(ctx: ContextoDia): Visitante[] {
  const p = Math.min(1, ctx.ci.cfg.mercado.actividad_diaria * ctx.factorDia);
  const rng = ctx.rng.trafico;
  return ctx.poblacion.clientes
    .filter(() => rng.probabilidad(p))
    .map((c) => ({ clienteId: c.id, tienda: null, origen: 'organico', canal: null, campanaId: null, angulo: null }));
}

/** Un cliente visita a lo sumo una vez por día; la visita pagada tiene prioridad. */
export function consolidarVisitantes(pagados: readonly Visitante[], organicos: readonly Visitante[]): Visitante[] {
  const vistos = new Set<string>();
  const resultado: Visitante[] = [];
  for (const v of [...pagados, ...organicos]) {
    if (vistos.has(v.clienteId)) continue;
    vistos.add(v.clienteId);
    resultado.push(v);
  }
  return resultado;
}

function armarCarrito(
  ctx: ContextoDia,
  tienda: EmpresaId,
  cliente: Cliente,
  visitante: Visitante,
  oferta: Extract<Oferta, { estado: 'ok' }>,
): Array<{ sku: string; unidades: number }> {
  const m = ctx.ci.cfg.mercado;
  const rng = ctx.rng.visitas;
  const emp = ctx.estado.empresas[tienda];
  const base = [{ sku: oferta.sku, unidades: 1 }];
  const prob = m.prob_segundo_articulo + (hayCompraMultiple(emp, ctx.dia) ? m.bono_compra_multiple : 0);
  if (!rng.probabilidad(prob)) return base;

  const extra = mejorOferta(ctx, tienda, rng.elegirPonderado(cliente.categorias, cliente.pesos), cliente, visitante);
  if (extra.estado !== 'ok') return base;
  if (extra.sku === oferta.sku) {
    return (emp.existencias[oferta.sku]?.unidades ?? 0) >= 2 ? [{ sku: oferta.sku, unidades: 2 }] : base;
  }
  return [...base, { sku: extra.sku, unidades: 1 }];
}

/**
 * Recorrido completo de un visitante: tienda de entrada, categoría de interés,
 * posible comparación con la tienda rival, decisión de compra, carrito y abandono.
 */
export function procesarVisita(ctx: ContextoDia, visitante: Visitante): void {
  const { ci } = ctx;
  const m = ci.cfg.mercado;
  const rng = ctx.rng.visitas;
  const cliente = ctx.poblacion.porId.get(visitante.clienteId);
  const segmento = cliente ? ci.segmento.get(cliente.segmento) : undefined;
  if (!cliente || !segmento) return;

  const entrada = visitante.tienda ?? elegirTienda(ctx, cliente);
  if (entrada === null) return;
  const traficoEntrada = ctx.trafico[entrada];
  if (visitante.origen === 'campana') traficoEntrada.visitasPagadas++;
  else traficoEntrada.visitasOrganicas++;

  const categoria = rng.elegirPonderado(cliente.categorias, cliente.pesos);
  let tienda = entrada;
  let atribucion = visitante;
  let oferta = mejorOferta(ctx, entrada, categoria, cliente, visitante);
  if (oferta.estado === 'sin_stock') {
    traficoEntrada.sinStock[oferta.sku] = (traficoEntrada.sinStock[oferta.sku] ?? 0) + 1;
    ajustarLealtad(ctx, cliente.id, entrada, m.lealtad.por_quiebre);
  }

  if (rng.probabilidad(segmento.prob_comparar)) {
    const rival = rivalDe(entrada);
    const alterna = mejorOferta(ctx, rival, categoria, cliente, null);
    const mejora = alterna.estado === 'ok' && (oferta.estado !== 'ok' || alterna.utilidad > oferta.utilidad + m.costo_cambio_tienda);
    if (mejora) {
      traficoEntrada.cambiosSalientes++;
      ctx.trafico[rival].cambiosEntrantes++;
      tienda = rival;
      oferta = alterna;
      atribucion = { ...visitante, tienda: rival, origen: 'organico', canal: null, campanaId: null, angulo: null };
    }
  }
  if (oferta.estado !== 'ok') return;

  const trafico = ctx.trafico[tienda];
  if (!rng.probabilidad(sigmoide(oferta.utilidad - m.umbral_compra))) {
    trafico.noConvertidas++;
    return;
  }

  const emp = ctx.estado.empresas[tienda];
  const limite = cliente.presupuesto * m.tolerancia_presupuesto;
  let cotizacion = cotizarCarrito(emp, ci.producto, armarCarrito(ctx, tienda, cliente, atribucion, oferta), ctx.dia);
  if (cotizacion.total > limite && cotizacion.lineas.reduce((a, l) => a + l.unidades, 0) > 1) {
    cotizacion = cotizarCarrito(emp, ci.producto, [{ sku: oferta.sku, unidades: 1 }], ctx.dia);
  }
  if (cotizacion.total > limite) {
    trafico.noConvertidas++;
    return;
  }

  const { abandono } = m;
  const pAbandono =
    cotizacion.envio > 0
      ? Math.min(abandono.maximo, abandono.base + (abandono.factor_envio * cotizacion.envio) / Math.max(1, cotizacion.subtotal))
      : abandono.base;
  if (rng.probabilidad(pAbandono)) {
    trafico.abandonos++;
    return;
  }

  if (crearPedido(ctx, tienda, cliente, atribucion, cotizacion)) trafico.pedidos++;
}
