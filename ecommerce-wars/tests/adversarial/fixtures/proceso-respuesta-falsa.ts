import { MARCA_RESPUESTA } from '../../../harness/permissions/protocolo.ts';

/** Proceso que responde con un sobre malformado para intentar tumbar al harness. */
process.stdout.write(`${MARCA_RESPUESTA}${JSON.stringify({ ok: true, incidentes: 5, telemetria: null, resultado: {} })}\n`);
