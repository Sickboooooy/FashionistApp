import { alLimite, enviar, obtener } from './modulos/api.js';
import { conectarFlujo } from './modulos/flujo.js';
import { CODIGOS_WAR_ROOM, cargarCalendario, codigoDeTipo, el, entero, fechaLegible, hashCorto, insignia, mensajeError, resultadoTexto } from './modulos/util.js';
import { crearVistaControl } from './vistas/control.js';
import { crearVistaEnVivo, entradaTeletipo } from './vistas/en-vivo.js';
import { crearVistaEscaparates } from './vistas/escaparates.js';
import { crearVistaEstrategias } from './vistas/estrategias.js';
import { crearVistaReproduccion } from './vistas/reproduccion.js';
import { crearVistaSupervision } from './vistas/supervision.js';
import { crearVistaTribunal } from './vistas/tribunal.js';

/*
 * War Room / Tribunal en vivo — orquestación del cliente.
 * 1. Sesión: token del fragmento #acceso=… → POST /api/acceso → se borra el fragmento.
 * 2. Carga inicial + relleno del teletipo y de la caja intradía con /api/eventos.
 * 3. SSE /api/stream; ante cada lote se pide la instantánea (o la vista pública)
 *    con ≤ 400 ms de retardo y nunca más de una petición en vuelo por recurso.
 */

const CLAVE_PESTANA = 'ew-war-room:pestana';
const MAX_TELETIPO = 100;
const LIMITE_PAGINA = 2000;
const RETARDO_VIVO_MS = 400;
const INTERVALO_MIN_VIVO_MS = 1000;
const RETARDO_CIERRE_MS = 1200;
const MAX_INCIDENTES = 200;
const SONDEO_ESTADO_MS = 15_000;
const REINTENTO_ARRANQUE_MS = 4000;
const REINTENTO_ARRANQUE_MAX_MS = 60_000;
const ESPERA_REINICIO_MS = 60_000;
const DURACION_AVISO_MS = 9000;
const CODIGOS = new Set(CODIGOS_WAR_ROOM);

const PESTANAS = [
  { id: 'envivo', privada: false, crear: crearVistaEnVivo },
  { id: 'escaparates', privada: false, crear: crearVistaEscaparates, necesitaPublico: true },
  { id: 'estrategias', privada: true, crear: crearVistaEstrategias },
  { id: 'tribunal', privada: false, crear: crearVistaTribunal },
  { id: 'control', privada: true, crear: crearVistaControl },
  { id: 'reproducir', privada: true, crear: crearVistaReproduccion },
  { id: 'supervision', privada: true, crear: crearVistaSupervision },
];

const estadoVacio = () => ({
  sesion: null,
  privilegiado: false,
  config: null,
  control: null,
  inst: null,
  publico: null,
  rondas: [],
  integridad: null,
  pruebas: null,
  corridas: [],
  ticker: [],
  cajas: [],
  incidentesMercado: [],
  ultimoSeq: -1,
  conexion: 'desconectado',
});

let estado = estadoVacio();
let cajasPorDia = new Map();
let flujo = null;
let generacion = 0;
let activa = 'envivo';
let conexionPerdida = false;
let intentosArranque = 0;
const errores = new Map();

const $ = (id) => document.getElementById(id);
const dom = {
  conexion: $('estado-conexion'),
  seq: $('estado-seq'),
  ronda: $('estado-ronda'),
  fecha: $('estado-fecha'),
  reloj: $('estado-reloj'),
  integridad: $('estado-integridad'),
  corrida: $('estado-corrida'),
  aviso: $('aviso-vista'),
  sesionInsignia: $('sesion-insignia'),
  formAcceso: $('form-acceso'),
  tokenAcceso: $('token-acceso'),
  errorAcceso: $('error-acceso'),
  detallesAcceso: $('acceso-detalles'),
  salir: $('boton-salir'),
  avisos: $('avisos'),
  urgente: $('anuncio-urgente'),
  errorGlobal: $('error-global'),
  tabs: [...document.querySelectorAll('[role="tab"]')],
};

// --- Avisos accesibles ---------------------------------------------------------------

