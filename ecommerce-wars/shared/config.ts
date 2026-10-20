import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { sha256 } from './hash.ts';

const Prob = z.number().min(0).max(1);
const Centavos = z.number().int().nonnegative();
const Rango = z
  .tuple([z.number(), z.number()])
  .refine(([min, max]) => min <= max, { message: 'rango invertido' });
const MapaNumerico = z.record(z.string(), z.number().nonnegative());
const Severidad = z.enum(['leve', 'grave', 'critica']);

const ProductoSchema = z.strictObject({
  sku: z.string().regex(/^[A-Z]{3}-[A-Z]{3}$/),
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  precio_referencia: Centavos.positive(),
  devolucion_base: Prob,
});

const ProveedorSchema = z.strictObject({
  id: z.string().regex(/^PRV-[A-Z]{3}$/),
  nombre: z.string().min(1),
  factor_costo: z.number().positive().max(1),
  calidad: Prob,
  entrega_dias: z.number().int().min(1).max(14),
  confiabilidad: Prob,
  minimo_unidades: z.number().int().positive(),
  categorias: z.array(z.string()).min(1),
});

const SegmentoSchema = z.strictObject({
  id: z.string().min(1),
  nombre: z.string().min(1),
  proporcion: Prob,
  presupuesto: Rango,
  sensibilidad_precio: Rango,
  peso_calidad: Rango,
  prob_comparar: Prob,
  afinidad_promo: z.number().nonnegative(),
  preferencias: MapaNumerico,
});

const CanalSchema = z.strictObject({
  id: z.string().min(1),
  modelo: z.enum(['cpm', 'cpc', 'envio']),
  costo: Centavos.positive(),
  ctr_base: Prob,
  bono_intencion: z.number(),
  afinidad: MapaNumerico,
});

const AnguloSchema = z.strictObject({ id: z.string().min(1), afinidad: MapaNumerico });

export const ConfigSchema = z
  .strictObject({
    experimento: z.string(),
    version_reglas: z.string().regex(/^\d+\.\d+\.\d+$/),
    moneda: z.literal('MXN'),
    unidad_monetaria: z.literal('centavos'),
    semilla: z.number().int().nonnegative(),
    empresas: z.tuple([z.literal('alfa'), z.literal('omega')]),
    capital_inicial: Centavos.positive(),
    dias_por_periodo: z.number().int().min(1).max(31),
    fecha_inicio_simulada: z.iso.date(),
    rondas_maximas: z.number().int().min(1).max(200),
    reserva_obligatoria: Centavos,
    victoria: z.strictObject({
      multiplicador_ventas: z.number().min(1),
      pedidos_validos_minimos: z.number().int().nonnegative(),
      ventas_netas_minimas: Centavos,
      exigir_margen_contribucion_positivo: z.boolean(),
    }),
    severidades: z.record(z.string(), Severidad),
    costos: z.strictObject({
      operacion_diaria: Centavos,
      almacenaje_unidad_dia: Centavos,
      envio_salida: Centavos,
      logistica_devolucion: Centavos,
      comision_pago: Prob,
      flete_orden_compra: Centavos,
      mejora_ficha: Centavos,
      incremento_ficha: Prob,
      ficha_inicial: Prob,
    }),
    limites: z.strictObject({
      precio_min_factor: z.number().positive(),
      precio_max_factor: z.number().positive(),
      descuento_max_pct: z.number().int().min(1).max(95),
      unidades_max_orden: z.number().int().positive(),
      ordenes_max: z.number().int().positive(),
      presupuesto_diario_max_campana: Centavos,
      campanas_max: z.number().int().positive(),
      promociones_max: z.number().int().positive(),
      mensaje_max_caracteres: z.number().int().positive(),
      estrategia_max_caracteres: z.number().int().positive(),
      pasos_ficha_max: z.number().int().positive(),
      envio_costo_max: Centavos,
    }),
    mercado: z.strictObject({
      poblacion: z.number().int().positive().max(200000),
      actividad_diaria: Prob,
      estacionalidad_semanal: z.array(z.number().positive()).min(1),
      ciclo_rondas: z.strictObject({ amplitud: Prob, periodo: z.number().int().positive() }),
      ruido_dia: z.number().nonnegative().max(1),
      opcion_externa: z.number(),
      peso_conciencia: z.number(),
      peso_lealtad: z.number(),
      peso_variedad: z.number(),
      conciencia_inicial: z.number(),
      conciencia_decaimiento: Prob,
      conciencia_ganancia: z.number().nonnegative(),
      conciencia_maxima: z.number().positive(),
      umbral_compra: z.number(),
      costo_cambio_tienda: z.number().nonnegative(),
      prob_segundo_articulo: Prob,
      bono_compra_multiple: Prob,
      prob_cancelacion: Prob,
      prob_pago_rechazado: Prob,
      dias_devolucion: z.tuple([z.number().int().positive(), z.number().int().positive()]),
      prob_reabastecer_devolucion: Prob,
      prob_suscripcion_correo: Prob,
      tasa_aterrizaje: Prob,
      presion_subasta: z.number().nonnegative(),
      frecuencia_max_impresiones: z.number().positive(),
      intencion_busqueda: Prob,
      tolerancia_presupuesto: z.number().min(1),
      utilidad: z.strictObject({
        peso_calidad: z.number(),
        peso_precio: z.number(),
        mezcla_calidad_producto: Prob,
        calidad_neutral: Prob,
        peso_promo: z.number(),
        peso_angulo: z.number(),
        penalizacion_presupuesto: z.number(),
      }),
      abandono: z.strictObject({ base: Prob, factor_envio: z.number().nonnegative(), maximo: Prob }),
      lealtad: z.strictObject({
        por_compra: z.number(),
        por_calidad: z.number(),
        por_devolucion: z.number(),
        por_quiebre: z.number(),
        minima: z.number(),
        maxima: z.number(),
      }),
    }),
    categorias: z.array(z.string().min(1)).min(1),
    productos: z.array(ProductoSchema).min(1),
    proveedores: z.array(ProveedorSchema).min(1),
    segmentos: z.array(SegmentoSchema).min(1),
    canales: z.array(CanalSchema).min(1),
    angulos: z.array(AnguloSchema).min(1),
  })
  .superRefine((cfg, ctx) => {
    const categorias = new Set(cfg.categorias);
    const segmentos = cfg.segmentos.map((s) => s.id);
    const reportar = (mensaje: string) => ctx.addIssue({ code: 'custom', message: mensaje });

    for (const p of cfg.productos) {
      if (!categorias.has(p.categoria)) reportar(`producto ${p.sku}: categoría desconocida ${p.categoria}`);
    }
    for (const pr of cfg.proveedores) {
      for (const c of pr.categorias) if (!categorias.has(c)) reportar(`proveedor ${pr.id}: categoría ${c}`);
    }
    const sumaProporciones = cfg.segmentos.reduce((a, s) => a + s.proporcion, 0);
    if (Math.abs(sumaProporciones - 1) > 1e-6) reportar(`las proporciones de segmentos suman ${sumaProporciones}`);
    for (const fuente of [...cfg.canales, ...cfg.angulos]) {
      for (const s of segmentos) {
        if (fuente.afinidad[s] === undefined) reportar(`${fuente.id}: falta afinidad para ${s}`);
      }
    }
    for (const s of cfg.segmentos) {
      for (const c of cfg.categorias) {
        if (s.preferencias[c] === undefined) reportar(`segmento ${s.id}: falta preferencia ${c}`);
      }
    }
    if (cfg.mercado.estacionalidad_semanal.length !== cfg.dias_por_periodo) {
      reportar('estacionalidad_semanal debe tener un valor por día del periodo');
    }
    if (cfg.reserva_obligatoria >= cfg.capital_inicial) reportar('reserva_obligatoria >= capital_inicial');
    const skus = cfg.productos.map((p) => p.sku);
    if (new Set(skus).size !== skus.length) reportar('SKU duplicado');
  });

