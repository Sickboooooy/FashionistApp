import type { MetricasCampana, ResumenEmpresa } from '../../simulation/economics/proyeccion.ts';
import type { Campana, Existencia, PoliticaEnvio, Promocion, ReglaReposicion } from '../../simulation/market/estado.ts';
import type { Config } from '../config.ts';
import type { Centavos } from '../money.ts';
import type { EmpresaId } from '../types/dominio.ts';

/** Lo que cualquier visitante ve en la tienda: precios, promociones y disponibilidad (no unidades exactas). */
export interface ProductoEscaparate {
  sku: string;
  nombre: string;
  categoria: string;
  precioLista: Centavos;
  precioFinal: Centavos;
  descuentoPct: number;
  disponibilidad: 'disponible' | 'pocas' | 'agotado';
  calidadFicha: number;
}

export interface Escaparate {
  empresa: EmpresaId;
  ronda: number;
  dia: number;
  diaGlobal: number;
  productos: ProductoEscaparate[];
  promociones: Promocion[];
  envio: PoliticaEnvio;
  anuncios: Array<{ canal: string; segmento: string; angulo: string; mensaje: string }>;
}

export interface RondaPropia {
  ronda: number;
  resumen: ResumenEmpresa;
  ventasPorSku: Record<string, { vendidas: number; sinStock: number }>;
  campanas: Array<MetricasCampana & { roas: number | null }>;
  existenciasFinales: Record<string, number>;
  precios: Record<string, Centavos>;
}

export interface ResultadoPublico {
  ronda: number;
  expediente: string;
  resultado: 'ganador' | 'sin_ganador' | 'ronda_invalida';
  ganador: EmpresaId | null;
  ventasNetas: Record<EmpresaId, Centavos>;
}

/**
 * Vista autorizada que el harness entrega a los agentes de una empresa:
 * su propio estado, su historial, las reglas públicas y la información pública
 * del mercado. Nunca contiene datos privados de la competidora.
 */
export interface VistaEmpresa {
  empresa: EmpresaId;
  ronda: number;
  diasPorPeriodo: number;
  diaGlobalInicio: number;
  semillaAgente: number;
  reglas: Config;
  propio: {
    caja: Centavos;
    pasivo: Centavos;
    existencias: Existencia[];
    enTransito: Array<{ sku: string; unidades: number; proveedorId: string; diaLlegadaEstimada: number }>;
    precios: Record<string, Centavos>;
    listado: string[];
    fichas: Record<string, number>;
    envio: PoliticaEnvio;
    promociones: Promocion[];
    campanas: Campana[];
    reposicion: ReglaReposicion[];
    suscriptoresPorSegmento: Record<string, number>;
  };
  historial: RondaPropia[];
  publico: {
    escaparateRival: Escaparate | null;
    resultados: ResultadoPublico[];
  };
}
