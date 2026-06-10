import { Exercise, type ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import { DuplicateExerciseError } from '../errors/DuplicateExerciseError';
import { ExerciseNotFoundError } from '../errors/ExerciseNotFoundError';

export interface UpdateExerciseInput {
  id: string;
  name: string;
  groupMuscles: string[];
  category: string;
  equipment?: string;
  mediaOnline?: string;
  mediaLocal?: string;
  musculoAlvo?: string[];
  movementPattern?: string;
  executionType?: 'Unilateral' | 'Bilateral' | 'Can Be Both';
  primaryEquipment?: string;
  secondaryEquipment?: string;
}

interface UpdateExerciseUseCaseDependencies {
  exerciseRepository: ExerciseRepository;
  now: () => Date;
}

/** Atualiza nome, grupo muscular, categoria ou equipamento de um exercicio existente. */
export class UpdateExerciseUseCase {
  constructor(private readonly dependencies: UpdateExerciseUseCaseDependencies) {}

  /**
   * A verificacao de duplicata so e feita quando o nome normalizado muda.
   * @throws {ExerciseNotFoundError} exercicio nao encontrado
   * @throws {ExerciseValidationError} dados inválidos
   * @throws {DuplicateExerciseError} novo nome já pertence a outro exercicio
   */
  async execute(input: UpdateExerciseInput): Promise<ExercisePrimitives> {
    const current = await this.dependencies.exerciseRepository.findById(input.id);

    if (!current) {
      throw new ExerciseNotFoundError(input.id);
    }

    const currentPrimitives = current.toPrimitives();
    const updated = Exercise.update(currentPrimitives, input, this.dependencies.now());
    const updatedPrimitives = updated.toPrimitives();

    if (updatedPrimitives.normalizedName !== currentPrimitives.normalizedName) {
      const existing = await this.dependencies.exerciseRepository.findByNormalizedName(
        updatedPrimitives.normalizedName
      );

      if (existing) {
        throw new DuplicateExerciseError(updatedPrimitives.name);
      }
    }

    await this.dependencies.exerciseRepository.save(updated);

    return updatedPrimitives;
  }
}
