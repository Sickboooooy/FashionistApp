import type { ConfigIndexada } from '../../shared/config.ts';
import type { Centavos } from '../../shared/money.ts';
import { PlanPeriodoSchema, type PlanPeriodo } from '../../shared/schemas/decisiones.ts';
import type { EmpresaId, RolComercial } from '../../shared/types/dominio.ts';
import { disponible } from '../../simulation/economics/tesoreria.ts';
import { planVacio, type Campana, type EstadoEmpresa, type PlanAplicado, type Promocion } from '../../simulation/market/estado.ts';
import { cotizarOrden } from '../../simulation/suppliers/proveedores.ts';

export interface Rechazo {
  rol: RolComercial | 'plan';
  codigo: string;
  detalle: string;
}

export interface TextoSospechoso {
  campo: string;
  fragmento: string;
}

export interface ResultadoValidacion {
  valido: PlanPeriodo | null;
  aplicado: PlanAplicado;
  rechazos: Rechazo[];
  sospechosos: TextoSospechoso[];
  comprometido: Record<RolComercial, Centavos>;
}

/** Texto dirigido al Juez o al sistema: se registra como incidente; nunca se ejecuta. */
const PATRONES_SOSPECHOSOS: readonly RegExp[] = [
  /\bjuez\b/i,
  /veredicto/i,
  /ignora(r)?\s+(todas\s+)?(las\s+)?(reglas|instrucciones)/i,
  /declara(r|d)?\s+(a\s+)?(\w+\s+)?(como\s+)?(ganador|vencedor)/i,
  /system\s*prompt/i,
  /<\s*\/?\s*script/i,
  /reports\/verdicts/i,
  /experiment\.json/i,
];

/** Caracteres de control, de ancho cero y de dirección bidi (ocultan instrucciones). */
const RANGOS_INVISIBLES: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x1f],
  [0x7f, 0x7f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
];
const CARACTERES_CONTROL = new RegExp(`[${RANGOS_INVISIBLES.map(([a, b]) => `\\u{${a.toString(16)}}-\\u{${b.toString(16)}}`).join("")}]`, "gu");

export function sanitizarTexto(texto: string, maximo: number): string {
  return texto.replace(CARACTERES_CONTROL, '').trim().slice(0, maximo);
}

function sospechas(campo: string, texto: string): TextoSospechoso[] {
  const limpio = texto.replace(CARACTERES_CONTROL, '');
  return PATRONES_SOSPECHOSOS.some((p) => p.test(limpio)) ? [{ campo, fragmento: limpio.slice(0, 160) }] : [];
}

function sinComprometer(): Record<RolComercial, Centavos> {
  return { director: 0, compras: 0, marketing: 0, ventas: 0, finanzas: 0 };
}

interface Contexto {
  ci: ConfigIndexada;
  empresa: EmpresaId;
  ronda: number;
  estado: EstadoEmpresa;
}

/**
 * Valida un plan propuesto por un equipo comercial. Lo inválido se descarta con un
 * rechazo registrado; lo válido se traduce a un PlanAplicado que el motor ejecuta.
 * Si el esquema completo falla, la empresa opera con el plan neutro.
 */
