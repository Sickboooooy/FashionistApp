export const EMPRESAS = ['alfa', 'omega'] as const;
export type EmpresaId = (typeof EMPRESAS)[number];

export const ROLES_COMERCIALES = ['director', 'compras', 'marketing', 'ventas', 'finanzas'] as const;
export type RolComercial = (typeof ROLES_COMERCIALES)[number];

export const ROLES_JUDICIALES = ['juez', 'auditor', 'verificador'] as const;
export type RolJudicial = (typeof ROLES_JUDICIALES)[number];

/** Identidad de quien opera sobre el sistema; determina sus permisos. */
export type Principal =
  | `${EmpresaId}:${RolComercial}`
  | `${EmpresaId}:tienda`
  | RolJudicial
  | 'harness'
  | 'mercado'
  | 'tribunal';

export function esEmpresa(valor: unknown): valor is EmpresaId {
  return valor === 'alfa' || valor === 'omega';
}

export function rivalDe(empresa: EmpresaId): EmpresaId {
  return empresa === 'alfa' ? 'omega' : 'alfa';
}

export function empresaDe(principal: Principal): EmpresaId | null {
  const [prefijo] = principal.split(':');
  return esEmpresa(prefijo) ? prefijo : null;
}

export type Severidad = 'leve' | 'grave' | 'critica';
