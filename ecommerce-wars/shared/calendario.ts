const MS_DIA = 86_400_000;

/**
 * Fecha simulada del día global N (N = 1 es fecha_inicio_simulada). Es tiempo
 * lógico del experimento: no depende del reloj del ordenador.
 */
export function fechaSimulada(fechaInicio: string, diaGlobal: number): string {
  const base = Date.parse(`${fechaInicio}T00:00:00Z`);
  if (Number.isNaN(base)) throw new RangeError(`fecha de inicio inválida: ${fechaInicio}`);
  return new Date(base + (Math.max(1, diaGlobal) - 1) * MS_DIA).toISOString().slice(0, 10);
}

export function diaGlobalDe(ronda: number, dia: number, diasPorPeriodo: number): number {
  return (ronda - 1) * diasPorPeriodo + dia;
}
