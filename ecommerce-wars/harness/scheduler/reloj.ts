/**
 * Ritmo de la simulación en el War Room. El tiempo simulado (días, rondas) lo
 * fija el motor; el reloj sólo decide cuánto tiempo real esperar entre días.
 * Pausar o cambiar la velocidad nunca altera los resultados.
 */
export const MS_POR_DIA_MAXIMO = 60_000;

export class Reloj {
  #pausado: boolean;
  #msPorDia: number;
  #despertar: (() => void) | null = null;

  constructor(opciones: { msPorDia: number; pausado: boolean }) {
    this.#msPorDia = Reloj.#acotar(opciones.msPorDia);
    this.#pausado = opciones.pausado;
  }

  static #acotar(ms: number): number {
    return Math.max(0, Math.min(MS_POR_DIA_MAXIMO, Math.round(ms)));
  }

  get pausado(): boolean {
    return this.#pausado;
  }

  get msPorDia(): number {
    return this.#msPorDia;
  }

  pausar(): void {
    this.#pausado = true;
    this.#interrumpir();
  }

  reanudar(): void {
    this.#pausado = false;
    this.#interrumpir();
  }

  fijarVelocidad(ms: number): void {
    this.#msPorDia = Reloj.#acotar(ms);
    this.#interrumpir();
  }

  #interrumpir(): void {
    const despertar = this.#despertar;
    this.#despertar = null;
    despertar?.();
  }

  /** Resuelve cuando toca simular el siguiente día (en pausa, espera a reanudar). */
  async esperarTurno(): Promise<void> {
    for (;;) {
      if (this.#pausado) {
        await this.#dormir(Number.POSITIVE_INFINITY);
        continue;
      }
      const interrumpido = await this.#dormir(this.#msPorDia);
      if (!interrumpido) return;
    }
  }

  #dormir(ms: number): Promise<boolean> {
    return new Promise((resolver) => {
      let plazo: ReturnType<typeof setTimeout> | null = null;
      const terminar = (interrumpido: boolean) => {
        if (plazo) clearTimeout(plazo);
        if (this.#despertar === alInterrumpir) this.#despertar = null;
        resolver(interrumpido);
      };
      const alInterrumpir = () => terminar(true);
      this.#despertar = alInterrumpir;
      if (Number.isFinite(ms)) plazo = setTimeout(() => terminar(false), ms);
    });
  }
}
