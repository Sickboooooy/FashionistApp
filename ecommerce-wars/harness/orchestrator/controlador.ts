import { existsSync, readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { fechaSimulada } from '../../shared/calendario.ts';
import { cargarConfig, type ConfigIndexada } from '../../shared/config.ts';
import { LibroMayorSchema, ReporteFinancieroSchema, type ReporteFinanciero } from '../../shared/contracts/finanzas.ts';
import type { Escaparate, ResultadoPublico, RondaPropia } from '../../shared/contracts/vista.ts';
import { hashCanonico, sha256 } from '../../shared/hash.ts';
import type { PlanPeriodo } from '../../shared/schemas/decisiones.ts';
import type { DatosPorTipo, Evento, EventoSellado, TipoEvento } from '../../shared/schemas/eventos.ts';
import { EMPRESAS, ROLES_COMERCIALES, type EmpresaId, type Principal, type RolComercial } from '../../shared/types/dominio.ts';
import { indicadoresContables, type LibroMayor } from '../../simulation/economics/libro-mayor.ts';
import { aplicarEvento, crearProyeccion, resumenRonda, valorObservado, type Proyeccion } from '../../simulation/economics/proyeccion.ts';
import { disponible } from '../../simulation/economics/tesoreria.ts';
import { estadoInicial, type EstadoMercado } from '../../simulation/market/estado.ts';
import { abrirPeriodo, cerrarPeriodo, periodoCompleto, simularDia, type SesionPeriodo } from '../../simulation/market/motor.ts';
import { evaluarCalidad } from '../evaluator/calidad.ts';
import { severidadDe } from '../evaluator/hallazgos.ts';
import type { ResumenVeredicto } from '../evaluator/juez.ts';
import { Diario, hashGenesis, serializarEventos } from '../event-bus/diario.ts';
import { AlmacenRestringido } from '../permissions/almacen.ts';
import type { ResultadoAislado } from '../permissions/sandbox.ts';
import { enCodigo, enCorrida, prepararEstructura, RELATIVAS, rutaConfig, type Rutas } from '../permissions/rutas.ts';
import { configDeCorrida, leerCandado, leerCorrida, leerPreflight, type Corrida, type Preflight } from './corrida.ts';
import { crearEjecutor, type Ejecutor, type OperacionEquipo } from './ejecutor.ts';
import { diferenciasEstrategia, resumirEstrategia, type ResumenEstrategia } from './estrategia.ts';
import { ARCHIVOS, escribirEnExpediente, leerDeExpediente, leerManifiesto, nombreExpediente, sellarManifiesto, serializar, type PlanesRonda } from './evidencia.ts';
import { reporteFinalMarkdown } from './reporte-final.ts';
import type { ResumenRondaArchivo } from './resumen.ts';
import { Telemetria } from './telemetria.ts';
import { sanitizarTexto, validarPlan, type ResultadoValidacion } from './validacion.ts';
import { construirEscaparate, construirVista, rondaPropia } from './vistas.ts';

export interface OpcionesControlador {
  rutas: Rutas;
  modo: 'prueba' | 'oficial';
  /** Semilla alternativa: sólo en modo prueba. */
  semilla?: number;
  autorizadoPor?: string | null;
  aislamiento?: 'proceso' | 'en-proceso';
  modulosEquipo?: Partial<Record<EmpresaId, string>>;
  rondasMaximas?: number;
  timeoutAgenteMs?: number;
  /** Resultado de pruebas críticas; obligatorio al crear la corrida. */
  preflight?: Preflight;
  idCorrida?: string;
}

export type FaseControlador = 'entre_rondas' | 'en_periodo' | 'terminado';

export interface EstadoControlador {
  corrida: string;
  modo: 'prueba' | 'oficial';
  semilla: number;
  aislamiento: 'proceso' | 'en-proceso';
  fase: FaseControlador;
  ronda: number;
  dia: number;
  diasPorPeriodo: number;
  rondasMaximas: number;
  ultimoSeq: number;
  ultimoHash: string;
  ganador: EmpresaId | null;
  motivoFin: string | null;
}

export class ErrorDeterminismo extends Error {
  override name = 'ErrorDeterminismo';
}

const TIMEOUT_AGENTE_MS = 30_000;
const PAD = (n: number) => String(n).padStart(2, '0');

/**
 * Harness de orquestación (sección 8 y apartado 16.5). Avanza el torneo día por
 * día o ronda por ronda; cada evento se sella en el diario antes de considerarse
 * confirmado. Al reiniciar el proceso retoma desde el diario sin duplicar eventos.
 */
export class Controlador {
  readonly rutas: Rutas;
  readonly ci: ConfigIndexada;
  readonly corrida: Corrida;
  readonly proyeccion: Proyeccion;
  readonly #diario: Diario;
  readonly #almacen: AlmacenRestringido;
  readonly #ejecutor: Ejecutor;
  readonly #telemetria: Telemetria;
  readonly #rondasMaximas: number;
  readonly #perfiles: Record<EmpresaId, string>;

  #estado: EstadoMercado;
  #sesion: SesionPeriodo | null = null;
  #ronda = 0;
  #ganador: EmpresaId | null = null;
  #motivoFin: string | null = null;
  #estadoInicialRonda: EstadoMercado | null = null;
  #planes: PlanesRonda | null = null;
  #planesContenido = '';
  #validaciones: Partial<Record<EmpresaId, ResultadoValidacion>> = {};
  #estrategiaPrevia: Record<EmpresaId, ResumenEstrategia | null> = { alfa: null, omega: null };
  #pendientes: Evento[] = [];
  #cola: Promise<unknown> = Promise.resolve();

  private constructor(args: {
    rutas: Rutas;
    ci: ConfigIndexada;
    corrida: Corrida;
    diario: Diario;
    almacen: AlmacenRestringido;
    ejecutor: Ejecutor;
    rondasMaximas: number;
    estado: EstadoMercado;
  }) {
    this.rutas = args.rutas;
    this.ci = args.ci;
    this.corrida = args.corrida;
    this.#diario = args.diario;
    this.#almacen = args.almacen;
    this.#ejecutor = args.ejecutor;
    this.#telemetria = new Telemetria(args.almacen);
    this.#rondasMaximas = args.rondasMaximas;
    this.#estado = args.estado;
    this.proyeccion = crearProyeccion(args.ci.cfg.dias_por_periodo);
    this.#perfiles = Object.fromEntries(
      EMPRESAS.map((e) => {
        const ruta = enCodigo(args.rutas, 'agents', e, 'perfil.json');
        const nombre = existsSync(ruta) ? (JSON.parse(readFileSync(ruta, 'utf8')) as { nombre?: string }).nombre : undefined;
        return [e, nombre ?? e.toUpperCase()];
      }),
    ) as Record<EmpresaId, string>;
  }

  // ---------------------------------------------------------------------------
  // Arranque y reanudación
  // ---------------------------------------------------------------------------

  static async iniciar(opciones: OpcionesControlador): Promise<Controlador> {
    const { rutas } = opciones;
    prepararEstructura(rutas);
    const ciBase = cargarConfig(rutaConfig(rutas));
    const candado = leerCandado(rutas);
    if (!candado || candado.hashConfig !== ciBase.hash) {
      throw new Error(
        'Las reglas no están selladas o cambiaron desde el último sellado. Una persona debe autorizarlas con: npm run sellar-reglas -- --autorizado-por "Nombre"',
      );
    }
    if (opciones.modo === 'oficial' && !opciones.autorizadoPor) throw new Error('El torneo oficial requiere --autorizado-por (supervisión humana).');
    if (opciones.modo === 'oficial' && opciones.semilla !== undefined && opciones.semilla !== ciBase.cfg.semilla) {
      throw new Error('El torneo oficial usa la semilla sellada en config/experiment.json.');
    }

    const almacen = new AlmacenRestringido(rutas, 'harness');
    let corrida = leerCorrida(rutas);
    if (corrida) {
      if (corrida.hashConfig !== ciBase.hash) throw new Error('La corrida se creó con otras reglas; inicia una corrida nueva.');
    } else {
      corrida = {
        id: opciones.idCorrida ?? (opciones.modo === 'oficial' ? 'oficial' : 'prueba'),
        modo: opciones.modo,
        semilla: opciones.semilla ?? ciBase.cfg.semilla,
        semillaConfig: ciBase.cfg.semilla,
        hashConfig: ciBase.hash,
        versionReglas: ciBase.cfg.version_reglas,
        autorizadoPor: opciones.autorizadoPor ?? null,
        aislamiento: opciones.modo === 'oficial' ? 'proceso' : (opciones.aislamiento ?? 'proceso'),
        creadaEn: new Date().toISOString(),
      };
      almacen.escribirJson(RELATIVAS.corrida, corrida);
    }
    if (corrida.modo === 'oficial') {
      // Se exige también al reanudar: corrida.json pudo editarse entre arranques.
      const sellada = ciBase.cfg.semilla;
      if (corrida.semilla !== sellada || corrida.semillaConfig !== sellada) throw new Error('La corrida oficial no usa la semilla sellada.');
      if (corrida.aislamiento !== 'proceso') throw new Error('La corrida oficial exige agentes en procesos aislados.');
      if (!corrida.autorizadoPor) throw new Error('La corrida oficial no registra autorización humana.');
    }
    const ci = configDeCorrida(ciBase, corrida);

    let preflight = leerPreflight(rutas);
    if (!preflight) {
      if (!opciones.preflight) throw new Error('Faltan las pruebas críticas: ejecuta npm run preflight antes del torneo.');
      almacen.escribirJson(RELATIVAS.preflight, opciones.preflight);
      preflight = opciones.preflight;
    }
    if (!preflight.aprobado) throw new Error(`Pruebas críticas fallidas (${preflight.fallidas}): ninguna ronda sería válida.`);
    if (preflight.hashConfig !== ci.hash) throw new Error('Las pruebas críticas se ejecutaron con otras reglas.');

    if (!almacen.existe(RELATIVAS.mercadoPublico)) almacen.escribirJson(RELATIVAS.mercadoPublico, ci.cfg);

    const diario = Diario.abrir(enCorrida(rutas, RELATIVAS.diario), hashGenesis(ci.hash, ci.cfg.semilla));
    const ejecutor = crearEjecutor(rutas, {
      // Quien ejecuta decide cómo aislar (un harness restringido no puede alojar al Juez en proceso).
      aislamiento: corrida.modo === 'oficial' ? 'proceso' : (opciones.aislamiento ?? corrida.aislamiento),
      modulos: opciones.modulosEquipo,
      timeoutMs: opciones.timeoutAgenteMs ?? TIMEOUT_AGENTE_MS,
    });
    const controlador = new Controlador({
      rutas,
      ci,
      corrida,
      diario,
      almacen,
      ejecutor,
      rondasMaximas: opciones.rondasMaximas ?? ci.cfg.rondas_maximas,
      estado: estadoInicial(ci),
    });
    await controlador.#reanudar();
    return controlador;
  }

  async #reanudar(): Promise<void> {
    const eventos = this.#diario.leer();
    for (const e of eventos) aplicarEvento(this.proyeccion, e);
    for (const e of EMPRESAS) {
      const propios = eventos.filter((x) => x.empresa === e);
      this.#almacen.escribirTexto(RELATIVAS.privado(e, 'eventos.jsonl'), serializarEventos(propios));
    }

    let cerradas = 0;
    while (leerManifiesto(this.rutas, cerradas + 1)) cerradas++;
    if (cerradas > 0) {
      this.#estado = JSON.parse(leerDeExpediente(this.rutas, cerradas, ARCHIVOS.estadoFinal) as string) as EstadoMercado;
      this.#ronda = cerradas;
      this.#restaurarEstrategia(
        JSON.parse(leerDeExpediente(this.rutas, cerradas, ARCHIVOS.planes) as string) as PlanesRonda,
        JSON.parse(leerDeExpediente(this.rutas, cerradas, ARCHIVOS.estadoInicial) as string) as EstadoMercado,
      );
      await this.#completarPostCierre(cerradas);
    }

    const veredictos = eventos.filter((e) => e.tipo === 'veredicto_emitido');
    const ultimo = veredictos.at(-1);
    if (ultimo && ultimo.tipo === 'veredicto_emitido') this.#evaluarFin(ultimo.ronda, ultimo.datos.resultado, ultimo.datos.ganador);
    if (this.#motivoFin) return;

    const abierta = eventos.some((e) => e.tipo === 'ronda_iniciada' && e.ronda === cerradas + 1);
    if (!abierta) return;
    const r = cerradas + 1;
    if (eventos.some((e) => e.tipo === 'cierre_periodo' && e.ronda === r)) {
      throw new Error(`La ronda ${r} se interrumpió durante el cierre; la reanudación en ese punto no está soportada (ver docs/BLOQUEOS.md).`);
    }
    const contenido = leerDeExpediente(this.rutas, r, ARCHIVOS.planes);
    if (contenido === null) {
      throw new Error(`La ronda ${r} se interrumpió durante la fase de decisión; la reanudación en ese punto no está soportada (ver docs/BLOQUEOS.md).`);
    }
    this.#ronda = r;
    this.#planesContenido = contenido;
    this.#planes = JSON.parse(contenido) as PlanesRonda;
    this.#estadoInicialRonda = structuredClone(this.#estado);
    this.#restaurarEstrategia(this.#planes, this.#estado);
    this.#pendientes = eventos
      .filter((e) => e.ronda === r && e.actor === 'mercado')
      .map((e) => ({ ronda: e.ronda, dia: e.dia, actor: e.actor, empresa: e.empresa, tipo: e.tipo, datos: e.datos }) as Evento);
    const { sesion, eventos: apertura } = abrirPeriodo({ ci: this.ci, estado: this.#estado, planes: this.#planesAplicados(), ronda: r });
    this.#sesion = sesion;
    this.#publicarMercado(apertura);
    const diasHechos = eventos.filter((e) => e.tipo === 'cierre_dia' && e.ronda === r).length;
    for (let d = 0; d < diasHechos; d++) this.#publicarMercado(simularDia(sesion));
    if (this.#pendientes.length > 0) {
      throw new ErrorDeterminismo(`quedaron ${this.#pendientes.length} eventos del diario sin reproducir al reanudar la ronda ${r}`);
    }
  }

  /** Reconstruye el resumen de estrategia vigente (base de STRATEGY_CHANGED y del resumen de ronda). */
  #restaurarEstrategia(planes: PlanesRonda, inicioRonda: EstadoMercado): void {
    for (const e of EMPRESAS) {
      const propuesto = planes[e].propuesto as PlanPeriodo | null;
      this.#estrategiaPrevia[e] = resumirEstrategia(
        this.ci,
        propuesto && typeof propuesto === 'object' && 'director' in propuesto ? propuesto : null,
        planes[e].aplicado,
        disponible(inicioRonda.empresas[e], this.ci.cfg.reserva_obligatoria),
        inicioRonda.empresas[e].precios,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------

  estado(): EstadoControlador {
    return {
      corrida: this.corrida.id,
      modo: this.corrida.modo,
      semilla: this.corrida.semilla,
      aislamiento: this.corrida.aislamiento,
      fase: this.#motivoFin ? 'terminado' : this.#sesion ? 'en_periodo' : 'entre_rondas',
      ronda: this.#ronda,
      dia: this.#sesion?.diasSimulados ?? 0,
      diasPorPeriodo: this.ci.cfg.dias_por_periodo,
      rondasMaximas: this.#rondasMaximas,
      ultimoSeq: this.#diario.ultimoSeq,
      ultimoHash: this.#diario.ultimoHash,
      ganador: this.#ganador,
      motivoFin: this.#motivoFin,
    };
  }

  get terminado(): boolean {
    return this.#motivoFin !== null;
  }

  suscribir(fn: (eventos: readonly EventoSellado[]) => void): () => void {
    return this.#diario.suscribir(fn);
  }

  /** Ejecuta un día simulado (si hay ronda nueva, primero la fase de decisión). */
  avanzarDia(): Promise<void> {
    return this.#exclusivo(async () => {
      if (this.terminado) return;
      if (!this.#sesion) await this.#abrirRonda(this.#ronda + 1);
      const sesion = this.#sesion;
      if (!sesion) return;
      if (!periodoCompleto(sesion)) this.#simularUnDia(sesion);
      if (periodoCompleto(sesion)) await this.#cerrarRonda(sesion);
    });
  }

  /** Ejecuta lo que falte de la semana simulada en curso, incluido el cierre y el juicio. */
  avanzarRonda(): Promise<void> {
    return this.#exclusivo(async () => {
      if (this.terminado) return;
      if (!this.#sesion) await this.#abrirRonda(this.#ronda + 1);
      const sesion = this.#sesion;
      if (!sesion) return;
      while (!periodoCompleto(sesion)) this.#simularUnDia(sesion);
      await this.#cerrarRonda(sesion);
    });
  }

  async correrHastaFin(): Promise<EstadoControlador> {
    while (!this.terminado) await this.avanzarRonda();
    return this.estado();
  }

  // ---------------------------------------------------------------------------
  // Fases de la ronda
  // ---------------------------------------------------------------------------

  #exclusivo(fn: () => Promise<void>): Promise<void> {
    const siguiente = this.#cola.then(fn);
    this.#cola = siguiente.catch(() => undefined);
    return siguiente;
  }

  #evento<K extends TipoEvento>(tipo: K, empresa: EmpresaId | null, datos: DatosPorTipo[K], actor: Principal, dia = 0): Evento {
    return { ronda: this.#ronda, dia, actor, empresa, tipo, datos } as unknown as Evento;
  }

  #publicar(eventos: readonly Evento[]): EventoSellado[] {
    const sellados = this.#diario.publicar(eventos);
    for (const e of sellados) aplicarEvento(this.proyeccion, e);
    for (const empresa of EMPRESAS) {
      const propios = sellados.filter((e) => e.empresa === empresa);
      if (propios.length > 0) this.#almacen.anexarTexto(RELATIVAS.privado(empresa, 'eventos.jsonl'), serializarEventos(propios));
    }
    return sellados;
  }

  /** Publica eventos del motor; al reanudar, primero los coteja con los ya sellados. */
  #publicarMercado(eventos: readonly Evento[]): void {
    const nuevos: Evento[] = [];
    for (const e of eventos) {
      const esperado = this.#pendientes.shift();
      if (esperado === undefined) {
        nuevos.push(e);
      } else if (hashCanonico(esperado) !== hashCanonico(e)) {
        throw new ErrorDeterminismo(`al reanudar, el motor produjo ${e.tipo} (día ${e.dia}) distinto del registrado (${esperado.tipo})`);
      }
    }
    if (nuevos.length > 0) this.#publicar(nuevos);
  }

  #planesAplicados(): Record<EmpresaId, PlanesRonda[EmpresaId]['aplicado']> {
    if (!this.#planes) throw new Error('no hay planes para la ronda');
    return { alfa: this.#planes.alfa.aplicado, omega: this.#planes.omega.aplicado };
  }

  /** Historial propio de cada empresa: lo guarda el harness en data/harness/, fuera del alcance de escritura de los agentes. */
  #historial(empresa: EmpresaId): RondaPropia[] {
    const ruta = RELATIVAS.historial(empresa);
    return this.#almacen.existe(ruta) ? this.#almacen.leerJson<RondaPropia[]>(ruta) : [];
  }

  #resultadosPublicos(): ResultadoPublico[] {
    return this.#almacen.existe(RELATIVAS.resultadosPublicos) ? this.#almacen.leerJson<ResultadoPublico[]>(RELATIVAS.resultadosPublicos) : [];
  }

  #vista(empresa: EmpresaId, ronda: number) {
    const rival = empresa === 'alfa' ? 'omega' : 'alfa';
    const escaparate = RELATIVAS.escaparate(rival);
    return construirVista({
      ci: this.ci,
      empresa,
      ronda,
      estado: this.#estado,
      historial: this.#historial(empresa),
      escaparateRival: this.#almacen.existe(escaparate) ? this.#almacen.leerJson<Escaparate>(escaparate) : null,
      resultados: this.#resultadosPublicos(),
    });
  }

  #registrarAgente(r: ResultadoAislado<unknown>, empresa: EmpresaId | null, operacion: OperacionEquipo | 'juzgar', recuperacion: string | null): void {
    this.#telemetria.registrar({
      tipo: operacion === 'juzgar' ? 'juez' : 'agente',
      ronda: this.#ronda,
      empresa,
      operacion,
      ms: r.ms,
      cpuUsuarioUs: r.telemetria.cpuUsuarioUs,
      cpuSistemaUs: r.telemetria.cpuSistemaUs,
      memoriaMaxKb: r.telemetria.memoriaMaxKb,
      ok: r.ok,
      error: r.ok ? null : (r.error ?? 'error desconocido'),
      recuperacion: r.ok ? null : recuperacion,
      redBloqueada: r.redBloqueada,
    });
  }

  /** Incidentes de acceso que el proceso del agente reportó (bloqueados por ACL o por --permission). */
  #incidentesAcceso(empresa: EmpresaId, r: ResultadoAislado<unknown>): Evento[] {
    return r.incidentes.map((i) =>
      this.#evento(
        'incidente',
        empresa,
        {
          codigo: i.operacion === 'escritura' ? 'escritura_prohibida' : 'acceso_denegado',
          severidad: severidadDe(this.ci.cfg, i.operacion === 'escritura' ? 'escritura_prohibida' : 'acceso_denegado'),
          principal: i.principal,
          detalle: `${i.operacion} de ${i.ruta} bloqueada: ${i.motivo}`,
        },
        'harness',
      ),
    );
  }

  #fase(operacion: string, inicio: number): void {
    this.#telemetria.registrar({
      tipo: 'fase',
      ronda: this.#ronda,
      empresa: null,
      operacion,
      ms: performance.now() - inicio,
      cpuUsuarioUs: 0,
      cpuSistemaUs: 0,
      memoriaMaxKb: 0,
      ok: true,
      error: null,
      recuperacion: null,
    });
  }

  async #abrirRonda(ronda: number): Promise<void> {
    const inicio = performance.now();
    this.#ronda = ronda;
    this.#estadoInicialRonda = structuredClone(this.#estado);
    this.#publicar([
      this.#evento(
        'ronda_iniciada',
        null,
        { semilla: this.ci.cfg.semilla, modo: this.corrida.modo, hashConfig: this.ci.hash, diaGlobalInicio: this.#estado.diaGlobal + 1 },
        'harness',
      ),
    ]);

    const vistas = { alfa: this.#vista('alfa', ronda), omega: this.#vista('omega', ronda) };
    const respuestas = await Promise.all(EMPRESAS.map((e) => this.#ejecutor.equipo<unknown>(e, 'decidir', ronda, vistas[e])));
    const planes = {} as PlanesRonda;
    EMPRESAS.forEach((empresa, i) => {
      planes[empresa] = this.#procesarDecision(empresa, respuestas[i] as ResultadoAislado<unknown>);
    });
    this.#planes = planes;
    this.#planesContenido = serializar(planes);
    this.#almacen.escribirTexto(`${RELATIVAS.expediente(ronda)}/${ARCHIVOS.planes}`, this.#planesContenido);

    const { sesion, eventos } = abrirPeriodo({ ci: this.ci, estado: this.#estado, planes: this.#planesAplicados(), ronda });
    this.#sesion = sesion;
    this.#publicarMercado(eventos);
    this.#fase('decision', inicio);
  }

  #procesarDecision(empresa: EmpresaId, respuesta: ResultadoAislado<unknown>): PlanesRonda[EmpresaId] {
    const { cfg } = this.ci;
    this.#registrarAgente(respuesta, empresa, 'decidir', 'plan neutro');
    const eventos: Evento[] = this.#incidentesAcceso(empresa, respuesta);
    const crudo = respuesta.ok ? respuesta.resultado : null;
    if (!respuesta.ok) {
      eventos.push(
        this.#evento(
          'incidente',
          empresa,
          { codigo: 'fallo_agente', severidad: 'leve', principal: `${empresa}:director`, detalle: `${respuesta.error ?? 'sin respuesta'}; recuperación: se aplica el plan neutro` },
          'harness',
        ),
      );
    }
    const emp = this.#estado.empresas[empresa];
    const v = validarPlan(crudo, { ci: this.ci, empresa, ronda: this.#ronda, estado: emp });
    this.#validaciones[empresa] = v;
    eventos.push(
      this.#evento(
        'plan_recibido',
        empresa,
        { hashPlan: hashCanonico(crudo ?? null), estrategia: v.valido ? sanitizarTexto(v.valido.director.estrategia, cfg.limites.estrategia_max_caracteres) : '(sin plan válido)' },
        `${empresa}:director`,
      ),
    );
    for (const r of v.rechazos) eventos.push(this.#evento('decision_rechazada', empresa, { rol: r.rol, codigo: r.codigo, detalle: r.detalle }, 'harness'));
    if (v.rechazos.length > 0) {
      eventos.push(
        this.#evento(
          'incidente',
          empresa,
          {
            codigo: 'decision_invalida',
            severidad: severidadDe(cfg, 'decision_invalida'),
            principal: `${empresa}:director`,
            detalle: `${v.rechazos.length} decisiones rechazadas por el validador (${[...new Set(v.rechazos.map((r) => r.codigo))].join(', ')})`,
          },
          'harness',
        ),
      );
    }
    for (const s of v.sospechosos) {
      eventos.push(
        this.#evento(
          'incidente',
          empresa,
          { codigo: 'texto_sospechoso', severidad: severidadDe(cfg, 'texto_sospechoso'), principal: `${empresa}:${s.campo.split(/[.[ ]/)[0]}`, detalle: `${s.campo}: «${s.fragmento}» (se ignora; el texto nunca se ejecuta)` },
          'harness',
        ),
      );
    }
    if (v.valido) {
      for (const rol of ROLES_COMERCIALES) {
        eventos.push(
          this.#evento(
            'decision_registrada',
            empresa,
            {
              rol,
              resumen: sanitizarTexto(resumenDecision(rol, v), 400),
              hipotesis: { ...v.valido[rol].hipotesis, texto: sanitizarTexto(v.valido[rol].hipotesis.texto, 400) },
              presupuestoComprometido: v.comprometido[rol],
              hashDecision: hashCanonico(v.valido[rol]),
            },
            `${empresa}:${rol}`,
          ),
        );
      }
    }
    const estrategia = resumirEstrategia(this.ci, v.valido, v.aplicado, disponible(emp, cfg.reserva_obligatoria), emp.precios);
    const cambios = diferenciasEstrategia(this.#estrategiaPrevia[empresa], estrategia);
    if (cambios.length > 0) {
      eventos.push(
        this.#evento(
          'estrategia_cambiada',
          empresa,
          { estrategia: v.valido ? sanitizarTexto(v.valido.director.estrategia, 300) : '(plan neutro)', cambios },
          `${empresa}:director`,
        ),
      );
    }
    this.#estrategiaPrevia[empresa] = estrategia;
    eventos.push(
      this.#evento(
        'plan_aplicado',
        empresa,
        {
          hashPlan: hashCanonico(v.aplicado),
          ordenes: v.aplicado.ordenes.length,
          campanas: v.aplicado.campanas.length,
          promociones: v.aplicado.promociones.length,
          preciosCambiados: Object.entries(v.aplicado.precios).filter(([sku, p]) => emp.precios[sku] !== p).length,
          listado: v.aplicado.listado,
        },
        'harness',
      ),
    );
    this.#publicar(eventos);
    const registro = { propuesto: crudo, aplicado: v.aplicado, rechazos: v.rechazos };
    this.#almacen.escribirJson(RELATIVAS.privado(empresa, `decisiones/ronda-${PAD(this.#ronda)}.json`), registro);
    return registro;
  }

  #simularUnDia(sesion: SesionPeriodo): void {
    const inicio = performance.now();
    this.#publicarMercado(simularDia(sesion));
    for (const e of EMPRESAS) {
      this.#almacen.escribirJson(RELATIVAS.escaparate(e), construirEscaparate(this.ci, sesion.estado, e, this.#ronda, sesion.diasSimulados));
    }
    this.#fase('dia', inicio);
  }

  async #cerrarRonda(sesion: SesionPeriodo): Promise<void> {
    const inicio = performance.now();
    const ronda = this.#ronda;
    const { cfg } = this.ci;
    const { estado, eventosCierre } = cerrarPeriodo(sesion);
    this.#publicarMercado(eventosCierre);
    this.#estado = estado;
    this.#sesion = null;

    const contables = await Promise.all(EMPRESAS.map((e) => this.#ejecutor.equipo<unknown>(e, 'contabilizar', ronda)));
    const reportes = {} as Record<EmpresaId, ReporteFinanciero | null>;
    const libros = {} as Record<EmpresaId, string | null>;
    const incidentes: Evento[] = [];
    EMPRESAS.forEach((e, i) => {
      const r = contables[i] as ResultadoAislado<unknown>;
      this.#registrarAgente(r, e, 'contabilizar', 'el Juez audita sin reporte');
      incidentes.push(...this.#incidentesAcceso(e, r));
      const parseado = r.ok ? ReporteFinancieroSchema.safeParse(r.resultado) : null;
      reportes[e] = parseado?.success ? parseado.data : null;
      if (!reportes[e]) {
        incidentes.push(
          this.#evento('incidente', e, { codigo: 'fallo_agente', severidad: 'leve', principal: `${e}:finanzas`, detalle: `sin reporte financiero válido: ${r.error ?? 'formato inválido'}` }, 'harness', cfg.dias_por_periodo),
        );
      }
      libros[e] = this.#libroValidado(e);
      if (r.ok && libros[e] === null) {
        incidentes.push(
          this.#evento(
            'incidente',
            e,
            { codigo: 'discrepancia_contable', severidad: severidadDe(cfg, 'discrepancia_contable'), principal: `${e}:finanzas`, detalle: 'libro mayor ausente, ilegible o con formato inválido' },
            'harness',
            cfg.dias_por_periodo,
          ),
        );
      }
    });
    this.#publicar(incidentes);

    const sellado = this.#resumenRonda(ronda, estado, libros);
    const contenidoResumen = serializar(sellado);
    for (const e of EMPRESAS) {
      const historial = this.#historial(e).filter((h) => h.ronda < ronda);
      this.#almacen.escribirJson(RELATIVAS.historial(e), [...historial, rondaPropia(this.#diario.leer(this.#seqInicio(ronda)), this.proyeccion, estado, e, ronda)]);
    }
    this.#publicar([
      this.#evento(
        'cierre_periodo',
        null,
        {
          hashEstadoFinal: hashCanonico(estado),
          eventosMercado: sesion.eventos.length,
          hashResumen: sha256(contenidoResumen),
          hashLibros: { alfa: libros.alfa ? sha256(libros.alfa) : '', omega: libros.omega ? sha256(libros.omega) : '' },
        },
        'harness',
        cfg.dias_por_periodo,
      ),
    ]);
    this.#escribirExpediente(ronda, estado, libros, reportes, contenidoResumen);
    this.#almacen.escribirJson(RELATIVAS.resumenRonda(ronda), sellado);
    this.#fase('cierre', inicio);
    await this.#completarPostCierre(ronda);
  }

  /** El libro lo escribe el agente: sólo entra a la evidencia si cumple el esquema y es de su empresa. */
  #libroValidado(empresa: EmpresaId): string | null {
    const ruta = RELATIVAS.privado(empresa, 'libro-mayor.json');
    if (!this.#almacen.existe(ruta)) return null;
    try {
      const contenido = this.#almacen.leerTexto(ruta);
      const libro = LibroMayorSchema.parse(JSON.parse(contenido));
      return libro.empresa === empresa ? contenido : null;
    } catch {
      return null;
    }
  }

  #seqInicio(ronda: number): number {
    const anterior = ronda > 1 ? leerManifiesto(this.rutas, ronda - 1) : null;
    return anterior ? anterior.seqFin + 1 : 0;
  }

  #escribirExpediente(
    ronda: number,
    estado: EstadoMercado,
    libros: Record<EmpresaId, string | null>,
    reportes: Record<EmpresaId, ReporteFinanciero | null>,
    contenidoResumen: string,
  ): void {
    const anterior = ronda > 1 ? leerManifiesto(this.rutas, ronda - 1) : null;
    const seqInicio = anterior ? anterior.seqFin + 1 : 0;
    const eventos = this.#diario.leer(seqInicio);
    const primero = eventos[0];
    const ultimo = eventos.at(-1);
    if (!primero || !ultimo) throw new Error('expediente sin eventos');
    const preflight = this.#almacen.leerTexto(RELATIVAS.preflight);

    const archivos = [
      escribirEnExpediente(this.#almacen, ronda, ARCHIVOS.estadoInicial, serializar(this.#estadoInicialRonda)),
      escribirEnExpediente(this.#almacen, ronda, ARCHIVOS.planes, this.#planesContenido),
      escribirEnExpediente(this.#almacen, ronda, ARCHIVOS.eventos, serializarEventos(eventos)),
      escribirEnExpediente(this.#almacen, ronda, ARCHIVOS.estadoFinal, serializar(estado)),
      escribirEnExpediente(this.#almacen, ronda, ARCHIVOS.resumen, contenidoResumen),
    ];
    for (const e of EMPRESAS) {
      const libro = libros[e];
      const reporte = reportes[e];
      if (libro !== null) archivos.push(escribirEnExpediente(this.#almacen, ronda, ARCHIVOS.libro(e), libro));
      if (reporte) archivos.push(escribirEnExpediente(this.#almacen, ronda, ARCHIVOS.reporte(e), serializar(reporte)));
    }
    const manifiesto = sellarManifiesto({
      expediente: nombreExpediente(ronda),
      ronda,
      modo: this.corrida.modo,
      versionReglas: this.ci.cfg.version_reglas,
      hashConfig: this.ci.hash,
      semilla: this.ci.cfg.semilla,
      hashPreflight: sha256(preflight),
      hashExpedienteAnterior: anterior?.hashExpediente ?? null,
      seqInicio,
      seqFin: ultimo.seq,
      prevHashInicio: primero.prevHash,
      hashFin: ultimo.hash,
      archivos,
    });
    this.#almacen.escribirJson(`${RELATIVAS.expediente(ronda)}/${ARCHIVOS.manifiesto}`, manifiesto);
  }

  /** Juicio, publicación de resultados y aprendizaje. Idempotente: retoma lo que falte. */
  async #completarPostCierre(ronda: number): Promise<void> {
    const eventos = this.#diario.leer(this.#seqInicio(ronda));
    let veredicto = eventos.find((e) => e.tipo === 'veredicto_emitido' && e.ronda === ronda);
    if (!veredicto) {
      const inicio = performance.now();
      const rutaSentencia = RELATIVAS.veredicto(ronda, 'json');
      const r: ResultadoAislado<ResumenVeredicto> = this.#almacen.existe(rutaSentencia)
        ? sentenciaYaEmitida(this.#almacen.leerJson<ResumenVeredicto>(rutaSentencia))
        : await this.#ejecutor.juez(ronda);
      this.#registrarAgente(r, null, 'juzgar', null);
      if (!r.ok || !r.resultado) {
        this.#publicar([
          this.#evento('incidente', null, { codigo: 'fallo_juez', severidad: 'critica', principal: 'juez', detalle: r.error ?? 'el Juez no respondió' }, 'harness', this.ci.cfg.dias_por_periodo),
        ]);
        this.#motivoFin = `Torneo detenido: el Juez no pudo emitir la resolución de la ronda ${ronda} (${r.error ?? 'sin respuesta'}).`;
        return;
      }
      const v: ResumenVeredicto = r.resultado;
      [veredicto] = this.#publicar([
        this.#evento(
          'veredicto_emitido',
          null,
          { expediente: v.expediente, resultado: v.resultado, ganador: v.ganador, hashExpediente: v.hashExpediente, hashVeredicto: v.hashVeredicto },
          'juez',
          this.ci.cfg.dias_por_periodo,
        ),
      ]);
      this.#fase('juicio', inicio);
    }
    if (!veredicto || veredicto.tipo !== 'veredicto_emitido') return;

    const resultados = this.#resultadosPublicos().filter((x) => x.ronda !== ronda);
    const resumen = resumenRonda(this.proyeccion, ronda);
    this.#almacen.escribirJson(RELATIVAS.resultadosPublicos, [
      ...resultados,
      {
        ronda,
        expediente: veredicto.datos.expediente,
        resultado: veredicto.datos.resultado,
        ganador: veredicto.datos.ganador,
        ventasNetas: { alfa: resumen?.alfa.financiero.ventasNetas ?? 0, omega: resumen?.omega.financiero.ventasNetas ?? 0 },
      } satisfies ResultadoPublico,
    ]);

    const pendientes = EMPRESAS.filter((e) => !eventos.some((x) => x.tipo === 'memoria_actualizada' && x.ronda === ronda && x.empresa === e));
    const inicio = performance.now();
    const respuestas = await Promise.all(pendientes.map((e) => this.#ejecutor.equipo<{ hashMemoria: string; lecciones: string[] }>(e, 'aprender', ronda, this.#vista(e, ronda))));
    const nuevos: Evento[] = [];
    const lecciones: Partial<Record<EmpresaId, string[]>> = {};
    pendientes.forEach((e, i) => {
      const r = respuestas[i] as ResultadoAislado<{ hashMemoria: string; lecciones: string[] }>;
      this.#registrarAgente(r, e, 'aprender', 'la memoria queda sin cambios');
      nuevos.push(...this.#incidentesAcceso(e, r));
      if (r.ok && r.resultado) {
        lecciones[e] = (Array.isArray(r.resultado.lecciones) ? r.resultado.lecciones : []).slice(0, 12).map((l) => sanitizarTexto(String(l), 300));
        nuevos.push(this.#evento('memoria_actualizada', e, { hashMemoria: r.resultado.hashMemoria, lecciones: lecciones[e] ?? [] }, `${e}:director`, this.ci.cfg.dias_por_periodo));
      } else {
        nuevos.push(
          this.#evento('incidente', e, { codigo: 'fallo_agente', severidad: 'leve', principal: `${e}:director`, detalle: `aprendizaje fallido: ${r.error}; recuperación: memoria sin cambios` }, 'harness', this.ci.cfg.dias_por_periodo),
        );
      }
    });
    this.#publicar(nuevos);
    if (pendientes.length > 0) this.#fase('aprendizaje', inicio);

    const rutaResumen = RELATIVAS.resumenRonda(ronda);
    if (this.#almacen.existe(rutaResumen)) {
      const archivo = this.#almacen.leerJson<ResumenRondaArchivo>(rutaResumen);
      for (const e of EMPRESAS) if (lecciones[e]) archivo.empresas[e].lecciones = lecciones[e] ?? [];
      this.#almacen.escribirJson(rutaResumen, archivo);
    }
    this.#evaluarFin(ronda, veredicto.datos.resultado, veredicto.datos.ganador);
    if (this.#motivoFin) this.#escribirReporteFinal();
  }

  #evaluarFin(ronda: number, resultado: ResumenVeredicto['resultado'], ganador: EmpresaId | null): void {
    if (resultado === 'ganador' && ganador) {
      this.#ganador = ganador;
      this.#motivoFin = `${ganador.toUpperCase()} cumplió todas las condiciones de victoria en la ronda ${ronda}, validadas por el Juez.`;
    } else if (resultado === 'ronda_invalida') {
      this.#motivoFin = `El Juez suspendió la ronda ${ronda} por incidencias críticas; el torneo se detiene hasta revisión humana.`;
    } else if (ronda >= this.#rondasMaximas) {
      this.#motivoFin = `Se alcanzó el máximo de ${this.#rondasMaximas} rondas sin que ninguna empresa cumpliera las condiciones de victoria.`;
    }
  }

  #resumenRonda(ronda: number, estado: EstadoMercado, libros: Record<EmpresaId, string | null>): ResumenRondaArchivo {
    const { cfg } = this.ci;
    const resumen = resumenRonda(this.proyeccion, ronda);
    if (!resumen) throw new Error(`sin datos de la ronda ${ronda}`);
    const eventos = this.#diario.leer(this.#seqInicio(ronda)).filter((e) => e.ronda === ronda);
    const totalNetas = resumen.alfa.financiero.ventasNetas + resumen.omega.financiero.ventasNetas;
    const diaGlobalInicio = (ronda - 1) * cfg.dias_por_periodo + 1;
    const empresas = {} as ResumenRondaArchivo['empresas'];

    for (const e of EMPRESAS) {
      const r = resumen[e];
      const propia = rondaPropia(eventos, this.proyeccion, estado, e, ronda);
      const decisiones = this.proyeccion.decisiones
        .filter((d) => d.ronda === ronda && d.empresa === e)
        .map((d) => {
          const observado = valorObservado(d.hipotesis.metrica, r);
          return { ...d, hipotesis: { ...d.hipotesis }, observado, cumplida: observado === null ? null : observado >= d.hipotesis.valor };
        });
      const rechazos = eventos.flatMap((x) => (x.tipo === 'decision_rechazada' && x.empresa === e ? [{ ...x.datos }] : []));
      const rechazosPorRol: Record<string, number> = {};
      for (const x of rechazos) rechazosPorRol[x.rol] = (rechazosPorRol[x.rol] ?? 0) + 1;
      let diferencias: string[] = ['libro mayor no disponible'];
      const libro = libros[e];
      if (libro !== null) {
        const contable = indicadoresContables(JSON.parse(libro) as LibroMayor, ronda);
        diferencias = (Object.keys(contable) as Array<keyof typeof contable>)
          .filter((k) => contable[k] !== r.financiero[k])
          .map((k) => `${k}: libro ${contable[k]} ≠ eventos ${r.financiero[k]}`);
      }
      empresas[e] = {
        resumen: r,
        calidad: evaluarCalidad({
          resumen: r,
          hipotesis: Object.fromEntries(decisiones.map((d) => [d.rol, { cumplida: d.cumplida, valor: d.hipotesis.valor, observado: d.observado }])),
          rechazosPorRol,
          incidentes: eventos.filter((x) => x.tipo === 'incidente' && x.empresa === e).length,
          capital: cfg.capital_inicial,
          unidadesFinales: Object.values(propia.existenciasFinales).reduce((a, b) => a + b, 0),
          unidadesVendidas: Object.values(propia.ventasPorSku).reduce((a, v) => a + v.vendidas, 0),
        }),
        estrategia: this.#estrategiaPrevia[e],
        decisiones,
        ventasPorSku: propia.ventasPorSku,
        campanas: propia.campanas,
        existenciasFinales: propia.existenciasFinales,
        precios: propia.precios,
        rechazos,
        lecciones: [],
        conciliacion: { libroVsEventos: diferencias.length === 0, diferencias },
      };
    }
    return {
      ronda,
      expediente: nombreExpediente(ronda),
      modo: this.corrida.modo,
      semilla: cfg.semilla,
      periodo: {
        diaGlobalInicio,
        diaGlobalFin: ronda * cfg.dias_por_periodo,
        fechaInicio: fechaSimulada(cfg.fecha_inicio_simulada, diaGlobalInicio),
        fechaFin: fechaSimulada(cfg.fecha_inicio_simulada, ronda * cfg.dias_por_periodo),
      },
      perfiles: this.#perfiles,
      participacion: {
        alfa: totalNetas > 0 ? resumen.alfa.financiero.ventasNetas / totalNetas : 0,
        omega: totalNetas > 0 ? resumen.omega.financiero.ventasNetas / totalNetas : 0,
      },
      empresas,
    };
  }

  #escribirReporteFinal(): void {
    const rondas: ResumenRondaArchivo[] = [];
    for (let r = 1; this.#almacen.existe(RELATIVAS.resumenRonda(r)); r++) rondas.push(this.#almacen.leerJson<ResumenRondaArchivo>(RELATIVAS.resumenRonda(r)));
    this.#almacen.escribirTexto(
      'reports/reporte-final.md',
      reporteFinalMarkdown({
        ci: this.ci,
        corrida: this.corrida,
        rondas,
        resultados: this.#resultadosPublicos(),
        ganador: this.#ganador,
        motivoFin: this.#motivoFin ?? '',
        ultimoHash: this.#diario.ultimoHash,
      }),
    );
  }
}

/** Reanudación: la sentencia ya está en disco (inmutable); sólo falta sellar su evento. */
function sentenciaYaEmitida(s: ResumenVeredicto): ResultadoAislado<ResumenVeredicto> {
  return {
    ok: true,
    resultado: {
      expediente: s.expediente,
      resultado: s.resultado,
      ganador: s.ganador,
      hashExpediente: s.hashExpediente ?? '0'.repeat(64),
      hashVeredicto: s.hashVeredicto,
      incidencias: 0,
      motivo: s.motivo,
    },
    incidentes: [],
    telemetria: { cpuUsuarioUs: 0, cpuSistemaUs: 0, memoriaMaxKb: 0 },
    ms: 0,
    codigoSalida: 0,
    stderr: '',
    redBloqueada: false,
  };
}

function resumenDecision(rol: RolComercial, v: ResultadoValidacion): string {
  const p = v.valido;
  if (!p) return '(sin decisión válida)';
  const a = v.aplicado;
  switch (rol) {
    case 'director':
      return p.director.estrategia.slice(0, 240);
    case 'compras':
      return `${a.ordenes.length} órdenes (${a.ordenes.reduce((s, o) => s + o.unidades, 0)} u) a ${[...new Set(a.ordenes.map((o) => o.proveedorId))].join(', ') || '—'}; ${a.reposicion.length} reglas de reposición.`;
    case 'marketing':
      return a.campanas.length === 0 ? 'Sin campañas.' : a.campanas.map((c) => `${c.canal}/${c.segmento}/${c.angulo}`).join('; ');
    case 'ventas':
      return `${Object.keys(a.precios).length} precios, ${a.listado.length} productos listados, ${a.promociones.length} promociones, envío gratis desde ${(a.envio.gratisDesde / 100).toFixed(0)} MXN.`;
    case 'finanzas':
      return `Aprobado. Caja proyectada ${(p.finanzas.proyeccionCajaFinal / 100).toFixed(0)} MXN; ${p.finanzas.ajustes.length} ajustes; ${p.finanzas.alertas.length} alertas.`;
  }
}
