import {
  CAMPOS_ESTRATEGIA,
  EMPRESAS,
  NOMBRE_EMPRESA,
  NOMBRE_METRICA,
  chipEmpresa,
  definiciones,
  dinero,
  el,
  fechaLegible,
  fechaSimulada,
  hashEl,
  insignia,
  marcarDesplazables,
  nombreCampo,
  opcion,
  reemplazarOpciones,
  selector,
  tabla,
  valorCampo,
  valorMetrica,
} from '../modulos/util.js';

/*
 * Observatorio de estrategias. Cada decisión (AGENT_DECISION_RECORDED) con su agente,
 * hipótesis, presupuesto y resultado observado; el cambio frente a la estrategia
 * anterior (STRATEGY_CHANGED) y la comparación ALFA vs OMEGA por ronda.
 * Todo texto escrito por agentes es NO CONFIABLE: se inserta sólo con textContent.
 */

/** Estado completo de la estrategia por (empresa, ronda), plegando los cambios en orden de seq. */
function estrategiasPorRonda(estrategias) {
  const actual = { alfa: {}, omega: {} };
  const resultado = new Map();
  for (const s of [...estrategias].sort((a, b) => a.seq - b.seq)) {
    const siguiente = { ...actual[s.empresa] };
    for (const c of s.cambios) siguiente[c.campo] = c.nuevo;
    actual[s.empresa] = siguiente;
    resultado.set(`${s.ronda}:${s.empresa}`, { campos: siguiente, texto: s.estrategia, cambios: s.cambios, seq: s.seq });
  }
  return resultado;
}

function estadoHipotesis(d) {
  if (d.cumplida === true) return insignia('ok', 'Cumplida');
  if (d.cumplida === false) return insignia('error', 'No cumplida');
  return insignia('pendiente', 'Pendiente de cierre');
}

function tarjetaDecision(d, ctx) {
  const dpp = ctx.estado.config?.diasPorPeriodo ?? 7;
  const diaLogico = d.diaGlobal - (d.ronda - 1) * dpp;
  const vigente = fechaSimulada(ctx.estado.config?.fechaInicio, d.diaGlobal + 1);
  return el('article', { clase: `decision empresa-${d.empresa}`, 'aria-label': `Decisión de ${d.actor}, ronda ${d.ronda}` }, [
    el('header', { clase: 'decision-cabecera' }, [
      chipEmpresa(d.empresa),
      el('span', { clase: 'rol', texto: d.rol }),
      el('span', { clase: 'decision-actor', texto: `Agente responsable: ${d.actor}` }),
      el('span', { clase: 'decision-seq', texto: `seq #${d.seq}` }),
    ]),
    el('p', { clase: 'texto-agente decision-resumen', texto: d.resumen }),
    definiciones(
      [
        ['Ronda · día lógico', `Ronda ${d.ronda} · día ${diaLogico}${diaLogico === 0 ? ' (planeación)' : ''}`],
        ['Fecha simulada', vigente ? `vigente desde ${fechaLegible(vigente)}` : '—'],
        ['Hipótesis', el('span', { clase: 'texto-agente', texto: d.hipotesis?.texto ?? '—' })],
        ['Métrica', NOMBRE_METRICA[d.hipotesis?.metrica] ?? d.hipotesis?.metrica ?? '—'],
        ['Valor objetivo', `≥ ${valorMetrica(d.hipotesis?.metrica, d.hipotesis?.valor)}`],
        ['Presupuesto comprometido', dinero(d.presupuestoComprometido)],
        ['Observado vs objetivo', d.observado === null ? 'Pendiente' : `${valorMetrica(d.hipotesis?.metrica, d.observado)} vs ${valorMetrica(d.hipotesis?.metrica, d.hipotesis?.valor)}`],
        ['Resultado', estadoHipotesis(d)],
        ['Hash de la decisión', hashEl(d.hashDecision, 16)],
      ],
      'definiciones-compactas',
    ),
  ]);
}

