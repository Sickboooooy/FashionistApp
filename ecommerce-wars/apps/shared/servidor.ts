import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { stripTypeScriptTypes } from 'node:module';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { z } from 'zod';

// Mensajes de validación en español para todo lo que las apps devuelven a la interfaz.
z.config(z.locales.es());

/*
 * Kit HTTP mínimo para las tres apps locales. Sólo escucha en 127.0.0.1 (regla 11:
 * nada se despliega públicamente). Todas las respuestas JSON usan el sobre
 * { ok, datos, error }.
 */

export const HOST_LOCAL = '127.0.0.1';
const LIMITE_CUERPO = 32 * 1024;
/** Todas las pestañas locales comparten la IP 127.0.0.1; cada tienda abierta hace ~20 peticiones/min. */
const PETICIONES_POR_MINUTO = 900;

export interface Peticion {
  metodo: string;
  ruta: string;
  parametros: Record<string, string>;
  query: URLSearchParams;
  cabeceras: IncomingMessage['headers'];
  cuerpo: unknown;
  cookies: Record<string, string>;
  crudo: IncomingMessage;
}

export interface Respuesta {
  estado?: number;
  datos?: unknown;
  error?: string;
  cabeceras?: Record<string, string>;
  texto?: { contenido: string; tipo: string };
  /** Respuesta de streaming (SSE): el manejador toma el control del socket. */
  flujo?: (res: ServerResponse) => void;
}

export type Manejador = (p: Peticion) => Respuesta | Promise<Respuesta>;

export interface Ruta {
  metodo: 'GET' | 'POST';
  patron: string;
  manejador: Manejador;
}

export interface OpcionesServidor {
  nombre: string;
  puerto: number;
  rutas: Ruta[];
  /** Directorios de archivos estáticos montados en '/'. El primero que tenga el archivo gana. */
  estaticos: string[];
  /** Módulos TypeScript servidos al navegador sin tipos (lista blanca de rutas relativas a `raiz`). */
  modulos?: { raiz: string; permitidos: readonly string[] };
}

