import type { DecisionDirector } from '../../shared/schemas/decisiones.ts';
import { rivalDe } from '../../shared/types/dominio.ts';
import { disponible, mxn, porcentaje, producto, pronosticoSemanal, surtido, type ContextoRol } from './comun.ts';

const CRECIMIENTO_OBJETIVO = 1.08;
const CONVERSION_POTENCIAL_INICIAL = 0.5;

/** Director General: fija estrategia y reparte el presupuesto disponible entre los roles. */
export function decidirDirector(ctx: ContextoRol): DecisionDirector {
  const { vista, perfil, memoria } = ctx;
  const libre = disponible(vista);
  const p = memoria.participaciones;
  const inventario = Math.floor(libre * p.inventario);
  const marketing = Math.floor(libre * p.marketing);
  const fichas = Math.floor(libre * p.fichas);
  const reserva = libre - inventario - marketing - fichas;

  const ultima = vista.historial.at(-1);
  const potencial = surtido(ctx).reduce(
    (a, sku) => a + pronosticoSemanal(ctx, sku) * producto(ctx, sku).precio_referencia * perfil.multiplicadorPrecio,
    0,
  );
  const meta = Math.round(
    ultima ? Math.max(ultima.resumen.financiero.ventasNetas, 0) * CRECIMIENTO_OBJETIVO : potencial * CONVERSION_POTENCIAL_INICIAL,
  );
  const leccion = memoria.lecciones.at(-1)?.texto;
  const estrategia = [
    `${perfil.nombre}: ${perfil.posicionamiento}.`,
    `Ronda ${vista.ronda}: ${porcentaje(p.inventario)} del disponible a inventario, ${porcentaje(p.marketing)} a adquisición y ${porcentaje(p.fichas)} a fichas; precio base ×${perfil.multiplicadorPrecio.toFixed(2)}.`,
    leccion ? `Aprendizaje aplicado: ${leccion}` : 'Primera ronda: se parte de las hipótesis del perfil.',
  ].join(' ');

  return {
    hipotesis: { texto: `Ventas netas de al menos ${mxn(meta)} con esta asignación.`, metrica: 'ventas_netas', valor: meta },
    estrategia: estrategia.slice(0, vista.reglas.limites.estrategia_max_caracteres),
    presupuesto: { inventario, marketing, fichas, reserva },
    prioridades: prioridadesDe(ctx),
  };
}

function prioridadesDe(ctx: ContextoRol): string[] {
  const { vista, perfil } = ctx;
  const ultima = vista.historial.at(-1);
  if (!ultima) return ['Abrir la tienda con surtido completo lo antes posible', 'Medir el rendimiento real de cada canal'];

  const r = ultima.resumen;
  const lista: string[] = [];
  const quiebres = Object.entries(ultima.ventasPorSku)
    .filter(([, v]) => v.sinStock > 0)
    .sort((a, b) => b[1].sinStock - a[1].sinStock || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([sku]) => sku);
  if (quiebres.length > 0) lista.push(`Evitar quiebres de stock en ${quiebres.join(', ')}`);
  if (r.financiero.margenContribucion < 0) lista.push('Recuperar un margen de contribución positivo');
  if (r.roas !== null && r.roas < perfil.roasMinimo) lista.push('Recortar campañas con ROAS bajo el mínimo');
  if (r.tasaAbandono > 0.2) lista.push('Reducir el abandono de carrito');
  const publico = vista.publico.resultados.at(-1);
  if (publico && publico.ventasNetas[rivalDe(vista.empresa)] > publico.ventasNetas[vista.empresa]) {
    lista.push('Cerrar la brecha de ventas netas con la competidora');
  }
  return lista.length > 0 ? lista : ['Sostener el crecimiento con margen positivo'];
}
