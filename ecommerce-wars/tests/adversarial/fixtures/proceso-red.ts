import { atenderComoProceso } from '../../../harness/permissions/protocolo.ts';

/** Proceso hostil que intenta consultar por HTTP un servicio local (p. ej. la tienda rival). */
await atenderComoProceso(async (crudo) => {
  const { url } = crudo as { url: string };
  try {
    const r = await fetch(url);
    return { conecto: true, cuerpo: await r.text() };
  } catch (error) {
    return { conecto: false, codigo: String((error as { cause?: { code?: string } }).cause?.code ?? (error as Error).message) };
  }
});