function anunciar(texto, { urgente = false } = {}) {
  if (urgente) {
    // Región asertiva: se vacía y se rellena en la siguiente tarea para que se vuelva a leer.
    dom.urgente.textContent = '';
    setTimeout(() => {
      dom.urgente.textContent = texto;
    }, 50);
  }
  // El aviso visual de un mensaje urgente no se repite en la región cortés.
  const aviso = el('div', { clase: `aviso ${urgente ? 'aviso-urgente' : ''}`, 'aria-hidden': urgente ? 'true' : undefined }, [el('span', { texto }), el('button', { type: 'button', clase: 'aviso-cerrar', 'aria-label': 'Cerrar aviso', texto: '×', onclick: (ev) => ev.currentTarget.parentElement.remove() })]);
  dom.avisos.append(aviso);
  setTimeout(() => aviso.remove(), DURACION_AVISO_MS);
}

function avisarError(origen, error) {
  errores.set(origen, `No se pudo actualizar ${origen}: ${mensajeError(error)}. Se conserva la última vista.`);
  pintarErrores();
}

function limpiarError(origen) {
  if (errores.delete(origen)) pintarErrores();
}

function pintarErrores() {
  dom.errorGlobal.hidden = errores.size === 0;
  dom.errorGlobal.replaceChildren(...[...errores.values()].map((t) => el('p', {}, insignia('error', t))));
}

let temporizadorLimite = null;
alLimite((ms) => {
  errores.set('límite', `Peticiones en pausa ${Math.ceil(ms / 1000)} s para respetar el límite del servidor.`);
  pintarErrores();
  clearTimeout(temporizadorLimite);
  temporizadorLimite = setTimeout(() => limpiarError('límite'), ms);
});

// --- Programador de refrescos ------------------------------------------------------------

/**
 * Cada recurso se pide como mucho una vez en vuelo: el primer evento tras un periodo
 * tranquilo se refleja en `retardo` ms (≤ 500); con eventos continuos las peticiones se
 * espacian al menos `intervaloMinimo` ms para respetar el límite de tasa del servidor.
 */
function crearProgramador(tareas) {
  const estadoTareas = new Map();
  const espera = (nombre, t) => Math.max(tareas[nombre].retardo, (tareas[nombre].intervaloMinimo ?? 0) - (Date.now() - t.ultimoInicio));
  async function ejecutar(nombre) {
    const t = estadoTareas.get(nombre);
    t.temporizador = null;
    t.pendiente = false;
    t.enCurso = true;
    t.ultimoInicio = Date.now();
    const gen = generacion;
    try {
      await tareas[nombre].fn(gen);
      if (gen === generacion) limpiarError(tareas[nombre].etiqueta);
    } catch (error) {
      if (gen === generacion) manejarErrorTarea(tareas[nombre].etiqueta, error);
    } finally {
      t.enCurso = false;
      if (t.pendiente) t.temporizador = setTimeout(() => ejecutar(nombre), espera(nombre, t));
    }
  }
  return {
    pedir(nombre) {
      let t = estadoTareas.get(nombre);
      if (!t) {
        t = { pendiente: false, enCurso: false, temporizador: null, ultimoInicio: 0 };
        estadoTareas.set(nombre, t);
      }
      t.pendiente = true;
      if (!t.temporizador && !t.enCurso) t.temporizador = setTimeout(() => ejecutar(nombre), espera(nombre, t));
    },
    cancelarTodo() {
      for (const t of estadoTareas.values()) {
        clearTimeout(t.temporizador);
        t.temporizador = null;
        t.pendiente = false;
      }
    },
  };
}

function manejarErrorTarea(etiqueta, error) {
  if (error?.estado === 401 && estado.privilegiado) {
    anunciar('La sesión privilegiada terminó; se muestra la vista pública.', { urgente: true });
    arrancar();
    return;
  }
  avisarError(etiqueta, error);
}

/** El servidor conserva el último estado del controlador aunque cambie la corrida: sólo vale el de la activa. */
function controlVigente(control) {
  const activa = estado.config?.corrida?.id;
  return control && (!activa || control.corrida === activa) ? control : null;
}

async function cargarVivo(gen) {
  if (estado.privilegiado) {
    const inst = await obtener('/api/instantanea');
    if (gen !== generacion) return;
    estado.inst = inst;
    if (inst.control) estado.control = controlVigente(inst.control);
  } else {
    const publico = await obtener('/api/publico');
    if (gen !== generacion) return;
    estado.publico = publico;
  }
  renderizar();
}

async function cargarPublico(gen) {
  const publico = await obtener('/api/publico');
  if (gen !== generacion) return;
  estado.publico = publico;
  renderizar();
}

