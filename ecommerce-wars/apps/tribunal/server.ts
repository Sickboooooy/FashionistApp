import { timingSafeEqual } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { fechaSimulada } from '../../shared/calendario.ts';
import { cargarConfig, type ConfigIndexada } from '../../shared/config.ts';
import { codigoWarRoom, type EventoSellado } from '../../shared/schemas/eventos.ts';
import { instantanea, resumenRonda } from '../../simulation/economics/proyeccion.ts';
import { hashGenesis, leerEventos } from '../../harness/event-bus/diario.ts';
import { revisarIntegridad } from '../../harness/evaluator/integridad.ts';
import { configDeCorrida, leerCorrida, leerPreflight, type Corrida } from '../../harness/orchestrator/corrida.ts';
import { leerDeExpediente, leerManifiesto } from '../../harness/orchestrator/evidencia.ts';
import { resumirTelemetria, type RegistroTelemetria } from '../../harness/orchestrator/telemetria.ts';
import { crearRutas, enCorrida, RELATIVAS, rutaConfig, rutasDadas, type Rutas } from '../../harness/permissions/rutas.ts';
import { CABECERAS_SSE, crearServidor, ErrorHttp, validar, type Peticion, type Respuesta } from '../shared/servidor.ts';
import { FuenteDiario } from './fuente.ts';

/*
 * War Room / Tribunal en vivo (apartado 16). Proceso de SÓLO LECTURA: el lanzador
 * lo ejecuta con --permission sin ninguna ruta de escritura, así que físicamente
 * no puede modificar sentencias ni registros. Los controles de simulación viajan
 * por IPC al proceso del harness.
 */

const PUERTO = Number(process.env.EW_PUERTO ?? 4100);
const TOKEN = process.env.EW_TOKEN_OBSERVADOR ?? '';
/** Por puerto: las cookies se comparten entre todos los puertos de 127.0.0.1. */
const COOKIE = `ew_observador_${PUERTO}`;
const MAX_CONEXIONES_SSE = 32;
let conexionesSse = 0;
const SONDEO_MS = 250;
const LATIDO_MS = 15_000;
const CODIGOS_PUBLICOS = new Set(['ROUND_STARTED', 'PRICE_CHANGED', 'CAMPAIGN_STARTED', 'CAMPAIGN_STOPPED', 'ROUND_CLOSED', 'JUDGE_VERDICT']);
const MODULOS_NAVEGADOR = ['simulation/economics/proyeccion.ts', 'shared/calendario.ts'] as const;

const raizCodigo = process.env.EW_RAIZ_CODIGO;
let rutas: Rutas = process.env.EW_RAIZ_CORRIDA && raizCodigo ? rutasDadas(process.env.EW_RAIZ_CORRIDA, raizCodigo) : crearRutas(process.env.EW_RAIZ_CORRIDA);
const ciBase = cargarConfig(rutaConfig(rutas));

interface Activa {
  rutas: Rutas;
  corrida: Corrida;
  ci: ConfigIndexada;
  fuente: FuenteDiario;
}
let activa: Activa | null = null;
let estadoControl: Record<string, unknown> | null = null;
const oyentesControl = new Set<(estado: unknown) => void>();

/** Flujos SSE abiertos: al cambiar de corrida se cierran para que el cliente se reconecte a la nueva. */
const flujosAbiertos = new Set<import('node:http').ServerResponse>();

function activar(nuevas: Rutas): void {
  const cambio = activa !== null && activa.rutas.raizCorrida !== nuevas.raizCorrida;
  rutas = nuevas;
  if (cambio) {
    estadoControl = null;
    for (const res of flujosAbiertos) res.end();
    flujosAbiertos.clear();
  }
  const corrida = leerCorrida(nuevas);
  if (!corrida) {
    activa = null;
    return;
  }
  const ci = configDeCorrida(ciBase, corrida);
  activa = { rutas: nuevas, corrida, ci, fuente: new FuenteDiario(enCorrida(nuevas, RELATIVAS.diario), ci, hashGenesis(ci.hash, ci.cfg.semilla)) };
  activa.fuente.sondear();
}
activar(rutas);
setInterval(() => {
  if (!activa) activar(rutas);
  activa?.fuente.sondear();
}, SONDEO_MS);

