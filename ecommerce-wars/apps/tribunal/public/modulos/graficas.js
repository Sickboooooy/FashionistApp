import { el, svg, tabla } from './util.js';

/*
 * Gráficas SVG escritas a mano (sin bibliotecas), según la guía de visualización:
 * - ALFA = categórico 1 (azul), OMEGA = categórico 2 (naranja), validados en claro y
 *   oscuro; identidad nunca sólo por color: leyenda + marcador (círculo / cuadrado).
 * - Líneas de 2 px, barras ≤ 24 px con extremo redondeado de 4 px, 2 px de separación,
 *   anillo de 2 px del color de superficie en marcadores, rejilla de 1 px recesiva.
 * - Información emergente al pasar el puntero y con el teclado (flechas); cada gráfica
 *   tiene su gemela en tabla. Los colores viven en war-room.css (clases, no estilos en línea).
 */

const MARCA_SERIE = Object.freeze({ alfa: 'circulo', omega: 'cuadrado' });
const BARRA_MAX = 24;
const SEPARACION = 2;
const RADIO = 4;
let contador = 0;

function ticksBonitos(min, max, objetivo = 4) {
  if (min === max) max = min + 1;
  const paso0 = (max - min) / objetivo;
  const magnitud = 10 ** Math.floor(Math.log10(paso0));
  const normal = paso0 / magnitud;
  const factor = normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 2.5 ? 2.5 : normal <= 5 ? 5 : 10;
  const paso = factor * magnitud;
  const inicio = Math.floor(min / paso) * paso;
  const fin = Math.ceil(max / paso) * paso;
  const ticks = [];
  for (let i = 0; inicio + i * paso <= fin + paso / 2; i++) ticks.push(Number((inicio + i * paso).toPrecision(12)));
  return ticks;
}

function marcador(forma, x, y, clase) {
  if (forma === 'cuadrado') return svg('rect', { x: x - 4, y: y - 4, width: 8, height: 8, rx: 1, clase });
  return svg('circle', { cx: x, cy: y, r: 4, clase });
}

function muestraLeyenda(serie, tipo) {
  const icono = svg('svg', { width: 22, height: 12, viewBox: '0 0 22 12', 'aria-hidden': 'true', focusable: 'false' });
  if (tipo === 'barra') {
    icono.append(svg('rect', { x: 5, y: 1, width: 12, height: 10, rx: 2, clase: `relleno-${serie.id}` }));
  } else {
    icono.append(svg('line', { x1: 1, y1: 6, x2: 21, y2: 6, clase: `trazo-${serie.id} linea-serie` }));
    icono.append(marcador(MARCA_SERIE[serie.id] ?? 'circulo', 11, 6, `relleno-${serie.id} anillo`));
  }
  return el('li', { clase: 'leyenda-item' }, [icono, el('span', { texto: serie.nombre })]);
}

function crearFigura({ titulo, descripcion, leyenda, tipoLeyenda, claseExtra }) {
  const id = `graf-${++contador}`;
  const lienzo = el('div', { clase: 'grafico-lienzo' });
  const emergente = el('div', { clase: 'emergente', hidden: true, 'aria-hidden': 'true' });
  const tablaCont = el('div', { clase: 'grafico-tabla', id: `${id}-tabla`, hidden: true });
  const boton = el('button', { type: 'button', clase: 'boton boton-mini', 'aria-expanded': 'false', 'aria-controls': `${id}-tabla`, texto: 'Ver tabla' });
  boton.addEventListener('click', () => {
    const abrir = tablaCont.hidden;
    tablaCont.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
    boton.textContent = abrir ? 'Ocultar tabla' : 'Ver tabla';
  });
  const cabecera = el('div', { clase: 'grafico-cabecera' }, [
    el('div', {}, [el('h3', { clase: 'grafico-titulo', id: `${id}-t`, texto: titulo }), descripcion ? el('p', { clase: 'grafico-desc', texto: descripcion }) : null]),
    boton,
  ]);
  const ley = leyenda && leyenda.length >= 2 ? el('ul', { clase: 'leyenda', 'aria-label': 'Leyenda' }, leyenda.map((s) => muestraLeyenda(s, tipoLeyenda))) : null;
  const figura = el('figure', { clase: `grafico ${claseExtra ?? ''}`, 'aria-labelledby': `${id}-t` }, [cabecera, ley, el('div', { clase: 'grafico-area' }, [lienzo, emergente]), tablaCont]);
  return { figura, lienzo, emergente, tablaCont, id };
}

