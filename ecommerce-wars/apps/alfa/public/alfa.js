/*
 * alfa.js — interfaz de la tienda Atelier ALFA (editorial, lujo sereno).
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

const EMPRESA = 'alfa';
const CICLOS_REGISTRO = 6; // eventos y pedidos se refrescan cada ~30 s aunque no cambie el día
const CICLOS_SEGUIMIENTO = 3; // un pedido demo en curso se refresca cada ~15 s
const DURACION_AVISO_MS = 2800;
const PASOS_FICHA = 5;

const $ = (id) => document.getElementById(id);
const ui = {
  estadoChip: $('estado-sim'), estadoTexto: $('estado-texto'),
  abrirBolsa: $('abrir-bolsa'), bolsaCuenta: $('bolsa-cuenta'),
  marcaNombre: $('marca-nombre'), marcaLema: $('marca-lema'), marcaDescripcion: $('marca-descripcion'),
  promos: $('promos-lista'), anunciosBloque: $('anuncios-bloque'), anuncios: $('anuncios-lista'),
  boletin: $('portada-boletin'),
  herramientas: $('herramientas'), filtros: $('filtros'), orden: $('orden'),
  catalogoEstado: $('catalogo-estado'), catalogo: $('catalogo'), cuenta: $('catalogo-cuenta'),
  detalle: $('detalle'), detalleContenido: $('detalle-contenido'),
  bolsa: $('bolsa'), bolsaTitulo: $('bolsa-titulo'), bolsaCuerpo: $('bolsa-cuerpo'), bolsaPie: $('bolsa-pie'),
  checkout: $('checkout'), checkoutDatos: $('checkout-datos'), checkoutConfirmacion: $('checkout-confirmacion'),
  formCheckout: $('form-checkout'), alias: $('alias'), aliasError: $('alias-error'), ciudad: $('ciudad'), ciudadError: $('ciudad-error'),
  checkoutError: $('checkout-error'), checkoutEnviar: $('checkout-enviar'), checkoutResumen: $('checkout-resumen'),
  formSeguimiento: $('form-seguimiento'), pedidoId: $('pedido-id'), pedidoError: $('pedido-error'), resultado: $('resultado-seguimiento'),
  misDemos: $('mis-demos'), misDemosLista: $('mis-demos-lista'), recientes: $('pedidos-recientes'),
  registroResumen: $('registro-resumen'), registroActualizar: $('registro-actualizar'), eventos: $('eventos'),
  pieDescripcion: $('pie-descripcion'), pieAviso: $('pie-aviso'), avisoFlotante: $('aviso-flotante'),
};

const carrito = crearCarrito(EMPRESA);
const anunciar = crearAnunciador($('anuncio-vivo'));
const modalDetalle = prepararModal(ui.detalle);
const modalBolsa = prepararModal(ui.bolsa);
const modalCheckout = prepararModal(ui.checkout);
const modales = new Map([[ui.detalle, modalDetalle], [ui.bolsa, modalBolsa], [ui.checkout, modalCheckout]]);

let estado = Object.freeze({
  tienda: null, error: null, firma: '', ciclo: 0,
  filtro: 'todo', orden: 'destacados',
  detalleSku: null, cantidadDetalle: 1,
  enviando: false, seguido: null,
});
const fijar = (cambios) => {
  estado = Object.freeze({ ...estado, ...cambios });
};
const escaparate = () => estado.tienda?.escaparate ?? null;
const producto = (sku) => escaparate()?.productos.find((p) => p.sku === sku) ?? null;
const piezas = (n) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`;

/* ───────────── Piezas visuales reutilizables ───────────── */

function visual(p) {
  const forma = siluetaPara(p);
  return s('svg', { class: `visual visual--${p.categoria}`, viewBox: '0 0 100 125', 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { class: 'visual__papel', width: 100, height: 125 }),
    s('path', { class: 'visual__arco', d: 'M17 125 V54 A33 33 0 0 1 83 54 V125 Z' }),
    s('rect', { class: 'visual__zocalo', x: 0, y: 106, width: 100, height: 19, fill: 'url(#alfa-trama)' }),
    s('line', { class: 'visual__filo', x1: 0, y1: 106, x2: 100, y2: 106 }),
    s('ellipse', { class: 'visual__sombra', cx: 50, cy: 101, rx: 25, ry: 2.4 }),
    s('g', { transform: 'translate(15 32) scale(0.7)' },
      s('path', { class: 'visual__prenda', d: forma.base }),
      forma.detalles.map((d) => s('path', { class: 'visual__costura', d }))));
}

function precio(p, extra = '') {
  const rebajado = p.descuentoPct > 0 && p.precioLista > p.precioFinal;
  return h('p', { class: ['precio', extra] },
    rebajado ? h('s', { class: 'precio__lista' }, h('span', { class: 'sr-only' }, 'Antes '), dinero(p.precioLista)) : null,
    h('span', { class: 'precio__final' }, rebajado ? h('span', { class: 'sr-only' }, 'Ahora ') : null, dinero(p.precioFinal)));
}