process.on('message', (m: unknown) => {
  const msg = m as { tipo?: string; estado?: Record<string, unknown>; raizCorrida?: string };
  if (msg.tipo === 'estado' && msg.estado) {
    estadoControl = msg.estado;
    for (const fn of oyentesControl) fn(estadoControl);
  } else if (msg.tipo === 'corrida' && msg.raizCorrida && raizCodigo) {
    activar(rutasDadas(msg.raizCorrida, raizCodigo));
  }
});

// --- Autorización ---------------------------------------------------------------

function esPrivilegiado(p: Peticion): boolean {
  const dado = p.cookies[COOKIE];
  if (!TOKEN || !dado) return false;
  const a = Buffer.from(dado);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function exigirPrivilegio(p: Peticion): void {
  if (!esPrivilegiado(p)) throw new ErrorHttp(401, 'vista privilegiada: inicia sesión con el token del observador');
}

/** Controles: además de la sesión, exige cabecera propia y mismo origen (anti-CSRF). */
function exigirControl(p: Peticion): void {
  exigirPrivilegio(p);
  if (p.cabeceras['x-war-room'] !== '1') throw new ErrorHttp(403, 'falta la cabecera X-War-Room');
  const origen = p.cabeceras.origin;
  if (origen && origen !== `http://127.0.0.1:${PUERTO}` && origen !== `http://localhost:${PUERTO}`) throw new ErrorHttp(403, 'origen no permitido');
}

function exigirActiva(): Activa {
  if (!activa) throw new ErrorHttp(503, 'la corrida aún no inicia');
  return activa;
}

// --- Corridas -------------------------------------------------------------------

function listarCorridas(): Array<{ id: string; ruta: string; modo: string; semilla: number; rondasCerradas: number; activa: boolean }> {
  const enRepositorio = [rutas.raizCodigo, ...listarSubdirectorios(join(rutas.raizCodigo, 'runs'))];
  // La corrida activa puede vivir fuera del repositorio (--corrida <ruta>).
  const candidatas = activa && !enRepositorio.includes(activa.rutas.raizCorrida) ? [...enRepositorio, activa.rutas.raizCorrida] : enRepositorio;
  return candidatas.flatMap((raiz) => {
    const r = rutasDadas(raiz, rutas.raizCodigo);
    const c = leerCorrida(r);
    if (!c) return [];
    let cerradas = 0;
    while (leerManifiesto(r, cerradas + 1)) cerradas++;
    return [{ id: c.id, ruta: relative(rutas.raizCodigo, raiz) || '.', modo: c.modo, semilla: c.semilla, rondasCerradas: cerradas, activa: raiz === activa?.rutas.raizCorrida }];
  });
}

function listarSubdirectorios(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(dir, d.name)).sort() : [];
}

/** ?corrida=<id> selecciona una corrida histórica (sólo lectura); por defecto la activa. */
function corridaSolicitada(p: Peticion): Rutas {
  const id = p.query.get('corrida');
  if (!id) return exigirActiva().rutas;
  const encontrada = listarCorridas().find((c) => c.id === id);
  if (!encontrada) throw new ErrorHttp(404, 'corrida no encontrada');
  return rutasDadas(join(rutas.raizCodigo, encontrada.ruta), rutas.raizCodigo);
}

function leerJson<T>(ruta: string): T | null {
  return existsSync(ruta) ? (JSON.parse(readFileSync(ruta, 'utf8')) as T) : null;
}

// --- Redacción de la vista pública ------------------------------------------------