const LEYENDA_EMPRESAS = [
  { id: 'alfa', nombre: 'ALFA' },
  { id: 'omega', nombre: 'OMEGA' },
];

/** Ciclo de vida común: redibuja al cambiar datos o ancho; omite trabajo si nada cambió. */
function controlador(base, dibujar, tablaDe) {
  let datos = null;
  let firma = '';
  let anchoPrevio = 0;
  const redibujar = () => {
    if (!datos) return;
    const ancho = Math.max(240, Math.floor(base.lienzo.clientWidth || 640));
    anchoPrevio = ancho;
    base.emergente.hidden = true;
    const teniaFoco = base.lienzo.contains(document.activeElement);
    base.lienzo.replaceChildren(dibujar(datos, ancho, base));
    // Un refresco en vivo no debe sacar del gráfico a quien lo recorre con el teclado.
    if (teniaFoco) base.lienzo.querySelector('svg[tabindex]')?.focus({ preventScroll: true });
  };
  const observador = new ResizeObserver(() => {
    const ancho = Math.floor(base.lienzo.clientWidth);
    if (ancho > 0 && ancho !== anchoPrevio) requestAnimationFrame(redibujar);
  });
  observador.observe(base.lienzo);
  return {
    figura: base.figura,
    actualizar(nuevos) {
      const f = JSON.stringify(nuevos);
      if (f === firma) return;
      firma = f;
      datos = nuevos;
      redibujar();
      base.tablaCont.replaceChildren(tablaDe(nuevos));
    },
  };
}

// --- Información emergente ------------------------------------------------------------

function llenarEmergente(emergente, titulo, filas) {
  emergente.replaceChildren(
    el('p', { clase: 'emergente-titulo', texto: titulo }),
    el(
      'ul',
      { clase: 'emergente-filas' },
      filas.map((f) =>
        el('li', {}, [
          f.id ? el('span', { clase: `clave-linea clave-${f.id}`, 'aria-hidden': 'true' }) : null,
          el('strong', { texto: f.valor }),
          el('span', { clase: 'emergente-nombre', texto: f.nombre }),
        ]),
      ),
    ),
  );
}

function posicionarEmergente(base, raiz, x, y) {
  const e = base.emergente;
  e.hidden = false;
  const area = base.lienzo.parentElement.getBoundingClientRect();
  const caja = raiz.getBoundingClientRect();
  const ax = caja.left - area.left + x;
  const ay = caja.top - area.top + y;
  const anchoArea = area.width;
  const anchoE = e.offsetWidth || 160;
  let izquierda = ax + 12;
  if (izquierda + anchoE > anchoArea) izquierda = ax - anchoE - 12;
  izquierda = Math.max(0, Math.min(izquierda, Math.max(0, anchoArea - anchoE)));
  e.style.left = `${Math.round(izquierda)}px`;
  e.style.top = `${Math.round(Math.max(0, ay))}px`;
}

/** Interacción común: puntero + teclado (flechas, Inicio, Fin) sobre un índice. */
function interaccion(raiz, base, total, alActivar, pasoVertical = 1) {
  let actual = -1;
  const mostrar = (i) => {
    if (i < 0 || i >= total) return;
    actual = i;
    alActivar(i);
  };
  const ocultar = () => {
    actual = -1;
    base.emergente.hidden = true;
    alActivar(-1);
  };
  raiz.addEventListener('pointerleave', ocultar);
  raiz.addEventListener('focus', () => mostrar(actual >= 0 ? actual : total - 1));
  raiz.addEventListener('blur', ocultar);
  raiz.addEventListener('keydown', (ev) => {
    const mapa = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -pasoVertical, ArrowDown: pasoVertical };
    if (ev.key in mapa) {
      ev.preventDefault();
      mostrar(Math.min(total - 1, Math.max(0, (actual < 0 ? total - 1 : actual) + mapa[ev.key])));
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      mostrar(0);
    } else if (ev.key === 'End') {
      ev.preventDefault();
      mostrar(total - 1);
    } else if (ev.key === 'Escape') {
      ocultar();
    }
  });
  return { mostrar };
}

