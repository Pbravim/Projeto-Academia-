export class SessaoSemTreinoError extends Error {
  constructor() {
    super('Esta sessao nao esta vinculada a um treino.');
    this.name = 'SessaoSemTreinoError';
  }
}
