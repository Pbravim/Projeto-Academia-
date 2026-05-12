export class TreinoSemExerciciosError extends Error {
  constructor() {
    super('Este treino nao tem exercicios cadastrados. Adicione ao menos um exercicio antes de iniciar.');
    this.name = 'TreinoSemExerciciosError';
  }
}
