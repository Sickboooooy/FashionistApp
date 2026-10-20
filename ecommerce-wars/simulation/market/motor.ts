import type { ConfigIndexada } from '../../shared/config.ts';
import { rngPara } from '../../shared/rng.ts';
import { filtrar, type Evento } from '../../shared/schemas/eventos.ts';
import { EMPRESAS, type EmpresaId } from '../../shared/types/dominio.ts';
import { obtenerPoblacion } from '../customers/poblacion.ts';
import { cargarObligacion, gastar, puedeGastar } from '../economics/tesoreria.ts';
import { redondear6, totalUnidades } from '../inventory/inventario.ts';
import { emitirOrden, ejecutarReposicion, recibirOrdenes } from '../suppliers/proveedores.ts';
import { emitir, ordenEmpresas, traficoVacio, type ContextoDia } from './contexto.ts';
import type { EstadoMercado, PlanAplicado } from './estado.ts';
import { cerrarPedidosDelDia, procesarDevoluciones } from './pedidos.ts';
import { ejecutarCampanas } from './publicidad.ts';
import { consolidarVisitantes, generarOrganicos, procesarVisita } from './visitas.ts';

export interface EntradaPeriodo {
  ci: ConfigIndexada;
  estado: EstadoMercado;
  planes: Record<EmpresaId, PlanAplicado>;
  ronda: number;
}

export interface SalidaPeriodo {
  estado: EstadoMercado;
  eventos: Evento[];
}

/**
 * Sesión de un periodo en curso. Permite avanzar día por día (War Room) con el
 * mismo resultado que una corrida completa: cada día usa flujos aleatorios
 * derivados de (semilla, ronda, día), independientes del ritmo de ejecución.
 */
export interface SesionPeriodo {
  readonly ci: ConfigIndexada;
  readonly ronda: number;
  readonly planes: Record<EmpresaId, PlanAplicado>;
  readonly estado: EstadoMercado;
  readonly eventos: Evento[];
  diasSimulados: number;
  cerrada: boolean;
}

export function abrirPeriodo(entrada: EntradaPeriodo): { sesion: SesionPeriodo; eventos: Evento[] } {
  const { ci, ronda } = entrada;
  if (ronda !== entrada.estado.rondaCompletada + 1) {
    throw new RangeError(`ronda ${ronda} fuera de secuencia (última completada: ${entrada.estado.rondaCompletada})`);
  }
  const estado = structuredClone(entrada.estado);
  const sesion: SesionPeriodo = {
    ci,
    ronda,
    planes: structuredClone(entrada.planes),
    estado,
    eventos: [],
    diasSimulados: 0,
    cerrada: false,
  };
  if (ronda === 1 && estado.diaGlobal === 0) {
    const ctx = { ronda, dia: 0, eventos: sesion.eventos };
    for (const empresa of EMPRESAS) emitir(ctx, 'capital_inicial', empresa, { monto: estado.empresas[empresa].caja });
  }
  return { sesion, eventos: [...sesion.eventos] };
}

export function periodoCompleto(sesion: SesionPeriodo): boolean {
  return sesion.diasSimulados >= sesion.ci.cfg.dias_por_periodo;
}

function crearContexto(sesion: SesionPeriodo, dia: number): ContextoDia {
  const { ci, ronda, estado } = sesion;
  const m = ci.cfg.mercado;
  const flujo = (nombre: string) => rngPara(ci.cfg.semilla, 'mercado', ronda, dia, nombre);
  const trafico = flujo('trafico');
  const ciclo = 1 + m.ciclo_rondas.amplitud * Math.sin((2 * Math.PI * (ronda - 1)) / m.ciclo_rondas.periodo);
  const estacional = m.estacionalidad_semanal[dia - 1] ?? 1;
  return {
    ci,
    ronda,
    dia,
    diaGlobal: estado.diaGlobal,
    factorDia: estacional * ciclo * Math.exp(trafico.normal(0, m.ruido_dia)),
    estado,
    eventos: [],
    poblacion: obtenerPoblacion(ci),
    rng: {
      trafico,
      visitas: flujo('visitas'),
      logistica: flujo('logistica'),
      publicidad: flujo('publicidad'),
      proveedores: flujo('proveedores'),
    },
    trafico: { alfa: traficoVacio(), omega: traficoVacio() },
    pedidosDelDia: [],
  };
}

