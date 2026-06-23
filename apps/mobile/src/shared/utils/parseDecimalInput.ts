/**
 * Converte texto de campo numérico em número, aceitando vírgula OU ponto como
 * separador decimal (teclados pt-BR produzem vírgula). Retorna `NaN` quando o
 * texto não é parseável — chamadores devem validar com `Number.isNaN`.
 *
 * Centraliza o `parseFloat(texto.replace(/,/g, '.'))` antes duplicado nas telas.
 */
export function parseDecimalInput(texto: string): number {
  return parseFloat(texto.replace(/,/g, '.'));
}
