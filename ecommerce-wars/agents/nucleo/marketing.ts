import type { Centavos } from '../../shared/money.ts';
import type { DecisionMarketing } from '../../shared/schemas/decisiones.ts';
import { mxn, type ContextoRol } from './comun.ts';
import { claveBrazo } from './memoria.ts';

/** Peso del prior frente a la evidencia: equivale a 1,500 MXN de gasto observado. */
const GASTO_EQUIVALENTE_PRIOR = 150_000;
const ROAS_BASE = 3;
const PRESUPUESTO_DIARIO_MINIMO = 5_000;
const PRESUPUESTO_DIARIO_MINIMO_CORREO = 500;

interface Brazo {
  canal: string;
  segmento: string;
  angulo: string;
  roas: number;
  probado: boolean;
}

const ABREVIATURAS: Record<string, string> = {
  redes_sociales: 'rs',
  buscadores: 'bs',
  display: 'dp',
  correo: 'co',
  influencers: 'in',
  jovenes_tendencia: 'jt',
  profesionales: 'pr',
  cazadores_ofertas: 'co',
  premium: 'pm',
};

const abreviar = (id: string) => ABREVIATURAS[id] ?? id.slice(0, 3);

/**
 * Agente de Marketing: estima el ROAS de cada combinación canal × segmento × ángulo
 * mezclando un prior (afinidades públicas del mercado) con su propio historial, y
 * reparte el presupuesto en las mejores, con una cuota de exploración.
 */
export function decidirMarketing(ctx: ContextoRol, presupuesto: Centavos): DecisionMarketing {
  const { vista, perfil, memoria, rng } = ctx;
  const dias = Array.from({ length: vista.diasPorPeriodo }, (_, i) => i + 1);

  const brazos: Brazo[] = [];
  for (const canal of vista.reglas.canales) {
    for (const segmento of perfil.segmentosObjetivo) {
      if (canal.modelo === 'envio' && (vista.propio.suscriptoresPorSegmento[segmento] ?? 0) === 0) continue;
      for (const angulo of perfil.angulos) {
        const afinidadAngulo = vista.reglas.angulos.find((a) => a.id === angulo)?.afinidad[segmento] ?? 1;
        const prior =
          ROAS_BASE * (canal.afinidad[segmento] ?? 1) * afinidadAngulo * (perfil.canalesPreferidos.includes(canal.id) ? 1.15 : 0.85);
        const historia = memoria.brazos[claveBrazo(canal.id, segmento, angulo)];
        const roas = historia
          ? (prior * GASTO_EQUIVALENTE_PRIOR + historia.ingresos) / (GASTO_EQUIVALENTE_PRIOR + historia.gasto)
          : prior;
        brazos.push({ canal: canal.id, segmento, angulo, roas, probado: historia !== undefined });
      }
    }
  }
  brazos.sort((a, b) => b.roas - a.roas || claveBrazo(a.canal, a.segmento, a.angulo).localeCompare(claveBrazo(b.canal, b.segmento, b.angulo)));

  const elegidos = brazos.slice(0, perfil.brazosPorRonda);
  const sinProbar = brazos.slice(perfil.brazosPorRonda).filter((b) => !b.probado);
  let exploracion: Brazo | null = null;
  if (elegidos.length > 0 && sinProbar.length > 0 && rng.probabilidad(perfil.exploracion)) {
    exploracion = rng.elegir(sinProbar);
    elegidos[elegidos.length - 1] = exploracion;
  }
  const viables = elegidos.filter((b) => !b.probado || b.roas >= perfil.roasMinimo * 0.7);
  const finales = viables.length > 0 ? viables : elegidos.slice(0, 1);
  const pesoTotal = finales.reduce((a, b) => a + b.roas, 0);

  const campanas: DecisionMarketing['campanas'] = [];
  finales.forEach((b, i) => {
    let diario = Math.floor((presupuesto * (b.roas / pesoTotal)) / dias.length);
    const canal = vista.reglas.canales.find((c) => c.id === b.canal);
    if (canal?.modelo === 'envio') {
      diario = Math.min(diario, (vista.propio.suscriptoresPorSegmento[b.segmento] ?? 0) * canal.costo);
      if (diario < PRESUPUESTO_DIARIO_MINIMO_CORREO) return;
    } else if (diario < PRESUPUESTO_DIARIO_MINIMO) {
      return;
    }
    campanas.push({
      id: `r${vista.ronda}-${i + 1}-${abreviar(b.canal)}-${abreviar(b.segmento)}-${b.angulo}`.slice(0, 40),
      canal: b.canal,
      segmento: b.segmento,
      angulo: b.angulo,
      mensaje: perfil.mensajes[b.angulo] ?? `${perfil.nombre}`,
      presupuestoDiario: diario,
      dias,
    });
  });

  const comprometido = campanas.reduce((a, c) => a + c.presupuestoDiario * c.dias.length, 0);
  const mejor = finales[0];
  return {
    hipotesis: {
      texto: mejor
        ? `ROAS de al menos ${perfil.roasMinimo.toFixed(1)}; apuesta principal ${mejor.canal}/${mejor.segmento}/${mejor.angulo} (ROAS estimado ${mejor.roas.toFixed(2)}).`
        : `Sin campañas viables: ROAS objetivo ${perfil.roasMinimo.toFixed(1)}.`,
      metrica: 'roas',
      valor: perfil.roasMinimo,
    },
    campanas,
    justificacion: [
      `${campanas.length} campañas por ${mxn(comprometido)} de ${mxn(presupuesto)}.`,
      exploracion ? `Exploración: ${exploracion.canal}/${exploracion.segmento}/${exploracion.angulo}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}