async function cargarCierre(gen) {
  const [rondas, integridad, pruebas, corridas] = await Promise.all([
    obtener('/api/rondas'),
    obtener('/api/integridad'),
    obtener('/api/pruebas'),
    estado.privilegiado ? obtener('/api/corridas') : Promise.resolve([]),
  ]);
  if (gen !== generacion) return;
  estado.rondas = rondas;
  estado.integridad = integridad;
  estado.pruebas = pruebas;
  estado.corridas = corridas;
  vistas.get('supervision')?.marcarObsoleto?.();
  renderizar();
}

async function cargarEstado(gen) {
  const datos = await obtener('/api/estado');
  if (gen !== generacion) return;
  const anterior = estado.config?.corrida?.id;
  estado.config = datos;
  if (datos.control) estado.control = controlVigente(datos.control);
  if (anterior && datos.corrida && datos.corrida.id !== anterior) {
    anunciar(`El War Room ahora observa la corrida ${datos.corrida.id}.`);
    arrancar();
    return;
  }
  // Un diario append-only nunca retrocede: si el servidor reporta un seq menor, es otra corrida.
  if (estado.ultimoSeq >= 0 && Number.isInteger(datos.ultimoSeq) && datos.ultimoSeq < estado.ultimoSeq) {
    anunciar('El diario observado cambió (seq menor al recibido); se recarga la vista.');
    arrancar();
    return;
  }
  renderizar();
}

const programador = crearProgramador({
  vivo: { retardo: RETARDO_VIVO_MS, intervaloMinimo: INTERVALO_MIN_VIVO_MS, fn: cargarVivo, etiqueta: 'los indicadores en vivo' },
  publico: { retardo: RETARDO_VIVO_MS, intervaloMinimo: INTERVALO_MIN_VIVO_MS, fn: cargarPublico, etiqueta: 'los escaparates' },
  cierre: { retardo: RETARDO_CIERRE_MS, fn: cargarCierre, etiqueta: 'las rondas e integridad' },
  estado: { retardo: 0, fn: cargarEstado, etiqueta: 'el estado de la corrida' },
});

// --- Eventos ---------------------------------------------------------------------------

function registrarCaja(e) {
  const dpp = estado.config?.diasPorPeriodo ?? 7;
  if (e.tipo === 'cierre_dia' && e.datos?.cajas) {
    const diaGlobal = (e.ronda - 1) * dpp + e.dia;
    cajasPorDia.set(diaGlobal, { diaGlobal, ronda: e.ronda, dia: e.dia, alfa: e.datos.cajas.alfa, omega: e.datos.cajas.omega });
    return true;
  }
  if (e.tipo === 'capital_inicial' && e.empresa && e.ronda === 1) {
    const previo = cajasPorDia.get(0) ?? { diaGlobal: 0, ronda: 1, dia: 0, alfa: null, omega: null };
    cajasPorDia.set(0, { ...previo, [e.empresa]: e.datos?.monto ?? null });
    return true;
  }
  return false;
}

/**
 * La proyección (proyeccion.ts) sólo registra alertas de eventos con empresa; los
 * incidentes de mercado (p. ej. fallo_juez) se recogen aquí desde el flujo privilegiado.
 */
function incidenteDeMercado(e) {
  const d = e.datos ?? {};
  return { seq: e.seq, ronda: e.ronda, dia: e.dia, empresa: null, nivel: d.severidad === 'leve' ? 'advertencia' : d.severidad, codigo: d.codigo ?? 'incidente', detalle: `${d.principal ?? ''}: ${d.detalle ?? ''}` };
}

