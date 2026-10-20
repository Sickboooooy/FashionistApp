import { ruta } from '../modulos/api.js';
import { criptoDisponible, verificarManifiesto, verificarSentencia } from '../modulos/canonico.js';
import { graficoColumnas } from '../modulos/graficas.js';
import {
  EMPRESAS,
  NOMBRE_EMPRESA,
  chipEmpresa,
  definiciones,
  dinero,
  compacto,
  dineroCompacto,
  el,
  entero,
  fechaLegible,
  hashCompleto,
  hashEl,
  insignia,
  insigniaBool,
  insigniaResultado,
  marcarDesplazables,
  mensajeError,
  multiplo,
  opcion,
  reemplazarConservando,
  reemplazarOpciones,
  selector,
  tabla,
} from '../modulos/util.js';

/*
 * Tribunal en vivo: comparador por ronda, visor de sentencias (Resolucion) con
 * verificación del hash en el navegador, expedientes con SHA-256, integridad,
 * pruebas críticas, alertas y línea de tiempo. SÓLO LECTURA: no existe ningún
 * control para editar sentencias ni registros económicos.
 */

const NIVEL_ALERTA = Object.freeze({ info: ['info', 'Información'], advertencia: ['aviso', 'Advertencia'], grave: ['error', 'Grave'], critica: ['critico', 'Crítica'] });
const SEVERIDAD = Object.freeze({ leve: ['aviso', 'Leve'], grave: ['error', 'Grave'], critica: ['critico', 'Crítica'] });
const MAX_LINEA_TIEMPO = 150;

const HECHOS = [
  ['Ventas brutas', (h) => dinero(h.indicadores.ventasBrutas)],
  ['Descuentos', (h) => dinero(h.indicadores.descuentos)],
  ['Cancelaciones', (h) => dinero(h.indicadores.cancelaciones)],
  ['Devoluciones', (h) => dinero(h.indicadores.devoluciones)],
  ['Ventas netas', (h) => dinero(h.indicadores.ventasNetas)],
  ['Pedidos válidos', (h) => entero(h.pedidosValidos)],
  ['Pedidos cobrados', (h) => entero(h.pedidosCobrados)],
  ['Margen de contribución', (h) => dinero(h.indicadores.margenContribucion)],
  ['Utilidad operativa', (h) => dinero(h.indicadores.utilidadOperativa)],
  ['Caja al cierre', (h) => dinero(h.caja)],
  ['Inventario (valor)', (h) => dinero(h.inventarioValor)],
  ['Inventario (unidades)', (h) => entero(h.inventarioUnidades)],
  ['Conciliación contable', (h) => insigniaBool(h.conciliado, 'Conciliada', 'NO conciliada')],
];

function textoCriterios(c) {
  if (!c) return '—';
  return [
    `ventas ≥ ${multiplo(c.multiplicador_ventas)} las de la competidora`,
    `pedidos válidos ≥ ${entero(c.pedidos_validos_minimos)}`,
    `ventas netas ≥ ${dinero(c.ventas_netas_minimas)}`,
    c.exigir_margen_contribucion_positivo ? 'margen de contribución positivo' : 'margen no exigido',
  ].join(' · ');
}

function bloqueVerificacion(etiquetaBoton, verificar, descripcion) {
  const salida = el('div', { clase: 'verificacion-salida', 'aria-live': 'polite' });
  const boton = el('button', { type: 'button', clase: 'boton boton-primario', texto: etiquetaBoton });
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    salida.replaceChildren(insignia('pendiente', 'Calculando SHA-256…'));
    try {
      const r = await verificar();
      salida.replaceChildren(
        r.ok ? insignia('ok', 'Coincide: el registro no fue modificado') : insignia('error', 'NO coincide: el registro difiere del sello'),
        definiciones([
          ['Calculado en este navegador', hashCompleto(r.calculado)],
          ['Sello registrado', hashCompleto(r.esperado)],
        ]),
      );
    } catch (error) {
      salida.replaceChildren(insignia('error', `No se pudo verificar: ${mensajeError(error)}`));
    } finally {
      boton.disabled = false;
    }
  });
  if (!criptoDisponible()) {
    boton.disabled = true;
    salida.replaceChildren(insignia('aviso', 'Este navegador no expone crypto.subtle en este origen.'));
  }
  return el('div', { clase: 'verificacion' }, [el('p', { clase: 'tarjeta-desc', texto: descripcion }), boton, salida]);
}

/** Espejo de REGLAS_VICTORIA (harness/evaluator/victoria.ts): la sentencia pública no trae reglasAplicadas. */
const REGLAS_VICTORIA = Object.freeze({
  V0: 'Si ambas empresas registran cero ventas, no hay ganador',
  V1: 'Ventas netas de la candidata ≥ multiplicador × ventas netas de la competidora',
  V2: 'Ambas empresas completaron el mismo periodo',
  V3: 'Muestra mínima de pedidos válidos de la candidata',
  V4: 'Ventas netas mínimas de la candidata en el periodo',
  V5: 'Margen de contribución positivo de la candidata',
  V6: 'Sin infracciones graves sin resolver de la candidata',
  V7: 'Registros y cálculos validados por el Juez',
});

