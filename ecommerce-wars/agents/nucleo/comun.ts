import type { Producto, Proveedor } from '../../shared/config.ts';
import type { VistaEmpresa } from '../../shared/contracts/vista.ts';
import { formatoMXN, type Centavos } from '../../shared/money.ts';
import type { Rng } from '../../shared/rng.ts';
import type { Memoria } from './memoria.ts';
import type { Perfil } from './perfil.ts';

/** Todo lo que un rol puede consultar al decidir. */
export interface ContextoRol {
  vista: VistaEmpresa;
  perfil: Perfil;
  memoria: Memoria;
  rng: Rng;
}

const ENTREGA_REFERENCIA_DIAS = 4;
const FACTOR_COSTO_REFERENCIA = 0.6;

export function producto(ctx: ContextoRol, sku: string): Producto {
  const p = ctx.vista.reglas.productos.find((x) => x.sku === sku);
  if (!p) throw new RangeError(`SKU desconocido: ${sku}`);
  return p;
}

export function surtido(ctx: ContextoRol): string[] {
  const permitidos = new Set(ctx.perfil.surtido);
  return ctx.vista.reglas.productos.map((p) => p.sku).filter((sku) => permitidos.has(sku));
}

/** Caja que puede comprometerse sin invadir la reserva obligatoria del mercado. */
export function disponible(vista: VistaEmpresa): Centavos {
  if (vista.propio.pasivo > 0) return 0;
  return Math.max(0, vista.propio.caja - vista.reglas.reserva_obligatoria);
}

export function existencia(vista: VistaEmpresa, sku: string): number {
  return vista.propio.existencias.find((e) => e.sku === sku)?.unidades ?? 0;
}

export function enTransito(vista: VistaEmpresa, sku: string): number {
  return vista.propio.enTransito.filter((o) => o.sku === sku).reduce((a, o) => a + o.unidades, 0);
}

export function pronosticoSemanal(ctx: ContextoRol, sku: string): number {
  return ctx.memoria.demandaSku[sku] ?? ctx.perfil.demandaInicialSemanal[sku] ?? 10;
}

export function costoUnitario(proveedor: Proveedor, prod: Producto): Centavos {
  return Math.round(prod.precio_referencia * proveedor.factor_costo);
}

/**
 * Proveedor preferido según los pesos del perfil. Con urgencia (sin existencias)
 * la velocidad de entrega pesa el doble: un pedido que llega el día 5 vende poco.
 */
export function proveedorPreferido(ctx: ContextoRol, sku: string, urgente: boolean): Proveedor {
  const prod = producto(ctx, sku);
  const { calidad, costo, velocidad } = ctx.perfil.pesosProveedor;
  const pesoVelocidad = urgente ? velocidad * 2 : velocidad;
  const candidatos = ctx.vista.reglas.proveedores.filter((p) => p.categorias.includes(prod.categoria));
  if (candidatos.length === 0) throw new RangeError(`ningún proveedor surte ${prod.categoria}`);
  const puntaje = (p: Proveedor) =>
    calidad * p.calidad -
    costo * (p.factor_costo / FACTOR_COSTO_REFERENCIA) -
    pesoVelocidad * (p.entrega_dias / ENTREGA_REFERENCIA_DIAS) +
    0.1 * p.confiabilidad;
  return [...candidatos].sort((a, b) => puntaje(b) - puntaje(a) || a.id.localeCompare(b.id))[0] as Proveedor;
}

/** Precio comercial terminado en 9 pesos (p. ej. 1,149.00). */
export function redondeoComercial(centavos: Centavos): Centavos {
  const pesos = Math.max(10, Math.round(centavos / 1000) * 10 - 1);
  return pesos * 100;
}

export function porcentaje(valor: number): string {
  return `${(valor * 100).toFixed(0)}%`;
}

export const mxn = formatoMXN;

export function limitar(valor: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, valor));
}
