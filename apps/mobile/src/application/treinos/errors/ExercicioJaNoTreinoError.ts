export class ExercicioJaNoTreinoError extends Error {
  constructor(exercicioId: string) {
    super(`Exercicio "${exercicioId}" ja esta neste treino.`);
    this.name = 'ExercicioJaNoTreinoError';
  }
}
