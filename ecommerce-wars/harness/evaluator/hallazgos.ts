import type { Config } from '../../shared/config.ts';
import type { EmpresaId, Severidad } from '../../shared/types/dominio.ts';

export interface Hallazgo {
  codigo: string;
  severidad: Severidad;
  empresa: EmpresaId | null;
  detalle: string;
  resolucion: string;
}

const RESOLUCION_POR_SEVERIDAD: Record<Severidad, string> = {
  leve: 'Resuelta conforme a reglas: la acción se descartó o se registró sin efecto económico.',
  grave: 'No resuelta en la ronda: la empresa no puede ser candidata a ganadora en este periodo.',
  critica: 'La ronda se declara inválida; no se considera para la condición de victoria.',
};

/** Severidad configurada para un código; lo desconocido se trata como grave. */
export function severidadDe(cfg: Config, codigo: string, porDefecto: Severidad = 'grave'): Severidad {
  return cfg.severidades[codigo] ?? porDefecto;
}

export function hallazgo(
  cfg: Config,
  codigo: string,
  empresa: EmpresaId | null,
  detalle: string,
  severidad?: Severidad,
): Hallazgo {
  const s = severidad ?? severidadDe(cfg, codigo);
  return { codigo, severidad: s, empresa, detalle, resolucion: RESOLUCION_POR_SEVERIDAD[s] };
}