function redactar(e: EventoSellado): Record<string, unknown> {
  const base = { seq: e.seq, ronda: e.ronda, dia: e.dia, empresa: e.empresa, tipo: e.tipo, codigo: codigoWarRoom(e.tipo), hash: e.hash, prevHash: e.prevHash };
  switch (e.tipo) {
    case 'precio_cambiado':
      return { ...base, datos: e.datos };
    case 'campana_iniciada':
      return { ...base, datos: { campanaId: e.datos.campanaId, canal: e.datos.canal, segmento: e.datos.segmento, angulo: e.datos.angulo, mensaje: e.datos.mensaje } };
    case 'campana_detenida':
    case 'campana_pausada':
      return { ...base, datos: { campanaId: e.datos.campanaId } };
    case 'veredicto_emitido':
    case 'ronda_iniciada':
      return { ...base, datos: e.datos };
    case 'cierre_periodo':
      return { ...base, datos: { hashEstadoFinal: e.datos.hashEstadoFinal } };
    default:
      return { ...base, datos: {} };
  }
}

interface SentenciaCompleta {
  hechosAcreditados: Record<string, { indicadores: { ventasNetas: number }; pedidosValidos: number }> | null;
  comprobaciones: Record<string, Array<{ regla: string; cumple: boolean }>> | null;
  incidencias: Array<{ codigo: string; severidad: string; empresa: string | null }>;
  [campo: string]: unknown;
}

/**
 * Versión pública de una sentencia: resultado, reglas cumplidas y los mismos datos
 * que los resultados públicos (ventas netas y pedidos válidos). La estructura de
 * costos, la caja y el detalle de incidencias sólo se ven en la vista privilegiada.
 */
function redactarSentencia(s: SentenciaCompleta): Record<string, unknown> {
  const publicos = ['resolucion', 'expediente', 'ronda', 'modo', 'versionReglas', 'periodo', 'resultado', 'ganador', 'motivo', 'evidenciasVerificadas', 'hashExpediente', 'hashVeredicto', 'nota'];
  return {
    ...Object.fromEntries(publicos.map((k) => [k, s[k]])),
    vistaPublica: true,
    hechosPublicos: s.hechosAcreditados
      ? Object.fromEntries(Object.entries(s.hechosAcreditados).map(([e, h]) => [e, { ventasNetas: h.indicadores.ventasNetas, pedidosValidos: h.pedidosValidos }]))
      : null,
    comprobaciones: s.comprobaciones
      ? Object.fromEntries(Object.entries(s.comprobaciones).map(([e, cs]) => [e, cs.map((c) => ({ regla: c.regla, cumple: c.cumple }))]))
      : null,
    incidencias: s.incidencias.map((h) => ({ codigo: h.codigo, severidad: h.severidad, empresa: h.empresa })),
  };
}

function esPublico(e: EventoSellado): boolean {
  const c = codigoWarRoom(e.tipo);
  return c !== null && CODIGOS_PUBLICOS.has(c);
}

// --- SSE ------------------------------------------------------------------------

function flujo(p: Peticion): Respuesta {
  const a = exigirActiva();
  if (conexionesSse >= MAX_CONEXIONES_SSE) throw new ErrorHttp(503, 'demasiadas conexiones en vivo abiertas');
  const privilegiado = esPrivilegiado(p);
  // Los ids SSE llevan la corrida ("<corrida>:<seq>"): una reconexión tras cambiar de
  // corrida empieza desde cero en lugar de saltarse eventos de la nueva.
  const ultimoId = String(p.cabeceras['last-event-id'] ?? '');
  const [corridaId, seqTexto] = ultimoId.includes(':') ? [ultimoId.slice(0, ultimoId.lastIndexOf(':')), ultimoId.slice(ultimoId.lastIndexOf(':') + 1)] : [null, ''];
  const ultimo = corridaId === a.corrida.id ? Number(seqTexto) : Number(p.query.get('desde') ?? -1);
  const desde = Number.isFinite(ultimo) ? ultimo + 1 : 0;
  return {
    flujo: (res) => {
      conexionesSse++;
      flujosAbiertos.add(res);
      res.writeHead(200, CABECERAS_SSE);
      res.write(`retry: 2000\n\n`);
      const escribir = (e: EventoSellado) => {
        if (!privilegiado && !esPublico(e)) return;
        const nombre = codigoWarRoom(e.tipo) ?? 'INTERNO';
        res.write(`id: ${a.corrida.id}:${e.seq}\nevent: ${nombre}\ndata: ${JSON.stringify(privilegiado ? e : redactar(e))}\n\n`);
      };
      for (const e of a.fuente.desde(desde)) escribir(e);
      const quitar = a.fuente.suscribir((lote) => lote.forEach(escribir));
      const control = (estado: unknown) => res.write(`event: CONTROL\ndata: ${JSON.stringify(estado)}\n\n`);
      if (privilegiado) {
        oyentesControl.add(control);
        if (estadoControl) control(estadoControl);
      }
      const latido = setInterval(() => res.write(': latido\n\n'), LATIDO_MS);
      p.crudo.on('close', () => {
        conexionesSse--;
        flujosAbiertos.delete(res);
        quitar();
        oyentesControl.delete(control);
        clearInterval(latido);
      });
    },
  };
}