function disponibilidad(valor) {
  return h('p', { class: `disponibilidad disponibilidad--${valor}` },
    h('span', { class: 'disponibilidad__marca', 'aria-hidden': 'true' }),
    ETIQUETA_DISPONIBILIDAD[valor]);
}

function ficha(calidad) {
  const valor = Math.round(calidad * PASOS_FICHA * 2) / 2; // medios pasos: 0.5 → 2½ de 5
  return h('p', { class: 'ficha' },
    h('span', { class: 'sr-only' }, 'Calidad de ficha: '),
    h('span', { class: 'ficha__etiqueta', 'aria-hidden': 'true' }, 'Ficha'),
    h('span', { class: 'ficha__escala', 'aria-hidden': 'true' },
      Array.from({ length: PASOS_FICHA }, (_, i) => h('span', {
        class: ['ficha__paso', i + 1 <= valor ? 'ficha__paso--lleno' : i < valor && 'ficha__paso--medio'],
      }))),
    h('span', { class: 'ficha__valor' }, `${porcentajeFicha(calidad)}%`));
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

/* ───────────── Cabecera, promociones y portada ───────────── */

function pintarEstadoSimulacion() {
  const { tienda, error } = estado;
  const esc = escaparate();
  let texto;
  if (!tienda) texto = error ? 'Sin conexión con la tienda · reintentando' : 'Conectando con la tienda…';
  else if (!esc) texto = 'En espera de la ronda 1';
  else texto = `Ronda ${esc.ronda} · Día ${esc.dia} · ${fechaLegible(tienda.fechaSimulada)}`;
  if (tienda && error) texto += ' · sin conexión, reintentando';
  ui.estadoTexto.textContent = texto;
  ui.estadoChip.dataset.estado = error ? 'error' : esc ? 'abierta' : 'espera';
}

function pintarMarca() {
  const { marca, aviso } = estado.tienda;
  if (marca.nombre) {
    ui.marcaNombre.textContent = marca.nombre;
    document.title = `${marca.nombre} · Tienda sintética`;
  }
  if (marca.lema) ui.marcaLema.textContent = marca.lema;
  if (marca.descripcion) {
    ui.marcaDescripcion.textContent = marca.descripcion;
    ui.pieDescripcion.textContent = marca.descripcion;
  }
  ui.pieAviso.textContent = aviso;
}

function pintarPromos() {
  const esc = escaparate();
  if (!esc) {
    reemplazar(ui.promos, h('li', { class: 'promos__item' }, 'La tienda abre cuando inicie la primera ronda.'));
    ui.anunciosBloque.hidden = true;
    return;
  }
  const envio = h('li', { class: 'promos__item' },
    h('span', { class: 'promos__clave' }, describirEnvio(esc.envio)),
    esc.envio.gratisDesde > 0 ? ` · envío estándar ${dinero(esc.envio.costo, { corto: true })}` : null);
  const promos = esc.promociones.map((p) => {
    const d = describirPromocion(p, esc);
    return h('li', { class: ['promos__item', `promos__item--${d.estado}`] },
      h('span', { class: 'promos__clave' }, d.titulo), ` · ${d.cuando} `,
      h('span', { class: 'promos__estado' }, ETIQUETA_ESTADO_PROMO[d.estado]));
  });
  const sinPromos = promos.length === 0 ? [h('li', { class: 'promos__item promos__item--sereno' }, 'Esta semana, precio justo y sin rebajas.')] : [];
  reemplazar(ui.promos, envio, promos, sinPromos);
  const anuncios = anunciosUnicos(esc.anuncios);
  ui.anunciosBloque.hidden = anuncios.length === 0;
  // Mensajes generados por agentes: texto NO confiable, sólo como nodo de texto.
  reemplazar(ui.anuncios, anuncios.map((a) => h('li', { class: 'anuncios__item' }, h('q', null, a.mensaje))));
}

function pintarBoletin() {
  const esc = escaparate();
  if (!esc) {
    reemplazar(ui.boletin, h('div', null, h('dt', null, 'Edición'), h('dd', null, 'Antes de la primera ronda')));
    return;
  }
  const pocas = esc.productos.filter((p) => p.disponibilidad === 'pocas').length;
  const agotadas = esc.productos.filter((p) => p.disponibilidad === 'agotado').length;
  const vigentes = esc.promociones.filter((p) => p.dias.includes(Math.max(1, esc.dia))).length;
  const notaInventario = [pocas ? `${pocas} con pocas piezas` : '', agotadas ? `${agotadas} agotadas` : ''].filter(Boolean).join(' · ');
  reemplazar(ui.boletin,
    h('div', null, h('dt', null, 'Edición'), h('dd', null, `Ronda ${esc.ronda}, día ${esc.dia}`)),
    h('div', null, h('dt', null, 'Fecha simulada'), h('dd', null, fechaLegible(estado.tienda.fechaSimulada) || '—')),
    h('div', null, h('dt', null, 'Colección'), h('dd', null, piezas(esc.productos.length), notaInventario ? h('span', { class: 'portada__matiz' }, notaInventario) : null)),
    h('div', null, h('dt', null, 'Promociones'), h('dd', null, vigentes ? `${vigentes} vigentes hoy` : 'Ninguna hoy')));
}

/* ───────────── Catálogo ───────────── */

function pintarFiltros() {
  const categorias = categoriasPresentes(estado.tienda);
  if (estado.filtro !== 'todo' && !categorias.includes(estado.filtro)) fijar({ filtro: 'todo' });
  conservarFoco(ui.filtros, () => reemplazar(ui.filtros, ['todo', ...categorias].map((c) =>
    h('button', {
      type: 'button', class: 'filtro', 'aria-pressed': String(c === estado.filtro), dataset: { foco: `filtro:${c}` },
      onclick: () => {
        fijar({ filtro: c });
        pintarFiltros();
        pintarCatalogo();
      },
    }, c === 'todo' ? 'Todo' : nombreCategoria(c)))));
}

function tarjeta(p, numero) {
  const agotado = p.disponibilidad === 'agotado';
  const idTitulo = `pieza-${p.sku}`;
  return h('li', { class: ['pieza', agotado && 'pieza--agotada'] },
    h('article', { class: 'pieza__ficha', 'aria-labelledby': idTitulo },
      h('div', { class: 'pieza__visual', onclick: () => abrirDetalle(p.sku, $(idTitulo)) },
        visual(p),
        p.descuentoPct > 0 ? h('span', { class: 'pieza__descuento' }, `−${p.descuentoPct}%`) : null,
        h('span', { class: 'pieza__numero', 'aria-hidden': 'true' }, `Nº ${String(numero).padStart(2, '0')}`)),
      h('p', { class: 'pieza__categoria' }, nombreCategoria(p.categoria)),
      h('h3', { class: 'pieza__nombre' },
        h('button', { type: 'button', class: 'pieza__abrir', id: idTitulo, 'aria-haspopup': 'dialog', dataset: { foco: `ver:${p.sku}` }, onclick: (e) => abrirDetalle(p.sku, e.currentTarget) }, p.nombre)),
      precio(p),
      h('div', { class: 'pieza__meta' }, disponibilidad(p.disponibilidad), ficha(p.calidadFicha)),
      h('button', { type: 'button', class: 'boton boton--linea boton--ancho pieza__anadir', disabled: agotado, dataset: { foco: `anadir:${p.sku}` }, onclick: () => anadir(p.sku, 1) },
        agotado ? 'Agotado' : 'Añadir a la bolsa', h('span', { class: 'sr-only' }, `: ${p.nombre}`))));
}

function pintarCatalogo() {
  const esc = escaparate();
  if (!esc) {
    ui.catalogo.hidden = true;
    ui.herramientas.hidden = true;
    ui.catalogoEstado.hidden = false;
    ui.cuenta.textContent = '';
    if (!estado.tienda) {
      reemplazar(ui.catalogoEstado, h('p', { class: 'estado-catalogo__texto' },
        estado.error ? `No pudimos conectar con la tienda: ${mensajeError(estado.error)}` : 'Cargando la colección…'));
      return;
    }
    reemplazar(ui.catalogoEstado,
      h('p', { class: 'sobretitulo' }, 'Próxima apertura'),
      h('h3', { class: 'estado-catalogo__titulo' }, 'La tienda abre cuando inicie la primera ronda'),
      h('p', { class: 'estado-catalogo__texto' }, 'La colección se está preparando. Esta página se actualiza sola cada pocos segundos; no hace falta recargarla.'));
    return;
  }
  ui.catalogoEstado.hidden = true;
  ui.herramientas.hidden = false;
  ui.catalogo.hidden = false;
  const numeros = new Map(esc.productos.map((p, i) => [p.sku, i + 1]));
  const lista = filtrarYOrdenar(esc.productos, { categoria: estado.filtro, orden: estado.orden });
  conservarFoco(ui.catalogo, () => reemplazar(ui.catalogo, lista.map((p) => tarjeta(p, numeros.get(p.sku)))));
  const cuenta = `${piezas(lista.length)}${estado.filtro === 'todo' ? '' : ` en ${nombreCategoria(estado.filtro).toLowerCase()}`}`;
  if (ui.cuenta.textContent !== cuenta) ui.cuenta.textContent = cuenta;
}

/* ───────────── Detalle ───────────── */

function abrirDetalle(sku, origen) {
  fijar({ detalleSku: sku, cantidadDetalle: 1 });
  pintarDetalle();
  modalDetalle.abrir(origen);
}

function pintarDetalle() {
  const p = producto(estado.detalleSku);
  if (!p) {
    reemplazar(ui.detalleContenido,
      h('h2', { class: 'detalle__titulo', id: 'detalle-titulo' }, 'Artículo no disponible'),
      h('p', null, 'Este artículo ya no forma parte de la colección de esta semana.'));
    return;
  }
  const agotado = p.disponibilidad === 'agotado';
  const selector = h('select', { class: 'campo__control campo__control--select', id: 'detalle-cantidad', disabled: agotado, dataset: { foco: 'detalle-cantidad' } },
    Array.from({ length: MAX_CANTIDAD }, (_, i) => h('option', { value: i + 1, selected: i + 1 === estado.cantidadDetalle }, String(i + 1))));
  selector.addEventListener('change', () => fijar({ cantidadDetalle: Number(selector.value) }));
  reemplazar(ui.detalleContenido,
    h('div', { class: 'detalle__visual' }, visual(p), p.descuentoPct > 0 ? h('span', { class: 'pieza__descuento' }, `−${p.descuentoPct}%`) : null),
    h('div', { class: 'detalle__info' },
      h('p', { class: 'sobretitulo' }, `${nombreCategoria(p.categoria)} · ${p.sku}`),
      h('h2', { class: 'detalle__titulo', id: 'detalle-titulo' }, p.nombre),
      precio(p, 'precio--grande'),
      disponibilidad(p.disponibilidad),
      h('p', { class: 'detalle__descripcion' }, descripcionCategoria(p.categoria)),
      h('div', { class: 'detalle__ficha' }, ficha(p.calidadFicha),
        h('p', { class: 'ayuda' }, 'Indica qué tan completa y cuidada está la ficha de este producto dentro de la simulación.')),
      h('div', { class: 'detalle__compra' },
        h('div', { class: 'campo campo--cantidad' }, h('label', { class: 'campo__etiqueta', for: 'detalle-cantidad' }, 'Cantidad'), selector),
        h('button', { type: 'button', class: 'boton boton--primario', disabled: agotado, dataset: { foco: 'detalle-anadir' }, onclick: () => anadirDesdeDetalle(p.sku) },
          agotado ? 'Agotado' : 'Añadir a la bolsa')),
      h('p', { class: 'detalle__nota' }, 'Artículo sintético: existe sólo dentro de la simulación.')));
}

function anadirDesdeDetalle(sku) {
  if (!anadir(sku, estado.cantidadDetalle)) return;
  const tarjetaBoton = $(`pieza-${sku}`);
  modalDetalle.cerrar(tarjetaBoton);
  abrirBolsa(tarjetaBoton);
}

/* ───────────── Bolsa ───────────── */

function anadir(sku, cantidad) {
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
  const m = `${p.nombre} en tu bolsa: ${piezas(r.cantidad)}.${r.recortado ? ` Máximo ${MAX_CANTIDAD} por artículo.` : ''}`;
  anunciar(m);
  mostrarAviso(m);
  ui.abrirBolsa.classList.remove('boton-bolsa--pulso');
  void ui.abrirBolsa.offsetWidth; // reinicia la animación
  ui.abrirBolsa.classList.add('boton-bolsa--pulso');
  return true;
}

function abrirBolsa(origen) {
  pintarBolsa();
  modalBolsa.abrir(origen);
  ui.bolsaTitulo.focus();
}

function cambiarCantidad(sku, cantidad) {
  const p = producto(sku);
  const r = carrito.fijar(sku, cantidad);
  anunciar(r.ok ? `Cantidad de ${p?.nombre ?? sku}: ${r.cantidad}.` : motivoCarrito(r.motivo));
}

function quitar(sku) {
  const nombre = producto(sku)?.nombre ?? sku;
  carrito.quitar(sku);
  anunciar(`${nombre} se quitó de la bolsa.`);
  if (!ui.bolsa.contains(document.activeElement) || document.activeElement === document.body) ui.bolsaTitulo.focus();
}

function lineaBolsa(d) {
  const nombre = d.producto?.nombre ?? d.sku;
  const problema = d.problema === 'agotado' ? 'Agotado: quítalo para continuar.' : d.problema === 'no_listado' ? 'Ya no está a la venta: quítalo para continuar.' : null;
  return h('li', { class: ['linea', problema && 'linea--problema'] },
    h('div', { class: 'linea__visual' }, d.producto ? visual(d.producto) : null),
    h('div', { class: 'linea__info' },
      h('p', { class: 'linea__nombre' }, nombre),
      h('p', { class: 'linea__unitario' }, d.producto ? `${dinero(d.producto.precioFinal)} c/u` : '—'),
      problema ? h('p', { class: 'linea__problema' }, problema) : null,
      h('div', { class: 'linea__controles' },
        h('div', { class: 'cantidad', role: 'group', 'aria-label': `Cantidad de ${nombre}` },
          h('button', { type: 'button', class: 'cantidad__boton', 'aria-label': `Quitar una pieza de ${nombre}`, 'aria-disabled': String(d.cantidad <= MIN_CANTIDAD), dataset: { foco: `menos:${d.sku}` }, onclick: () => cambiarCantidad(d.sku, d.cantidad - 1) }, '−'),
          h('span', { class: 'cantidad__valor tabular' }, String(d.cantidad)),
          h('button', { type: 'button', class: 'cantidad__boton', 'aria-label': `Agregar una pieza de ${nombre}`, 'aria-disabled': String(d.cantidad >= MAX_CANTIDAD), dataset: { foco: `mas:${d.sku}` }, onclick: () => cambiarCantidad(d.sku, d.cantidad + 1) }, '+')),
        h('button', { type: 'button', class: 'linea__quitar', dataset: { foco: `quitar:${d.sku}` }, onclick: () => quitar(d.sku) }, 'Quitar', h('span', { class: 'sr-only' }, ` ${nombre}`)))),
    h('p', { class: 'linea__importe tabular' }, d.producto ? dinero(d.neto) : '—'));
}

function bloqueTotales(est) {
  return [
    h('dl', { class: 'totales' },
      fila('Subtotal a precio de lista', dinero(est.bruto)),
      est.descuento > 0 ? fila('Descuentos', `−${dinero(est.descuento)}`) : null,
      fila('Envío', est.envio === 0 ? 'Sin costo' : dinero(est.envio)),
      fila('Total estimado', dinero(est.total), 'totales__fila--total')),
    est.promoMultiple ? h('p', { class: 'ayuda' }, `Incluye ${est.promoMultiple.pct}% extra por compra múltiple.`) : null,
    est.proximaMultiple ? h('p', { class: 'ayuda ayuda--acento' }, `Agrega ${piezas(est.proximaMultiple.faltan)} más y obtén ${est.proximaMultiple.promo.pct}% extra.`) : null,
  ];
}

function bloqueEnvio(est) {
  if (est.gratisDesde <= 0) return h('p', { class: 'envio-meta' }, 'Envío sin costo en todos los pedidos.');
  const pct = Math.round(est.avanceEnvioGratis * 100);
  return h('div', { class: 'envio-meta' },
    h('p', { class: 'envio-meta__texto', id: 'envio-meta-texto' },
      est.faltaEnvioGratis > 0 ? `Te faltan ${dinero(est.faltaEnvioGratis)} para el envío sin costo.` : 'Tu pedido ya tiene envío sin costo.'),
    h('progress', { class: 'envio-meta__barra', max: 100, value: pct, 'aria-labelledby': 'envio-meta-texto' }, `${pct}%`));
}

function pintarCuentaBolsa() {
  ui.bolsaCuenta.textContent = String(carrito.unidades());
}

function pintarBolsa() {
  pintarCuentaBolsa();
  const lineas = carrito.lineas();
  if (lineas.length === 0) {
    reemplazar(ui.bolsaCuerpo, h('div', { class: 'bolsa-vacia' },
      h('p', { class: 'bolsa-vacia__titulo' }, 'Tu bolsa está vacía.'),
      h('p', { class: 'ayuda' }, 'Elige una pieza de la colección para comenzar.'),
      h('button', { type: 'button', class: 'boton boton--linea', onclick: () => modalBolsa.cerrar($('coleccion')) }, 'Explorar la colección')));
    ui.bolsaPie.hidden = true;
    return;
  }
  const esc = escaparate();
  const est = estimarCarrito(lineas, esc);
  conservarFoco(ui.bolsaCuerpo, () => reemplazar(ui.bolsaCuerpo, h('ul', { class: 'lineas', 'aria-label': 'Artículos en tu bolsa' }, est.detalle.map(lineaBolsa))));
  const bloqueo = !esc ? 'La tienda aún no abre: podrás confirmar cuando inicie la primera ronda.' : est.hayProblemas ? 'Quita los artículos agotados o no disponibles para continuar.' : null;
  ui.bolsaPie.hidden = false;
  conservarFoco(ui.bolsaPie, () => reemplazar(ui.bolsaPie,
    h('p', { class: 'sobretitulo' }, 'Montos estimados'),
    bloqueTotales(est),
    bloqueEnvio(est),
    h('p', { class: 'ayuda' }, 'El total definitivo lo calcula la tienda al confirmar el pedido simulado.'),
    carrito.persistente() ? null : h('p', { class: 'ayuda' }, 'Tu navegador no permite guardar la bolsa: se perderá al recargar la página.'),
    bloqueo ? h('p', { class: 'linea__problema' }, bloqueo) : null,
    h('button', { type: 'button', class: 'boton boton--primario boton--ancho', disabled: Boolean(bloqueo), dataset: { foco: 'ir-checkout' }, onclick: abrirCheckout }, 'Continuar al pedido simulado')));
}

/* ───────────── Checkout simulado ───────────── */

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
    h('ul', { class: 'resumen-lineas' }, est.detalle.map((d) => h('li', null,
      h('span', null, `${d.producto?.nombre ?? d.sku} × ${d.cantidad}`),
      h('span', { class: 'tabular' }, d.producto ? dinero(d.neto) : '—')))),
    bloqueTotales(est));
}

