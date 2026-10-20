import { existsSync, readFileSync } from 'node:fs';
import type { ConfigIndexada } from '../../shared/config.ts';
import { hashCanonico, sha256 } from '../../shared/hash.ts';
import { hashGenesis, leerEventos, verificarCadena } from '../event-bus/diario.ts';
import { leerCandado, leerPreflight, type Corrida, type Preflight } from '../orchestrator/corrida.ts';
import { hashManifiesto, leerDeExpediente, leerManifiesto } from '../orchestrator/evidencia.ts';
import { enCorrida, RELATIVAS, type Rutas } from '../permissions/rutas.ts';

export interface RevisionExpediente {
  ronda: number;
  expediente: string;
  hashExpediente: string;
  ok: boolean;
  errores: string[];
}

export interface RevisionSentencia {
  ronda: number;
  resolucion: string;
  resultado: string;
  ganador: string | null;
  hashVeredicto: string;
  ok: boolean;
  errores: string[];
}

export interface IntegridadCorrida {
  ok: boolean;
  candado: { ok: boolean; detalle: string; autorizadoPor: string | null };
  diario: { ok: boolean; eventos: number; ultimoHash: string; errores: string[] };
  expedientes: RevisionExpediente[];
  sentencias: RevisionSentencia[];
  preflight: (Preflight & { ok: boolean }) | null;
}

/**
 * Revisión rápida y de sólo lectura (sin reejecutar el mercado): candado de
 * reglas, cadena del diario, SHA-256 de cada expediente, continuidad entre
 * expedientes y hash de cada sentencia. La usa el War Room en vivo.
 */
export function revisarIntegridad(rutas: Rutas, ci: ConfigIndexada, corrida: Corrida): IntegridadCorrida {
  const candado = leerCandado(rutas);
  const candadoOk = candado !== null && candado.hashConfig === ci.hash && corrida.hashConfig === ci.hash;

  const eventos = leerEventos(enCorrida(rutas, RELATIVAS.diario));
  const cadena = verificarCadena(eventos, hashGenesis(ci.hash, ci.cfg.semilla));
  const veredictosSellados = new Map(eventos.flatMap((e) => (e.tipo === 'veredicto_emitido' ? [[e.ronda, e.datos.hashVeredicto] as const] : [])));

  const expedientes: RevisionExpediente[] = [];
  const sentencias: RevisionSentencia[] = [];
  let anterior: ReturnType<typeof leerManifiesto> = null;
  for (let ronda = 1; ; ronda++) {
    let m: ReturnType<typeof leerManifiesto>;
    try {
      m = leerManifiesto(rutas, ronda);
    } catch {
      expedientes.push({ ronda, expediente: `EXP-R${String(ronda).padStart(2, '0')}`, hashExpediente: '', ok: false, errores: ['manifiesto ilegible'] });
      break;
    }
    if (!m) break;
    const errores: string[] = [];
    if (hashManifiesto(m) !== m.hashExpediente) errores.push('manifiesto alterado');
    for (const a of m.archivos) {
      const c = leerDeExpediente(rutas, ronda, a.ruta);
      if (c === null) errores.push(`falta ${a.ruta}`);
      else if (sha256(c) !== a.sha256) errores.push(`${a.ruta}: SHA-256 no coincide`);
    }
    if (anterior && (anterior.hashExpediente !== m.hashExpedienteAnterior || anterior.seqFin + 1 !== m.seqInicio)) errores.push('no enlaza con el expediente anterior');
    expedientes.push({ ronda, expediente: m.expediente, hashExpediente: m.hashExpediente, ok: errores.length === 0, errores });

    const rutaSentencia = enCorrida(rutas, RELATIVAS.veredicto(ronda, 'json'));
    if (existsSync(rutaSentencia)) {
      const s = JSON.parse(readFileSync(rutaSentencia, 'utf8')) as Record<string, unknown> & { hashVeredicto: string };
      const { hashVeredicto, ...cuerpo } = s;
      const erroresS: string[] = [];
      if (hashCanonico(cuerpo) !== hashVeredicto) erroresS.push('la sentencia fue modificada después de emitirse');
      if (s.hashExpediente !== m.hashExpediente) erroresS.push('la sentencia no corresponde al expediente vigente');
      const sellado = veredictosSellados.get(ronda);
      if (sellado !== undefined && sellado !== hashVeredicto) erroresS.push('el hash no coincide con el JUDGE_VERDICT sellado en el diario');
      sentencias.push({
        ronda,
        resolucion: String(s.resolucion ?? ''),
        resultado: String(s.resultado ?? ''),
        ganador: (s.ganador as string | null) ?? null,
        hashVeredicto,
        ok: erroresS.length === 0,
        errores: erroresS,
      });
    }
    anterior = m;
  }

  const preflight = leerPreflight(rutas);
  const preflightOk = preflight !== null && preflight.aprobado && preflight.hashConfig === ci.hash && !(preflight.sintetico && corrida.modo === 'oficial');
  return {
    ok: candadoOk && cadena.ok && preflightOk && expedientes.every((e) => e.ok) && sentencias.every((s) => s.ok),
    candado: {
      ok: candadoOk,
      detalle: !candado ? 'reglas sin sellar' : candadoOk ? `reglas v${candado.versionReglas} selladas` : 'config/experiment.json no coincide con el candado',
      autorizadoPor: candado?.autorizadoPor ?? null,
    },
    diario: { ok: cadena.ok, eventos: eventos.length, ultimoHash: cadena.ultimoHash, errores: cadena.errores.slice(0, 20) },
    expedientes,
    sentencias,
    preflight: preflight ? { ...preflight, ok: preflightOk } : null,
  };
}
