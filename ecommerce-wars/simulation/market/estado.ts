import type { ConfigIndexada } from '../../shared/config.ts';
import type { Centavos } from '../../shared/money.ts';
import { EMPRESAS, type EmpresaId } from '../../shared/types/dominio.ts';

export interface Existencia {
  sku: string;
  unidades: number;
  /** Valor contable total de las unidades (costo promedio ponderado). */
  valor: Centavos;
  /** Calidad promedio ponderada de las unidades en existencia (0..1). */
  calidad: number;
}

export interface OrdenEnTransito {
  id: string;
  empresa: EmpresaId;
  sku: string;
  proveedorId: string;
  unidades: number;
  costoTotal: Centavos;
  calidad: number;
  diaEmision: number;
  diaLlegadaEstimada: number;
  diaLlegada: number;
  origen: 'plan' | 'reposicion';
}

export interface DevolucionPendiente {
  id: string;
  empresa: EmpresaId;
  pedidoId: string;
  clienteId: string;
  sku: string;
  unidades: number;
  reembolso: Centavos;
  costo: Centavos;
  calidad: number;
  diaProceso: number;
}

export interface Campana {
  id: string;
  canal: string;
  segmento: string;
  angulo: string;
  mensaje: string;
  presupuestoDiario: Centavos;
  dias: number[];
}

export type Promocion =
  | {
      id: string;
      tipo: 'descuento';
      alcance: 'sku' | 'categoria' | 'todo';
      objetivo: string | null;
      pct: number;
      dias: number[];
    }
  | { id: string; tipo: 'compra_multiple'; minUnidades: number; pct: number; dias: number[] };

export interface ReglaReposicion {
  sku: string;
  proveedorId: string;
  puntoReorden: number;
  cantidad: number;
}

export interface PoliticaEnvio {
  costo: Centavos;
  gratisDesde: Centavos;
}

export interface EstadoEmpresa {
  empresa: EmpresaId;
  caja: Centavos;
  /** Obligaciones obligatorias no cubiertas por falta de caja (insolvencia). */
  pasivo: Centavos;
  existencias: Record<string, Existencia>;
  precios: Record<string, Centavos>;
  listado: string[];
  fichas: Record<string, number>;
  envio: PoliticaEnvio;
  promociones: Promocion[];
  campanas: Campana[];
  reposicion: ReglaReposicion[];
  /** IDs de clientes suscritos al boletín, ordenados. */
  listaCorreo: string[];
}

export interface RelacionCliente {
  compras: number;
  lealtad: number;
}

export interface Contadores {
  pedido: number;
  orden: number;
  devolucion: number;
}

export interface EstadoMercado {
  version: 1;
  rondaCompletada: number;
  diaGlobal: number;
  empresas: Record<EmpresaId, EstadoEmpresa>;
  conciencia: Record<EmpresaId, Record<string, number>>;
  relaciones: Record<string, Partial<Record<EmpresaId, RelacionCliente>>>;
  transito: OrdenEnTransito[];
  devoluciones: DevolucionPendiente[];
  contadores: Record<EmpresaId, Contadores>;
}

/** Decisiones ya validadas por el harness: lo único que el motor ejecuta. */
export interface PlanAplicado {
  ordenes: Array<{ sku: string; proveedorId: string; unidades: number }>;
  reposicion: ReglaReposicion[];
  campanas: Campana[];
  precios: Record<string, Centavos>;
  listado: string[];
  promociones: Promocion[];
  envio: PoliticaEnvio;
  fichas: Array<{ sku: string; pasos: number }>;
}

export const ENVIO_INICIAL: PoliticaEnvio = { costo: 9900, gratisDesde: 99900 };

/** Plan neutro: conserva precios, listado, envío y reposición; no compra ni anuncia. */
export function planVacio(estado: EstadoEmpresa): PlanAplicado {
  return {
    ordenes: [],
    reposicion: estado.reposicion,
    campanas: [],
    precios: {},
    listado: estado.listado,
    promociones: [],
    envio: estado.envio,
    fichas: [],
  };
}

function empresaInicial(ci: ConfigIndexada, empresa: EmpresaId): EstadoEmpresa {
  const { cfg } = ci;
  const existencias: Record<string, Existencia> = {};
  const precios: Record<string, Centavos> = {};
  const fichas: Record<string, number> = {};
  for (const p of cfg.productos) {
    existencias[p.sku] = { sku: p.sku, unidades: 0, valor: 0, calidad: 0 };
    precios[p.sku] = p.precio_referencia;
    fichas[p.sku] = cfg.costos.ficha_inicial;
  }
  return {
    empresa,
    caja: cfg.capital_inicial,
    pasivo: 0,
    existencias,
    precios,
    listado: [],
    fichas,
    envio: { ...ENVIO_INICIAL },
    promociones: [],
    campanas: [],
    reposicion: [],
    listaCorreo: [],
  };
}

/** Estado previo a la ronda 1: condiciones idénticas para ambas empresas. */
export function estadoInicial(ci: ConfigIndexada): EstadoMercado {
  const concienciaBase = Object.fromEntries(ci.cfg.segmentos.map((s) => [s.id, ci.cfg.mercado.conciencia_inicial]));
  const empresas = Object.fromEntries(EMPRESAS.map((e) => [e, empresaInicial(ci, e)])) as Record<EmpresaId, EstadoEmpresa>;
  return {
    version: 1,
    rondaCompletada: 0,
    diaGlobal: 0,
    empresas,
    conciencia: { alfa: { ...concienciaBase }, omega: { ...concienciaBase } },
    relaciones: {},
    transito: [],
    devoluciones: [],
    contadores: {
      alfa: { pedido: 0, orden: 0, devolucion: 0 },
      omega: { pedido: 0, orden: 0, devolucion: 0 },
    },
  };
}
