import { existsSync } from 'node:fs';
import { fechaSimulada } from '../../shared/calendario.ts';
import { cargarConfig, type ConfigIndexada } from '../../shared/config.ts';
import { hashCanonico } from '../../shared/hash.ts';
import { formatoMXN } from '../../shared/money.ts';
import { EMPRESAS, type EmpresaId } from '../../shared/types/dominio.ts';
import { leerEventos } from '../event-bus/diario.ts';
import { configDeCorrida, leerCorrida, type Corrida } from '../orchestrator/corrida.ts';
import type { ArchivoExpediente } from '../orchestrator/evidencia.ts';
import { AlmacenRestringido } from '../permissions/almacen.ts';
import { enCorrida, RELATIVAS, rutaConfig, type Rutas } from '../permissions/rutas.ts';
import { auditar, type HechosEmpresa } from './auditor.ts';
import type { Hallazgo } from './hallazgos.ts';
import { verificarExpediente } from './verificador.ts';
import { evaluarVictoria, REGLAS_VICTORIA, type Comprobacion, type DatosCandidata } from './victoria.ts';

export const REGLAS_INTEGRIDAD = {
  I1: 'Configuración sellada por una persona y sin cambios durante la corrida',
  I2: 'Integridad SHA-256 de cada archivo del expediente',
  I3: 'Cadena de eventos íntegra y continua con el diario global',
  I4: 'Continuidad de estado entre rondas',
  I5: 'Pruebas críticas aprobadas',
  I6: 'Reejecución determinista con la semilla fija',
  C1: 'Conciliación libro mayor ↔ eventos ↔ reporte financiero',
  C2: 'Caja nunca negativa y gasto discrecional dentro del saldo',
  C3: 'Ventas registradas exclusivamente por el motor de mercado',
} as const;

export const NOTA_HASHES = 'Los hashes acreditan la integridad del registro, no la veracidad de los datos de origen.';

export type ResultadoRonda = 'ganador' | 'sin_ganador' | 'ronda_invalida';

export interface Resolucion {
  resolucion: string;
  expediente: string;
  ronda: number;
  modo: Corrida['modo'];
  versionReglas: string;
  criteriosVictoria: ConfigIndexada['cfg']['victoria'];
  periodo: { diaGlobalInicio: number; diaGlobalFin: number; fechaInicio: string; fechaFin: string };
  evidenciasVerificadas: ArchivoExpediente[];
  hechosAcreditados: Record<EmpresaId, HechosEmpresa> | null;
  reglasAplicadas: Array<{ id: string; descripcion: string }>;
  incidencias: Hallazgo[];
  comprobaciones: Record<EmpresaId, Comprobacion[]> | null;
  resultado: ResultadoRonda;
  ganador: EmpresaId | null;
  motivo: string;
  fundamentacion: string[];
  hashExpediente: string | null;
  nota: string;
  hashVeredicto: string;
}

export interface ResumenVeredicto {
  expediente: string;
  resultado: ResultadoRonda;
  ganador: EmpresaId | null;
  hashExpediente: string;
  hashVeredicto: string;
  incidencias: number;
  motivo: string;
}

const HASH_VACIO = '0'.repeat(64);

function fundamentar(hechos: Record<EmpresaId, HechosEmpresa> | null, hallazgos: Hallazgo[], motivo: string): string[] {
  const lineas: string[] = [];
  if (hechos) {
    for (const e of EMPRESAS) {
      const h = hechos[e];
      lineas.push(
        `${e.toUpperCase()}: ventas netas ${formatoMXN(h.indicadores.ventasNetas)}, ${h.pedidosValidos} pedidos válidos, margen de contribución ${formatoMXN(h.indicadores.margenContribucion)}, caja ${formatoMXN(h.caja)}; ${h.conciliado ? 'contabilidad conciliada' : 'contabilidad NO conciliada'}.`,
      );
    }
  }
  const porSeveridad = (s: string) => hallazgos.filter((h) => h.severidad === s).length;
  lineas.push(`Incidencias: ${porSeveridad('critica')} críticas, ${porSeveridad('grave')} graves, ${porSeveridad('leve')} leves.`);
  lineas.push(motivo);
  lineas.push(NOTA_HASHES);
  return lineas;
}

/**
 * Evalúa el expediente de una ronda y emite la resolución. Las sentencias son
 * inmutables: si ya existe una para la ronda, se rechaza la reescritura.
 */
