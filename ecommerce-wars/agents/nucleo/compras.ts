import type { Proveedor } from '../../shared/config.ts';
import type { Centavos } from '../../shared/money.ts';
import type { DecisionCompras } from '../../shared/schemas/decisiones.ts';
import {
  costoUnitario,
  enTransito,
  existencia,
  mxn,
  producto,
  proveedorPreferido,
  pronosticoSemanal,
  surtido,
  type ContextoRol,
} from './comun.ts';

const DIAS_COBERTURA_REPOSICION = 5;
const TASA_SERVICIO_OBJETIVO = 0.9;

interface Candidato {
  sku: string;
  proveedor: Proveedor;
  unitario: Centavos;
  unidades: number;
  prioridad: number;
}

/** Agente de Compras: compra inventario para cubrir el pronóstico y declara reglas de reposición. */
export function decidirCompras(ctx: ContextoRol, presupuesto: Centavos): DecisionCompras {
  const { vista, memoria } = ctx;
  const flete = vista.reglas.costos.flete_orden_compra;
  const skus = surtido(ctx);
  const tiendaVacia = skus.every((sku) => existencia(vista, sku) + enTransito(vista, sku) === 0);

  const candidatos: Candidato[] = [];
  for (const sku of skus) {
    const prod = producto(ctx, sku);
    const pronostico = pronosticoSemanal(ctx, sku);
    const necesidad = Math.ceil(pronostico * memoria.coberturaSemanas) - (existencia(vista, sku) + enTransito(vista, sku));
    if (necesidad <= 0) continue;
    const proveedor = proveedorPreferido(ctx, sku, tiendaVacia || existencia(vista, sku) === 0);
    const unitario = costoUnitario(proveedor, prod);
    candidatos.push({
      sku,
      proveedor,
      unitario,
      unidades: Math.max(necesidad, proveedor.minimo_unidades),
      prioridad: pronostico * (prod.precio_referencia - unitario),
    });
  }
  candidatos.sort((a, b) => b.prioridad - a.prioridad || a.sku.localeCompare(b.sku));

  // Amplitud antes que profundidad: si no alcanza para todo, se escala la cobertura
  // de cada SKU (respetando el mínimo del proveedor) para no dejar huecos en el surtido.
  const costoTotal = candidatos.reduce((a, c) => a + c.unidades * c.unitario + flete, 0);
  const escala = costoTotal > presupuesto ? presupuesto / costoTotal : 1;
  let restante = presupuesto;
  const ordenes: DecisionCompras['ordenes'] = [];
  for (const c of candidatos) {
    const deseadas = Math.max(c.proveedor.minimo_unidades, Math.round(c.unidades * escala));
    const unidades = Math.min(deseadas, Math.floor((restante - flete) / c.unitario));
    if (unidades < c.proveedor.minimo_unidades) continue;
    ordenes.push({ sku: c.sku, proveedorId: c.proveedor.id, unidades });
    restante -= unidades * c.unitario + flete;
  }

  const reposicion = skus.map((sku) => {
    const proveedor = proveedorPreferido(ctx, sku, true);
    const diario = pronosticoSemanal(ctx, sku) / vista.diasPorPeriodo;
    return {
      sku,
      proveedorId: proveedor.id,
      puntoReorden: Math.ceil(diario * (proveedor.entrega_dias + 1)),
      cantidad: Math.max(proveedor.minimo_unidades, Math.ceil(diario * DIAS_COBERTURA_REPOSICION)),
    };
  });

  const comprometido = presupuesto - restante;
  const omitidos = candidatos.length - ordenes.length;
  return {
    hipotesis: {
      texto: `Con ${memoria.coberturaSemanas.toFixed(1)} semanas de cobertura se atiende al menos el ${TASA_SERVICIO_OBJETIVO * 100}% de la demanda.`,
      metrica: 'tasa_servicio',
      valor: TASA_SERVICIO_OBJETIVO,
    },
    ordenes,
    reposicion,
    justificacion: [
      `${ordenes.length} órdenes por ${mxn(comprometido)} de un presupuesto de ${mxn(presupuesto)}.`,
      tiendaVacia ? 'Sin existencias: se prioriza la velocidad de entrega.' : 'Reabasto según pronóstico de demanda.',
      omitidos > 0 ? `${omitidos} SKU sin orden por presupuesto o mínimo de compra.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}
