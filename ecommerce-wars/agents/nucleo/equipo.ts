import type { ReporteFinanciero } from '../../shared/contracts/finanzas.ts';
import type { VistaEmpresa } from '../../shared/contracts/vista.ts';
import { hashCanonico } from '../../shared/hash.ts';
import { crearRng } from '../../shared/rng.ts';
import type { PlanPeriodo } from '../../shared/schemas/decisiones.ts';
import type { EmpresaId, RolComercial } from '../../shared/types/dominio.ts';
import type { AlmacenRestringido } from '../../harness/permissions/almacen.ts';
import { aprender } from './aprendizaje.ts';
import type { ContextoRol } from './comun.ts';
import { decidirCompras } from './compras.ts';
import { decidirDirector } from './director.ts';
import { contabilizarRonda, revisarPlan } from './finanzas.ts';
import { decidirMarketing } from './marketing.ts';
import { MemoriaSchema, memoriaInicial, RUTA_MEMORIA, type Memoria } from './memoria.ts';
import { PerfilSchema, type Perfil } from './perfil.ts';
import { decidirVentas } from './ventas.ts';

export type FabricaAlmacen = (rol: RolComercial) => AlmacenRestringido;

/** Contrato que cualquier implementación de equipo comercial debe cumplir. */
export interface EquipoEmpresa {
  decidir(vista: VistaEmpresa, almacen: FabricaAlmacen): PlanPeriodo;
  contabilizar(empresa: EmpresaId, ronda: number, almacen: FabricaAlmacen): ReporteFinanciero;
  aprender(vista: VistaEmpresa, almacen: FabricaAlmacen): { hashMemoria: string; lecciones: string[] };
}

function cargarPerfil(almacen: AlmacenRestringido, empresa: EmpresaId): Perfil {
  const perfil = almacen.leerJsonCodigo(`agents/${empresa}/perfil.json`, PerfilSchema);
  if (perfil.empresa !== empresa) throw new Error(`el perfil de ${empresa} declara otra empresa`);
  return perfil;
}

function cargarMemoria(almacen: AlmacenRestringido, vista: VistaEmpresa, perfil: Perfil): Memoria {
  const ruta = RUTA_MEMORIA(vista.empresa);
  return almacen.existe(ruta) ? almacen.leerJson(ruta, MemoriaSchema) : memoriaInicial(perfil, vista.reglas);
}

function contexto(vista: VistaEmpresa, almacen: AlmacenRestringido): ContextoRol {
  const perfil = cargarPerfil(almacen, vista.empresa);
  return { vista, perfil, memoria: cargarMemoria(almacen, vista, perfil), rng: crearRng(vista.semillaAgente) };
}

const equipo: EquipoEmpresa = {
  decidir(vista, almacen) {
    const ctx = contexto(vista, almacen('director'));
    const director = decidirDirector(ctx);
    const compras = decidirCompras(ctx, director.presupuesto.inventario);
    const marketing = decidirMarketing(ctx, director.presupuesto.marketing);
    const ventas = decidirVentas(ctx, director.presupuesto.fichas, compras);
    return { empresa: vista.empresa, ronda: vista.ronda, director, ...revisarPlan(ctx, { compras, marketing, ventas }) };
  },

  contabilizar(empresa, ronda, almacen) {
    return contabilizarRonda(empresa, ronda, almacen('finanzas'));
  },

  aprender(vista, almacen) {
    const director = almacen('director');
    const { memoria, lecciones } = aprender(contexto(vista, director));
    const validada = MemoriaSchema.parse(memoria);
    director.escribirJson(RUTA_MEMORIA(vista.empresa), validada);
    return { hashMemoria: hashCanonico(validada), lecciones };
  },
};

export default equipo;
