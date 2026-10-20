import { barraParticipacion, graficoColumnas, graficoLineas } from '../modulos/graficas.js';
import {
  EMPRESAS,
  NOMBRE_CODIGO,
  NOMBRE_EMPRESA,
  chipEmpresa,
  crearGuardia,
  definiciones,
  dinero,
  dineroCompacto,
  el,
  entero,
  fechaLegible,
  fechaSimulada,
  hashEl,
  insignia,
  insigniaBool,
  insigniaResultado,
  marcarDesplazables,
  multiplo,
  opcion,
  porcentaje,
  reemplazarConservando,
  seccion,
  selector,
  tabla,
} from '../modulos/util.js';

/*
 * "En vivo": KPIs por empresa (ronda actual + acumulado), participación, ventas netas
 * por ronda, caja intradía, campañas, inventario, conciliación y el teletipo de eventos.
 * En la vista pública sólo se muestran datos públicos.
 */

const UMBRAL_POCAS = 5;

const KPIS = [
  { nombre: 'Ventas netas', valor: (r) => r.financiero.ventasNetas, fmt: dinero, destacado: true },
  { nombre: 'Ventas brutas', valor: (r) => r.financiero.ventasBrutas, fmt: dinero },
  { nombre: 'Pedidos válidos', valor: (r) => r.pedidosValidos, fmt: entero },
  { nombre: 'Cancelados por cliente', valor: (r) => r.cancelados, fmt: entero },
  { nombre: 'Pagos rechazados', valor: (r) => r.pagosRechazados, fmt: entero },
  { nombre: 'Devoluciones', valor: (r) => r.devoluciones, fmt: entero },
  { nombre: 'Conversión', valor: (r) => r.conversion, fmt: porcentaje },
  { nombre: 'Ticket promedio', valor: (r) => r.ticketPromedio, fmt: dinero },
  { nombre: 'Margen de contribución', valor: (r) => r.financiero.margenContribucion, fmt: dinero },
  { nombre: 'Utilidad operativa', valor: (r) => r.financiero.utilidadOperativa, fmt: dinero },
  { nombre: 'CAC', valor: (r) => r.cac, fmt: dinero },
  { nombre: 'ROAS', valor: (r) => r.roas, fmt: multiplo },
  { nombre: 'Visitas', valor: (r) => r.visitas, fmt: entero },
  { nombre: 'Tasa de servicio', valor: (r) => r.tasaServicio, fmt: porcentaje },
];

function resumenEvento(codigo, e) {
  const d = e.datos ?? {};
  switch (codigo) {
    case 'ROUND_STARTED':
      return `Inicia la ronda ${e.ronda}${Number.isFinite(d.semilla) ? ` · semilla ${d.semilla}` : ''}`;
    case 'INVENTORY_PURCHASED':
      return d.orden ? `${d.orden.sku} ×${entero(d.orden.unidades)} · ${dinero(d.orden.costoTotal)}` : 'Orden de compra';
    case 'PRICE_CHANGED':
      return d.sku ? `${d.sku}: ${dinero(d.anterior)} → ${dinero(d.nuevo)}` : 'Cambio de precio';
    case 'CAMPAIGN_STARTED':
      return [d.canal, d.segmento, d.angulo].filter(Boolean).join(' · ') || 'Campaña iniciada';
    case 'CAMPAIGN_STOPPED':
      return `${d.campanaId ?? 'Campaña'}${d.motivo ? ` · ${d.motivo}` : ''}`;
    case 'ORDER_CREATED':
      return d.pedido ? `${d.pedido.id} · ${dinero(d.pedido.cobrado)}` : 'Pedido creado';
    case 'ORDER_PAID_SIMULATED':
      return `${d.pedidoId ?? ''} · ${dinero(d.cobrado)}`;
    case 'ORDER_CANCELLED':
      return `${d.pedidoId ?? ''} · ${d.motivo === 'pago_rechazado' ? 'pago rechazado' : 'cancelado por el cliente'}`;
    case 'ORDER_REFUNDED':
      return `${d.pedidoId ?? ''} · ${d.sku ?? ''} ×${entero(d.unidades)}`;
    case 'STRATEGY_CHANGED':
      return Array.isArray(d.cambios) ? `${d.cambios.length} campos de estrategia` : 'Cambio de estrategia';
    case 'AGENT_DECISION_RECORDED':
      return d.rol ? `${d.rol} · hipótesis sobre ${d.hipotesis?.metrica ?? '—'}` : 'Decisión registrada';
    case 'ROUND_CLOSED':
      return `Cierre de la ronda ${e.ronda}`;
    case 'JUDGE_VERDICT':
      return `${d.expediente ?? ''} · ${d.resultado === 'ganador' ? `ganador ${NOMBRE_EMPRESA[d.ganador] ?? ''}` : d.resultado === 'ronda_invalida' ? 'ronda inválida' : 'sin ganador'}`;
    default:
      return '';
  }
}