// --- Ejes -----------------------------------------------------------------------------

function ejeY(g, ticks, y, x0, x1, formatoEje) {
  for (const t of ticks) {
    g.append(svg('line', { x1: x0, x2: x1, y1: y(t), y2: y(t), clase: t === 0 ? 'eje-base' : 'rejilla' }));
    g.append(svg('text', { x: x0 - 8, y: y(t) + 4, 'text-anchor': 'end', clase: 'eje-texto', texto: formatoEje(t) }));
  }
}

// --- Columnas agrupadas -----------------------------------------------------------------

function trazoBarra(x, yBase, yTope, ancho) {
  const alto = Math.abs(yBase - yTope);
  if (alto < 0.5) return null;
  const r = Math.min(RADIO, alto, ancho / 2);
  if (yTope <= yBase) {
    return `M${x},${yBase}V${yTope + r}A${r},${r} 0 0 1 ${x + r},${yTope}H${x + ancho - r}A${r},${r} 0 0 1 ${x + ancho},${yTope + r}V${yBase}Z`;
  }
  return `M${x},${yBase}V${yTope - r}A${r},${r} 0 0 0 ${x + r},${yTope}H${x + ancho - r}A${r},${r} 0 0 0 ${x + ancho},${yTope - r}V${yBase}Z`;
}

