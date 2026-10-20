import { hashCanonico } from '../../shared/hash.ts';
import type { ReporteFinanciero } from '../../shared/contracts/finanzas.ts';
import { EventoSelladoSchema, type EventoSellado } from '../../shared/schemas/eventos.ts';
import type {
  AlertaFinanciera,
  DecisionCompras,
  DecisionFinanzas,
  DecisionMarketing,
  DecisionVentas,
} from '../../shared/schemas/decisiones.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import { contabilizar, indicadoresContables, saldos, verificarPartidaDoble } from '../../simulation/economics/libro-mayor.ts';
import type { AlmacenRestringido } from '../../harness/permissions/almacen.ts';
import { costoUnitario, disponible, mxn, producto, pronosticoSemanal, type ContextoRol } from './comun.ts';

const VENTA_ESPERADA_SOBRE_PRONOSTICO = 0.7;
const FACTOR_CONSERVADOR = 0.9;
const REPOSICION_ESTIMADA = 0.35;

export interface Borrador {
  compras: DecisionCompras;
  marketing: DecisionMarketing;
  ventas: DecisionVentas;
}

function costoOrdenes(ctx: ContextoRol, compras: DecisionCompras): number {
  const flete = ctx.vista.reglas.costos.flete_orden_compra;
  return compras.ordenes.reduce((a, o) => {
    const prov = ctx.vista.reglas.proveedores.find((p) => p.id === o.proveedorId);
    return prov ? a + costoUnitario(prov, producto(ctx, o.sku)) * o.unidades + flete : a;
  }, 0);
}

const costoCampanas = (m: DecisionMarketing) => m.campanas.reduce((a, c) => a + c.presupuestoDiario * c.dias.length, 0);

/**
 * Agente Financiero (antes del periodo): verifica que lo comprometido quepa en el
 * disponible, recorta si no (primero campañas, luego órdenes), proyecta la caja y
 * advierte sobre riesgo de insolvencia.
 */
