/*
 * omega.js — interfaz de la tienda OMEGA Pulso (streetwear, oscuro, denso).
 * La lógica de datos vive en tienda-core.js; aquí sólo se compone la interfaz.
 * Todo texto del servidor entra por nodos de texto (h/s), nunca como HTML.
 */
import {
  h, s, reemplazar, conservarFoco, crearAnunciador, prepararModal,
  dinero, fechaLegible, hashCorto, nombreCategoria, porcentajeFicha,
  obtenerTienda, obtenerEventos, obtenerPedidos, consultarPedido, normalizarIdPedido, idPedidoValido,
  crearCarrito, motivoCarrito, estimarCarrito, validarCliente, enviarCheckout, mensajeError,
  recordarPedidoDemo, pedidosDemoRecordados,
  describirPromocion, describirEnvio, ETIQUETA_ESTADO_PROMO, anunciosUnicos,
  categoriasPresentes, filtrarYOrdenar, ORDENES, ETIQUETA_DISPONIBILIDAD, ETIQUETA_EVENTO, ETIQUETA_ESTADO_PEDIDO,
  descripcionCategoria, iniciarSondeo, firmaTienda, siluetaPara,
  MAX_CANTIDAD, MIN_CANTIDAD, LIMITE_EVENTOS, LIMITE_PEDIDOS,
} from './tienda-core.js';

const EMPRESA = 'omega';
const CICLOS_REGISTRO = 6;
const CICLOS_SEGUIMIENTO = 3;
const DURACION_AVISO_MS = 2600;
const SEGMENTOS_FICHA = 10;
const SEGUNDOS_POR_CARACTER_MARQUESINA = 0.16;
const CANALES = { redes_sociales: 'Redes sociales', buscadores: 'Buscadores', display: 'Display', correo: 'Correo', influencers: 'Influencers' };

const $ = (id) => document.getElementById(id);
const ui = {
  marquesina: $('marquesina'), pista: $('marquesina-pista'), pausa: $('marquesina-pausa'),
  estadoChip: $('estado-sim'), estadoEtiqueta: $('estado-etiqueta'), estadoTexto: $('estado-texto'),
  marcaNombre: $('marca-nombre'), marcaLema: $('marca-lema'),
  drops: $('drops-lista'), mensajes: $('mensajes'), mensajesLista: $('mensajes-lista'),
  herramientas: $('herramientas'), filtros: $('filtros'), orden: $('orden'),
  catalogoEstado: $('catalogo-estado'), mosaico: $('mosaico'), cuenta: $('catalogo-cuenta'),
  carrito: $('carrito'), carritoTitulo: $('carrito-titulo'), carritoConteo: $('carrito-conteo'), carritoCerrar: $('carrito-cerrar'),
  vistaCarrito: $('vista-carrito'), vistaCheckout: $('vista-checkout'), vistaConfirmacion: $('vista-confirmacion'),
  checkoutVolver: $('checkout-volver'), checkoutTitulo: $('checkout-titulo'),
  formCheckout: $('form-checkout'), alias: $('alias'), aliasError: $('alias-error'), ciudad: $('ciudad'), ciudadError: $('ciudad-error'),
  checkoutError: $('checkout-error'), checkoutEnviar: $('checkout-enviar'), checkoutResumen: $('checkout-resumen'),
  barra: $('barra-carrito'), barraTexto: $('barra-carrito-texto'), barraTotal: $('barra-carrito-total'), velo: $('velo'),
  detalle: $('detalle'), detalleContenido: $('detalle-contenido'),
  formRastreo: $('form-rastreo'), pedidoId: $('pedido-id'), pedidoError: $('pedido-error'), resultado: $('resultado-rastreo'),
  misDemos: $('mis-demos'), misDemosLista: $('mis-demos-lista'), recientes: $('pedidos-recientes'),
  feedResumen: $('feed-resumen'), feedActualizar: $('feed-actualizar'), eventos: $('eventos'),
  pieDescripcion: $('pie-descripcion'), pieAviso: $('pie-aviso'), avisoFlotante: $('aviso-flotante'),
};
const FONDO_HOJA = ['marquesina', 'franja-aviso', 'cabecera', 'drops', 'principal', 'pie', 'barra-carrito'].map($);

const carrito = crearCarrito(EMPRESA);
const anunciar = crearAnunciador($('anuncio-vivo'));
const modalDetalle = prepararModal(ui.detalle);
const escritorio = window.matchMedia('(min-width: 1024px)');