export function validarPlan(crudo: unknown, ctx: Contexto): ResultadoValidacion {
  const { ci, empresa, ronda, estado } = ctx;
  const { cfg } = ci;
  const lim = cfg.limites;
  const rechazos: Rechazo[] = [];
  const neutro = (): ResultadoValidacion => ({
    valido: null,
    aplicado: planVacio(estado),
    rechazos,
    sospechosos: [],
    comprometido: sinComprometer(),
  });

  const parseado = PlanPeriodoSchema.safeParse(crudo);
  if (!parseado.success) {
    const detalle = parseado.error.issues.slice(0, 8).map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join('; ');
    rechazos.push({ rol: 'plan', codigo: 'esquema_invalido', detalle });
    return neutro();
  }
  const plan = parseado.data;
  if (plan.empresa !== empresa || plan.ronda !== ronda) {
    rechazos.push({ rol: 'plan', codigo: 'identidad', detalle: `plan de ${plan.empresa}/r${plan.ronda} recibido para ${empresa}/r${ronda}` });
    return neutro();
  }
  if (!plan.finanzas.aprobado) {
    rechazos.push({ rol: 'finanzas', codigo: 'no_aprobado', detalle: 'el agente financiero no aprobó el plan' });
    return neutro();
  }

  const sospechosos = [
    ...sospechas('director.estrategia', plan.director.estrategia),
    ...plan.director.prioridades.flatMap((p, i) => sospechas(`director.prioridades[${i}]`, p)),
    ...(['director', 'compras', 'marketing', 'ventas', 'finanzas'] as const).flatMap((rol) => sospechas(`${rol}.hipotesis`, plan[rol].hipotesis.texto)),
    ...sospechas('compras.justificacion', plan.compras.justificacion),
    ...sospechas('marketing.justificacion', plan.marketing.justificacion),
    ...sospechas('ventas.justificacion', plan.ventas.justificacion),
    ...plan.marketing.campanas.flatMap((c) => sospechas(`campana ${c.id}`, c.mensaje)),
  ];

  // --- Compras -------------------------------------------------------------
  const ordenes: Array<PlanAplicado['ordenes'][number] & { costo: Centavos }> = [];
  for (const o of plan.compras.ordenes) {
    if (ordenes.length >= lim.ordenes_max) {
      rechazos.push({ rol: 'compras', codigo: 'limite_ordenes', detalle: `máximo ${lim.ordenes_max} órdenes` });
      break;
    }
    if (o.unidades > lim.unidades_max_orden) {
      rechazos.push({ rol: 'compras', codigo: 'unidades_excedidas', detalle: `${o.sku}: ${o.unidades} > ${lim.unidades_max_orden}` });
      continue;
    }
    try {
      const cot = cotizarOrden(ci, o.sku, o.proveedorId, o.unidades);
      ordenes.push({ ...o, costo: cot.costoTotal + cot.flete });
    } catch (error) {
      rechazos.push({ rol: 'compras', codigo: 'orden_invalida', detalle: (error as Error).message });
    }
  }
  const reposicion = plan.compras.reposicion.filter((r) => {
    try {
      cotizarOrden(ci, r.sku, r.proveedorId, r.cantidad);
      if (r.cantidad > lim.unidades_max_orden) throw new RangeError(`${r.sku}: cantidad excesiva`);
      return true;
    } catch (error) {
      rechazos.push({ rol: 'compras', codigo: 'reposicion_invalida', detalle: (error as Error).message });
      return false;
    }
  });

  // --- Marketing -----------------------------------------------------------
  const dias = cfg.dias_por_periodo;
  const idsCampana = new Set<string>();
  const campanas: Campana[] = [];
  for (const c of plan.marketing.campanas) {
    const motivo =
      campanas.length >= lim.campanas_max
        ? `máximo ${lim.campanas_max} campañas`
        : !ci.canal.has(c.canal)
          ? `canal desconocido ${c.canal}`
          : !ci.segmento.has(c.segmento)
            ? `segmento desconocido ${c.segmento}`
            : !ci.angulo.has(c.angulo)
              ? `ángulo desconocido ${c.angulo}`
              : idsCampana.has(c.id)
                ? `id duplicado ${c.id}`
                : c.presupuestoDiario > lim.presupuesto_diario_max_campana
                  ? `presupuesto diario excede ${lim.presupuesto_diario_max_campana}`
                  : c.dias.some((d) => d > dias) || new Set(c.dias).size !== c.dias.length
                    ? 'días inválidos'
                    : c.mensaje.length > lim.mensaje_max_caracteres
                      ? `mensaje de más de ${lim.mensaje_max_caracteres} caracteres`
                      : null;
    if (motivo) {
      rechazos.push({ rol: 'marketing', codigo: 'campana_invalida', detalle: `${c.id}: ${motivo}` });
      continue;
    }
    idsCampana.add(c.id);
    campanas.push({ ...c, mensaje: sanitizarTexto(c.mensaje, lim.mensaje_max_caracteres), dias: [...c.dias].sort((a, b) => a - b) });
  }

  // --- Ventas --------------------------------------------------------------
  const precios: Record<string, Centavos> = {};
  for (const p of plan.ventas.precios) {
    const prod = ci.producto.get(p.sku);
    if (!prod) {
      rechazos.push({ rol: 'ventas', codigo: 'sku_desconocido', detalle: p.sku });
      continue;
    }
    const min = Math.ceil(prod.precio_referencia * lim.precio_min_factor);
    const max = Math.floor(prod.precio_referencia * lim.precio_max_factor);
    if (p.precio < min || p.precio > max) {
      rechazos.push({ rol: 'ventas', codigo: 'precio_fuera_de_rango', detalle: `${p.sku}: ${p.precio} fuera de [${min}, ${max}]` });
      continue;
    }
    precios[p.sku] = p.precio;
  }
  const listado = [...new Set(plan.ventas.listado)].filter((sku) => {
    if (ci.producto.has(sku)) return true;
    rechazos.push({ rol: 'ventas', codigo: 'sku_desconocido', detalle: sku });
    return false;
  });
  const idsPromo = new Set<string>();
  const promociones: Promocion[] = [];
  for (const p of plan.ventas.promociones) {
    const objetivoValido =
      p.tipo === 'compra_multiple' ||
      p.alcance === 'todo' ||
      (p.alcance === 'categoria' && p.objetivo !== null && cfg.categorias.includes(p.objetivo)) ||
      (p.alcance === 'sku' && p.objetivo !== null && ci.producto.has(p.objetivo));
    const motivo =
      promociones.length >= lim.promociones_max
        ? `máximo ${lim.promociones_max} promociones`
        : p.pct > lim.descuento_max_pct
          ? `descuento mayor a ${lim.descuento_max_pct}%`
          : p.dias.some((d) => d > dias)
            ? 'días inválidos'
            : idsPromo.has(p.id)
              ? `id duplicado ${p.id}`
              : !objetivoValido
                ? 'objetivo inválido'
                : null;
    if (motivo) {
      rechazos.push({ rol: 'ventas', codigo: 'promocion_invalida', detalle: `${p.id}: ${motivo}` });
      continue;
    }
    idsPromo.add(p.id);
    promociones.push({ ...p, dias: [...p.dias] });
  }
  let envio = plan.ventas.envio;
  if (envio.costo > lim.envio_costo_max) {
    rechazos.push({ rol: 'ventas', codigo: 'envio_excesivo', detalle: `costo de envío ${envio.costo} > ${lim.envio_costo_max}` });
    envio = estado.envio;
  }
  const fichas = plan.ventas.fichas.filter((f) => {
    if (ci.producto.has(f.sku) && f.pasos <= lim.pasos_ficha_max) return true;
    rechazos.push({ rol: 'ventas', codigo: 'ficha_invalida', detalle: `${f.sku} ×${f.pasos}` });
    return false;
  });

  if (plan.director.estrategia.length > lim.estrategia_max_caracteres) {
    rechazos.push({ rol: 'director', codigo: 'estrategia_truncada', detalle: `más de ${lim.estrategia_max_caracteres} caracteres` });
  }

  // --- Presupuesto: nunca más de lo disponible ------------------------------
  const libre = disponible(estado, cfg.reserva_obligatoria);
  const costoFicha = (f: { pasos: number }) => f.pasos * cfg.costos.mejora_ficha;
  const costoCampana = (c: Campana) => c.presupuestoDiario * c.dias.length;
  const total = () =>
    ordenes.reduce((a, o) => a + o.costo, 0) + fichas.reduce((a, f) => a + costoFicha(f), 0) + campanas.reduce((a, c) => a + costoCampana(c), 0);
  while (total() > libre && campanas.length > 0) {
    const c = campanas.pop() as Campana;
    rechazos.push({ rol: 'marketing', codigo: 'excede_saldo', detalle: `${c.id}: ${costoCampana(c)} no cabe en el disponible ${libre}` });
  }
  while (total() > libre && ordenes.length > 0) {
    const o = ordenes.pop() as (typeof ordenes)[number];
    rechazos.push({ rol: 'compras', codigo: 'excede_saldo', detalle: `${o.sku}: ${o.costo} no cabe en el disponible ${libre}` });
  }
  while (total() > libre && fichas.length > 0) {
    const f = fichas.pop() as (typeof fichas)[number];
    rechazos.push({ rol: 'ventas', codigo: 'excede_saldo', detalle: `ficha ${f.sku}: no cabe en el disponible ${libre}` });
  }

  const comprometido = sinComprometer();
  comprometido.compras = ordenes.reduce((a, o) => a + o.costo, 0);
  comprometido.marketing = campanas.reduce((a, c) => a + costoCampana(c), 0);
  comprometido.ventas = fichas.reduce((a, f) => a + costoFicha(f), 0);
  comprometido.director = comprometido.compras + comprometido.marketing + comprometido.ventas;

  return {
    valido: plan,
    aplicado: {
      ordenes: ordenes.map(({ sku, proveedorId, unidades }) => ({ sku, proveedorId, unidades })),
      reposicion,
      campanas,
      precios,
      listado,
      promociones,
      envio,
      fichas,
    },
    rechazos,
    sospechosos,
    comprometido,
  };
}
