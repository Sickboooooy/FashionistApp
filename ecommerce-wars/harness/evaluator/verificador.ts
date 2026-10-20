import { existsSync, readFileSync } from 'node:fs';
import { LibroMayorSchema, ReporteFinancieroSchema, type ReporteFinanciero } from '../../shared/contracts/finanzas.ts';
import type { ConfigIndexada } from '../../shared/config.ts';
import { hashCanonico, sha256 } from '../../shared/hash.ts';
import { EventoSelladoSchema, type Evento, type EventoSellado } from '../../shared/schemas/eventos.ts';
import { EMPRESAS, type EmpresaId } from '../../shared/types/dominio.ts';
import type { LibroMayor } from '../../simulation/economics/libro-mayor.ts';
import { estadoInicial as crearEstadoInicial, type EstadoMercado } from '../../simulation/market/estado.ts';
import { simularPeriodo } from '../../simulation/market/motor.ts';
import { hashGenesis, leerEventos, verificarCadena } from '../event-bus/diario.ts';
import { cargarConfig } from '../../shared/config.ts';
import { hashArbolCodigo, leerCandado, leerPreflight, type Corrida, type Preflight } from '../orchestrator/corrida.ts';
import {
  ARCHIVOS,
  hashManifiesto,
  leerDeExpediente,
  leerManifiesto,
  nombreExpediente,
  type ArchivoExpediente,
  type Manifiesto,
  type PlanesRonda,
} from '../orchestrator/evidencia.ts';
import { enCorrida, RELATIVAS, rutaConfig, type Rutas } from '../permissions/rutas.ts';
import { hallazgo, type Hallazgo } from './hallazgos.ts';

export interface DatosExpediente {
  manifiesto: Manifiesto;
  estadoInicial: EstadoMercado;
  estadoFinal: EstadoMercado;
  planes: PlanesRonda;
  eventos: EventoSellado[];
  libros: Record<EmpresaId, LibroMayor | null>;
  reportes: Record<EmpresaId, ReporteFinanciero | null>;
}

export interface ResultadoVerificacion {
  hallazgos: Hallazgo[];
  datos: DatosExpediente | null;
  evidencias: ArchivoExpediente[];
  preflight: Preflight | null;
}

const corto = (h: string) => h.slice(0, 12);

function sinSello(e: EventoSellado): Evento {
  return { ronda: e.ronda, dia: e.dia, actor: e.actor, empresa: e.empresa, tipo: e.tipo, datos: e.datos } as Evento;
}

function primeraDivergencia(a: readonly Evento[], b: readonly Evento[]): string {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (hashCanonico(a[i]) !== hashCanonico(b[i])) return `primera diferencia en el evento de mercado #${i} (${a[i]?.tipo} vs ${b[i]?.tipo})`;
  }
  return `longitudes distintas: ${a.length} vs ${b.length}`;
}

/**
 * Verificador del Juez: integridad del expediente, continuidad con la ronda
 * anterior, candado de reglas, pruebas críticas y reejecución determinista.
 */
