import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';

export interface ExerciseCardViewModel {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
}

export interface ExerciseCatalogViewModel {
  cards: ExerciseCardViewModel[];
  emptyStateMessage: string | null;
}

export function buildExerciseCatalogViewModel(
  exercises: ExercisePrimitives[]
): ExerciseCatalogViewModel {
  if (exercises.length === 0) {
    return {
      cards: [],
      emptyStateMessage: 'Nenhum exercicio cadastrado ainda. Comece criando o primeiro.',
    };
  }

  return {
    cards: exercises.map((exercise) => ({
      id: exercise.id,
      title: exercise.name,
      subtitle: `${exercise.groupMuscle} · ${exercise.category}`,
      meta: exercise.equipment ? `Equipamento: ${exercise.equipment}` : 'Equipamento livre',
    })),
    emptyStateMessage: null,
  };
}