function abrirCheckout() {
  if (carrito.lineas().length === 0) return;
  ui.checkoutDatos.hidden = false;
  ui.checkoutConfirmacion.hidden = true;
  ui.checkout.setAttribute('aria-labelledby', 'checkout-titulo');
  errorCheckout(null);
  errorCampo(ui.alias, ui.aliasError, null);
  errorCampo(ui.ciudad, ui.ciudadError, null);
  pintarResumenCheckout();
  modalBolsa.cerrar(ui.abrirBolsa);
  modalCheckout.abrir(ui.abrirBolsa);
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
    errorCheckout('Tu bolsa tiene artículos agotados o no disponibles. Quítalos antes de confirmar.');
    ui.checkoutError.focus();
    return;
  }
  fijar({ enviando: true });
  ui.checkoutEnviar.disabled = true;
  ui.checkoutEnviar.textContent = 'Registrando pedido…';
  ui.formCheckout.setAttribute('aria-busy', 'true');
  try {
    const respuesta = await enviarCheckout(lineas, v.cliente);
    carrito.vaciar();
    recordarPedidoDemo(EMPRESA, respuesta.pedido.id);
    pintarMisDemos();
    pintarConfirmacion(respuesta);
    anunciar(`Pedido ${respuesta.pedido.id} registrado. Total ${dinero(respuesta.pedido.total)}.`);
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

function tablaLineas(lineas, titulo) {
  return h('table', { class: 'tabla' },
    h('caption', { class: 'sr-only' }, titulo),
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Artículo'), h('th', { scope: 'col' }, 'Piezas'), h('th', { scope: 'col' }, 'Importe'))),
    h('tbody', null, lineas.map((l) => h('tr', null,
      h('td', null, String(l.nombre ?? l.sku ?? '')),
      h('td', { class: 'tabular' }, String(l.unidades ?? '')),
      h('td', { class: 'tabular' }, dinero(l.neto))))));
}

function pintarConfirmacion({ pedido, aviso }) {
  const lineas = Array.isArray(pedido.lineas) ? pedido.lineas : [];
  ui.checkoutDatos.hidden = true;
  ui.checkoutConfirmacion.hidden = false;
  ui.checkout.setAttribute('aria-labelledby', 'confirmacion-titulo');
  reemplazar(ui.checkoutConfirmacion,
    h('p', { class: 'sobretitulo' }, 'Pedido simulado registrado'),
    h('h2', { class: 'checkout__titulo', id: 'confirmacion-titulo', tabindex: '-1' }, 'Gracias. Tu pedido quedó registrado.'),
    h('p', { class: 'confirmacion__id' }, 'Número de pedido ', h('strong', { class: 'tabular' }, pedido.id)),
    h('p', { class: 'ayuda' }, `A nombre de ${pedido.cliente?.alias ?? '—'} · ${pedido.cliente?.ciudad ?? '—'} · ronda ${pedido.ronda}, día ${pedido.dia}`),
    tablaLineas(lineas, 'Artículos del pedido'),
    h('dl', { class: 'totales' },
      fila('Precio de lista', dinero(pedido.subtotal + pedido.descuento)),
      pedido.descuento > 0 ? fila('Descuentos', `−${dinero(pedido.descuento)}`) : null,
      fila('Subtotal', dinero(pedido.subtotal)),
      fila('Envío', pedido.envio === 0 ? 'Sin costo' : dinero(pedido.envio)),
      fila('Total', dinero(pedido.total), 'totales__fila--total')),
    h('p', { class: 'aviso-servidor', role: 'note' }, aviso),
    h('div', { class: 'confirmacion__acciones' },
      h('button', { type: 'button', class: 'boton boton--primario', onclick: () => seguirPedido(pedido.id) }, 'Seguir este pedido'),
      h('button', { type: 'button', class: 'boton boton--linea', onclick: () => modalCheckout.cerrar($('coleccion')) }, 'Volver a la colección')));
  $('confirmacion-titulo').focus();
}

function seguirPedido(id) {
  ui.pedidoId.value = id;
  modalCheckout.cerrar(ui.pedidoId);
  $('seguimiento').scrollIntoView({ block: 'start' });
  consultarSeguimiento(id, { enfocar: true });
}

/* ───────────── Seguimiento ───────────── */

function errorSeguimiento(mensaje) {
  errorCampo(ui.pedidoId, ui.pedidoError, mensaje);
}

function etapa(e) {
  const detalle = [e.alcanzado ? 'Completada' : 'Pendiente', e.fecha ? `${fechaLegible(e.fecha)} (fecha simulada)` : null].filter(Boolean).join(' · ');
  return h('li', { class: ['etapa', e.alcanzado ? 'etapa--hecha' : 'etapa--pendiente'] },
    h('span', { class: 'etapa__marca', 'aria-hidden': 'true' }, e.alcanzado ? '✓' : ''),
    h('div', null,
      h('p', { class: 'etapa__estado' }, e.estado),
      h('p', { class: 'etapa__detalle' }, detalle,
        e.hash ? [' · hash ', h('code', { title: e.hash }, hashCorto(e.hash))] : null)));
}

function pintarSeguimiento(d) {
  const pedido = d.pedido && typeof d.pedido === 'object' ? d.pedido : {};
  const lineas = Array.isArray(pedido.lineas) ? pedido.lineas : [];
  const hechas = d.etapas.filter((e) => e.alcanzado).length;
  const esDemo = d.tipo === 'demo';
  reemplazar(ui.resultado,
    h('div', { class: 'resultado__cabeza' },
      h('p', { class: 'sobretitulo' }, esDemo ? 'Pedido de demostración' : 'Pedido sintético de la simulación'),
      h('h3', { class: 'resultado__titulo', id: 'resultado-titulo', tabindex: '-1' }, d.id),
      h('p', { class: 'ayuda' }, `${hechas} de ${d.etapas.length} etapas completadas`,
        !esDemo && pedido.clienteId ? ` · cliente simulado ${pedido.clienteId}` : '',
        esDemo && pedido.cliente ? ` · ${pedido.cliente.alias}, ${pedido.cliente.ciudad}` : '')),
    h('ol', { class: 'linea-tiempo', 'aria-label': `Etapas del pedido ${d.id}` }, d.etapas.map(etapa)),
    lineas.length ? tablaLineas(lineas, `Artículos del pedido ${d.id}`) : null,
    h('p', { class: 'resultado__total' }, 'Total ', h('strong', { class: 'tabular' }, dinero(pedido.total)),
      typeof pedido.envio === 'number' ? ` · envío ${pedido.envio === 0 ? 'sin costo' : dinero(pedido.envio)}` : ''),
    esDemo ? h('p', { class: 'ayuda' }, 'Las etapas de demostración avanzan con el reloj real: preparación al minuto, envío a los 3 y entrega a los 6 minutos.') : null,
    esDemo && d.aviso ? h('p', { class: 'aviso-servidor' }, d.aviso) : null);
}

async function consultarSeguimiento(texto, { enfocar = false, silencioso = false } = {}) {
  const id = normalizarIdPedido(texto);
  if (!silencioso) errorSeguimiento(null);
  if (!idPedidoValido(id)) {
    errorSeguimiento('Escribe un número de pedido como DEMO-ALFA-0001 o ALFA-000123.');
    ui.pedidoId.focus();
    return;
  }
  if (!silencioso) reemplazar(ui.resultado, h('p', { class: 'ayuda' }, `Consultando ${id}…`));
  try {
    const datos = await consultarPedido(id);
    const anterior = estado.seguido;
    fijar({ seguido: datos });
    pintarSeguimiento(datos);
    const hechas = datos.etapas.filter((e) => e.alcanzado).length;
    const avanzo = silencioso && anterior?.id === datos.id && hechas > anterior.etapas.filter((e) => e.alcanzado).length;
    if (!silencioso || avanzo) anunciar(`Pedido ${datos.id}: ${hechas} de ${datos.etapas.length} etapas completadas.`);
    if (enfocar) $('resultado-titulo')?.focus();
  } catch (error) {
    if (silencioso) {
      ui.resultado.append(h('p', { class: 'linea__problema' }, `No se pudo actualizar el seguimiento: ${mensajeError(error)}`));
      return;
    }
    fijar({ seguido: null });
    reemplazar(ui.resultado);
    errorSeguimiento(mensajeError(error));
    ui.pedidoId.focus();
  }
}

function pintarMisDemos() {
  const ids = pedidosDemoRecordados(EMPRESA);
  ui.misDemos.hidden = ids.length === 0;
  reemplazar(ui.misDemosLista, ids.map((id) => h('li', null,
    h('button', { type: 'button', class: 'etiqueta-pedido', onclick: () => { ui.pedidoId.value = id; consultarSeguimiento(id, { enfocar: true }); } }, id))));
}

function pintarPedidos(lista) {
  if (lista.length === 0) {
    reemplazar(ui.recientes, h('li', { class: 'vacio' }, 'Aún no hay pedidos sintéticos.'));
    return;
  }
  conservarFoco(ui.recientes, () => reemplazar(ui.recientes, lista.map((p) => h('li', null,
    h('button', {
      type: 'button', class: 'pedido-reciente', dataset: { foco: `pedido:${p.id}` },
      onclick: () => { ui.pedidoId.value = p.id; consultarSeguimiento(p.id, { enfocar: true }); },
    },
    h('span', { class: 'pedido-reciente__id tabular' }, p.id),
    h('span', { class: 'pedido-reciente__total tabular' }, dinero(p.total)),
    h('span', { class: 'pedido-reciente__meta' }, `${fechaLegible(p.fecha)} · ${piezas(p.unidades)}`),
    h('span', { class: 'pedido-reciente__estado' }, ETIQUETA_ESTADO_PEDIDO[p.estado] ?? p.estado))))));
}

/* ───────────── Registro verificable ───────────── */

function pintarEventos(lista) {
  const verificados = lista.filter((e) => e.verificado).length;
  ui.registroResumen.textContent = lista.length
    ? `${verificados} de ${lista.length} eventos recientes verificados${verificados === lista.length ? '' : ' — hay registros que no coinciden'}.`
    : 'Aún no hay eventos registrados.';
  reemplazar(ui.eventos, lista.map((e) => h('li', { class: ['evento', !e.verificado && 'evento--fallido'] },
    h('p', { class: 'evento__sello' }, e.verificado ? '✓ Verificado' : '✗ No verificado'),
    h('div', { class: 'evento__cuerpo' },
      h('p', { class: 'evento__codigo' }, h('code', null, e.codigo), ETIQUETA_EVENTO[e.codigo] ? ` · ${ETIQUETA_EVENTO[e.codigo]}` : ''),
      h('p', { class: 'evento__resumen' }, e.resumen)),
    h('p', { class: 'evento__meta' },
      `#${e.seq} · ronda ${e.ronda}, día ${e.dia} · ${fechaLegible(e.fecha)} · `,
      h('code', { title: e.hash }, hashCorto(e.hash))))));
}

async function refrescarRegistro() {
  const [eventos, pedidos] = await Promise.allSettled([obtenerEventos(LIMITE_EVENTOS), obtenerPedidos(LIMITE_PEDIDOS)]);
  if (eventos.status === 'fulfilled') pintarEventos(eventos.value);
  else ui.registroResumen.textContent = `No se pudo cargar el registro: ${mensajeError(eventos.reason)}`;
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
      pintarPromos();
      pintarBoletin();
      pintarFiltros();
      pintarCatalogo();
      pintarBolsa();
      if (modalDetalle.abierto) conservarFoco(ui.detalleContenido, pintarDetalle);
      if (modalCheckout.abierto && !ui.checkoutDatos.hidden) pintarResumenCheckout();
    }
    if (cambio || ciclo % CICLOS_REGISTRO === 0) await refrescarRegistro();
  } catch (error) {
    fijar({ error, ciclo });
    pintarEstadoSimulacion();
    if (!estado.tienda) pintarCatalogo();
  }
  const seguido = estado.seguido;
  if (ciclo % CICLOS_SEGUIMIENTO === 0 && seguido?.tipo === 'demo' && seguido.etapas.some((e) => !e.alcanzado)) {
    await consultarSeguimiento(seguido.id, { silencioso: true });
  }
}

