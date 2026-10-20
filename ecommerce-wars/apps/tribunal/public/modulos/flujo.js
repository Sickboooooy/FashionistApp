import { CODIGOS_WAR_ROOM } from './util.js';

/*
 * Conexión SSE con /api/stream. Los eventos llegan con nombre (event: ORDER_CREATED,
 * INTERNO, CONTROL…), así que se registra un oyente por cada código. EventSource
 * reconecta solo y reenvía Last-Event-ID; el servidor retransmite lo que faltó.
 * Si la conexión queda CERRADA (p. ej. respuesta 503), se reabre manualmente
 * desde el último seq recibido.
 */

const RETARDO_LOTE_MS = 60;
const RETARDO_REAPERTURA_MS = 3000;

export function conectarFlujo({ desde, ultimoSeq, alLote, alControl, alEstado }) {
  let fuente = null;
  let cerrado = false;
  let cola = [];
  let temporizadorLote = null;
  let temporizadorReapertura = null;

  const vaciarCola = () => {
    temporizadorLote = null;
    const lote = cola;
    cola = [];
    if (lote.length > 0) alLote(lote);
  };

  const recibir = (ev) => {
    let datos;
    try {
      datos = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (!datos || typeof datos.seq !== 'number') return;
    // Búfer privado del lote: se anexa in situ porque una reconexión puede traer miles de eventos.
    cola.push({ codigo: ev.type, evento: datos });
    if (!temporizadorLote) temporizadorLote = setTimeout(vaciarCola, RETARDO_LOTE_MS);
  };

  const recibirControl = (ev) => {
    try {
      alControl(JSON.parse(ev.data));
    } catch {
      // mensaje de control ilegible: se ignora y se espera el siguiente latido
    }
  };

  const abrir = (desdeSeq) => {
    // Nunca más de una conexión abierta: el servidor limita las conexiones SSE simultáneas.
    fuente?.close();
    const url = Number.isInteger(desdeSeq) && desdeSeq >= 0 ? `/api/stream?desde=${desdeSeq}` : '/api/stream';
    fuente = new EventSource(url);
    for (const codigo of [...CODIGOS_WAR_ROOM, 'INTERNO']) fuente.addEventListener(codigo, recibir);
    fuente.addEventListener('CONTROL', recibirControl);
    fuente.addEventListener('open', () => alEstado('conectado'));
    fuente.addEventListener('error', () => {
      if (cerrado) return;
      if (fuente.readyState === EventSource.CLOSED) {
        alEstado('desconectado');
        clearTimeout(temporizadorReapertura);
        temporizadorReapertura = setTimeout(() => {
          if (!cerrado) abrir(ultimoSeq());
        }, RETARDO_REAPERTURA_MS);
      } else {
        alEstado('reconectando');
      }
    });
    alEstado('conectando');
  };

  abrir(desde);

  return {
    cerrar() {
      cerrado = true;
      clearTimeout(temporizadorLote);
      clearTimeout(temporizadorReapertura);
      fuente?.close();
    },
    reabrir() {
      clearTimeout(temporizadorReapertura);
      abrir(ultimoSeq());
    },
  };
}
