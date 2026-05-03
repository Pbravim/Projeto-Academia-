export class SessaoJaAtivaError extends Error {
  constructor() {
    super('Ja existe uma sessao em andamento. Finalize-a antes de iniciar uma nova.');
    this.name = 'SessaoJaAtivaError';
  }
}