function contrasteConDiario(s, sellado) {
  if (!sellado) return insignia('pendiente', 'El evento JUDGE_VERDICT de esta ronda aún no está en el diario recibido.');
  return sellado.hashVeredicto === s.hashVeredicto
    ? insignia('ok', `Coincide con el JUDGE_VERDICT sellado en el diario (seq #${sellado.seq})`)
    : insignia('error', `NO coincide con el JUDGE_VERDICT sellado (seq #${sellado.seq})`);
}

/**
 * Sentencia redactada de la vista pública (vistaPublica: true): sin estructura de costos,
 * caja ni detalle de incidencias. Su cuerpo no reproduce hashVeredicto, así que no se
 * ofrece el recálculo; el sello se contrasta con el evento JUDGE_VERDICT del diario.
 */
function visorSentenciaPublica(s, sellado) {
  const ids = [...new Set(EMPRESAS.flatMap((e) => (s.comprobaciones?.[e] ?? []).map((c) => c.regla)))];
  return el('article', { clase: 'sentencia', 'aria-label': `Sentencia ${s.resolucion} (versión pública)` }, [
    el('header', { clase: 'sentencia-cabecera' }, [
      el('div', {}, [el('p', { clase: 'sentencia-id', texto: s.resolucion }), el('h3', { clase: 'sentencia-titulo', texto: `Expediente ${s.expediente} · ronda ${s.ronda}` })]),
      insigniaResultado(s.resultado, s.ganador),
    ]),
    el('p', { clase: 'nota', texto: 'Versión pública de la sentencia: muestra el resultado, las reglas cumplidas y los mismos datos de los resultados públicos. La estructura de costos, la caja y el detalle de incidencias sólo se ven en la vista privilegiada.' }),
    definiciones([
      ['Periodo examinado', `días ${s.periodo?.diaGlobalInicio}–${s.periodo?.diaGlobalFin} · ${fechaLegible(s.periodo?.fechaInicio)} a ${fechaLegible(s.periodo?.fechaFin)} (tiempo simulado)`],
      ['Modo y reglas', `${s.modo} · reglas v${s.versionReglas}`],
      ['Ganador', s.ganador ? chipEmpresa(s.ganador) : 'Ninguno'],
    ]),
    el('h4', { clase: 'subtitulo', texto: 'Motivo' }),
    el('p', { clase: 'sentencia-motivo', texto: s.motivo }),
    el('h4', { clase: 'subtitulo', texto: 'Hechos públicos' }),
    s.hechosPublicos
      ? tabla({
          titulo: 'Hechos públicos acreditados',
          columnas: [{ titulo: 'Indicador', valor: (f) => f[0], encabezado: true }, ...EMPRESAS.map((e) => ({ titulo: NOMBRE_EMPRESA[e], valor: (f) => f[1](s.hechosPublicos[e] ?? {}), num: true }))],
          filas: [
            ['Ventas netas', (h) => dinero(h.ventasNetas)],
            ['Pedidos válidos', (h) => entero(h.pedidosValidos)],
          ],
        })
      : el('p', { clase: 'vacio', texto: 'No fue posible acreditar hechos para esta ronda.' }),
    el('h4', { clase: 'subtitulo', texto: 'Comprobaciones de victoria (V1–V7)' }),
    s.comprobaciones
      ? tabla({
          titulo: 'Comprobaciones por empresa (versión pública)',
          columnas: [
            { titulo: 'Regla', valor: (id) => id, encabezado: true },
            { titulo: 'Descripción', valor: (id) => REGLAS_VICTORIA[id] ?? '—' },
            ...EMPRESAS.map((e) => ({
              titulo: NOMBRE_EMPRESA[e],
              valor: (id) => {
                const c = (s.comprobaciones[e] ?? []).find((x) => x.regla === id);
                return c ? insignia(c.cumple ? 'ok' : 'error', c.cumple ? 'cumple' : 'no cumple') : '—';
              },
            })),
          ],
          filas: ids,
        })
      : el('p', { clase: 'vacio', texto: 'Sin comprobaciones: la ronda fue invalidada antes de evaluar la victoria.' }),
    el('h4', { clase: 'subtitulo', texto: `Incidencias (${(s.incidencias ?? []).length})` }),
    tabla({
      titulo: 'Incidencias (versión pública)',
      columnas: [
        { titulo: 'Severidad', valor: (h) => insignia(...(SEVERIDAD[h.severidad] ?? ['info', h.severidad])) },
        { titulo: 'Código', valor: (h) => h.codigo, encabezado: true },
        { titulo: 'Empresa', valor: (h) => chipEmpresa(h.empresa) },
      ],
      filas: s.incidencias ?? [],
      vacio: 'Sin incidencias.',
    }),
    el('h4', { clase: 'subtitulo', texto: 'Evidencias verificadas' }),
    tabla({
      titulo: 'Evidencias verificadas por el Juez',
      columnas: [
        { titulo: 'Archivo', valor: (a) => a.ruta, encabezado: true },
        { titulo: 'SHA-256', valor: (a) => hashCompleto(a.sha256) },
        { titulo: 'Bytes', valor: (a) => entero(a.bytes), num: true },
      ],
      filas: s.evidenciasVerificadas ?? [],
      vacio: 'Sin evidencias.',
    }),
    el('h4', { clase: 'subtitulo', texto: 'Sellos' }),
    definiciones([
      ['Hash del expediente', hashCompleto(s.hashExpediente)],
      ['Hash de la sentencia', hashCompleto(s.hashVeredicto)],
      ['Contraste con el diario', contrasteConDiario(s, sellado)],
    ]),
    el('p', { clase: 'nota nota-hash' }, [el('strong', { texto: 'Nota: ' }), s.nota ?? 'Los hashes acreditan la integridad del registro, no la veracidad de los datos de origen.']),
    el('p', { clase: 'tarjeta-desc acciones-sentencia', texto: 'El recálculo del hash en el navegador requiere la sentencia completa (vista privilegiada). Sólo lectura: las sentencias son inmutables.' }),
  ]);
}