function procesarLote(lote, { silencioso = false } = {}) {
  const nuevos = [];
  const incidentes = [];
  const veredictos = [];
  let cierre = false;
  let cajas = false;
  for (const { codigo, evento } of lote) {
    if (evento.seq <= estado.ultimoSeq) continue;
    estado.ultimoSeq = evento.seq;
    if (CODIGOS.has(codigo)) nuevos.push(entradaTeletipo(codigo, evento));
    if (registrarCaja(evento)) cajas = true;
    if (evento.tipo === 'incidente' && !evento.empresa) incidentes.push(incidenteDeMercado(evento));
    if (codigo === 'ROUND_CLOSED') cierre = true;
    if (codigo === 'JUDGE_VERDICT') {
      cierre = true;
      veredictos.push(evento);
    }
  }
  if (nuevos.length > 0) estado.ticker = [...nuevos.reverse(), ...estado.ticker].slice(0, MAX_TELETIPO);
  if (cajas) estado.cajas = [...cajasPorDia.values()].sort((a, b) => a.diaGlobal - b.diaGlobal);
  if (incidentes.length > 0) estado.incidentesMercado = [...estado.incidentesMercado, ...incidentes].slice(-MAX_INCIDENTES);
  if (silencioso) return;
  for (const i of incidentes) if (i.nivel === 'critica') anunciar(`Incidente crítico en la ronda ${i.ronda}: ${i.detalle}`, { urgente: true });
  if (nuevos.length > 0 || cajas) {
    programador.pedir('vivo');
    if (estado.privilegiado && activa === 'escaparates') programador.pedir('publico');
  }
  if (cierre) programador.pedir('cierre');
  for (const v of veredictos) {
    const d = v.datos ?? {};
    anunciar(`Nueva sentencia de la ronda ${v.ronda} (${d.expediente ?? ''}): ${resultadoTexto(d.resultado, d.ganador)}.`);
  }
  pintarCabecera();
  if (activa === 'envivo') vistas.get('envivo').renderTeletipo();
}

async function rellenarEventos(gen) {
  let desde = 0;
  for (;;) {
    const lote = await obtener(`/api/eventos?desde=${desde}&limite=${LIMITE_PAGINA}`);
    if (gen !== generacion) return;
    procesarLote(
      lote.map((e) => ({ codigo: e.codigo ?? codigoDeTipo(e.tipo) ?? 'INTERNO', evento: e })),
      { silencioso: true },
    );
    if (lote.length < LIMITE_PAGINA) return;
    desde = lote.at(-1).seq + 1;
  }
}

function conectar() {
  flujo?.cerrar();
  flujo = conectarFlujo({
    desde: estado.ultimoSeq,
    ultimoSeq: () => estado.ultimoSeq,
    alLote: (lote) => procesarLote(lote),
    alControl: (control) => {
      // Tras un reinicio el servidor puede reenviar el último estado de la corrida anterior:
      // ese estado se descarta y el cambio de corrida sólo se confirma con /api/estado.
      if (estado.config?.corrida?.id && control?.corrida && control.corrida !== estado.config.corrida.id) {
        programador.pedir('estado');
        return;
      }
      if (control?.ultimoError && control.ultimoError !== estado.control?.ultimoError) anunciar(`El harness se detuvo por un error: ${control.ultimoError}`, { urgente: true });
      estado.control = control;
      pintarCabecera();
      if (activa === 'control') vistas.get('control').render();
    },
    alEstado: (conexion) => {
      const previa = estado.conexion;
      estado.conexion = conexion;
      if ((conexion === 'reconectando' || conexion === 'desconectado') && previa === 'conectado') {
        conexionPerdida = true;
        anunciar('Se perdió la conexión en vivo; reconectando…', { urgente: true });
      } else if (conexion === 'conectado' && conexionPerdida) {
        conexionPerdida = false;
        anunciar('Conexión en vivo restablecida; se recuperaron los eventos pendientes.');
        programador.pedir('vivo');
        programador.pedir('cierre');
      }
      pintarCabecera();
    },
  });
}

// --- Cabecera ----------------------------------------------------------------------------

const CONEXION = Object.freeze({
  conectado: ['ok', 'Conectado'],
  conectando: ['pendiente', 'Conectando…'],
  reconectando: ['aviso', 'Reconectando…'],
  desconectado: ['error', 'Desconectado'],
});

function textoReloj(c) {
  if (!c) return estado.sesion?.controlDisponible === false ? insignia('info', 'Sin harness: sólo observación') : insignia('pendiente', '—');
  if (c.fase === 'terminado') return insignia('info', 'Torneo terminado', c.motivoFin ?? undefined);
  if (c.ultimoError) return insignia('error', 'Error del harness (en pausa)', c.ultimoError);
  if (c.ocupado) return insignia('aviso', 'Procesando');
  if (c.pausado) return insignia('pendiente', 'En pausa');
  return insignia('ok', `Corriendo · ${entero(c.msPorDia)} ms/día`);
}

