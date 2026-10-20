/*
 * tienda-core.js — módulo compartido por las tiendas ALFA y OMEGA (sólo navegador).
 *
 * Contiene: cliente de la API local (sobre { ok, datos, error }), formato MXN desde
 * centavos, constructor seguro de DOM (createElement + textContent, nunca innerHTML),
 * carrito persistente por empresa, estimación de totales, sondeo, textos de
 * promociones y geometría de las ilustraciones de producto.
 *
 * Todo texto recibido del servidor (en especial los mensajes de campaña generados por
 * agentes) se trata como NO CONFIABLE: sólo se inserta como nodo de texto.
 */

export const MAX_ARTICULOS = 10;
export const MAX_CANTIDAD = 5;
export const MIN_CANTIDAD = 1;
export const INTERVALO_SONDEO_MS = 5000;
export const LIMITE_EVENTOS = 30;
export const LIMITE_PEDIDOS = 12;

const TIEMPO_LIMITE_MS = 8000;
const LARGO_HASH_CORTO = 10;
const LARGO_MAX_MENSAJE = 160;
const DEMOS_RECORDADOS = 5;
const PATRON_SKU = /^[A-Z]{3}-[A-Z]{3}$/;
const PATRON_ALIAS = /^[\p{L}\p{N} .'-]+$/u;
const PATRON_PEDIDO = /^[A-Z]+-[A-Z0-9-]{1,20}$/;
const DISPONIBILIDADES = ['disponible', 'pocas', 'agotado'];
const NS_SVG = 'http://www.w3.org/2000/svg';

/* ───────────────────────── Formato ───────────────────────── */

const FORMATO_MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const FORMATO_MXN_ENTERO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Centavos enteros → "$1,299.00". Con `corto`, omite ".00" cuando no hay centavos. */
export function dinero(centavos, { corto = false } = {}) {
  const n = Number(centavos);
  const valor = Number.isFinite(n) ? n : 0;
  if (corto && valor % 100 === 0) return FORMATO_MXN_ENTERO.format(valor / 100);
  return FORMATO_MXN.format(valor / 100);
}

/** "2027-01-17" (fecha simulada) → "17 ene 2027". Devuelve '' si no es una fecha válida. */
export function fechaLegible(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return '';
  return FORMATO_FECHA.format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
}

export function hashCorto(hash) {
  return typeof hash === 'string' ? hash.slice(0, LARGO_HASH_CORTO) : '';
}

export function nombreCategoria(categoria) {
  const t = String(categoria ?? '');
  return t ? t.charAt(0).toLocaleUpperCase('es-MX') + t.slice(1) : '';
}

export function porcentajeFicha(calidad) {
  return Math.round(Math.min(1, Math.max(0, Number(calidad) || 0)) * 100);
}

/* ───────────────────────── DOM seguro ───────────────────────── */

function aplicarAtributos(el, attrs, esSvg) {
  if (!attrs) return;
  for (const [clave, valor] of Object.entries(attrs)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'style' || clave === 'innerHTML' || clave === 'outerHTML') {
      throw new Error(`atributo "${clave}" no permitido: usa clases CSS y texto`);
    }
    if (clave === 'class') {
      const clases = Array.isArray(valor) ? valor.filter(Boolean).join(' ') : String(valor);
      if (esSvg) el.setAttribute('class', clases);
      else el.className = clases;
    } else if (clave === 'text') {
      el.textContent = String(valor);
    } else if (clave === 'dataset') {
      for (const [k, v] of Object.entries(valor)) el.dataset[k] = String(v);
    } else if (clave.startsWith('on')) {
      if (typeof valor !== 'function') throw new Error(`"${clave}" debe ser una función (CSP: sin manejadores en línea)`);
      el.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else if (valor === true) {
      el.setAttribute(clave, '');
    } else {
      el.setAttribute(clave, String(valor));
    }
  }
}

function agregarHijos(el, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

/** Crea un elemento HTML. Los hijos de texto se insertan como nodos de texto (seguro). */
export function h(etiqueta, attrs, ...hijos) {
  const el = document.createElement(etiqueta);
  aplicarAtributos(el, attrs, false);
  agregarHijos(el, hijos);
  return el;
}

/** Crea un elemento SVG con createElementNS. */
export function s(etiqueta, attrs, ...hijos) {
  const el = document.createElementNS(NS_SVG, etiqueta);
  aplicarAtributos(el, attrs, true);
  agregarHijos(el, hijos);
  return el;
}

/** Reemplaza el contenido de `el` por los nodos dados. */
export function reemplazar(el, ...hijos) {
  el.replaceChildren();
  agregarHijos(el, hijos);
}

/**
 * Repinta `raiz` conservando el foco: si el elemento enfocado tenía `data-foco`,
 * vuelve a enfocar el nuevo elemento con la misma clave. Devuelve true si lo logró.
 */
export function conservarFoco(raiz, pintar) {
  const activo = document.activeElement;
  const clave = activo instanceof HTMLElement && raiz.contains(activo) ? activo.dataset.foco : undefined;
  pintar();
  if (!clave) return false;
  const nuevo = [...raiz.querySelectorAll('[data-foco]')].find((n) => n.dataset.foco === clave);
  if (nuevo instanceof HTMLElement && !nuevo.hasAttribute('disabled')) {
    nuevo.focus({ preventScroll: true });
    return true;
  }
  return false;
}

/** Región aria-live: vuelve a anunciar aunque el texto se repita. */
export function crearAnunciador(region) {
  let temporizador = null;
  return (texto) => {
    if (!region) return;
    clearTimeout(temporizador);
    region.textContent = '';
    temporizador = setTimeout(() => {
      region.textContent = String(texto);
    }, 60);
  };
}

/**
 * Prepara un <dialog> modal: Esc lo cierra (nativo), un clic en el fondo lo cierra y,
 * al cerrarse, el foco regresa al elemento que lo abrió (o al indicado en `cerrar`).
 */
export function prepararModal(dialogo, { cerrarConFondo = true, alCerrar } = {}) {
  let origen = null;
  let destino = null;
  let pulsoEnFondo = false;
  dialogo.addEventListener('close', () => {
    const objetivo = destino ?? origen;
    destino = null;
    origen = null;
    if (typeof alCerrar === 'function') alCerrar();
    if (objetivo instanceof HTMLElement && objetivo.isConnected) objetivo.focus();
  });
  if (cerrarConFondo) {
    dialogo.addEventListener('pointerdown', (e) => {
      pulsoEnFondo = e.target === dialogo;
    });
    dialogo.addEventListener('click', (e) => {
      if (e.target === dialogo && pulsoEnFondo) dialogo.close();
      pulsoEnFondo = false;
    });
  }
  return {
    abrir(desde = document.activeElement) {
      origen = desde;
      if (!dialogo.open) dialogo.showModal();
    },
    cerrar(enfocar) {
      destino = enfocar ?? null;
      if (dialogo.open) dialogo.close();
    },
    get abierto() {
      return dialogo.open;
    },
  };
}

/* ───────────────────────── Almacenamiento local (tolerante a fallos) ───────────────────────── */

function leerAlmacen(clave) {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null; // modo privado o almacenamiento bloqueado: la página sigue funcionando
  }
}

function escribirAlmacen(clave, valor) {
  try {
    window.localStorage.setItem(clave, valor);
    return true;
  } catch {
    return false;
  }
}

function leerJsonAlmacen(clave) {
  const crudo = leerAlmacen(clave);
  if (crudo === null) return null;
  try {
    return JSON.parse(crudo);
  } catch {
    return null;
  }
}

/* ───────────────────────── Cliente de la API ───────────────────────── */

export class ErrorTienda extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = 'ErrorTienda';
    this.estado = estado;
  }
}

