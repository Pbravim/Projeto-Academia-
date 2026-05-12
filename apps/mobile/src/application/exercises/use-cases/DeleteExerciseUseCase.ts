import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import { ExerciseNotFoundError } from '../errors/ExerciseNotFoundError';

interface DeleteExerciseUseCaseDependencies {
  exerciseRepository: ExerciseRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
}

/**
 * Remove um exercicio do catalogo com cascata completa:
 * 1. Remove de todos os treinos (treino_exercicios)
 * 2. Remove series de sessoes que usavam esse exercicio
 * 3. Remove o exercicio das sessoes
 * 4. Remove do catalogo
 */
export class DeleteExerciseUseCase {
  constructor(private readonly dependencies: DeleteExerciseUseCaseDependencies) {}

  /** @throws {ExerciseNotFoundError} exercicio nao encontrado */
  async execute(id: string): Promise<void> {
    const exercise = await this.dependencies.exerciseRepository.findById(id);
    if (!exercise) throw new ExerciseNotFoundError(id);

    await this.dependencies.treinoExercicioRepository.deleteByExercicioId(id);
    await this.dependencies.serieRegistradaRepository.deleteByExercicioId(id);
    await this.dependencies.sessaoExercicioRepository.deleteByExercicioId(id);
    await this.dependencies.exerciseRepository.delete(id);
  }
}