/** Entrada del teletipo a partir de un evento sellado (privilegiado o redactado). */
export function entradaTeletipo(codigo, e) {
  return { seq: e.seq, codigo, empresa: e.empresa ?? null, ronda: e.ronda, dia: e.dia, hash: e.hash, resumen: resumenEvento(codigo, e) };
}

function crearTeletipo() {
  const lista = el('ol', { clase: 'teletipo-lista', 'aria-label': 'Últimos eventos, el más reciente primero' });
  const pie = el('p', { clase: 'tarjeta-desc', texto: 'Últimos 100 eventos con código; el más reciente arriba.' });
  const nodos = new Map();
  const nodo = el('section', { clase: 'tarjeta teletipo', 'aria-labelledby': 'teletipo-titulo' }, [
    el('h2', { clase: 'tarjeta-titulo', id: 'teletipo-titulo', texto: 'Teletipo de eventos' }),
    pie,
    el('div', { clase: 'desplazable teletipo-marco' }, lista),
  ]);
  const crearItem = (t) =>
    el('li', { clase: `teletipo-item codigo-${t.codigo.toLowerCase()}` }, [
      el('div', { clase: 'teletipo-linea' }, [
        el('span', { clase: 'teletipo-seq', texto: `#${t.seq}` }),
        el('span', { clase: 'codigo-evento', title: NOMBRE_CODIGO[t.codigo] ?? t.codigo, texto: t.codigo }),
        chipEmpresa(t.empresa),
        el('span', { clase: 'teletipo-ronda', texto: `R${t.ronda}·D${t.dia}` }),
        hashEl(t.hash, 8),
      ]),
      t.resumen ? el('p', { clase: 'teletipo-resumen', texto: t.resumen }) : null,
    ]);
  return {
    nodo,
    reiniciar() {
      nodos.clear();
      lista.replaceChildren();
    },
    render(entradas) {
      const vivos = new Set();
      const hijos = entradas.map((t) => {
        vivos.add(t.seq);
        let li = nodos.get(t.seq);
        if (!li) {
          li = crearItem(t);
          nodos.set(t.seq, li);
        }
        return li;
      });
      for (const seq of [...nodos.keys()]) if (!vivos.has(seq)) nodos.delete(seq);
      lista.replaceChildren(...hijos);
      if (entradas.length === 0) lista.replaceChildren(el('li', { clase: 'vacio', texto: 'Esperando eventos…' }));
    },
  };
}

function tarjetaKpi(k, actual, acumulado) {
  const v = actual ? k.valor(actual) : null;
  const negativo = typeof v === 'number' && v < 0;
  return el('div', { clase: `kpi ${k.destacado ? 'kpi-destacado' : ''}` }, [
    el('span', { clase: 'kpi-nombre', texto: k.nombre }),
    el('span', { clase: `kpi-valor ${negativo ? 'negativo' : ''}`, texto: actual ? k.fmt(v) : '—' }),
    el('span', { clase: 'kpi-sec', texto: `Acumulado: ${acumulado ? k.fmt(k.valor(acumulado)) : '—'}` }),
  ]);
}