function dibujarColumnas(d, ancho, base, opciones) {
  const { alto, formato, formatoEje } = opciones;
  const m = { izq: 64, der: 12, sup: 22, inf: 30 };
  const w = ancho - m.izq - m.der;
  const h = alto - m.sup - m.inf;
  const n = d.categorias.length;
  const valores = d.series.flatMap((s) => s.valores).filter((v) => Number.isFinite(v));
  const ticks = ticksBonitos(Math.min(0, ...valores), Math.max(0, ...valores));
  const y0 = ticks[0];
  const y1 = ticks.at(-1);
  const y = (v) => m.sup + h - ((v - y0) / (y1 - y0)) * h;
  const banda = w / Math.max(1, n);
  const ns = d.series.length;
  const grosor = Math.max(3, Math.min(BARRA_MAX, (banda * 0.7 - (ns - 1) * SEPARACION) / ns));
  const grupo = grosor * ns + SEPARACION * (ns - 1);
  const raiz = svg('svg', { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}`, clase: 'svg-grafico', role: 'img', tabindex: '0', 'aria-label': d.resumen ?? 'Gráfica de columnas; usa las flechas para recorrer las categorías.' });
  const g = svg('g');
  ejeY(g, ticks, y, m.izq, ancho - m.der, formatoEje);
  const resaltes = [];
  const pasoEtiqueta = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 40))));
  d.categorias.forEach((cat, i) => {
    const cx = m.izq + banda * (i + 0.5);
    const resalte = svg('rect', { x: m.izq + banda * i, y: m.sup, width: banda, height: h, clase: 'resalte' });
    resaltes.push(resalte);
    g.append(resalte);
    d.series.forEach((s, j) => {
      const v = s.valores[i];
      if (!Number.isFinite(v)) return;
      const x = cx - grupo / 2 + j * (grosor + SEPARACION);
      const trazo = trazoBarra(x, y(0), y(v), grosor);
      if (trazo) g.append(svg('path', { d: trazo, clase: `marca relleno-${s.id}` }));
      const ultima = i === n - 1;
      if (ultima && banda >= 120) {
        const ty = v >= 0 ? y(v) - 6 : y(v) + 14;
        g.append(svg('text', { x: x + grosor / 2, y: ty, 'text-anchor': j === 0 ? 'end' : 'start', clase: 'etiqueta-valor', texto: formatoEje(v) }));
      }
    });
    if (i % pasoEtiqueta === 0 || i === n - 1) g.append(svg('text', { x: cx, y: alto - 10, 'text-anchor': 'middle', clase: 'eje-texto', texto: cat.etiqueta }));
  });
  raiz.append(g);
  const { mostrar } = interaccion(raiz, base, n, (i) => {
    resaltes.forEach((r, k) => r.classList.toggle('activo', k === i));
    if (i < 0) return;
    const cat = d.categorias[i];
    llenarEmergente(base.emergente, cat.detalle ?? cat.etiqueta, d.series.map((s) => ({ id: s.id, nombre: s.nombre, valor: formato(s.valores[i]) })));
    posicionarEmergente(base, raiz, m.izq + banda * (i + 0.5), m.sup);
  });
  raiz.addEventListener('pointermove', (ev) => {
    const caja = raiz.getBoundingClientRect();
    const i = Math.floor((ev.clientX - caja.left - m.izq) / banda);
    if (i >= 0 && i < n) mostrar(i);
  });
  return raiz;
}

function tablaCategorias(d, formato, tituloCategoria) {
  return tabla({
    titulo: d.tituloTabla ?? 'Valores de la gráfica',
    columnas: [
      { titulo: tituloCategoria, valor: (f) => f.cat.detalle ?? f.cat.etiqueta, encabezado: true },
      ...d.series.map((s, j) => ({ titulo: s.nombre, valor: (f) => formato(f.valores[j]), num: true })),
    ],
    filas: d.categorias.map((cat, i) => ({ cat, valores: d.series.map((s) => s.valores[i]) })),
  });
}

/**
 * Columnas agrupadas ALFA/OMEGA por categoría (rondas). datos:
 * { categorias: [{ etiqueta, detalle }], series: [{ id, nombre, valores }], resumen }.
 */
export function graficoColumnas({ titulo, descripcion, alto = 230, formato, formatoEje, tituloCategoria = 'Ronda' }) {
  const base = crearFigura({ titulo, descripcion, leyenda: LEYENDA_EMPRESAS, tipoLeyenda: 'barra' });
  return controlador(
    base,
    (d, ancho) => (d.categorias.length === 0 ? el('p', { clase: 'vacio', texto: d.vacio ?? 'Aún no hay datos.' }) : dibujarColumnas(d, ancho, base, { alto, formato, formatoEje })),
    (d) => tablaCategorias(d, formato, tituloCategoria),
  );
}

// --- Líneas ---------------------------------------------------------------------------

function etiquetasFinales(d, ultimo, y, formatoEje) {
  const finales = d.series
    .map((s) => ({ s, v: s.valores[ultimo] }))
    .filter((f) => Number.isFinite(f.v))
    .map((f) => ({ ...f, py: y(f.v) }));
  if (finales.length === 2 && Math.abs(finales[0].py - finales[1].py) < 16) return [];
  return finales.map((f) => ({ ...f, texto: `${f.s.nombre} ${formatoEje(f.v)}` }));
}

function dibujarLineas(d, ancho, base, opciones) {
  const { alto, formato, formatoEje } = opciones;
  const conEtiquetas = ancho >= 440;
  const m = { izq: 64, der: conEtiquetas ? 104 : 14, sup: 22, inf: 30 };
  const w = ancho - m.izq - m.der;
  const h = alto - m.sup - m.inf;
  const n = d.puntos.length;
  const xs = d.puntos.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const x = (v) => (xMax === xMin ? m.izq + w / 2 : m.izq + ((v - xMin) / (xMax - xMin)) * w);
  const valores = d.series.flatMap((s) => s.valores).filter((v) => Number.isFinite(v));
  const ticks = ticksBonitos(Math.min(0, ...valores), Math.max(0, ...valores));
  const y = (v) => m.sup + h - ((v - ticks[0]) / (ticks.at(-1) - ticks[0])) * h;
  const raiz = svg('svg', { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}`, clase: 'svg-grafico', role: 'img', tabindex: '0', 'aria-label': d.resumen ?? 'Gráfica de líneas; usa las flechas para recorrer los puntos.' });
  const g = svg('g');
  ejeY(g, ticks, y, m.izq, m.izq + w, formatoEje);
  for (const sep of d.separadores ?? []) {
    if (sep.x < xMin || sep.x > xMax) continue;
    g.append(svg('line', { x1: x(sep.x), x2: x(sep.x), y1: m.sup - 6, y2: m.sup + h, clase: 'separador' }));
    g.append(svg('text', { x: x(sep.x) + 4, y: m.sup - 8, clase: 'eje-texto', texto: sep.etiqueta }));
  }
  for (const marca of d.marcasX ?? []) g.append(svg('text', { x: x(marca.x), y: alto - 10, 'text-anchor': 'middle', clase: 'eje-texto', texto: marca.etiqueta }));
  for (const s of d.series) {
    let trazo = '';
    let abierto = false;
    s.valores.forEach((v, i) => {
      if (!Number.isFinite(v)) {
        abierto = false;
        return;
      }
      trazo += `${abierto ? 'L' : 'M'}${x(d.puntos[i].x).toFixed(1)},${y(v).toFixed(1)}`;
      abierto = true;
    });
    if (trazo) g.append(svg('path', { d: trazo, clase: `linea-serie trazo-${s.id}` }));
  }
  const ultimo = n - 1;
  for (const s of d.series) {
    const v = s.valores[ultimo];
    if (Number.isFinite(v)) g.append(marcador(MARCA_SERIE[s.id] ?? 'circulo', x(d.puntos[ultimo].x), y(v), `relleno-${s.id} anillo`));
  }
  if (conEtiquetas) {
    for (const f of etiquetasFinales(d, ultimo, y, formatoEje)) g.append(svg('text', { x: x(d.puntos[ultimo].x) + 10, y: f.py + 4, clase: 'etiqueta-valor', texto: f.texto }));
  }
  const cruz = svg('line', { y1: m.sup, y2: m.sup + h, clase: 'cruz', visibility: 'hidden' });
  const puntosActivos = svg('g', { visibility: 'hidden' });
  g.append(cruz, puntosActivos, svg('rect', { x: m.izq, y: m.sup, width: Math.max(1, w), height: h, clase: 'golpe' }));
  raiz.append(g);
  const { mostrar } = interaccion(raiz, base, n, (i) => {
    const visible = i >= 0 ? 'visible' : 'hidden';
    cruz.setAttribute('visibility', visible);
    puntosActivos.setAttribute('visibility', visible);
    if (i < 0) return;
    const px = x(d.puntos[i].x);
    cruz.setAttribute('x1', px);
    cruz.setAttribute('x2', px);
    puntosActivos.replaceChildren(
      ...d.series.filter((s) => Number.isFinite(s.valores[i])).map((s) => marcador(MARCA_SERIE[s.id] ?? 'circulo', px, y(s.valores[i]), `relleno-${s.id} anillo`)),
    );
    llenarEmergente(base.emergente, d.puntos[i].detalle ?? d.puntos[i].etiqueta, d.series.map((s) => ({ id: s.id, nombre: s.nombre, valor: formato(s.valores[i]) })));
    posicionarEmergente(base, raiz, px, m.sup);
  });
  raiz.addEventListener('pointermove', (ev) => {
    const caja = raiz.getBoundingClientRect();
    const px = ev.clientX - caja.left;
    let mejor = 0;
    let distancia = Infinity;
    d.puntos.forEach((p, i) => {
      const dd = Math.abs(x(p.x) - px);
      if (dd < distancia) {
        distancia = dd;
        mejor = i;
      }
    });
    mostrar(mejor);
  });
  return raiz;
}

