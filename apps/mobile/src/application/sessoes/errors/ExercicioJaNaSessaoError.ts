export class ExercicioJaNaSessaoError extends Error {
  constructor(exercicioId: string) {
    super(`Exercicio "${exercicioId}" ja esta nesta sessao.`);
    this.name = 'ExercicioJaNaSessaoError';
  }
}
