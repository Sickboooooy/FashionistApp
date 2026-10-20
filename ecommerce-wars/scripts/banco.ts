import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { cargarConfig } from '../shared/config.ts';
import { formatoMXN } from '../shared/money.ts';
import { EMPRESAS, type EmpresaId } from '../shared/types/dominio.ts';
import { Controlador } from '../harness/orchestrator/controlador.ts';
import { preflightSintetico } from '../harness/orchestrator/corrida.ts';
import type { ResumenRondaArchivo } from '../harness/orchestrator/resumen.ts';
import { crearRutas, enCorrida, raizCodigoPorDefecto, RELATIVAS, rutaConfig } from '../harness/permissions/rutas.ts';

/**
 * Banco de escenarios (apartado 16.6): compara las estrategias de ALFA y OMEGA
 * sobre varias semillas controladas. Cada corrida es independiente y reproducible.
 */
const { values } = parseArgs({ options: { semillas: { type: 'string', default: '5' }, rondas: { type: 'string', default: '6' } } });
const raiz = raizCodigoPorDefecto();
const ci = cargarConfig(rutaConfig(crearRutas(raiz, raiz)));
const semillas = Array.from({ length: Number(values.semillas) }, (_, i) => ci.cfg.semilla + i);
const rondasMax = Number(values.rondas);

interface Corrida {
  semilla: number;
  ganador: EmpresaId | null;
  rondaFin: number;
  motivo: string;
  rondas: Array<{ ronda: number; ventasNetas: Record<EmpresaId, number>; margen: Record<EmpresaId, number>; calidad: Record<EmpresaId, number> }>;
}

const corridas: Corrida[] = [];
let perfiles: Record<EmpresaId, string> = { alfa: 'ALFA', omega: 'OMEGA' };
for (const semilla of semillas) {
  const dir = mkdtempSync(join(tmpdir(), 'ew-banco-'));
  try {
    const rutas = crearRutas(dir, raiz);
    const c = await Controlador.iniciar({ rutas, modo: 'prueba', semilla, aislamiento: 'en-proceso', preflight: preflightSintetico(ci.hash), rondasMaximas: rondasMax });
    await c.correrHastaFin();
    const rondas = [];
    for (let n = 1; n <= c.estado().ronda; n++) {
      const r = JSON.parse(readFileSync(enCorrida(rutas, RELATIVAS.resumenRonda(n)), 'utf8')) as ResumenRondaArchivo;
      perfiles = r.perfiles;
      const por = <T>(f: (e: EmpresaId) => T) => ({ alfa: f('alfa'), omega: f('omega') });
      rondas.push({
        ronda: n,
        ventasNetas: por((e) => r.empresas[e].resumen.financiero.ventasNetas),
        margen: por((e) => r.empresas[e].resumen.financiero.margenContribucion),
        calidad: por((e) => r.empresas[e].calidad.promedio),
      });
    }
    corridas.push({ semilla, ganador: c.estado().ganador, rondaFin: c.estado().ronda, motivo: c.estado().motivoFin ?? '', rondas });
    process.stdout.write(`semilla ${semilla}: ${c.estado().ganador ? `gana ${c.estado().ganador?.toUpperCase()} en R${c.estado().ronda}` : `sin ganador tras ${c.estado().ronda} rondas`}\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const media = (xs: number[]) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const porEstrategia = Object.fromEntries(
  EMPRESAS.map((e) => {
    const todas = corridas.flatMap((c) => c.rondas);
    return [
      e,
      {
        perfil: perfiles[e],
        victorias: corridas.filter((c) => c.ganador === e).length,
        ventasNetasMediaPorRonda: Math.round(media(todas.map((r) => r.ventasNetas[e]))),
        margenMedioPorRonda: Math.round(media(todas.map((r) => r.margen[e]))),
        calidadMedia: Math.round(media(todas.map((r) => r.calidad[e]))),
        rondasConMargenNegativo: todas.filter((r) => r.margen[e] <= 0).length,
      },
    ];
  }),
);
const resultado = { generadoEn: new Date().toISOString(), semillas, rondasMaximas: rondasMax, porEstrategia, corridas };

mkdirSync(join(raiz, 'reports', 'banco'), { recursive: true });
writeFileSync(join(raiz, 'reports', 'banco', 'resultado.json'), `${JSON.stringify(resultado, null, 2)}\n`);
const md = [
  '# Banco de escenarios',
  '',
  `${semillas.length} semillas (${semillas[0]}–${semillas.at(-1)}), hasta ${rondasMax} rondas cada una. Mismo código, mismas reglas; sólo cambia la semilla.`,
  '',
  '| Estrategia | Victorias | Ventas netas medias/ronda | Margen contrib. medio/ronda | Calidad media | Rondas con margen ≤ 0 |',
  '|---|---:|---:|---:|---:|---:|',
  ...EMPRESAS.map((e) => {
    const p = porEstrategia[e] as (typeof porEstrategia)[string];
    return `| ${e.toUpperCase()} · ${p.perfil} | ${p.victorias} | ${formatoMXN(p.ventasNetasMediaPorRonda)} | ${formatoMXN(p.margenMedioPorRonda)} | ${p.calidadMedia} | ${p.rondasConMargenNegativo} |`;
  }),
  '',
  '| Semilla | Resultado | Rondas |',
  '|---:|---|---:|',
  ...corridas.map((c) => `| ${c.semilla} | ${c.ganador ? `gana ${c.ganador.toUpperCase()}` : 'sin ganador'} | ${c.rondaFin} |`),
  '',
];
writeFileSync(join(raiz, 'reports', 'banco', 'resultado.md'), md.join('\n'));
process.stdout.write(`\n${md.join('\n')}\n`);
