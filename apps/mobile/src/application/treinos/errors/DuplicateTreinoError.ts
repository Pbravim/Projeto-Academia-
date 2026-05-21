export class DuplicateTreinoError extends Error {
  constructor(name: string) {
    super(`Ja existe um treino chamado "${name}".`);
    this.name = 'DuplicateTreinoError';
  }
}