/* ───────────── Arranque ───────────── */

function enlazarEventos() {
  for (const [dialogo, modal] of modales) {
    for (const boton of dialogo.querySelectorAll('[data-cerrar]')) boton.addEventListener('click', () => modal.cerrar());
  }
  ui.abrirBolsa.addEventListener('click', (e) => abrirBolsa(e.currentTarget));
  reemplazar(ui.orden, ORDENES.map((o) => h('option', { value: o.id }, o.etiqueta)));
  ui.orden.addEventListener('change', () => {
    fijar({ orden: ui.orden.value });
    pintarCatalogo();
  });
  ui.formCheckout.addEventListener('submit', enviarPedido);
  ui.alias.addEventListener('input', () => {
    if (ui.alias.hasAttribute('aria-invalid')) errorCampo(ui.alias, ui.aliasError, null);
  });
  ui.ciudad.addEventListener('change', () => errorCampo(ui.ciudad, ui.ciudadError, null));
  ui.formSeguimiento.addEventListener('submit', (e) => {
    e.preventDefault();
    consultarSeguimiento(ui.pedidoId.value, { enfocar: true });
  });
  ui.registroActualizar.addEventListener('click', async () => {
    ui.registroActualizar.disabled = true;
    await refrescarRegistro();
    ui.registroActualizar.disabled = false;
    anunciar(ui.registroResumen.textContent);
  });
  carrito.suscribir(() => {
    pintarBolsa();
    if (modalCheckout.abierto && !ui.checkoutDatos.hidden) pintarResumenCheckout();
  });
}

enlazarEventos();
pintarBolsa();
pintarMisDemos();
const sondeo = iniciarSondeo(refrescar, {
  alError: (error) => {
    fijar({ error });
    pintarEstadoSimulacion();
  },
});