function tarjetaEmpresa(e, inst, perfil) {
  const actual = inst.rondaActual?.[e] ?? null;
  const acumulado = inst.acumulado?.[e] ?? null;
  const agotados = inst.agotados?.[e] ?? [];
  const etiquetaRonda = inst.ronda > 0 ? `Ronda ${inst.ronda}${inst.rondaAbierta ? ' (en curso)' : ' (cerrada)'}` : 'Sin ronda';
  return el('article', { clase: `tarjeta empresa empresa-${e}`, 'aria-label': `Indicadores de ${NOMBRE_EMPRESA[e]}` }, [
    el('header', { clase: 'empresa-cabecera' }, [
      el('div', {}, [el('h2', { clase: 'empresa-nombre' }, chipEmpresa(e)), el('p', { clase: 'empresa-perfil', texto: perfil ? `Perfil: ${perfil}` : 'Perfil sin publicar' })]),
      el('div', { clase: 'empresa-caja' }, [el('span', { clase: 'kpi-nombre', texto: 'Caja disponible (presupuesto)' }), el('span', { clase: 'empresa-caja-valor', texto: dinero(acumulado?.caja) })]),
    ]),
    el('p', { clase: 'empresa-ambito' }, [
      el('span', { texto: `Valor principal: ${etiquetaRonda}. ` }),
      el('span', { texto: `Clientes únicos: ${entero(inst.clientesUnicos?.[e])}. ` }),
      agotados.length > 0 ? insignia('aviso', `${agotados.length} producto(s) agotado(s)`) : insignia('ok', 'Sin agotados'),
    ]),
    el('div', { clase: 'kpis' }, KPIS.map((k) => tarjetaKpi(k, actual, acumulado))),
  ]);
}

function tablaInventario(e, inst) {
  const inventario = inst.inventario?.[e] ?? {};
  const agotados = new Set(inst.agotados?.[e] ?? []);
  const sinStock = inst.rondaActual?.[e]?.sinStock ?? {};
  const precios = inst.precios?.[e] ?? {};
  const skus = [...new Set([...Object.keys(inventario), ...Object.keys(precios)])].sort();
  return tabla({
    titulo: `Inventario por SKU de ${NOMBRE_EMPRESA[e]}`,
    tituloVisible: true,
    columnas: [
      { titulo: 'SKU', valor: (s) => s, encabezado: true },
      { titulo: 'Unidades', valor: (s) => entero(inventario[s] ?? 0), num: true },
      { titulo: 'Precio', valor: (s) => dinero(precios[s]), num: true },
      { titulo: 'Sin stock (ronda)', valor: (s) => entero(sinStock[s] ?? 0), num: true },
      {
        titulo: 'Estado',
        valor: (s) => (agotados.has(s) || (inventario[s] ?? 0) <= 0 ? insignia('error', 'Agotado') : (inventario[s] ?? 0) <= UMBRAL_POCAS ? insignia('aviso', 'Pocas') : insignia('ok', 'Disponible')),
      },
    ],
    filas: skus,
    vacio: 'Sin inventario registrado.',
  });
}

function tablaCampanas(inst, filtroRonda, filtroEmpresa) {
  const filas = EMPRESAS.filter((e) => filtroEmpresa === 'todas' || filtroEmpresa === e)
    .flatMap((e) => (inst.campanas?.[e] ?? []).map((c) => ({ ...c, empresa: e })))
    .filter((c) => filtroRonda === 'todas' || c.ronda === inst.ronda)
    .sort((a, b) => b.ronda - a.ronda || a.empresa.localeCompare(b.empresa) || a.campanaId.localeCompare(b.campanaId));
  return tabla({
    titulo: 'Rendimiento por campaña',
    columnas: [
      { titulo: 'Empresa', valor: (c) => chipEmpresa(c.empresa) },
      { titulo: 'Ronda', valor: (c) => String(c.ronda), num: true },
      { titulo: 'Campaña', valor: (c) => c.campanaId, encabezado: true },
      { titulo: 'Canal', valor: (c) => c.canal },
      { titulo: 'Segmento', valor: (c) => c.segmento },
      { titulo: 'Ángulo', valor: (c) => c.angulo },
      { titulo: 'Mensaje (texto del agente)', valor: (c) => el('span', { clase: 'texto-agente', texto: c.mensaje }), clase: 'col-mensaje' },
      { titulo: 'Estado', valor: (c) => (c.activa ? insignia('ok', 'Activa') : insignia('info', 'Detenida')) },
      { titulo: 'Presupuesto diario', valor: (c) => dinero(c.presupuestoDiario), num: true },
      { titulo: 'Gasto', valor: (c) => dinero(c.gasto), num: true },
      { titulo: 'Impresiones', valor: (c) => entero(c.impresiones), num: true },
      { titulo: 'Clics', valor: (c) => entero(c.clics), num: true },
      { titulo: 'CTR', valor: (c) => porcentaje(c.ctr), num: true },
      { titulo: 'Visitas', valor: (c) => entero(c.visitas), num: true },
      { titulo: 'Pedidos', valor: (c) => entero(c.pedidos), num: true },
      { titulo: 'Ingresos', valor: (c) => dinero(c.ingresos), num: true },
      { titulo: 'CAC', valor: (c) => dinero(c.cac), num: true },
      { titulo: 'ROAS', valor: (c) => multiplo(c.roas), num: true },
    ],
    filas,
    vacio: filtroRonda === 'todas' ? 'Sin campañas registradas.' : 'Sin campañas en la ronda actual.',
  });
}

