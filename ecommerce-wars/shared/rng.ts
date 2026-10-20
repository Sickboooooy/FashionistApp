import { createHash } from 'node:crypto';

/**
 * Generador pseudoaleatorio determinista (sfc32). Cada subsistema obtiene su
 * propio flujo derivado de la semilla maestra + etiquetas, de modo que agregar
 * un sorteo en un módulo no altera los sorteos de los demás.
 */
export interface Rng {
  /** Uniforme en [0, 1). */
  siguiente(): number;
  /** Entero uniforme en [min, max], ambos incluidos. */
  entero(min: number, max: number): number;
  uniforme(min: number, max: number): number;
  probabilidad(p: number): boolean;
  elegir<T>(items: readonly T[]): T;
  elegirPonderado<T>(items: readonly T[], pesos: readonly number[]): T;
  normal(media: number, desviacion: number): number;
  poisson(lambda: number): number;
  binomial(n: number, p: number): number;
  barajar<T>(items: readonly T[]): T[];
}

const UMBRAL_POISSON_EXACTO = 30;
const UMBRAL_BINOMIAL_EXACTO = 40;

export function derivarSemilla(semilla: number | string, ...etiquetas: ReadonlyArray<string | number>): number {
  const digest = createHash('sha256').update([String(semilla), ...etiquetas.map(String)].join('|')).digest();
  return digest.readUInt32BE(0);
}

function splitmix32(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x9e3779b9) | 0;
    let z = estado;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

function sfc32(a0: number, b0: number, c0: number, d0: number): () => number {
  let a = a0 | 0;
  let b = b0 | 0;
  let c = c0 | 0;
  let d = d0 | 0;
  return () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function crearRng(semilla: number): Rng {
  const mezcla = splitmix32(semilla);
  const base = sfc32(mezcla(), mezcla(), mezcla(), mezcla());
  for (let i = 0; i < 12; i++) base();

  const siguiente = (): number => base();

  const normal = (media: number, desviacion: number): number => {
    const u1 = 1 - siguiente();
    const u2 = siguiente();
    return media + desviacion * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const poisson = (lambda: number): number => {
    if (lambda <= 0) return 0;
    if (lambda >= UMBRAL_POISSON_EXACTO) {
      return Math.max(0, Math.round(normal(lambda, Math.sqrt(lambda))));
    }
    const limite = Math.exp(-lambda);
    let k = 0;
    let producto = siguiente();
    while (producto > limite) {
      k++;
      producto *= siguiente();
    }
    return k;
  };

  const binomial = (n: number, p: number): number => {
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    if (n < UMBRAL_BINOMIAL_EXACTO) {
      let exitos = 0;
      for (let i = 0; i < n; i++) if (siguiente() < p) exitos++;
      return exitos;
    }
    const media = n * p;
    if (media < 10) return Math.min(n, poisson(media));
    const valor = Math.round(normal(media, Math.sqrt(media * (1 - p))));
    return Math.min(n, Math.max(0, valor));
  };

  return {
    siguiente,
    entero: (min, max) => min + Math.floor(siguiente() * (max - min + 1)),
    uniforme: (min, max) => min + siguiente() * (max - min),
    probabilidad: (p) => siguiente() < p,
    elegir: (items) => {
      if (items.length === 0) throw new RangeError('elegir: lista vacía');
      return items[Math.floor(siguiente() * items.length)] as (typeof items)[number];
    },
    elegirPonderado: (items, pesos) => {
      const total = pesos.reduce((a, b) => a + Math.max(0, b), 0);
      if (items.length === 0 || total <= 0) throw new RangeError('elegirPonderado: sin pesos positivos');
      let umbral = siguiente() * total;
      for (let i = 0; i < items.length; i++) {
        umbral -= Math.max(0, pesos[i] ?? 0);
        if (umbral < 0) return items[i] as (typeof items)[number];
      }
      return items[items.length - 1] as (typeof items)[number];
    },
    normal,
    poisson,
    binomial,
    barajar: (items) => {
      const copia = [...items];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(siguiente() * (i + 1));
        [copia[i], copia[j]] = [copia[j] as (typeof copia)[number], copia[i] as (typeof copia)[number]];
      }
      return copia;
    },
  };
}

export function rngPara(semilla: number | string, ...etiquetas: ReadonlyArray<string | number>): Rng {
  return crearRng(derivarSemilla(semilla, ...etiquetas));
}
