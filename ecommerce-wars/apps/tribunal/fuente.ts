import { closeSync, existsSync, fstatSync, openSync, readSync } from 'node:fs';
import type { ConfigIndexada } from '../../shared/config.ts';
import { EventoSelladoSchema, type EventoSellado } from '../../shared/schemas/eventos.ts';
import { aplicarEvento, crearProyeccion, type Proyeccion } from '../../simulation/economics/proyeccion.ts';
import { hashEvento } from '../../harness/event-bus/diario.ts';

export interface EstadoIntegridad {
  ok: boolean;
  eventos: number;
  ultimoHash: string;
  errores: string[];
}

/**
 * Sigue el diario de una corrida (sólo lectura) y verifica la cadena de hashes
 * de cada evento nuevo al momento de recibirlo. Mantiene la proyección en vivo.
 */
export class FuenteDiario {
  readonly ruta: string;
  readonly proyeccion: Proyeccion;
  #genesis: string;
  #desplazamiento = 0;
  #resto = '';
  #eventos: EventoSellado[] = [];
  #errores: string[] = [];
  #suscriptores = new Set<(eventos: readonly EventoSellado[]) => void>();

  constructor(ruta: string, ci: ConfigIndexada, genesis: string) {
    this.ruta = ruta;
    this.#genesis = genesis;
    this.proyeccion = crearProyeccion(ci.cfg.dias_por_periodo);
  }

  get eventos(): readonly EventoSellado[] {
    return this.#eventos;
  }

  integridad(): EstadoIntegridad {
    return {
      ok: this.#errores.length === 0,
      eventos: this.#eventos.length,
      ultimoHash: this.#eventos.at(-1)?.hash ?? this.#genesis,
      errores: [...this.#errores],
    };
  }

  desde(seq: number): EventoSellado[] {
    if (seq <= 0) return [...this.#eventos];
    const i = this.#eventos.findIndex((e) => e.seq >= seq);
    return i < 0 ? [] : this.#eventos.slice(i);
  }

  suscribir(fn: (eventos: readonly EventoSellado[]) => void): () => void {
    this.#suscriptores.add(fn);
    return () => this.#suscriptores.delete(fn);
  }

  /** Lee lo que se haya anexado al diario desde la última lectura. */
  sondear(): number {
    if (!existsSync(this.ruta)) return 0;
    const fd = openSync(this.ruta, 'r');
    let texto = '';
    try {
      const tamano = fstatSync(fd).size;
      if (tamano < this.#desplazamiento) {
        this.#errores.push('el diario se truncó o fue reemplazado: un registro append-only nunca debe encogerse');
        return 0;
      }
      if (tamano === this.#desplazamiento) return 0;
      const buffer = Buffer.alloc(tamano - this.#desplazamiento);
      readSync(fd, buffer, 0, buffer.length, this.#desplazamiento);
      this.#desplazamiento = tamano;
      texto = buffer.toString('utf8');
    } finally {
      closeSync(fd);
    }
    const lineas = (this.#resto + texto).split('\n');
    this.#resto = lineas.pop() ?? '';
    const nuevos: EventoSellado[] = [];
    for (const linea of lineas) {
      if (linea.length === 0) continue;
      const parseado = EventoSelladoSchema.safeParse(JSON.parse(linea));
      if (!parseado.success) {
        this.#errores.push('línea del diario con formato inválido');
        continue;
      }
      const e = parseado.data as unknown as EventoSellado;
      const anterior = this.#eventos.at(-1);
      const prevEsperado = anterior?.hash ?? this.#genesis;
      const seqEsperado = (anterior?.seq ?? -1) + 1;
      if (e.prevHash !== prevEsperado || e.seq !== seqEsperado) this.#errores.push(`seq ${e.seq}: no enlaza con el evento anterior`);
      if (hashEvento(e, e.seq, e.prevHash) !== e.hash) this.#errores.push(`seq ${e.seq}: hash alterado`);
      this.#eventos.push(e);
      aplicarEvento(this.proyeccion, e);
      nuevos.push(e);
    }
    if (nuevos.length > 0) for (const fn of this.#suscriptores) fn(nuevos);
    return nuevos.length;
  }
}
