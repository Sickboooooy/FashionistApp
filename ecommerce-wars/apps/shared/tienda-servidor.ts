import { existsSync, statSync } from 'node:fs';
import type { Server } from 'node:http';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { fechaSimulada } from '../../shared/calendario.ts';
import { cargarConfig, type ConfigIndexada } from '../../shared/config.ts';
import type { Escaparate } from '../../shared/contracts/vista.ts';
import { formatoMXN } from '../../shared/money.ts';
import { codigoWarRoom, EventoSelladoSchema, type EventoSellado } from '../../shared/schemas/eventos.ts';
import type { EmpresaId } from '../../shared/types/dominio.ts';
import { hashEvento } from '../../harness/event-bus/diario.ts';
import { AlmacenRestringido } from '../../harness/permissions/almacen.ts';
import { crearRutas, enCorrida, RELATIVAS, rutaConfig, rutasDadas, type Rutas } from '../../harness/permissions/rutas.ts';
import { cotizarCarrito, type Tarifario } from '../../simulation/market/precios.ts';
import { crearServidor, ErrorHttp, validar } from './servidor.ts';

/*
 * Servidor de una tienda (ALFA u OMEGA). Opera con la identidad `<empresa>:tienda`:
 * lee lo público y lo propio, y sólo escribe pedidos de demostración.
 * Los pedidos hechos desde la interfaz son DEMOSTRACIONES: no mueven inventario,
 * no entran al libro mayor y no participan en la competencia (regla 6).
 */

const CIUDADES = ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro', 'Mérida', 'León', 'Tijuana'] as const;

