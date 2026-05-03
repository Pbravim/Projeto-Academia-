export class TreinoNotFoundError extends Error {
  constructor(id: string) {
    super(`Treino com id "${id}" nao encontrado.`);
    this.name = 'TreinoNotFoundError';
  }
}