function visorSentencia(s, sellado, privilegiado) {
  return s.vistaPublica === true ? visorSentenciaPublica(s, sellado) : visorSentenciaCompleta(s, privilegiado);
}

function visorSentenciaCompleta(s, privilegiado) {
  const reglas = new Map((s.reglasAplicadas ?? []).map((r) => [r.id, r.descripcion]));
  const idsComprobacion = [...new Set(EMPRESAS.flatMap((e) => (s.comprobaciones?.[e] ?? []).map((c) => c.regla)))];
  return el('article', { clase: 'sentencia', 'aria-label': `Sentencia ${s.resolucion}` }, [
    el('header', { clase: 'sentencia-cabecera' }, [
      el('div', {}, [el('p', { clase: 'sentencia-id', texto: s.resolucion }), el('h3', { clase: 'sentencia-titulo', texto: `Expediente ${s.expediente} · ronda ${s.ronda}` })]),
      insigniaResultado(s.resultado, s.ganador),
    ]),
    definiciones([
      ['Periodo examinado', `días ${s.periodo?.diaGlobalInicio}–${s.periodo?.diaGlobalFin} · ${fechaLegible(s.periodo?.fechaInicio)} a ${fechaLegible(s.periodo?.fechaFin)} (tiempo simulado)`],
      ['Modo y reglas', `${s.modo} · reglas v${s.versionReglas}`],
      ['Criterios de victoria', textoCriterios(s.criteriosVictoria)],
      ['Ganador', s.ganador ? chipEmpresa(s.ganador) : 'Ninguno'],
    ]),
    el('h4', { clase: 'subtitulo', texto: 'Motivo' }),
    el('p', { clase: 'sentencia-motivo', texto: s.motivo }),
    el('h4', { clase: 'subtitulo', texto: 'Fundamentación' }),
    el('ol', { clase: 'lista-simple' }, (s.fundamentacion ?? []).map((l) => el('li', { texto: l }))),
    el('h4', { clase: 'subtitulo', texto: 'Hechos acreditados' }),
    s.hechosAcreditados
      ? tabla({
          titulo: 'Hechos acreditados por el Juez',
          columnas: [{ titulo: 'Indicador', valor: (f) => f[0], encabezado: true }, ...EMPRESAS.map((e) => ({ titulo: NOMBRE_EMPRESA[e], valor: (f) => f[1](s.hechosAcreditados[e]), num: true }))],
          filas: HECHOS,
        })
      : el('p', { clase: 'vacio', texto: 'No fue posible acreditar hechos: expediente incompleto o alterado.' }),
    el('h4', { clase: 'subtitulo', texto: 'Comprobaciones de victoria (V1–V7)' }),
    s.comprobaciones
      ? tabla({
          titulo: 'Comprobaciones por empresa',
          columnas: [
            { titulo: 'Regla', valor: (id) => id, encabezado: true },
            { titulo: 'Descripción', valor: (id) => reglas.get(id) ?? '—' },
            ...EMPRESAS.map((e) => ({
              titulo: NOMBRE_EMPRESA[e],
              valor: (id) => {
                const c = (s.comprobaciones[e] ?? []).find((x) => x.regla === id);
                if (!c) return '—';
                return el('span', { clase: 'comprobacion' }, [insignia(c.cumple ? 'ok' : 'error', c.cumple ? 'cumple' : 'no cumple'), el('span', { clase: 'comprobacion-detalle', texto: c.detalle })]);
              },
            })),
          ],
          filas: idsComprobacion,
        })
      : el('p', { clase: 'vacio', texto: 'Sin comprobaciones: la ronda fue invalidada antes de evaluar la victoria.' }),
    el('h4', { clase: 'subtitulo', texto: `Incidencias (${(s.incidencias ?? []).length})` }),
    tabla({
      titulo: 'Incidencias',
      columnas: [
        { titulo: 'Severidad', valor: (h) => insignia(...(SEVERIDAD[h.severidad] ?? ['info', h.severidad])) },
        { titulo: 'Código', valor: (h) => h.codigo, encabezado: true },
        { titulo: 'Empresa', valor: (h) => chipEmpresa(h.empresa) },
        { titulo: 'Detalle', valor: (h) => h.detalle },
        { titulo: 'Resolución', valor: (h) => h.resolucion },
      ],
      filas: s.incidencias ?? [],
      vacio: 'Sin incidencias.',
    }),
    el('h4', { clase: 'subtitulo', texto: 'Reglas aplicadas' }),
    el('ul', { clase: 'lista-reglas' }, (s.reglasAplicadas ?? []).map((r) => el('li', {}, [el('strong', { texto: r.id }), ` ${r.descripcion}`]))),
    el('h4', { clase: 'subtitulo', texto: 'Evidencias verificadas' }),
    tabla({
      titulo: 'Evidencias verificadas por el Juez',
      columnas: [
        { titulo: 'Archivo', valor: (a) => a.ruta, encabezado: true },
        { titulo: 'SHA-256', valor: (a) => hashCompleto(a.sha256) },
        { titulo: 'Bytes', valor: (a) => entero(a.bytes), num: true },
      ],
      filas: s.evidenciasVerificadas ?? [],
      vacio: 'Sin evidencias.',
    }),
    el('h4', { clase: 'subtitulo', texto: 'Sellos' }),
    definiciones([
      ['Hash del expediente', hashCompleto(s.hashExpediente)],
      ['Hash de la sentencia', hashCompleto(s.hashVeredicto)],
    ]),
    el('p', { clase: 'nota nota-hash' }, [el('strong', { texto: 'Nota: ' }), s.nota ?? 'Los hashes acreditan la integridad del registro, no la veracidad de los datos de origen.']),
    bloqueVerificacion(
      'Verificar en este navegador',
      () => verificarSentencia(s),
      'Recalcula sha256(JSON canónico de la sentencia sin hashVeredicto) aquí mismo, sin confiar en el servidor, y lo compara con el sello.',
    ),
    el('p', { clase: 'acciones-sentencia' }, [
      privilegiado ? el('a', { clase: 'enlace', href: ruta(`/api/veredictos/${Number(s.ronda)}`, { formato: 'md' }), texto: 'Ver la sentencia en Markdown' }) : null,
      el('span', { clase: 'tarjeta-desc', texto: `${privilegiado ? ' · ' : ''}Sólo lectura: las sentencias son inmutables.` }),
    ]),
  ]);
}