function mejorarFichas(ctx: ContextoDia, empresa: EmpresaId, sku: string, pasos: number): void {
  const { costos, reserva_obligatoria } = ctx.ci.cfg;
  const emp = ctx.estado.empresas[empresa];
  for (let i = 0; i < pasos; i++) {
    const anterior = emp.fichas[sku] ?? 0;
    if (anterior >= 1) return;
    if (!puedeGastar(emp, costos.mejora_ficha, reserva_obligatoria)) {
      emitir(ctx, 'ficha_rechazada', empresa, { sku, motivo: 'saldo_insuficiente' });
      return;
    }
    gastar(emp, costos.mejora_ficha, reserva_obligatoria);
    const nueva = redondear6(Math.min(1, anterior + costos.incremento_ficha));
    emp.fichas[sku] = nueva;
    emitir(ctx, 'ficha_mejorada', empresa, { sku, costo: costos.mejora_ficha, calidadAnterior: anterior, calidadNueva: nueva });
  }
}

function aplicarPlan(ctx: ContextoDia, empresa: EmpresaId, plan: PlanAplicado): void {
  const emp = ctx.estado.empresas[empresa];
  for (const [sku, nuevo] of Object.entries(plan.precios)) {
    const anterior = emp.precios[sku];
    if (anterior === undefined || anterior === nuevo) continue;
    emp.precios[sku] = nuevo;
    emitir(ctx, 'precio_cambiado', empresa, { sku, anterior, nuevo });
  }
  const listado = new Set(plan.listado);
  emp.listado = ctx.ci.cfg.productos.map((p) => p.sku).filter((sku) => listado.has(sku));
  emp.promociones = structuredClone(plan.promociones);
  emp.envio = { ...plan.envio };
  emp.reposicion = structuredClone(plan.reposicion);
  emp.campanas = structuredClone(plan.campanas);
  for (const c of emp.campanas) {
    emitir(ctx, 'campana_iniciada', empresa, {
      campanaId: c.id,
      canal: c.canal,
      segmento: c.segmento,
      angulo: c.angulo,
      mensaje: c.mensaje,
      presupuestoDiario: c.presupuestoDiario,
      dias: c.dias,
    });
  }
  for (const f of plan.fichas) mejorarFichas(ctx, empresa, f.sku, f.pasos);
  for (const orden of plan.ordenes) emitirOrden(ctx, empresa, orden, 'plan');
}

function cobrarCostosFijos(ctx: ContextoDia): void {
  const { costos } = ctx.ci.cfg;
  for (const empresa of ordenEmpresas(ctx)) {
    const emp = ctx.estado.empresas[empresa];
    const operacion = cargarObligacion(emp, costos.operacion_diaria);
    emitir(ctx, 'gasto_operativo', empresa, { obligacion: operacion });
    if (operacion.pendiente > 0) emitir(ctx, 'insolvencia', empresa, { concepto: 'operacion', pendiente: operacion.pendiente });

    const unidades = totalUnidades(emp.existencias);
    if (unidades === 0) continue;
    const almacenaje = cargarObligacion(emp, unidades * costos.almacenaje_unidad_dia);
    emitir(ctx, 'almacenaje', empresa, { unidades, obligacion: almacenaje });
    if (almacenaje.pendiente > 0) emitir(ctx, 'insolvencia', empresa, { concepto: 'almacenaje', pendiente: almacenaje.pendiente });
  }
}

function decaerConciencia(ctx: ContextoDia): void {
  const m = ctx.ci.cfg.mercado;
  for (const empresa of EMPRESAS) {
    const porSegmento = ctx.estado.conciencia[empresa];
    for (const [segmento, valor] of Object.entries(porSegmento)) {
      porSegmento[segmento] = redondear6(m.conciencia_inicial + (valor - m.conciencia_inicial) * m.conciencia_decaimiento);
    }
  }
}

