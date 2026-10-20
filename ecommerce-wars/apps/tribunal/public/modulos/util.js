/*
 * Utilidades del War Room: formato es-MX, construcción segura del DOM (sólo
 * textContent: todo texto de API o de agentes es NO CONFIABLE) y catálogos.
 */

export const EMPRESAS = Object.freeze(['alfa', 'omega']);
export const NOMBRE_EMPRESA = Object.freeze({ alfa: 'ALFA', omega: 'OMEGA' });

/** Espejo de CODIGOS_WAR_ROOM y CODIGO_POR_TIPO (shared/schemas/eventos.ts). */
export const CODIGOS_WAR_ROOM = Object.freeze([
  'ROUND_STARTED',
  'INVENTORY_PURCHASED',
  'PRICE_CHANGED',
  'CAMPAIGN_STARTED',
  'CAMPAIGN_STOPPED',
  'ORDER_CREATED',
  'ORDER_PAID_SIMULATED',
  'ORDER_CANCELLED',
  'ORDER_REFUNDED',
  'STRATEGY_CHANGED',
  'AGENT_DECISION_RECORDED',
  'ROUND_CLOSED',
  'JUDGE_VERDICT',
]);

const CODIGO_POR_TIPO = Object.freeze({
  ronda_iniciada: 'ROUND_STARTED',
  orden_emitida: 'INVENTORY_PURCHASED',
  precio_cambiado: 'PRICE_CHANGED',
  campana_iniciada: 'CAMPAIGN_STARTED',
  campana_detenida: 'CAMPAIGN_STOPPED',
  campana_pausada: 'CAMPAIGN_STOPPED',
  pedido_creado: 'ORDER_CREATED',
  pedido_cobrado: 'ORDER_PAID_SIMULATED',
  pedido_cancelado: 'ORDER_CANCELLED',
  devolucion_procesada: 'ORDER_REFUNDED',
  estrategia_cambiada: 'STRATEGY_CHANGED',
  decision_registrada: 'AGENT_DECISION_RECORDED',
  cierre_periodo: 'ROUND_CLOSED',
  veredicto_emitido: 'JUDGE_VERDICT',
});

export const codigoDeTipo = (tipo) => CODIGO_POR_TIPO[tipo] ?? null;

export const NOMBRE_CODIGO = Object.freeze({
  ROUND_STARTED: 'Ronda iniciada',
  INVENTORY_PURCHASED: 'Compra de inventario',
  PRICE_CHANGED: 'Cambio de precio',
  CAMPAIGN_STARTED: 'Campaña iniciada',
  CAMPAIGN_STOPPED: 'Campaña detenida',
  ORDER_CREATED: 'Pedido creado',
  ORDER_PAID_SIMULATED: 'Cobro simulado',
  ORDER_CANCELLED: 'Pedido cancelado',
  ORDER_REFUNDED: 'Devolución',
  STRATEGY_CHANGED: 'Cambio de estrategia',
  AGENT_DECISION_RECORDED: 'Decisión de agente',
  ROUND_CLOSED: 'Ronda cerrada',
  JUDGE_VERDICT: 'Sentencia del Juez',
});

// --- Formato ---------------------------------------------------------------------

