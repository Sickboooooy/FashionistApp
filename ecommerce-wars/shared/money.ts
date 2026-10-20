/**
 * Montos monetarios del experimento. Todo monto es un entero en centavos MXN
 * ficticios: así la contabilidad concilia exactamente, sin error de punto flotante.
 */
export type Centavos = number;

export function esCentavos(valor: unknown): valor is Centavos {
  return typeof valor === 'number' && Number.isSafeInteger(valor);
}

export function exigirCentavos(valor: number, campo: string): Centavos {
  if (!Number.isSafeInteger(valor)) {
    throw new RangeError(`${campo} debe ser un entero en centavos (recibido: ${valor})`);
  }
  return valor;
}

/** Aplica una tasa (p. ej. comisión 0.035) y redondea al centavo. */
export function aplicarTasa(monto: Centavos, tasa: number): Centavos {
  return Math.round(monto * tasa);
}

/**
 * Prorratea un total entre partes proporcionales a `pesos`.
 * La suma del resultado es exactamente `total`: la última parte absorbe el residuo.
 */
export function prorratear(total: Centavos, pesos: readonly number[]): Centavos[] {
  if (pesos.length === 0) return [];
  const suma = pesos.reduce((a, b) => a + b, 0);
  if (suma <= 0) return pesos.map((_, i) => (i === pesos.length - 1 ? total : 0));
  const partes = pesos.map((p) => Math.floor((total * p) / suma));
  const asignado = partes.reduce((a, b) => a + b, 0);
  return partes.map((p, i) => (i === partes.length - 1 ? p + (total - asignado) : p));
}

const FORMATO_MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function formatoMXN(monto: Centavos): string {
  return FORMATO_MXN.format(monto / 100);
}
