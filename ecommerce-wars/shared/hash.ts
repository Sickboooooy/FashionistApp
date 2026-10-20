import { createHash } from 'node:crypto';

/**
 * JSON canónico: claves ordenadas, sin espacios, sin `undefined`.
 * Dos estructuras con el mismo contenido producen exactamente la misma cadena,
 * condición necesaria para que los hashes de evidencia sean reproducibles.
 */
export function jsonCanonico(valor: unknown): string {
  if (valor === null) return 'null';
  switch (typeof valor) {
    case 'number':
      if (!Number.isFinite(valor)) throw new TypeError(`jsonCanonico: número no finito (${valor})`);
      return JSON.stringify(valor);
    case 'string':
    case 'boolean':
      return JSON.stringify(valor);
    case 'object': {
      if (Array.isArray(valor)) return `[${valor.map((v) => jsonCanonico(v ?? null)).join(',')}]`;
      const entradas = Object.entries(valor as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${jsonCanonico(v)}`).join(',')}}`;
    }
    default:
      throw new TypeError(`jsonCanonico: tipo no serializable (${typeof valor})`);
  }
}

export function sha256(datos: string | Uint8Array): string {
  return createHash('sha256').update(datos).digest('hex');
}

export function hashCanonico(valor: unknown): string {
  return sha256(jsonCanonico(valor));
}