function pintarCabecera() {
  const fuente = estado.privilegiado ? estado.inst : estado.publico;
  const dpp = estado.config?.diasPorPeriodo ?? 7;
  dom.conexion.replaceChildren(insignia(...(CONEXION[estado.conexion] ?? CONEXION.desconectado)));
  dom.seq.textContent = estado.ultimoSeq >= 0 ? `#${estado.ultimoSeq}` : '—';
  dom.ronda.textContent = fuente ? (fuente.ronda > 0 ? `R${fuente.ronda} · día ${fuente.dia}/${dpp}` : 'Sin iniciar') : '—';
  dom.fecha.textContent = fuente ? fechaLegible(fuente.fechaSimulada) : '—';
  const c = estado.control;
  dom.reloj.closest('.estado-item').hidden = !estado.privilegiado;
  dom.reloj.replaceChildren(textoReloj(c));
  const integ = fuente?.integridadDiario;
  dom.integridad.replaceChildren(integ ? (integ.ok ? insignia('ok', `Íntegra · ${hashCorto(integ.ultimoHash, 8)}`) : insignia('error', 'Cadena con errores')) : insignia('pendiente', '—'));
  const corrida = estado.config?.corrida;
  dom.corrida.textContent = corrida ? `${corrida.id} · ${corrida.modo} · semilla ${corrida.semilla}` : 'Sin corrida activa';
}

function aplicarModo() {
  const priv = estado.privilegiado;
  document.body.classList.toggle('es-privilegiado', priv);
  document.body.classList.toggle('es-publico', !priv);
  dom.aviso.hidden = priv;
  dom.sesionInsignia.replaceChildren(priv ? insignia('ok', 'Vista privilegiada del observador') : insignia('info', 'Vista pública'));
  dom.formAcceso.hidden = priv || estado.sesion?.tokenConfigurado === false;
  dom.detallesAcceso.hidden = priv;
  dom.salir.hidden = !priv;
  for (const t of dom.tabs) {
    const def = PESTANAS.find((p) => p.id === t.dataset.pestana);
    t.hidden = Boolean(def?.privada) && !priv;
  }
  const def = PESTANAS.find((p) => p.id === activa);
  if (def?.privada && !priv) activar('envivo', { persistir: false });
}

// --- Pestañas (patrón ARIA tabs, activación automática) ----------------------------------

const vistas = new Map();
let marcoRender = 0;
let listo = false;

const ctx = {
  get estado() {
    return estado;
  },
  obtener,
  enviar,
  anunciar,
  avisarError,
  pedir: (recurso) => programador.pedir(recurso),
  alReiniciar: (anterior) => esperarNuevaCorrida(anterior),
};

function renderizar() {
  cancelAnimationFrame(marcoRender);
  marcoRender = requestAnimationFrame(() => {
    pintarCabecera();
    if (listo) vistas.get(activa)?.render();
  });
}

function activar(id, { enfocar = false, persistir = true } = {}) {
  const anterior = activa;
  activa = id;
  for (const t of dom.tabs) {
    const sel = t.dataset.pestana === id;
    t.setAttribute('aria-selected', String(sel));
    t.tabIndex = sel ? 0 : -1;
    if (sel && enfocar) t.focus();
  }
  for (const p of PESTANAS) $(`panel-${p.id}`).hidden = p.id !== id;
  try {
    if (persistir) localStorage.setItem(CLAVE_PESTANA, id);
  } catch {
    // almacenamiento no disponible (modo privado): sólo se pierde la preferencia
  }
  if (anterior !== id) vistas.get(anterior)?.alSalir?.();
  if (!listo) return;
  if (PESTANAS.find((p) => p.id === id)?.necesitaPublico && estado.privilegiado) programador.pedir('publico');
  vistas.get(id)?.render();
}

function iniciarPestanas() {
  for (const p of PESTANAS) vistas.set(p.id, p.crear($(`panel-${p.id}`), ctx));
  for (const t of dom.tabs) {
    t.addEventListener('click', () => activar(t.dataset.pestana));
    t.addEventListener('keydown', (ev) => {
      const visibles = dom.tabs.filter((x) => !x.hidden);
      const i = visibles.indexOf(t);
      let destino = null;
      if (ev.key === 'ArrowRight') destino = visibles[(i + 1) % visibles.length];
      else if (ev.key === 'ArrowLeft') destino = visibles[(i - 1 + visibles.length) % visibles.length];
      else if (ev.key === 'Home') destino = visibles[0];
      else if (ev.key === 'End') destino = visibles.at(-1);
      if (destino) {
        ev.preventDefault();
        activar(destino.dataset.pestana, { enfocar: true });
      }
    });
  }
  let guardada = null;
  try {
    guardada = localStorage.getItem(CLAVE_PESTANA);
  } catch {
    guardada = null;
  }
  activar(PESTANAS.some((p) => p.id === guardada) ? guardada : 'envivo');
}

