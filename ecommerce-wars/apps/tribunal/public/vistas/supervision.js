import { mapaCalor, medidor } from '../modulos/graficas.js';
import {
  EMPRESAS,
  NOMBRE_EMPRESA,
  chipEmpresa,
  decimal,
  definiciones,
  dinero,
  el,
  entero,
  esNumero,
  horaReal,
  insignia,
  insigniaBool,
  insigniaResultado,
  marcarDesplazables,
  mensajeError,
  multiplo,
  porcentaje,
  tabla,
} from '../modulos/util.js';

/*
 * Supervisión (apartado 16.6): calidad de decisiones por rol y ronda, cumplimiento de
 * restricciones, costo computacional por decisión, latencia del harness, errores y
 * recuperaciones, y desempeño económico por estrategia (perfil). La telemetría es
 * tiempo real del ordenador y no forma parte de la cadena de hashes.
 */

const KB_POR_MB = 1024;
const ESPERA_TRAS_FALLO_MS = 30_000;

function filasCalor(rondas, empresa) {
  const roles = [...new Set(rondas.flatMap((r) => (r[empresa]?.calidad?.roles ?? []).map((x) => x.rol)))];
  const filas = [...roles, 'Promedio'];
  const valores = filas.map((rol) =>
    rondas.map((r) => {
      const c = r[empresa]?.calidad;
      if (!c) return null;
      if (rol === 'Promedio') return c.promedio;
      return c.roles.find((x) => x.rol === rol)?.puntaje ?? null;
    }),
  );
  return { filas, columnas: rondas.map((r) => `R${r.ronda}`), valores, min: 0, max: 100, unidad: 'puntaje (0–100)', tituloTabla: `Puntaje de calidad por rol y ronda, ${NOMBRE_EMPRESA[empresa]}`, resumen: `Calidad de decisiones de ${NOMBRE_EMPRESA[empresa]} por rol y ronda` };
}

function tablaOperaciones(titulo, entradas) {
  const maxMedio = Math.max(1, ...entradas.map(([, v]) => v.msMedio));
  return tabla({
    titulo,
    tituloVisible: true,
    columnas: [
      { titulo: 'Operación', valor: ([k]) => k, encabezado: true },
      { titulo: 'Muestras', valor: ([, v]) => entero(v.n), num: true },
      { titulo: 'ms medio', valor: ([, v]) => el('span', { clase: 'celda-medidor' }, [decimal(v.msMedio), medidor(v.msMedio / maxMedio, `${decimal(v.msMedio)} ms de media`)]), num: true },
      { titulo: 'ms máximo', valor: ([, v]) => decimal(v.msMax), num: true },
      { titulo: 'CPU medio (ms)', valor: ([, v]) => decimal(v.cpuMedioMs), num: true },
      { titulo: 'Memoria máx. (MB)', valor: ([, v]) => (v.memoriaMaxKb > 0 ? decimal(v.memoriaMaxKb / KB_POR_MB) : '—'), num: true },
      { titulo: 'Errores', valor: ([, v]) => (v.errores > 0 ? insignia('error', entero(v.errores)) : insignia('ok', '0')) },
    ],
    filas: entradas,
    vacio: 'Sin registros.',
  });
}

function desempenoPorPerfil(rondas, sentencias) {
  const acumulado = new Map();
  for (const r of rondas) {
    for (const e of EMPRESAS) {
      const perfil = r.perfiles?.[e] ?? NOMBRE_EMPRESA[e];
      const clave = `${e}:${perfil}`;
      const f = r[e]?.resumen?.financiero;
      const previo = acumulado.get(clave) ?? { perfil, empresa: e, rondas: 0, ventas: 0, margen: 0, utilidad: 0, ganadas: 0 };
      const ganada = sentencias.get(r.ronda)?.ganador === e ? 1 : 0;
      acumulado.set(clave, { ...previo, rondas: previo.rondas + 1, ventas: previo.ventas + (f?.ventasNetas ?? 0), margen: previo.margen + (f?.margenContribucion ?? 0), utilidad: previo.utilidad + (f?.utilidadOperativa ?? 0), ganadas: previo.ganadas + ganada });
    }
  }
  return [...acumulado.values()];
}

