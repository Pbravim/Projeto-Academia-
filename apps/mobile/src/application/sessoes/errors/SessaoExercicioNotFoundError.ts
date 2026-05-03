export class SessaoExercicioNotFoundError extends Error {
  constructor(id: string) {
    super(`SessaoExercicio com id "${id}" nao encontrado.`);
    this.name = 'SessaoExercicioNotFoundError';
  }
}
