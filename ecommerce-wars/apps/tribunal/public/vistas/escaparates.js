import { EMPRESAS, NOMBRE_EMPRESA, chipEmpresa, definiciones, dinero, el, entero, insignia, marcarDesplazables, porcentaje, tabla } from '../modulos/util.js';

/*
 * Los porcentajes de promociones y descuentos son enteros 1–95 (shared/schemas/decisiones.ts).
 * Escaparates públicos de ALFA y OMEGA lado a lado: lo mismo que ve cualquier
 * visitante de las tiendas (precios, promociones, envío, anuncios). Los mensajes
 * de los anuncios son texto de agentes: NO CONFIABLE, sólo textContent.
 */

const DISPONIBILIDAD = Object.freeze({
  disponible: ['ok', 'Disponible'],
  pocas: ['aviso', 'Pocas piezas'],
  agotado: ['error', 'Agotado'],
});

function textoPromocion(p) {
  const dias = Array.isArray(p.dias) && p.dias.length > 0 ? ` · días ${p.dias.join(', ')}` : '';
  if (p.tipo === 'compra_multiple') return `${porcentaje(p.pct / 100)} de descuento llevando ${entero(p.minUnidades)} o más piezas${dias}`;
  const alcance = p.alcance === 'todo' ? 'toda la tienda' : p.alcance === 'categoria' ? `categoría ${p.objetivo ?? '—'}` : `SKU ${p.objetivo ?? '—'}`;
  return `${porcentaje(p.pct / 100)} de descuento en ${alcance}${dias}`;
}

function columnaEscaparate(e, esc) {
  const cabecera = el('header', { clase: 'empresa-cabecera' }, [
    el('h2', { clase: 'empresa-nombre' }, chipEmpresa(e)),
    esc ? el('p', { clase: 'empresa-perfil', texto: `Ronda ${esc.ronda} · día ${esc.dia} (día global ${esc.diaGlobal})` }) : null,
  ]);
  if (!esc) return el('article', { clase: `tarjeta empresa empresa-${e}`, 'aria-label': `Escaparate de ${NOMBRE_EMPRESA[e]}` }, [cabecera, el('p', { clase: 'vacio', texto: 'La tienda abre con la ronda 1.' })]);
  return el('article', { clase: `tarjeta empresa empresa-${e}`, 'aria-label': `Escaparate de ${NOMBRE_EMPRESA[e]}` }, [
    cabecera,
    definiciones([
      ['Costo de envío', dinero(esc.envio?.costo)],
      ['Envío gratis desde', dinero(esc.envio?.gratisDesde)],
      ['Productos listados', entero(esc.productos?.length ?? 0)],
    ]),
    el('h3', { clase: 'subtitulo', texto: 'Promociones' }),
    esc.promociones?.length ? el('ul', { clase: 'lista-simple' }, esc.promociones.map((p) => el('li', { texto: textoPromocion(p) }))) : el('p', { clase: 'vacio', texto: 'Sin promociones vigentes.' }),
    el('h3', { clase: 'subtitulo', texto: 'Anuncios' }),
    esc.anuncios?.length
      ? el(
          'ul',
          { clase: 'lista-anuncios' },
          esc.anuncios.map((a) =>
            el('li', { clase: 'anuncio' }, [
              el('p', { clase: 'anuncio-meta', texto: [a.canal, a.segmento, a.angulo].filter(Boolean).join(' · ') }),
              el('p', { clase: 'texto-agente anuncio-mensaje', texto: a.mensaje }),
            ]),
          ),
        )
      : el('p', { clase: 'vacio', texto: 'Sin anuncios activos.' }),
    el('h3', { clase: 'subtitulo', texto: 'Catálogo y precios' }),
    tabla({
      titulo: `Catálogo de ${NOMBRE_EMPRESA[e]}`,
      columnas: [
        { titulo: 'SKU', valor: (p) => p.sku, encabezado: true },
        { titulo: 'Producto', valor: (p) => p.nombre },
        { titulo: 'Categoría', valor: (p) => p.categoria },
        { titulo: 'Precio lista', valor: (p) => dinero(p.precioLista), num: true },
        { titulo: 'Precio final', valor: (p) => dinero(p.precioFinal), num: true },
        { titulo: 'Descuento', valor: (p) => (p.descuentoPct > 0 ? porcentaje(p.descuentoPct / 100) : '—'), num: true },
        { titulo: 'Disponibilidad', valor: (p) => insignia(...(DISPONIBILIDAD[p.disponibilidad] ?? ['info', String(p.disponibilidad)])) },
        { titulo: 'Calidad de ficha', valor: (p) => porcentaje(p.calidadFicha), num: true },
      ],
      filas: esc.productos ?? [],
      vacio: 'Sin productos listados.',
    }),
  ]);
}

export function crearVistaEscaparates(panel, ctx) {
  const contenedor = el('div', { clase: 'rejilla-2' });
  const nota = el('p', { clase: 'nota', texto: 'Información pública: es lo mismo que muestra cada tienda a sus visitantes. Precios en pesos mexicanos ficticios.' });
  panel.append(nota, contenedor);
  return {
    render() {
      const p = ctx.estado.publico;
      if (!p) {
        contenedor.replaceChildren(el('p', { clase: 'vacio', texto: 'Cargando escaparates…' }));
        return;
      }
      contenedor.replaceChildren(...EMPRESAS.map((e) => columnaEscaparate(e, p.escaparates?.[e] ?? null)));
      marcarDesplazables(panel);
    },
    necesitaPublico: true,
  };
}