async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
  let respuesta;
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: cuerpo === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      cache: 'no-store',
      credentials: 'same-origin',
      signal: control.signal,
    });
  } catch (error) {
    const agotado = error instanceof DOMException && error.name === 'AbortError';
    throw new ErrorTienda(agotado ? 'La tienda tardó demasiado en responder.' : 'No hay conexión con el servidor local de la tienda.', 0);
  } finally {
    clearTimeout(limite);
  }
  let sobre;
  try {
    sobre = await respuesta.json();
  } catch {
    throw new ErrorTienda(`Respuesta inesperada del servidor (HTTP ${respuesta.status}).`, respuesta.status);
  }
  if (!sobre || typeof sobre !== 'object' || typeof sobre.ok !== 'boolean') {
    throw new ErrorTienda(`Respuesta con formato desconocido (HTTP ${respuesta.status}).`, respuesta.status);
  }
  if (!sobre.ok) {
    const mensaje = typeof sobre.error === 'string' && sobre.error ? sobre.error : `error HTTP ${respuesta.status}`;
    throw new ErrorTienda(mensaje, respuesta.status);
  }
  return sobre.datos;
}

/* ───────────────────────── Normalización (nunca confiar en datos externos) ───────────────────────── */

const esTexto = (v) => typeof v === 'string';
const entero = (v, defecto = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : defecto;
};
const acotar = (n, min, max) => Math.min(max, Math.max(min, n));
const diasValidos = (dias) => (Array.isArray(dias) ? [...new Set(dias.map((d) => entero(d, -1)).filter((d) => d >= 1 && d <= 31))].sort((a, b) => a - b) : []);

function normalizarProducto(p) {
  if (!p || !esTexto(p.sku) || !PATRON_SKU.test(p.sku)) return null;
  return Object.freeze({
    sku: p.sku,
    nombre: esTexto(p.nombre) && p.nombre.trim() ? p.nombre : p.sku,
    categoria: esTexto(p.categoria) ? p.categoria : '',
    precioLista: Math.max(0, entero(p.precioLista)),
    precioFinal: Math.max(0, entero(p.precioFinal)),
    descuentoPct: acotar(entero(p.descuentoPct), 0, 100),
    disponibilidad: DISPONIBILIDADES.includes(p.disponibilidad) ? p.disponibilidad : 'agotado',
    calidadFicha: acotar(Number(p.calidadFicha) || 0, 0, 1),
  });
}