function bloqueConciliacion(rondas) {
  const conResumen = rondas.filter((r) => r.resumen?.empresas);
  if (conResumen.length === 0) return el('p', { clase: 'vacio', texto: 'Aún no hay rondas cerradas.' });
  return el(
    'ul',
    { clase: 'lista-conciliacion' },
    conResumen.map((r) =>
      el('li', { clase: 'conciliacion-ronda' }, [
        el('span', { clase: 'conciliacion-r', texto: `Ronda ${r.ronda}` }),
        ...EMPRESAS.map((e) => {
          const c = r.resumen.empresas[e]?.conciliacion;
          const ok = c?.libroVsEventos;
          return el('div', { clase: 'conciliacion-empresa' }, [
            chipEmpresa(e),
            insigniaBool(ok, 'Indicadores = libro mayor', 'Indicadores ≠ libro mayor', 'Sin dato'),
            Array.isArray(c?.diferencias) && c.diferencias.length > 0 ? el('ul', { clase: 'diferencias' }, c.diferencias.map((d) => el('li', { texto: d }))) : null,
          ]);
        }),
      ]),
    ),
  );
}

function datosVentasHistorico(inst) {
  const historico = (inst.historico ?? []).filter((h) => h.ronda > 0);
  return {
    categorias: historico.map((h) => ({ etiqueta: `R${h.ronda}`, detalle: `Ronda ${h.ronda}${h.ronda === inst.ronda && inst.rondaAbierta ? ' (en curso)' : ''}` })),
    series: EMPRESAS.map((e) => ({ id: e, nombre: NOMBRE_EMPRESA[e], valores: historico.map((h) => h.empresas?.[e]?.financiero?.ventasNetas ?? null) })),
    tituloTabla: 'Ventas netas por ronda',
    resumen: `Ventas netas por ronda: ${historico.map((h) => `R${h.ronda} ALFA ${dinero(h.empresas?.alfa?.financiero?.ventasNetas)}, OMEGA ${dinero(h.empresas?.omega?.financiero?.ventasNetas)}`).join('; ')}`,
  };
}

export function datosCaja(cajas, fechaInicio, diasPorPeriodo) {
  const puntos = cajas.map((c) => ({
    x: c.diaGlobal,
    etiqueta: `Día ${c.diaGlobal}`,
    detalle: `R${c.ronda} · día ${c.dia}${c.diaGlobal > 0 ? ` · ${fechaLegible(fechaSimulada(fechaInicio, c.diaGlobal))}` : ' · capital inicial'}`,
  }));
  const rondas = [...new Set(cajas.map((c) => c.ronda))].filter((r) => r > 1);
  return {
    puntos,
    series: EMPRESAS.map((e) => ({ id: e, nombre: NOMBRE_EMPRESA[e], valores: cajas.map((c) => (Number.isFinite(c[e]) ? c[e] : null)) })),
    separadores: rondas.map((r) => ({ x: (r - 1) * diasPorPeriodo + 0.5, etiqueta: `R${r}` })),
    marcasX: [...new Set(cajas.map((c) => c.ronda))].map((r) => ({ x: (r - 1) * diasPorPeriodo + Math.ceil(diasPorPeriodo / 2), etiqueta: `Ronda ${r}` })).filter((m) => puntos.some((p) => Math.abs(p.x - m.x) <= diasPorPeriodo)),
    tituloTabla: 'Caja al cierre de cada día simulado',
    resumen: cajas.length ? `Caja al cierre del día ${cajas.at(-1).diaGlobal}: ALFA ${dinero(cajas.at(-1).alfa)}, OMEGA ${dinero(cajas.at(-1).omega)}` : 'Sin cierres de día',
  };
}

