export class ExercicioJaNoTreinoError extends Error {
  constructor(readonly exercicioId: string) {
    super(`Exercicio "${exercicioId}" ja esta neste treino.`);
    this.name = 'ExercicioJaNoTreinoError';
  }
}
