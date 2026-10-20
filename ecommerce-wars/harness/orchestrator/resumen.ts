import type { RondaPropia } from '../../shared/contracts/vista.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import type { DecisionObservada, ResumenEmpresa } from '../../simulation/economics/proyeccion.ts';
import type { CalidadEmpresa } from '../evaluator/calidad.ts';
import type { ResumenEstrategia } from './estrategia.ts';

/** Resumen de ronda para el tribunal y el War Room (reports/rounds/ronda-NN.json). */
export interface ResumenRondaArchivo {
  ronda: number;
  expediente: string;
  modo: 'prueba' | 'oficial';
  semilla: number;
  periodo: { diaGlobalInicio: number; diaGlobalFin: number; fechaInicio: string; fechaFin: string };
  perfiles: Record<EmpresaId, string>;
  participacion: Record<EmpresaId, number>;
  empresas: Record<
    EmpresaId,
    {
      resumen: ResumenEmpresa;
      calidad: CalidadEmpresa;
      estrategia: ResumenEstrategia | null;
      decisiones: DecisionObservada[];
      ventasPorSku: RondaPropia['ventasPorSku'];
      campanas: RondaPropia['campanas'];
      existenciasFinales: Record<string, number>;
      precios: Record<string, number>;
      rechazos: Array<{ rol: string; codigo: string; detalle: string }>;
      lecciones: string[];
      conciliacion: { libroVsEventos: boolean; diferencias: string[] };
    }
  >;
}
