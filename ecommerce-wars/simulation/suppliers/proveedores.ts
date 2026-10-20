import type { ConfigIndexada, Producto, Proveedor } from '../../shared/config.ts';
import type { Centavos } from '../../shared/money.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import { disponible, gastar } from '../economics/tesoreria.ts';
import { agregarUnidades, unidadesEnTransito } from '../inventory/inventario.ts';
import { emitir, ordenEmpresas, type ContextoDia } from '../market/contexto.ts';

export interface CotizacionOrden {
  costoUnitario: Centavos;
  costoTotal: Centavos;
  flete: Centavos;
  calidad: number;
  entregaDias: number;
}

export function suministra(proveedor: Proveedor, producto: Producto): boolean {
  return proveedor.categorias.includes(producto.categoria);
}

export function costoUnitario(proveedor: Proveedor, producto: Producto): Centavos {
  return Math.round(producto.precio_referencia * proveedor.factor_costo);
}

/** Cotización pública de una orden. Lanza si la combinación no es válida. */
export function cotizarOrden(ci: ConfigIndexada, sku: string, proveedorId: string, unidades: number): CotizacionOrden {
  const producto = ci.producto.get(sku);
  const proveedor = ci.proveedor.get(proveedorId);
  if (!producto || !proveedor) throw new RangeError(`orden inválida: ${proveedorId}/${sku}`);
  if (!suministra(proveedor, producto)) throw new RangeError(`${proveedorId} no surte ${producto.categoria}`);
  if (unidades < proveedor.minimo_unidades) throw new RangeError(`mínimo de ${proveedorId}: ${proveedor.minimo_unidades}`);
  const unitario = costoUnitario(proveedor, producto);
  return {
    costoUnitario: unitario,
    costoTotal: unitario * unidades,
    flete: ci.cfg.costos.flete_orden_compra,
    calidad: proveedor.calidad,
    entregaDias: proveedor.entrega_dias,
  };
}

/** Emite y paga una orden de compra. La llegada real puede retrasarse según la confiabilidad. */
export function emitirOrden(
  ctx: ContextoDia,
  empresa: EmpresaId,
  solicitud: { sku: string; proveedorId: string; unidades: number },
  origen: 'plan' | 'reposicion',
): boolean {
  const { ci } = ctx;
  const emp = ctx.estado.empresas[empresa];
  const cot = cotizarOrden(ci, solicitud.sku, solicitud.proveedorId, solicitud.unidades);
  const total = cot.costoTotal + cot.flete;
  if (total > disponible(emp, ci.cfg.reserva_obligatoria)) {
    emitir(ctx, 'orden_rechazada', empresa, {
      ...solicitud,
      costoTotal: total,
      motivo: 'saldo_insuficiente',
      origen,
    });
    return false;
  }
  gastar(emp, total, ci.cfg.reserva_obligatoria);

  const proveedor = ci.proveedor.get(solicitud.proveedorId) as Proveedor;
  const retraso = ctx.rng.proveedores.probabilidad(1 - proveedor.confiabilidad) ? ctx.rng.proveedores.entero(1, 2) : 0;
  const contadores = ctx.estado.contadores[empresa];
  contadores.orden++;
  const id = `OC-${empresa.toUpperCase()}-${String(contadores.orden).padStart(5, '0')}`;
  const diaLlegadaEstimada = ctx.diaGlobal + cot.entregaDias;

  ctx.estado.transito.push({
    id,
    empresa,
    sku: solicitud.sku,
    proveedorId: solicitud.proveedorId,
    unidades: solicitud.unidades,
    costoTotal: cot.costoTotal,
    calidad: cot.calidad,
    diaEmision: ctx.diaGlobal,
    diaLlegadaEstimada,
    diaLlegada: diaLlegadaEstimada + retraso,
    origen,
  });
  emitir(ctx, 'orden_emitida', empresa, {
    orden: {
      id,
      sku: solicitud.sku,
      proveedorId: solicitud.proveedorId,
      unidades: solicitud.unidades,
      costoUnitario: cot.costoUnitario,
      costoTotal: cot.costoTotal,
      calidad: cot.calidad,
      diaLlegadaEstimada,
      origen,
    },
    flete: cot.flete,
  });
  return true;
}

export function recibirOrdenes(ctx: ContextoDia): void {
  const llegan = ctx.estado.transito.filter((o) => o.diaLlegada <= ctx.diaGlobal);
  if (llegan.length === 0) return;
  ctx.estado.transito = ctx.estado.transito.filter((o) => o.diaLlegada > ctx.diaGlobal);
  for (const orden of llegan) {
    const emp = ctx.estado.empresas[orden.empresa];
    const actual = emp.existencias[orden.sku];
    if (!actual) throw new RangeError(`recibirOrdenes: SKU desconocido ${orden.sku}`);
    emp.existencias[orden.sku] = agregarUnidades(actual, orden.unidades, orden.costoTotal, orden.calidad);
    emitir(ctx, 'orden_recibida', orden.empresa, {
      ordenId: orden.id,
      sku: orden.sku,
      unidades: orden.unidades,
      costoTotal: orden.costoTotal,
      calidad: orden.calidad,
      retrasoDias: orden.diaLlegada - orden.diaLlegadaEstimada,
    });
  }
}

/** Ejecuta las reglas de reposición declaradas por cada agente de compras. */
export function ejecutarReposicion(ctx: ContextoDia): void {
  for (const empresa of ordenEmpresas(ctx)) {
    const emp = ctx.estado.empresas[empresa];
    for (const regla of emp.reposicion) {
      const enMano = emp.existencias[regla.sku]?.unidades ?? 0;
      const enCamino = unidadesEnTransito(ctx.estado.transito, empresa, regla.sku);
      if (enMano + enCamino <= regla.puntoReorden) {
        emitirOrden(ctx, empresa, { sku: regla.sku, proveedorId: regla.proveedorId, unidades: regla.cantidad }, 'reposicion');
      }
    }
  }
}
