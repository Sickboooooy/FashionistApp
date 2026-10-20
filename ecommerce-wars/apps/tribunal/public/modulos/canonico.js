/*
 * Verificación en el navegador. Réplica exacta de jsonCanonico (shared/hash.ts):
 * claves ordenadas por unidades de código, sin espacios, sin `undefined`;
 * `undefined` dentro de arreglos se vuelve null. Hash con crypto.subtle (SHA-256).
 */

export function jsonCanonico(valor) {
  if (valor === null) return 'null';
  switch (typeof valor) {
    case 'number':
      if (!Number.isFinite(valor)) throw new TypeError(`jsonCanonico: número no finito (${valor})`);
      return JSON.stringify(valor);
    case 'string':
    case 'boolean':
      return JSON.stringify(valor);
    case 'object': {
      if (Array.isArray(valor)) return `[${valor.map((v) => jsonCanonico(v ?? null)).join(',')}]`;
      const entradas = Object.entries(valor)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${jsonCanonico(v)}`).join(',')}}`;
    }
    default:
      throw new TypeError(`jsonCanonico: tipo no serializable (${typeof valor})`);
  }
}

export function criptoDisponible() {
  return typeof crypto !== 'undefined' && Boolean(crypto.subtle) && typeof crypto.subtle.digest === 'function';
}

export async function sha256Hex(texto) {
  if (!criptoDisponible()) throw new Error('crypto.subtle no está disponible en este contexto (se requiere http://127.0.0.1 o https)');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const hashCanonico = async (valor) => sha256Hex(jsonCanonico(valor));

/** hashVeredicto = sha256(json_canónico(sentencia sin hashVeredicto)). */
export async function verificarSentencia(sentencia) {
  const { hashVeredicto, ...cuerpo } = sentencia;
  const calculado = await hashCanonico(cuerpo);
  return { ok: calculado === hashVeredicto, calculado, esperado: hashVeredicto };
}

/** hashExpediente = sha256(json_canónico(manifiesto sin hashExpediente)). */
export async function verificarManifiesto(manifiesto) {
  const { hashExpediente, ...resto } = manifiesto;
  const calculado = await hashCanonico(resto);
  return { ok: calculado === hashExpediente, calculado, esperado: hashExpediente };
}

/**
 * Cadena de eventos sellados: hash = sha256(prevHash | json_canónico(cuerpo sellable)),
 * con cuerpo = { seq, ronda, dia, actor, empresa, tipo, datos } (harness/event-bus/diario.ts).
 */
export async function verificarCadena(eventos, { prevHashInicio, hashFin } = {}, alProgreso) {
  const errores = [];
  let anterior = prevHashInicio ?? eventos[0]?.prevHash ?? null;
  for (let i = 0; i < eventos.length; i++) {
    const e = eventos[i];
    if (anterior !== null && e.prevHash !== anterior) errores.push(`seq ${e.seq}: no enlaza con el evento anterior`);
    const cuerpo = { seq: e.seq, ronda: e.ronda, dia: e.dia, actor: e.actor, empresa: e.empresa, tipo: e.tipo, datos: e.datos };
    const calculado = await sha256Hex(`${e.prevHash}|${jsonCanonico(cuerpo)}`);
    if (calculado !== e.hash) errores.push(`seq ${e.seq}: hash alterado`);
    anterior = e.hash;
    if (alProgreso && i % 100 === 0) alProgreso(i, eventos.length);
    if (errores.length >= 20) break;
  }
  if (hashFin && eventos.length > 0 && eventos.at(-1).hash !== hashFin) errores.push('el último evento no coincide con hashFin del manifiesto');
  return { ok: errores.length === 0, errores, eventos: eventos.length };
}