const FMT_MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const FMT_MXN_COMPACTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 });
const FMT_ENTERO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const FMT_COMPACTO = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const FMT_DECIMAL = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FMT_PCT = new Intl.NumberFormat('es-MX', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const FMT_HORA = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const esNumero = (x) => typeof x === 'number' && Number.isFinite(x);

/** Centavos enteros MXN → moneda. */
export const dinero = (centavos) => (esNumero(centavos) ? FMT_MXN.format(centavos / 100) : '—');
export const dineroCompacto = (centavos) => (esNumero(centavos) ? FMT_MXN_COMPACTO.format(centavos / 100) : '—');
export const entero = (n) => (esNumero(n) ? FMT_ENTERO.format(n) : '—');
export const compacto = (n) => (esNumero(n) ? FMT_COMPACTO.format(n) : '—');
export const decimal = (n) => (esNumero(n) ? FMT_DECIMAL.format(n) : '—');
export const porcentaje = (fraccion) => (esNumero(fraccion) ? FMT_PCT.format(fraccion) : '—');
export const multiplo = (x) => (esNumero(x) ? `${FMT_DECIMAL.format(x)}×` : '—');
export const hashCorto = (h, n = 10) => (typeof h === 'string' && h.length > 0 ? h.slice(0, n) : '—');

export function horaReal(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '—' : FMT_HORA.format(t);
}

export function fechaLegible(isoDia) {
  if (typeof isoDia !== 'string') return '—';
  const t = Date.parse(`${isoDia}T00:00:00Z`);
  return Number.isNaN(t) ? '—' : FMT_FECHA.format(t);
}

const MS_DIA = 86_400_000;

/** Respaldo idéntico a shared/calendario.ts, usado sólo si el módulo del motor no carga. */
function fechaSimuladaRespaldo(fechaInicio, diaGlobal) {
  const base = Date.parse(`${fechaInicio}T00:00:00Z`);
  if (Number.isNaN(base)) throw new RangeError(`fecha de inicio inválida: ${fechaInicio}`);
  return new Date(base + (Math.max(1, diaGlobal) - 1) * MS_DIA).toISOString().slice(0, 10);
}

let fechaSimuladaMotor = fechaSimuladaRespaldo;

/**
 * Carga fechaSimulada desde /m/shared/calendario.ts (el mismo código del motor). Si el
 * módulo no está disponible, la app sigue funcionando con el respaldo equivalente.
 */
export async function cargarCalendario() {
  try {
    const modulo = await import('/m/shared/calendario.ts');
    if (typeof modulo.fechaSimulada === 'function') fechaSimuladaMotor = modulo.fechaSimulada;
    return true;
  } catch {
    return false;
  }
}

/** Fecha simulada del día global N con el módulo del motor (tiempo lógico, no reloj real). */
export function fechaSimulada(fechaInicio, diaGlobal) {
  if (typeof fechaInicio !== 'string' || !esNumero(diaGlobal)) return null;
  try {
    return fechaSimuladaMotor(fechaInicio, diaGlobal);
  } catch {
    return null;
  }
}

export const NOMBRE_METRICA = Object.freeze({
  ventas_netas: 'Ventas netas',
  margen_contribucion: 'Margen de contribución',
  utilidad_operativa: 'Utilidad operativa',
  roas: 'ROAS',
  tasa_servicio: 'Tasa de servicio',
  conversion: 'Conversión',
  ticket_promedio: 'Ticket promedio',
  caja_final: 'Caja final',
});

const FORMATO_METRICA = Object.freeze({
  ventas_netas: dinero,
  margen_contribucion: dinero,
  utilidad_operativa: dinero,
  caja_final: dinero,
  ticket_promedio: dinero,
  roas: multiplo,
  tasa_servicio: porcentaje,
  conversion: porcentaje,
});

export const valorMetrica = (metrica, v) => (FORMATO_METRICA[metrica] ?? decimal)(v);

/** Campos de ResumenEstrategia (harness/orchestrator/estrategia.ts) con su formato. */
export const CAMPOS_ESTRATEGIA = Object.freeze([
  ['participacion_inventario', 'Presupuesto a inventario', porcentaje],
  ['participacion_marketing', 'Presupuesto a adquisición', porcentaje],
  ['participacion_fichas', 'Presupuesto a fichas de producto', porcentaje],
  ['multiplicador_precio_medio', 'Multiplicador de precio medio', multiplo],
  ['canales', 'Canales', null],
  ['segmentos', 'Segmentos', null],
  ['angulos', 'Ángulos creativos', null],
  ['proveedores', 'Proveedores', null],
  ['envio_gratis_desde', 'Envío gratis desde', dinero],
  ['promociones', 'Promociones', entero],
]);

const CAMPO_POR_ID = new Map(CAMPOS_ESTRATEGIA.map(([id, nombre, fmt]) => [id, { nombre, fmt }]));

export const nombreCampo = (campo) => CAMPO_POR_ID.get(campo)?.nombre ?? campo;

export function valorCampo(campo, v) {
  if (v === null || v === undefined) return '—';
  const fmt = CAMPO_POR_ID.get(campo)?.fmt;
  return fmt && typeof v === 'number' ? fmt(v) : String(v);
}

export function resultadoTexto(resultado, ganador) {
  if (resultado === 'ganador') return `Ganador: ${NOMBRE_EMPRESA[ganador] ?? '—'}`;
  if (resultado === 'sin_ganador') return 'Sin ganador';
  if (resultado === 'ronda_invalida') return 'Ronda inválida';
  return '—';
}

// --- DOM seguro --------------------------------------------------------------------

/**
 * Crea un elemento. Atributos con `clase`, `texto` (textContent), `on<evento>`
 * (addEventListener, nunca atributos en línea) y el resto como atributos.
 * Nunca acepta HTML: los hijos de texto se insertan como nodos de texto.
 */
export function el(etiqueta, opciones = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);
  aplicarOpciones(nodo, opciones);
  anexar(nodo, hijos);
  return nodo;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg(etiqueta, opciones = {}, hijos = []) {
  const nodo = document.createElementNS(SVG_NS, etiqueta);
  aplicarOpciones(nodo, opciones);
  anexar(nodo, hijos);
  return nodo;
}

function aplicarOpciones(nodo, opciones) {
  for (const [clave, valor] of Object.entries(opciones)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === 'clase') nodo.setAttribute('class', valor);
    else if (clave === 'texto') nodo.textContent = String(valor);
    else if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);
    else if (clave === 'style') throw new Error('estilos en línea prohibidos por la CSP');
    else nodo.setAttribute(clave, valor === true ? '' : String(valor));
  }
}