/**
 * Líneas por empresa con cruz que se ajusta al punto más cercano. datos:
 * { puntos: [{ x, etiqueta, detalle }], series, separadores?, marcasX?, resumen }.
 */
export function graficoLineas({ titulo, descripcion, alto = 240, formato, formatoEje, tituloCategoria = 'Punto' }) {
  const base = crearFigura({ titulo, descripcion, leyenda: LEYENDA_EMPRESAS, tipoLeyenda: 'linea' });
  return controlador(
    base,
    (d, ancho) => (d.puntos.length === 0 ? el('p', { clase: 'vacio', texto: d.vacio ?? 'Aún no hay datos.' }) : dibujarLineas(d, ancho, base, { alto, formato, formatoEje })),
    (d) =>
      tablaCategorias(
        { tituloTabla: d.tituloTabla, series: d.series, categorias: d.puntos.map((p) => ({ etiqueta: p.etiqueta, detalle: p.detalle })) },
        formato,
        tituloCategoria,
      ),
  );
}

// --- Mapa de calor (magnitud 0–100) -----------------------------------------------------

const PASOS_CALOR = 7;

function pasoCalor(v, min, max) {
  if (!Number.isFinite(v)) return null;
  const t = (v - min) / Math.max(1e-9, max - min);
  return Math.min(PASOS_CALOR - 1, Math.max(0, Math.floor(t * PASOS_CALOR)));
}

