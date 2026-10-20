import type { ConfigIndexada } from '../../shared/config.ts';
import type { ReporteFinanciero } from '../../shared/contracts/finanzas.ts';
import { hashCanonico } from '../../shared/hash.ts';
import type { Centavos } from '../../shared/money.ts';
import type { Evento } from '../../shared/schemas/eventos.ts';
import { EMPRESAS, type EmpresaId } from '../../shared/types/dominio.ts';
import { obtenerPoblacion } from '../../simulation/customers/poblacion.ts';
import {
  contabilizar,
  indicadoresContables,
  movimientosDeEvento,
  saldos,
  verificarPartidaDoble,
  type LibroMayor,
} from '../../simulation/economics/libro-mayor.ts';
import {
  indicadoresDesdeEventos,
  pedidosValidosDesdeEventos,
  type IndicadoresFinancieros,
} from '../../simulation/economics/proyeccion.ts';
import type { EstadoMercado } from '../../simulation/market/estado.ts';
import { hallazgo, type Hallazgo } from './hallazgos.ts';

export interface HechosEmpresa {
  indicadores: IndicadoresFinancieros;
  pedidosValidos: number;
  pedidosCobrados: number;
  caja: Centavos;
  inventarioValor: Centavos;
  inventarioUnidades: number;
  conciliado: boolean;
}

export interface EntradaAuditoria {
  ci: ConfigIndexada;
  ronda: number;
  eventosRonda: readonly Evento[];
  eventosAcumulados: readonly Evento[];
  estadoFinal: EstadoMercado;
  libros: Record<EmpresaId, LibroMayor | null>;
  reportes: Record<EmpresaId, ReporteFinanciero | null>;
}

const GASTOS_DISCRECIONALES = new Set(['orden_emitida', 'campana_ejecutada', 'ficha_mejorada']);
const EVENTOS_DE_PEDIDO = new Set(['pedido_creado', 'pedido_cobrado', 'pedido_cancelado', 'pedido_enviado', 'devolucion_procesada']);

function diferencias(a: IndicadoresFinancieros, b: IndicadoresFinancieros): string[] {
  return (Object.keys(a) as Array<keyof IndicadoresFinancieros>).filter((k) => a[k] !== b[k]).map((k) => `${k}: ${a[k]} ≠ ${b[k]}`);
}

/** Recorre la historia de caja e inventario de una empresa evento por evento. */
function recorrerHistoria(ci: ConfigIndexada, empresa: EmpresaId, eventos: readonly Evento[], estadoFinal: EstadoMercado): Hallazgo[] {
  const { cfg } = ci;
  const hallazgos: Hallazgo[] = [];
  let caja = 0;
  let pasivo = 0;
  const unidades = new Map<string, number>();
  const sumar = (sku: string, n: number) => unidades.set(sku, (unidades.get(sku) ?? 0) + n);

  for (const e of eventos) {
    if (e.empresa !== empresa) continue;
    const movimientos = movimientosDeEvento(e);
    const salida = movimientos.filter((m) => m.cuenta === '1100').reduce((a, m) => a + m.haber, 0);
    if (GASTOS_DISCRECIONALES.has(e.tipo) && (pasivo > 0 || caja - salida < cfg.reserva_obligatoria)) {
      hallazgos.push(hallazgo(cfg, 'discrepancia_contable', empresa, `gasto discrecional sin saldo (${e.tipo}, día ${e.dia}, ronda ${e.ronda})`));
    }
    for (const m of movimientos) {
      if (m.cuenta === '1100') caja += m.debe - m.haber;
      if (m.cuenta === '2100') pasivo += m.haber - m.debe;
    }
    if (caja < 0) hallazgos.push(hallazgo(cfg, 'integridad_evidencia', empresa, `caja negativa tras ${e.tipo} (ronda ${e.ronda}, día ${e.dia})`));

    if (e.tipo === 'orden_recibida') sumar(e.datos.sku, e.datos.unidades);
    else if (e.tipo === 'pedido_creado') for (const l of e.datos.pedido.lineas) sumar(l.sku, -l.unidades);
    else if (e.tipo === 'pedido_cancelado') for (const l of e.datos.lineas) sumar(l.sku, l.unidades);
    else if (e.tipo === 'devolucion_procesada' && e.datos.reabastecido) sumar(e.datos.sku, e.datos.unidades);
    for (const [sku, n] of unidades) {
      if (n < 0) {
        hallazgos.push(hallazgo(cfg, 'discrepancia_contable', empresa, `inventario negativo de ${sku} tras ${e.tipo}`));
        unidades.set(sku, 0);
      }
    }
    if (hallazgos.length > 20) break;
  }

  const emp = estadoFinal.empresas[empresa];
  if (caja !== emp.caja) hallazgos.push(hallazgo(cfg, 'discrepancia_contable', empresa, `caja según eventos ${caja} ≠ estado ${emp.caja}`));
  for (const ex of Object.values(emp.existencias)) {
    if ((unidades.get(ex.sku) ?? 0) !== ex.unidades) {
      hallazgos.push(hallazgo(cfg, 'discrepancia_contable', empresa, `${ex.sku}: ${unidades.get(ex.sku) ?? 0} unidades según eventos ≠ ${ex.unidades} en estado`));
    }
  }
  return hallazgos;
}