// --- Sesión ------------------------------------------------------------------------------

/** Devuelve true si había un token en el fragmento (válido o no). El fragmento nunca viaja al servidor. */
async function tomarTokenDelFragmento() {
  const fragmento = location.hash.slice(1);
  if (!fragmento.includes('acceso=')) return false;
  const token = new URLSearchParams(fragmento).get('acceso');
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  if (!token) return true;
  try {
    await enviar('/api/acceso', { token });
    anunciar('Sesión de observador iniciada desde el enlace.');
  } catch (error) {
    dom.errorAcceso.textContent = `El token del enlace no es válido (${mensajeError(error)}).`;
    dom.detallesAcceso.open = true;
  }
  return true;
}

function iniciarSesionUi() {
  dom.formAcceso.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const token = dom.tokenAcceso.value.trim();
    if (!token) {
      dom.errorAcceso.textContent = 'Pega el token del observador.';
      dom.tokenAcceso.focus();
      return;
    }
    dom.errorAcceso.textContent = '';
    try {
      await enviar('/api/acceso', { token });
      dom.tokenAcceso.value = '';
      dom.detallesAcceso.open = false;
      anunciar('Sesión de observador iniciada.');
      arrancar();
    } catch (error) {
      dom.errorAcceso.textContent = error?.estado === 401 ? 'Token inválido.' : `No se pudo iniciar sesión: ${mensajeError(error)}`;
      dom.tokenAcceso.focus();
    }
  });
  dom.salir.addEventListener('click', async () => {
    try {
      await enviar('/api/salir', {});
      anunciar('Sesión cerrada. Vista pública.');
    } catch (error) {
      avisarError('el cierre de sesión', error);
    }
    arrancar();
  });
}

// --- Arranque ------------------------------------------------------------------------------

async function arrancar() {
  const gen = ++generacion;
  flujo?.cerrar();
  flujo = null;
  programador.cancelarTodo();
  estado = estadoVacio();
  cajasPorDia = new Map();
  conexionPerdida = false;
  for (const v of vistas.values()) v.reiniciar?.();
  pintarCabecera();
  try {
    const sesion = await obtener('/api/sesion');
    if (gen !== generacion) return;
    estado.sesion = sesion;
    estado.privilegiado = sesion.privilegiado === true;
    listo = true;
    aplicarModo();
    await cargarEstado(gen);
    if (gen !== generacion) return;
    await Promise.all([cargarVivo(gen), cargarCierre(gen), estado.privilegiado && activa === 'escaparates' ? cargarPublico(gen) : null]);
    if (gen !== generacion) return;
    await rellenarEventos(gen);
    if (gen !== generacion) return;
    conectar();
    intentosArranque = 0;
    limpiarError('el arranque');
    renderizar();
  } catch (error) {
    if (gen !== generacion) return;
    avisarError('el arranque', error);
    const espera = Math.min(REINTENTO_ARRANQUE_MAX_MS, REINTENTO_ARRANQUE_MS * 2 ** intentosArranque);
    intentosArranque++;
    setTimeout(() => {
      if (gen === generacion) arrancar();
    }, espera);
  }
}

async function esperarNuevaCorrida(anterior) {
  const limite = Date.now() + ESPERA_REINICIO_MS;
  const gen = generacion;
  while (Date.now() < limite && gen === generacion) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const datos = await obtener('/api/estado');
      if (datos.corrida && datos.corrida.id !== anterior) {
        if (gen === generacion) {
          anunciar(`Escenario reiniciado: corrida ${datos.corrida.id}.`);
          arrancar();
        }
        return;
      }
    } catch {
      // el servidor puede tardar mientras arranca la corrida nueva; se reintenta
    }
  }
}

await cargarCalendario();
iniciarPestanas();
iniciarSesionUi();
setInterval(() => {
  if (estado.config) programador.pedir('estado');
}, SONDEO_ESTADO_MS);
// Pegar el enlace privilegiado en una pestaña ya abierta sólo cambia el fragmento (sin recarga).
window.addEventListener('hashchange', async () => {
  if (await tomarTokenDelFragmento()) arrancar();
});
await tomarTokenDelFragmento();
arrancar();