export function evaluarRonda(rutas: Rutas, ronda: number): ResumenVeredicto {
  const almacen = new AlmacenRestringido(rutas, 'juez');
  const rutaJson = RELATIVAS.veredicto(ronda, 'json');
  if (existsSync(enCorrida(rutas, rutaJson))) throw new Error(`la sentencia de la ronda ${ronda} ya fue emitida y es inmutable`);

  const corrida = leerCorrida(rutas);
  if (!corrida) throw new Error('no existe corrida.json: no hay corrida que juzgar');
  const ci = configDeCorrida(cargarConfig(rutaConfig(rutas)), corrida);
  const { cfg } = ci;

  const verificacion = verificarExpediente({ rutas, ci, corrida, ronda });
  const hallazgos = [...verificacion.hallazgos];
  let hechos: Record<EmpresaId, HechosEmpresa> | null = null;
  if (verificacion.datos) {
    const { manifiesto, eventos, estadoFinal, libros, reportes } = verificacion.datos;
    const acumulados = leerEventos(enCorrida(rutas, RELATIVAS.diario)).filter((e) => e.seq <= manifiesto.seqFin);
    const auditoria = auditar({ ci, ronda, eventosRonda: eventos.filter((e) => e.ronda === ronda), eventosAcumulados: acumulados, estadoFinal, libros, reportes });
    hallazgos.push(...auditoria.hallazgos);
    hechos = auditoria.hechos;
    for (const e of eventos) {
      if (e.tipo !== 'incidente' || e.ronda !== ronda) continue;
      const severidad = e.datos.severidad;
      hallazgos.push({
        codigo: e.datos.codigo,
        severidad,
        empresa: e.empresa,
        detalle: `${e.datos.principal}: ${e.datos.detalle}`,
        resolucion:
          severidad === 'leve'
            ? 'Resuelta conforme a reglas: la acción se descartó o se registró sin efecto económico.'
            : 'No resuelta en la ronda: la empresa no puede ser candidata a ganadora en este periodo.',
      });
    }
  }

  const criticas = hallazgos.filter((h) => h.severidad === 'critica');
  let resultado: ResultadoRonda;
  let ganador: EmpresaId | null = null;
  let motivo: string;
  let comprobaciones: Record<EmpresaId, Comprobacion[]> | null = null;
  if (!hechos || criticas.length > 0) {
    resultado = 'ronda_invalida';
    motivo = `Ronda suspendida por el Juez: ${criticas.length} incidencias críticas (${[...new Set(criticas.map((c) => c.codigo))].join(', ') || 'expediente incompleto'}).`;
  } else {
    const graves = (e: EmpresaId) => hallazgos.filter((h) => h.severidad === 'grave' && h.empresa === e).length;
    const datos = Object.fromEntries(
      EMPRESAS.map((e): [EmpresaId, DatosCandidata] => [
        e,
        {
          ventasNetas: hechos![e].indicadores.ventasNetas,
          pedidosValidos: hechos![e].pedidosValidos,
          margenContribucion: hechos![e].indicadores.margenContribucion,
          periodoCompletado: verificacion.datos!.estadoFinal.rondaCompletada === ronda,
          infraccionesGraves: graves(e),
        },
      ]),
    ) as Record<EmpresaId, DatosCandidata>;
    const dictamen = evaluarVictoria(datos, cfg.victoria, true);
    ganador = dictamen.ganador;
    resultado = ganador ? 'ganador' : 'sin_ganador';
    motivo = dictamen.motivo;
    comprobaciones = dictamen.comprobaciones;
  }

  const diaGlobalInicio = (ronda - 1) * cfg.dias_por_periodo + 1;
  const diaGlobalFin = ronda * cfg.dias_por_periodo;
  const hashExpediente = verificacion.datos?.manifiesto.hashExpediente ?? null;
  const cuerpo: Omit<Resolucion, 'hashVeredicto'> = {
    resolucion: `RES-R${String(ronda).padStart(2, '0')}-${(hashExpediente ?? HASH_VACIO).slice(0, 8)}`,
    expediente: verificacion.datos?.manifiesto.expediente ?? `EXP-R${String(ronda).padStart(2, '0')}`,
    ronda,
    modo: corrida.modo,
    versionReglas: cfg.version_reglas,
    criteriosVictoria: cfg.victoria,
    periodo: {
      diaGlobalInicio,
      diaGlobalFin,
      fechaInicio: fechaSimulada(cfg.fecha_inicio_simulada, diaGlobalInicio),
      fechaFin: fechaSimulada(cfg.fecha_inicio_simulada, diaGlobalFin),
    },
    evidenciasVerificadas: verificacion.evidencias,
    hechosAcreditados: hechos,
    reglasAplicadas: [
      ...Object.entries(REGLAS_INTEGRIDAD).map(([id, descripcion]) => ({ id, descripcion })),
      ...Object.entries(REGLAS_VICTORIA).map(([id, descripcion]) => ({ id, descripcion })),
    ],
    incidencias: hallazgos,
    comprobaciones,
    resultado,
    ganador,
    motivo,
    fundamentacion: fundamentar(hechos, hallazgos, motivo),
    hashExpediente,
    nota: NOTA_HASHES,
  };
  const resolucion: Resolucion = { ...cuerpo, hashVeredicto: hashCanonico(cuerpo) };
  almacen.escribirJson(rutaJson, resolucion);
  almacen.escribirTexto(RELATIVAS.veredicto(ronda, 'md'), resolucionMarkdown(resolucion));

  return {
    expediente: resolucion.expediente,
    resultado,
    ganador,
    hashExpediente: hashExpediente ?? HASH_VACIO,
    hashVeredicto: resolucion.hashVeredicto,
    incidencias: hallazgos.length,
    motivo,
  };
}