let estado = Object.freeze({
  tienda: null, error: null, firma: '', ciclo: 0,
  filtro: 'todo', orden: 'destacados',
  detalleSku: null, cantidadDetalle: 1,
  vista: 'carrito', hojaAbierta: false, enviando: false, seguido: null,
});
const fijar = (cambios) => {
  estado = Object.freeze({ ...estado, ...cambios });
};
const escaparate = () => estado.tienda?.escaparate ?? null;
const producto = (sku) => escaparate()?.productos.find((p) => p.sku === sku) ?? null;
const piezas = (n) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`;

/* ───────────── Piezas visuales ───────────── */

function visual(p) {
  const forma = siluetaPara(p);
  return s('svg', { class: `visual visual--${p.categoria}`, viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { class: 'visual__fondo', width: 100, height: 100 }),
    s('rect', { class: 'visual__trama', width: 100, height: 100, fill: 'url(#omega-puntos)' }),
    s('path', { class: 'visual__bloque', d: 'M0 70 L100 34 L100 100 L0 100 Z' }),
    s('g', { transform: 'rotate(-7 50 52) translate(14 12) scale(0.72)' },
      s('path', { class: 'visual__sombra', d: forma.base, transform: 'translate(4 4)' }),
      s('path', { class: 'visual__prenda', d: forma.base }),
      forma.detalles.map((d) => s('path', { class: 'visual__costura', d }))),
    s('text', { class: 'visual__codigo', x: 6, y: 13 }, p.sku));
}

/** Precio grande: el monto completo para lectores y los centavos en pequeño para la vista. */
function numeral(centavos, clase) {
  const texto = dinero(centavos);
  const corte = texto.lastIndexOf('.');
  return h('span', { class: clase },
    h('span', { class: 'sr-only' }, texto),
    h('span', { 'aria-hidden': 'true' }, corte > 0 ? texto.slice(0, corte) : texto,
      corte > 0 ? h('span', { class: 'numeral__cent' }, texto.slice(corte)) : null));
}

function precio(p, extra = '') {
  const rebajado = p.descuentoPct > 0 && p.precioLista > p.precioFinal;
  return h('p', { class: ['precio', rebajado && 'precio--rebajado', extra] },
    numeral(p.precioFinal, 'precio__final'),
    rebajado ? h('s', { class: 'precio__lista' }, h('span', { class: 'sr-only' }, 'antes '), dinero(p.precioLista)) : null);
}

function disponibilidad(valor) {
  const marca = { disponible: '●', pocas: '◐', agotado: '○' }[valor];
  return h('p', { class: `disponibilidad disponibilidad--${valor}` },
    h('span', { class: 'disponibilidad__marca', 'aria-hidden': 'true' }, marca), ETIQUETA_DISPONIBILIDAD[valor]);
}

function ficha(calidad) {
  const llenos = Math.round(calidad * SEGMENTOS_FICHA);
  return h('p', { class: 'ficha' },
    h('span', { class: 'sr-only' }, 'Calidad de ficha: '),
    h('span', { class: 'ficha__barra', 'aria-hidden': 'true' },
      Array.from({ length: SEGMENTOS_FICHA }, (_, i) => h('span', { class: ['ficha__seg', i < llenos && 'ficha__seg--lleno'] }))),
    h('span', { class: 'ficha__valor' }, h('span', { 'aria-hidden': 'true' }, 'Ficha '), `${porcentajeFicha(calidad)}%`));
}

function fila(etiqueta, valor, clase = '') {
  return h('div', { class: ['totales__fila', clase] }, h('dt', null, etiqueta), h('dd', { class: 'tabular' }, valor));
}

function mostrarAviso(texto) {
  ui.avisoFlotante.textContent = texto;
  ui.avisoFlotante.classList.add('aviso-flotante--visible');
  clearTimeout(mostrarAviso.temporizador);
  mostrarAviso.temporizador = setTimeout(() => ui.avisoFlotante.classList.remove('aviso-flotante--visible'), DURACION_AVISO_MS);
}

function sacudir(el) {
  el.classList.remove('sacudida');
  void el.offsetWidth; // reinicia la animación
  el.classList.add('sacudida');
}

/* ───────────── Cabecera, marquesina y drops ───────────── */

function pintarEstadoSimulacion() {
  const { tienda, error } = estado;
  const esc = escaparate();
  ui.estadoEtiqueta.textContent = error ? 'Sin señal' : !tienda ? 'Conectando' : esc ? 'En vivo' : 'En espera';
  let texto;
  if (!tienda) texto = error ? 'reintentando conexión…' : '…';
  else if (!esc) texto = 'abre con la ronda 1';
  else texto = `Ronda ${esc.ronda} · Día ${esc.dia} · ${fechaLegible(tienda.fechaSimulada)}`;
  ui.estadoTexto.textContent = texto;
  ui.estadoChip.dataset.estado = error ? 'error' : esc ? 'abierta' : 'espera';
}

function pintarMarca() {
  const { marca, aviso } = estado.tienda;
  if (marca.nombre) {
    const [primera, ...resto] = marca.nombre.split(' ');
    reemplazar(ui.marcaNombre, h('span', { class: 'logo__a' }, primera), resto.length ? [' ', h('span', { class: 'logo__b' }, resto.join(' '))] : null);
    document.title = `${marca.nombre} · Tienda sintética`;
  }
  if (marca.lema) ui.marcaLema.textContent = marca.lema;
  if (marca.descripcion) ui.pieDescripcion.textContent = marca.descripcion;
  ui.pieAviso.textContent = aviso;
}

function textosMarquesina(esc) {
  if (!esc) return ['La tienda abre con la primera ronda', 'Precios en vivo', 'Envío rápido'];
  return [
    describirEnvio(esc.envio),
    ...esc.promociones.map((p) => describirPromocion(p, esc)).filter((d) => d.estado !== 'concluida').map((d) => d.texto),
    // Mensajes generados por agentes: texto NO confiable, sólo como nodo de texto.
    ...anunciosUnicos(esc.anuncios).map((a) => a.mensaje),
  ];
}

function pintarMarquesina() {
  const textos = textosMarquesina(escaparate());
  const grupo = () => h('ul', { class: 'marquesina__grupo' }, textos.map((t) => h('li', { class: 'marquesina__item' }, t)));
  reemplazar(ui.pista, grupo(), grupo());
  const caracteres = textos.reduce((a, t) => a + t.length, 0);
  ui.pista.style.setProperty('--duracion', `${Math.max(18, Math.round(caracteres * SEGUNDOS_POR_CARACTER_MARQUESINA))}s`);
}

function alternarMarquesina() {
  const pausada = ui.pausa.getAttribute('aria-pressed') !== 'true';
  ui.pausa.setAttribute('aria-pressed', String(pausada));
  $('marquesina-verbo').textContent = pausada ? 'Reanudar' : 'Pausar';
  ui.marquesina.classList.toggle('marquesina--pausada', pausada);
}

function drop(sticker, titulo, detalle, variante, etiqueta) {
  return h('li', { class: ['drop', `drop--${variante}`] },
    h('p', { class: 'drop__sticker', 'aria-hidden': 'true' }, sticker),
    h('div', { class: 'drop__cuerpo' },
      h('p', { class: 'drop__texto' }, titulo),
      h('p', { class: 'drop__detalle' }, detalle, etiqueta ? h('span', { class: 'drop__estado' }, etiqueta) : null)));
}

function pintarDrops() {
  const esc = escaparate();
  if (!esc) {
    reemplazar(ui.drops, drop('PRONTO', 'La tienda abre cuando inicie la primera ronda', 'Esta página se actualiza sola.', 'neutro'));
    ui.mensajes.hidden = true;
    return;
  }
  const envio = drop('ENVÍO', describirEnvio(esc.envio), esc.envio.gratisDesde > 0 ? `Envío estándar ${dinero(esc.envio.costo, { corto: true })}` : 'Sin mínimo de compra', 'envio');
  const promos = esc.promociones.map((p) => {
    const d = describirPromocion(p, esc);
    const sticker = p.tipo === 'compra_multiple' ? `+${p.pct}%` : `−${p.pct}%`;
    return drop(sticker, d.titulo, `${d.cuando.charAt(0).toUpperCase()}${d.cuando.slice(1)} · `, d.estado, ETIQUETA_ESTADO_PROMO[d.estado]);
  });
  reemplazar(ui.drops, envio, promos, promos.length === 0 ? drop('0%', 'Sin promociones esta semana', 'Precio bajo de base, todos los días.', 'neutro') : null);
  const anuncios = anunciosUnicos(esc.anuncios);
  ui.mensajes.hidden = anuncios.length === 0;
  reemplazar(ui.mensajesLista, anuncios.map((a) => h('li', { class: 'mensaje' },
    h('p', { class: 'mensaje__canal' }, CANALES[a.canal] ?? a.canal),
    h('blockquote', { class: 'mensaje__texto' }, h('p', null, a.mensaje)))));
}

/* ───────────── Catálogo ───────────── */

function pintarFiltros() {
  const categorias = categoriasPresentes(estado.tienda);
  if (estado.filtro !== 'todo' && !categorias.includes(estado.filtro)) fijar({ filtro: 'todo' });
  const conteo = (c) => (escaparate()?.productos ?? []).filter((p) => c === 'todo' || p.categoria === c).length;
  conservarFoco(ui.filtros, () => reemplazar(ui.filtros, ['todo', ...categorias].map((c) =>
    h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(c === estado.filtro), dataset: { foco: `filtro:${c}` },
      onclick: () => {
        fijar({ filtro: c });
        pintarFiltros();
        pintarCatalogo();
      },
    }, c === 'todo' ? 'Todo' : nombreCategoria(c), h('span', { class: 'chip__n' }, String(conteo(c)))))));
}

function tile(p) {
  const agotado = p.disponibilidad === 'agotado';
  const idTitulo = `tile-${p.sku}`;
  return h('li', { class: ['tile', agotado && 'tile--agotado'] },
    h('article', { class: 'tile__caja', 'aria-labelledby': idTitulo },
      h('div', { class: 'tile__visual', onclick: () => abrirDetalle(p.sku, $(idTitulo)) },
        visual(p),
        p.descuentoPct > 0 ? h('span', { class: 'sticker' }, `−${p.descuentoPct}%`) : null,
        agotado ? h('span', { class: 'cinta', 'aria-hidden': 'true' }, 'Agotado') : null),
      h('div', { class: 'tile__info' },
        h('p', { class: 'tile__cat' }, nombreCategoria(p.categoria)),
        h('h3', { class: 'tile__nombre' },
          h('button', { type: 'button', class: 'tile__abrir', id: idTitulo, 'aria-haspopup': 'dialog', dataset: { foco: `ver:${p.sku}` }, onclick: (e) => abrirDetalle(p.sku, e.currentTarget) }, p.nombre)),
        precio(p),
        h('div', { class: 'tile__meta' }, disponibilidad(p.disponibilidad), ficha(p.calidadFicha)),
        h('button', { type: 'button', class: 'boton boton--lima boton--ancho tile__agregar', disabled: agotado, dataset: { foco: `agregar:${p.sku}` }, onclick: () => agregar(p.sku, 1) },
          agotado ? 'Agotado' : '+ Agregar', h('span', { class: 'sr-only' }, `: ${p.nombre}`)))));
}

function pintarCatalogo() {
  const esc = escaparate();
  if (!esc) {
    ui.mosaico.hidden = true;
    ui.herramientas.hidden = true;
    ui.catalogoEstado.hidden = false;
    ui.cuenta.textContent = '';
    if (!estado.tienda) {
      reemplazar(ui.catalogoEstado, h('p', { class: 'estado-catalogo__texto' },
        estado.error ? `Sin conexión con la tienda: ${mensajeError(estado.error)}` : 'Cargando catálogo…'));
      return;
    }
    reemplazar(ui.catalogoEstado,
      h('p', { class: 'estado-catalogo__grande' }, 'Pronto'),
      h('h3', { class: 'estado-catalogo__titulo' }, 'La tienda abre cuando inicie la primera ronda'),
      h('p', { class: 'estado-catalogo__texto' }, 'El catálogo aparece aquí solo, sin recargar: revisamos cada 5 segundos.'));
    return;
  }
  ui.catalogoEstado.hidden = true;
  ui.herramientas.hidden = false;
  ui.mosaico.hidden = false;
  const lista = filtrarYOrdenar(esc.productos, { categoria: estado.filtro, orden: estado.orden });
  conservarFoco(ui.mosaico, () => reemplazar(ui.mosaico, lista.map(tile)));
  const cuenta = `${piezas(lista.length)}${estado.filtro === 'todo' ? '' : ` · ${nombreCategoria(estado.filtro)}`}`;
  if (ui.cuenta.textContent !== cuenta) ui.cuenta.textContent = cuenta;
}

/* ───────────── Detalle ───────────── */

function abrirDetalle(sku, origen) {
  fijar({ detalleSku: sku, cantidadDetalle: 1 });
  pintarDetalle();
  modalDetalle.abrir(origen);
}

function cambiarCantidadDetalle(delta) {
  const nueva = Math.min(MAX_CANTIDAD, Math.max(MIN_CANTIDAD, estado.cantidadDetalle + delta));
  if (nueva === estado.cantidadDetalle) {
    anunciar(delta > 0 ? `Máximo ${MAX_CANTIDAD} piezas por artículo.` : `Mínimo ${MIN_CANTIDAD} pieza.`);
    return;
  }
  fijar({ cantidadDetalle: nueva });
  conservarFoco(ui.detalleContenido, pintarDetalle);
}

function pintarDetalle() {
  const p = producto(estado.detalleSku);
  if (!p) {
    reemplazar(ui.detalleContenido,
      h('h2', { class: 'detalle__titulo', id: 'detalle-titulo' }, 'Ya no está a la venta'),
      h('p', { class: 'ayuda' }, 'Este artículo salió del catálogo de esta semana.'));
    return;
  }
  const agotado = p.disponibilidad === 'agotado';
  const n = estado.cantidadDetalle;
  reemplazar(ui.detalleContenido,
    h('div', { class: 'detalle__visual' }, visual(p),
      p.descuentoPct > 0 ? h('span', { class: 'sticker sticker--grande' }, `−${p.descuentoPct}%`) : null,
      agotado ? h('span', { class: 'cinta', 'aria-hidden': 'true' }, 'Agotado') : null),
    h('div', { class: 'detalle__info' },
      h('p', { class: 'tile__cat' }, `${nombreCategoria(p.categoria)} · ${p.sku}`),
      h('h2', { class: 'detalle__titulo', id: 'detalle-titulo' }, p.nombre),
      precio(p, 'precio--grande'),
      h('div', { class: 'tile__meta' }, disponibilidad(p.disponibilidad), ficha(p.calidadFicha)),
      h('p', { class: 'detalle__descripcion' }, descripcionCategoria(p.categoria)),
      h('p', { class: 'ayuda' }, 'La ficha mide qué tan completa está la página del producto en la simulación.'),
      h('div', { class: 'detalle__compra' },
        h('div', { class: 'stepper', role: 'group', 'aria-labelledby': 'detalle-cantidad-etiqueta' },
          h('span', { class: 'etiqueta', id: 'detalle-cantidad-etiqueta' }, 'Cantidad'),
          h('div', { class: 'stepper__controles' },
            h('button', { type: 'button', class: 'stepper__boton', 'aria-label': 'Una pieza menos', 'aria-disabled': String(n <= MIN_CANTIDAD || agotado), dataset: { foco: 'det-menos' }, onclick: () => cambiarCantidadDetalle(-1) }, '−'),
            h('output', { class: 'stepper__valor tabular', 'aria-live': 'polite' }, String(n)),
            h('button', { type: 'button', class: 'stepper__boton', 'aria-label': 'Una pieza más', 'aria-disabled': String(n >= MAX_CANTIDAD || agotado), dataset: { foco: 'det-mas' }, onclick: () => cambiarCantidadDetalle(1) }, '+'))),
        h('button', { type: 'button', class: 'boton boton--lima boton--grande', disabled: agotado, dataset: { foco: 'det-agregar' }, onclick: () => agregarDesdeDetalle(p.sku) },
          agotado ? 'Agotado' : `Agregar ${n} al carrito`)),
      h('p', { class: 'detalle__nota' }, 'Producto sintético: existe sólo dentro de la simulación.')));
}

function agregarDesdeDetalle(sku) {
  if (!agregar(sku, estado.cantidadDetalle)) return;
  modalDetalle.cerrar($(`tile-${sku}`));
}

/* ───────────── Carrito (panel fijo en escritorio, hoja inferior en móvil) ───────────── */

function agregar(sku, cantidad) {
  const p = producto(sku);
  if (!p || p.disponibilidad === 'agotado') {
    anunciar('Este artículo está agotado.');
    return false;
  }
  const r = carrito.agregar(sku, cantidad);
  if (!r.ok) {
    const m = motivoCarrito(r.motivo);
    anunciar(m);
    mostrarAviso(m);
    return false;
  }
  const m = `${p.nombre}: ${piezas(r.cantidad)} en el carrito.${r.recortado ? ` Máximo ${MAX_CANTIDAD} por artículo.` : ''}`;
  anunciar(m);
  mostrarAviso(m);
  sacudir(escritorio.matches ? ui.carrito : ui.barra);
  return true;
}

function cambiarCantidad(sku, cantidad) {
  const r = carrito.fijar(sku, cantidad);
  anunciar(r.ok ? `${producto(sku)?.nombre ?? sku}: ${r.cantidad}.` : motivoCarrito(r.motivo));
}

function quitar(sku) {
  const nombre = producto(sku)?.nombre ?? sku;
  carrito.quitar(sku);
  anunciar(`${nombre} fuera del carrito.`);
  if (!ui.carrito.contains(document.activeElement)) ui.carritoTitulo.focus();
}

function abrirHoja(enfocar = ui.carritoTitulo) {
  if (escritorio.matches) {
    enfocar.focus();
    return;
  }
  fijar({ hojaAbierta: true });
  ui.carrito.classList.add('carrito--abierto');
  ui.carrito.setAttribute('role', 'dialog');
  ui.carrito.setAttribute('aria-modal', 'true');
  ui.velo.hidden = false;
  ui.barra.setAttribute('aria-expanded', 'true');
  for (const el of FONDO_HOJA) el.inert = true;
  enfocar.focus();
}

function cerrarHoja({ devolverFoco = true } = {}) {
  if (!estado.hojaAbierta) return;
  fijar({ hojaAbierta: false });
  ui.carrito.classList.remove('carrito--abierto');
  ui.carrito.removeAttribute('role');
  ui.carrito.removeAttribute('aria-modal');
  ui.velo.hidden = true;
  ui.barra.setAttribute('aria-expanded', 'false');
  for (const el of FONDO_HOJA) el.inert = false;
  if (devolverFoco) ui.barra.focus();
}

function mostrarVista(vista, enfocar) {
  fijar({ vista });
  ui.vistaCarrito.hidden = vista !== 'carrito';
  ui.vistaCheckout.hidden = vista !== 'checkout';
  ui.vistaConfirmacion.hidden = vista !== 'confirmacion';
  if (enfocar) enfocar.focus();
}

function lineaCarrito(d) {
  const nombre = d.producto?.nombre ?? d.sku;
  const problema = d.problema === 'agotado' ? 'Agotado: quítalo para continuar' : d.problema === 'no_listado' ? 'Ya no está a la venta: quítalo' : null;
  return h('li', { class: ['linea', problema && 'linea--problema'] },
    h('div', { class: 'linea__visual' }, d.producto ? visual(d.producto) : null),
    h('div', { class: 'linea__info' },
      h('p', { class: 'linea__nombre' }, nombre),
      h('p', { class: 'linea__unitario' }, d.producto ? `${dinero(d.producto.precioFinal)} c/u` : '—'),
      problema ? h('p', { class: 'linea__problema' }, `✗ ${problema}`) : null,
      h('div', { class: 'linea__controles' },
        h('div', { class: 'stepper__controles stepper__controles--chico', role: 'group', 'aria-label': `Cantidad de ${nombre}` },
          h('button', { type: 'button', class: 'stepper__boton', 'aria-label': `Quitar una pieza de ${nombre}`, 'aria-disabled': String(d.cantidad <= MIN_CANTIDAD), dataset: { foco: `menos:${d.sku}` }, onclick: () => cambiarCantidad(d.sku, d.cantidad - 1) }, '−'),
          h('span', { class: 'stepper__valor tabular' }, String(d.cantidad)),
          h('button', { type: 'button', class: 'stepper__boton', 'aria-label': `Agregar una pieza de ${nombre}`, 'aria-disabled': String(d.cantidad >= MAX_CANTIDAD), dataset: { foco: `mas:${d.sku}` }, onclick: () => cambiarCantidad(d.sku, d.cantidad + 1) }, '+')),
        h('button', { type: 'button', class: 'linea__quitar', dataset: { foco: `quitar:${d.sku}` }, onclick: () => quitar(d.sku) }, 'Quitar', h('span', { class: 'sr-only' }, ` ${nombre}`)))),
    h('p', { class: 'linea__importe tabular' }, d.producto ? dinero(d.neto) : '—'));
}

function bloqueTotales(est) {
  return [
    h('dl', { class: 'totales' },
      fila('Subtotal (lista)', dinero(est.bruto)),
      est.descuento > 0 ? fila('Descuentos', `−${dinero(est.descuento)}`, 'totales__fila--ahorro') : null,
      fila('Envío', est.envio === 0 ? 'Gratis' : dinero(est.envio)),
      h('div', { class: 'totales__fila totales__fila--total' }, h('dt', null, 'Total estimado'), h('dd', null, numeral(est.total, 'totales__numeral')))),
    est.promoMultiple ? h('p', { class: 'ayuda ayuda--lima' }, `✓ ${est.promoMultiple.pct}% extra por compra múltiple aplicado.`) : null,
    est.proximaMultiple ? h('p', { class: 'ayuda ayuda--lima' }, `Agrega ${piezas(est.proximaMultiple.faltan)} más y llévate ${est.proximaMultiple.promo.pct}% extra.`) : null,
  ];
}

function bloqueEnvio(est) {
  if (est.gratisDesde <= 0) return h('p', { class: 'envio-meta__texto' }, 'Envío gratis en todos los pedidos.');
  const pct = Math.round(est.avanceEnvioGratis * 100);
  return h('div', { class: 'envio-meta' },
    h('p', { class: 'envio-meta__texto', id: 'envio-meta-texto' },
      est.faltaEnvioGratis > 0 ? `Te faltan ${dinero(est.faltaEnvioGratis)} para envío gratis` : '✓ Envío gratis desbloqueado'),
    h('progress', { class: 'envio-meta__barra', max: 100, value: pct, 'aria-labelledby': 'envio-meta-texto' }, `${pct}%`));
}

function pintarCarrito() {
  const lineas = carrito.lineas();
  const unidades = carrito.unidades();
  const esc = escaparate();
  const est = estimarCarrito(lineas, esc);
  ui.carritoConteo.textContent = piezas(unidades);
  ui.barraTexto.textContent = `Carrito · ${piezas(unidades)}`;
  ui.barraTotal.textContent = lineas.length ? `${dinero(est.total)} est.` : '';
  if (lineas.length === 0) {
    reemplazar(ui.vistaCarrito, h('div', { class: 'carrito-vacio' },
      h('p', { class: 'carrito-vacio__titulo' }, 'Vacío'),
      h('p', { class: 'ayuda' }, 'Toca «+ Agregar» en cualquier producto.')));
    return;
  }
  const bloqueo = !esc ? 'La tienda abre con la primera ronda.' : est.hayProblemas ? 'Quita los artículos agotados o no disponibles.' : null;
  conservarFoco(ui.vistaCarrito, () => reemplazar(ui.vistaCarrito,
    h('ul', { class: 'lineas', 'aria-label': 'Artículos en el carrito' }, est.detalle.map(lineaCarrito)),
    h('div', { class: 'carrito__resumen' },
      h('p', { class: 'etiqueta' }, 'Estimado'),
      bloqueTotales(est),
      bloqueEnvio(est),
      h('p', { class: 'ayuda' }, 'El total final lo calcula la tienda al confirmar.'),
      carrito.persistente() ? null : h('p', { class: 'ayuda' }, 'Tu navegador no permite guardar el carrito: se perderá al recargar.'),
      bloqueo ? h('p', { class: 'linea__problema' }, `✗ ${bloqueo}`) : null,
      h('button', { type: 'button', class: 'boton boton--lima boton--ancho boton--grande', disabled: Boolean(bloqueo), dataset: { foco: 'ir-checkout' }, onclick: abrirCheckout }, 'Ir al checkout →'))));
}

/* ───────────── Checkout exprés ───────────── */

function llenarCiudades() {
  const elegida = ui.ciudad.value;
  reemplazar(ui.ciudad, h('option', { value: '' }, 'Elige una ciudad'),
    estado.tienda.ciudades.map((c) => h('option', { value: c, selected: c === elegida }, c)));
}

function errorCampo(control, nodoError, mensaje) {
  nodoError.hidden = !mensaje;
  nodoError.textContent = mensaje ?? '';
  if (mensaje) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
}

function errorCheckout(mensaje) {
  ui.checkoutError.hidden = !mensaje;
  ui.checkoutError.textContent = mensaje ?? '';
}

function pintarResumenCheckout() {
  const est = estimarCarrito(carrito.lineas(), escaparate());
  reemplazar(ui.checkoutResumen,
    h('p', { class: 'etiqueta' }, `Resumen estimado · ${piezas(est.unidades)}`),
    h('ul', { class: 'resumen-lineas' }, est.detalle.map((d) => h('li', null,
      h('span', null, `${d.producto?.nombre ?? d.sku} ×${d.cantidad}`), h('span', { class: 'tabular' }, d.producto ? dinero(d.neto) : '—')))),
    bloqueTotales(est));
}

function abrirCheckout() {
  if (carrito.lineas().length === 0) return;
  errorCheckout(null);
  errorCampo(ui.alias, ui.aliasError, null);
  errorCampo(ui.ciudad, ui.ciudadError, null);
  pintarResumenCheckout();
  mostrarVista('checkout', ui.checkoutTitulo);
}

async function enviarPedido(evento) {
  evento.preventDefault();
  if (estado.enviando) return;
  errorCheckout(null);
  const v = validarCliente({ alias: ui.alias.value, ciudad: ui.ciudad.value }, estado.tienda?.ciudades ?? []);
  errorCampo(ui.alias, ui.aliasError, v.errores.alias);
  errorCampo(ui.ciudad, ui.ciudadError, v.errores.ciudad);
  if (!v.valido) {
    (v.errores.alias ? ui.alias : ui.ciudad).focus();
    anunciar('Revisa los campos marcados.');
    return;
  }
  const lineas = carrito.lineas();
  if (lineas.length === 0 || estimarCarrito(lineas, escaparate()).hayProblemas) {
    errorCheckout('Tu carrito tiene artículos agotados o no disponibles. Vuelve al carrito y quítalos.');
    ui.checkoutError.focus();
    return;
  }
  fijar({ enviando: true });
  ui.checkoutEnviar.disabled = true;
  ui.checkoutEnviar.textContent = 'Enviando…';
  ui.formCheckout.setAttribute('aria-busy', 'true');
  try {
    const respuesta = await enviarCheckout(lineas, v.cliente);
    pintarConfirmacion(respuesta); // primero la vista de confirmación, así vaciar el carrito no la cambia
    carrito.vaciar();
    recordarPedidoDemo(EMPRESA, respuesta.pedido.id);
    pintarMisDemos();
    anunciar(`Pedido ${respuesta.pedido.id} confirmado. Total ${dinero(respuesta.pedido.total)}.`);
  } catch (error) {
    errorCheckout(mensajeError(error));
    ui.checkoutError.focus();
    if (error?.estado === 409) sondeo.ahora();
  } finally {
    fijar({ enviando: false });
    ui.checkoutEnviar.disabled = false;
    ui.checkoutEnviar.textContent = 'Confirmar pedido simulado';
    ui.formCheckout.removeAttribute('aria-busy');
  }
}

function listaLineas(lineas) {
  return h('ul', { class: 'resumen-lineas' }, lineas.map((l) => h('li', null,
    h('span', null, `${l.nombre ?? l.sku ?? ''} ×${l.unidades ?? ''}`), h('span', { class: 'tabular' }, dinero(l.neto)))));
}

function pintarConfirmacion({ pedido, aviso }) {
  const lineas = Array.isArray(pedido.lineas) ? pedido.lineas : [];
  reemplazar(ui.vistaConfirmacion,
    h('p', { class: 'confirmacion__sello', 'aria-hidden': 'true' }, '✓ Listo'),
    h('h3', { class: 'carrito__subtitulo', id: 'confirmacion-titulo', tabindex: '-1' }, 'Pedido confirmado'),
    h('p', { class: 'confirmacion__id tabular' }, pedido.id),
    h('p', { class: 'ayuda' }, `${pedido.cliente?.alias ?? '—'} · ${pedido.cliente?.ciudad ?? '—'} · ronda ${pedido.ronda}, día ${pedido.dia}`),
    listaLineas(lineas),
    h('dl', { class: 'totales' },
      fila('Precio de lista', dinero(pedido.subtotal + pedido.descuento)),
      pedido.descuento > 0 ? fila('Descuentos', `−${dinero(pedido.descuento)}`, 'totales__fila--ahorro') : null,
      fila('Subtotal', dinero(pedido.subtotal)),
      fila('Envío', pedido.envio === 0 ? 'Gratis' : dinero(pedido.envio)),
      h('div', { class: 'totales__fila totales__fila--total' }, h('dt', null, 'Total'), h('dd', null, numeral(pedido.total, 'totales__numeral')))),
    h('p', { class: 'aviso-servidor', role: 'note' }, aviso),
    h('button', { type: 'button', class: 'boton boton--lima boton--ancho boton--grande', onclick: () => rastrearPedido(pedido.id) }, 'Rastrear pedido →'),
    h('button', { type: 'button', class: 'boton boton--contorno boton--ancho', onclick: () => mostrarVista('carrito', ui.carritoTitulo) }, 'Seguir comprando'));
  mostrarVista('confirmacion', $('confirmacion-titulo'));
}

function rastrearPedido(id) {
  ui.pedidoId.value = id;
  cerrarHoja({ devolverFoco: false });
  mostrarVista('carrito');
  $('rastreo').scrollIntoView({ block: 'start' });
  consultarRastreo(id, { enfocar: true });
}

/* ───────────── Rastreo ───────────── */

function errorRastreo(mensaje) {
  errorCampo(ui.pedidoId, ui.pedidoError, mensaje);
}

function paso(e, i) {
  return h('li', { class: ['paso', e.alcanzado ? 'paso--hecho' : 'paso--pendiente'] },
    h('span', { class: 'paso__marca', 'aria-hidden': 'true' }, e.alcanzado ? '✓' : String(i + 1)),
    h('p', { class: 'paso__estado' }, e.estado),
    h('p', { class: 'paso__detalle' }, e.alcanzado ? 'Hecho' : 'Pendiente', e.fecha ? ` · ${fechaLegible(e.fecha)} (simulada)` : ''),
    e.hash ? h('p', { class: 'paso__hash' }, h('code', { title: e.hash }, hashCorto(e.hash))) : null);
}

function pintarRastreo(d) {
  const pedido = d.pedido && typeof d.pedido === 'object' ? d.pedido : {};
  const lineas = Array.isArray(pedido.lineas) ? pedido.lineas : [];
  const hechas = d.etapas.filter((e) => e.alcanzado).length;
  const esDemo = d.tipo === 'demo';
  reemplazar(ui.resultado,
    h('div', { class: 'resultado__cabeza' },
      h('p', { class: ['insignia', esDemo ? 'insignia--demo' : 'insignia--sint'] }, esDemo ? 'Demo' : 'Sintético'),
      h('h3', { class: 'resultado__titulo tabular', id: 'resultado-titulo', tabindex: '-1' }, d.id),
      h('p', { class: 'resultado__avance' }, `${hechas}/${d.etapas.length} etapas`)),
    h('p', { class: 'ayuda' }, esDemo
      ? `Demostración de ${pedido.cliente?.alias ?? '—'} en ${pedido.cliente?.ciudad ?? '—'}. Avanza con el reloj real: 1, 3 y 6 minutos.`
      : `Cliente simulado ${pedido.clienteId ?? '—'}. Fechas del calendario simulado.`),
    h('ol', { class: 'pasos', 'aria-label': `Etapas del pedido ${d.id}` }, d.etapas.map(paso)),
    lineas.length ? listaLineas(lineas) : null,
    h('p', { class: 'resultado__total' }, 'Total ', h('strong', { class: 'tabular' }, dinero(pedido.total)),
      typeof pedido.envio === 'number' ? ` · envío ${pedido.envio === 0 ? 'gratis' : dinero(pedido.envio)}` : ''),
    esDemo && d.aviso ? h('p', { class: 'aviso-servidor' }, d.aviso) : null);
}

async function consultarRastreo(texto, { enfocar = false, silencioso = false } = {}) {
  const id = normalizarIdPedido(texto);
  if (!silencioso) errorRastreo(null);
  if (!idPedidoValido(id)) {
    errorRastreo('Escribe un número como DEMO-OMEGA-0001 u OMEGA-000123.');
    ui.pedidoId.focus();
    return;
  }
  if (!silencioso) reemplazar(ui.resultado, h('p', { class: 'ayuda' }, `Rastreando ${id}…`));
  try {
    const datos = await consultarPedido(id);
    const anterior = estado.seguido;
    fijar({ seguido: datos });
    pintarRastreo(datos);
    const hechas = datos.etapas.filter((e) => e.alcanzado).length;
    const avanzo = silencioso && anterior?.id === datos.id && hechas > anterior.etapas.filter((e) => e.alcanzado).length;
    if (!silencioso || avanzo) anunciar(`Pedido ${datos.id}: ${hechas} de ${datos.etapas.length} etapas.`);
    if (enfocar) $('resultado-titulo')?.focus();
  } catch (error) {
    if (silencioso) {
      ui.resultado.append(h('p', { class: 'linea__problema' }, `✗ No se pudo actualizar: ${mensajeError(error)}`));
      return;
    }
    fijar({ seguido: null });
    reemplazar(ui.resultado);
    errorRastreo(mensajeError(error));
    ui.pedidoId.focus();
  }
}

function pintarMisDemos() {
  const ids = pedidosDemoRecordados(EMPRESA);
  ui.misDemos.hidden = ids.length === 0;
  reemplazar(ui.misDemosLista, ids.map((id) => h('li', null,
    h('button', { type: 'button', class: 'chip chip--mono', onclick: () => { ui.pedidoId.value = id; consultarRastreo(id, { enfocar: true }); } }, id))));
}

function pintarPedidos(lista) {
  if (lista.length === 0) {
    reemplazar(ui.recientes, h('li', { class: 'vacio' }, 'Aún no hay pedidos sintéticos.'));
    return;
  }
  conservarFoco(ui.recientes, () => reemplazar(ui.recientes, lista.map((p) => h('li', null,
    h('button', {
      type: 'button', class: 'reciente', dataset: { foco: `pedido:${p.id}` },
      onclick: () => { ui.pedidoId.value = p.id; consultarRastreo(p.id, { enfocar: true }); },
    },
    h('span', { class: 'reciente__id' }, p.id),
    h('span', { class: 'reciente__meta' }, `${fechaLegible(p.fecha)} · ${piezas(p.unidades)}`),
    h('span', { class: `reciente__estado reciente__estado--${p.estado.replace(/\s+/g, '-')}` }, ETIQUETA_ESTADO_PEDIDO[p.estado] ?? p.estado),
    h('span', { class: 'reciente__total tabular' }, dinero(p.total)))))));
}

/* ───────────── Feed verificable ───────────── */

function pintarEventos(lista) {
  const verificados = lista.filter((e) => e.verificado).length;
  ui.feedResumen.textContent = lista.length ? `${verificados}/${lista.length} verificados` : 'Sin eventos todavía';
  reemplazar(ui.eventos, lista.map((e) => h('li', { class: ['feed__item', !e.verificado && 'feed__item--fallido'] },
    h('span', { class: 'feed__sello' }, e.verificado ? '✓ Verificado' : '✗ No verificado'),
    h('span', { class: 'feed__codigo' }, e.codigo),
    h('span', { class: 'feed__resumen' }, e.resumen, ETIQUETA_EVENTO[e.codigo] ? h('span', { class: 'feed__tipo' }, ` · ${ETIQUETA_EVENTO[e.codigo]}`) : null),
    h('span', { class: 'feed__meta' }, `#${e.seq} · R${e.ronda} D${e.dia} · ${fechaLegible(e.fecha)} · `, h('code', { title: e.hash }, hashCorto(e.hash))))));
}

