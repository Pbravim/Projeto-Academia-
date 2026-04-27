import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import { DuplicateExerciseError } from '../errors/DuplicateExerciseError';

export interface CreateExerciseInput {
  name: string;
  groupMuscle: string;
  category: string;
  equipment?: string;
}

interface CreateExerciseUseCaseDependencies {
  exerciseRepository: ExerciseRepository;
  idGenerator: () => string;
  now: () => Date;
}

export class CreateExerciseUseCase {
  constructor(private readonly dependencies: CreateExerciseUseCaseDependencies) {}

  async execute(input: CreateExerciseInput): Promise<ExercisePrimitives> {
    const exercise = Exercise.create({
      id: this.dependencies.idGenerator(),
      name: input.name,
      groupMuscle: input.groupMuscle,
      category: input.category,
      equipment: input.equipment,
      createdAt: this.dependencies.now(),
    });

    const existingExercise = await this.dependencies.exerciseRepository.findByNormalizedName(
      exercise.toPrimitives().normalizedName
    );

    if (existingExercise) {
      throw new DuplicateExerciseError(exercise.toPrimitives().name);
    }

    await this.dependencies.exerciseRepository.save(exercise);

    return exercise.toPrimitives();
  }
}
