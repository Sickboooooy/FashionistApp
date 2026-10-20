import type { ConfigIndexada } from '../../shared/config.ts';
import type { ResultadoPublico } from '../../shared/contracts/vista.ts';
import { formatoMXN } from '../../shared/money.ts';
import { EMPRESAS, type EmpresaId } from '../../shared/types/dominio.ts';
import type { Corrida } from './corrida.ts';
import type { ResumenRondaArchivo } from './resumen.ts';

export interface DatosReporteFinal {
  ci: ConfigIndexada;
  corrida: Corrida;
  rondas: readonly ResumenRondaArchivo[];
  resultados: readonly ResultadoPublico[];
  ganador: EmpresaId | null;
  motivoFin: string;
  ultimoHash: string;
}

/** Reporte final legible del experimento (reports/reporte-final.md). */
export function reporteFinalMarkdown(d: DatosReporteFinal): string {
  const { cfg } = d.ci;
  const etiqueta = (e: EmpresaId) => `${e.toUpperCase()} (${d.rondas[0]?.perfiles[e] ?? e})`;
  const lineas = [
    `# Reporte final — ${cfg.experimento}`,
    '',
    `- **Corrida:** ${d.corrida.id} · modo ${d.corrida.modo}${d.corrida.autorizadoPor ? ` · autorizada por ${d.corrida.autorizadoPor}` : ''}`,
    `- **Semilla:** ${d.corrida.semilla} · reglas v${cfg.version_reglas} · config \`${d.corrida.hashConfig}\``,
    `- **Rondas disputadas:** ${d.rondas.length} de ${cfg.rondas_maximas}`,
    `- **Resultado:** ${d.ganador ? `ganador ${etiqueta(d.ganador)}` : 'sin ganador'} — ${d.motivoFin}`,
    `- **Último hash del diario de eventos:** \`${d.ultimoHash}\``,
    '',
    'El resultado es un ganador bajo las reglas del experimento, no una demostración de superioridad comercial universal.',
    '',
    '## Ventas netas por ronda',
    '',
    `| Ronda | ${etiqueta('alfa')} | ${etiqueta('omega')} | Pedidos válidos A/O | Margen contrib. A/O | Resolución |`,
    '|---:|---:|---:|---:|---:|---|',
  ];
  for (const r of d.rondas) {
    const a = r.empresas.alfa.resumen;
    const o = r.empresas.omega.resumen;
    const res = d.resultados.find((x) => x.ronda === r.ronda);
    const texto = !res ? 'pendiente' : res.resultado === 'ganador' ? `ganador ${res.ganador?.toUpperCase()}` : res.resultado === 'sin_ganador' ? 'sin ganador' : 'ronda inválida';
    lineas.push(
      `| ${r.ronda} | ${formatoMXN(a.financiero.ventasNetas)} | ${formatoMXN(o.financiero.ventasNetas)} | ${a.pedidosValidos} / ${o.pedidosValidos} | ${formatoMXN(a.financiero.margenContribucion)} / ${formatoMXN(o.financiero.margenContribucion)} | ${texto} (${res?.expediente ?? r.expediente}) |`,
    );
  }

  lineas.push('', '## Calidad de decisiones (promedio por ronda, 0–100)', '', '| Ronda | ALFA | OMEGA |', '|---:|---:|---:|');
  for (const r of d.rondas) lineas.push(`| ${r.ronda} | ${r.empresas.alfa.calidad.promedio} | ${r.empresas.omega.calidad.promedio} |`);

  lineas.push('', '## Evolución de estrategias', '');
  for (const e of EMPRESAS) {
    lineas.push(`### ${etiqueta(e)}`);
    for (const r of d.rondas) {
      const est = r.empresas[e].estrategia;
      if (!est) continue;
      lineas.push(
        `- R${r.ronda}: inventario ${(est.participacion_inventario * 100).toFixed(0)}%, marketing ${(est.participacion_marketing * 100).toFixed(0)}%, precio ×${est.multiplicador_precio_medio.toFixed(2)}, canales ${est.canales}, envío gratis desde ${formatoMXN(est.envio_gratis_desde)}.`,
      );
    }
    const lecciones = d.rondas.flatMap((r) => r.empresas[e].lecciones.map((l) => `R${r.ronda}: ${l}`));
    if (lecciones.length > 0) lineas.push('', '**Aprendizajes registrados:**', ...lecciones.map((l) => `- ${l}`));
    lineas.push('');
  }

  lineas.push(
    '## Cómo verificar este resultado',
    '',
    '```bash',
    `npm run verificar -- --corrida ${d.corrida.id === 'oficial' ? '.' : `runs/${d.corrida.id}`}`,
    '```',
    '',
    'El verificador recalcula los SHA-256 de cada expediente, la cadena de eventos, la continuidad entre rondas y reejecuta cada periodo con la semilla fija.',
    '',
    '> Los hashes acreditan la integridad del registro, no la veracidad de los datos de origen.',
    '',
  );
  return lineas.join('\n');
}
