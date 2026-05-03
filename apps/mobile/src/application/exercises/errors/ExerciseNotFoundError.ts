export class ExerciseNotFoundError extends Error {
  constructor(id: string) {
    super(`Exercicio com id "${id}" nao encontrado.`);
    this.name = 'ExerciseNotFoundError';
  }
}