async function refrescarRegistro() {
  const [eventos, pedidos] = await Promise.allSettled([obtenerEventos(LIMITE_EVENTOS), obtenerPedidos(LIMITE_PEDIDOS)]);
  if (eventos.status === 'fulfilled') pintarEventos(eventos.value);
  else ui.feedResumen.textContent = `Sin feed: ${mensajeError(eventos.reason)}`;
  if (pedidos.status === 'fulfilled') pintarPedidos(pedidos.value);
  else reemplazar(ui.recientes, h('li', { class: 'vacio' }, `No se pudieron cargar los pedidos: ${mensajeError(pedidos.reason)}`));
}

/* ───────────── Sondeo principal ───────────── */

async function refrescar() {
  const ciclo = estado.ciclo + 1;
  try {
    const tienda = await obtenerTienda();
    const firma = firmaTienda(tienda);
    const cambio = firma !== estado.firma;
    const primera = estado.tienda === null;
    fijar({ tienda, error: null, firma, ciclo });
    if (primera) {
      pintarMarca();
      llenarCiudades();
    }
    pintarEstadoSimulacion();
    if (cambio || primera) {
      pintarMarquesina();
      pintarDrops();
      pintarFiltros();
      pintarCatalogo();
      pintarCarrito();
      if (modalDetalle.abierto) conservarFoco(ui.detalleContenido, pintarDetalle);
      if (estado.vista === 'checkout') pintarResumenCheckout();
    }
    if (cambio || ciclo % CICLOS_REGISTRO === 0) await refrescarRegistro();
  } catch (error) {
    fijar({ error, ciclo });
    pintarEstadoSimulacion();
    if (!estado.tienda) pintarCatalogo();
  }
  const seguido = estado.seguido;
  if (ciclo % CICLOS_SEGUIMIENTO === 0 && seguido?.tipo === 'demo' && seguido.etapas.some((e) => !e.alcanzado)) {
    await consultarRastreo(seguido.id, { silencioso: true });
  }
}

