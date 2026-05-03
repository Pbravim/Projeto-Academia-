import { startTransition, useEffect, useState } from 'react';

import type { AddExercicioAoTreinoUseCase } from '../../../application/treinos/use-cases/AddExercicioAoTreinoUseCase';
import type { ListTreinoExerciciosUseCase } from '../../../application/treinos/use-cases/ListTreinoExerciciosUseCase';
import type { RemoveExercicioDoTreinoUseCase } from '../../../application/treinos/use-cases/RemoveExercicioDoTreinoUseCase';
import type { ReordenarExerciciosUseCase } from '../../../application/treinos/use-cases/ReordenarExerciciosUseCase';
import type { ListExercisesUseCase } from '../../../application/exercises/use-cases/ListExercisesUseCase';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { TreinoExercicioPrimitives } from '../../../domain/treinos/entities/TreinoExercicio';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { ExercicioJaNoTreinoError } from '../../../application/treinos/errors/ExercicioJaNoTreinoError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

export interface TreinoDetailControllerDependencies {
  listTreinoExercicios: ListTreinoExerciciosUseCase;
  addExercicioAoTreino: AddExercicioAoTreinoUseCase;
  removeExercicioDoTreino: RemoveExercicioDoTreinoUseCase;
  reordenarExercicios: ReordenarExerciciosUseCase;
  listExercises: ListExercisesUseCase;
  logger: AppLogger;
}

export interface TreinoDetailControllerState {
  treino: TreinoPrimitives;
  treinoExercicios: TreinoExercicioPrimitives[];
  availableExercises: ExercisePrimitives[];
  exercisesById: Map<string, ExercisePrimitives>;
  errorMessage: string | null;
  feedbackMessage: string | null;
  onAddExercicio: (exercicioId: string) => Promise<void>;
  onRemoveExercicio: (treinoExercicioId: string) => Promise<void>;
  onMoveUp: (treinoExercicioId: string) => Promise<void>;
  onMoveDown: (treinoExercicioId: string) => Promise<void>;
  onBack: () => void;
}

export function useTreinoDetailController(
  treino: TreinoPrimitives,
  dependencies: TreinoDetailControllerDependencies,
  onBack: () => void
): TreinoDetailControllerState {
  const [treinoExercicios, setTreinoExercicios] = useState<TreinoExercicioPrimitives[]>([]);
  const [availableExercises, setAvailableExercises] = useState<ExercisePrimitives[]>([]);
  const [exercisesById, setExercisesById] = useState<Map<string, ExercisePrimitives>>(new Map());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [exercicios, exercises] = await Promise.all([
        dependencies.listTreinoExercicios.execute(treino.id),
        dependencies.listExercises.execute(),
      ]);

      startTransition(() => {
        setTreinoExercicios(exercicios);
        setAvailableExercises(exercises);
        setExercisesById(new Map(exercises.map((e) => [e.id, e])));
      });
    } catch (error) {
      dependencies.logger.error('treino_detail.load_failed', error);
      setErrorMessage('Nao foi possivel carregar os dados do treino.');
    }
  };

  useEffect(() => {
    void loadData();
  }, [treino.id]);

  const onAddExercicio = async (exercicioId: string) => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      await dependencies.addExercicioAoTreino.execute({ treinoId: treino.id, exercicioId });
      await loadData();
    } catch (error) {
      dependencies.logger.error('treino_detail.add_exercicio_failed', error, { exercicioId });

      if (error instanceof ExercicioJaNoTreinoError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel adicionar o exercicio.');
      }
    }
  };

  const onRemoveExercicio = async (treinoExercicioId: string) => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      await dependencies.removeExercicioDoTreino.execute(treinoExercicioId);
      await loadData();
    } catch (error) {
      dependencies.logger.error('treino_detail.remove_exercicio_failed', error, { treinoExercicioId });
      setErrorMessage('Nao foi possivel remover o exercicio.');
    }
  };

  const reorder = async (newIds: string[]) => {
    try {
      await dependencies.reordenarExercicios.execute({
        treinoId: treino.id,
        treinoExercicioIds: newIds,
      });
      await loadData();
    } catch (error) {
      dependencies.logger.error('treino_detail.reorder_failed', error);
      setErrorMessage('Nao foi possivel reordenar os exercicios.');
    }
  };

  const onMoveUp = async (treinoExercicioId: string) => {
    const sorted = [...treinoExercicios].sort((a, b) => a.ordem - b.ordem);
    const index = sorted.findIndex((te) => te.id === treinoExercicioId);
    if (index <= 0) return;

    const newIds = sorted.map((te) => te.id);
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    await reorder(newIds);
  };

  const onMoveDown = async (treinoExercicioId: string) => {
    const sorted = [...treinoExercicios].sort((a, b) => a.ordem - b.ordem);
    const index = sorted.findIndex((te) => te.id === treinoExercicioId);
    if (index < 0 || index >= sorted.length - 1) return;

    const newIds = sorted.map((te) => te.id);
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    await reorder(newIds);
  };

  return {
    treino,
    treinoExercicios,
    availableExercises,
    exercisesById,
    errorMessage,
    feedbackMessage,
    onAddExercicio,
    onRemoveExercicio,
    onMoveUp,
    onMoveDown,
    onBack,
  };
}