/** El detalle de una incidencia puede contener texto de agentes: se muestra literal, nunca como Markdown. */
function textoLiteralMd(texto: string): string {
  const limpio = texto.replace(/[\r\n\t]+/g, ' ').replace(/`/g, "'").slice(0, 400);
  return `\`${limpio}\``;
}

export function resolucionMarkdown(r: Resolucion): string {
  const lineas = [
    `# Resolución ${r.resolucion}`,
    '',
    `- **Expediente:** ${r.expediente}`,
    `- **Periodo examinado:** ronda ${r.ronda}, días ${r.periodo.diaGlobalInicio}–${r.periodo.diaGlobalFin} (${r.periodo.fechaInicio} a ${r.periodo.fechaFin}, tiempo simulado)`,
    `- **Modo:** ${r.modo} · reglas v${r.versionReglas}`,
    `- **Resultado:** ${r.resultado === 'ganador' ? `GANADOR ${r.ganador?.toUpperCase()}` : r.resultado === 'sin_ganador' ? 'SIN GANADOR' : 'RONDA INVÁLIDA'}`,
    `- **Hash SHA-256 del expediente:** \`${r.hashExpediente ?? 'no disponible'}\``,
    `- **Hash SHA-256 de esta resolución:** \`${r.hashVeredicto}\``,
    '',
    '## Fundamentación',
    ...r.fundamentacion.map((l) => `- ${l}`),
    '',
    '## Hechos acreditados',
  ];
  if (r.hechosAcreditados) {
    lineas.push('| Indicador | ALFA | OMEGA |', '|---|---:|---:|');
    const fila = (nombre: string, f: (h: HechosEmpresa) => string) =>
      lineas.push(`| ${nombre} | ${f(r.hechosAcreditados!.alfa)} | ${f(r.hechosAcreditados!.omega)} |`);
    fila('Ventas brutas', (h) => formatoMXN(h.indicadores.ventasBrutas));
    fila('Descuentos', (h) => formatoMXN(h.indicadores.descuentos));
    fila('Cancelaciones', (h) => formatoMXN(h.indicadores.cancelaciones));
    fila('Devoluciones', (h) => formatoMXN(h.indicadores.devoluciones));
    fila('**Ventas netas**', (h) => `**${formatoMXN(h.indicadores.ventasNetas)}**`);
    fila('Pedidos válidos', (h) => String(h.pedidosValidos));
    fila('Margen de contribución', (h) => formatoMXN(h.indicadores.margenContribucion));
    fila('Utilidad operativa', (h) => formatoMXN(h.indicadores.utilidadOperativa));
    fila('Caja al cierre', (h) => formatoMXN(h.caja));
    fila('Conciliación contable', (h) => (h.conciliado ? 'sí' : 'NO'));
  } else {
    lineas.push('No fue posible acreditar hechos: el expediente está incompleto o alterado.');
  }
  if (r.comprobaciones) {
    lineas.push('', '## Condiciones de victoria');
    for (const e of EMPRESAS) {
      lineas.push(`### ${e.toUpperCase()}`);
      for (const c of r.comprobaciones[e]) lineas.push(`- ${c.cumple ? '✔' : '✘'} **${c.regla}** — ${c.detalle}`);
    }
  }
  lineas.push('', '## Incidencias');
  if (r.incidencias.length === 0) lineas.push('Sin incidencias.');
  for (const h of r.incidencias) lineas.push(`- [${h.severidad}] ${h.codigo}${h.empresa ? ` (${h.empresa.toUpperCase()})` : ''}: ${textoLiteralMd(h.detalle)} — ${h.resolucion}`);
  lineas.push('', '## Reglas aplicadas', ...r.reglasAplicadas.map((x) => `- **${x.id}**: ${x.descripcion}`));
  lineas.push('', '## Evidencias verificadas', '| Archivo | SHA-256 | Bytes |', '|---|---|---:|');
  for (const a of r.evidenciasVerificadas) lineas.push(`| ${a.ruta} | \`${a.sha256}\` | ${a.bytes} |`);
  lineas.push('', `> ${r.nota}`, '');
  return lineas.join('\n');
}