function anexar(nodo, hijos) {
  const lista = Array.isArray(hijos) ? hijos : [hijos];
  for (const h of lista) {
    if (h === null || h === undefined || h === false) continue;
    if (Array.isArray(h)) anexar(nodo, h);
    else nodo.append(h instanceof Node ? h : document.createTextNode(String(h)));
  }
}

const ICONO_INSIGNIA = Object.freeze({ ok: '✓', error: '✗', aviso: '!', pendiente: '◷', info: 'i', critico: '‼' });

/** Estado nunca sólo por color: icono + texto. */
export function insignia(tipo, texto, titulo) {
  return el('span', { clase: `insignia insignia-${tipo}`, title: titulo }, [
    el('span', { clase: 'insignia-icono', 'aria-hidden': 'true', texto: ICONO_INSIGNIA[tipo] ?? '•' }),
    el('span', { texto }),
  ]);
}

export function insigniaBool(valor, textoSi, textoNo, textoNulo = 'Pendiente') {
  if (valor === true) return insignia('ok', textoSi);
  if (valor === false) return insignia('error', textoNo);
  return insignia('pendiente', textoNulo);
}

/** Identidad de empresa: marcador con forma propia (círculo ALFA, cuadrado OMEGA) + nombre. */
export function chipEmpresa(empresa) {
  if (empresa !== 'alfa' && empresa !== 'omega') return el('span', { clase: 'chip-empresa chip-mercado', texto: 'Mercado' });
  return el('span', { clase: `chip-empresa chip-${empresa}` }, [el('span', { clase: 'marcador', 'aria-hidden': 'true' }), NOMBRE_EMPRESA[empresa]]);
}

export function insigniaResultado(resultado, ganador) {
  if (resultado === 'ganador') {
    return el('span', { clase: 'insignia insignia-ganador' }, [el('span', { clase: 'insignia-icono', 'aria-hidden': 'true', texto: '★' }), 'Ganador ', chipEmpresa(ganador)]);
  }
  if (resultado === 'ronda_invalida') return insignia('error', 'Ronda inválida');
  if (resultado === 'sin_ganador') return insignia('info', 'Sin ganador');
  return insignia('pendiente', 'Sin sentencia');
}

/** Texto monoespaciado para hashes; el valor completo queda en title y en el portapapeles al seleccionar. */
export function hashEl(h, n = 12) {
  return el('code', { clase: 'hash', title: typeof h === 'string' ? h : undefined, texto: hashCorto(h, n) });
}

export function hashCompleto(h) {
  return el('code', { clase: 'hash hash-completo', texto: typeof h === 'string' && h ? h : '—' });
}

/**
 * Tabla accesible. columnas: [{ titulo, valor: (fila) => string|Node, num?, encabezado? }].
 * Las tablas anchas se desplazan dentro de su propio contenedor.
 */
export function tabla({ titulo, columnas, filas, vacio = 'Sin datos.', clase = '', tituloVisible = false, claseFila }) {
  if (!filas || filas.length === 0) return el('p', { clase: 'vacio', texto: vacio });
  const thead = el('thead', {}, el('tr', {}, columnas.map((c) => el('th', { scope: 'col', clase: c.num ? 'num' : undefined, texto: c.titulo }))));
  const tbody = el(
    'tbody',
    {},
    filas.map((fila) =>
      el(
        'tr',
        { clase: claseFila ? claseFila(fila) : undefined },
        columnas.map((c) => {
          const v = c.valor(fila);
          const etiqueta = c.encabezado ? 'th' : 'td';
          return el(etiqueta, { scope: c.encabezado ? 'row' : undefined, clase: c.num ? 'num' : c.clase }, v instanceof Node ? v : String(v ?? '—'));
        }),
      ),
    ),
  );
  const tablaEl = el('table', { clase: `tabla ${clase}` }, [el('caption', { clase: tituloVisible ? 'tabla-titulo' : 'sr-only', texto: titulo }), thead, tbody]);
  return el('div', { clase: 'tabla-scroll', role: 'region', 'aria-label': titulo }, tablaEl);
}