/** Simula el siguiente día del periodo y devuelve sus eventos, en orden. */
export function simularDia(sesion: SesionPeriodo): Evento[] {
  if (sesion.cerrada || periodoCompleto(sesion)) throw new RangeError('el periodo ya terminó');
  const dia = sesion.diasSimulados + 1;
  sesion.estado.diaGlobal++;
  const ctx = crearContexto(sesion, dia);

  if (dia === 1) for (const empresa of ordenEmpresas(ctx)) aplicarPlan(ctx, empresa, sesion.planes[empresa]);
  recibirOrdenes(ctx);
  procesarDevoluciones(ctx);
  cobrarCostosFijos(ctx);
  ejecutarReposicion(ctx);

  const visitantes = ctx.rng.visitas.barajar(consolidarVisitantes(ejecutarCampanas(ctx), generarOrganicos(ctx)));
  for (const visitante of visitantes) procesarVisita(ctx, visitante);
  cerrarPedidosDelDia(ctx);
  decaerConciencia(ctx);

  for (const empresa of EMPRESAS) emitir(ctx, 'trafico_diario', empresa, ctx.trafico[empresa]);
  emitir(ctx, 'cierre_dia', null, {
    cajas: { alfa: sesion.estado.empresas.alfa.caja, omega: sesion.estado.empresas.omega.caja },
  });

  sesion.diasSimulados = dia;
  sesion.eventos.push(...ctx.eventos);
  return ctx.eventos;
}

/** Comprobaciones que, de fallar, indican un defecto del motor (no una mala decisión). */
export function verificarInvariantes(estado: EstadoMercado): void {
  for (const empresa of EMPRESAS) {
    const emp = estado.empresas[empresa];
    if (!Number.isSafeInteger(emp.caja) || emp.caja < 0) throw new Error(`${empresa}: caja inválida ${emp.caja}`);
    if (!Number.isSafeInteger(emp.pasivo) || emp.pasivo < 0) throw new Error(`${empresa}: pasivo inválido ${emp.pasivo}`);
    for (const ex of Object.values(emp.existencias)) {
      if (!Number.isInteger(ex.unidades) || ex.unidades < 0) throw new Error(`${empresa}/${ex.sku}: unidades ${ex.unidades}`);
      if (!Number.isSafeInteger(ex.valor) || ex.valor < 0) throw new Error(`${empresa}/${ex.sku}: valor ${ex.valor}`);
      if (ex.unidades === 0 && ex.valor !== 0) throw new Error(`${empresa}/${ex.sku}: valor residual sin unidades`);
    }
  }
}

export function cerrarPeriodo(sesion: SesionPeriodo): SalidaPeriodo & { eventosCierre: Evento[] } {
  if (sesion.cerrada) throw new RangeError('el periodo ya fue cerrado');
  if (!periodoCompleto(sesion)) throw new RangeError(`faltan días por simular (${sesion.diasSimulados})`);
  const ctx = { ronda: sesion.ronda, dia: sesion.ci.cfg.dias_por_periodo, eventos: [] as Evento[] };
  const ejecutadas = filtrar(sesion.eventos, 'campana_ejecutada');
  for (const empresa of EMPRESAS) {
    for (const c of sesion.estado.empresas[empresa].campanas) {
      const propias = ejecutadas.filter((e) => e.empresa === empresa && e.datos.campanaId === c.id);
      emitir(ctx, 'campana_detenida', empresa, {
        campanaId: c.id,
        motivo: 'fin_periodo',
        gastoTotal: propias.reduce((a, e) => a + e.datos.gasto, 0),
        impresiones: propias.reduce((a, e) => a + e.datos.impresiones, 0),
        clics: propias.reduce((a, e) => a + e.datos.clics, 0),
        visitas: propias.reduce((a, e) => a + e.datos.visitas, 0),
      });
    }
  }
  sesion.estado.rondaCompletada = sesion.ronda;
  verificarInvariantes(sesion.estado);
  sesion.eventos.push(...ctx.eventos);
  sesion.cerrada = true;
  return { estado: sesion.estado, eventos: sesion.eventos, eventosCierre: ctx.eventos };
}

/** Corrida completa de un periodo. Función pura: no modifica la entrada. */
export function simularPeriodo(entrada: EntradaPeriodo): SalidaPeriodo {
  const { sesion } = abrirPeriodo(entrada);
  while (!periodoCompleto(sesion)) simularDia(sesion);
  const { estado, eventos } = cerrarPeriodo(sesion);
  return { estado, eventos };
}