/** reports/banco/resultado.json (scripts/banco.ts): desempeño por estrategia en varias semillas. */
function vistaBanco(banco) {
  const sumar = (rondas, e) => rondas.reduce((a, r) => a + (r.ventasNetas?.[e] ?? 0), 0);
  return el('div', { clase: 'pila' }, [
    definiciones([
      ['Generado (hora real)', `${banco.generadoEn?.slice(0, 10) ?? '—'} ${horaReal(banco.generadoEn)}`],
      ['Semillas', `${entero(banco.semillas.length)} (${banco.semillas[0]}…${banco.semillas.at(-1)})`],
      ['Rondas máximas por corrida', entero(banco.rondasMaximas)],
    ]),
    tabla({
      titulo: 'Desempeño por estrategia en el banco',
      tituloVisible: true,
      columnas: [
        { titulo: 'Empresa', valor: ([e]) => chipEmpresa(e) },
        { titulo: 'Perfil', valor: ([, v]) => v.perfil, encabezado: true },
        { titulo: 'Victorias', valor: ([, v]) => entero(v.victorias), num: true },
        { titulo: 'Ventas netas medias por ronda', valor: ([, v]) => dinero(v.ventasNetasMediaPorRonda), num: true },
        { titulo: 'Margen medio por ronda', valor: ([, v]) => dinero(v.margenMedioPorRonda), num: true },
        { titulo: 'Calidad media', valor: ([, v]) => entero(v.calidadMedia), num: true },
        { titulo: 'Rondas con margen negativo', valor: ([, v]) => entero(v.rondasConMargenNegativo), num: true },
      ],
      filas: Object.entries(banco.porEstrategia),
    }),
    tabla({
      titulo: 'Corridas del banco',
      tituloVisible: true,
      columnas: [
        { titulo: 'Semilla', valor: (c) => String(c.semilla), encabezado: true },
        { titulo: 'Ganador', valor: (c) => (c.ganador ? chipEmpresa(c.ganador) : 'Ninguno') },
        { titulo: 'Ronda final', valor: (c) => entero(c.rondaFin), num: true },
        { titulo: 'Ventas netas ALFA', valor: (c) => dinero(sumar(c.rondas ?? [], 'alfa')), num: true },
        { titulo: 'Ventas netas OMEGA', valor: (c) => dinero(sumar(c.rondas ?? [], 'omega')), num: true },
        { titulo: 'Motivo', valor: (c) => c.motivo ?? '—' },
      ],
      filas: banco.corridas,
    }),
  ]);
}

function resumenBanco(banco) {
  if (!banco || typeof banco !== 'object') return null;
  if (Array.isArray(banco.semillas) && Array.isArray(banco.corridas) && banco.porEstrategia && typeof banco.porEstrategia === 'object') return vistaBanco(banco);
  const escalares = Object.entries(banco).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v));
  const compuestos = Object.entries(banco).filter(([, v]) => v !== null && typeof v === 'object');
  return el('div', { clase: 'pila' }, [
    escalares.length ? definiciones(escalares.map(([k, v]) => [k, typeof v === 'boolean' ? insigniaBool(v, 'sí', 'no') : esNumero(v) ? (Number.isInteger(v) ? entero(v) : decimal(v)) : String(v ?? '—')])) : null,
    ...compuestos.map(([k, v]) => el('details', { clase: 'detalles' }, [el('summary', { texto: k }), el('pre', { clase: 'mono bloque-json', texto: JSON.stringify(v, null, 2) })])),
  ]);
}

