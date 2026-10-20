import type { Producto } from '../../shared/config.ts';
import { prorratear, type Centavos } from '../../shared/money.ts';
import type { PoliticaEnvio, Promocion } from './estado.ts';

/**
 * Reglas de precio públicas. Las usa el motor para los clientes sintéticos y las
 * tiendas para el checkout de demostración, así ambos cotizan exactamente igual.
 */
export interface Tarifario {
  precios: Readonly<Record<string, Centavos>>;
  promociones: readonly Promocion[];
  envio: PoliticaEnvio;
}

export interface PrecioEfectivo {
  sku: string;
  precioLista: Centavos;
  descuentoPct: number;
  precioFinal: Centavos;
  promocionId: string | null;
}

export interface LineaCotizada {
  sku: string;
  unidades: number;
  precioLista: Centavos;
  descuento: Centavos;
  neto: Centavos;
}

export interface CotizacionCarrito {
  lineas: LineaCotizada[];
  bruto: Centavos;
  descuento: Centavos;
  subtotal: Centavos;
  envio: Centavos;
  total: Centavos;
  promocionMultipleId: string | null;
}

export function promocionActiva(p: Promocion, dia: number): boolean {
  return p.dias.includes(dia);
}

function aplicaA(p: Promocion, producto: Producto): boolean {
  if (p.tipo !== 'descuento') return false;
  if (p.alcance === 'todo') return true;
  if (p.alcance === 'categoria') return p.objetivo === producto.categoria;
  return p.objetivo === producto.sku;
}

/** Mejor descuento por artículo vigente (los descuentos no se acumulan entre sí). */
export function precioEfectivo(t: Tarifario, producto: Producto, dia: number): PrecioEfectivo {
  const precioLista = t.precios[producto.sku] ?? producto.precio_referencia;
  let mejor: Promocion | null = null;
  for (const p of t.promociones) {
    if (p.tipo === 'descuento' && promocionActiva(p, dia) && aplicaA(p, producto) && (mejor === null || p.pct > mejor.pct)) {
      mejor = p;
    }
  }
  const pct = mejor?.pct ?? 0;
  return {
    sku: producto.sku,
    precioLista,
    descuentoPct: pct,
    precioFinal: Math.round((precioLista * (100 - pct)) / 100),
    promocionId: mejor?.id ?? null,
  };
}

export function hayCompraMultiple(t: Tarifario, dia: number): boolean {
  return t.promociones.some((p) => p.tipo === 'compra_multiple' && promocionActiva(p, dia));
}

export function cotizarCarrito(
  t: Tarifario,
  productos: ReadonlyMap<string, Producto>,
  items: ReadonlyArray<{ sku: string; unidades: number }>,
  dia: number,
): CotizacionCarrito {
  const base = items.map((item) => {
    const producto = productos.get(item.sku);
    if (!producto) throw new RangeError(`SKU desconocido: ${item.sku}`);
    const pe = precioEfectivo(t, producto, dia);
    const bruto = pe.precioLista * item.unidades;
    const neto = pe.precioFinal * item.unidades;
    return { sku: item.sku, unidades: item.unidades, precioLista: pe.precioLista, bruto, neto };
  });

  const unidades = base.reduce((a, l) => a + l.unidades, 0);
  let multiple: Extract<Promocion, { tipo: 'compra_multiple' }> | null = null;
  for (const p of t.promociones) {
    if (p.tipo === 'compra_multiple' && promocionActiva(p, dia) && unidades >= p.minUnidades && (multiple === null || p.pct > multiple.pct)) {
      multiple = p;
    }
  }
  const subtotalArticulos = base.reduce((a, l) => a + l.neto, 0);
  const extra = multiple ? Math.round((subtotalArticulos * multiple.pct) / 100) : 0;
  const repartoExtra = prorratear(extra, base.map((l) => l.neto));

  const lineas: LineaCotizada[] = base.map((l, i) => {
    const neto = l.neto - (repartoExtra[i] ?? 0);
    return { sku: l.sku, unidades: l.unidades, precioLista: l.precioLista, descuento: l.bruto - neto, neto };
  });
  const bruto = lineas.reduce((a, l) => a + l.precioLista * l.unidades, 0);
  const subtotal = lineas.reduce((a, l) => a + l.neto, 0);
  const envio = subtotal >= t.envio.gratisDesde ? 0 : t.envio.costo;
  return {
    lineas,
    bruto,
    descuento: bruto - subtotal,
    subtotal,
    envio,
    total: subtotal + envio,
    promocionMultipleId: multiple?.id ?? null,
  };
}
