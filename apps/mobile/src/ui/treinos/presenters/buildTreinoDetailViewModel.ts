import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import type { AppLocale } from '../../shared/i18n';
import { translate } from '../../shared/i18n/core';

export interface TreinoExercicioViewModel {
  treinoExercicioId: string;
  exercicioId: string;
  ordem: number;
  name: string;
  groupMuscle: string;
  category: string;
  equipment: string | null;
  mediaOnline: string | null;
  mediaLocal: string | null;
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
  exercisesById: Map<string, ExercisePrimitives>,
  locale: AppLocale = 'pt-BR'
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
        groupMuscle: exercise.groupMuscles.join(', '),
        category: exercise.category,
        equipment: exercise.equipment,
        mediaOnline: exercise.mediaOnline ?? null,
        mediaLocal: exercise.mediaLocal ?? null,
        isFirst: index === 0,
        isLast: index === total - 1,
      },
    ];
  });

  return {
    treinoName: treino.name,
    objetivo: treino.objetivo ?? translate(locale, 'treinos.semObjetivoDefinido'),
    exercicios,
    emptyStateMessage:
      exercicios.length === 0
        ? translate(locale, 'treinos.detail.emptyStateMessage')
        : null,
  };
}
