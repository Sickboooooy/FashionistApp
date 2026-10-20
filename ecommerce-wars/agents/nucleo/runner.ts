import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import type { VistaEmpresa } from '../../shared/contracts/vista.ts';
import { AlmacenRestringido } from '../../harness/permissions/almacen.ts';
import { atenderComoProceso } from '../../harness/permissions/protocolo.ts';
import { rutasDadas } from '../../harness/permissions/rutas.ts';
import type { EquipoEmpresa } from './equipo.ts';

/**
 * Punto de entrada del proceso aislado de una empresa. Se ejecuta con
 * `node --permission`: sólo puede leer lo público, lo propio y su código.
 */
const EntradaSchema = z.strictObject({
  operacion: z.enum(['decidir', 'contabilizar', 'aprender']),
  empresa: z.enum(['alfa', 'omega']),
  ronda: z.number().int().positive(),
  raizCodigo: z.string().refine(isAbsolute),
  raizCorrida: z.string().refine(isAbsolute),
  modulo: z.string().refine(isAbsolute).nullable(),
  vista: z.unknown().optional(),
});

await atenderComoProceso(async (crudo, registrarIncidente) => {
  const entrada = EntradaSchema.parse(crudo);
  const rutas = rutasDadas(entrada.raizCorrida, entrada.raizCodigo);
  const especificador = entrada.modulo ? pathToFileURL(entrada.modulo).href : new URL('./equipo.ts', import.meta.url).href;
  const equipo = (await import(especificador)).default as EquipoEmpresa;
  const almacen = (rol: Parameters<Parameters<EquipoEmpresa['decidir']>[1]>[0]) =>
    new AlmacenRestringido(rutas, `${entrada.empresa}:${rol}`, registrarIncidente);

  switch (entrada.operacion) {
    case 'decidir':
      return equipo.decidir(entrada.vista as VistaEmpresa, almacen);
    case 'contabilizar':
      return equipo.contabilizar(entrada.empresa, entrada.ronda, almacen);
    case 'aprender':
      return equipo.aprender(entrada.vista as VistaEmpresa, almacen);
  }
});
