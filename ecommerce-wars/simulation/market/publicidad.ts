import type { Canal } from '../../shared/config.ts';
import { rivalDe, type EmpresaId } from '../../shared/types/dominio.ts';
import type { Cliente } from '../customers/poblacion.ts';
import { disponible, gastar } from '../economics/tesoreria.ts';
import { redondear6 } from '../inventory/inventario.ts';
import { emitir, ordenEmpresas, type ContextoDia, type Visitante } from './contexto.ts';
import type { Campana } from './estado.ts';

/** Probabilidad máxima de clic por impresión, para acotar afinidades extremas. */
const CTR_MAXIMO = 0.5;

/**
 * Ejecuta las campañas activas del día y devuelve los visitantes pagados.
 * Si ambas empresas compiten por el mismo canal y segmento el mismo día, el costo
 * sube (presión de subasta) y, en buscadores, se reparten las búsquedas.
 */
export function ejecutarCampanas(ctx: ContextoDia): Visitante[] {
  const activas = (empresa: EmpresaId) => ctx.estado.empresas[empresa].campanas.filter((c) => c.dias.includes(ctx.dia));
  const porEmpresa = { alfa: activas('alfa'), omega: activas('omega') };
  const visitantes: Visitante[] = [];
  for (const empresa of ordenEmpresas(ctx)) {
    const delRival = porEmpresa[rivalDe(empresa)];
    for (const campana of porEmpresa[empresa]) {
      const presion = delRival.some((r) => r.canal === campana.canal && r.segmento === campana.segmento);
      visitantes.push(...ejecutarCampana(ctx, empresa, campana, presion));
    }
  }
  return visitantes;
}

function audiencia(ctx: ContextoDia, empresa: EmpresaId, campana: Campana, canal: Canal): readonly Cliente[] {
  if (canal.modelo !== 'envio') return ctx.poblacion.porSegmento.get(campana.segmento) ?? [];
  return ctx.estado.empresas[empresa].listaCorreo
    .map((id) => ctx.poblacion.porId.get(id))
    .filter((c): c is Cliente => c !== undefined && c.segmento === campana.segmento);
}

function ejecutarCampana(ctx: ContextoDia, empresa: EmpresaId, campana: Campana, presion: boolean): Visitante[] {
  const { ci } = ctx;
  const m = ci.cfg.mercado;
  const rng = ctx.rng.publicidad;
  const emp = ctx.estado.empresas[empresa];
  const canal = ci.canal.get(campana.canal);
  const angulo = ci.angulo.get(campana.angulo);
  if (!canal || !angulo) throw new RangeError(`campaña ${campana.id}: canal o ángulo desconocido`);

  const presupuesto = Math.min(campana.presupuestoDiario, disponible(emp, ci.cfg.reserva_obligatoria));
  const costoUnitario = Math.round(canal.costo * (presion ? 1 + m.presion_subasta : 1));
  if (presupuesto < costoUnitario) {
    emitir(ctx, 'campana_pausada', empresa, { campanaId: campana.id, motivo: 'saldo_insuficiente' });
    return [];
  }
  const alcanzables = audiencia(ctx, empresa, campana, canal);
  if (alcanzables.length === 0) {
    emitir(ctx, 'campana_pausada', empresa, { campanaId: campana.id, motivo: 'sin_audiencia' });
    return [];
  }

  const ctr = Math.min(CTR_MAXIMO, canal.ctr_base * (canal.afinidad[campana.segmento] ?? 0) * (angulo.afinidad[campana.segmento] ?? 0));
  let impresiones = 0;
  let clics = 0;
  let gasto = 0;
  switch (canal.modelo) {
    case 'cpm': {
      const tope = Math.floor(alcanzables.length * m.frecuencia_max_impresiones);
      impresiones = Math.min(Math.floor((presupuesto * 1000) / costoUnitario), tope);
      gasto = Math.ceil((impresiones * costoUnitario) / 1000);
      clics = rng.binomial(impresiones, ctr);
      break;
    }
    case 'cpc': {
      const busquedas = rng.binomial(alcanzables.length, Math.min(1, m.intencion_busqueda * ctx.factorDia));
      impresiones = presion ? Math.floor(busquedas / 2) : busquedas;
      clics = Math.min(rng.binomial(impresiones, ctr), Math.floor(presupuesto / costoUnitario));
      gasto = clics * costoUnitario;
      break;
    }
    case 'envio': {
      impresiones = Math.min(alcanzables.length, Math.floor(presupuesto / costoUnitario));
      gasto = impresiones * costoUnitario;
      clics = rng.binomial(impresiones, ctr);
      break;
    }
  }
  if (gasto > 0) gastar(emp, gasto, ci.cfg.reserva_obligatoria);

  const visitas = rng.binomial(clics, m.tasa_aterrizaje);
  const tamanoSegmento = ctx.poblacion.porSegmento.get(campana.segmento)?.length ?? 1;
  const alcance = 1 - Math.exp(-impresiones / tamanoSegmento);
  const concienciaActual = ctx.estado.conciencia[empresa][campana.segmento] ?? m.conciencia_inicial;
  ctx.estado.conciencia[empresa][campana.segmento] = redondear6(
    Math.min(m.conciencia_maxima, concienciaActual + m.conciencia_ganancia * alcance),
  );

  emitir(ctx, 'campana_ejecutada', empresa, {
    campanaId: campana.id,
    canal: campana.canal,
    segmento: campana.segmento,
    angulo: campana.angulo,
    gasto,
    impresiones,
    clics,
    visitas,
    presion,
  });

  return Array.from({ length: visitas }, () => ({
    clienteId: rng.elegir(alcanzables).id,
    tienda: empresa,
    origen: 'campana' as const,
    canal: campana.canal,
    campanaId: campana.id,
    angulo: campana.angulo,
  }));
}