export function verificarExpediente(args: { rutas: Rutas; ci: ConfigIndexada; corrida: Corrida; ronda: number }): ResultadoVerificacion {
  const { rutas, ci, corrida, ronda } = args;
  const { cfg } = ci;
  const hallazgos: Hallazgo[] = [];
  const reportar = (codigo: string, detalle: string) => hallazgos.push(hallazgo(cfg, codigo, null, detalle));
  const sinDatos = (evidencias: ArchivoExpediente[] = []): ResultadoVerificacion => ({ hallazgos, datos: null, evidencias, preflight: null });

  const candado = leerCandado(rutas);
  if (!candado) reportar('configuracion_alterada', 'no existe config/experiment.lock.json: las reglas no fueron selladas por una persona');
  else if (candado.hashConfig !== ci.hash) reportar('configuracion_alterada', `config/experiment.json (${corto(ci.hash)}) no coincide con el candado (${corto(candado.hashConfig)})`);
  if (corrida.hashConfig !== ci.hash) reportar('configuracion_alterada', 'la configuración cambió desde que inició la corrida');
  if (corrida.modo === 'oficial') {
    const sellada = cargarConfig(rutaConfig(rutas)).cfg.semilla;
    if (corrida.semilla !== sellada || corrida.semillaConfig !== sellada) reportar('configuracion_alterada', 'una corrida oficial debe usar la semilla sellada');
    if (corrida.aislamiento !== 'proceso') reportar('configuracion_alterada', 'una corrida oficial exige agentes en procesos aislados');
    if (!corrida.autorizadoPor) reportar('configuracion_alterada', 'corrida oficial sin autorización humana registrada');
  }

  let manifiesto: Manifiesto | null;
  try {
    manifiesto = leerManifiesto(rutas, ronda);
  } catch {
    reportar('integridad_evidencia', 'manifiesto ilegible o con formato inválido');
    return sinDatos();
  }
  if (!manifiesto) {
    reportar('integridad_evidencia', `falta el manifiesto del expediente ${nombreExpediente(ronda)}`);
    return sinDatos();
  }
  if (hashManifiesto(manifiesto) !== manifiesto.hashExpediente) reportar('integridad_evidencia', 'el manifiesto fue alterado (su hash no coincide)');
  if (manifiesto.hashConfig !== ci.hash) reportar('configuracion_alterada', 'el expediente se generó con otra configuración');
  if (manifiesto.semilla !== cfg.semilla) reportar('integridad_evidencia', 'la semilla del expediente no es la de la corrida');

  const contenidos = new Map<string, string>();
  for (const archivo of manifiesto.archivos) {
    const contenido = leerDeExpediente(rutas, ronda, archivo.ruta);
    if (contenido === null) reportar('integridad_evidencia', `falta ${archivo.ruta}`);
    else if (sha256(contenido) !== archivo.sha256) reportar('integridad_evidencia', `${archivo.ruta} alterado: el SHA-256 no coincide`);
    else contenidos.set(archivo.ruta, contenido);
  }
  const obligatorios = [ARCHIVOS.estadoInicial, ARCHIVOS.planes, ARCHIVOS.eventos, ARCHIVOS.estadoFinal];
  if (obligatorios.some((a) => !contenidos.has(a))) return sinDatos(manifiesto.archivos);

  /** Libros y reportes los producen los agentes: un archivo inválido se atribuye a su empresa (grave), no anula la ronda. */
  const leerDeAgente = <T>(empresa: EmpresaId, nombre: string, esquema: { parse(x: unknown): T }): T | null => {
    const c = contenidos.get(nombre);
    if (c === undefined) return null;
    try {
      return esquema.parse(JSON.parse(c));
    } catch {
      hallazgos.push(hallazgo(cfg, 'discrepancia_contable', empresa, `${nombre} ilegible o con formato inválido`));
      return null;
    }
  };

  let datos: DatosExpediente;
  try {
    datos = {
      manifiesto,
      estadoInicial: JSON.parse(contenidos.get(ARCHIVOS.estadoInicial) as string) as EstadoMercado,
      estadoFinal: JSON.parse(contenidos.get(ARCHIVOS.estadoFinal) as string) as EstadoMercado,
      planes: JSON.parse(contenidos.get(ARCHIVOS.planes) as string) as PlanesRonda,
      eventos: (contenidos.get(ARCHIVOS.eventos) as string)
        .split('\n')
        .filter((l) => l.length > 0)
        .map((l) => EventoSelladoSchema.parse(JSON.parse(l)) as unknown as EventoSellado),
      libros: Object.fromEntries(EMPRESAS.map((e) => [e, leerDeAgente(e, ARCHIVOS.libro(e), LibroMayorSchema) as LibroMayor | null])) as Record<
        EmpresaId,
        LibroMayor | null
      >,
      reportes: Object.fromEntries(EMPRESAS.map((e) => [e, leerDeAgente(e, ARCHIVOS.reporte(e), ReporteFinancieroSchema)])) as Record<
        EmpresaId,
        ReporteFinanciero | null
      >,
    };
  } catch (error) {
    reportar('integridad_evidencia', `contenido del expediente ilegible: ${(error as Error).message}`);
    return sinDatos(manifiesto.archivos);
  }

  const cadena = verificarCadena(datos.eventos, manifiesto.prevHashInicio, manifiesto.seqInicio);
  if (!cadena.ok) reportar('integridad_evidencia', `cadena de eventos rota: ${cadena.errores.slice(0, 3).join('; ')}`);
  if (cadena.ultimoHash !== manifiesto.hashFin || cadena.ultimoSeq !== manifiesto.seqFin) {
    reportar('integridad_evidencia', 'el último evento del expediente no coincide con el manifiesto');
  }
  const diario = leerEventos(enCorrida(rutas, RELATIVAS.diario)).filter((e) => e.seq >= manifiesto.seqInicio && e.seq <= manifiesto.seqFin);
  if (hashCanonico(diario.map((e) => e.hash)) !== hashCanonico(datos.eventos.map((e) => e.hash))) {
    reportar('integridad_evidencia', 'el expediente no coincide con el diario global de eventos');
  }

  if (ronda === 1) {
    if (hashCanonico(datos.estadoInicial) !== hashCanonico(crearEstadoInicial(ci))) {
      reportar('continuidad_estado', 'el estado inicial no es el estado de arranque con capital idéntico');
    }
    if (manifiesto.prevHashInicio !== hashGenesis(ci.hash, cfg.semilla)) reportar('continuidad_estado', 'la cadena no parte del génesis de la corrida');
    if (manifiesto.hashExpedienteAnterior !== null) reportar('continuidad_estado', 'la ronda 1 no debe enlazar un expediente anterior');
  } else {
    const anterior = leerManifiesto(rutas, ronda - 1);
    const estadoAnterior = leerDeExpediente(rutas, ronda - 1, ARCHIVOS.estadoFinal);
    if (!anterior || estadoAnterior === null) {
      reportar('continuidad_estado', `no existe el expediente de la ronda ${ronda - 1}`);
    } else {
      if (anterior.hashExpediente !== manifiesto.hashExpedienteAnterior) reportar('continuidad_estado', 'no enlaza con el hash del expediente anterior');
      if (anterior.hashFin !== manifiesto.prevHashInicio || anterior.seqFin + 1 !== manifiesto.seqInicio) {
        reportar('continuidad_estado', 'la cadena de eventos no continúa la de la ronda anterior');
      }
      if (hashCanonico(JSON.parse(estadoAnterior)) !== hashCanonico(datos.estadoInicial)) {
        reportar('continuidad_estado', 'el estado inicial no es el estado final de la ronda anterior');
      }
    }
  }

  const preflight = leerPreflight(rutas);
  if (!preflight) {
    reportar('preflight_fallido', 'no hay registro de pruebas críticas');
  } else {
    const crudo = leerTextoSiExiste(enCorrida(rutas, RELATIVAS.preflight));
    if (crudo !== null && sha256(crudo) !== manifiesto.hashPreflight) reportar('integridad_evidencia', 'el registro de pruebas críticas cambió');
    if (!preflight.aprobado) reportar('preflight_fallido', `${preflight.fallidas} pruebas críticas fallidas`);
    if (preflight.hashCodigo && preflight.hashCodigo !== hashArbolCodigo(rutas.raizCodigo)) {
      reportar('preflight_fallido', 'el código cambió después de ejecutar las pruebas críticas');
    }
    if (corrida.modo === 'oficial' && !preflight.hashCodigo) reportar('preflight_fallido', 'una corrida oficial exige la huella del código probado');
    if (preflight.sintetico && corrida.modo === 'oficial') reportar('preflight_fallido', 'una corrida oficial exige pruebas críticas reales');
    if (preflight.hashConfig !== ci.hash) reportar('preflight_fallido', 'las pruebas se ejecutaron con otra configuración');
  }

  const reejecucion = simularPeriodo({
    ci,
    estado: datos.estadoInicial,
    planes: { alfa: datos.planes.alfa.aplicado, omega: datos.planes.omega.aplicado },
    ronda,
  });
  const registrados = datos.eventos.filter((e) => e.actor === 'mercado' && e.ronda === ronda).map(sinSello);
  if (hashCanonico(reejecucion.eventos) !== hashCanonico(registrados)) {
    reportar('determinismo', `la reejecución con semilla fija no reproduce los eventos: ${primeraDivergencia(reejecucion.eventos, registrados)}`);
  }
  if (hashCanonico(reejecucion.estado) !== hashCanonico(datos.estadoFinal)) {
    reportar('determinismo', 'la reejecución no reproduce el estado final registrado');
  }

  return { hallazgos, datos, evidencias: manifiesto.archivos, preflight };
}

function leerTextoSiExiste(ruta: string): string | null {
  return existsSync(ruta) ? readFileSync(ruta, 'utf8') : null;
}