export function crearVistaSupervision(panel, ctx) {
  let datos = null;
  let obsoleto = true;
  let cargandoAhora = false;
  let fallidoHasta = 0;
  let generacion = 0;
  const calorAlfa = mapaCalor({ titulo: 'Calidad de decisiones · ALFA', descripcion: 'Puntaje 0–100 por rol y ronda; rampa neutra de claro a oscuro.' });
  const calorOmega = mapaCalor({ titulo: 'Calidad de decisiones · OMEGA', descripcion: 'Puntaje 0–100 por rol y ronda; rampa neutra de claro a oscuro.' });
  const estado = el('p', { clase: 'tarjeta-desc', role: 'status', 'aria-live': 'polite' });
  const bActualizar = el('button', { type: 'button', clase: 'boton', texto: 'Actualizar supervisión' });
  const zonaResumen = el('div');
  const zonaDetalleCalidad = el('div', { clase: 'rejilla-2' });
  const zonaRestricciones = el('div');
  const zonaCosto = el('div', { clase: 'pila' });
  const zonaUltimos = el('div');
  const zonaDesempeno = el('div', { clase: 'pila' });
  const zonaBanco = el('div');

  bActualizar.addEventListener('click', () => cargar());

  panel.append(
    el('div', { clase: 'filtros' }, [bActualizar, estado]),
    zonaResumen,
    el('div', { clase: 'rejilla-2' }, [el('div', { clase: 'tarjeta tarjeta-grafico' }, calorAlfa.figura), el('div', { clase: 'tarjeta tarjeta-grafico' }, calorOmega.figura)]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'sup-crit-titulo' }, [
      el('h2', { clase: 'tarjeta-titulo', id: 'sup-crit-titulo', texto: 'Criterios de calidad de la última ronda' }),
      el('p', { clase: 'tarjeta-desc', texto: 'Cada rol se califica con criterios públicos y deterministas sobre resultados observables (harness/evaluator/calidad.ts).' }),
      zonaDetalleCalidad,
    ]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'sup-res-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'sup-res-titulo', texto: 'Cumplimiento de restricciones' }), zonaRestricciones]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'sup-costo-titulo' }, [
      el('h2', { clase: 'tarjeta-titulo', id: 'sup-costo-titulo', texto: 'Costo computacional y latencia del harness' }),
      el('p', { clase: 'tarjeta-desc', texto: 'Tiempo real del ordenador (no simulado). Fuera de la cadena de hashes: no afecta el determinismo.' }),
      zonaCosto,
    ]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'sup-ult-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'sup-ult-titulo', texto: 'Últimos registros, errores y recuperaciones' }), zonaUltimos]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'sup-des-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'sup-des-titulo', texto: 'Desempeño económico por estrategia' }), zonaDesempeno]),
    el('section', { clase: 'tarjeta', 'aria-labelledby': 'sup-banco-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'sup-banco-titulo', texto: 'Banco de pruebas' }), zonaBanco]),
  );

  async function cargar() {
    if (cargandoAhora) return;
    const gen = generacion;
    cargandoAhora = true;
    bActualizar.disabled = true;
    estado.textContent = 'Cargando supervisión…';
    try {
      const nuevos = await ctx.obtener('/api/supervision');
      if (gen !== generacion) return;
      datos = nuevos;
      obsoleto = false;
      fallidoHasta = 0;
      estado.textContent = `Actualizado a las ${horaReal(new Date().toISOString())} (hora real).`;
      dibujar();
    } catch (error) {
      if (gen !== generacion) return;
      // Sin reintentos automáticos inmediatos: evita una ráfaga de peticiones con cada refresco.
      fallidoHasta = Date.now() + ESPERA_TRAS_FALLO_MS;
      estado.textContent = `No se pudo cargar la supervisión: ${mensajeError(error)}. Reintento automático en ${ESPERA_TRAS_FALLO_MS / 1000} s o con «Actualizar supervisión».`;
    } finally {
      cargandoAhora = false;
      bActualizar.disabled = false;
    }
  }

  function dibujar() {
    if (!datos) return;
    const { telemetria, ultimos, rondas, banco } = datos;
    const sentencias = new Map(ctx.estado.rondas.filter((r) => r.sentencia).map((r) => [r.ronda, r.sentencia]));
    zonaResumen.replaceChildren(
      el('div', { clase: 'kpis kpis-resumen' }, [
        ['Registros de telemetría', entero(telemetria.registros)],
        ['Errores', entero(telemetria.errores)],
        ['Recuperaciones', entero(telemetria.recuperaciones)],
        ['Rondas evaluadas', entero(rondas.length)],
      ].map(([n, v]) => el('div', { clase: 'kpi' }, [el('span', { clase: 'kpi-nombre', texto: n }), el('span', { clase: 'kpi-valor', texto: v })]))),
    );
    calorAlfa.actualizar(filasCalor(rondas, 'alfa'));
    calorOmega.actualizar(filasCalor(rondas, 'omega'));

    const ultima = rondas.at(-1);
    zonaDetalleCalidad.replaceChildren(
      ...EMPRESAS.map((e) =>
        el('div', { clase: `declaracion empresa-${e}` }, [
          el('h3', { clase: 'declaracion-titulo' }, [chipEmpresa(e), ultima ? ` · ronda ${ultima.ronda}` : '']),
          tabla({
            titulo: `Criterios por rol de ${NOMBRE_EMPRESA[e]}`,
            columnas: [
              { titulo: 'Rol', valor: (x) => x.rol, encabezado: true },
              { titulo: 'Puntaje', valor: (x) => entero(x.puntaje), num: true },
              { titulo: 'Criterios (valor × peso)', valor: (x) => el('ul', { clase: 'lista-compacta' }, x.criterios.map((c) => el('li', { texto: `${c.nombre}: ${decimal(c.valor)} × ${c.peso}` }))) },
              { titulo: 'Hipótesis', valor: (x) => insigniaBool(x.hipotesisCumplida, 'Cumplida', 'No cumplida', 'Sin evaluar') },
              { titulo: 'Rechazos', valor: (x) => entero(x.rechazos), num: true },
            ],
            filas: ultima?.[e]?.calidad?.roles ?? [],
            vacio: 'Sin evaluación.',
          }),
        ]),
      ),
    );

    zonaRestricciones.replaceChildren(
      tabla({
        titulo: 'Rechazos de validación e incidentes por ronda',
        columnas: [
          { titulo: 'Ronda', valor: (r) => `R${r.ronda}`, encabezado: true },
          ...EMPRESAS.flatMap((e) => [
            { titulo: `${NOMBRE_EMPRESA[e]} · rechazos`, valor: (r) => (r[e]?.rechazos > 0 ? insignia('aviso', entero(r[e].rechazos)) : insignia('ok', '0')) },
            { titulo: `${NOMBRE_EMPRESA[e]} · incidentes`, valor: (r) => (r[e]?.calidad?.incidentes > 0 ? insignia('error', entero(r[e].calidad.incidentes)) : insignia('ok', '0')) },
          ]),
        ],
        filas: rondas,
        vacio: 'Aún no hay rondas evaluadas.',
      }),
    );

    const entradas = Object.entries(telemetria.porOperacion ?? {}).sort(([a], [b]) => a.localeCompare(b));
    zonaCosto.replaceChildren(
      tablaOperaciones('Costo por decisión (agentes y Juez)', entradas.filter(([k]) => !k.startsWith('fase:'))),
      tablaOperaciones('Latencia del harness por fase', entradas.filter(([k]) => k.startsWith('fase:'))),
    );

    const conError = ultimos.filter((u) => !u.ok || u.recuperacion);
    zonaUltimos.replaceChildren(
      definiciones([
        ['Errores registrados', telemetria.errores > 0 ? insignia('error', entero(telemetria.errores)) : insignia('ok', 'Ninguno')],
        ['Recuperaciones', entero(telemetria.recuperaciones)],
        ['Entre los últimos 40', conError.length ? `${conError.length} con error o recuperación` : 'Sin errores'],
      ]),
      tabla({
        titulo: 'Últimos registros de telemetría',
        columnas: [
          { titulo: 'Hora real', valor: (u) => horaReal(u.momento) },
          { titulo: 'Tipo', valor: (u) => u.tipo },
          { titulo: 'Ronda', valor: (u) => `R${u.ronda}`, num: true },
          { titulo: 'Empresa', valor: (u) => chipEmpresa(u.empresa) },
          { titulo: 'Operación', valor: (u) => u.operacion, encabezado: true },
          { titulo: 'ms', valor: (u) => decimal(u.ms), num: true },
          { titulo: 'Estado', valor: (u) => (u.ok ? insignia('ok', 'Correcto') : insignia('error', u.error ?? 'Error')) },
          { titulo: 'Recuperación', valor: (u) => u.recuperacion ?? '—' },
        ],
        filas: [...ultimos].reverse(),
        vacio: 'Sin registros.',
      }),
    );

    zonaDesempeno.replaceChildren(
      tabla({
        titulo: 'Desempeño acumulado por perfil de estrategia',
        tituloVisible: true,
        columnas: [
          { titulo: 'Perfil', valor: (p) => p.perfil, encabezado: true },
          { titulo: 'Empresa', valor: (p) => chipEmpresa(p.empresa) },
          { titulo: 'Rondas', valor: (p) => entero(p.rondas), num: true },
          { titulo: 'Ventas netas', valor: (p) => dinero(p.ventas), num: true },
          { titulo: 'Margen de contribución', valor: (p) => dinero(p.margen), num: true },
          { titulo: 'Utilidad operativa', valor: (p) => dinero(p.utilidad), num: true },
          { titulo: 'Rondas ganadas', valor: (p) => entero(p.ganadas), num: true },
        ],
        filas: desempenoPorPerfil(rondas, sentencias),
        vacio: 'Aún no hay rondas evaluadas.',
      }),
      tabla({
        titulo: 'Desempeño por ronda y perfil',
        tituloVisible: true,
        columnas: [
          { titulo: 'Ronda', valor: (r) => `R${r.ronda}`, encabezado: true },
          ...EMPRESAS.flatMap((e) => [
            { titulo: `${NOMBRE_EMPRESA[e]} · perfil`, valor: (r) => r.perfiles?.[e] ?? '—' },
            { titulo: `${NOMBRE_EMPRESA[e]} · ventas netas`, valor: (r) => dinero(r[e]?.resumen?.financiero?.ventasNetas), num: true },
            { titulo: `${NOMBRE_EMPRESA[e]} · margen`, valor: (r) => dinero(r[e]?.resumen?.financiero?.margenContribucion), num: true },
            { titulo: `${NOMBRE_EMPRESA[e]} · ROAS`, valor: (r) => multiplo(r[e]?.resumen?.roas), num: true },
            { titulo: `${NOMBRE_EMPRESA[e]} · conversión`, valor: (r) => porcentaje(r[e]?.resumen?.conversion), num: true },
          ]),
          { titulo: 'Sentencia', valor: (r) => insigniaResultado(sentencias.get(r.ronda)?.resultado, sentencias.get(r.ronda)?.ganador) },
        ],
        filas: rondas,
        vacio: 'Aún no hay rondas evaluadas.',
      }),
    );

    zonaBanco.replaceChildren(banco ? resumenBanco(banco) : el('p', { clase: 'vacio', texto: 'Sin resultados del banco de pruebas (reports/banco/resultado.json no existe).' }));
    marcarDesplazables(panel);
  }

  return {
    /** Sólo vuelve a pedir datos cuando una ronda cerró (la telemetría cambia por fase, no por evento). */
    render() {
      if (obsoleto && Date.now() >= fallidoHasta) cargar();
    },
    marcarObsoleto() {
      obsoleto = true;
    },
    reiniciar() {
      generacion++;
      datos = null;
      obsoleto = true;
      fallidoHasta = 0;
    },
  };
}
