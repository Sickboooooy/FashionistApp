import { ruta } from '../modulos/api.js';
import { criptoDisponible, verificarCadena } from '../modulos/canonico.js';
import { graficoLineas } from '../modulos/graficas.js';
import {
  EMPRESAS,
  NOMBRE_EMPRESA,
  chipEmpresa,
  codigoDeTipo,
  dinero,
  dineroCompacto,
  el,
  entero,
  fechaLegible,
  fechaSimulada,
  insignia,
  marcarDesplazables,
  mensajeError,
  multiplo,
  opcion,
  porcentaje,
  reemplazarOpciones,
  selector,
} from '../modulos/util.js';
import { entradaTeletipo } from './en-vivo.js';

/*
 * Reproducción de rondas cerradas, 100 % en el navegador y de sólo lectura: descarga
 * los eventos sellados de la ronda y los aplica con el mismo reductor que usa el
 * servidor (crearProyeccion / aplicarEvento / resumenRonda de proyeccion.ts).
 */

const TICK_MS = 100;
const MAX_FEED = 80;
const VELOCIDADES = Object.freeze([
  [4000, '4 s por día'],
  [2000, '2 s por día'],
  [1000, '1 s por día'],
  [500, '0.5 s por día'],
  [200, '0.2 s por día'],
]);

const KPIS = [
  ['Ventas netas', (r) => dinero(r.financiero.ventasNetas)],
  ['Pedidos válidos', (r) => entero(r.pedidosValidos)],
  ['Pedidos cobrados', (r) => entero(r.pedidosPagados)],
  ['Margen de contribución', (r) => dinero(r.financiero.margenContribucion)],
  ['Utilidad operativa', (r) => dinero(r.financiero.utilidadOperativa)],
  ['Caja al cierre del día', (r) => (r.caja ? dinero(r.caja) : '—')],
  ['Marketing', (r) => dinero(r.financiero.marketing)],
  ['Conversión', (r) => porcentaje(r.conversion)],
  ['ROAS', (r) => multiplo(r.roas)],
];

let motorPromesa = null;
const cargarMotor = () =>
  (motorPromesa ??= import('/m/simulation/economics/proyeccion.ts').catch((error) => {
    motorPromesa = null; // un fallo transitorio no debe quedar en caché
    throw error;
  }));

