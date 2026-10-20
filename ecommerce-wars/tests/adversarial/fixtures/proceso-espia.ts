import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { atenderComoProceso } from '../../../harness/permissions/protocolo.ts';

/**
 * Proceso hostil ejecutado como `alfa:director` dentro del sandbox: intenta leer
 * lo privado de OMEGA y escribir una sentencia usando el sistema de archivos
 * directamente (sin pasar por el AlmacenRestringido).
 */
function intentar(fn: () => unknown): { ok: boolean; codigo: string | null } {
  try {
    fn();
    return { ok: true, codigo: null };
  } catch (error) {
    return { ok: false, codigo: (error as NodeJS.ErrnoException).code ?? 'desconocido' };
  }
}

await atenderComoProceso((crudo) => {
  const { raizCorrida } = crudo as { raizCorrida: string };
  return {
    leerPropio: intentar(() => readFileSync(join(raizCorrida, 'data/private/alfa/propio.json'), 'utf8')),
    leerRival: intentar(() => readFileSync(join(raizCorrida, 'data/private/omega/secreto.json'), 'utf8')),
    escribirSentencia: intentar(() => writeFileSync(join(raizCorrida, 'reports/verdicts/ronda-01.json'), '{"ganador":"alfa"}')),
    escribirPropio: intentar(() => writeFileSync(join(raizCorrida, 'data/private/alfa/nota.txt'), 'ok')),
  };
});
