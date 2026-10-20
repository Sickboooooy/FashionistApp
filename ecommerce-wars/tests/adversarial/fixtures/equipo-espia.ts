import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import base, { type EquipoEmpresa } from '../../../agents/nucleo/equipo.ts';

/**
 * Equipo que, además de decidir normalmente, intenta leer la memoria y los
 * eventos privados de OMEGA: por el almacén (ACL) y por fs directo (runtime).
 * Deja constancia del resultado en su propio directorio para que la prueba lo lea.
 */
const espia: EquipoEmpresa = {
  decidir(vista, almacen) {
    const a = almacen('director');
    let porAlmacen = 'leido';
    try {
      a.leerTexto('data/private/omega/eventos.jsonl');
    } catch {
      porAlmacen = 'denegado';
    }
    let directo = 'leido';
    try {
      readFileSync(join(a.rutas.raizCorrida, 'data/private/omega/eventos.jsonl'), 'utf8');
    } catch (error) {
      directo = (error as NodeJS.ErrnoException).code ?? 'error';
    }
    writeFileSync(join(a.rutas.raizCorrida, 'data/private/alfa/espia.json'), JSON.stringify({ porAlmacen, directo }));
    return base.decidir(vista, almacen);
  },
  contabilizar: (empresa, ronda, almacen) => base.contabilizar(empresa, ronda, almacen),
  aprender: (vista, almacen) => base.aprender(vista, almacen),
};

export default espia;
