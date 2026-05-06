import { startTransition, useEffect, useState } from 'react';

import type { AddExercicioAoTreinoUseCase } from '../../../application/treinos/use-cases/AddExercicioAoTreinoUseCase';
import type { ListTreinoExerciciosUseCase } from '../../../application/treinos/use-cases/ListTreinoExerciciosUseCase';
import type { RemoveExercicioDoTreinoUseCase } from '../../../application/treinos/use-cases/RemoveExercicioDoTreinoUseCase';
import type { ReordenarExerciciosUseCase } from '../../../application/treinos/use-cases/ReordenarExerciciosUseCase';
import type { UpdateTreinoUseCase } from '../../../application/treinos/use-cases/UpdateTreinoUseCase';
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
  updateTreino: UpdateTreinoUseCase;
  listExercises: ListExercisesUseCase;
  updateRecomendacoes: (id: string, series: number | null, execucoes: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null) => Promise<void>;
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
  onAddMultiplosExercicios: (exercicioIds: string[]) => Promise<void>;
  onRemoveExercicio: (treinoExercicioId: string) => Promise<void>;
  onMoveUp: (treinoExercicioId: string) => Promise<void>;
  onMoveDown: (treinoExercicioId: string) => Promise<void>;
  onUpdateRecomendacoes: (treinoExercicioId: string, series: number | null, execucoes: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null) => Promise<void>;
  onUpdateNome: (novoNome: string) => Promise<void>;
  onBack: () => void;
}

export function useTreinoDetailController(
  treino: TreinoPrimitives,
  dependencies: TreinoDetailControllerDependencies,
  onBack: () => void
): TreinoDetailControllerState {
  const [localTreino, setLocalTreino] = useState<TreinoPrimitives>(treino);
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
      const newTe = await dependencies.addExercicioAoTreino.execute({ treinoId: treino.id, exercicioId });
      // Optimistic update to avoid scroll jump
      setTreinoExercicios((prev) => [...prev, newTe]);
      setAvailableExercises((prev) => prev.filter((e) => e.id !== exercicioId));
    } catch (error) {
      dependencies.logger.error('treino_detail.add_exercicio_failed', error, { exercicioId });

      if (error instanceof ExercicioJaNoTreinoError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel adicionar o exercicio.');
      }
    }
  };

  const onAddMultiplosExercicios = async (exercicioIds: string[]) => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    const novos: TreinoExercicioPrimitives[] = [];
    const addedIds = new Set<string>();

    for (const exercicioId of exercicioIds) {
      try {
        const newTe = await dependencies.addExercicioAoTreino.execute({ treinoId: treino.id, exercicioId });
        novos.push(newTe);
        addedIds.add(exercicioId);
      } catch (error) {
        dependencies.logger.error('treino_detail.add_exercicio_failed', error, { exercicioId });
        if (error instanceof ExercicioJaNoTreinoError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Nao foi possivel adicionar alguns exercicios.');
        }
      }
    }

    if (novos.length > 0) {
      setTreinoExercicios((prev) => [...prev, ...novos]);
      setAvailableExercises((prev) => prev.filter((e) => !addedIds.has(e.id)));
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

  const onUpdateRecomendacoes = async (treinoExercicioId: string, series: number | null, execucoes: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null) => {
    try {
      await dependencies.updateRecomendacoes(treinoExercicioId, series, execucoes, cargaPadrao, tempoDescansoSegundos);
      setTreinoExercicios((prev) =>
        prev.map((te) =>
          te.id === treinoExercicioId
            ? { ...te, seriesRecomendadas: series, execucoesRecomendadas: execucoes, cargaPadrao, tempoDescansoSegundos }
            : te
        )
      );
    } catch (error) {
      dependencies.logger.error('treino_detail.update_recomendacoes_failed', error);
      setErrorMessage('Nao foi possivel atualizar as recomendacoes.');
    }
  };

  const onUpdateNome = async (novoNome: string) => {
    setErrorMessage(null);
    try {
      const updated = await dependencies.updateTreino.execute({
        id: treino.id,
        name: novoNome,
        objetivo: localTreino.objetivo,
      });
      setLocalTreino(updated);
    } catch (error) {
      dependencies.logger.error('treino_detail.update_nome_failed', error);
      setErrorMessage('Nao foi possivel renomear o treino.');
    }
  };

  return {
    treino: localTreino,
    treinoExercicios,
    availableExercises,
    exercisesById,
    errorMessage,
    feedbackMessage,
    onAddExercicio,
    onAddMultiplosExercicios,
    onRemoveExercicio,
    onMoveUp,
    onMoveDown,
    onUpdateRecomendacoes,
    onUpdateNome,
    onBack,
  };
}