function dibujarCalor(d, ancho, base) {
  const m = { izq: 104, der: 8, sup: 24, inf: 8 };
  const columnas = d.columnas.length;
  const celdaW = Math.max(34, Math.min(64, (ancho - m.izq - m.der) / Math.max(1, columnas)));
  const celdaH = 28;
  const anchoReal = m.izq + m.der + celdaW * columnas;
  const altoReal = m.sup + m.inf + celdaH * d.filas.length;
  const raiz = svg('svg', { width: anchoReal, height: altoReal, viewBox: `0 0 ${anchoReal} ${altoReal}`, clase: 'svg-grafico', role: 'img', tabindex: '0', 'aria-label': d.resumen ?? 'Mapa de calor; usa las flechas para recorrer las celdas.' });
  const celdas = [];
  d.columnas.forEach((c, j) => raiz.append(svg('text', { x: m.izq + celdaW * (j + 0.5), y: m.sup - 8, 'text-anchor': 'middle', clase: 'eje-texto', texto: c })));
  d.filas.forEach((f, i) => {
    raiz.append(svg('text', { x: m.izq - 8, y: m.sup + celdaH * (i + 0.5) + 4, 'text-anchor': 'end', clase: 'eje-texto eje-fila', texto: f }));
    d.columnas.forEach((_, j) => {
      const v = d.valores[i]?.[j];
      const paso = pasoCalor(v, d.min, d.max);
      const cx = m.izq + celdaW * j;
      const cy = m.sup + celdaH * i;
      const rect = svg('rect', { x: cx + 1, y: cy + 1, width: celdaW - SEPARACION, height: celdaH - SEPARACION, rx: 3, clase: paso === null ? 'calor-vacio' : `calor-${paso}` });
      raiz.append(rect);
      raiz.append(svg('text', { x: cx + celdaW / 2, y: cy + celdaH / 2 + 4, 'text-anchor': 'middle', clase: paso !== null && paso >= 4 ? 'calor-texto calor-texto-alto' : 'calor-texto', texto: Number.isFinite(v) ? String(Math.round(v)) : '—' }));
      celdas.push({ i, j, v, rect, cx, cy });
    });
  });
  const { mostrar } = interaccion(raiz, base, celdas.length, (k) => {
    celdas.forEach((c, idx) => c.rect.classList.toggle('activo', idx === k));
    if (k < 0) return;
    const c = celdas[k];
    llenarEmergente(base.emergente, `${d.filas[c.i]} · ${d.columnas[c.j]}`, [{ nombre: d.unidad ?? '', valor: Number.isFinite(c.v) ? String(Math.round(c.v)) : 'sin dato' }]);
    posicionarEmergente(base, raiz, c.cx + celdaW / 2, c.cy);
  }, columnas);
  raiz.addEventListener('pointermove', (ev) => {
    const caja = raiz.getBoundingClientRect();
    const j = Math.floor((ev.clientX - caja.left - m.izq) / celdaW);
    const i = Math.floor((ev.clientY - caja.top - m.sup) / celdaH);
    if (i >= 0 && i < d.filas.length && j >= 0 && j < columnas) mostrar(i * columnas + j);
  });
  return raiz;
}