function visorExpediente(det, revision) {
  const m = det.manifiesto;
  if (!m) return el('p', { clase: 'vacio', texto: 'Sin manifiesto para esta ronda.' });
  return el('div', { clase: 'pila' }, [
    definiciones([
      ['Expediente', `${m.expediente} · ronda ${m.ronda} · ${m.modo} · reglas v${m.versionReglas} · semilla ${m.semilla}`],
      ['Eventos', `seq ${m.seqInicio}–${m.seqFin}`],
      ['Expediente anterior', m.hashExpedienteAnterior ? hashEl(m.hashExpedienteAnterior, 16) : 'Primer expediente de la corrida'],
      ['prevHash inicial', hashEl(m.prevHashInicio, 16)],
      ['Hash final de la cadena', hashEl(m.hashFin, 16)],
      ['Hash de configuración', hashEl(m.hashConfig, 16)],
      ['Hash del preflight', hashEl(m.hashPreflight, 16)],
      ['Revisión del servidor', revision ? (revision.ok ? insignia('ok', 'SHA-256 de todos los archivos coincide') : insignia('error', revision.errores.join('; '))) : insignia('pendiente', 'Sin revisar')],
    ]),
    tabla({
      titulo: `Archivos del expediente ${m.expediente}`,
      tituloVisible: true,
      columnas: [
        { titulo: 'Archivo', valor: (a) => a.ruta, encabezado: true },
        { titulo: 'SHA-256', valor: (a) => hashCompleto(a.sha256) },
        { titulo: 'Bytes', valor: (a) => entero(a.bytes), num: true },
      ],
      filas: m.archivos ?? [],
    }),
    definiciones([['Hash del expediente (sello del manifiesto)', hashCompleto(m.hashExpediente)]]),
    bloqueVerificacion('Verificar sello del manifiesto', () => verificarManifiesto(m), 'Recalcula sha256(JSON canónico del manifiesto sin hashExpediente) en este navegador.'),
    el('h4', { clase: 'subtitulo', texto: 'Conciliación y rechazos de la ronda' }),
    el(
      'div',
      { clase: 'rejilla-2' },
      EMPRESAS.map((e) => {
        const emp = det.resumen?.empresas?.[e];
        return el('div', { clase: `declaracion empresa-${e}` }, [
          el('h5', { clase: 'declaracion-titulo' }, chipEmpresa(e)),
          insigniaBool(emp?.conciliacion?.libroVsEventos, 'Indicadores = libro mayor', 'Indicadores ≠ libro mayor', 'Sin dato'),
          emp?.conciliacion?.diferencias?.length ? el('ul', { clase: 'diferencias' }, emp.conciliacion.diferencias.map((d) => el('li', { texto: d }))) : null,
          el('p', { clase: 'tarjeta-desc', texto: `${emp?.rechazos?.length ?? 0} decisiones rechazadas por validación` }),
          emp?.rechazos?.length ? el('ul', { clase: 'lista-simple' }, emp.rechazos.map((r) => el('li', { texto: `${r.rol} · ${r.codigo}: ${r.detalle}` }))) : null,
        ]);
      }),
    ),
  ]);
}