function ventasFabricadas(ci: ConfigIndexada, empresa: EmpresaId, eventos: readonly Evento[]): Hallazgo[] {
  const { cfg } = ci;
  const poblacion = obtenerPoblacion(ci);
  const creados = new Set<string>();
  const hallazgos: Hallazgo[] = [];
  for (const e of eventos) {
    if (e.empresa !== empresa || !EVENTOS_DE_PEDIDO.has(e.tipo)) continue;
    if (e.actor !== 'mercado') {
      hallazgos.push(hallazgo(cfg, 'venta_fabricada', empresa, `${e.tipo} emitido por ${e.actor}: sólo el motor de mercado registra pedidos`));
      continue;
    }
    if (e.tipo === 'pedido_creado') {
      creados.add(e.datos.pedido.id);
      if (!poblacion.porId.has(e.datos.pedido.clienteId)) {
        hallazgos.push(hallazgo(cfg, 'venta_fabricada', empresa, `pedido ${e.datos.pedido.id} con cliente inexistente ${e.datos.pedido.clienteId}`));
      }
    } else if (e.tipo === 'pedido_cobrado' && !creados.has(e.datos.pedidoId)) {
      hallazgos.push(hallazgo(cfg, 'venta_fabricada', empresa, `cobro de ${e.datos.pedidoId} sin pedido creado`));
    }
  }
  return hallazgos;
}

/**
 * Auditoría contable de una ronda. Recalcula todo desde los eventos y lo concilia
 * contra el libro mayor y el reporte del agente financiero de cada empresa.
 */
export function auditar(entrada: EntradaAuditoria): { hechos: Record<EmpresaId, HechosEmpresa>; hallazgos: Hallazgo[] } {
  const hallazgos: Hallazgo[] = [];
  const hechos = {} as Record<EmpresaId, HechosEmpresa>;
  for (const empresa of EMPRESAS) {
    try {
      const r = auditarEmpresa(entrada, empresa);
      hallazgos.push(...r.hallazgos);
      hechos[empresa] = r.hechos;
    } catch (error) {
      // Un archivo malformado de una empresa no puede abortar la sentencia de ambas.
      hallazgos.push(hallazgo(entrada.ci.cfg, 'discrepancia_contable', empresa, `auditoría imposible: ${String((error as Error).message).slice(0, 200)}`));
      hechos[empresa] = {
        indicadores: indicadoresDesdeEventos(entrada.eventosRonda, empresa, entrada.ronda),
        pedidosValidos: pedidosValidosDesdeEventos(entrada.eventosRonda, empresa, entrada.ronda),
        pedidosCobrados: entrada.eventosRonda.filter((e) => e.empresa === empresa && e.tipo === 'pedido_cobrado').length,
        caja: entrada.estadoFinal.empresas[empresa].caja,
        inventarioValor: 0,
        inventarioUnidades: 0,
        conciliado: false,
      };
    }
  }
  return { hechos, hallazgos };
}