/** Sólo los contenedores que realmente desbordan reciben foco (desplazamiento con teclado). */
export function marcarDesplazables(raiz) {
  requestAnimationFrame(() => {
    for (const c of raiz.querySelectorAll('.tabla-scroll, .desplazable')) {
      if (c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1) c.setAttribute('tabindex', '0');
      else c.removeAttribute('tabindex');
    }
  });
}

export function seccion(titulo, { id, nivel = 2, descripcion, clase = '' } = {}, hijos = []) {
  const idTitulo = id ? `${id}-titulo` : undefined;
  return el('section', { clase: `tarjeta ${clase}`, id, 'aria-labelledby': idTitulo }, [
    el(`h${nivel}`, { clase: 'tarjeta-titulo', id: idTitulo, texto: titulo }),
    descripcion ? el('p', { clase: 'tarjeta-desc', texto: descripcion }) : null,
    hijos,
  ]);
}

/** Par etiqueta/valor para listas de definición. */
export function definiciones(pares, clase = '') {
  return el(
    'dl',
    { clase: `definiciones ${clase}` },
    pares.filter(Boolean).map(([k, v]) => el('div', { clase: 'definicion' }, [el('dt', { texto: k }), el('dd', {}, v instanceof Node ? v : String(v ?? '—'))])),
  );
}

export function opcion(valor, texto, seleccionada = false) {
  const o = el('option', { value: valor, texto });
  if (seleccionada) o.selected = true;
  return o;
}

/** Control de selección con etiqueta visible. */
export function selector(id, etiqueta, opciones, alCambiar) {
  const sel = el('select', { id, name: id }, opciones);
  if (alCambiar) sel.addEventListener('change', () => alCambiar(sel.value));
  return { campo: el('div', { clase: 'campo' }, [el('label', { for: id, texto: etiqueta }), sel]), select: sel };
}

/**
 * Reemplaza las opciones conservando la selección si sigue existiendo. Si las opciones no
 * cambiaron no toca el control (un desplegable abierto no se cierra con cada refresco).
 */
export function reemplazarOpciones(select, opciones) {
  const firma = (lista) => lista.map((o) => `${o.value}\u0000${o.textContent}`).join('\u0001');
  if (firma([...select.options]) === firma(opciones)) return;
  const previo = select.value;
  select.replaceChildren(...opciones);
  if ([...select.options].some((o) => o.value === previo)) select.value = previo;
}

/**
 * Reemplaza el contenido de una zona conservando el desplazamiento de sus tablas y
 * regiones desplazables (por posición) y el foco si estaba en una de ellas.
 */
export function reemplazarConservando(zona, ...hijos) {
  const selector = '.tabla-scroll, .desplazable';
  const previos = [...zona.querySelectorAll(selector)].map((c) => ({ x: c.scrollLeft, y: c.scrollTop }));
  const indiceFoco = [...zona.querySelectorAll(selector)].indexOf(document.activeElement);
  zona.replaceChildren(...hijos);
  const nuevos = [...zona.querySelectorAll(selector)];
  nuevos.forEach((c, i) => {
    if (!previos[i]) return;
    c.scrollLeft = previos[i].x;
    c.scrollTop = previos[i].y;
  });
  if (indiceFoco >= 0 && nuevos[indiceFoco]) {
    nuevos[indiceFoco].setAttribute('tabindex', '0');
    nuevos[indiceFoco].focus({ preventScroll: true });
  }
}

/** Ejecuta fn sólo si la firma de sus datos cambió desde la última vez (por clave). */
export function crearGuardia() {
  const firmas = new Map();
  return {
    siCambia(clave, datos, fn) {
      const f = JSON.stringify(datos);
      if (firmas.get(clave) === f) return false;
      firmas.set(clave, f);
      fn();
      return true;
    },
    olvidar() {
      firmas.clear();
    },
  };
}

export function mensajeError(error) {
  if (error && typeof error.message === 'string') return error.message;
  return 'error desconocido';
}