function vistaIntegridad(integ, diarioVivo) {
  if (!integ) return el('p', { clase: 'vacio', texto: 'Cargando integridad…' });
  return el('div', { clase: 'pila' }, [
    el('p', {}, integ.ok ? insignia('ok', 'Corrida íntegra') : insignia('error', 'Se detectaron problemas de integridad')),
    definiciones([
      ['Candado de reglas', el('span', {}, [integ.candado.ok ? insignia('ok', integ.candado.detalle) : insignia('error', integ.candado.detalle), integ.candado.autorizadoPor ? el('span', { clase: 'tarjeta-desc', texto: ` · autorizado por: ${integ.candado.autorizadoPor}` }) : null])],
      ['Diario (revisión completa)', integ.diario.ok ? insignia('ok', `${entero(integ.diario.eventos)} eventos encadenados`) : insignia('error', `${integ.diario.errores.length} errores`)],
      ['Último hash', hashEl(integ.diario.ultimoHash, 16)],
      diarioVivo ? ['Diario (verificación en vivo)', diarioVivo.ok ? insignia('ok', `${entero(diarioVivo.eventos)} eventos verificados al recibirlos`) : insignia('error', diarioVivo.errores.join('; '))] : null,
      ['Expedientes', `${integ.expedientes.filter((x) => x.ok).length} de ${integ.expedientes.length} íntegros`],
      ['Sentencias', `${integ.sentencias.filter((x) => x.ok).length} de ${integ.sentencias.length} sin modificar`],
    ]),
    tabla({
      titulo: 'Expedientes y sentencias por ronda',
      columnas: [
        { titulo: 'Ronda', valor: (x) => `R${x.ronda}`, encabezado: true },
        { titulo: 'Expediente', valor: (x) => (x.ok ? insignia('ok', x.expediente) : insignia('error', `${x.expediente}: ${x.errores.join('; ')}`)) },
        {
          titulo: 'Sentencia',
          valor: (x) => {
            const s = integ.sentencias.find((y) => y.ronda === x.ronda);
            if (!s) return insignia('pendiente', 'Pendiente');
            return s.ok ? insignia('ok', s.resolucion) : insignia('error', `${s.resolucion}: ${s.errores.join('; ')}`);
          },
        },
      ],
      filas: integ.expedientes,
      vacio: 'Aún no hay expedientes.',
    }),
  ]);
}

function vistaPruebas(pruebas) {
  if (!pruebas) return el('p', { clase: 'vacio', texto: 'Cargando pruebas…' });
  const p = pruebas.preflight;
  const ej = pruebas.ejecucion;
  if (!p) return el('p', {}, insignia('error', 'No hay registro de pruebas críticas (preflight) para esta corrida.'));
  return el('div', { clase: 'pila' }, [
    el('p', {}, p.aprobado ? insignia('ok', 'Pruebas críticas aprobadas') : insignia('error', 'Pruebas críticas reprobadas')),
    definiciones([
      ['Total', entero(p.total)],
      ['Aprobadas', entero(p.aprobadas)],
      ['Fallidas', entero(p.fallidas)],
      ['Origen', p.sintetico ? insignia('aviso', 'Sintético (declarado por una prueba; sólo válido en modo prueba)') : insignia('ok', 'Ejecución real de la batería')],
      ['Hash de configuración', hashEl(p.hashConfig, 16)],
      ['Ejecución', ej ? `${ej.ejecutadoEn ?? '—'} · ${entero(ej.ms)} ms · código de salida ${ej.codigoSalida}` : 'Sin registro de ejecución'],
    ]),
    p.archivos?.length ? el('details', { clase: 'detalles' }, [el('summary', { texto: `Archivos de prueba (${p.archivos.length})` }), el('ul', { clase: 'lista-simple mono' }, p.archivos.map((a) => el('li', { texto: a })))]) : null,
  ]);
}

function alertasCombinadas(inst, integ, incidentesMercado, control) {
  const deIntegridad = [];
  if (integ) {
    if (!integ.candado.ok) deIntegridad.push({ origen: 'integridad', nivel: 'critica', codigo: 'candado', detalle: integ.candado.detalle });
    for (const x of integ.diario.errores) deIntegridad.push({ origen: 'integridad', nivel: 'critica', codigo: 'diario', detalle: x });
    for (const x of integ.expedientes) for (const err of x.errores) deIntegridad.push({ origen: 'integridad', nivel: 'critica', codigo: x.expediente, ronda: x.ronda, detalle: err });
    for (const x of integ.sentencias) for (const err of x.errores) deIntegridad.push({ origen: 'integridad', nivel: 'critica', codigo: x.resolucion, ronda: x.ronda, detalle: err });
    if (integ.preflight && !integ.preflight.ok) deIntegridad.push({ origen: 'integridad', nivel: 'grave', codigo: 'preflight', detalle: 'Pruebas críticas no válidas para esta corrida' });
  }
  const eventos = [...(inst?.alertas ?? []), ...incidentesMercado].sort((a, b) => b.seq - a.seq).map((a) => ({ origen: 'evento', ...a }));
  const fin = control?.fase === 'terminado' && control.motivoFin ? [{ origen: 'control', nivel: control.ganador ? 'info' : 'grave', codigo: 'torneo_terminado', detalle: control.motivoFin }] : [];
  return [...fin, ...deIntegridad, ...eventos];
}

