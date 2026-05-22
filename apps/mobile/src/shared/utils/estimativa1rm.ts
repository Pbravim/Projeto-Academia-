/**
 * Calcula a estimativa de 1RM (uma repetição máxima) usando a fórmula de Epley.
 * Fórmula: 1RM = cargaKg * (1 + repeticoes / 30)
 *
 * @param cargaKg Peso levantado em kg
 * @param repeticoes Número de repetições realizadas
 * @returns Estimativa de 1RM em kg
 */
export function calcularEstimativa1rm(cargaKg: number, repeticoes: number): number {
  return cargaKg * (1 + repeticoes / 30);
}

/**
 * Formata a estimativa de 1RM como string para exibição.
 *
 * @param cargaKg Peso levantado em kg
 * @param repeticoes Número de repetições realizadas
 * @returns String formatada (e.g., "101.3 kg")
 */
export function formatarEstimativa1rm(cargaKg: number, repeticoes: number): string {
  const rm1 = calcularEstimativa1rm(cargaKg, repeticoes);
  return `${rm1.toFixed(1)} kg`;
}

/**
 * Formata a estimativa de 1RM como string com prefixo "1RM ~" para exibição em cards/listas.
 *
 * @param cargaKg Peso levantado em kg
 * @param repeticoes Número de repetições realizadas
 * @returns String formatada (e.g., "1RM ~101.3 kg")
 */
export function formatarEstimativa1rmComPrefixo(cargaKg: number, repeticoes: number): string {
  return `1RM ~${formatarEstimativa1rm(cargaKg, repeticoes)}`;
}
