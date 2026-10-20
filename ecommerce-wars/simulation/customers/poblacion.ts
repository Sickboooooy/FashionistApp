import type { ConfigIndexada } from '../../shared/config.ts';
import type { Centavos } from '../../shared/money.ts';
import { rngPara } from '../../shared/rng.ts';

/** Cliente sintético. Identificador seudónimo; no corresponde a ninguna persona real. */
export interface Cliente {
  id: string;
  segmento: string;
  presupuesto: Centavos;
  sensibilidadPrecio: number;
  pesoCalidad: number;
  categorias: readonly string[];
  pesos: readonly number[];
}

export interface PoblacionIndexada {
  clientes: readonly Cliente[];
  porId: ReadonlyMap<string, Cliente>;
  porSegmento: ReadonlyMap<string, readonly Cliente[]>;
}

const DISPERSION_PREFERENCIAS = 0.3;
const cache = new WeakMap<ConfigIndexada, PoblacionIndexada>();

/**
 * Rasgos estáticos de la población, derivados sólo de la semilla. No se guardan en
 * el estado: se regeneran idénticos en cualquier repetición del experimento.
 */
export function obtenerPoblacion(ci: ConfigIndexada): PoblacionIndexada {
  const enCache = cache.get(ci);
  if (enCache) return enCache;

  const { cfg } = ci;
  const rng = rngPara(cfg.semilla, 'poblacion');
  const ancho = String(cfg.mercado.poblacion).length;
  const clientes: Cliente[] = [];
  for (let i = 1; i <= cfg.mercado.poblacion; i++) {
    const segmento = rng.elegirPonderado(
      cfg.segmentos,
      cfg.segmentos.map((s) => s.proporcion),
    );
    const presupuesto = Math.round(rng.uniforme(segmento.presupuesto[0], segmento.presupuesto[1]) / 100) * 100;
    clientes.push(
      Object.freeze({
        id: `C-${String(i).padStart(ancho, '0')}`,
        segmento: segmento.id,
        presupuesto,
        sensibilidadPrecio: rng.uniforme(segmento.sensibilidad_precio[0], segmento.sensibilidad_precio[1]),
        pesoCalidad: rng.uniforme(segmento.peso_calidad[0], segmento.peso_calidad[1]),
        categorias: cfg.categorias,
        pesos: Object.freeze(
          cfg.categorias.map((c) => (segmento.preferencias[c] ?? 0) * Math.exp(rng.normal(0, DISPERSION_PREFERENCIAS))),
        ),
      }),
    );
  }

  const porSegmento = new Map<string, Cliente[]>(cfg.segmentos.map((s) => [s.id, []]));
  for (const c of clientes) porSegmento.get(c.segmento)?.push(c);

  const poblacion: PoblacionIndexada = {
    clientes,
    porId: new Map(clientes.map((c) => [c.id, c])),
    porSegmento,
  };
  cache.set(ci, poblacion);
  return poblacion;
}