function lineaDeTiempo(inst) {
  const items = [
    ...(inst.decisiones ?? []).map((d) => ({ seq: d.seq, ronda: d.ronda, codigo: 'AGENT_DECISION_RECORDED', empresa: d.empresa, texto: `${d.rol} (${d.actor}): ${d.resumen}` })),
    ...(inst.estrategias ?? []).map((s) => ({ seq: s.seq, ronda: s.ronda, codigo: 'STRATEGY_CHANGED', empresa: s.empresa, texto: `${s.cambios.length} cambios de estrategia` })),
    ...(inst.veredictos ?? []).map((v) => ({ seq: v.seq, ronda: v.ronda, codigo: 'JUDGE_VERDICT', empresa: null, texto: `${v.expediente}: ${v.resultado === 'ganador' ? `ganador ${NOMBRE_EMPRESA[v.ganador]}` : v.resultado === 'ronda_invalida' ? 'ronda inválida' : 'sin ganador'}` })),
  ]
    .sort((a, b) => b.seq - a.seq)
    .slice(0, MAX_LINEA_TIEMPO);
  if (items.length === 0) return el('p', { clase: 'vacio', texto: 'Aún no hay decisiones.' });
  return el(
    'div',
    { clase: 'desplazable linea-tiempo-marco' },
    el(
      'ol',
      { clase: 'linea-tiempo' },
      items.map((i) =>
        el('li', { clase: `hito codigo-${i.codigo.toLowerCase()}` }, [
          el('div', { clase: 'teletipo-linea' }, [el('span', { clase: 'teletipo-seq', texto: `#${i.seq}` }), el('span', { clase: 'codigo-evento', texto: i.codigo }), chipEmpresa(i.empresa), el('span', { clase: 'teletipo-ronda', texto: `R${i.ronda}` })]),
          el('p', { clase: 'texto-agente teletipo-resumen', texto: i.texto }),
        ]),
      ),
    ),
  );
}

