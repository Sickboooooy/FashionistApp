import type { Config } from '../../shared/config.ts';
import { formatoMXN, type Centavos } from '../../shared/money.ts';
import { EMPRESAS, rivalDe, type EmpresaId } from '../../shared/types/dominio.ts';

/** Reglas de victoria (sección 7 de AGENTS.md), con identificador estable para citarlas. */
export const REGLAS_VICTORIA = {
  V1: 'Ventas netas de la candidata ≥ multiplicador × ventas netas de la competidora',
  V2: 'Ambas empresas completaron el mismo periodo',
  V3: 'Muestra mínima de pedidos válidos de la candidata',
  V4: 'Ventas netas mínimas de la candidata en el periodo',
  V5: 'Margen de contribución positivo de la candidata',
  V6: 'Sin infracciones graves sin resolver de la candidata',
  V7: 'Registros y cálculos validados por el Juez',
  V0: 'Si ambas empresas registran cero ventas, no hay ganador',
} as const;
export type IdRegla = keyof typeof REGLAS_VICTORIA;

export interface DatosCandidata {
  ventasNetas: Centavos;
  pedidosValidos: number;
  margenContribucion: Centavos;
  periodoCompletado: boolean;
  infraccionesGraves: number;
}

export interface Comprobacion {
  regla: IdRegla;
  cumple: boolean;
  detalle: string;
}

export interface DictamenVictoria {
  ganador: EmpresaId | null;
  motivo: string;
  comprobaciones: Record<EmpresaId, Comprobacion[]>;
}

/** Función pura: mismos datos, mismo dictamen. No hay criterios fuera de config/experiment.json. */
export function evaluarVictoria(
  datos: Record<EmpresaId, DatosCandidata>,
  criterios: Config['victoria'],
  registrosValidados: boolean,
): DictamenVictoria {
  const comprobaciones = {} as Record<EmpresaId, Comprobacion[]>;
  for (const empresa of EMPRESAS) {
    const d = datos[empresa];
    const r = datos[rivalDe(empresa)];
    comprobaciones[empresa] = [
      {
        regla: 'V1',
        cumple: d.ventasNetas >= criterios.multiplicador_ventas * r.ventasNetas,
        detalle: `${formatoMXN(d.ventasNetas)} vs ${criterios.multiplicador_ventas} × ${formatoMXN(r.ventasNetas)}`,
      },
      { regla: 'V2', cumple: d.periodoCompletado && r.periodoCompletado, detalle: d.periodoCompletado && r.periodoCompletado ? 'periodo completo' : 'periodo incompleto' },
      {
        regla: 'V3',
        cumple: d.pedidosValidos >= criterios.pedidos_validos_minimos,
        detalle: `${d.pedidosValidos} pedidos válidos (mínimo ${criterios.pedidos_validos_minimos})`,
      },
      {
        regla: 'V4',
        cumple: d.ventasNetas >= criterios.ventas_netas_minimas,
        detalle: `${formatoMXN(d.ventasNetas)} (mínimo ${formatoMXN(criterios.ventas_netas_minimas)})`,
      },
      {
        regla: 'V5',
        cumple: !criterios.exigir_margen_contribucion_positivo || d.margenContribucion > 0,
        detalle: `margen de contribución ${formatoMXN(d.margenContribucion)}`,
      },
      { regla: 'V6', cumple: d.infraccionesGraves === 0, detalle: `${d.infraccionesGraves} infracciones graves` },
      { regla: 'V7', cumple: registrosValidados, detalle: registrosValidados ? 'registros validados' : 'registros no validados' },
    ];
  }

  if (datos.alfa.ventasNetas === 0 && datos.omega.ventasNetas === 0) {
    return { ganador: null, motivo: REGLAS_VICTORIA.V0, comprobaciones };
  }
  const candidatas = EMPRESAS.filter((e) => comprobaciones[e].every((c) => c.cumple));
  if (candidatas.length === 1) {
    const ganador = candidatas[0] as EmpresaId;
    return { ganador, motivo: `${ganador.toUpperCase()} satisface V1–V7`, comprobaciones };
  }
  const lider = datos.alfa.ventasNetas >= datos.omega.ventasNetas ? 'alfa' : 'omega';
  const fallidas = comprobaciones[lider].filter((c) => !c.cumple).map((c) => c.regla);
  return {
    ganador: null,
    motivo: `Ninguna empresa satisface todas las condiciones (${lider.toUpperCase()} no cumple ${fallidas.join(', ')}); comienza otra ronda.`,
    comprobaciones,
  };
}
