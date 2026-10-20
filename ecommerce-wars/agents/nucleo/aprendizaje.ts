import { rivalDe } from '../../shared/types/dominio.ts';
import { limitar, mxn, type ContextoRol } from './comun.ts';
import { claveBrazo, type Memoria } from './memoria.ts';

const SUAVIZADO_DEMANDA = 0.5;
const VENTA_PERDIDA_POR_QUIEBRE = 0.12;
const PASO_PRECIO = 0.03;
const PASO_PARTICIPACION = 0.03;
const MAX_LECCIONES = 40;

/**
 * Aprendizaje entre rondas. Lee el resultado de la ronda recién cerrada (historial
 * propio y resultados públicos) y devuelve una memoria nueva. No toca registros.
 */
export function aprender(ctx: ContextoRol): { memoria: Memoria; lecciones: string[] } {
  const { vista, perfil, memoria } = ctx;
  const ultima = vista.historial.at(-1);
  if (!ultima) return { memoria, lecciones: [] };
  const lecciones: string[] = [];
  const r = ultima.resumen;

  const demandaSku = { ...memoria.demandaSku };
  for (const [sku, v] of Object.entries(ultima.ventasPorSku)) {
    const observada = v.vendidas + VENTA_PERDIDA_POR_QUIEBRE * v.sinStock;
    const previa = demandaSku[sku];
    demandaSku[sku] = Number((previa === undefined ? observada : SUAVIZADO_DEMANDA * previa + (1 - SUAVIZADO_DEMANDA) * observada).toFixed(2));
  }

  const brazos = { ...memoria.brazos };
  for (const c of ultima.campanas) {
    const clave = claveBrazo(c.canal, c.segmento, c.angulo);
    const previo = brazos[clave] ?? { gasto: 0, ingresos: 0, pedidos: 0, rondas: 0 };
    brazos[clave] = {
      gasto: previo.gasto + c.gasto,
      ingresos: previo.ingresos + c.ingresos,
      pedidos: previo.pedidos + c.pedidos,
      rondas: previo.rondas + 1,
    };
  }

  const [minMult, maxMult] = perfil.rangoMultiplicador;
  const multiplicadorPrecio = { ...memoria.multiplicadorPrecio };
  for (const [sku, v] of Object.entries(ultima.ventasPorSku)) {
    const actual = multiplicadorPrecio[sku] ?? 1;
    const restantes = ultima.existenciasFinales[sku] ?? 0;
    let nuevo = actual;
    if (v.sinStock > v.vendidas * 0.5 && restantes === 0 && v.vendidas > 0) nuevo = actual + PASO_PRECIO;
    else if (v.vendidas === 0 && restantes > 0) nuevo = actual - 2 * PASO_PRECIO;
    else if (restantes > 1.5 * v.vendidas && v.vendidas > 0) nuevo = actual - PASO_PRECIO;
    const efectivo = limitar(perfil.multiplicadorPrecio * nuevo, [minMult, maxMult]) / perfil.multiplicadorPrecio;
    multiplicadorPrecio[sku] = Number(efectivo.toFixed(4));
  }

  const lim = perfil.limitesParticipacion;
  let { inventario, marketing, fichas } = memoria.participaciones;
  let cobertura = memoria.coberturaSemanas;
  if (r.roas !== null && r.roas > perfil.roasMinimo + 1) {
    marketing += PASO_PARTICIPACION;
    lecciones.push(`ROAS de ${r.roas.toFixed(2)} supera el mínimo: más presupuesto a adquisición.`);
  } else if (r.roas !== null && r.roas < perfil.roasMinimo) {
    marketing -= PASO_PARTICIPACION;
    lecciones.push(`ROAS de ${r.roas.toFixed(2)} bajo el mínimo de ${perfil.roasMinimo}: se recorta adquisición.`);
  }
  if (r.tasaServicio < 0.85) {
    inventario += PASO_PARTICIPACION;
    cobertura = Math.min(2.5, cobertura + 0.15);
    lecciones.push(`Tasa de servicio de ${(r.tasaServicio * 100).toFixed(0)}%: más inventario y cobertura ${cobertura.toFixed(2)} semanas.`);
  } else if (r.tasaServicio > 0.97 && r.unidadesRecibidas > 0) {
    cobertura = Math.max(0.8, cobertura - 0.1);
    lecciones.push('Servicio casi perfecto: se reduce la cobertura para liberar caja.');
  }
  if (r.financiero.margenContribucion < 0) {
    marketing -= PASO_PARTICIPACION;
    lecciones.push(`Margen de contribución negativo (${mxn(r.financiero.margenContribucion)}): se protege el margen.`);
  }
  const publico = vista.publico.resultados.find((x) => x.ronda === ultima.ronda);
  if (publico) {
    const propias = publico.ventasNetas[vista.empresa];
    const rivales = publico.ventasNetas[rivalDe(vista.empresa)];
    if (rivales > propias * 1.5) {
      marketing += PASO_PARTICIPACION;
      lecciones.push(`La competidora vendió ${mxn(rivales)} contra ${mxn(propias)}: se acelera la adquisición.`);
    }
  }
  if (lecciones.length === 0) lecciones.push('Resultados dentro de lo esperado: se mantiene la estrategia.');

  inventario = limitar(inventario, lim.inventario);
  marketing = limitar(marketing, lim.marketing);
  fichas = limitar(fichas, lim.fichas);
  const total = inventario + marketing + fichas;
  if (total > 0.95) {
    inventario *= 0.95 / total;
    marketing *= 0.95 / total;
    fichas *= 0.95 / total;
  }

  const nueva: Memoria = {
    ...memoria,
    rondasAnalizadas: memoria.rondasAnalizadas + 1,
    demandaSku,
    multiplicadorPrecio,
    brazos,
    participaciones: {
      inventario: Number(inventario.toFixed(4)),
      marketing: Number(marketing.toFixed(4)),
      fichas: Number(fichas.toFixed(4)),
    },
    coberturaSemanas: Number(cobertura.toFixed(2)),
    ultimaVentaNeta: r.financiero.ventasNetas,
    lecciones: [...memoria.lecciones, ...lecciones.map((texto) => ({ ronda: ultima.ronda, texto: texto.slice(0, 400) }))].slice(-MAX_LECCIONES),
  };
  return { memoria: nueva, lecciones };
}
