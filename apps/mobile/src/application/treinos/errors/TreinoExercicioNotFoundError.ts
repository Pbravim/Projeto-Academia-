export class TreinoExercicioNotFoundError extends Error {
  constructor(id: string) {
    super(`TreinoExercicio com id "${id}" nao encontrado.`);
    this.name = 'TreinoExercicioNotFoundError';
  }
}
