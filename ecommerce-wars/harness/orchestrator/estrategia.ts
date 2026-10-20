import type { ConfigIndexada } from '../../shared/config.ts';
import type { Centavos } from '../../shared/money.ts';
import type { PlanPeriodo } from '../../shared/schemas/decisiones.ts';
import type { CambioEstrategia } from '../../shared/schemas/eventos.ts';
import type { PlanAplicado } from '../../simulation/market/estado.ts';

/** Rasgos comparables de una estrategia aplicada; base de STRATEGY_CHANGED. */
export interface ResumenEstrategia {
  participacion_inventario: number;
  participacion_marketing: number;
  participacion_fichas: number;
  multiplicador_precio_medio: number;
  canales: string;
  segmentos: string;
  angulos: string;
  proveedores: string;
  envio_gratis_desde: number;
  promociones: number;
}

const redondear2 = (x: number) => Math.round(x * 100) / 100;
const lista = (valores: Iterable<string>) => [...new Set(valores)].sort().join(', ') || '—';

export function resumirEstrategia(
  ci: ConfigIndexada,
  plan: PlanPeriodo | null,
  aplicado: PlanAplicado,
  disponible: Centavos,
  preciosVigentes: Readonly<Record<string, Centavos>>,
): ResumenEstrategia {
  const proporcion = (x: number) => (disponible > 0 ? redondear2(x / disponible) : 0);
  const precios = { ...preciosVigentes, ...aplicado.precios };
  const relativos = ci.cfg.productos.filter((p) => aplicado.listado.includes(p.sku)).map((p) => (precios[p.sku] ?? p.precio_referencia) / p.precio_referencia);
  return {
    participacion_inventario: proporcion(plan?.director.presupuesto.inventario ?? 0),
    participacion_marketing: proporcion(plan?.director.presupuesto.marketing ?? 0),
    participacion_fichas: proporcion(plan?.director.presupuesto.fichas ?? 0),
    multiplicador_precio_medio: relativos.length > 0 ? redondear2(relativos.reduce((a, b) => a + b, 0) / relativos.length) : 0,
    canales: lista(aplicado.campanas.map((c) => c.canal)),
    segmentos: lista(aplicado.campanas.map((c) => c.segmento)),
    angulos: lista(aplicado.campanas.map((c) => c.angulo)),
    proveedores: lista([...aplicado.ordenes.map((o) => o.proveedorId), ...aplicado.reposicion.map((r) => r.proveedorId)]),
    envio_gratis_desde: aplicado.envio.gratisDesde,
    promociones: aplicado.promociones.length,
  };
}

export function diferenciasEstrategia(anterior: ResumenEstrategia | null, actual: ResumenEstrategia): CambioEstrategia[] {
  return (Object.keys(actual) as Array<keyof ResumenEstrategia>)
    .filter((campo) => anterior === null || anterior[campo] !== actual[campo])
    .map((campo) => ({ campo, anterior: anterior ? anterior[campo] : null, nuevo: actual[campo] }));
}