const CheckoutSchema = z.strictObject({
  items: z
    .array(z.strictObject({ sku: z.string().regex(/^[A-Z]{3}-[A-Z]{3}$/), cantidad: z.number().int().min(1).max(5) }))
    .min(1)
    .max(10),
  cliente: z.strictObject({
    alias: z.string().trim().min(2).max(40).regex(/^[\p{L}\p{N} .'-]+$/u, 'usa sólo letras, números, espacios y . \' -'),
    ciudad: z.enum(CIUDADES),
  }),
});

const PedidoDemoSchema = z.strictObject({
  id: z.string(),
  creadoEn: z.string(),
  cliente: z.strictObject({ alias: z.string(), ciudad: z.string() }),
  lineas: z.array(z.strictObject({ sku: z.string(), nombre: z.string(), unidades: z.number(), precioLista: z.number(), descuento: z.number(), neto: z.number() })),
  subtotal: z.number(),
  descuento: z.number(),
  envio: z.number(),
  total: z.number(),
  ronda: z.number(),
  dia: z.number(),
});
type PedidoDemo = z.infer<typeof PedidoDemoSchema>;

const AVISO_DEMO = 'Pedido de demostración: no mueve inventario, no se contabiliza y no participa en la competencia. No se realizó ningún cobro.';
const MARCA_DEFECTO = { nombre: '', lema: '', descripcion: '' };

export interface OpcionesTienda {
  empresa: EmpresaId;
  puerto: number;
  dirPublico: URL;
}

function rutasDelEntorno(): Rutas {
  const corrida = process.env.EW_RAIZ_CORRIDA;
  const codigo = process.env.EW_RAIZ_CODIGO;
  return corrida && codigo ? rutasDadas(corrida, codigo) : crearRutas(corrida);
}

/**
 * La tienda es pública: su feed sólo muestra lo que cualquier visitante podría
 * observar. Nunca compras a proveedores, montos de venta ni presupuestos.
 */
const CODIGOS_PUBLICOS_TIENDA = new Set(['PRICE_CHANGED', 'CAMPAIGN_STARTED', 'CAMPAIGN_STOPPED', 'ORDER_CREATED', 'ORDER_PAID_SIMULATED', 'ORDER_CANCELLED', 'ORDER_REFUNDED']);

function resumenEvento(e: EventoSellado): string {
  switch (e.tipo) {
    case 'pedido_creado':
      return `Pedido ${e.datos.pedido.id} creado`;
    case 'pedido_cobrado':
      return `Cobro simulado de ${e.datos.pedidoId} aprobado`;
    case 'pedido_cancelado':
      return `Pedido ${e.datos.pedidoId} cancelado (${e.datos.motivo === 'pago_rechazado' ? 'pago rechazado' : 'por el cliente'})`;
    case 'devolucion_procesada':
      return `Devolución de ${e.datos.sku} reembolsada (pedido ${e.datos.pedidoId})`;
    case 'precio_cambiado':
      return `${e.datos.sku}: ${formatoMXN(e.datos.anterior)} → ${formatoMXN(e.datos.nuevo)}`;
    case 'campana_iniciada':
      return `Campaña ${e.datos.campanaId} en ${e.datos.canal}`;
    case 'campana_detenida':
    case 'campana_pausada':
      return `Campaña ${e.datos.campanaId} detenida`;
    default:
      return e.tipo;
  }
}

export function iniciarTienda(opciones: OpcionesTienda): Server {
  const { empresa } = opciones;
  const rutas = rutasDelEntorno();
  const almacen = new AlmacenRestringido(rutas, `${empresa}:tienda`);
  const ci: ConfigIndexada = cargarConfig(rutaConfig(rutas));
  const marca = (() => {
    try {
      return almacen.leerJsonCodigo<typeof MARCA_DEFECTO>(`apps/${empresa}/marca.json`);
    } catch {
      return MARCA_DEFECTO;
    }
  })();
  const rutaEventos = RELATIVAS.privado(empresa, 'eventos.jsonl');
  const rutaDemo = RELATIVAS.privado(empresa, 'tienda/pedidos-demo.json');
  let cache: { tamano: number; eventos: EventoSellado[] } = { tamano: -1, eventos: [] };

  const escaparate = (): Escaparate | null => {
    const ruta = RELATIVAS.escaparate(empresa);
    return almacen.existe(ruta) ? almacen.leerJson<Escaparate>(ruta) : null;
  };
  const eventos = (): EventoSellado[] => {
    const absoluta = enCorrida(rutas, rutaEventos);
    if (!existsSync(absoluta)) return [];
    const tamano = statSync(absoluta).size;
    if (tamano !== cache.tamano) {
      const lineas = almacen.leerTexto(rutaEventos).split('\n').filter((l) => l.length > 0);
      cache = { tamano, eventos: lineas.map((l) => EventoSelladoSchema.parse(JSON.parse(l)) as unknown as EventoSellado) };
    }
    return cache.eventos;
  };
  const demos = (): PedidoDemo[] => (almacen.existe(rutaDemo) ? z.array(PedidoDemoSchema).parse(almacen.leerJson(rutaDemo)) : []);
  const fecha = (ronda: number, dia: number) => fechaSimulada(ci.cfg.fecha_inicio_simulada, (ronda - 1) * ci.cfg.dias_por_periodo + Math.max(1, dia));

  return crearServidor({
    nombre: `tienda-${empresa}`,
    puerto: opciones.puerto,
    estaticos: [fileURLToPath(opciones.dirPublico), fileURLToPath(new URL('./public', import.meta.url))],
    rutas: [
      {
        metodo: 'GET',
        patron: '/api/tienda',
        manejador: () => {
          const e = escaparate();
          return {
            datos: {
              empresa,
              marca,
              escaparate: e,
              categorias: ci.cfg.categorias,
              diasPorPeriodo: ci.cfg.dias_por_periodo,
              ciudades: CIUDADES,
              fechaSimulada: e ? fechaSimulada(ci.cfg.fecha_inicio_simulada, Math.max(1, e.diaGlobal)) : null,
              aviso: AVISO_DEMO,
            },
          };
        },
      },
      {
        metodo: 'GET',
        patron: '/api/eventos',
        manejador: (p) => {
          const limite = Math.min(200, Math.max(1, Number(p.query.get('limite') ?? 50) || 50));
          const lista = eventos()
            .filter((e) => CODIGOS_PUBLICOS_TIENDA.has(codigoWarRoom(e.tipo) ?? ''))
            .slice(-limite)
            .reverse()
            .map((e) => ({
              seq: e.seq,
              ronda: e.ronda,
              dia: e.dia,
              fecha: fecha(e.ronda, e.dia),
              codigo: codigoWarRoom(e.tipo),
              resumen: resumenEvento(e),
              hash: e.hash,
              prevHash: e.prevHash,
              verificado: hashEvento(e, e.seq, e.prevHash) === e.hash,
            }));
          return { datos: lista };
        },
      },
      {
        metodo: 'GET',
        patron: '/api/pedidos',
        manejador: (p) => {
          const limite = Math.min(50, Math.max(1, Number(p.query.get('limite') ?? 12) || 12));
          const todos = eventos();
          const recientes = todos.filter((e) => e.tipo === 'pedido_creado').slice(-limite).reverse();
          return {
            datos: recientes.map((e) => {
              if (e.tipo !== 'pedido_creado') throw new ErrorHttp(500, 'evento inesperado');
              const id = e.datos.pedido.id;
              const relacionados = todos.filter((x) => 'pedidoId' in x.datos && x.datos.pedidoId === id);
              const estado = relacionados.some((x) => x.tipo === 'devolucion_procesada')
                ? 'con devolución'
                : relacionados.some((x) => x.tipo === 'pedido_cancelado')
                  ? 'cancelado'
                  : relacionados.some((x) => x.tipo === 'pedido_enviado')
                    ? 'enviado'
                    : 'pagado';
              return { id, fecha: fecha(e.ronda, e.dia), total: e.datos.pedido.cobrado, unidades: e.datos.pedido.lineas.reduce((a, l) => a + l.unidades, 0), estado };
            }),
          };
        },
      },
      {
        metodo: 'GET',
        patron: '/api/pedidos/:id',
        manejador: (p) => {
          const id = p.parametros.id ?? '';
          if (!/^[A-Z]+-[A-Z0-9-]{1,20}$/.test(id)) throw new ErrorHttp(400, 'identificador de pedido inválido');
          if (id.startsWith('DEMO-')) {
            const demo = demos().find((d) => d.id === id);
            if (!demo) throw new ErrorHttp(404, 'pedido no encontrado');
            const minutos = (Date.now() - Date.parse(demo.creadoEn)) / 60_000;
            const etapas = [
              { estado: 'Confirmado (demostración)', alcanzado: true },
              { estado: 'Preparando', alcanzado: minutos >= 1 },
              { estado: 'Enviado', alcanzado: minutos >= 3 },
              { estado: 'Entregado', alcanzado: minutos >= 6 },
            ];
            return { datos: { id, tipo: 'demo', aviso: AVISO_DEMO, pedido: demo, etapas } };
          }
          const relacionados = eventos().filter(
            (e) => (e.tipo === 'pedido_creado' && e.datos.pedido.id === id) || ('pedidoId' in e.datos && e.datos.pedidoId === id),
          );
          const creado = relacionados.find((e) => e.tipo === 'pedido_creado');
          if (!creado || creado.tipo !== 'pedido_creado') throw new ErrorHttp(404, 'pedido no encontrado');
          const etiqueta: Record<string, string> = {
            pedido_creado: 'Pedido creado',
            pedido_cobrado: 'Pago simulado aprobado',
            pedido_cancelado: 'Cancelado',
            pedido_enviado: 'Enviado',
            devolucion_procesada: 'Devolución procesada y reembolsada',
          };
          return {
            datos: {
              id,
              tipo: 'sintetico',
              pedido: {
                lineas: creado.datos.pedido.lineas.map((l) => ({ sku: l.sku, nombre: ci.producto.get(l.sku)?.nombre ?? l.sku, unidades: l.unidades, neto: l.neto })),
                total: creado.datos.pedido.cobrado,
                envio: creado.datos.pedido.envioCobrado,
              },
              etapas: relacionados
                .filter((e) => etiqueta[e.tipo])
                .map((e) => ({ estado: etiqueta[e.tipo] as string, fecha: fecha(e.ronda, e.dia), seq: e.seq, hash: e.hash, alcanzado: true })),
            },
          };
        },
      },
      {
        metodo: 'POST',
        patron: '/api/checkout',
        manejador: (p) => {
          const entrada = validar(CheckoutSchema, p.cuerpo);
          const e = escaparate();
          if (!e) throw new ErrorHttp(409, 'la tienda aún no abre: espera a que inicie la primera ronda');
          const productos = new Map(e.productos.map((x) => [x.sku, x]));
          for (const item of entrada.items) {
            const prod = productos.get(item.sku);
            if (!prod) throw new ErrorHttp(409, `${item.sku} no está a la venta`);
            if (prod.disponibilidad === 'agotado') throw new ErrorHttp(409, `${prod.nombre} está agotado`);
          }
          const tarifario: Tarifario = { precios: Object.fromEntries(e.productos.map((x) => [x.sku, x.precioLista])), promociones: e.promociones, envio: e.envio };
          const cot = cotizarCarrito(tarifario, ci.producto, entrada.items.map((i) => ({ sku: i.sku, unidades: i.cantidad })), Math.max(1, e.dia));
          const previos = demos();
          const ultimo = previos.reduce((max, d) => Math.max(max, Number(d.id.split('-').at(-1)) || 0), 0);
          const pedido: PedidoDemo = {
            id: `DEMO-${empresa.toUpperCase()}-${String(ultimo + 1).padStart(4, '0')}`,
            creadoEn: new Date().toISOString(),
            cliente: { alias: entrada.cliente.alias, ciudad: entrada.cliente.ciudad },
            lineas: cot.lineas.map((l) => ({ ...l, nombre: productos.get(l.sku)?.nombre ?? l.sku })),
            subtotal: cot.subtotal,
            descuento: cot.descuento,
            envio: cot.envio,
            total: cot.total,
            ronda: e.ronda,
            dia: e.dia,
          };
          almacen.escribirJson(rutaDemo, [...previos, pedido].slice(-500));
          return { estado: 201, datos: { pedido, aviso: AVISO_DEMO } };
        },
      },
    ],
  });
}