function datosResultadosPublicos(resultados) {
  return {
    categorias: resultados.map((r) => ({ etiqueta: `R${r.ronda}`, detalle: `Ronda ${r.ronda} · ${r.expediente}` })),
    series: EMPRESAS.map((e) => ({ id: e, nombre: NOMBRE_EMPRESA[e], valores: resultados.map((r) => r.ventasNetas?.[e] ?? null) })),
    tituloTabla: 'Ventas netas públicas por ronda',
    resumen: `Resultados públicos de ${resultados.length} ronda(s)`,
  };
}

export function crearVistaEnVivo(panel, ctx) {
  let filtroRonda = 'actual';
  let filtroEmpresa = 'todas';
  const guardia = crearGuardia();
  const graficoVentas = graficoColumnas({ titulo: 'Ventas netas por ronda', descripcion: 'Ventas brutas − descuentos − cancelaciones − devoluciones. La ronda en curso se actualiza en vivo.', formato: dinero, formatoEje: dineroCompacto });
  const graficoCaja = graficoLineas({ titulo: 'Caja intradía', descripcion: 'Caja de cada empresa al cierre de cada día simulado (eventos internos cierre_dia).', formato: dinero, formatoEje: dineroCompacto, tituloCategoria: 'Día simulado' });
  const graficoPublico = graficoColumnas({ titulo: 'Ventas netas por ronda', descripcion: 'Resultados públicos de las rondas cerradas.', formato: dinero, formatoEje: dineroCompacto });
  const teletipo = crearTeletipo();

  const franja = el('div', { clase: 'franja-ronda', role: 'group', 'aria-label': 'Estado de la ronda' });
  const zonaEmpresas = el('div', { clase: 'rejilla-2' });
  const zonaParticipacion = el('div');
  const zonaConciliacion = el('div');
  const zonaCampanas = el('div');
  const zonaInventario = el('div', { clase: 'rejilla-2' });
  const zonaResultados = el('div');
  const zonaVeredictos = el('div');
  const zonaIntegridad = el('div');

  const selRonda = selector('envivo-campanas-ronda', 'Ronda', [opcion('actual', 'Ronda actual', true), opcion('todas', 'Todas las rondas')], (v) => {
    filtroRonda = v;
    renderCampanas();
  });
  const selEmpresa = selector('envivo-campanas-empresa', 'Empresa', [opcion('todas', 'Ambas', true), opcion('alfa', 'ALFA'), opcion('omega', 'OMEGA')], (v) => {
    filtroEmpresa = v;
    renderCampanas();
  });

  const privado = el('div', { clase: 'pila' }, [
    zonaEmpresas,
    el('div', { clase: 'rejilla-2' }, [
      seccion('Participación de mercado', { id: 'envivo-participacion', descripcion: 'Proporción de las ventas netas acumuladas del mercado simulado.' }, zonaParticipacion),
      el('div', { clase: 'tarjeta tarjeta-grafico' }, graficoVentas.figura),
    ]),
    el('div', { clase: 'tarjeta tarjeta-grafico' }, graficoCaja.figura),
    seccion('Campañas', { id: 'envivo-campanas', descripcion: 'CTR = clics / impresiones · CAC = gasto / pedidos · ROAS = ingresos / gasto. Los mensajes son texto de los agentes.' }, [
      el('div', { clase: 'filtros' }, [selRonda.campo, selEmpresa.campo]),
      zonaCampanas,
    ]),
    zonaInventario,
    seccion('Conciliación por ronda', { id: 'envivo-conciliacion', descripcion: 'Indicadores calculados desde eventos frente al libro mayor de Finanzas (resumen de cada ronda cerrada).' }, zonaConciliacion),
  ]);

  const publico = el('div', { clase: 'pila' }, [
    el('div', { clase: 'rejilla-2' }, [seccion('Resultados públicos por ronda', { id: 'envivo-resultados' }, zonaResultados), el('div', { clase: 'tarjeta tarjeta-grafico' }, graficoPublico.figura)]),
    el('div', { clase: 'rejilla-2' }, [
      seccion('Sentencias selladas en el diario', { id: 'envivo-veredictos', descripcion: 'Eventos JUDGE_VERDICT; el detalle completo está en la pestaña Tribunal.' }, zonaVeredictos),
      seccion('Integridad del diario', { id: 'envivo-integridad', descripcion: 'El servidor recalcula la cadena de hashes de cada evento al recibirlo.' }, zonaIntegridad),
    ]),
  ]);

  panel.append(el('div', { clase: 'envivo' }, [el('div', { clase: 'envivo-principal' }, [franja, privado, publico]), el('aside', { clase: 'envivo-lateral', 'aria-label': 'Eventos en vivo' }, teletipo.nodo)]));

  function renderFranja() {
    const { estado } = ctx;
    const fuente = estado.privilegiado ? estado.inst : estado.publico;
    const dpp = estado.config?.diasPorPeriodo ?? 7;
    if (!fuente) {
      franja.replaceChildren(el('p', { clase: 'vacio', texto: 'Cargando estado de la simulación…' }));
      return;
    }
    const abierta = estado.privilegiado ? fuente.rondaAbierta : null;
    franja.replaceChildren(
      definiciones([
        ['Ronda', fuente.ronda > 0 ? String(fuente.ronda) : 'Sin iniciar'],
        ['Día lógico', `${fuente.dia} de ${dpp}`],
        ['Fecha simulada', fechaLegible(fuente.fechaSimulada)],
        abierta === null ? null : ['Periodo', abierta ? insignia('ok', 'Ronda abierta') : insignia('info', 'Entre rondas')],
      ]),
    );
  }

  function renderCampanas() {
    const inst = ctx.estado.inst;
    if (!inst) return;
    guardia.siCambia('campanas', [inst.campanas, inst.ronda, filtroRonda, filtroEmpresa], () => {
      reemplazarConservando(zonaCampanas, tablaCampanas(inst, filtroRonda, filtroEmpresa));
      marcarDesplazables(zonaCampanas);
    });
  }

  /** Cada zona se reconstruye sólo si sus datos cambiaron (conserva desplazamiento y foco). */
  function renderPrivado() {
    const { inst, rondas } = ctx.estado;
    if (!inst) return;
    const perfiles = [...rondas].reverse().find((r) => r.resumen?.perfiles)?.resumen.perfiles ?? {};
    guardia.siCambia('empresas', [inst.rondaActual, inst.acumulado, inst.agotados, inst.clientesUnicos, inst.ronda, inst.rondaAbierta, perfiles], () => {
      zonaEmpresas.replaceChildren(...EMPRESAS.map((e) => tarjetaEmpresa(e, inst, perfiles[e])));
    });
    const historico = (inst.historico ?? []).filter((h) => h.ronda > 0);
    guardia.siCambia('participacion', [EMPRESAS.map((e) => inst.acumulado?.[e]?.financiero?.ventasNetas), historico.map((h) => EMPRESAS.map((e) => h.empresas?.[e]?.financiero?.ventasNetas))], () => {
      reemplazarConservando(
        zonaParticipacion,
        barraParticipacion(EMPRESAS.map((e) => ({ id: e, nombre: NOMBRE_EMPRESA[e], valor: inst.acumulado?.[e]?.financiero?.ventasNetas ?? 0 })), porcentaje),
        tabla({
          titulo: 'Participación por ronda',
          tituloVisible: true,
          columnas: [
            { titulo: 'Ronda', valor: (h) => `R${h.ronda}`, encabezado: true },
            ...EMPRESAS.map((e) => ({
              titulo: NOMBRE_EMPRESA[e],
              num: true,
              valor: (h) => {
                const total = EMPRESAS.reduce((a, x) => a + (h.empresas?.[x]?.financiero?.ventasNetas ?? 0), 0);
                return total > 0 ? porcentaje((h.empresas?.[e]?.financiero?.ventasNetas ?? 0) / total) : '—';
              },
            })),
          ],
          filas: historico,
          vacio: 'Sin rondas.',
        }),
      );
    });
    graficoVentas.actualizar(datosVentasHistorico(inst));
    graficoCaja.actualizar(datosCaja(ctx.estado.cajas, ctx.estado.config?.fechaInicio, ctx.estado.config?.diasPorPeriodo ?? 7));
    renderCampanas();
    guardia.siCambia('inventario', [inst.inventario, inst.agotados, EMPRESAS.map((e) => inst.rondaActual?.[e]?.sinStock), inst.precios], () => {
      reemplazarConservando(zonaInventario, ...EMPRESAS.map((e) => el('section', { clase: 'tarjeta', 'aria-label': `Inventario de ${NOMBRE_EMPRESA[e]}` }, tablaInventario(e, inst))));
    });
    guardia.siCambia('conciliacion', rondas.map((r) => [r.ronda, EMPRESAS.map((e) => r.resumen?.empresas?.[e]?.conciliacion ?? null)]), () => {
      zonaConciliacion.replaceChildren(bloqueConciliacion(rondas));
    });
  }

  function renderPublico() {
    const p = ctx.estado.publico;
    if (!p) return;
    const resultados = p.resultados ?? [];
    if (!guardia.siCambia('publico', [resultados, p.veredictos, p.integridadDiario], () => {})) return;
    reemplazarConservando(
      zonaResultados,
      tabla({
        titulo: 'Resultados públicos por ronda',
        columnas: [
          { titulo: 'Ronda', valor: (r) => `R${r.ronda}`, encabezado: true },
          { titulo: 'Expediente', valor: (r) => r.expediente },
          { titulo: 'Ventas netas ALFA', valor: (r) => dinero(r.ventasNetas?.alfa), num: true },
          { titulo: 'Ventas netas OMEGA', valor: (r) => dinero(r.ventasNetas?.omega), num: true },
          { titulo: 'Resultado', valor: (r) => insigniaResultado(r.resultado, r.ganador) },
        ],
        filas: resultados,
        vacio: 'Aún no hay rondas cerradas.',
      }),
    );
    graficoPublico.actualizar(datosResultadosPublicos(resultados));
    reemplazarConservando(
      zonaVeredictos,
      tabla({
        titulo: 'Sentencias selladas',
        columnas: [
          { titulo: 'Ronda', valor: (v) => `R${v.ronda}`, encabezado: true },
          { titulo: 'Expediente', valor: (v) => v.expediente },
          { titulo: 'Resultado', valor: (v) => insigniaResultado(v.resultado, v.ganador) },
          { titulo: 'Hash de la sentencia', valor: (v) => hashEl(v.hashVeredicto) },
          { titulo: 'Seq', valor: (v) => `#${v.seq}`, num: true },
        ],
        filas: [...(p.veredictos ?? [])].reverse(),
        vacio: 'El Juez aún no emite sentencias.',
      }),
    );
    const integ = p.integridadDiario;
    zonaIntegridad.replaceChildren(
      integ
        ? definiciones([
            ['Cadena', integ.ok ? insignia('ok', 'Íntegra') : insignia('error', 'Con errores')],
            ['Eventos verificados', entero(integ.eventos)],
            ['Último hash', hashEl(integ.ultimoHash, 16)],
            integ.errores?.length ? ['Errores', el('ul', {}, integ.errores.map((x) => el('li', { texto: x })))] : null,
          ])
        : el('p', { clase: 'vacio', texto: 'Sin datos de integridad.' }),
    );
  }

  return {
    render() {
      const priv = ctx.estado.privilegiado;
      privado.hidden = !priv;
      publico.hidden = priv;
      renderFranja();
      if (priv) renderPrivado();
      else renderPublico();
      teletipo.render(ctx.estado.ticker);
      marcarDesplazables(panel);
    },
    renderTeletipo() {
      teletipo.render(ctx.estado.ticker);
    },
    /** Cambio de corrida o de sesión: los seq vuelven a empezar y nada se reutiliza. */
    reiniciar() {
      guardia.olvidar();
      teletipo.reiniciar();
    },
  };
}
