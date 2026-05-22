export class SessaoNotFoundError extends Error {
  constructor(sessaoId: string) {
    super(`Sessao ${sessaoId} nao encontrada ou ja em estado target.`);
    this.name = 'SessaoNotFoundError';
  }
}