export function crearVistaReproduccion(panel, ctx) {
  let sesion = null;
  let temporizador = null;
  let velocidad = 1000;
  let pintura = 0;
  let listadoCargado = '';
  let pedidoRondas = 0;
  let pedidoCarga = 0;

  const selCorrida = selector('rep-corrida', 'Corrida', [], () => {
    listadoCargado = `${selCorrida.select.value}|${ctx.estado.rondas.length}`;
    cargarRondas();
  });
  const selRonda = selector('rep-ronda', 'Ronda cerrada', []);
  const bCargar = el('button', { type: 'button', clase: 'boton boton-primario', texto: 'Cargar ronda' });
  const estadoCarga = el('p', { clase: 'tarjeta-desc', role: 'status', 'aria-live': 'polite' });

  const bReproducir = el('button', { type: 'button', clase: 'boton boton-primario', texto: 'Reproducir', disabled: true });
  const bPaso = el('button', { type: 'button', clase: 'boton', texto: 'Paso: siguiente día', disabled: true });
  const bInicio = el('button', { type: 'button', clase: 'boton', texto: 'Volver al inicio', disabled: true });
  const selVel = selector('rep-velocidad', 'Velocidad de reproducción', VELOCIDADES.map(([v, t]) => opcion(String(v), t, v === velocidad)), (v) => {
    velocidad = Number(v);
  });
  const progreso = el('progress', { clase: 'progreso', max: '1', value: '0', 'aria-label': 'Avance de la reproducción' });
  const textoProgreso = el('p', { clase: 'progreso-texto', 'aria-live': 'off' });
  const zonaKpis = el('div', { clase: 'rejilla-2' });
  const listaFeed = el('ol', { clase: 'teletipo-lista' });
  const grafico = graficoLineas({ titulo: 'Ventas netas acumuladas en la ronda', descripcion: 'Al cierre de cada día simulado reproducido.', formato: dinero, formatoEje: dineroCompacto, tituloCategoria: 'Día' });
  const zonaCadena = el('div');

  panel.append(
    el('p', { clase: 'nota', texto: 'Reproducción local y de sólo lectura: tu navegador vuelve a aplicar los eventos sellados del expediente de la ronda con el mismo reductor que usa el servidor. Nada se envía ni se modifica. Los indicadores se calculan sólo con los eventos de esa ronda; la caja aparece al cerrar el primer día simulado.' }),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'rep-sel-titulo' }, [
      el('h2', { clase: 'tarjeta-titulo', id: 'rep-sel-titulo', texto: 'Elegir ronda' }),
      el('div', { clase: 'filtros' }, [selCorrida.campo, selRonda.campo, el('div', { clase: 'campo campo-boton' }, bCargar)]),
      estadoCarga,
    ]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'rep-mandos-titulo' }, [
      el('h2', { clase: 'tarjeta-titulo', id: 'rep-mandos-titulo', texto: 'Reproductor' }),
      el('div', { clase: 'filtros' }, [el('div', { clase: 'acciones', role: 'group', 'aria-label': 'Mandos de reproducción' }, [bReproducir, bPaso, bInicio]), selVel.campo]),
      progreso,
      textoProgreso,
    ]),
    zonaKpis,
    el('div', { clase: 'rejilla-2' }, [
      el('div', { clase: 'tarjeta tarjeta-grafico' }, grafico.figura),
      el('section', { clase: 'tarjeta', 'aria-labelledby': 'rep-feed-titulo' }, [
        el('h2', { clase: 'tarjeta-titulo', id: 'rep-feed-titulo', texto: 'Eventos reproducidos' }),
        el('p', { clase: 'tarjeta-desc', texto: `Últimos ${MAX_FEED} eventos con código; el más reciente arriba.` }),
        el('div', { clase: 'desplazable teletipo-marco' }, listaFeed),
      ]),
    ]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'rep-cadena-titulo' }, [
      el('h2', { clase: 'tarjeta-titulo', id: 'rep-cadena-titulo', texto: 'Cadena de hashes de la ronda' }),
      el('p', { clase: 'tarjeta-desc', texto: 'Recalcula aquí cada hash: sha256(prevHash | JSON canónico del evento) y su enlace con el anterior, contra el manifiesto del expediente.' }),
      zonaCadena,
    ]),
  );

  function detener() {
    clearInterval(temporizador);
    temporizador = null;
    bReproducir.textContent = 'Reproducir';
  }

  function corridaElegida() {
    return selCorrida.select.value || undefined;
  }

  async function cargarRondas() {
    const pedido = ++pedidoRondas;
    try {
      const rondas = await ctx.obtener(ruta('/api/rondas', { corrida: corridaElegida() }));
      if (pedido !== pedidoRondas) return;
      reemplazarOpciones(selRonda.select, [...rondas].reverse().map((r) => opcion(String(r.ronda), `Ronda ${r.ronda}${r.sentencia ? ` · ${r.sentencia.resolucion}` : ''}`)));
      bCargar.disabled = rondas.length === 0;
      estadoCarga.textContent = rondas.length === 0 ? 'Esta corrida aún no tiene rondas cerradas.' : '';
    } catch (error) {
      if (pedido === pedidoRondas) estadoCarga.textContent = `No se pudieron listar las rondas: ${mensajeError(error)}`;
    }
  }

  bCargar.addEventListener('click', async () => {
    const n = Number(selRonda.select.value);
    if (!Number.isInteger(n) || n < 1) return;
    detener();
    const pedido = ++pedidoCarga;
    bCargar.disabled = true;
    estadoCarga.textContent = `Descargando los eventos de la ronda ${n}…`;
    try {
      const corrida = corridaElegida();
      const [motor, eventos, detalle] = await Promise.all([cargarMotor(), ctx.obtener(ruta(`/api/rondas/${n}/eventos`, { corrida })), ctx.obtener(ruta(`/api/rondas/${n}`, { corrida })).catch(() => null)]);
      if (pedido !== pedidoCarga) return;
      const dpp = ctx.estado.config?.diasPorPeriodo ?? 7;
      const ordenados = [...eventos].sort((a, b) => a.seq - b.seq);
      sesion = { motor, ronda: n, eventos: ordenados, manifiesto: detalle?.manifiesto ?? null, dpp, ...estadoInicial(motor, dpp) };
      estadoCarga.textContent = `Ronda ${n} lista: ${entero(ordenados.length)} eventos sellados.`;
      for (const b of [bReproducir, bPaso, bInicio]) b.disabled = false;
      progreso.max = String(Math.max(1, ordenados.length));
      renderCadena();
      pintar(true);
    } catch (error) {
      if (pedido === pedidoCarga) estadoCarga.textContent = `No se pudo cargar la ronda: ${mensajeError(error)}`;
    } finally {
      bCargar.disabled = false;
    }
  });

  function estadoInicial(motor, dpp) {
    return { p: motor.crearProyeccion(dpp), indice: 0, feed: [], puntos: [], diaActual: 0 };
  }

  function aplicarHasta(limite) {
    const s = sesion;
    while (s.indice < limite && s.indice < s.eventos.length) {
      const e = s.eventos[s.indice];
      s.motor.aplicarEvento(s.p, e);
      const codigo = codigoDeTipo(e.tipo);
      if (codigo) s.feed = [entradaTeletipo(codigo, e), ...s.feed].slice(0, MAX_FEED);
      s.indice++;
      if (e.ronda !== s.ronda) continue;
      if (e.tipo === 'cierre_dia' || s.indice === s.eventos.length) registrarPunto(e.dia);
      s.diaActual = e.dia;
    }
  }

  function registrarPunto(dia) {
    const r = sesion.motor.resumenRonda(sesion.p, sesion.ronda);
    if (!r) return;
    const punto = { dia, alfa: r.alfa.financiero.ventasNetas, omega: r.omega.financiero.ventasNetas };
    sesion.puntos = [...sesion.puntos.filter((x) => x.dia !== dia), punto].sort((a, b) => a.dia - b.dia);
  }

  /**
   * Índice del primer evento del bloque siguiente. Un bloque es (ronda, día): el expediente
   * de la ronda n empieza con la cola de la ronda anterior (su sentencia y memoria).
   */
  const bloque = (e) => `${e.ronda}:${e.dia}`;
  function finDelDia() {
    const s = sesion;
    if (s.indice >= s.eventos.length) return s.indice;
    const actual = bloque(s.eventos[s.indice]);
    let i = s.indice;
    while (i < s.eventos.length && bloque(s.eventos[i]) === actual) i++;
    return i;
  }

  /** Aplica eventos protegiendo el reproductor: un evento inesperado detiene la reproducción con aviso. */
  function seguro(fn) {
    try {
      fn();
    } catch (error) {
      detener();
      estadoCarga.textContent = `La reproducción se detuvo: ${mensajeError(error)}`;
    }
  }

  function tick() {
    seguro(avanzarTick);
  }

  function avanzarTick() {
    const s = sesion;
    if (!s || s.indice >= s.eventos.length) {
      detener();
      return;
    }
    const fin = finDelDia();
    const restantes = fin - s.indice;
    const ticksPorDia = Math.max(1, velocidad / TICK_MS);
    const actual = bloque(s.eventos[s.indice]);
    const delDia = s.eventos.filter((e) => bloque(e) === actual).length;
    const porTick = Math.max(1, Math.ceil(delDia / ticksPorDia));
    aplicarHasta(s.indice + Math.min(restantes, porTick));
    pintar();
    if (s.indice >= s.eventos.length) {
      detener();
      ctx.anunciar(`Reproducción de la ronda ${s.ronda} terminada.`);
    }
  }

  bReproducir.addEventListener('click', () => {
    if (!sesion) return;
    if (temporizador) {
      detener();
      return;
    }
    if (sesion.indice >= sesion.eventos.length) Object.assign(sesion, estadoInicial(sesion.motor, sesion.dpp));
    temporizador = setInterval(tick, TICK_MS);
    bReproducir.textContent = 'Pausar';
  });

  bPaso.addEventListener('click', () => {
    if (!sesion) return;
    detener();
    seguro(() => {
      aplicarHasta(finDelDia());
      pintar(true);
    });
  });

  bInicio.addEventListener('click', () => {
    if (!sesion) return;
    detener();
    Object.assign(sesion, estadoInicial(sesion.motor, sesion.dpp));
    pintar(true);
  });

  function pintar(inmediato = false) {
    if (inmediato) {
      cancelAnimationFrame(pintura);
      dibujar();
      return;
    }
    cancelAnimationFrame(pintura);
    pintura = requestAnimationFrame(dibujar);
  }

  function dibujar() {
    const s = sesion;
    if (!s) return;
    const total = s.eventos.length;
    progreso.value = String(s.indice);
    const fecha = fechaSimulada(ctx.estado.config?.fechaInicio, (s.ronda - 1) * s.dpp + Math.max(1, s.diaActual));
    const enCola = s.indice < total && s.eventos[s.indice].ronda !== s.ronda && s.indice < s.eventos.findIndex((e) => e.ronda === s.ronda);
    const etapa = enCola ? 'cierre de la ronda anterior (sentencia y aprendizaje)' : `día ${s.diaActual} de ${s.dpp}${s.diaActual === 0 ? ' (planeación)' : ''}`;
    textoProgreso.textContent = `Ronda ${s.ronda} · ${etapa} · ${fechaLegible(fecha)} (simulado) · evento ${entero(s.indice)} de ${entero(total)}`;
    const resumen = s.motor.resumenRonda(s.p, s.ronda);
    zonaKpis.replaceChildren(
      ...EMPRESAS.map((e) =>
        el('section', { clase: `tarjeta empresa empresa-${e}`, 'aria-label': `Indicadores reproducidos de ${NOMBRE_EMPRESA[e]}` }, [
          el('h2', { clase: 'empresa-nombre' }, chipEmpresa(e)),
          el(
            'div',
            { clase: 'kpis kpis-compactos' },
            KPIS.map(([nombre, f]) => el('div', { clase: 'kpi' }, [el('span', { clase: 'kpi-nombre', texto: nombre }), el('span', { clase: 'kpi-valor', texto: resumen ? f(resumen[e]) : '—' })])),
          ),
        ]),
      ),
    );
    listaFeed.replaceChildren(
      ...(s.feed.length
        ? s.feed.map((t) =>
            el('li', { clase: `teletipo-item codigo-${t.codigo.toLowerCase()}` }, [
              el('div', { clase: 'teletipo-linea' }, [el('span', { clase: 'teletipo-seq', texto: `#${t.seq}` }), el('span', { clase: 'codigo-evento', texto: t.codigo }), chipEmpresa(t.empresa), el('span', { clase: 'teletipo-ronda', texto: `R${t.ronda}·D${t.dia}` })]),
              t.resumen ? el('p', { clase: 'teletipo-resumen', texto: t.resumen }) : null,
            ]),
          )
        : [el('li', { clase: 'vacio', texto: 'Pulsa «Reproducir» o «Paso».' })]),
    );
    grafico.actualizar({
      puntos: s.puntos.map((pt) => ({ x: pt.dia, etiqueta: `Día ${pt.dia}`, detalle: `Ronda ${s.ronda} · día ${pt.dia}` })),
      series: EMPRESAS.map((e) => ({ id: e, nombre: NOMBRE_EMPRESA[e], valores: s.puntos.map((pt) => pt[e]) })),
      marcasX: s.puntos.map((pt) => ({ x: pt.dia, etiqueta: `D${pt.dia}` })),
      tituloTabla: 'Ventas netas acumuladas por día',
      vacio: 'Aún no se reproduce ningún día.',
      resumen: `Ventas netas acumuladas en la ronda ${s.ronda}`,
    });
    marcarDesplazables(panel);
  }

  function renderCadena() {
    const s = sesion;
    if (!s) {
      zonaCadena.replaceChildren(el('p', { clase: 'vacio', texto: 'Carga una ronda para verificar su cadena.' }));
      return;
    }
    const salida = el('div', { 'aria-live': 'polite' });
    const boton = el('button', { type: 'button', clase: 'boton', texto: `Verificar ${entero(s.eventos.length)} eventos en este navegador`, disabled: !criptoDisponible() });
    boton.addEventListener('click', async () => {
      boton.disabled = true;
      salida.replaceChildren(insignia('pendiente', 'Calculando…'));
      try {
        const r = await verificarCadena(s.eventos, { prevHashInicio: s.manifiesto?.prevHashInicio, hashFin: s.manifiesto?.hashFin }, (i, total) => salida.replaceChildren(insignia('pendiente', `Calculando… ${i} de ${total}`)));
        salida.replaceChildren(
          r.ok ? insignia('ok', `Cadena íntegra: ${entero(r.eventos)} eventos enlazados${s.manifiesto ? ' y coincidentes con el manifiesto' : ''}`) : insignia('error', `Cadena con errores (${r.errores.length})`),
          r.errores.length ? el('ul', { clase: 'diferencias' }, r.errores.map((x) => el('li', { texto: x }))) : '',
        );
      } catch (error) {
        salida.replaceChildren(insignia('error', `No se pudo verificar: ${mensajeError(error)}`));
      } finally {
        boton.disabled = false;
      }
    });
    zonaCadena.replaceChildren(boton, salida);
  }

  renderCadena();

  return {
    render() {
      const activa = ctx.estado.config?.corrida;
      const lista = ctx.estado.corridas ?? [];
      const opciones = lista.map((c) => opcion(c.id, `${c.id} · ${c.modo} · semilla ${c.semilla}${c.activa ? ' (activa)' : ''}`, c.activa));
      if (activa && !lista.some((c) => c.id === activa.id)) opciones.unshift(opcion('', `${activa.id} · ${activa.modo} · semilla ${activa.semilla} (activa)`, true));
      reemplazarOpciones(selCorrida.select, opciones);
      const claveListado = `${selCorrida.select.value}|${ctx.estado.rondas.length}`;
      if (claveListado !== listadoCargado) {
        listadoCargado = claveListado;
        cargarRondas();
      }
    },
    alSalir() {
      detener();
    },
    /** Cambio de corrida o de sesión: se descarta la reproducción (contiene datos privados). */
    reiniciar() {
      detener();
      pedidoRondas++;
      pedidoCarga++;
      sesion = null;
      listadoCargado = '';
      for (const b of [bReproducir, bPaso, bInicio]) b.disabled = true;
      progreso.value = '0';
      textoProgreso.textContent = '';
      estadoCarga.textContent = '';
      zonaKpis.replaceChildren();
      listaFeed.replaceChildren();
      grafico.actualizar({ puntos: [], series: [], vacio: 'Carga una ronda para reproducirla.' });
      renderCadena();
    },
  };
}
