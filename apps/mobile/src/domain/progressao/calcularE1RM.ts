/** Epley; a single repetition demonstrates the load without extrapolation. */
export function calcularE1RM(cargaKg: number, repeticoes: number): number {
  return repeticoes <= 1 ? cargaKg : cargaKg * (1 + repeticoes / 30);
}
