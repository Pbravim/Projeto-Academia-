import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';

export interface ExerciseCardViewModel {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  ultimoPeso: string | null;
}

export interface ExerciseCatalogViewModel {
  cards: ExerciseCardViewModel[];
  emptyStateMessage: string | null;
}

export function buildExerciseCatalogViewModel(
  exercises: ExercisePrimitives[],
  ultimosPesos: Map<string, UltimaExecucaoValida> = new Map()
): ExerciseCatalogViewModel {
  if (exercises.length === 0) {
    return {
      cards: [],
      emptyStateMessage: 'Nenhum exercicio cadastrado ainda. Comece criando o primeiro.',
    };
  }

  return {
    cards: exercises.map((exercise) => {
      const ultima = ultimosPesos.get(exercise.id);
      return {
        id: exercise.id,
        title: exercise.name,
        subtitle: `${exercise.groupMuscle} · ${exercise.category}`,
        meta: exercise.equipment ? `Equipamento: ${exercise.equipment}` : 'Equipamento livre',
        ultimoPeso: ultima ? `Ultimo: ${ultima.cargaKg} kg × ${ultima.repeticoes} rep` : null,
      };
    }),
    emptyStateMessage: null,
  };
}