export function revisarPlan(ctx: ContextoRol, borrador: Borrador): Borrador & { finanzas: DecisionFinanzas } {
  const { vista } = ctx;
  const { costos } = vista.reglas;
  const libre = disponible(vista);
  const ajustes: string[] = [];
  const alertas: AlertaFinanciera[] = [];

  let marketing = borrador.marketing;
  let compras = borrador.compras;
  let ventas = borrador.ventas;
  const fichas = ventas.fichas.reduce((a, f) => a + f.pasos * costos.mejora_ficha, 0);
  const ordenes = costoOrdenes(ctx, compras);

  const paraCampanas = libre - ordenes - fichas;
  const campanas = costoCampanas(marketing);
  if (campanas > Math.max(0, paraCampanas)) {
    const factor = Math.max(0, paraCampanas) / campanas;
    marketing = {
      ...marketing,
      campanas: marketing.campanas
        .map((c) => ({ ...c, presupuestoDiario: Math.floor(c.presupuestoDiario * factor) }))
        .filter((c) => c.presupuestoDiario > 0),
    };
    ajustes.push(`Campañas escaladas al ${(factor * 100).toFixed(0)}% para respetar el disponible.`);
  }
  if (ordenes + fichas > libre) {
    let acumulado = 0;
    const flete = costos.flete_orden_compra;
    const aceptadas = compras.ordenes.filter((o) => {
      const prov = vista.reglas.proveedores.find((p) => p.id === o.proveedorId);
      const costo = prov ? costoUnitario(prov, producto(ctx, o.sku)) * o.unidades + flete : 0;
      if (acumulado + costo > libre) return false;
      acumulado += costo;
      return true;
    });
    ajustes.push(`${compras.ordenes.length - aceptadas.length} órdenes retiradas por exceder el disponible.`);
    compras = { ...compras, ordenes: aceptadas };
    if (acumulado + fichas > libre) {
      ventas = { ...ventas, fichas: [] };
      ajustes.push('Mejoras de fichas pospuestas.');
    }
  }

  const comprometido = costoOrdenes(ctx, compras) + costoCampanas(marketing) + ventas.fichas.reduce((a, f) => a + f.pasos * costos.mejora_ficha, 0);
  const precios = new Map(ventas.precios.map((p) => [p.sku, p.precio]));
  const ingresoEsperado = ventas.listado.reduce(
    (a, sku) => a + pronosticoSemanal(ctx, sku) * (precios.get(sku) ?? producto(ctx, sku).precio_referencia) * VENTA_ESPERADA_SOBRE_PRONOSTICO,
    0,
  );
  const pedidosEsperados = ventas.listado.reduce((a, sku) => a + pronosticoSemanal(ctx, sku) * VENTA_ESPERADA_SOBRE_PRONOSTICO, 0);
  const fijos = costos.operacion_diaria * vista.diasPorPeriodo + pedidosEsperados * costos.envio_salida;
  const reposicion = costoOrdenes(ctx, compras) * REPOSICION_ESTIMADA;
  const proyeccion = Math.round(vista.propio.caja - comprometido - fijos - reposicion + ingresoEsperado * (1 - costos.comision_pago));

  if (vista.propio.pasivo > 0) alertas.push({ nivel: 'critica', mensaje: `Pasivo por insolvencia de ${mxn(vista.propio.pasivo)}: no hay gasto discrecional.` });
  if (proyeccion < vista.reglas.reserva_obligatoria * 2) {
    alertas.push({ nivel: 'advertencia', mensaje: `Caja proyectada de ${mxn(proyeccion)} cercana a la reserva obligatoria.` });
  }
  if (libre < costos.operacion_diaria * vista.diasPorPeriodo) {
    alertas.push({ nivel: 'critica', mensaje: 'Riesgo de insolvencia: el disponible no cubre una semana de operación.' });
  }

  const finanzas: DecisionFinanzas = {
    hipotesis: {
      texto: `Caja al cierre de al menos ${mxn(Math.round(proyeccion * FACTOR_CONSERVADOR))} (proyección conservadora).`,
      metrica: 'caja_final',
      valor: Math.round(proyeccion * FACTOR_CONSERVADOR),
    },
    aprobado: true,
    proyeccionCajaFinal: proyeccion,
    ajustes,
    alertas,
  };
  return { compras, marketing, ventas, finanzas };
}

/** Agente Financiero (después del periodo): lleva el libro mayor a partir de sus propios eventos. */
export function contabilizarRonda(empresa: EmpresaId, ronda: number, almacen: AlmacenRestringido): ReporteFinanciero {
  const crudo = almacen.existe(`data/private/${empresa}/eventos.jsonl`) ? almacen.leerTexto(`data/private/${empresa}/eventos.jsonl`) : '';
  const eventos = crudo
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => EventoSelladoSchema.parse(JSON.parse(l)) as unknown as EventoSellado);
  const libro = contabilizar(empresa, eventos);
  const errores = verificarPartidaDoble(libro);
  const s = saldos(libro);
  almacen.escribirJson(`data/private/${empresa}/libro-mayor.json`, libro);

  const alertas: string[] = [];
  if (errores.length > 0) alertas.push(`${errores.length} asientos descuadrados`);
  if (s['2100'] < 0) alertas.push(`Pasivo por insolvencia: ${mxn(0 - s['2100'])}`);
  const reporte: ReporteFinanciero = {
    empresa,
    ronda,
    indicadores: indicadoresContables(libro, ronda),
    saldos: { caja: s['1100'], inventario: s['1200'], inventarioTransito: s['1210'], pasivo: 0 - s['2100'], capital: 0 - s['3100'] },
    asientos: libro.asientos.length,
    balanceado: errores.length === 0,
    hashLibro: hashCanonico(libro),
    alertas,
  };
  almacen.escribirJson(`data/private/${empresa}/reportes/ronda-${String(ronda).padStart(2, '0')}.json`, reporte);
  return reporte;
}
