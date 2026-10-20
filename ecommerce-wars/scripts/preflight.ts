import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { cargarConfig } from '../shared/config.ts';
import { crearRutas, enCorrida, RELATIVAS, rutaConfig } from '../harness/permissions/rutas.ts';
import { hashArbolCodigo, type Preflight } from '../harness/orchestrator/corrida.ts';

/**
 * Ejecuta las pruebas críticas y registra un resultado determinista (sin
 * duraciones ni fechas) en reports/evidence/preflight.json de la corrida.
 * Ninguna ronda es válida si este registro no está aprobado.
 */
const { values } = parseArgs({ options: { corrida: { type: 'string' } } });
const rutas = crearRutas(values.corrida ? resolve(values.corrida) : undefined);
const ci = cargarConfig(rutaConfig(rutas));

function listar(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const ruta = join(dir, d.name);
    if (d.isDirectory()) return d.name === 'fixtures' ? [] : listar(ruta);
    return d.name.endsWith('.test.ts') ? [ruta] : [];
  });
}

const archivos = listar(join(rutas.raizCodigo, 'tests')).sort();
const inicio = Date.now();
const salida = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...archivos], {
  cwd: rutas.raizCodigo,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
});
const contar = (clave: string) => Number(new RegExp(`^# ${clave} (\\d+)$`, 'm').exec(salida.stdout)?.[1] ?? '0');
const total = contar('tests');
const fallidas = contar('fail') + contar('cancelled');
const resultado: Preflight = {
  aprobado: salida.status === 0 && fallidas === 0 && total > 0,
  total,
  aprobadas: contar('pass'),
  fallidas,
  archivos: archivos.map((a) => relative(rutas.raizCodigo, a)),
  hashConfig: ci.hash,
  hashCodigo: hashArbolCodigo(rutas.raizCodigo),
  sintetico: false,
};

mkdirSync(enCorrida(rutas, 'reports', 'evidence'), { recursive: true });
writeFileSync(enCorrida(rutas, RELATIVAS.preflight), `${JSON.stringify(resultado, null, 2)}\n`);
mkdirSync(enCorrida(rutas, RELATIVAS.telemetria), { recursive: true });
writeFileSync(
  enCorrida(rutas, RELATIVAS.telemetria, 'preflight.json'),
  `${JSON.stringify({ ejecutadoEn: new Date().toISOString(), ms: Date.now() - inicio, codigoSalida: salida.status }, null, 2)}\n`,
);

if (!resultado.aprobado) {
  process.stdout.write(salida.stdout.split('\n').filter((l) => l.startsWith('not ok') || l.includes('# fail')).join('\n'));
  process.stderr.write(`\nPruebas críticas FALLIDAS: ${fallidas} de ${total}. Ninguna ronda sería válida.\n`);
  process.exit(1);
}
process.stdout.write(`Pruebas críticas aprobadas: ${resultado.aprobadas}/${total} (${archivos.length} archivos).\n`);
