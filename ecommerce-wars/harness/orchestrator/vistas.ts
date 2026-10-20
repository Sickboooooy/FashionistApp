import type { ConfigIndexada } from '../../shared/config.ts';
import type { Escaparate, ResultadoPublico, RondaPropia, VistaEmpresa } from '../../shared/contracts/vista.ts';
import { derivarSemilla } from '../../shared/rng.ts';
import type { Evento } from '../../shared/schemas/eventos.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import { obtenerPoblacion } from '../../simulation/customers/poblacion.ts';
import { resumenRonda, type Proyeccion } from '../../simulation/economics/proyeccion.ts';
import type { EstadoMercado } from '../../simulation/market/estado.ts';
import { precioEfectivo } from '../../simulation/market/precios.ts';

const UMBRAL_POCAS_UNIDADES = 5;

/** Escaparate público: lo que vería cualquier visitante de la tienda. */
export function construirEscaparate(ci: ConfigIndexada, estado: EstadoMercado, empresa: EmpresaId, ronda: number, dia: number): Escaparate {
  const emp = estado.empresas[empresa];
  const productos = emp.listado.flatMap((sku) => {
    const prod = ci.producto.get(sku);
    if (!prod) return [];
    const pe = precioEfectivo(emp, prod, Math.max(1, dia));
    const unidades = emp.existencias[sku]?.unidades ?? 0;
    return [
      {
        sku,
        nombre: prod.nombre,
        categoria: prod.categoria,
        precioLista: pe.precioLista,
        precioFinal: pe.precioFinal,
        descuentoPct: pe.descuentoPct,
        disponibilidad: unidades === 0 ? ('agotado' as const) : unidades <= UMBRAL_POCAS_UNIDADES ? ('pocas' as const) : ('disponible' as const),
        calidadFicha: emp.fichas[sku] ?? 0,
      },
    ];
  });
  return {
    empresa,
    ronda,
    dia,
    diaGlobal: estado.diaGlobal,
    productos,
    promociones: structuredClone(emp.promociones),
    envio: { ...emp.envio },
    anuncios: emp.campanas.map((c) => ({ canal: c.canal, segmento: c.segmento, angulo: c.angulo, mensaje: c.mensaje })),
  };
}

/** Resultado de una ronda desde la perspectiva de la propia empresa (para su historial). */
export function rondaPropia(eventos: readonly Evento[], proyeccion: Proyeccion, estado: EstadoMercado, empresa: EmpresaId, ronda: number): RondaPropia {
  const resumen = resumenRonda(proyeccion, ronda)?.[empresa];
  if (!resumen) throw new Error(`sin resumen de la ronda ${ronda}`);
  const propios = eventos.filter((e) => e.empresa === empresa && e.ronda === ronda);
  const pagados = new Set(propios.flatMap((e) => (e.tipo === 'pedido_cobrado' ? [e.datos.pedidoId] : [])));
  const cancelados = new Set(propios.flatMap((e) => (e.tipo === 'pedido_cancelado' && e.datos.motivo === 'cliente' ? [e.datos.pedidoId] : [])));
  const ventasPorSku: RondaPropia['ventasPorSku'] = Object.fromEntries(estado.empresas[empresa].listado.map((sku) => [sku, { vendidas: 0, sinStock: 0 }]));
  const fila = (sku: string) => (ventasPorSku[sku] ??= { vendidas: 0, sinStock: 0 });
  for (const e of propios) {
    if (e.tipo === 'pedido_creado' && pagados.has(e.datos.pedido.id) && !cancelados.has(e.datos.pedido.id)) {
      for (const l of e.datos.pedido.lineas) fila(l.sku).vendidas += l.unidades;
    } else if (e.tipo === 'trafico_diario') {
      for (const [sku, n] of Object.entries(e.datos.sinStock)) fila(sku).sinStock += n;
    }
  }
  return {
    ronda,
    resumen,
    ventasPorSku,
    campanas: Object.values(proyeccion.campanas[empresa])
      .filter((c) => c.ronda === ronda)
      .map((c) => ({ ...c, roas: c.gasto > 0 ? c.ingresos / c.gasto : null })),
    existenciasFinales: Object.fromEntries(Object.values(estado.empresas[empresa].existencias).map((x) => [x.sku, x.unidades])),
    precios: { ...estado.empresas[empresa].precios },
  };
}

/**
 * Vista autorizada para los agentes de una empresa. Se entrega como copia: el
 * agente no comparte referencias con el estado del harness.
 */
export function construirVista(args: {
  ci: ConfigIndexada;
  empresa: EmpresaId;
  ronda: number;
  estado: EstadoMercado;
  historial: readonly RondaPropia[];
  escaparateRival: Escaparate | null;
  resultados: readonly ResultadoPublico[];
}): VistaEmpresa {
  const { ci, empresa, ronda, estado } = args;
  const emp = estado.empresas[empresa];
  const poblacion = obtenerPoblacion(ci);
  const suscriptoresPorSegmento: Record<string, number> = Object.fromEntries(ci.cfg.segmentos.map((s) => [s.id, 0]));
  for (const id of emp.listaCorreo) {
    const c = poblacion.porId.get(id);
    if (c) suscriptoresPorSegmento[c.segmento] = (suscriptoresPorSegmento[c.segmento] ?? 0) + 1;
  }
  return structuredClone({
    empresa,
    ronda,
    diasPorPeriodo: ci.cfg.dias_por_periodo,
    diaGlobalInicio: estado.diaGlobal,
    semillaAgente: derivarSemilla(ci.cfg.semilla, 'agentes', empresa, ronda),
    reglas: ci.cfg,
    propio: {
      caja: emp.caja,
      pasivo: emp.pasivo,
      existencias: Object.values(emp.existencias),
      enTransito: estado.transito
        .filter((o) => o.empresa === empresa)
        .map((o) => ({ sku: o.sku, unidades: o.unidades, proveedorId: o.proveedorId, diaLlegadaEstimada: o.diaLlegadaEstimada })),
      precios: emp.precios,
      listado: emp.listado,
      fichas: emp.fichas,
      envio: emp.envio,
      promociones: emp.promociones,
      campanas: emp.campanas,
      reposicion: emp.reposicion,
      suscriptoresPorSegmento,
    },
    historial: [...args.historial],
    publico: { escaparateRival: args.escaparateRival, resultados: [...args.resultados] },
  });
}
