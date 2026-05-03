export class SessaoNotFoundError extends Error {
  constructor(id: string) {
    super(`Sessao com id "${id}" nao encontrada.`);
    this.name = 'SessaoNotFoundError';
  }
}
