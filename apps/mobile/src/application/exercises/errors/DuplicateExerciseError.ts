export class DuplicateExerciseError extends Error {
  constructor(name: string) {
    super(`Ja existe um exercicio chamado "${name}".`);
    this.name = 'DuplicateExerciseError';
  }
}
