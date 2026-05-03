export class SessaoEncerradaError extends Error {
  constructor() {
    super('Nao e possivel modificar uma sessao ja finalizada.');
    this.name = 'SessaoEncerradaError';
  }
}
