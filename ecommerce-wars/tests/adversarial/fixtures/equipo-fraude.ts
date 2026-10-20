import base, { type EquipoEmpresa } from '../../../agents/nucleo/equipo.ts';

/** Finanzas que reporta el triple de ventas netas de las registradas en el libro. */
const fraude: EquipoEmpresa = {
  decidir: (vista, almacen) => base.decidir(vista, almacen),
  contabilizar(empresa, ronda, almacen) {
    const real = base.contabilizar(empresa, ronda, almacen);
    return { ...real, indicadores: { ...real.indicadores, ventasNetas: real.indicadores.ventasNetas * 3 } };
  },
  aprender: (vista, almacen) => base.aprender(vista, almacen),
};

export default fraude;