function normalizarPromocion(p) {
  if (!p || !esTexto(p.id)) return null;
  const pct = acotar(entero(p.pct), 0, 100);
  const dias = diasValidos(p.dias);
  if (p.tipo === 'descuento' && ['sku', 'categoria', 'todo'].includes(p.alcance)) {
    return Object.freeze({ id: p.id, tipo: 'descuento', alcance: p.alcance, objetivo: esTexto(p.objetivo) ? p.objetivo : null, pct, dias });
  }
  if (p.tipo === 'compra_multiple') {
    return Object.freeze({ id: p.id, tipo: 'compra_multiple', minUnidades: Math.max(1, entero(p.minUnidades, 2)), pct, dias });
  }
  return null;
}

function normalizarEscaparate(e) {
  if (!e || typeof e !== 'object' || !Array.isArray(e.productos)) return null;
  const envio = e.envio && typeof e.envio === 'object' ? e.envio : {};
  return Object.freeze({
    empresa: esTexto(e.empresa) ? e.empresa : '',
    ronda: Math.max(0, entero(e.ronda)),
    dia: Math.max(0, entero(e.dia)),
    diaGlobal: Math.max(0, entero(e.diaGlobal)),
    productos: Object.freeze(e.productos.map(normalizarProducto).filter(Boolean)),
    promociones: Object.freeze((Array.isArray(e.promociones) ? e.promociones : []).map(normalizarPromocion).filter(Boolean)),
    envio: Object.freeze({ costo: Math.max(0, entero(envio.costo)), gratisDesde: Math.max(0, entero(envio.gratisDesde)) }),
    anuncios: Object.freeze(
      (Array.isArray(e.anuncios) ? e.anuncios : [])
        .filter((a) => a && esTexto(a.mensaje))
        .map((a) => Object.freeze({ canal: esTexto(a.canal) ? a.canal : '', segmento: esTexto(a.segmento) ? a.segmento : '', angulo: esTexto(a.angulo) ? a.angulo : '', mensaje: a.mensaje })),
    ),
  });
}

function normalizarTienda(d) {
  if (!d || typeof d !== 'object') throw new ErrorTienda('La tienda respondió sin datos.', 500);
  const marca = d.marca && typeof d.marca === 'object' ? d.marca : {};
  return Object.freeze({
    empresa: esTexto(d.empresa) ? d.empresa : '',
    marca: Object.freeze({
      nombre: esTexto(marca.nombre) ? marca.nombre : '',
      lema: esTexto(marca.lema) ? marca.lema : '',
      descripcion: esTexto(marca.descripcion) ? marca.descripcion : '',
    }),
    escaparate: normalizarEscaparate(d.escaparate),
    categorias: Object.freeze((Array.isArray(d.categorias) ? d.categorias : []).filter(esTexto)),
    ciudades: Object.freeze((Array.isArray(d.ciudades) ? d.ciudades : []).filter(esTexto)),
    fechaSimulada: esTexto(d.fechaSimulada) ? d.fechaSimulada : null,
    aviso: esTexto(d.aviso) ? d.aviso : '',
  });
}

/** Firma estable para detectar si el escaparate cambió entre sondeos. */
export function firmaTienda(tienda) {
  return JSON.stringify([tienda?.escaparate ?? null, tienda?.fechaSimulada ?? null]);
}

export async function obtenerTienda() {
  return normalizarTienda(await pedir('/api/tienda'));
}

export async function obtenerEventos(limite = LIMITE_EVENTOS) {
  const datos = await pedir(`/api/eventos?limite=${encodeURIComponent(String(limite))}`);
  return (Array.isArray(datos) ? datos : []).map((e) => ({
    seq: entero(e?.seq),
    ronda: entero(e?.ronda),
    dia: entero(e?.dia),
    fecha: esTexto(e?.fecha) ? e.fecha : '',
    codigo: esTexto(e?.codigo) ? e.codigo : 'DESCONOCIDO',
    resumen: esTexto(e?.resumen) ? e.resumen : '',
    hash: esTexto(e?.hash) ? e.hash : '',
    prevHash: esTexto(e?.prevHash) ? e.prevHash : '',
    verificado: e?.verificado === true,
  }));
}

export async function obtenerPedidos(limite = LIMITE_PEDIDOS) {
  const datos = await pedir(`/api/pedidos?limite=${encodeURIComponent(String(limite))}`);
  return (Array.isArray(datos) ? datos : [])
    .filter((p) => p && esTexto(p.id))
    .map((p) => ({ id: p.id, fecha: esTexto(p.fecha) ? p.fecha : '', total: entero(p.total), unidades: entero(p.unidades), estado: esTexto(p.estado) ? p.estado : '' }));
}

/** Normaliza lo que el usuario escribe como número de pedido. */
export function normalizarIdPedido(texto) {
  return String(texto ?? '').trim().toUpperCase();
}

export function idPedidoValido(id) {
  return PATRON_PEDIDO.test(id);
}

