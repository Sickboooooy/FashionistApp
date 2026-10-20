import type { ResumenEmpresa } from '../../simulation/economics/proyeccion.ts';

/*
 * Calidad de decisiones por rol (apartado 16.6). Puntajes 0–100, deterministas y
 * calculados sólo con datos de la ronda. Las fórmulas son deliberadamente simples
 * y públicas: miden resultado observable, no intención.
 */

export interface CriterioCalidad {
  nombre: string;
  valor: number;
  peso: number;
}

export interface CalidadRol {
  rol: string;
  puntaje: number;
  criterios: CriterioCalidad[];
  hipotesisCumplida: boolean | null;
  rechazos: number;
}

export interface CalidadEmpresa {
  promedio: number;
  roles: CalidadRol[];
  rechazos: number;
  incidentes: number;
}

export interface EntradaCalidad {
  resumen: ResumenEmpresa;
  hipotesis: Record<string, { cumplida: boolean | null; valor: number; observado: number | null }>;
  rechazosPorRol: Record<string, number>;
  incidentes: number;
  capital: number;
  unidadesFinales: number;
  unidadesVendidas: number;
}

const CONVERSION_REFERENCIA = 0.08;
const MARGEN_BRUTO_REFERENCIA = 0.55;
const ROAS_REFERENCIA = 4;
const PENALIZACION_RECHAZO = 10;
const COBERTURA_EXCESIVA = 1.5;

const acotar = (x: number) => Math.max(0, Math.min(1, x));

function rol(nombre: string, criterios: CriterioCalidad[], e: EntradaCalidad): CalidadRol {
  const rechazos = e.rechazosPorRol[nombre] ?? 0;
  const base = criterios.reduce((a, c) => a + c.valor * c.peso, 0);
  return {
    rol: nombre,
    puntaje: Math.round(Math.max(0, base - rechazos * PENALIZACION_RECHAZO)),
    criterios: criterios.map((c) => ({ ...c, valor: Number(c.valor.toFixed(4)) })),
    hipotesisCumplida: e.hipotesis[nombre]?.cumplida ?? null,
    rechazos,
  };
}

export function evaluarCalidad(e: EntradaCalidad): CalidadEmpresa {
  const r = e.resumen;
  const f = r.financiero;
  const exceso =
    e.unidadesVendidas > 0 ? Math.max(0, e.unidadesFinales / e.unidadesVendidas - COBERTURA_EXCESIVA) / COBERTURA_EXCESIVA : e.unidadesFinales > 0 ? 1 : 0;
  const margenBruto = f.ventasNetas > 0 ? (f.ventasNetas - f.costoVentas) / f.ventasNetas : 0;
  const fin = e.hipotesis.finanzas;
  const errorCaja = fin && fin.observado !== null ? Math.abs(fin.observado - fin.valor) / Math.max(1, e.capital) : 1;
  const meta = e.hipotesis.director?.valor ?? 0;

  const roles = [
    rol('director', [
      { nombre: 'margen_contribucion_positivo', valor: f.margenContribucion > 0 ? 1 : 0, peso: 50 },
      { nombre: 'avance_meta_ventas', valor: meta > 0 ? acotar(f.ventasNetas / meta) : 0, peso: 50 },
    ], e),
    rol('compras', [
      { nombre: 'tasa_servicio', valor: r.tasaServicio, peso: 70 },
      { nombre: 'inventario_no_excesivo', valor: 1 - acotar(exceso), peso: 30 },
    ], e),
    rol('marketing', [{ nombre: 'roas_relativo', valor: r.roas === null ? 0.5 : acotar(r.roas / ROAS_REFERENCIA), peso: 100 }], e),
    rol('ventas', [
      { nombre: 'conversion_relativa', valor: acotar(r.conversion / CONVERSION_REFERENCIA), peso: 60 },
      { nombre: 'margen_bruto_relativo', valor: acotar(margenBruto / MARGEN_BRUTO_REFERENCIA), peso: 40 },
    ], e),
    rol('finanzas', [{ nombre: 'precision_proyeccion_caja', valor: 1 - acotar(errorCaja * 4), peso: 100 }], e),
  ];
  return {
    promedio: Math.round(roles.reduce((a, x) => a + x.puntaje, 0) / roles.length),
    roles,
    rechazos: Object.values(e.rechazosPorRol).reduce((a, b) => a + b, 0),
    incidentes: e.incidentes,
  };
}
