import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize } from 'node:path';
import type { z } from 'zod';
import type { Principal } from '../../shared/types/dominio.ts';
import { permitido, type Operacion } from './acl.ts';
import type { Rutas } from './rutas.ts';

export interface IntentoDenegado {
  principal: Principal;
  operacion: Operacion;
  ruta: string;
  motivo: string;
}

export class AccesoDenegado extends Error {
  readonly intento: IntentoDenegado;

  constructor(intento: IntentoDenegado) {
    super(`acceso denegado: ${intento.principal} no puede ${intento.operacion} ${intento.ruta} (${intento.motivo})`);
    this.name = 'AccesoDenegado';
    this.intento = intento;
  }
}

/**
 * Acceso a archivos con la identidad de un principal. Toda ruta pasa por la matriz
 * de permisos; los intentos denegados se reportan antes de lanzar la excepción.
 */
export class AlmacenRestringido {
  readonly principal: Principal;
  readonly rutas: Rutas;
  readonly #alDenegar: (intento: IntentoDenegado) => void;

  constructor(rutas: Rutas, principal: Principal, alDenegar: (intento: IntentoDenegado) => void = () => {}) {
    this.rutas = rutas;
    this.principal = principal;
    this.#alDenegar = alDenegar;
  }

  #resolver(relativa: string, raiz: 'corrida' | 'codigo', operacion: Operacion): string {
    const denegar = (motivo: string): never => {
      const intento: IntentoDenegado = { principal: this.principal, operacion, ruta: relativa, motivo };
      this.#alDenegar(intento);
      throw new AccesoDenegado(intento);
    };
    if (relativa.includes('\0')) denegar('byte nulo en la ruta');
    if (isAbsolute(relativa)) denegar('ruta absoluta');
    const limpia = normalize(relativa);
    if (limpia.split(/[\\/]/).includes('..')) denegar('recorrido de directorios');

    const base = raiz === 'corrida' ? this.rutas.raizCorrida : this.rutas.raizCodigo;
    const absoluta = join(base, limpia);
    if (!permitido(this.principal, operacion, absoluta, this.rutas)) denegar('fuera de la política');
    const real = rutaReal(absoluta);
    if (!permitido(this.principal, operacion, real, this.rutas)) denegar('enlace simbólico fuera de la política');
    return absoluta;
  }

  existe(relativa: string): boolean {
    return existsSync(this.#resolver(relativa, 'corrida', 'lectura'));
  }

  leerTexto(relativa: string): string {
    return readFileSync(this.#resolver(relativa, 'corrida', 'lectura'), 'utf8');
  }

  leerJson<T>(relativa: string, esquema?: z.ZodType<T>): T {
    const crudo: unknown = JSON.parse(this.leerTexto(relativa));
    return esquema ? esquema.parse(crudo) : (crudo as T);
  }

  leerJsonCodigo<T>(relativa: string, esquema?: z.ZodType<T>): T {
    const crudo: unknown = JSON.parse(readFileSync(this.#resolver(relativa, 'codigo', 'lectura'), 'utf8'));
    return esquema ? esquema.parse(crudo) : (crudo as T);
  }

  listar(relativa: string): string[] {
    const ruta = this.#resolver(relativa, 'corrida', 'lectura');
    return existsSync(ruta) ? readdirSync(ruta).sort() : [];
  }

  /**
   * Escritura atómica (temporal + rename) cuando el directorio es escribible; si el
   * permiso es sólo sobre el archivo (p. ej. corrida.json), escritura directa.
   */
  escribirTexto(relativa: string, contenido: string): void {
    const ruta = this.#resolver(relativa, 'corrida', 'escritura');
    const directorio = dirname(ruta);
    if (!existsSync(directorio)) mkdirSync(directorio, { recursive: true });
    if (!permitido(this.principal, 'escritura', directorio, this.rutas)) {
      writeFileSync(ruta, contenido);
      return;
    }
    const temporal = `${ruta}.tmp-${process.pid}`;
    writeFileSync(temporal, contenido);
    renameSync(temporal, ruta);
  }

  escribirJson(relativa: string, valor: unknown): void {
    this.escribirTexto(relativa, `${JSON.stringify(valor, null, 2)}\n`);
  }

  anexarTexto(relativa: string, contenido: string): void {
    const ruta = this.#resolver(relativa, 'corrida', 'escritura');
    if (!existsSync(dirname(ruta))) mkdirSync(dirname(ruta), { recursive: true });
    appendFileSync(ruta, contenido);
  }
}

/** Ruta real del ancestro existente más cercano (detecta symlinks que escapan). */
function rutaReal(ruta: string): string {
  let actual = ruta;
  const pendientes: string[] = [];
  while (!existsSync(actual)) {
    const padre = dirname(actual);
    if (padre === actual) return ruta;
    pendientes.unshift(actual.slice(padre.length + 1));
    actual = padre;
  }
  return join(realpathSync(actual), ...pendientes);
}