export class ErrorHttp extends Error {
  readonly estado: number;

  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

const SEGURIDAD: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

export function validar<T>(esquema: z.ZodType<T>, valor: unknown): T {
  const r = esquema.safeParse(valor);
  if (!r.success) throw new ErrorHttp(400, r.error.issues.slice(0, 4).map((i) => `${i.path.join('.') || 'cuerpo'}: ${i.message}`).join('; '));
  return r.data;
}

function compilar(patron: string): { regex: RegExp; nombres: string[] } {
  const nombres: string[] = [];
  const fuente = patron.replace(/:([a-zA-Z]+)/g, (_, n: string) => {
    nombres.push(n);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${fuente}$`), nombres };
}

function leerCookies(cabecera: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const parte of (cabecera ?? '').split(';')) {
    const i = parte.indexOf('=');
    if (i <= 0) continue;
    try {
      cookies[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
    } catch {
      // cookie mal codificada: se ignora
    }
  }
  return cookies;
}

async function leerCuerpo(req: IncomingMessage): Promise<unknown> {
  if (req.method !== 'POST') return undefined;
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw new ErrorHttp(415, 'se espera application/json');
  const trozos: Buffer[] = [];
  let total = 0;
  for await (const t of req) {
    total += (t as Buffer).length;
    if (total > LIMITE_CUERPO) throw new ErrorHttp(413, 'cuerpo demasiado grande');
    trozos.push(t as Buffer);
  }
  if (total === 0) return {};
  try {
    return JSON.parse(Buffer.concat(trozos).toString('utf8'));
  } catch {
    throw new ErrorHttp(400, 'JSON inválido');
  }
}

/** Ruta segura dentro de `base`; null si escapa o no es un archivo. */
function archivoSeguro(base: string, rutaUrl: string): string | null {
  let decodificada: string;
  try {
    decodificada = decodeURIComponent(rutaUrl);
  } catch {
    return null;
  }
  if (decodificada.includes('\0')) return null;
  const relativa = normalize(decodificada === '/' ? '/index.html' : decodificada).replace(/^([/\\])+/, '');
  const absoluta = resolve(base, relativa);
  if (absoluta !== base && !absoluta.startsWith(base + sep)) return null;
  return existsSync(absoluta) && statSync(absoluta).isFile() ? absoluta : null;
}

function enviar(res: ServerResponse, estado: number, cuerpo: string | Buffer, tipo: string, extra: Record<string, string> = {}): void {
  res.writeHead(estado, { ...SEGURIDAD, 'Content-Type': tipo, 'Cache-Control': 'no-store', ...extra });
  res.end(cuerpo);
}

function enviarJson(res: ServerResponse, estado: number, sobre: unknown, extra: Record<string, string> = {}): void {
  enviar(res, estado, JSON.stringify(sobre), 'application/json; charset=utf-8', extra);
}

/** Límite de tasa por IP con ventana de un minuto. */
function crearLimitador(): (ip: string) => boolean {
  const ventanas = new Map<string, { inicio: number; n: number }>();
  return (ip) => {
    const ahora = Date.now();
    const v = ventanas.get(ip);
    if (!v || ahora - v.inicio > 60_000) {
      ventanas.set(ip, { inicio: ahora, n: 1 });
      return true;
    }
    v.n++;
    return v.n <= PETICIONES_POR_MINUTO;
  };
}

export function crearServidor(opciones: OpcionesServidor): Server {
  const rutas = opciones.rutas.map((r) => ({ ...r, ...compilar(r.patron) }));
  const estaticos = opciones.estaticos.map((d) => resolve(d));
  const permitido = crearLimitador();
  const cacheModulos = new Map<string, string>();

  const servidor = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${HOST_LOCAL}`);
    const ip = req.socket.remoteAddress ?? 'desconocida';
    try {
      // Anti DNS-rebinding: sólo se atiende a nombres locales con el puerto propio.
      const host = req.headers.host ?? '';
      if (host !== `${HOST_LOCAL}:${opciones.puerto}` && host !== `localhost:${opciones.puerto}`) throw new ErrorHttp(421, 'host no permitido');
      const coincidentes = rutas.filter((r) => r.regex.test(url.pathname));
      const ruta = coincidentes.find((r) => r.metodo === req.method);
      const esFlujo = url.pathname.endsWith('/stream');
      if (!esFlujo && !permitido(ip)) throw new ErrorHttp(429, 'demasiadas peticiones; espera un minuto');
      if (coincidentes.length > 0 && !ruta) throw new ErrorHttp(405, 'método no permitido');
      if (ruta) {
        const m = ruta.regex.exec(url.pathname) as RegExpExecArray;
        const parametros = Object.fromEntries(ruta.nombres.map((n, i) => [n, decodeURIComponent(m[i + 1] ?? '')]));
        const respuesta = await ruta.manejador({
          metodo: req.method ?? 'GET',
          ruta: url.pathname,
          parametros,
          query: url.searchParams,
          cabeceras: req.headers,
          cuerpo: await leerCuerpo(req),
          cookies: leerCookies(req.headers.cookie),
          crudo: req,
        });
        if (respuesta.flujo) return respuesta.flujo(res);
        if (respuesta.texto) return enviar(res, respuesta.estado ?? 200, respuesta.texto.contenido, respuesta.texto.tipo, respuesta.cabeceras);
        const estado = respuesta.estado ?? (respuesta.error ? 400 : 200);
        return enviarJson(res, estado, { ok: !respuesta.error, datos: respuesta.datos ?? null, error: respuesta.error ?? null }, respuesta.cabeceras);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new ErrorHttp(405, 'método no permitido');

      if (opciones.modulos && url.pathname.startsWith('/m/')) {
        const relativa = url.pathname.slice(3);
        if (!opciones.modulos.permitidos.includes(relativa)) throw new ErrorHttp(404, 'módulo no disponible');
        let js = cacheModulos.get(relativa);
        if (js === undefined) {
          js = stripTypeScriptTypes(readFileSync(join(opciones.modulos.raiz, relativa), 'utf8'));
          cacheModulos.set(relativa, js);
        }
        return enviar(res, 200, js, 'text/javascript; charset=utf-8');
      }
      for (const base of estaticos) {
        const archivo = archivoSeguro(base, url.pathname);
        if (archivo) return enviar(res, 200, readFileSync(archivo), TIPOS[extname(archivo)] ?? 'application/octet-stream', { 'Cache-Control': 'no-cache' });
      }
      throw new ErrorHttp(404, 'no encontrado');
    } catch (error) {
      if (res.headersSent) return res.end();
      if (error instanceof ErrorHttp) return enviarJson(res, error.estado, { ok: false, datos: null, error: error.message });
      process.stderr.write(`[${opciones.nombre}] ${req.method} ${url.pathname}: ${(error as Error).stack ?? error}\n`);
      return enviarJson(res, 500, { ok: false, datos: null, error: 'error interno del servidor' });
    }
  });
  servidor.listen(opciones.puerto, HOST_LOCAL);
  return servidor;
}

export const CABECERAS_SSE: Record<string, string> = {
  ...SEGURIDAD,
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-store',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};