function listaCambios(cambios) {
  if (!cambios || cambios.length === 0) return el('p', { clase: 'vacio', texto: 'Sin cambios frente a la ronda anterior.' });
  return el(
    'ul',
    { clase: 'lista-cambios' },
    cambios.map((c) =>
      el('li', {}, [
        el('span', { clase: 'cambio-campo', texto: nombreCampo(c.campo) }),
        el('span', { clase: 'cambio-anterior', texto: c.anterior === null ? '(sin valor previo)' : valorCampo(c.campo, c.anterior) }),
        el('span', { clase: 'cambio-flecha', 'aria-label': 'cambia a', texto: '→' }),
        el('strong', { clase: 'cambio-nuevo', texto: valorCampo(c.campo, c.nuevo) }),
      ]),
    ),
  );
}

function comparacion(ronda, mapa, decisiones, historico) {
  const de = (e) => mapa.get(`${ronda}:${e}`) ?? null;
  const resumen = historico.find((h) => h.ronda === ronda)?.empresas ?? null;
  const cumplidas = (e) => {
    const propias = decisiones.filter((d) => d.ronda === ronda && d.empresa === e);
    const evaluadas = propias.filter((d) => d.cumplida !== null);
    return evaluadas.length === 0 ? `${propias.length} decisiones, pendientes` : `${evaluadas.filter((d) => d.cumplida).length} de ${evaluadas.length} hipótesis cumplidas`;
  };
  const filas = [
    ...CAMPOS_ESTRATEGIA.map(([campo, nombre]) => ({ nombre, valores: EMPRESAS.map((e) => valorCampo(campo, de(e)?.campos?.[campo])), cambia: EMPRESAS.map((e) => Boolean(de(e)?.cambios?.some((c) => c.campo === campo))) })),
    { nombre: 'Ventas netas de la ronda', valores: EMPRESAS.map((e) => dinero(resumen?.[e]?.financiero?.ventasNetas)), cambia: [false, false] },
    { nombre: 'Margen de contribución', valores: EMPRESAS.map((e) => dinero(resumen?.[e]?.financiero?.margenContribucion)), cambia: [false, false] },
    { nombre: 'Hipótesis', valores: EMPRESAS.map(cumplidas), cambia: [false, false] },
  ];
  return el('div', { clase: 'pila' }, [
    el(
      'div',
      { clase: 'rejilla-2' },
      EMPRESAS.map((e) =>
        el('div', { clase: `declaracion empresa-${e}` }, [
          el('h4', { clase: 'declaracion-titulo' }, [chipEmpresa(e), ` · estrategia declarada en la ronda ${ronda}`]),
          el('p', { clase: 'texto-agente', texto: de(e)?.texto ?? 'Sin estrategia registrada en esta ronda.' }),
        ]),
      ),
    ),
    tabla({
      titulo: `Comparación de estrategias, ronda ${ronda}`,
      tituloVisible: true,
      columnas: [
        { titulo: 'Campo', valor: (f) => f.nombre, encabezado: true },
        ...EMPRESAS.map((e, j) => ({ titulo: NOMBRE_EMPRESA[e], valor: (f) => el('span', {}, [f.valores[j], f.cambia[j] ? el('span', { clase: 'marca-cambio', title: 'Cambió en esta ronda', texto: ' ▲ cambió' }) : null]) })),
      ],
      filas,
    }),
  ]);
}

