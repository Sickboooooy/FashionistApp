import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { preflightSintetico } from '../../harness/orchestrator/corrida.ts';
import { banderasPermiso } from '../../harness/permissions/acl.ts';
import { enCorrida, prepararEstructura, RELATIVAS } from '../../harness/permissions/rutas.ts';
import { sandboxDeRedDisponible } from '../../harness/permissions/sandbox.ts';
import { config, corridaTemporal, RAIZ } from '../ayudantes.ts';

interface EstadoServicio {
  ronda: number;
  fase: string;
  ocupado: boolean;
  ultimoError: string | null;
}

/**
 * Topología real del War Room: el propio harness corre con --permission (como lo lanza
 * scripts/servir.ts) y desde ahí lanza agentes y Juez aislados. Esta prueba existe
 * porque un harness restringido no puede hacer todo lo que uno sin restricciones.
 */
test('el servicio del harness bajo --permission completa una semana ordenada por IPC', async () => {
  const { rutas, limpiar } = corridaTemporal();
  prepararEstructura(rutas);
  writeFileSync(enCorrida(rutas, RELATIVAS.preflight), JSON.stringify(preflightSintetico(config().hash)));
  const hijo = fork(join(RAIZ, 'harness', 'orchestrator', 'servicio.ts'), [], {
    execArgv: banderasPermiso('harness', rutas),
    env: {
      PATH: process.env.PATH ?? '',
      NODE_NO_WARNINGS: '1',
      EW_RAIZ_CODIGO: rutas.raizCodigo,
      EW_RAIZ_CORRIDA: rutas.raizCorrida,
      EW_SANDBOX_RED: sandboxDeRedDisponible() ? '1' : '0',
      EW_MODO: 'prueba',
      EW_MS_POR_DIA: '0',
    },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  let stderr = '';
  hijo.stderr?.setEncoding('utf8').on('data', (d: string) => (stderr += d));
  try {
    const final = await new Promise<EstadoServicio>((resolver, rechazar) => {
      const plazo = setTimeout(() => rechazar(new Error(`sin terminar la semana; stderr: ${stderr.slice(0, 500)}`)), 90_000);
      let ordenada = false;
      hijo.on('exit', (codigo) => rechazar(new Error(`el servicio terminó (${codigo}): ${stderr.slice(0, 500)}`)));
      hijo.on('message', (m) => {
        const estado = (m as { estado?: EstadoServicio }).estado;
        if (!estado) return;
        if (!ordenada) {
          ordenada = true;
          hijo.send({ tipo: 'control', accion: 'semana' });
          return;
        }
        if (estado.ultimoError || (estado.ronda === 1 && estado.fase === 'entre_rondas' && !estado.ocupado)) {
          clearTimeout(plazo);
          resolver(estado);
        }
      });
    });
    assert.equal(final.ultimoError, null);
    assert.ok(existsSync(enCorrida(rutas, RELATIVAS.veredicto(1, 'json'))), 'el Juez aislado emitió la sentencia');
  } finally {
    hijo.kill();
    limpiar();
  }
});
