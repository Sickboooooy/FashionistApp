import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { empresaDe, type Principal } from '../../shared/types/dominio.ts';
import type { Rutas } from './rutas.ts';

export type Operacion = 'lectura' | 'escritura';

interface Regla {
  raiz: 'codigo' | 'corrida';
  /** Prefijo relativo a la raíz; '' significa la raíz completa. */
  prefijo: string;
}

interface Politica {
  lectura: Regla[];
  escritura: Regla[];
  procesosHijos: boolean;
}

const codigo = (prefijo: string): Regla => ({ raiz: 'codigo', prefijo });
const corrida = (prefijo: string): Regla => ({ raiz: 'corrida', prefijo });

/** Código que cualquier proceso aislado necesita para arrancar (público e inmutable). */
const CODIGO_BASE = [
  codigo('package.json'),
  codigo('node_modules'),
  codigo('shared'),
  codigo('simulation'),
  codigo('config'),
  codigo('harness/permissions'),
];

/**
 * Matriz de permisos (sección 9 de AGENTS.md). Los agentes comerciales sólo ven
 * lo público y lo propio; nadie fuera del Juez escribe en reports/verdicts; nadie
 * escribe en config/ ni en harness/evaluator/ durante la corrida.
 */
export function politicaDe(principal: Principal): Politica {
  const empresa = empresaDe(principal);
  if (empresa && principal.endsWith(':tienda')) {
    return {
      lectura: [
        ...CODIGO_BASE,
        codigo(`apps/${empresa}`),
        codigo('apps/shared'),
        codigo('harness/event-bus'),
        corrida('data/public'),
        corrida(`data/private/${empresa}`),
      ],
      escritura: [corrida(`data/private/${empresa}/tienda`)],
      procesosHijos: false,
    };
  }
  if (empresa) {
    return {
      lectura: [
        ...CODIGO_BASE,
        codigo('agents/nucleo'),
        codigo(`agents/${empresa}`),
        corrida('data/public'),
        corrida(`data/private/${empresa}`),
      ],
      escritura: [corrida(`data/private/${empresa}`)],
      procesosHijos: false,
    };
  }
  switch (principal) {
    case 'juez':
    case 'auditor':
    case 'verificador':
      return { lectura: [codigo(''), corrida('')], escritura: [corrida('reports/verdicts')], procesosHijos: false };
    case 'harness':
      return {
        lectura: [codigo(''), corrida('')],
        escritura: [
          corrida('data'),
          corrida('reports/evidence'),
          corrida('reports/rounds'),
          corrida('reports/telemetria'),
          corrida('reports/reporte-final.md'),
          corrida('corrida.json'),
        ],
        procesosHijos: true,
      };
    case 'tribunal':
      return { lectura: [codigo(''), corrida('')], escritura: [], procesosHijos: false };
    case 'mercado':
      return { lectura: [...CODIGO_BASE], escritura: [], procesosHijos: false };
    default:
      return { lectura: [], escritura: [], procesosHijos: false };
  }
}

function absoluta(regla: Regla, rutas: Rutas): string {
  const raiz = regla.raiz === 'codigo' ? rutas.raizCodigo : rutas.raizCorrida;
  return regla.prefijo === '' ? raiz : join(raiz, regla.prefijo);
}

function contiene(base: string, objetivo: string): boolean {
  const rel = relative(base, objetivo);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel) && !rel.split(sep).includes('..'));
}

export function permitido(principal: Principal, operacion: Operacion, rutaAbsoluta: string, rutas: Rutas): boolean {
  const objetivo = resolve(rutaAbsoluta);
  const politica = politicaDe(principal);
  const reglas = operacion === 'lectura' ? [...politica.lectura, ...politica.escritura] : politica.escritura;
  return reglas.some((r) => contiene(absoluta(r, rutas), objetivo));
}

/** Banderas de `node --permission` equivalentes a la política del principal. */
export function banderasPermiso(
  principal: Principal,
  rutas: Rutas,
  extra: { lectura?: readonly string[]; escritura?: readonly string[] } = {},
): string[] {
  const politica = politicaDe(principal);
  const lecturas = new Set([...politica.lectura, ...politica.escritura].map((r) => absoluta(r, rutas)));
  for (const r of extra.lectura ?? []) lecturas.add(resolve(r));
  const escrituras = new Set(politica.escritura.map((r) => absoluta(r, rutas)));
  for (const r of extra.escritura ?? []) escrituras.add(resolve(r));
  return [
    '--permission',
    ...[...lecturas].map((r) => `--allow-fs-read=${r}`),
    ...[...escrituras].map((r) => `--allow-fs-write=${r}`),
    ...(politica.procesosHijos ? ['--allow-child-process'] : []),
  ];
}
