import type { Centavos } from '../../shared/money.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import type { Existencia, OrdenEnTransito } from '../market/estado.ts';

export function redondear6(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}

/** Alta de unidades a costo promedio ponderado. Devuelve una nueva existencia. */
export function agregarUnidades(ex: Existencia, unidades: number, valor: Centavos, calidad: number): Existencia {
  if (!Number.isInteger(unidades) || unidades <= 0) {
    throw new RangeError(`agregarUnidades(${ex.sku}): unidades inválidas (${unidades})`);
  }
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new RangeError(`agregarUnidades(${ex.sku}): valor inválido (${valor})`);
  }
  const total = ex.unidades + unidades;
  return {
    sku: ex.sku,
    unidades: total,
    valor: ex.valor + valor,
    calidad: redondear6((ex.calidad * ex.unidades + calidad * unidades) / total),
  };
}

export interface Retiro {
  existencia: Existencia;
  costo: Centavos;
  calidad: number;
}

/**
 * Baja de unidades. El costo retirado se calcula sobre el valor acumulado, de modo
 * que la última unidad se lleva el residuo y el valor nunca queda descuadrado.
 */
export function retirarUnidades(ex: Existencia, unidades: number): Retiro {
  if (!Number.isInteger(unidades) || unidades <= 0) {
    throw new RangeError(`retirarUnidades(${ex.sku}): unidades inválidas (${unidades})`);
  }
  if (unidades > ex.unidades) {
    throw new RangeError(`existencia insuficiente de ${ex.sku}: hay ${ex.unidades}, se piden ${unidades}`);
  }
  const costo = unidades === ex.unidades ? ex.valor : Math.round((ex.valor * unidades) / ex.unidades);
  const restantes = ex.unidades - unidades;
  return {
    existencia: { sku: ex.sku, unidades: restantes, valor: ex.valor - costo, calidad: restantes === 0 ? 0 : ex.calidad },
    costo,
    calidad: ex.calidad,
  };
}

export function unidadesEnTransito(transito: readonly OrdenEnTransito[], empresa: EmpresaId, sku: string): number {
  return transito.filter((o) => o.empresa === empresa && o.sku === sku).reduce((a, o) => a + o.unidades, 0);
}

export function totalUnidades(existencias: Readonly<Record<string, Existencia>>): number {
  return Object.values(existencias).reduce((a, e) => a + e.unidades, 0);
}

export function valorInventario(existencias: Readonly<Record<string, Existencia>>): Centavos {
  return Object.values(existencias).reduce((a, e) => a + e.valor, 0);
}
