export class SerieNotFoundError extends Error {
  constructor(id: string) {
    super(`Serie com id "${id}" nao encontrada.`);
    this.name = 'SerieNotFoundError';
  }
}