function escalaCalor(d) {
  const pasos = Array.from({ length: PASOS_CALOR }, (_, k) => k);
  const tramo = (d.max - d.min) / PASOS_CALOR;
  return el('div', { clase: 'escala-calor', 'aria-hidden': 'true' }, [
    el('span', { clase: 'escala-texto', texto: String(d.min) }),
    el('span', { clase: 'escala-pasos' }, pasos.map((k) => el('span', { clase: `escala-paso calor-fondo-${k}`, title: `${Math.round(d.min + k * tramo)}–${Math.round(d.min + (k + 1) * tramo)}` }))),
    el('span', { clase: 'escala-texto', texto: String(d.max) }),
  ]);
}

/**
 * Mapa de calor con rampa secuencial neutra (el azul y el naranja quedan reservados
 * para la identidad de ALFA y OMEGA). datos: { filas, columnas, valores, min, max, unidad }.
 */
export function mapaCalor({ titulo, descripcion }) {
  const base = crearFigura({ titulo, descripcion, leyenda: null, claseExtra: 'grafico-calor' });
  const ctl = controlador(
    base,
    (d, ancho) => {
      if (d.filas.length === 0 || d.columnas.length === 0) return el('p', { clase: 'vacio', texto: d.vacio ?? 'Aún no hay datos.' });
      const cont = el('div', { clase: 'calor-contenedor' }, [el('div', { clase: 'desplazable calor-desplazable' }, dibujarCalor(d, ancho, base)), escalaCalor(d)]);
      return cont;
    },
    (d) =>
      tabla({
        titulo: d.tituloTabla ?? 'Valores del mapa de calor',
        columnas: [{ titulo: 'Fila', valor: (f) => f.fila, encabezado: true }, ...d.columnas.map((c, j) => ({ titulo: c, valor: (f) => (Number.isFinite(f.valores[j]) ? String(Math.round(f.valores[j])) : '—'), num: true }))],
        filas: d.filas.map((fila, i) => ({ fila, valores: d.valores[i] ?? [] })),
      }),
  );
  return ctl;
}

// --- Participación (parte del todo, 2 segmentos) ----------------------------------------

/** Barra 100 % ALFA | OMEGA con 2 px de separación y etiquetas directas en texto. */
export function barraParticipacion(partes, formato) {
  const total = partes.reduce((a, p) => a + (Number.isFinite(p.valor) ? Math.max(0, p.valor) : 0), 0);
  const pista = el('div', { clase: 'participacion-pista', role: 'img', 'aria-label': partes.map((p) => `${p.nombre} ${formato(total > 0 ? p.valor / total : null)}`).join(', ') });
  for (const p of partes) {
    const fraccion = total > 0 ? Math.max(0, p.valor) / total : 0;
    if (fraccion <= 0) continue;
    const seg = el('div', { clase: `participacion-segmento relleno-fondo-${p.id}` });
    seg.style.flexGrow = String(fraccion);
    pista.append(seg);
  }
  if (total <= 0) pista.append(el('div', { clase: 'participacion-vacia' }));
  const etiquetas = el(
    'div',
    { clase: 'participacion-etiquetas' },
    partes.map((p) =>
      el('span', { clase: `participacion-etiqueta participacion-${p.id}` }, [
        el('span', { clase: `marcador-forma forma-${MARCA_SERIE[p.id] ?? 'circulo'} relleno-fondo-${p.id}`, 'aria-hidden': 'true' }),
        el('span', { texto: p.nombre }),
        el('strong', { texto: formato(total > 0 ? p.valor / total : null) }),
      ]),
    ),
  );
  return el('div', { clase: 'participacion' }, [etiquetas, pista]);
}

/** Medidor 0..1 con pista de la misma rampa (neutra). */
export function medidor(fraccion, etiqueta) {
  const f = Number.isFinite(fraccion) ? Math.max(0, Math.min(1, fraccion)) : 0;
  const relleno = el('span', { clase: 'medidor-relleno' });
  relleno.style.width = `${(f * 100).toFixed(1)}%`;
  return el('span', { clase: 'medidor', role: 'img', 'aria-label': etiqueta }, relleno);
}