// --- Rutas ----------------------------------------------------------------------

const ControlSchema = z.strictObject({
  accion: z.enum(['pausar', 'reanudar', 'dia', 'semana', 'velocidad']),
  valor: z.number().int().min(0).max(60_000).optional(),
});
const ReinicioSchema = z.strictObject({ semilla: z.number().int().min(0).max(2_147_483_647) });
const AccesoSchema = z.strictObject({ token: z.string().min(1).max(200) });

function enviarAlLanzador(mensaje: unknown): void {
  if (!process.send) throw new ErrorHttp(503, 'War Room sin conexión al harness: inícialo con npm run servir');
  process.send(mensaje);
}

crearServidor({
  nombre: 'war-room',
  puerto: PUERTO,
  estaticos: [fileURLToPath(new URL('./public/', import.meta.url)), fileURLToPath(new URL('../shared/public/', import.meta.url))],
  modulos: { raiz: rutas.raizCodigo, permitidos: MODULOS_NAVEGADOR },
  rutas: [
    { metodo: 'GET', patron: '/api/stream', manejador: flujo },
    {
      metodo: 'GET',
      patron: '/api/sesion',
      manejador: (p) => ({ datos: { privilegiado: esPrivilegiado(p), tokenConfigurado: TOKEN.length > 0, controlDisponible: Boolean(process.send) } }),
    },
    {
      metodo: 'POST',
      patron: '/api/acceso',
      manejador: (p) => {
        const { token } = validar(AccesoSchema, p.cuerpo);
        const a = Buffer.from(token);
        const b = Buffer.from(TOKEN);
        if (!TOKEN || a.length !== b.length || !timingSafeEqual(a, b)) throw new ErrorHttp(401, 'token inválido');
        return {
          datos: { privilegiado: true },
          cabeceras: { 'Set-Cookie': `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` },
        };
      },
    },
    {
      metodo: 'POST',
      patron: '/api/salir',
      manejador: () => ({ datos: { privilegiado: false }, cabeceras: { 'Set-Cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` } }),
    },
    {
      metodo: 'GET',
      patron: '/api/estado',
      manejador: (p) => {
        const a = activa;
        return {
          datos: {
            corrida: a ? { id: a.corrida.id, modo: a.corrida.modo, semilla: a.corrida.semilla, versionReglas: a.corrida.versionReglas } : null,
            control: esPrivilegiado(p) ? estadoControl : null,
            ultimoSeq: a?.fuente.eventos.at(-1)?.seq ?? -1,
            fechaInicio: ciBase.cfg.fecha_inicio_simulada,
            diasPorPeriodo: ciBase.cfg.dias_por_periodo,
            criterios: ciBase.cfg.victoria,
          },
        };
      },
    },
    { metodo: 'GET', patron: '/api/corridas', manejador: () => ({ datos: listarCorridas() }) },
    {
      metodo: 'GET',
      patron: '/api/instantanea',
      manejador: (p) => {
        exigirPrivilegio(p);
        const a = exigirActiva();
        const inst = instantanea(a.fuente.proyeccion);
        return {
          datos: {
            ...inst,
            fechaSimulada: fechaSimulada(a.ci.cfg.fecha_inicio_simulada, Math.max(1, inst.diaGlobal)),
            integridadDiario: a.fuente.integridad(),
            control: estadoControl,
          },
        };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/publico',
      manejador: () => {
        const a = exigirActiva();
        const p = a.fuente.proyeccion;
        return {
          datos: {
            ronda: p.ronda,
            dia: p.dia,
            fechaSimulada: fechaSimulada(a.ci.cfg.fecha_inicio_simulada, Math.max(1, (p.ronda - 1) * a.ci.cfg.dias_por_periodo + p.dia)),
            resultados: leerJson(enCorrida(a.rutas, RELATIVAS.resultadosPublicos)) ?? [],
            escaparates: {
              alfa: leerJson(enCorrida(a.rutas, RELATIVAS.escaparate('alfa'))),
              omega: leerJson(enCorrida(a.rutas, RELATIVAS.escaparate('omega'))),
            },
            veredictos: p.veredictos,
            integridadDiario: a.fuente.integridad(),
          },
        };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/eventos',
      manejador: (p) => {
        const a = exigirActiva();
        const privilegiado = esPrivilegiado(p);
        const desde = Math.max(0, Number(p.query.get('desde') ?? 0) || 0);
        const limite = Math.min(2000, Math.max(1, Number(p.query.get('limite') ?? 200) || 200));
        const lista = a.fuente.desde(desde).filter((e) => privilegiado || esPublico(e)).slice(0, limite);
        return { datos: privilegiado ? lista : lista.map(redactar) };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/rondas',
      manejador: (p) => {
        const r = corridaSolicitada(p);
        const privilegiado = esPrivilegiado(p);
        const lista = [];
        for (let n = 1; existsSync(enCorrida(r, RELATIVAS.resumenRonda(n))); n++) {
          const resumen = leerJson<{ ronda: number; empresas: Record<string, { resumen: { financiero: { ventasNetas: number } } }> }>(enCorrida(r, RELATIVAS.resumenRonda(n)));
          const sentencia = leerJson<{ resultado: string; ganador: string | null; resolucion: string; hashVeredicto: string }>(enCorrida(r, RELATIVAS.veredicto(n, 'json')));
          lista.push({
            ronda: n,
            ventasNetas: { alfa: resumen?.empresas.alfa?.resumen.financiero.ventasNetas ?? 0, omega: resumen?.empresas.omega?.resumen.financiero.ventasNetas ?? 0 },
            sentencia: sentencia ? { resultado: sentencia.resultado, ganador: sentencia.ganador, resolucion: sentencia.resolucion, hashVeredicto: sentencia.hashVeredicto } : null,
            resumen: privilegiado ? resumen : undefined,
          });
        }
        return { datos: lista };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/rondas/:n',
      manejador: (p) => {
        exigirPrivilegio(p);
        const r = corridaSolicitada(p);
        const n = Number(p.parametros.n);
        if (!Number.isInteger(n) || n < 1) throw new ErrorHttp(400, 'ronda inválida');
        const resumen = leerJson(enCorrida(r, RELATIVAS.resumenRonda(n)));
        if (!resumen) throw new ErrorHttp(404, 'ronda sin resumen');
        return { datos: { resumen, sentencia: leerJson(enCorrida(r, RELATIVAS.veredicto(n, 'json'))), manifiesto: leerManifiesto(r, n) } };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/rondas/:n/eventos',
      manejador: (p) => {
        exigirPrivilegio(p);
        const r = corridaSolicitada(p);
        const n = Number(p.parametros.n);
        const contenido = Number.isInteger(n) && n > 0 ? leerDeExpediente(r, n, 'eventos.jsonl') : null;
        const eventos = contenido
          ? contenido.split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l) as EventoSellado)
          : leerEventos(enCorrida(r, RELATIVAS.diario)).filter((e) => e.ronda === n);
        return { datos: eventos };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/veredictos/:n',
      manejador: (p) => {
        const r = corridaSolicitada(p);
        const n = Number(p.parametros.n);
        const md = p.query.get('formato') === 'md';
        if (md) exigirPrivilegio(p);
        const ruta = enCorrida(r, RELATIVAS.veredicto(n, md ? 'md' : 'json'));
        if (!Number.isInteger(n) || n < 1 || !existsSync(ruta)) throw new ErrorHttp(404, 'sentencia no encontrada');
        if (md) return { texto: { contenido: readFileSync(ruta, 'utf8'), tipo: 'text/markdown; charset=utf-8' } };
        const sentencia = JSON.parse(readFileSync(ruta, 'utf8')) as SentenciaCompleta;
        return { datos: esPrivilegiado(p) ? sentencia : redactarSentencia(sentencia) };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/integridad',
      manejador: (p) => {
        const r = corridaSolicitada(p);
        const corrida = leerCorrida(r);
        if (!corrida) throw new ErrorHttp(404, 'corrida sin iniciar');
        return { datos: revisarIntegridad(r, configDeCorrida(ciBase, corrida), corrida) };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/pruebas',
      manejador: (p) => {
        const r = corridaSolicitada(p);
        return { datos: { preflight: leerPreflight(r), ejecucion: leerJson(enCorrida(r, RELATIVAS.telemetria, 'preflight.json')) } };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/supervision',
      manejador: (p) => {
        exigirPrivilegio(p);
        const r = corridaSolicitada(p);
        const ruta = enCorrida(r, RELATIVAS.telemetria, 'registros.jsonl');
        const registros = existsSync(ruta)
          ? readFileSync(ruta, 'utf8').split('\n').filter((l) => l.length > 0).map((l) => JSON.parse(l) as RegistroTelemetria)
          : [];
        const rondas = [];
        for (let n = 1; existsSync(enCorrida(r, RELATIVAS.resumenRonda(n))); n++) {
          const res = leerJson<{ perfiles: Record<string, string>; empresas: Record<string, { calidad: unknown; rechazos: unknown[]; resumen: unknown }> }>(enCorrida(r, RELATIVAS.resumenRonda(n)));
          if (!res) continue;
          rondas.push({
            ronda: n,
            perfiles: res.perfiles,
            alfa: { calidad: res.empresas.alfa?.calidad, rechazos: res.empresas.alfa?.rechazos.length ?? 0, resumen: res.empresas.alfa?.resumen },
            omega: { calidad: res.empresas.omega?.calidad, rechazos: res.empresas.omega?.rechazos.length ?? 0, resumen: res.empresas.omega?.resumen },
          });
        }
        return {
          datos: {
            telemetria: resumirTelemetria(registros),
            ultimos: registros.slice(-40),
            rondas,
            banco: leerJson(join(rutas.raizCodigo, 'reports', 'banco', 'resultado.json')),
          },
        };
      },
    },
    {
      metodo: 'GET',
      patron: '/api/historico',
      manejador: (p) => {
        exigirPrivilegio(p);
        const a = exigirActiva();
        const proy = a.fuente.proyeccion;
        return { datos: [...proy.porRonda.keys()].sort((x, y) => x - y).map((n) => ({ ronda: n, empresas: resumenRonda(proy, n) })) };
      },
    },
    {
      metodo: 'POST',
      patron: '/api/control',
      manejador: (p) => {
        exigirControl(p);
        const orden = validar(ControlSchema, p.cuerpo);
        enviarAlLanzador({ tipo: 'control', ...orden });
        return { estado: 202, datos: { aceptado: orden.accion } };
      },
    },
    {
      metodo: 'POST',
      patron: '/api/reiniciar',
      manejador: (p) => {
        exigirControl(p);
        const { semilla } = validar(ReinicioSchema, p.cuerpo);
        enviarAlLanzador({ tipo: 'reiniciar', semilla });
        return { estado: 202, datos: { semilla } };
      },
    },
  ],
});

process.stdout.write(`War Room en http://127.0.0.1:${PUERTO}${TOKEN ? '' : ' (sin token: la vista privilegiada está deshabilitada)'}\n`);
