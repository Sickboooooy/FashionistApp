import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { evaluarVictoria, type DatosCandidata } from '../../harness/evaluator/victoria.ts';
import { config } from '../ayudantes.ts';

const criterios = config().cfg.victoria;

function datos(parcial: Partial<DatosCandidata> = {}): DatosCandidata {
  return { ventasNetas: 0, pedidosValidos: 50, margenContribucion: 1, periodoCompletado: true, infraccionesGraves: 0, ...parcial };
}

describe('criterios de victoria (sección 7)', () => {
  const casos: Array<{ nombre: string; alfa: Partial<DatosCandidata>; omega: Partial<DatosCandidata>; validados?: boolean; ganador: string | null }> = [
    { nombre: 'exactamente el doble gana', alfa: { ventasNetas: 2_000_000 }, omega: { ventasNetas: 1_000_000 }, ganador: 'alfa' },
    { nombre: 'un centavo menos del doble no gana', alfa: { ventasNetas: 1_999_999 }, omega: { ventasNetas: 1_000_000 }, ganador: null },
    { nombre: 'la regla es simétrica', alfa: { ventasNetas: 1_000_000 }, omega: { ventasNetas: 3_000_000 }, ganador: 'omega' },
    { nombre: 'rival en cero: gana quien cumple mínimos', alfa: { ventasNetas: 1_500_000 }, omega: { ventasNetas: 0 }, ganador: 'alfa' },
    { nombre: 'ambas en cero: no hay ganador', alfa: {}, omega: {}, ganador: null },
    { nombre: 'menos de 20 pedidos válidos', alfa: { ventasNetas: 5_000_000, pedidosValidos: 19 }, omega: { ventasNetas: 100 }, ganador: null },
    { nombre: 'ventas netas bajo 10,000 MXN', alfa: { ventasNetas: 999_999 }, omega: { ventasNetas: 100 }, ganador: null },
    { nombre: 'margen de contribución no positivo', alfa: { ventasNetas: 5_000_000, margenContribucion: 0 }, omega: { ventasNetas: 100 }, ganador: null },
    { nombre: 'infracción grave sin resolver', alfa: { ventasNetas: 5_000_000, infraccionesGraves: 1 }, omega: { ventasNetas: 100 }, ganador: null },
    { nombre: 'periodo incompleto', alfa: { ventasNetas: 5_000_000, periodoCompletado: false }, omega: { ventasNetas: 100 }, ganador: null },
    { nombre: 'registros no validados por el Juez', alfa: { ventasNetas: 5_000_000 }, omega: { ventasNetas: 100 }, validados: false, ganador: null },
  ];
  for (const c of casos) {
    test(c.nombre, () => {
      const dictamen = evaluarVictoria({ alfa: datos(c.alfa), omega: datos(c.omega) }, criterios, c.validados ?? true);
      assert.equal(dictamen.ganador, c.ganador, dictamen.motivo);
    });
  }

  test('cada dictamen cita las reglas V1–V7 para ambas empresas', () => {
    const d = evaluarVictoria({ alfa: datos({ ventasNetas: 2_000_000 }), omega: datos({ ventasNetas: 1 }) }, criterios, true);
    for (const e of ['alfa', 'omega'] as const) {
      assert.deepEqual(d.comprobaciones[e].map((c) => c.regla), ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7']);
    }
  });

  test('los criterios provienen de config/experiment.json', () => {
    assert.deepEqual(criterios, {
      multiplicador_ventas: 2,
      pedidos_validos_minimos: 20,
      ventas_netas_minimas: 1_000_000,
      exigir_margen_contribucion_positivo: true,
    });
  });
});