export type Config = z.infer<typeof ConfigSchema>;
export type Producto = Config['productos'][number];
export type Proveedor = Config['proveedores'][number];
export type Segmento = Config['segmentos'][number];
export type Canal = Config['canales'][number];
export type Angulo = Config['angulos'][number];

/** Configuración validada más índices de búsqueda. Inmutable (congelada en profundidad). */
export interface ConfigIndexada {
  readonly cfg: Config;
  readonly hash: string;
  readonly producto: ReadonlyMap<string, Producto>;
  readonly proveedor: ReadonlyMap<string, Proveedor>;
  readonly segmento: ReadonlyMap<string, Segmento>;
  readonly canal: ReadonlyMap<string, Canal>;
  readonly angulo: ReadonlyMap<string, Angulo>;
}

export function congelarProfundo<T>(valor: T): T {
  if (valor !== null && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.freeze(valor);
    for (const v of Object.values(valor as Record<string, unknown>)) congelarProfundo(v);
  }
  return valor;
}

export function indexarConfig(cfg: Config, hash: string): ConfigIndexada {
  const porId = <T extends { id: string }>(items: readonly T[]) => new Map(items.map((i) => [i.id, i]));
  return congelarProfundo({
    cfg,
    hash,
    producto: new Map(cfg.productos.map((p) => [p.sku, p])),
    proveedor: porId(cfg.proveedores),
    segmento: porId(cfg.segmentos),
    canal: porId(cfg.canales),
    angulo: porId(cfg.angulos),
  });
}

/** Lee y valida la configuración. El hash se calcula sobre los bytes exactos del archivo. */
export function cargarConfig(ruta: string): ConfigIndexada {
  const crudo = readFileSync(ruta, 'utf8');
  return parsearConfig(crudo);
}

export function parsearConfig(crudo: string): ConfigIndexada {
  const resultado = ConfigSchema.safeParse(JSON.parse(crudo));
  if (!resultado.success) {
    const detalle = resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`config/experiment.json inválido: ${detalle}`);
  }
  return indexarConfig(resultado.data, sha256(crudo));
}
