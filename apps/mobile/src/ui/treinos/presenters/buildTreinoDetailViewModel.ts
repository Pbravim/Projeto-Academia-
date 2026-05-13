import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';

export interface TreinoExercicioViewModel {
  treinoExercicioId: string;
  exercicioId: string;
  ordem: number;
  name: string;
  groupMuscle: string;
  category: string;
  equipment: string | null;
  isFirst: boolean;
  isLast: boolean;
}

export interface TreinoDetailViewModel {
  treinoName: string;
  objetivo: string;
  exercicios: TreinoExercicioViewModel[];
  emptyStateMessage: string | null;
}

export function buildTreinoDetailViewModel(
  treino: TreinoPrimitives,
  treinoExercicios: TreinoExercicioPrimitives[],
  exercisesById: Map<string, ExercisePrimitives>
): TreinoDetailViewModel {
  const sorted = [...treinoExercicios].sort((a, b) => a.ordem - b.ordem);
  const total = sorted.length;

  const exercicios: TreinoExercicioViewModel[] = sorted.flatMap((te, index) => {
    const exercise = exercisesById.get(te.exercicioId);
    if (!exercise) return [];

    return [
      {
        treinoExercicioId: te.id,
        exercicioId: te.exercicioId,
        ordem: index + 1,
        name: exercise.name,
        groupMuscle: exercise.groupMuscle,
        category: exercise.category,
        equipment: exercise.equipment,
        isFirst: index === 0,
        isLast: index === total - 1,
      },
    ];
  });

  return {
    treinoName: treino.name,
    objetivo: treino.objetivo ?? 'Sem objetivo definido',
    exercicios,
    emptyStateMessage:
      exercicios.length === 0
        ? 'Nenhum exercicio adicionado. Adicione exercicios do seu catalogo.'
        : null,
  };
}
