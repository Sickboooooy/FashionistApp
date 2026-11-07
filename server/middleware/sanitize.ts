const ANGLE_BRACKETS = /[<>]/g;

/**
 * Quita todos los `<` y `>` de un valor de texto.
 *
 * Borrar caracteres sueltos no deja restos que vuelvan a formar una etiqueta,
 * a diferencia de borrar patrones de varias letras como `<...>`.
 */
export function stripAngleBrackets(value: string): string {
  return value.replace(ANGLE_BRACKETS, '');
}
