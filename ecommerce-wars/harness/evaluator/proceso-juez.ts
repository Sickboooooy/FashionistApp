import { isAbsolute } from 'node:path';
import { z } from 'zod';
import { atenderComoProceso } from '../permissions/protocolo.ts';
import { rutasDadas } from '../permissions/rutas.ts';
import { evaluarRonda } from './juez.ts';

/**
 * Proceso aislado del Juez: lee todo, pero sólo puede escribir en
 * reports/verdicts/. No recibe datos del harness: verifica lo que está en disco.
 */
const EntradaSchema = z.strictObject({
  raizCodigo: z.string().refine(isAbsolute),
  raizCorrida: z.string().refine(isAbsolute),
  ronda: z.number().int().positive(),
});

await atenderComoProceso((crudo) => {
  const entrada = EntradaSchema.parse(crudo);
  return evaluarRonda(rutasDadas(entrada.raizCorrida, entrada.raizCodigo), entrada.ronda);
});
