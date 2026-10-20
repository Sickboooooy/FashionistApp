import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';
import { jsonCanonico, sha256 } from '../../shared/hash.ts';
import { EventoSelladoSchema, type Evento, type EventoSellado } from '../../shared/schemas/eventos.ts';

/** Hash inicial de la cadena: depende de la configuración y la semilla de la corrida. */
export function hashGenesis(hashConfig: string, semilla: number): string {
  return sha256(`E-COMMERCE WARS|genesis|${hashConfig}|${semilla}`);
}

export function cuerpoSellable(e: Evento, seq: number): unknown {
  return { seq, ronda: e.ronda, dia: e.dia, actor: e.actor, empresa: e.empresa, tipo: e.tipo, datos: e.datos };
}

export function hashEvento(e: Evento, seq: number, prevHash: string): string {
  return sha256(`${prevHash}|${jsonCanonico(cuerpoSellable(e, seq))}`);
}

export function sellar(e: Evento, seq: number, prevHash: string): EventoSellado {
  return { ...e, seq, prevHash, hash: hashEvento(e, seq, prevHash) } as EventoSellado;
}

export interface ResultadoCadena {
  ok: boolean;
  errores: string[];
  ultimoHash: string;
  ultimoSeq: number;
}

/** Verifica secuencia, enlace prevHash y hash de cada evento. */
export function verificarCadena(eventos: readonly EventoSellado[], prevHashInicial: string, seqInicial = 0): ResultadoCadena {
  const errores: string[] = [];
  let prev = prevHashInicial;
  let esperado = seqInicial;
  for (const e of eventos) {
    if (e.seq !== esperado) errores.push(`seq ${e.seq}: se esperaba ${esperado}`);
    if (e.prevHash !== prev) errores.push(`seq ${e.seq}: prevHash no enlaza con el evento anterior`);
    const recalculado = hashEvento(e, e.seq, e.prevHash);
    if (recalculado !== e.hash) errores.push(`seq ${e.seq}: hash alterado`);
    prev = e.hash;
    esperado = e.seq + 1;
    if (errores.length > 50) break;
  }
  return { ok: errores.length === 0, errores, ultimoHash: prev, ultimoSeq: esperado - 1 };
}

/** Lee un archivo JSONL de eventos sellados validando el sobre de cada línea. */
export function leerEventos(ruta: string): EventoSellado[] {
  if (!existsSync(ruta)) return [];
  const lineas = readFileSync(ruta, 'utf8').split('\n').filter((l) => l.length > 0);
  return lineas.map((linea, i) => {
    const r = EventoSelladoSchema.safeParse(JSON.parse(linea));
    if (!r.success) throw new Error(`${ruta}:${i + 1}: evento con formato inválido`);
    return r.data as unknown as EventoSellado;
  });
}

/**
 * fsync de mejor esfuerzo. Con `node --permission` el runtime deshabilita fsync;
 * en ese caso la línea ya fue entregada al kernel por writeSync y sobrevive a la
 * caída del proceso (no a la del sistema operativo). Ver docs/BLOQUEOS.md.
 */
function sincronizar(fd: number): void {
  try {
    fsyncSync(fd);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_ACCESS_DENIED') throw error;
  }
}

export function serializarEventos(eventos: readonly EventoSellado[]): string {
  return eventos.map((e) => `${JSON.stringify(e)}\n`).join('');
}

/**
 * Diario único y append-only del experimento. Cada lote se escribe con una sola
 * llamada y fsync: un evento "confirmado" es el que ya quedó sellado en disco.
 */
export class Diario {
  readonly ruta: string;
  readonly genesis: string;
  #ultimoSeq: number;
  #ultimoHash: string;
  #suscriptores: Array<(eventos: readonly EventoSellado[]) => void> = [];

  private constructor(ruta: string, genesis: string, ultimoSeq: number, ultimoHash: string) {
    this.ruta = ruta;
    this.genesis = genesis;
    this.#ultimoSeq = ultimoSeq;
    this.#ultimoHash = ultimoHash;
  }

  /** Abre (o crea) el diario y verifica la cadena existente antes de aceptar escrituras. */
  static abrir(ruta: string, genesis: string): Diario {
    mkdirSync(dirname(ruta), { recursive: true });
    const existentes = leerEventos(ruta);
    const cadena = verificarCadena(existentes, genesis);
    if (!cadena.ok) throw new Error(`diario corrupto (${ruta}): ${cadena.errores.slice(0, 3).join('; ')}`);
    return new Diario(ruta, genesis, cadena.ultimoSeq, cadena.ultimoHash);
  }

  get ultimoSeq(): number {
    return this.#ultimoSeq;
  }

  get ultimoHash(): string {
    return this.#ultimoHash;
  }

  publicar(eventos: readonly Evento[]): EventoSellado[] {
    if (eventos.length === 0) return [];
    const sellados: EventoSellado[] = [];
    let prev = this.#ultimoHash;
    let seq = this.#ultimoSeq;
    for (const e of eventos) {
      seq++;
      const s = sellar(e, seq, prev);
      sellados.push(s);
      prev = s.hash;
    }
    const fd = openSync(this.ruta, 'a');
    try {
      writeSync(fd, serializarEventos(sellados));
      this.#ultimoSeq = seq;
      this.#ultimoHash = prev;
      sincronizar(fd);
    } finally {
      closeSync(fd);
    }
    for (const s of this.#suscriptores) s(sellados);
    return sellados;
  }

  suscribir(fn: (eventos: readonly EventoSellado[]) => void): () => void {
    this.#suscriptores.push(fn);
    return () => {
      this.#suscriptores = this.#suscriptores.filter((x) => x !== fn);
    };
  }

  leer(desdeSeq = 0): EventoSellado[] {
    return leerEventos(this.ruta).filter((e) => e.seq >= desdeSeq);
  }
}
