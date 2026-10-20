import type { EmpresaId } from '../../shared/types/dominio.ts';
import type { ContextoDia, Visitante } from '../market/contexto.ts';
import type { EstadoEmpresa } from '../market/estado.ts';
import { precioEfectivo } from '../market/precios.ts';
import { redondear6 } from '../inventory/inventario.ts';
import type { Cliente } from './poblacion.ts';

/*
 * Modelo de elección del cliente sintético. Todos los pesos provienen de
 * config/experiment.json (mercado.utilidad): las reglas son públicas e idénticas
 * para ambas empresas, y ningún agente comercial puede alterarlas.
 */

export type Oferta =
  | { estado: 'ok'; sku: string; utilidad: number; precioFinal: number }
  | { estado: 'sin_stock'; sku: string }
  | { estado: 'no_listado' };

export function sigmoide(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function lealtadDe(ctx: ContextoDia, clienteId: string, empresa: EmpresaId): number {
  return ctx.estado.relaciones[clienteId]?.[empresa]?.lealtad ?? 0;
}

export function ajustarLealtad(ctx: ContextoDia, clienteId: string, empresa: EmpresaId, delta: number): void {
  const { minima, maxima } = ctx.ci.cfg.mercado.lealtad;
  const relaciones = ctx.estado.relaciones;
  const porEmpresa = relaciones[clienteId] ?? (relaciones[clienteId] = {});
  const actual = porEmpresa[empresa] ?? { compras: 0, lealtad: 0 };
  porEmpresa[empresa] = {
    compras: actual.compras,
    lealtad: redondear6(Math.min(maxima, Math.max(minima, actual.lealtad + delta))),
  };
}

function skusDisponibles(emp: EstadoEmpresa): string[] {
  return emp.listado.filter((sku) => (emp.existencias[sku]?.unidades ?? 0) > 0);
}

export function tiendaAbierta(emp: EstadoEmpresa): boolean {
  return skusDisponibles(emp).length > 0;
}

/** Visita orgánica: logit entre ambas tiendas y la opción externa (comprar en otro lado). */
export function elegirTienda(ctx: ContextoDia, cliente: Cliente): EmpresaId | null {
  const m = ctx.ci.cfg.mercado;
  const totalProductos = ctx.ci.cfg.productos.length;
  const opciones: Array<EmpresaId | null> = ['alfa', 'omega', null];
  const pesos = opciones.map((empresa) => {
    if (empresa === null) return Math.exp(m.opcion_externa);
    const emp = ctx.estado.empresas[empresa];
    const disponibles = skusDisponibles(emp).length;
    if (disponibles === 0) return 0;
    const conciencia = ctx.estado.conciencia[empresa][cliente.segmento] ?? m.conciencia_inicial;
    return Math.exp(
      m.peso_conciencia * conciencia +
        m.peso_lealtad * lealtadDe(ctx, cliente.id, empresa) +
        m.peso_variedad * (disponibles / totalProductos),
    );
  });
  return ctx.rng.visitas.elegirPonderado(opciones, pesos);
}

function utilidad(
  ctx: ContextoDia,
  emp: EstadoEmpresa,
  sku: string,
  cliente: Cliente,
  visitante: Visitante | null,
): { utilidad: number; precioFinal: number } {
  const { ci } = ctx;
  const u = ci.cfg.mercado.utilidad;
  const producto = ci.producto.get(sku);
  const segmento = ci.segmento.get(cliente.segmento);
  if (!producto || !segmento) throw new RangeError(`utilidad: referencia inválida ${sku}/${cliente.segmento}`);

  const pe = precioEfectivo(emp, producto, ctx.dia);
  const calidadProducto = emp.existencias[sku]?.calidad ?? 0;
  const calidadPercibida =
    u.mezcla_calidad_producto * calidadProducto + (1 - u.mezcla_calidad_producto) * (emp.fichas[sku] ?? 0);
  const precioRelativo = pe.precioFinal / producto.precio_referencia;

  let valor =
    u.peso_calidad * cliente.pesoCalidad * (calidadPercibida - u.calidad_neutral) -
    u.peso_precio * cliente.sensibilidadPrecio * (precioRelativo - 1) +
    ci.cfg.mercado.peso_lealtad * lealtadDe(ctx, cliente.id, emp.empresa);

  if (pe.descuentoPct > 0) valor += u.peso_promo * segmento.afinidad_promo * (pe.descuentoPct / 100);

  if (visitante?.origen === 'campana' && visitante.tienda === emp.empresa && visitante.angulo && visitante.canal) {
    const afinidadAngulo = ci.angulo.get(visitante.angulo)?.afinidad[cliente.segmento] ?? 1;
    valor += u.peso_angulo * (afinidadAngulo - 1) + (ci.canal.get(visitante.canal)?.bono_intencion ?? 0);
  }

  if (pe.precioFinal > cliente.presupuesto) {
    valor -= u.penalizacion_presupuesto + 2 * (pe.precioFinal / cliente.presupuesto - 1);
  }
  return { utilidad: valor, precioFinal: pe.precioFinal };
}

/** Mejor producto de la categoría en la tienda indicada, según la utilidad del cliente. */
export function mejorOferta(
  ctx: ContextoDia,
  empresa: EmpresaId,
  categoria: string,
  cliente: Cliente,
  visitante: Visitante | null,
): Oferta {
  const emp = ctx.estado.empresas[empresa];
  const candidatos = emp.listado.filter((sku) => ctx.ci.producto.get(sku)?.categoria === categoria);
  if (candidatos.length === 0) return { estado: 'no_listado' };

  let mejor: Extract<Oferta, { estado: 'ok' }> | null = null;
  let agotado: string | null = null;
  for (const sku of candidatos) {
    if ((emp.existencias[sku]?.unidades ?? 0) <= 0) {
      agotado ??= sku;
      continue;
    }
    const evaluada = utilidad(ctx, emp, sku, cliente, visitante);
    if (mejor === null || evaluada.utilidad > mejor.utilidad) {
      mejor = { estado: 'ok', sku, utilidad: evaluada.utilidad, precioFinal: evaluada.precioFinal };
    }
  }
  if (mejor) return mejor;
  return { estado: 'sin_stock', sku: agotado ?? (candidatos[0] as string) };
}