export function crearVistaTribunal(panel, ctx) {
  const cacheSentencias = new Map();
  const cacheExpedientes = new Map();
  let rondaElegida = null;
  let eleccionManual = false;
  let cargando = null;
  let firmaDetalle = '';
  let firmaRondas = '';
  let firmaVivo = '';

  const graficoVentas = graficoColumnas({ titulo: 'Ventas netas por ronda', descripcion: 'Comparador ALFA vs OMEGA.', formato: dinero, formatoEje: dineroCompacto });
  const notaMargen = el('p', { clase: 'tarjeta-desc' });
  const graficoMargen = graficoColumnas({ titulo: 'Margen de contribución por ronda', descripcion: 'Puede ser negativo; la línea base es $0.', formato: dinero, formatoEje: dineroCompacto });
  const graficoPedidos = graficoColumnas({ titulo: 'Pedidos válidos por ronda', descripcion: 'Dato público acreditado en cada sentencia (el margen es información privada).', formato: entero, formatoEje: compacto });
  const tarjetaMargen = el('div', { clase: 'tarjeta tarjeta-grafico' }, [graficoMargen.figura, notaMargen]);
  const tarjetaPedidos = el('div', { clase: 'tarjeta tarjeta-grafico' }, graficoPedidos.figura);
  const selRonda = selector('trib-ronda', 'Ronda a examinar', [], (v) => {
    rondaElegida = Number(v);
    eleccionManual = true;
    cargarDetalle();
  });
  const zonaSentencia = el('div', { clase: 'zona-sentencia' });
  const zonaExpediente = el('div');
  const zonaIntegridad = el('div');
  const zonaPruebas = el('div');
  const zonaAlertas = el('div');
  const zonaLinea = el('div');

  const tarjetaExpediente = el('section', { clase: 'tarjeta', 'aria-labelledby': 'trib-exp-titulo' }, [
    el('h2', { clase: 'tarjeta-titulo', id: 'trib-exp-titulo', texto: 'Expediente de evidencia' }),
    el('p', { clase: 'tarjeta-desc', texto: 'Manifiesto sellado de la ronda elegida: cada archivo con su SHA-256, encadenado al expediente anterior.' }),
    zonaExpediente,
  ]);
  const tarjetaAlertas = el('section', { clase: 'tarjeta', 'aria-labelledby': 'trib-alertas-titulo' }, [
    el('h2', { clase: 'tarjeta-titulo', id: 'trib-alertas-titulo', texto: 'Alertas de integridad e irregularidades' }),
    zonaAlertas,
  ]);
  const tarjetaLinea = el('section', { clase: 'tarjeta', 'aria-labelledby': 'trib-linea-titulo' }, [
    el('h2', { clase: 'tarjeta-titulo', id: 'trib-linea-titulo', texto: 'Línea de tiempo de decisiones' }),
    el('p', { clase: 'tarjeta-desc', texto: `Decisiones, cambios de estrategia y sentencias, del más reciente al más antiguo (máximo ${MAX_LINEA_TIEMPO}).` }),
    zonaLinea,
  ]);

  panel.append(
    el('p', { clase: 'nota', texto: 'El Tribunal es de sólo lectura. Las sentencias se sellan con SHA-256 y no pueden modificarse desde aquí ni desde el servidor del War Room.' }),
    el('div', { clase: 'rejilla-2' }, [el('div', { clase: 'tarjeta tarjeta-grafico' }, graficoVentas.figura), tarjetaMargen, tarjetaPedidos]),
    el('div', { clase: 'tribunal' }, [
      el('section', { clase: 'tarjeta tribunal-sentencia', 'aria-labelledby': 'trib-sent-titulo' }, [
        el('h2', { clase: 'tarjeta-titulo', id: 'trib-sent-titulo', texto: 'Sentencia del Juez' }),
        el('div', { clase: 'filtros' }, selRonda.campo),
        zonaSentencia,
      ]),
      el('div', { clase: 'pila tribunal-lateral' }, [
        el('section', { clase: 'tarjeta', 'aria-labelledby': 'trib-int-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'trib-int-titulo', texto: 'Integridad' }), zonaIntegridad]),
        el('section', { clase: 'tarjeta', 'aria-labelledby': 'trib-pru-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'trib-pru-titulo', texto: 'Pruebas críticas' }), zonaPruebas]),
        tarjetaAlertas,
      ]),
    ]),
    tarjetaExpediente,
    tarjetaLinea,
  );

  const clave = (n) => `${ctx.estado.config?.corrida?.id ?? ''}:${n}`;

  async function cargarDetalle() {
    const n = rondaElegida;
    if (!n) return;
    // La clave se fija antes de pedir: una respuesta tardía de otra corrida no contamina la caché.
    const k = clave(n);
    const tareas = [];
    if (!cacheSentencias.has(k)) {
      tareas.push(
        ctx.obtener(`/api/veredictos/${n}`).then(
          (s) => {
            if (k === clave(n)) cacheSentencias.set(k, s);
          },
          (e) => (e.estado === 404 ? null : ctx.avisarError(`la sentencia de la ronda ${n}`, e)),
        ),
      );
    }
    if (ctx.estado.privilegiado && !cacheExpedientes.has(k)) {
      tareas.push(
        ctx.obtener(`/api/rondas/${n}`).then(
          (d) => {
            if (k !== clave(n)) return;
            if (d.sentencia && d.manifiesto) cacheExpedientes.set(k, d);
            else cargando = d;
          },
          (e) => ctx.avisarError(`el expediente de la ronda ${n}`, e),
        ),
      );
    }
    renderDetalle();
    if (tareas.length) {
      await Promise.all(tareas);
      renderDetalle();
    }
  }

  function renderDetalle() {
    const n = rondaElegida;
    const s = n ? cacheSentencias.get(clave(n)) : null;
    const sentenciaEnLista = n ? ctx.estado.rondas.find((r) => r.ronda === n)?.sentencia : null;
    const det = n ? (cacheExpedientes.get(clave(n)) ?? (cargando?.resumen?.ronda === n ? cargando : null)) : null;
    const revision = n ? (ctx.estado.integridad?.expedientes?.find((x) => x.ronda === n) ?? null) : null;
    const selladoFirma = [...(ctx.estado.privilegiado ? (ctx.estado.inst?.veredictos ?? []) : (ctx.estado.publico?.veredictos ?? []))].find((v) => v.ronda === n)?.hashVeredicto ?? null;
    const nuevaFirma = JSON.stringify([clave(n), Boolean(s), Boolean(sentenciaEnLista), Boolean(det), Boolean(det?.sentencia), revision, ctx.estado.privilegiado, selladoFirma]);
    if (nuevaFirma === firmaDetalle) return;
    firmaDetalle = nuevaFirma;
    if (!n) {
      zonaSentencia.replaceChildren(el('p', { clase: 'vacio', texto: 'Aún no hay rondas cerradas.' }));
      zonaExpediente.replaceChildren(el('p', { clase: 'vacio', texto: 'Aún no hay expedientes.' }));
      return;
    }
    const sellado = [...(ctx.estado.privilegiado ? (ctx.estado.inst?.veredictos ?? []) : (ctx.estado.publico?.veredictos ?? []))].find((v) => v.ronda === n) ?? null;
    zonaSentencia.replaceChildren(s ? visorSentencia(s, sellado, ctx.estado.privilegiado) : el('p', {}, insignia('pendiente', sentenciaEnLista ? 'Cargando sentencia…' : 'Sentencia pendiente: el Juez aún no se pronuncia sobre esta ronda.')));
    if (ctx.estado.privilegiado) zonaExpediente.replaceChildren(det ? visorExpediente(det, revision) : el('p', { clase: 'vacio', texto: 'Cargando expediente…' }));
    marcarDesplazables(panel);
  }

  function renderComparador() {
    const { estado } = ctx;
    const priv = estado.privilegiado && Boolean(estado.inst);
    tarjetaMargen.hidden = !priv;
    tarjetaPedidos.hidden = priv;
    if (priv) {
      const h = (estado.inst.historico ?? []).filter((x) => x.ronda > 0);
      const categorias = h.map((x) => ({ etiqueta: `R${x.ronda}`, detalle: `Ronda ${x.ronda}${x.ronda === estado.inst.ronda && estado.inst.rondaAbierta ? ' (en curso)' : ''}` }));
      const serie = (f) => EMPRESAS.map((e) => ({ id: e, nombre: NOMBRE_EMPRESA[e], valores: h.map((x) => f(x.empresas?.[e])) }));
      notaMargen.textContent = 'Fuente: proyección en vivo desde el diario de eventos.';
      graficoVentas.actualizar({ categorias, series: serie((r) => r?.financiero?.ventasNetas ?? null), tituloTabla: 'Ventas netas por ronda', resumen: 'Ventas netas por ronda de ALFA y OMEGA' });
      graficoMargen.actualizar({ categorias, series: serie((r) => r?.financiero?.margenContribucion ?? null), tituloTabla: 'Margen de contribución por ronda', resumen: 'Margen de contribución por ronda de ALFA y OMEGA' });
      return;
    }
    const r = estado.rondas;
    const categorias = r.map((x) => ({ etiqueta: `R${x.ronda}`, detalle: `Ronda ${x.ronda}` }));
    const pedidos = (x, e) => {
      const s = cacheSentencias.get(clave(x.ronda));
      return s?.hechosPublicos?.[e]?.pedidosValidos ?? s?.hechosAcreditados?.[e]?.pedidosValidos ?? null;
    };
    graficoVentas.actualizar({ categorias, series: EMPRESAS.map((e) => ({ id: e, nombre: NOMBRE_EMPRESA[e], valores: r.map((x) => x.ventasNetas?.[e] ?? null) })), tituloTabla: 'Ventas netas por ronda', resumen: 'Ventas netas por ronda de ALFA y OMEGA' });
    graficoPedidos.actualizar({ categorias, series: EMPRESAS.map((e) => ({ id: e, nombre: NOMBRE_EMPRESA[e], valores: r.map((x) => pedidos(x, e)) })), tituloTabla: 'Pedidos válidos por ronda', resumen: 'Pedidos válidos por ronda de ALFA y OMEGA' });
  }

  async function precargarSentenciasPublicas() {
    if (ctx.estado.privilegiado) return;
    const faltan = ctx.estado.rondas.filter((r) => r.sentencia && !cacheSentencias.has(clave(r.ronda)));
    for (const r of faltan) {
      const k = clave(r.ronda);
      try {
        const s = await ctx.obtener(`/api/veredictos/${r.ronda}`);
        if (k === clave(r.ronda)) cacheSentencias.set(k, s);
      } catch (e) {
        ctx.avisarError(`la sentencia de la ronda ${r.ronda}`, e);
        break;
      }
    }
    if (faltan.length) renderComparador();
  }

  return {
    render() {
      const { estado } = ctx;
      const priv = estado.privilegiado;
      tarjetaExpediente.hidden = !priv;
      tarjetaAlertas.hidden = !priv;
      tarjetaLinea.hidden = !priv;
      const rondas = estado.rondas.map((r) => r.ronda);
      reemplazarOpciones(
        selRonda.select,
        [...estado.rondas].reverse().map((r) => opcion(String(r.ronda), `Ronda ${r.ronda} · ${r.sentencia ? r.sentencia.resolucion : 'sentencia pendiente'}`)),
      );
      const ultima = rondas.at(-1) ?? null;
      if (!eleccionManual || !rondas.includes(rondaElegida)) rondaElegida = ultima;
      if (rondaElegida && selRonda.select.value !== String(rondaElegida)) selRonda.select.value = String(rondaElegida);
      renderComparador();
      const vivo = JSON.stringify([estado.integridad, estado.pruebas, priv ? estado.inst?.integridadDiario : estado.publico?.integridadDiario, priv ? [estado.inst?.alertas, estado.incidentesMercado, estado.control?.motivoFin] : null, priv ? [estado.inst?.decisiones?.length, estado.inst?.estrategias?.length, estado.inst?.veredictos?.length] : null]);
      if (vivo !== firmaVivo) {
        firmaVivo = vivo;
        zonaIntegridad.replaceChildren(vistaIntegridad(estado.integridad, priv ? estado.inst?.integridadDiario : estado.publico?.integridadDiario));
        zonaPruebas.replaceChildren(vistaPruebas(estado.pruebas));
        if (priv && estado.inst) {
          const alertas = alertasCombinadas(estado.inst, estado.integridad, estado.incidentesMercado ?? [], estado.control);
          reemplazarConservando(
            zonaAlertas,
            tabla({
              titulo: 'Alertas',
              columnas: [
                { titulo: 'Nivel', valor: (a) => insignia(...(NIVEL_ALERTA[a.nivel] ?? ['info', a.nivel])) },
                { titulo: 'Origen', valor: (a) => (a.origen === 'integridad' ? 'Revisión de integridad' : a.origen === 'control' ? 'Controlador' : `Evento #${a.seq}`) },
                { titulo: 'Código', valor: (a) => a.codigo, encabezado: true },
                { titulo: 'Empresa', valor: (a) => chipEmpresa(a.empresa) },
                { titulo: 'Ronda · día', valor: (a) => (a.ronda ? `R${a.ronda}${Number.isFinite(a.dia) ? `·D${a.dia}` : ''}` : '—') },
                { titulo: 'Detalle', valor: (a) => el('span', { clase: 'texto-agente', texto: a.detalle }) },
              ],
              filas: alertas,
              vacio: 'Sin alertas: no hay irregularidades registradas.',
            }),
          );
          reemplazarConservando(zonaLinea, lineaDeTiempo(estado.inst));
        }
      }
      const fr = JSON.stringify([estado.config?.corrida?.id, estado.rondas.map((r) => [r.ronda, r.sentencia?.hashVeredicto ?? null]), rondaElegida, priv]);
      if (fr !== firmaRondas) {
        firmaRondas = fr;
        cargarDetalle();
        precargarSentenciasPublicas();
      } else {
        renderDetalle();
      }
      marcarDesplazables(panel);
    },
    /** Al cambiar de corrida las cachés dejan de valer. */
    reiniciar() {
      cacheSentencias.clear();
      cacheExpedientes.clear();
      rondaElegida = null;
      eleccionManual = false;
      cargando = null;
      firmaDetalle = '';
      firmaRondas = '';
      firmaVivo = '';
    },
  };
}
