import type { ConfigIndexada } from '../../shared/config.ts';
import type { Rng } from '../../shared/rng.ts';
import type { DatosPorTipo, Evento, Pedido, TipoEvento, TraficoDia } from '../../shared/schemas/eventos.ts';
import type { EmpresaId, Principal } from '../../shared/types/dominio.ts';
import type { PoblacionIndexada } from '../customers/poblacion.ts';
import type { EstadoMercado } from './estado.ts';

export interface Visitante {
  clienteId: string;
  /** null: visita orgánica, el cliente elige tienda (o ninguna). */
  tienda: EmpresaId | null;
  origen: 'organico' | 'campana';
  canal: string | null;
  campanaId: string | null;
  angulo: string | null;
}

export interface PedidoEnCurso {
  empresa: EmpresaId;
  pedido: Pedido;
  cancelar: boolean;
  devoluciones: Array<{ indiceLinea: number; diasHastaProceso: number }>;
}

export interface FlujosRng {
  trafico: Rng;
  visitas: Rng;
  logistica: Rng;
  publicidad: Rng;
  proveedores: Rng;
}

/**
 * Contexto de un día simulado. `estado` es la copia de trabajo privada del periodo:
 * los módulos del motor la modifican in situ y jamás tocan el estado de entrada.
 */
export interface ContextoDia {
  ci: ConfigIndexada;
  ronda: number;
  /** Día dentro del periodo (1..dias_por_periodo). */
  dia: number;
  diaGlobal: number;
  /** Multiplicador de demanda del día (estacionalidad × ciclo × ruido). */
  factorDia: number;
  estado: EstadoMercado;
  eventos: Evento[];
  poblacion: PoblacionIndexada;
  rng: FlujosRng;
  trafico: Record<EmpresaId, TraficoDia>;
  pedidosDelDia: PedidoEnCurso[];
}

export function emitir<K extends TipoEvento>(
  ctx: Pick<ContextoDia, 'ronda' | 'dia' | 'eventos'>,
  tipo: K,
  empresa: EmpresaId | null,
  datos: DatosPorTipo[K],
  actor: Principal = 'mercado',
): void {
  ctx.eventos.push({ ronda: ctx.ronda, dia: ctx.dia, actor, empresa, tipo, datos } as unknown as Evento);
}

/** Alterna qué empresa se procesa primero para que el orden no otorgue ventaja sistemática. */
export function ordenEmpresas(ctx: Pick<ContextoDia, 'ronda' | 'dia'>): EmpresaId[] {
  return (ctx.ronda + ctx.dia) % 2 === 0 ? ['alfa', 'omega'] : ['omega', 'alfa'];
}

export function traficoVacio(): TraficoDia {
  return {
    visitasOrganicas: 0,
    visitasPagadas: 0,
    cambiosEntrantes: 0,
    cambiosSalientes: 0,
    sinStock: {},
    abandonos: 0,
    noConvertidas: 0,
    pedidos: 0,
  };
}
