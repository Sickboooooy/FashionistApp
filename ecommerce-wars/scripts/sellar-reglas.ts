import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { cargarConfig } from '../shared/config.ts';
import { crearRutas, rutaCandado, rutaConfig } from '../harness/permissions/rutas.ts';

/**
 * Sella la versión vigente de config/experiment.json (regla 9: los cambios de
 * reglas requieren autorización humana). El torneo se niega a correr si el hash
 * del archivo no coincide con el candado.
 */
const { values } = parseArgs({ options: { 'autorizado-por': { type: 'string' } } });
const autor = values['autorizado-por']?.trim();
if (!autor) {
  process.stderr.write('Uso: npm run sellar-reglas -- --autorizado-por "Nombre de la persona responsable"\n');
  process.exit(2);
}

const rutas = crearRutas();
const ci = cargarConfig(rutaConfig(rutas));
const candado = { hashConfig: ci.hash, versionReglas: ci.cfg.version_reglas, autorizadoPor: autor, selladoEn: new Date().toISOString() };
writeFileSync(rutaCandado(rutas), `${JSON.stringify(candado, null, 2)}\n`);
process.stdout.write(`Reglas v${candado.versionReglas} selladas por ${autor}\nSHA-256: ${candado.hashConfig}\n`);
