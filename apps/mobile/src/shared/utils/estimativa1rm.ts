/**
 * Calcula a estimativa de 1RM (uma repetição máxima) usando a fórmula de Epley.
 * Fórmula: 1RM = cargaKg * (1 + repeticoes / 30)
 *
 * @param cargaKg Peso levantado em kg
 * @param repeticoes Número de repetições realizadas
 * @returns Estimativa de 1RM em kg
 */
export function calcularEstimativa1rm(cargaKg: number, repeticoes: number): number {
  // Com 1 rep o 1RM demonstrado é a própria carga — Epley inflaria 3.3%.
  if (repeticoes <= 1) return cargaKg;
  return cargaKg * (1 + repeticoes / 30);
}

/**
 * Fragmento SQL da estimativa de 1RM (Epley), para uso dentro de queries.
 * Mantém a fórmula idêntica a {@link calcularEstimativa1rm}, evitando duplicar a
 * expressão `carga_kg * (1.0 + repeticoes / 30.0)` espalhada pelos repositórios SQL.
 * Não recebe entrada do usuário — o alias é um literal controlado.
 *
 * @param alias Alias da tabela `series_registradas` na query (default `sr`)
 * @returns Expressão SQL, e.g. `(sr.carga_kg * (1.0 + sr.repeticoes / 30.0))`
 */
export function estimativa1rmSql(alias = 'sr'): string {
  return `(CASE WHEN ${alias}.repeticoes <= 1 THEN ${alias}.carga_kg
                ELSE ${alias}.carga_kg * (1.0 + ${alias}.repeticoes / 30.0) END)`;
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
