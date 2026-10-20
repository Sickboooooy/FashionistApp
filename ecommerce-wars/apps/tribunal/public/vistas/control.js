import { chipEmpresa, definiciones, el, entero, hashEl, insignia, marcarDesplazables, mensajeError, opcion, tabla } from '../modulos/util.js';

/*
 * Control de la simulación (privilegiado). Las órdenes viajan por POST al War Room,
 * que las reenvía por IPC al harness; el estado vuelve por eventos CONTROL del SSE.
 * Todas las peticiones llevan la cabecera X-War-Room: 1 (anti-CSRF).
 */

const VELOCIDADES = Object.freeze([
  [3000, 'Lenta · 3 s reales por día'],
  [1500, 'Normal · 1.5 s por día'],
  [600, 'Rápida · 0.6 s por día'],
  [200, 'Muy rápida · 0.2 s por día'],
  [50, 'Turbo · 50 ms por día'],
  [0, 'Máxima · sin espera'],
]);
const SEMILLA_MAX = 2_147_483_647;

const FASE = Object.freeze({ entre_rondas: 'Entre rondas (próximo paso: fase de decisión)', en_periodo: 'Periodo en curso', terminado: 'Torneo terminado' });

export function crearVistaControl(panel, ctx) {
  const zonaEstado = el('div');
  const salida = el('p', { clase: 'control-salida', role: 'status', 'aria-live': 'polite' });
  const crearBoton = (texto, clase, alPulsar) => el('button', { type: 'button', clase: `boton ${clase}`, texto, onclick: alPulsar });
  let enviando = false;

  async function ordenar(accion, valor, descripcion) {
    if (enviando) return;
    enviando = true;
    mandos.setAttribute('aria-busy', 'true');
    salida.textContent = `Enviando: ${descripcion}…`;
    try {
      await ctx.enviar('/api/control', valor === undefined ? { accion } : { accion, valor });
      salida.textContent = `Orden aceptada: ${descripcion}.`;
    } catch (error) {
      salida.textContent = `No se pudo ${descripcion.toLowerCase()}: ${mensajeError(error)}`;
    } finally {
      enviando = false;
      mandos.removeAttribute('aria-busy');
      actualizarBotones();
    }
  }

  const bPausar = crearBoton('Pausar', '', () => ordenar('pausar', undefined, 'Pausar'));
  const bReanudar = crearBoton('Reanudar', 'boton-primario', () => ordenar('reanudar', undefined, 'Reanudar'));
  const bDia = crearBoton('Ejecutar un día', '', () => ordenar('dia', undefined, 'Ejecutar un día'));
  const bSemana = crearBoton('Ejecutar una semana', '', () => ordenar('semana', undefined, 'Ejecutar una semana'));
  const mandos = el('div', { clase: 'pila-compacta' }, [
    el('div', { clase: 'acciones', role: 'group', 'aria-label': 'Reproducción de la simulación' }, [bPausar, bReanudar]),
    el('div', { clase: 'acciones', role: 'group', 'aria-label': 'Avance manual' }, [bDia, bSemana]),
  ]);

  const selVelocidad = el('select', { id: 'control-velocidad', name: 'velocidad', 'aria-describedby': 'control-velocidad-ayuda' }, VELOCIDADES.map(([v, t]) => opcion(String(v), t)));
  let velocidadTocada = false;
  selVelocidad.addEventListener('change', () => {
    velocidadTocada = true;
  });
  // Se aplica con un botón explícito: con el teclado, `change` se dispara en cada flecha.
  const bVelocidad = crearBoton('Aplicar velocidad', '', () => {
    const valor = Number(selVelocidad.value);
    velocidadTocada = false;
    ordenar('velocidad', valor, `Fijar velocidad a ${valor} ms reales por día simulado`);
  });

  const inputSemilla = el('input', { id: 'control-semilla', name: 'semilla', type: 'number', inputmode: 'numeric', min: '0', max: String(SEMILLA_MAX), step: '1', required: true, 'aria-describedby': 'control-semilla-ayuda' });
  const errorSemilla = el('p', { clase: 'error-campo', id: 'control-semilla-error', role: 'alert' });
  const bReiniciar = el('button', { type: 'submit', clase: 'boton boton-peligro', texto: 'Reiniciar escenario con semilla…' });

  const textoDialogo = el('p', { id: 'dialogo-reinicio-desc' });
  const bConfirmar = el('button', { type: 'button', clase: 'boton boton-peligro', texto: 'Sí, reiniciar' });
  const bCancelar = el('button', { type: 'button', clase: 'boton', texto: 'Cancelar' });
  const dialogo = el('dialog', { clase: 'dialogo', 'aria-labelledby': 'dialogo-reinicio-titulo', 'aria-describedby': 'dialogo-reinicio-desc' }, [
    el('h2', { id: 'dialogo-reinicio-titulo', clase: 'tarjeta-titulo', texto: 'Confirmar reinicio del escenario' }),
    textoDialogo,
    el('p', { clase: 'tarjeta-desc', texto: 'La corrida actual se conserva intacta en disco (sólo lectura); el War Room pasará a observar la nueva.' }),
    el('div', { clase: 'acciones' }, [bCancelar, bConfirmar]),
  ]);
  let semillaPendiente = null;
  bCancelar.addEventListener('click', () => {
    semillaPendiente = null;
    dialogo.close('cancelar');
  });

  const formulario = el('form', { clase: 'form-reinicio', novalidate: true }, [
    el('div', { clase: 'campo' }, [el('label', { for: 'control-semilla', texto: 'Semilla del nuevo escenario' }), inputSemilla]),
    el('p', { clase: 'tarjeta-desc', id: 'control-semilla-ayuda', texto: `Entero entre 0 y ${entero(SEMILLA_MAX)}. Sólo crea corridas de prueba.` }),
    errorSemilla,
    bReiniciar,
  ]);
  formulario.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const valor = Number(inputSemilla.value);
    if (inputSemilla.value.trim() === '' || !Number.isInteger(valor) || valor < 0 || valor > SEMILLA_MAX) {
      errorSemilla.textContent = `Escribe un entero entre 0 y ${entero(SEMILLA_MAX)}.`;
      inputSemilla.setAttribute('aria-invalid', 'true');
      inputSemilla.focus();
      return;
    }
    errorSemilla.textContent = '';
    inputSemilla.removeAttribute('aria-invalid');
    textoDialogo.textContent = `Se creará una corrida de prueba nueva con la semilla ${valor}. ¿Continuar?`;
    semillaPendiente = valor;
    dialogo.showModal();
    bCancelar.focus();
  });
  bConfirmar.addEventListener('click', async () => {
    const valor = semillaPendiente;
    semillaPendiente = null;
    dialogo.close('confirmar');
    if (valor === null) return;
    const anterior = ctx.estado.config?.corrida?.id ?? null;
    salida.textContent = `Enviando reinicio con semilla ${valor}…`;
    try {
      await ctx.enviar('/api/reiniciar', { semilla: valor });
      salida.textContent = `Reinicio aceptado (semilla ${valor}). Esperando la nueva corrida…`;
      ctx.alReiniciar(anterior);
    } catch (error) {
      salida.textContent = `No se pudo reiniciar: ${mensajeError(error)}`;
    }
  });

  const zonaCorridas = el('div');

  panel.append(
    el('p', { clase: 'nota', texto: 'El tiempo simulado es independiente del tiempo real: la velocidad sólo decide cuánto tiempo real se espera entre días simulados. Pausar, acelerar o avanzar paso a paso nunca altera los resultados (el motor es determinista con la semilla).' }),
    el('div', { clase: 'rejilla-2' }, [
      el('section', { clase: 'tarjeta', 'aria-labelledby': 'control-estado-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'control-estado-titulo', texto: 'Estado del controlador' }), zonaEstado]),
      el('section', { clase: 'tarjeta', 'aria-labelledby': 'control-mandos-titulo' }, [
        el('h2', { clase: 'tarjeta-titulo', id: 'control-mandos-titulo', texto: 'Mandos' }),
        mandos,
        el('p', { clase: 'tarjeta-desc', texto: '«Ejecutar un día» y «Ejecutar una semana» sólo están disponibles en pausa. Una semana = cerrar la ronda en curso (o jugar la siguiente completa).' }),
        el('div', { clase: 'filtros' }, [el('div', { clase: 'campo' }, [el('label', { for: 'control-velocidad', texto: 'Velocidad (tiempo real por día simulado)' }), selVelocidad]), el('div', { clase: 'campo campo-boton' }, bVelocidad)]),
        el('p', { clase: 'tarjeta-desc', id: 'control-velocidad-ayuda', texto: 'Elige y pulsa «Aplicar velocidad». «Máxima» simula sin espera entre días.' }),
        salida,
      ]),
    ]),
    el('div', { clase: 'rejilla-2' }, [
      el('section', { clase: 'tarjeta', 'aria-labelledby': 'control-reinicio-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'control-reinicio-titulo', texto: 'Reiniciar escenario' }), formulario]),
      el('section', { clase: 'tarjeta', 'aria-labelledby': 'control-corridas-titulo' }, [el('h2', { clase: 'tarjeta-titulo', id: 'control-corridas-titulo', texto: 'Corridas' }), zonaCorridas]),
    ]),
    dialogo,
  );

  function actualizarBotones() {
    const c = ctx.estado.control;
    const disponible = Boolean(c) && ctx.estado.sesion?.controlDisponible !== false;
    const terminado = c?.fase === 'terminado';
    const enfocado = document.activeElement;
    bPausar.disabled = !disponible || terminado || c.pausado;
    bReanudar.disabled = !disponible || terminado || !c.pausado;
    bDia.disabled = !disponible || terminado || !c.pausado || c.ocupado;
    bSemana.disabled = !disponible || terminado || !c.pausado || c.ocupado;
    selVelocidad.disabled = !disponible;
    bVelocidad.disabled = !disponible;
    bReiniciar.disabled = !disponible || ctx.estado.config?.corrida?.modo === 'oficial';
    // Si el botón con foco quedó deshabilitado (p. ej. «Pausar» tras pausar), el foco pasa al siguiente mando útil.
    if (enfocado instanceof HTMLButtonElement && enfocado.disabled && mandos.contains(enfocado)) {
      [bReanudar, bPausar, bDia, bSemana].find((b) => !b.disabled)?.focus();
    }
  }

  function renderEstado() {
    const c = ctx.estado.control;
    if (!c) {
      zonaEstado.replaceChildren(el('p', {}, insignia('aviso', ctx.estado.sesion?.controlDisponible === false ? 'El War Room no tiene conexión con el harness (inícialo con npm run servir).' : 'Esperando el estado del controlador…')));
      return;
    }
    if (document.activeElement !== selVelocidad && !velocidadTocada) {
      if (![...selVelocidad.options].some((o) => Number(o.value) === c.msPorDia)) selVelocidad.append(opcion(String(c.msPorDia), `Personalizada · ${c.msPorDia} ms por día`));
      selVelocidad.value = String(c.msPorDia);
    }
    zonaEstado.replaceChildren(
      definiciones([
        ['Corrida', `${c.corrida} · ${c.modo} · semilla ${c.semilla} · aislamiento ${c.aislamiento}`],
        ['Fase', FASE[c.fase] ?? c.fase],
        ['Ronda', `${c.ronda} de ${c.rondasMaximas} como máximo`],
        ['Día del periodo', `${c.dia} de ${c.diasPorPeriodo}`],
        ['Reloj', c.pausado ? insignia('pendiente', 'En pausa') : insignia('ok', 'Corriendo')],
        ['Harness', c.ocupado ? insignia('aviso', 'Procesando un paso…') : insignia('info', 'Inactivo')],
        ['Ritmo', `${entero(c.msPorDia)} ms reales por día simulado`],
        ['Último seq sellado', c.ultimoSeq >= 0 ? `#${c.ultimoSeq}` : 'Ninguno (diario vacío)'],
        ['Último hash', hashEl(c.ultimoHash, 16)],
        ['Último error', c.ultimoError ? insignia('error', c.ultimoError) : insignia('ok', 'Ninguno')],
        c.fase === 'terminado' ? ['Fin del torneo', el('span', {}, [c.ganador ? chipEmpresa(c.ganador) : 'Sin ganador', ` · ${c.motivoFin ?? ''}`])] : null,
      ]),
    );
  }

  function renderCorridas() {
    const lista = ctx.estado.corridas ?? [];
    const activa = ctx.estado.config?.corrida;
    const listada = activa && lista.some((c) => c.id === activa.id);
    zonaCorridas.replaceChildren(
      activa ? el('p', { clase: 'tarjeta-desc' }, [`Corrida activa: ${activa.id} (${activa.modo}, semilla ${activa.semilla}, reglas v${activa.versionReglas}).`, listada ? '' : ' No aparece en el listado del servidor porque vive fuera del directorio runs/ del repositorio.']) : '',
      tabla({
        titulo: 'Corridas disponibles',
        columnas: [
          { titulo: 'Id', valor: (c) => c.id, encabezado: true },
          { titulo: 'Ruta', valor: (c) => el('code', { clase: 'mono', texto: c.ruta }) },
          { titulo: 'Modo', valor: (c) => c.modo },
          { titulo: 'Semilla', valor: (c) => String(c.semilla), num: true },
          { titulo: 'Rondas cerradas', valor: (c) => entero(c.rondasCerradas), num: true },
          { titulo: 'Estado', valor: (c) => (c.activa ? insignia('ok', 'Activa') : insignia('info', 'Histórica')) },
        ],
        filas: lista,
        vacio: 'El servidor no listó corridas en el repositorio.',
      }),
    );
  }

  return {
    render() {
      renderEstado();
      renderCorridas();
      actualizarBotones();
      marcarDesplazables(panel);
    },
  };
}
