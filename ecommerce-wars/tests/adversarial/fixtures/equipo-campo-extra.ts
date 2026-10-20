import type { PlanPeriodo } from '../../../shared/schemas/decisiones.ts';
import base, { type EquipoEmpresa } from '../../../agents/nucleo/equipo.ts';

/** Equipo que intenta "reportar" ventas por su cuenta añadiendo un campo al contrato. */
const campoExtra: EquipoEmpresa = {
  decidir: (vista, almacen) => ({ ...base.decidir(vista, almacen), ventasReportadas: 999_999_999 }) as PlanPeriodo,
  contabilizar: (empresa, ronda, almacen) => base.contabilizar(empresa, ronda, almacen),
  aprender: (vista, almacen) => base.aprender(vista, almacen),
};

export default campoExtra;