export function crearVistaEstrategias(panel, ctx) {
  const filtros = { empresa: 'todas', rol: 'todos', ronda: 'todas' };
  let firma = '';
  const selEmpresa = selector('estr-empresa', 'Empresa', [opcion('todas', 'Ambas', true), opcion('alfa', 'ALFA'), opcion('omega', 'OMEGA')], (v) => {
    filtros.empresa = v;
    render();
  });
  const selRol = selector('estr-rol', 'Rol', [opcion('todos', 'Todos', true)], (v) => {
    filtros.rol = v;
    render();
  });
  const selRonda = selector('estr-ronda', 'Ronda', [opcion('todas', 'Todas', true)], (v) => {
    filtros.ronda = v;
    render();
  });
  const zonaComparacion = el('div');
  const zonaDecisiones = el('div', { clase: 'pila' });
  const conteo = el('p', { clase: 'tarjeta-desc', 'aria-live': 'polite' });

  panel.append(
    el('div', { clase: 'filtros filtros-principales', role: 'group', 'aria-label': 'Filtros del observatorio' }, [selEmpresa.campo, selRol.campo, selRonda.campo]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'estr-comp-titulo' }, [
      el('h2', { clase: 'tarjeta-titulo', id: 'estr-comp-titulo', texto: 'ALFA vs OMEGA: estrategias lado a lado' }),
      el('p', { clase: 'tarjeta-desc', texto: 'Estado de la estrategia de cada empresa en la ronda elegida (o la más reciente). ▲ marca los campos que cambiaron en esa ronda.' }),
      zonaComparacion,
    ]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'estr-dec-titulo' }, [
      el('h2', { clase: 'tarjeta-titulo', id: 'estr-dec-titulo', texto: 'Decisiones de los agentes' }),
      conteo,
      zonaDecisiones,
    ]),
  );

  function render() {
    const inst = ctx.estado.inst;
    if (!inst) return;
    const decisiones = inst.decisiones ?? [];
    const mapa = estrategiasPorRonda(inst.estrategias ?? []);
    const rondas = [...new Set([...decisiones.map((d) => d.ronda), ...(inst.estrategias ?? []).map((s) => s.ronda)])].sort((a, b) => b - a);
    const roles = [...new Set(decisiones.map((d) => d.rol))].sort();
    reemplazarOpciones(selRol.select, [opcion('todos', 'Todos'), ...roles.map((r) => opcion(r, r))]);
    reemplazarOpciones(selRonda.select, [opcion('todas', 'Todas'), ...rondas.map((r) => opcion(String(r), `Ronda ${r}`))]);
    filtros.rol = selRol.select.value;
    filtros.ronda = selRonda.select.value;

    const rondaComparada = filtros.ronda === 'todas' ? rondas[0] : Number(filtros.ronda);
    const resumenComparado = (inst.historico ?? []).find((h) => h.ronda === rondaComparada)?.empresas ?? null;
    const nuevaFirma = JSON.stringify([filtros, decisiones, (inst.estrategias ?? []).length, EMPRESAS.map((e) => resumenComparado?.[e]?.financiero ?? null), ctx.estado.config?.fechaInicio]);
    if (nuevaFirma === firma) return;
    firma = nuevaFirma;
    zonaComparacion.replaceChildren(rondaComparada ? comparacion(rondaComparada, mapa, decisiones, inst.historico ?? []) : el('p', { clase: 'vacio', texto: 'Aún no hay estrategias registradas.' }));

    const visibles = decisiones.filter(
      (d) => (filtros.empresa === 'todas' || d.empresa === filtros.empresa) && (filtros.rol === 'todos' || d.rol === filtros.rol) && (filtros.ronda === 'todas' || d.ronda === Number(filtros.ronda)),
    );
    conteo.textContent = `${visibles.length} de ${decisiones.length} decisiones con los filtros actuales.`;
    const grupos = [];
    for (const r of rondas) {
      for (const e of EMPRESAS) {
        const propias = visibles.filter((d) => d.ronda === r && d.empresa === e).sort((a, b) => a.seq - b.seq);
        if (propias.length === 0) continue;
        const estr = mapa.get(`${r}:${e}`);
        grupos.push(
          el('section', { clase: `grupo-decisiones empresa-${e}`, 'aria-label': `Ronda ${r}, ${NOMBRE_EMPRESA[e]}` }, [
            el('h3', { clase: 'grupo-titulo' }, [`Ronda ${r} · `, chipEmpresa(e)]),
            el('div', { clase: 'grupo-estrategia' }, [
              el('h4', { clase: 'subtitulo', texto: 'Diferencia frente a la estrategia anterior' }),
              estr ? listaCambios(estr.cambios) : el('p', { clase: 'vacio', texto: 'Sin cambio de estrategia registrado.' }),
            ]),
            el('div', { clase: 'decisiones' }, propias.map((d) => tarjetaDecision(d, ctx))),
          ]),
        );
      }
    }
    zonaDecisiones.replaceChildren(...(grupos.length ? grupos : [el('p', { clase: 'vacio', texto: 'No hay decisiones con estos filtros.' })]));
    marcarDesplazables(panel);
  }

  return { render };
}
