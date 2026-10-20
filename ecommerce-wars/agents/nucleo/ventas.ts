import type { Centavos } from '../../shared/money.ts';
import type { DecisionCompras, DecisionVentas } from '../../shared/schemas/decisiones.ts';
import {
  costoUnitario,
  enTransito,
  existencia,
  limitar,
  producto,
  proveedorPreferido,
  pronosticoSemanal,
  redondeoComercial,
  surtido,
  type ContextoRol,
} from './comun.ts';

const UMBRAL_LIQUIDACION = 2.5;
const CONVERSION_OBJETIVO_INICIAL = 0.06;
const MAX_FICHAS_SKUS = 6;

/** Agente de Ventas: precios, surtido visible, promociones, envío y mejora de fichas. */
export function decidirVentas(ctx: ContextoRol, presupuestoFichas: Centavos, compras: DecisionCompras): DecisionVentas {
  const { vista, perfil, memoria } = ctx;
  const { reglas } = vista;
  const skus = surtido(ctx);
  const comprados = new Map(compras.ordenes.map((o) => [o.sku, o.unidades]));
  const rival = new Map((vista.publico.escaparateRival?.productos ?? []).map((p) => [p.sku, p]));

  const precios: DecisionVentas['precios'] = skus.map((sku) => {
    const prod = producto(ctx, sku);
    const piso = Math.ceil(costoUnitario(proveedorPreferido(ctx, sku, false), prod) * perfil.margenMinimoSobreCosto);
    const multiplicador = limitar(perfil.multiplicadorPrecio * (memoria.multiplicadorPrecio[sku] ?? 1), perfil.rangoMultiplicador);
    let precio = redondeoComercial(prod.precio_referencia * multiplicador);
    const delRival = rival.get(sku);
    if (perfil.seguirPrecioRival && delRival && delRival.disponibilidad !== 'agotado' && delRival.precioFinal < precio * 0.95) {
      precio = redondeoComercial(delRival.precioFinal * 0.98);
    }
    const minimo = Math.ceil(prod.precio_referencia * reglas.limites.precio_min_factor);
    const maximo = Math.floor(prod.precio_referencia * reglas.limites.precio_max_factor);
    return { sku, precio: Math.min(maximo, Math.max(precio, piso, minimo)) };
  });

  const posicion = (sku: string) => existencia(vista, sku) + enTransito(vista, sku) + (comprados.get(sku) ?? 0);
  const listado = skus.filter((sku) => posicion(sku) > 0);

  const promociones: DecisionVentas['promociones'] = [];
  const { promociones: politica } = perfil;
  if (politica.compraMultiple) {
    promociones.push({
      id: `r${vista.ronda}-multiple`,
      tipo: 'compra_multiple',
      minUnidades: politica.compraMultiple.minUnidades,
      pct: politica.compraMultiple.pct,
      dias: Array.from({ length: vista.diasPorPeriodo }, (_, i) => i + 1),
    });
  }
  const diasPromo = politica.diasPromocion.filter((d) => d <= vista.diasPorPeriodo);
  if (politica.promocionSemanal && politica.descuentoMax > 0 && listado.length > 0) {
    const porCategoria = new Map<string, number>();
    for (const sku of listado) {
      const cat = producto(ctx, sku).categoria;
      porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + posicion(sku) / Math.max(1, pronosticoSemanal(ctx, sku)));
    }
    const [categoria] = [...porCategoria.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? [];
    if (categoria) {
      promociones.push({ id: `r${vista.ronda}-semana`, tipo: 'descuento', alcance: 'categoria', objetivo: categoria, pct: politica.descuentoMax, dias: diasPromo });
    }
  }
  if (politica.descuentoLiquidacion > 0) {
    for (const sku of listado) {
      if (promociones.length >= reglas.limites.promociones_max) break;
      if (existencia(vista, sku) > UMBRAL_LIQUIDACION * pronosticoSemanal(ctx, sku)) {
        promociones.push({
          id: `r${vista.ronda}-liq-${sku.toLowerCase()}`,
          tipo: 'descuento',
          alcance: 'sku',
          objetivo: sku,
          pct: politica.descuentoLiquidacion,
          dias: diasPromo,
        });
      }
    }
  }

  const costoPaso = reglas.costos.mejora_ficha;
  let pasosDisponibles = costoPaso > 0 ? Math.floor(presupuestoFichas / costoPaso) : 0;
  const fichas: DecisionVentas['fichas'] = [];
  const porDemanda = [...listado].sort((a, b) => pronosticoSemanal(ctx, b) - pronosticoSemanal(ctx, a) || a.localeCompare(b));
  for (const sku of porDemanda.slice(0, MAX_FICHAS_SKUS)) {
    const actual = vista.propio.fichas[sku] ?? reglas.costos.ficha_inicial;
    if (actual >= perfil.fichasObjetivo || pasosDisponibles <= 0) continue;
    const pasos = Math.min(
      reglas.limites.pasos_ficha_max,
      pasosDisponibles,
      Math.ceil((perfil.fichasObjetivo - actual) / reglas.costos.incremento_ficha),
    );
    fichas.push({ sku, pasos });
    pasosDisponibles -= pasos;
  }

  const conversionPrevia = vista.historial.at(-1)?.resumen.conversion ?? 0;
  const conversionObjetivo = conversionPrevia > 0 ? conversionPrevia : CONVERSION_OBJETIVO_INICIAL;
  return {
    hipotesis: {
      texto: `Conversión de al menos ${(conversionObjetivo * 100).toFixed(1)}% con ${listado.length} productos y ${promociones.length} promociones.`,
      metrica: 'conversion',
      valor: Number(conversionObjetivo.toFixed(4)),
    },
    precios,
    listado,
    promociones,
    envio: { costo: politica.costoEnvio, gratisDesde: politica.envioGratisDesde },
    fichas,
    justificacion: `Precio base ×${perfil.multiplicadorPrecio.toFixed(2)} ajustado por aprendizaje${perfil.seguirPrecioRival ? ' y precio público del rival' : ''}; ${fichas.length} fichas a mejorar.`,
  };
}
