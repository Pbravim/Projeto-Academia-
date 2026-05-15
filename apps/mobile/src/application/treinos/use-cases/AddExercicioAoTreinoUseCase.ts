import { TreinoExercicio, type TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { TreinoRepository } from '../../../domain/treinos/repositories/TreinoRepository';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { ExercicioJaNoTreinoError } from '../errors/ExercicioJaNoTreinoError';
import { TreinoNotFoundError } from '../errors/TreinoNotFoundError';

export interface AddExercicioAoTreinoInput {
  treinoId: string;
  exercicioId: string;
}

interface AddExercicioAoTreinoUseCaseDependencies {
  treinoRepository: TreinoRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  idGenerator: () => string;
}

/** Adiciona um exercicio ao treino template. A ordem e atribuida automaticamente ao final da lista. */
export class AddExercicioAoTreinoUseCase {
  constructor(private readonly dependencies: AddExercicioAoTreinoUseCaseDependencies) {}

  /**
   * @throws {TreinoNotFoundError} treino nao encontrado
   * @throws {ExerciseNotFoundError} exercicio nao encontrado
   * @throws {ExercicioJaNoTreinoError} exercicio ja esta no treino
   */
  async execute(input: AddExercicioAoTreinoInput): Promise<TreinoExercicioPrimitives> {
    const treino = await this.dependencies.treinoRepository.findById(input.treinoId);
    if (!treino) throw new TreinoNotFoundError(input.treinoId);

    const exercise = await this.dependencies.exerciseRepository.findById(input.exercicioId);
    if (!exercise) throw new ExerciseNotFoundError(input.exercicioId);

    const existing = await this.dependencies.treinoExercicioRepository.findByTreinoIdAndExercicioId(
      input.treinoId,
      input.exercicioId
    );
    if (existing) throw new ExercicioJaNoTreinoError(input.exercicioId);

    const count = await this.dependencies.treinoExercicioRepository.countByTreinoId(input.treinoId);

    const treinoExercicio = TreinoExercicio.create({
      id: this.dependencies.idGenerator(),
      treinoId: input.treinoId,
      exercicioId: input.exercicioId,
      ordem: count + 1,
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      cargaPadrao: null,
      tempoDescansoSegundos: null,
      metodo: 'normal',
      grupoId: null,
    });

    await this.dependencies.treinoExercicioRepository.save(treinoExercicio);

    return treinoExercicio.toPrimitives();
  }
}
