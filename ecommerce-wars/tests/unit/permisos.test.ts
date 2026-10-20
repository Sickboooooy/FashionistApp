import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { banderasPermiso, permitido } from '../../harness/permissions/acl.ts';
import { AccesoDenegado, AlmacenRestringido, type IntentoDenegado } from '../../harness/permissions/almacen.ts';
import { corridaTemporal } from '../ayudantes.ts';

const { rutas, limpiar } = corridaTemporal();
const en = (...p: string[]) => join(rutas.raizCorrida, ...p);
const codigo = (...p: string[]) => join(rutas.raizCodigo, ...p);

test('los agentes de una empresa no pueden leer ni escribir lo privado de la otra', () => {
  assert.equal(permitido('alfa:director', 'lectura', en('data/private/alfa/memoria.json'), rutas), true);
  assert.equal(permitido('alfa:director', 'lectura', en('data/private/omega/memoria.json'), rutas), false);
  assert.equal(permitido('omega:marketing', 'escritura', en('data/private/alfa/x.json'), rutas), false);
  assert.equal(permitido('alfa:ventas', 'lectura', codigo('agents/omega/perfil.json'), rutas), false, 'instrucciones internas del rival');
  assert.equal(permitido('alfa:ventas', 'lectura', en('data/public/escaparates/omega.json'), rutas), true, 'lo público sí');
});

test('ningún agente comercial escribe en sentencias, evaluador ni configuración', () => {
  for (const p of ['alfa:director', 'omega:finanzas'] as const) {
    assert.equal(permitido(p, 'escritura', en('reports/verdicts/ronda-01.json'), rutas), false);
    assert.equal(permitido(p, 'escritura', codigo('harness/evaluator/juez.ts'), rutas), false);
    assert.equal(permitido(p, 'escritura', codigo('config/experiment.json'), rutas), false);
    assert.equal(permitido(p, 'lectura', en('reports/evidence/diario.jsonl'), rutas), false, 'ni leer la evidencia con datos del rival');
  }
});

test('sólo el Juez escribe sentencias; el harness no; el War Room no escribe nada', () => {
  assert.equal(permitido('juez', 'escritura', en('reports/verdicts/ronda-01.json'), rutas), true);
  assert.equal(permitido('juez', 'escritura', en('reports/evidence/ronda-01/manifiesto.json'), rutas), false);
  assert.equal(permitido('harness', 'escritura', en('reports/verdicts/ronda-01.json'), rutas), false);
  assert.equal(permitido('harness', 'escritura', en('reports/evidence/diario.jsonl'), rutas), true);
  assert.equal(permitido('tribunal', 'escritura', en('reports/verdicts/ronda-01.json'), rutas), false);
  assert.equal(permitido('tribunal', 'escritura', en('data/public/x.json'), rutas), false);
});

test('el almacén rechaza recorridos de directorio, rutas absolutas y bytes nulos, y lo reporta', () => {
  const intentos: IntentoDenegado[] = [];
  const almacen = new AlmacenRestringido(rutas, 'alfa:director', (i) => intentos.push(i));
  assert.throws(() => almacen.leerTexto('data/private/alfa/../omega/memoria.json'), AccesoDenegado);
  assert.throws(() => almacen.leerTexto('/etc/passwd'), AccesoDenegado);
  assert.throws(() => almacen.leerTexto('data/private/alfa/a\0b'), AccesoDenegado);
  assert.throws(() => almacen.escribirJson('reports/verdicts/ronda-01.json', {}), AccesoDenegado);
  assert.equal(intentos.length, 4);
  assert.deepEqual(intentos.map((i) => i.operacion), ['lectura', 'lectura', 'lectura', 'escritura']);
});

test('las banderas de --permission reflejan la política del principal', () => {
  const banderas = banderasPermiso('omega:director', rutas);
  assert.ok(banderas.includes('--permission'));
  assert.ok(banderas.includes(`--allow-fs-write=${en('data/private/omega')}`));
  assert.ok(!banderas.some((b) => b.includes('data/private/alfa')));
  assert.ok(!banderas.includes('--allow-child-process'));
  assert.ok(banderasPermiso('tribunal', rutas).every((b) => !b.startsWith('--allow-fs-write')));
  assert.ok(banderasPermiso('harness', rutas).includes('--allow-child-process'));
});

test.after(limpiar);