/** GET /api/pedidos/:id → { id, tipo: 'demo'|'sintetico', aviso?, pedido, etapas }. */
export async function consultarPedido(texto) {
  const id = normalizarIdPedido(texto);
  if (!idPedidoValido(id)) {
    throw new ErrorTienda('Escribe un número de pedido como DEMO-ALFA-0001 u OMEGA-000123.', 400);
  }
  const d = await pedir(`/api/pedidos/${encodeURIComponent(id)}`);
  if (!d || typeof d !== 'object') throw new ErrorTienda('Respuesta de seguimiento vacía.', 500);
  const etapas = (Array.isArray(d.etapas) ? d.etapas : []).map((e) => ({
    estado: esTexto(e?.estado) ? e.estado : '',
    alcanzado: e?.alcanzado === true,
    fecha: esTexto(e?.fecha) ? e.fecha : null,
    seq: e?.seq === undefined ? null : entero(e.seq),
    hash: esTexto(e?.hash) ? e.hash : null,
  }));
  return { id: esTexto(d.id) ? d.id : id, tipo: d.tipo === 'demo' ? 'demo' : 'sintetico', aviso: esTexto(d.aviso) ? d.aviso : '', pedido: d.pedido ?? {}, etapas };
}

/* ───────────────────────── Carrito ───────────────────────── */

function lineasValidas(valor) {
  if (!Array.isArray(valor)) return [];
  const vistas = new Set();
  const lineas = [];
  for (const l of valor) {
    if (!l || !esTexto(l.sku) || !PATRON_SKU.test(l.sku) || vistas.has(l.sku)) continue;
    const cantidad = entero(l.cantidad, 0);
    if (cantidad < MIN_CANTIDAD) continue;
    vistas.add(l.sku);
    lineas.push(Object.freeze({ sku: l.sku, cantidad: Math.min(MAX_CANTIDAD, cantidad) }));
    if (lineas.length >= MAX_ARTICULOS) break;
  }
  return Object.freeze(lineas);
}

/**
 * Carrito persistido por empresa en localStorage (si está disponible).
 * Las operaciones devuelven { ok, cantidad, motivo? } y nunca mutan las líneas
 * existentes: cada cambio crea un arreglo nuevo.
 */