function auditarEmpresa(entrada: EntradaAuditoria, empresa: EmpresaId): { hechos: HechosEmpresa; hallazgos: Hallazgo[] } {
  const { ci, ronda, eventosRonda, eventosAcumulados, estadoFinal } = entrada;
  const { cfg } = ci;
  {
    const propios: Hallazgo[] = [];
    const indicadores = indicadoresDesdeEventos(eventosRonda, empresa, ronda);
    const libro = entrada.libros[empresa];
    const reporte = entrada.reportes[empresa];
    const emp = estadoFinal.empresas[empresa];

    if (!libro) {
      propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, 'el agente financiero no entregó libro mayor'));
    } else {
      const errores = verificarPartidaDoble(libro);
      if (errores.length > 0) propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, `libro descuadrado: ${errores.slice(0, 3).join('; ')}`));
      if (hashCanonico(contabilizar(empresa, eventosAcumulados)) !== hashCanonico(libro)) {
        propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, 'el libro mayor no corresponde a los eventos sellados'));
      }
      const delLibro = diferencias(indicadoresContables(libro, ronda), indicadores);
      if (delLibro.length > 0) propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, `libro vs eventos: ${delLibro.slice(0, 4).join('; ')}`));
      const s = saldos(libro);
      const transito = estadoFinal.transito.filter((o) => o.empresa === empresa).reduce((a, o) => a + o.costoTotal, 0);
      const valorExistencias = Object.values(emp.existencias).reduce((a, x) => a + x.valor, 0);
      if (s['1100'] !== emp.caja) propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, `caja del libro ${s['1100']} ≠ estado ${emp.caja}`));
      if (s['1200'] !== valorExistencias) propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, `inventario del libro ${s['1200']} ≠ estado ${valorExistencias}`));
      if (s['1210'] !== transito) propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, `tránsito del libro ${s['1210']} ≠ estado ${transito}`));
      if (-s['2100'] !== emp.pasivo) propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, `pasivo del libro ${-s['2100']} ≠ estado ${emp.pasivo}`));
    }

    if (!reporte) {
      propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, 'el agente financiero no entregó reporte'));
    } else {
      const delReporte = diferencias(reporte.indicadores, indicadores);
      if (delReporte.length > 0) propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, `reporte vs eventos: ${delReporte.slice(0, 4).join('; ')}`));
      if (libro && reporte.hashLibro !== hashCanonico(libro)) propios.push(hallazgo(cfg, 'discrepancia_contable', empresa, 'el hash del libro reportado no coincide'));
    }

    propios.push(...ventasFabricadas(ci, empresa, eventosRonda), ...recorrerHistoria(ci, empresa, eventosAcumulados, estadoFinal));
    const hechos: HechosEmpresa = {
      indicadores,
      pedidosValidos: pedidosValidosDesdeEventos(eventosRonda, empresa, ronda),
      pedidosCobrados: eventosRonda.filter((e) => e.empresa === empresa && e.tipo === 'pedido_cobrado').length,
      caja: emp.caja,
      inventarioValor: Object.values(emp.existencias).reduce((a, x) => a + x.valor, 0),
      inventarioUnidades: Object.values(emp.existencias).reduce((a, x) => a + x.unidades, 0),
      conciliado: propios.every((h) => h.codigo !== 'discrepancia_contable'),
    };
    return { hechos, hallazgos: propios };
  }
}
