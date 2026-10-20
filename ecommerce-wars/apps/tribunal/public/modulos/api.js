/*
 * Cliente HTTP del War Room. Todas las respuestas usan el sobre { ok, datos, error }.
 * El servidor limita 240 peticiones/minuto por IP (apps/shared/servidor.ts): este
 * cliente lleva su propio presupuesto para no agotarlo durante la simulación en vivo.
 */

const VENTANA_MS = 60_000;
const PRESUPUESTO_POR_VENTANA = 200;
const ESPERA_TRAS_429_MS = 15_000;
const PLAZO_PETICION_MS = 15_000;

let marcas = [];
let bloqueadoHasta = 0;
const oyentesLimite = new Set();

export class ErrorApi extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

/** Notifica cuando el cliente está esperando por límite de tasa (para avisar en la UI). */
export function alLimite(fn) {
  oyentesLimite.add(fn);
  return () => oyentesLimite.delete(fn);
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let finAvisado = 0;
/** Avisa una sola vez por ventana de espera (no una vez por petición en cola). */
function notificarLimite(hasta) {
  if (hasta <= finAvisado) return;
  finAvisado = hasta;
  for (const fn of oyentesLimite) fn(hasta - Date.now());
}

async function esperarTurno() {
  for (;;) {
    const ahora = Date.now();
    if (ahora < bloqueadoHasta) {
      notificarLimite(bloqueadoHasta);
      await dormir(bloqueadoHasta - ahora);
      continue;
    }
    marcas = marcas.filter((t) => ahora - t < VENTANA_MS);
    if (marcas.length < PRESUPUESTO_POR_VENTANA) {
      marcas = [...marcas, ahora];
      return;
    }
    const espera = VENTANA_MS - (ahora - marcas[0]) + 50;
    notificarLimite(ahora + espera);
    await dormir(espera);
  }
}

async function leerSobre(respuesta) {
  let sobre = null;
  try {
    sobre = await respuesta.json();
  } catch {
    sobre = null;
  }
  if (respuesta.status === 429) bloqueadoHasta = Date.now() + ESPERA_TRAS_429_MS;
  if (!respuesta.ok || !sobre || sobre.ok !== true) {
    const mensaje = sobre && typeof sobre.error === 'string' ? sobre.error : `HTTP ${respuesta.status}`;
    throw new ErrorApi(respuesta.status, mensaje);
  }
  return sobre.datos;
}

/** Ninguna petición queda colgada: plazo máximo combinado con la señal del llamador. */
function senalConPlazo(senal) {
  const plazo = AbortSignal.timeout(PLAZO_PETICION_MS);
  return senal ? AbortSignal.any([senal, plazo]) : plazo;
}

async function solicitar(ruta, opciones) {
  try {
    return await fetch(ruta, opciones);
  } catch (error) {
    if (error?.name === 'TimeoutError') throw new ErrorApi(0, `sin respuesta en ${PLAZO_PETICION_MS / 1000} s`);
    throw new ErrorApi(0, 'sin conexión con el War Room');
  }
}

export async function obtener(ruta, { senal } = {}) {
  await esperarTurno();
  const r = await solicitar(ruta, { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: senalConPlazo(senal), cache: 'no-store' });
  return leerSobre(r);
}

/** POST JSON con la cabecera anti-CSRF exigida por el War Room. */
export async function enviar(ruta, cuerpo = {}) {
  await esperarTurno();
  const r = await solicitar(ruta, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-War-Room': '1' },
    body: JSON.stringify(cuerpo),
    cache: 'no-store',
    signal: senalConPlazo(),
  });
  return leerSobre(r);
}

/** Construye una ruta con parámetros de consulta (omite vacíos). */
export function ruta(base, parametros = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(parametros)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