/* ───────────── Arranque ───────────── */

function enlazarEventos() {
  for (const boton of ui.detalle.querySelectorAll('[data-cerrar]')) boton.addEventListener('click', () => modalDetalle.cerrar());
  ui.pausa.addEventListener('click', alternarMarquesina);
  reemplazar(ui.orden, ORDENES.map((o) => h('option', { value: o.id }, o.etiqueta)));
  ui.orden.addEventListener('change', () => {
    fijar({ orden: ui.orden.value });
    pintarCatalogo();
  });
  ui.barra.addEventListener('click', () => (estado.hojaAbierta ? cerrarHoja() : abrirHoja()));
  ui.carritoCerrar.addEventListener('click', () => cerrarHoja());
  ui.velo.addEventListener('click', () => cerrarHoja());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && estado.hojaAbierta && !ui.detalle.open) cerrarHoja();
  });
  escritorio.addEventListener('change', () => {
    if (escritorio.matches) cerrarHoja({ devolverFoco: false });
  });
  ui.checkoutVolver.addEventListener('click', () => mostrarVista('carrito', ui.carritoTitulo));
  ui.formCheckout.addEventListener('submit', enviarPedido);
  ui.alias.addEventListener('input', () => {
    if (ui.alias.hasAttribute('aria-invalid')) errorCampo(ui.alias, ui.aliasError, null);
  });
  ui.ciudad.addEventListener('change', () => errorCampo(ui.ciudad, ui.ciudadError, null));
  ui.formRastreo.addEventListener('submit', (e) => {
    e.preventDefault();
    consultarRastreo(ui.pedidoId.value, { enfocar: true });
  });
  ui.feedActualizar.addEventListener('click', async () => {
    ui.feedActualizar.disabled = true;
    await refrescarRegistro();
    ui.feedActualizar.disabled = false;
    anunciar(ui.feedResumen.textContent);
  });
  carrito.suscribir(() => {
    pintarCarrito();
    if (estado.vista === 'checkout') {
      if (carrito.lineas().length === 0) mostrarVista('carrito', ui.carritoTitulo);
      else pintarResumenCheckout();
    }
  });
}

enlazarEventos();
pintarMarquesina();
pintarCarrito();
pintarMisDemos();
const sondeo = iniciarSondeo(refrescar, {
  alError: (error) => {
    fijar({ error });
    pintarEstadoSimulacion();
  },
});