export function crearCarrito(empresa) {
  const clave = `ew:carrito:${empresa}`;
  let lineas = lineasValidas(leerJsonAlmacen(clave));
  let persistente = true;
  const oyentes = new Set();

  const confirmar = (nuevas) => {
    lineas = Object.freeze(nuevas.map((l) => Object.freeze({ ...l })));
    persistente = escribirAlmacen(clave, JSON.stringify(lineas));
    for (const fn of oyentes) fn(lineas);
  };

  try {
    window.addEventListener('storage', (e) => {
      if (e.key !== clave) return;
      lineas = lineasValidas(leerJsonAlmacen(clave));
      for (const fn of oyentes) fn(lineas);
    });
  } catch {
    persistente = false;
  }

  return {
    lineas: () => lineas,
    unidades: () => lineas.reduce((a, l) => a + l.cantidad, 0),
    cantidadDe: (sku) => lineas.find((l) => l.sku === sku)?.cantidad ?? 0,
    persistente: () => persistente,
    suscribir(fn) {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
    agregar(sku, cantidad = 1) {
      const pedida = acotar(entero(cantidad, 1), MIN_CANTIDAD, MAX_CANTIDAD);
      const actual = lineas.find((l) => l.sku === sku);
      if (actual) {
        if (actual.cantidad >= MAX_CANTIDAD) return { ok: false, cantidad: actual.cantidad, motivo: 'maximo' };
        const nueva = Math.min(MAX_CANTIDAD, actual.cantidad + pedida);
        confirmar(lineas.map((l) => (l.sku === sku ? { ...l, cantidad: nueva } : l)));
        return { ok: true, cantidad: nueva, recortado: actual.cantidad + pedida > MAX_CANTIDAD };
      }
      if (lineas.length >= MAX_ARTICULOS) return { ok: false, cantidad: 0, motivo: 'lleno' };
      confirmar([...lineas, { sku, cantidad: pedida }]);
      return { ok: true, cantidad: pedida, recortado: false };
    },
    fijar(sku, cantidad) {
      const actual = lineas.find((l) => l.sku === sku);
      if (!actual) return { ok: false, cantidad: 0, motivo: 'ausente' };
      const nueva = entero(cantidad, actual.cantidad);
      if (nueva < MIN_CANTIDAD) return { ok: false, cantidad: actual.cantidad, motivo: 'minimo' };
      if (nueva > MAX_CANTIDAD) return { ok: false, cantidad: actual.cantidad, motivo: 'maximo' };
      confirmar(lineas.map((l) => (l.sku === sku ? { ...l, cantidad: nueva } : l)));
      return { ok: true, cantidad: nueva };
    },
    quitar(sku) {
      confirmar(lineas.filter((l) => l.sku !== sku));
    },
    vaciar() {
      confirmar([]);
    },
  };
}

/** Texto amable para el resultado de una operación del carrito. */
export function motivoCarrito(motivo) {
  switch (motivo) {
    case 'maximo':
      return `Máximo ${MAX_CANTIDAD} piezas por artículo.`;
    case 'minimo':
      return `Mínimo ${MIN_CANTIDAD} pieza; usa «Quitar» para eliminar el artículo.`;
    case 'lleno':
      return `El carrito admite hasta ${MAX_ARTICULOS} artículos distintos.`;
    default:
      return 'No se pudo actualizar el carrito.';
  }
}

/**
 * Estimación local del carrito con las mismas reglas públicas del motor
 * (mejor descuento por artículo, compra múltiple sobre el subtotal, envío gratis
 * desde un umbral). El total definitivo siempre lo calcula el servidor.
 */
export function estimarCarrito(lineas, escaparate) {
  const productos = new Map((escaparate?.productos ?? []).map((p) => [p.sku, p]));
  const dia = Math.max(1, escaparate?.dia ?? 1);
  const detalle = lineas.map((l) => {
    const producto = productos.get(l.sku) ?? null;
    const problema = !producto ? 'no_listado' : producto.disponibilidad === 'agotado' ? 'agotado' : null;
    return {
      sku: l.sku,
      cantidad: l.cantidad,
      producto,
      problema,
      bruto: producto ? producto.precioLista * l.cantidad : 0,
      neto: producto ? producto.precioFinal * l.cantidad : 0,
    };
  });
  const cotizables = detalle.filter((d) => d.producto);
  const unidades = cotizables.reduce((a, d) => a + d.cantidad, 0);
  const multiples = (escaparate?.promociones ?? []).filter((p) => p.tipo === 'compra_multiple' && p.dias.includes(dia));
  const aplicada = multiples.filter((p) => unidades >= p.minUnidades).reduce((mejor, p) => (mejor === null || p.pct > mejor.pct ? p : mejor), null);
  const proxima = multiples.filter((p) => unidades < p.minUnidades && (aplicada === null || p.pct > aplicada.pct)).sort((a, b) => a.minUnidades - b.minUnidades)[0] ?? null;
  const subtotalArticulos = cotizables.reduce((a, d) => a + d.neto, 0);
  const extra = aplicada ? Math.round((subtotalArticulos * aplicada.pct) / 100) : 0;
  const bruto = cotizables.reduce((a, d) => a + d.bruto, 0);
  const subtotal = subtotalArticulos - extra;
  const gratisDesde = escaparate?.envio?.gratisDesde ?? 0;
  const costoEnvio = escaparate?.envio?.costo ?? 0;
  const envio = cotizables.length === 0 || subtotal >= gratisDesde ? 0 : costoEnvio;
  return {
    detalle,
    unidades,
    bruto,
    descuento: bruto - subtotal,
    extraMultiple: extra,
    promoMultiple: aplicada,
    proximaMultiple: proxima ? { promo: proxima, faltan: proxima.minUnidades - unidades } : null,
    subtotal,
    envio,
    total: subtotal + envio,
    gratisDesde,
    faltaEnvioGratis: Math.max(0, gratisDesde - subtotal),
    avanceEnvioGratis: gratisDesde > 0 ? Math.min(1, subtotal / gratisDesde) : 1,
    hayProblemas: detalle.some((d) => d.problema !== null),
  };
}

/* ───────────────────────── Checkout ───────────────────────── */

export function validarCliente({ alias, ciudad }, ciudades) {
  const limpio = String(alias ?? '').trim();
  const errores = {};
  if (limpio.length < 2 || limpio.length > 40) errores.alias = 'El alias debe tener entre 2 y 40 caracteres.';
  else if (!PATRON_ALIAS.test(limpio)) errores.alias = "Usa sólo letras, números, espacios y los signos . ' -";
  if (!ciudades.includes(ciudad)) errores.ciudad = 'Elige una ciudad de la lista.';
  return { valido: Object.keys(errores).length === 0, errores, cliente: { alias: limpio, ciudad } };
}

/** POST /api/checkout. Devuelve { pedido, aviso } (respuesta 201 del servidor). */
export async function enviarCheckout(lineas, cliente) {
  if (lineas.length === 0) throw new ErrorTienda('Tu carrito está vacío.', 400);
  const items = lineas.slice(0, MAX_ARTICULOS).map((l) => ({ sku: l.sku, cantidad: acotar(l.cantidad, MIN_CANTIDAD, MAX_CANTIDAD) }));
  const d = await pedir('/api/checkout', { metodo: 'POST', cuerpo: { items, cliente: { alias: cliente.alias, ciudad: cliente.ciudad } } });
  if (!d || typeof d !== 'object' || !d.pedido || !esTexto(d.pedido.id)) throw new ErrorTienda('El servidor no devolvió el pedido.', 500);
  return d;
}

/** Mensaje de error comprensible según el código HTTP. */
export function mensajeError(error) {
  const estado = error instanceof ErrorTienda ? error.estado : -1;
  const detalle = error instanceof Error ? error.message : 'error desconocido';
  switch (estado) {
    case 0:
      return `${detalle} Intenta de nuevo en unos segundos.`;
    case 400:
      return `Revisa los datos: ${detalle}.`;
    case 404:
      return 'No encontramos ese pedido. Revisa el número e inténtalo de nuevo.';
    case 409:
      return `No se pudo completar: ${detalle}. Actualiza tu carrito e inténtalo de nuevo.`;
    case 429:
      return 'Demasiadas solicitudes seguidas; espera un minuto e inténtalo de nuevo.';
    default:
      return `Ocurrió un problema (${estado > 0 ? `HTTP ${estado}` : 'sin código'}): ${detalle}.`;
  }
}

/** Recuerda los últimos pedidos de demostración hechos en este navegador. */
export function recordarPedidoDemo(empresa, id) {
  const clave = `ew:demos:${empresa}`;
  const previos = pedidosDemoRecordados(empresa).filter((x) => x !== id);
  escribirAlmacen(clave, JSON.stringify([id, ...previos].slice(0, DEMOS_RECORDADOS)));
}

export function pedidosDemoRecordados(empresa) {
  const lista = leerJsonAlmacen(`ew:demos:${empresa}`);
  return Array.isArray(lista) ? lista.filter((x) => esTexto(x) && idPedidoValido(x)).slice(0, DEMOS_RECORDADOS) : [];
}

/* ───────────────────────── Promociones y textos ───────────────────────── */

/** [5,6,7] → "días 5–7"; [1..7] → "toda la semana"; [3] → "día 3"; [1,3,5] → "días 1, 3 y 5". */
export function formatearDias(dias, diasPorPeriodo = 7) {
  const lista = diasValidos(dias);
  if (lista.length === 0) return 'sin días asignados';
  if (lista.length === diasPorPeriodo && lista[0] === 1 && lista[lista.length - 1] === diasPorPeriodo) return 'toda la semana';
  if (lista.length === 1) return `día ${lista[0]}`;
  const consecutivos = lista.every((d, i) => i === 0 || d === lista[i - 1] + 1);
  if (consecutivos) return `días ${lista[0]}–${lista[lista.length - 1]}`;
  return `días ${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

/**
 * Descripción legible de una promoción.
 * Devuelve { id, titulo, cuando, texto, estado: 'hoy'|'proxima'|'concluida', pct }.
 */
export function describirPromocion(promo, escaparate) {
  const dia = Math.max(1, escaparate?.dia ?? 1);
  const productos = new Map((escaparate?.productos ?? []).map((p) => [p.sku, p]));
  let titulo;
  if (promo.tipo === 'compra_multiple') {
    titulo = `Compra ${promo.minUnidades} o más: ${promo.pct}% extra`;
  } else if (promo.alcance === 'todo') {
    titulo = `−${promo.pct}% en toda la tienda`;
  } else if (promo.alcance === 'categoria') {
    titulo = `−${promo.pct}% en ${promo.objetivo ?? 'una categoría'}`;
  } else {
    titulo = `−${promo.pct}% en ${productos.get(promo.objetivo ?? '')?.nombre ?? promo.objetivo ?? 'un artículo'}`;
  }
  const cuando = formatearDias(promo.dias);
  const estado = promo.dias.includes(dia) ? 'hoy' : promo.dias.some((d) => d > dia) ? 'proxima' : 'concluida';
  return { id: promo.id, titulo, cuando, texto: `${titulo} · ${cuando}`, estado, pct: promo.pct };
}

export function describirEnvio(envio) {
  if (!envio) return '';
  if (envio.gratisDesde <= 0) return 'Envío gratis en todos los pedidos';
  return `Envío gratis desde ${dinero(envio.gratisDesde, { corto: true })}`;
}

export const ETIQUETA_ESTADO_PROMO = { hoy: 'Vigente hoy', proxima: 'Próximamente', concluida: 'Concluida' };

/** Mensajes de campaña únicos y acotados. Siguen siendo texto NO confiable. */
export function anunciosUnicos(anuncios) {
  const vistos = new Set();
  const salida = [];
  for (const a of anuncios ?? []) {
    const mensaje = String(a.mensaje).replace(/\s+/g, ' ').trim().slice(0, LARGO_MAX_MENSAJE);
    if (!mensaje || vistos.has(mensaje)) continue;
    vistos.add(mensaje);
    salida.push({ ...a, mensaje });
  }
  return salida;
}

/** Categorías del catálogo que tienen al menos un producto, en el orden de `categorias`. */
export function categoriasPresentes(tienda) {
  const presentes = new Set((tienda?.escaparate?.productos ?? []).map((p) => p.categoria));
  const ordenadas = (tienda?.categorias ?? []).filter((c) => presentes.has(c));
  const extra = [...presentes].filter((c) => c && !ordenadas.includes(c));
  return [...ordenadas, ...extra];
}

const COLADOR = new Intl.Collator('es-MX', { sensitivity: 'base' });

export const ORDENES = Object.freeze([
  { id: 'destacados', etiqueta: 'Destacados' },
  { id: 'precio-asc', etiqueta: 'Precio: menor a mayor' },
  { id: 'precio-desc', etiqueta: 'Precio: mayor a menor' },
  { id: 'nombre', etiqueta: 'Nombre (A–Z)' },
]);

export function filtrarYOrdenar(productos, { categoria = 'todo', orden = 'destacados' } = {}) {
  const filtrados = categoria === 'todo' ? [...productos] : productos.filter((p) => p.categoria === categoria);
  if (orden === 'precio-asc') return filtrados.sort((a, b) => a.precioFinal - b.precioFinal || COLADOR.compare(a.nombre, b.nombre));
  if (orden === 'precio-desc') return filtrados.sort((a, b) => b.precioFinal - a.precioFinal || COLADOR.compare(a.nombre, b.nombre));
  if (orden === 'nombre') return filtrados.sort((a, b) => COLADOR.compare(a.nombre, b.nombre));
  return filtrados;
}

export const ETIQUETA_DISPONIBILIDAD = Object.freeze({ disponible: 'Disponible', pocas: 'Pocas piezas', agotado: 'Agotado' });

export const ETIQUETA_EVENTO = Object.freeze({
  ROUND_STARTED: 'Inicio de ronda',
  ROUND_CLOSED: 'Cierre de ronda',
  INVENTORY_PURCHASED: 'Compra de inventario',
  PRICE_CHANGED: 'Cambio de precio',
  CAMPAIGN_STARTED: 'Campaña iniciada',
  CAMPAIGN_STOPPED: 'Campaña detenida',
  ORDER_CREATED: 'Pedido creado',
  ORDER_PAID_SIMULATED: 'Cobro simulado',
  ORDER_CANCELLED: 'Pedido cancelado',
  ORDER_REFUNDED: 'Reembolso',
  STRATEGY_CHANGED: 'Cambio de estrategia',
  AGENT_DECISION_RECORDED: 'Decisión registrada',
  JUDGE_VERDICT: 'Veredicto del juez',
});

export const ETIQUETA_ESTADO_PEDIDO = Object.freeze({
  pagado: 'Pagado (simulado)',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
  'con devolución': 'Con devolución',
});

/** Descripción genérica por categoría (los productos son sintéticos). */
export const DESCRIPCION_CATEGORIA = Object.freeze({
  playeras: 'Algodón de tacto suave y corte cómodo para el día a día. Combina con todo y resiste lavados frecuentes.',
  camisas: 'Tejido de trama cerrada, cuello estructurado y botones firmes. Pensada para la oficina y para el fin de semana.',
  jeans: 'Mezclilla con ligera elasticidad, costuras reforzadas y cinco bolsillos. Conserva la forma lavado tras lavado.',
  vestidos: 'Caída fluida y largo versátil. Va de una reunión de día a una cena sin perder comodidad.',
  sudaderas: 'Interior afelpado, capucha con cordón y bolsillo canguro. Abrigo ligero para cualquier plan.',
  chamarras: 'Mezclilla de gramaje medio con botones metálicos y bolsillos al pecho. Una capa que mejora con el uso.',
  tenis: 'Suela de goma con buen agarre, plantilla acolchada y diseño urbano para caminar todo el día.',
  accesorios: 'Complemento práctico de materiales resistentes, hecho para acompañarte a diario.',
});

export function descripcionCategoria(categoria) {
  return DESCRIPCION_CATEGORIA[categoria] ?? 'Prenda sintética del experimento, diseñada para el uso diario.';
}

/* ───────────────────────── Sondeo ───────────────────────── */

/**
 * Ejecuta `tarea` ahora y luego cada `intervaloMs`, sin solapar ejecuciones.
 * Se pausa con la pestaña oculta y se reanuda al volver. Los errores de la tarea se
 * entregan a `alError` (la tarea debería manejarlos; esto es la red de seguridad).
 */
export function iniciarSondeo(tarea, { intervaloMs = INTERVALO_SONDEO_MS, alError } = {}) {
  let temporizador = null;
  let enCurso = false;
  let activo = true;
  const programar = () => {
    clearTimeout(temporizador);
    if (activo) temporizador = setTimeout(ciclo, intervaloMs);
  };
  async function ciclo() {
    if (!activo || enCurso) return;
    if (document.hidden) return programar();
    enCurso = true;
    try {
      await tarea();
    } catch (error) {
      if (typeof alError === 'function') alError(error);
    } finally {
      enCurso = false;
    }
    programar();
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && activo && !enCurso) {
      clearTimeout(temporizador);
      ciclo();
    }
  });
  ciclo();
  return {
    detener() {
      activo = false;
      clearTimeout(temporizador);
    },
    ahora() {
      if (!enCurso) {
        clearTimeout(temporizador);
        ciclo();
      }
    },
  };
}

/* ───────────────────────── Ilustraciones de producto ───────────────────────── */

const punto = (cx, cy, r = 1.4) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;

/**
 * Siluetas (lienzo 100×100) por categoría y, cuando conviene, por SKU.
 * `base` es el contorno relleno; `detalles` son trazos (costuras, bolsillos, botones).
 * Cada marca las dibuja con su propio estilo.
 */
const SILUETAS_CATEGORIA = Object.freeze({
  playeras: {
    base: 'M38 14 L26 18 L10 34 L20 46 L28 40 L28 88 L72 88 L72 40 L80 46 L90 34 L74 18 L62 14 Q50 24 38 14 Z',
    detalles: ['M40 15.5 Q50 26 60 15.5', 'M28 83 L72 83', 'M12.6 32 L22 43.6', 'M87.4 32 L78 43.6'],
  },
  camisas: {
    base: 'M44 12 L30 16 L14 66 L22 69 L29 38 L29 88 L71 88 L71 38 L78 69 L86 66 L70 16 L56 12 L50 22 Z',
    detalles: ['M44 12 L40 21 L50 22 L60 21 L56 12', 'M50 22 L50 88', punto(50, 32), punto(50, 44), punto(50, 56), punto(50, 68), 'M34 34 H44 V43 H34 Z', 'M15.5 61 L23.5 64', 'M84.5 61 L76.5 64'],
  },
  jeans: {
    base: 'M33 10 L67 10 L66 90 L55 90 L50 36 L45 90 L34 90 Z',
    detalles: ['M33 16 L67 16', 'M50 16 L50 34', 'M36 16 Q39 25 45 22', 'M64 16 Q61 25 55 22', 'M34.2 86 L45.4 86', 'M54.6 86 L65.8 86'],
  },
  vestidos: {
    base: 'M40 10 L44 10 Q50 18 56 10 L60 10 L63 30 L58 40 L78 90 L22 90 L42 40 L37 30 Z',
    detalles: ['M42 40 Q50 44 58 40', 'M39 29 Q50 33 61 29', 'M47 44 L41 90', 'M53 44 L59 90'],
  },
  sudaderas: {
    base: 'M40 15 Q50 0 60 15 L72 19 L86 66 L78 70 L71 42 L71 88 L29 88 L29 42 L22 70 L14 66 L28 19 Z',
    detalles: ['M42 17 Q50 30 58 17', 'M46 24 L45 38', 'M54 24 L55 38', 'M37 62 L63 62 L60 76 L40 76 Z', 'M29 82 L71 82', 'M15.5 61 L23.5 64.5', 'M84.5 61 L76.5 64.5'],
  },
  chamarras: {
    base: 'M42 12 L28 16 L12 68 L22 71 L30 40 L30 86 L70 86 L70 40 L78 71 L88 68 L72 16 L58 12 L50 26 Z',
    detalles: ['M42 12 L37 25 L50 26 L63 25 L58 12', 'M50 26 L50 86', 'M34 36 H46 V46 H34 Z', 'M54 36 H66 V46 H54 Z', 'M34 36 L40 40 L46 36', 'M54 36 L60 40 L66 36', 'M30 78 L70 78', punto(52.5, 52), punto(52.5, 64)],
  },
  tenis: {
    base: 'M8 66 Q9 48 24 46 L40 43 Q48 32 61 35 L71 45 Q86 49 92 60 L92 70 Q92 77 85 77 L14 77 Q8 77 8 70 Z',
    detalles: ['M8 68 L92 68', 'M44 44 L53 50', 'M48 40 L57 46', 'M53 37 L61 43', 'M28 60 Q50 50 74 58', 'M12 53 L22 50'],
  },
  accesorios: {
    // Bolsa y asa como contorno relleno (el asa es una banda cerrada), así se ve sobre cualquier fondo.
    base: 'M24 38 L76 38 L72 90 L28 90 Z M36 38 Q36 12 50 12 Q64 12 64 38 L59 38 Q59 19 50 19 Q41 19 41 38 Z',
    detalles: ['M25 46 L75 46', 'M40 46 L40 52', 'M60 46 L60 52'],
  },
});

const SILUETAS_SKU = Object.freeze({
  'PLY-GRA': {
    base: 'M36 14 L22 19 L6 38 L18 50 L26 44 L25 90 L75 90 L74 44 L82 50 L94 38 L78 19 L64 14 Q50 24 36 14 Z',
    detalles: ['M38 15.5 Q50 26 62 15.5', punto(50, 47, 9), 'M40 64 L60 64', 'M43 69 L57 69', 'M25 85 L75 85'],
  },
  'JEA-MOM': {
    base: 'M30 10 L70 10 L74 90 L56 90 L50 38 L44 90 L26 90 Z',
    detalles: ['M30 17 L70 17', 'M50 17 L50 34', 'M33 17 Q37 27 44 23', 'M67 17 Q63 27 56 23', 'M26.3 85 L44.6 85', 'M55.4 85 L73.7 85'],
  },
  'GOR-BAS': {
    base: 'M14 66 Q14 30 48 28 Q76 30 78 56 L94 62 Q97 69 88 69 L14 68 Z',
    detalles: ['M48 28 Q40 45 40 66', 'M48 28 Q60 44 62 62', punto(48, 28, 2), 'M78 56 Q80 63 80 68.5'],
  },
  'CIN-PIE': {
    // Correa + hebilla (marco con hueco) + extremo de la correa visible dentro del hueco (regla evenodd).
    base: 'M6 43 H74 V57 H6 Z M74 37 H94 V63 H74 Z M78 41 H90 V59 H78 Z M78 43 H90 V57 H78 Z',
    detalles: ['M8 46 H72', 'M8 54 H72', punto(24, 50), punto(32, 50), punto(40, 50), 'M76 50 H92'],
  },
});

const SILUETA_GENERICA = SILUETAS_CATEGORIA.accesorios;

export function siluetaPara(producto) {
  return SILUETAS_SKU[producto?.sku] ?? SILUETAS_CATEGORIA[producto?.categoria] ?? SILUETA_GENERICA;
}
