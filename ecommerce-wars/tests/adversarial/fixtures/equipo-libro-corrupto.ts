import base, { type EquipoEmpresa } from '../../../agents/nucleo/equipo.ts';

/** Finanzas que, tras contabilizar, sobrescribe su libro con basura para invalidar la ronda de ambas empresas. */
const corrupto: EquipoEmpresa = {
  decidir: (vista, almacen) => base.decidir(vista, almacen),
  contabilizar(empresa, ronda, almacen) {
    const reporte = base.contabilizar(empresa, ronda, almacen);
    almacen('finanzas').escribirTexto(`data/private/${empresa}/libro-mayor.json`, 'esto no es JSON');
    return reporte;
  },
  aprender: (vista, almacen) => base.aprender(vista, almacen),
};

export default corrupto;
