import { startTransition, useEffect, useState } from 'react';

import { DuplicateExerciseError } from '../../../application/exercises/errors/DuplicateExerciseError';
import { ExerciseNotFoundError } from '../../../application/exercises/errors/ExerciseNotFoundError';
import type { CreateExerciseUseCase } from '../../../application/exercises/use-cases/CreateExerciseUseCase';
import type { DeleteExerciseUseCase } from '../../../application/exercises/use-cases/DeleteExerciseUseCase';
import type { ListExercisesUseCase } from '../../../application/exercises/use-cases/ListExercisesUseCase';
import type { UpdateExerciseUseCase } from '../../../application/exercises/use-cases/UpdateExerciseUseCase';
import type { GetUltimaExecucaoValidaUseCase } from '../../../application/historico/use-cases/GetUltimaExecucaoValidaUseCase';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { ExerciseValidationError } from '../../../domain/exercises/errors/ExerciseValidationError';
import type { UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

export interface ExerciseDraft {
  name: string;
  groupMuscle: string;
  category: string;
  equipment: string;
}

export interface ExerciseCatalogControllerDependencies {
  createExercise: CreateExerciseUseCase;
  updateExercise: UpdateExerciseUseCase;
  deleteExercise: DeleteExerciseUseCase;
  listExercises: ListExercisesUseCase;
  getUltimaExecucaoValida: GetUltimaExecucaoValidaUseCase;
  logger: AppLogger;
}

export interface ExerciseCatalogControllerState {
  draft: ExerciseDraft;
  exercises: ExercisePrimitives[];
  ultimosPesos: Map<string, UltimaExecucaoValida>;
  errorMessage: string | null;
  feedbackMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  editingExerciseId: string | null;
  onChangeField: (field: keyof ExerciseDraft, value: string) => void;
  onSubmit: () => Promise<void>;
  onSelectEdit: (exercise: ExercisePrimitives) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => Promise<void>;
  onViewHistorico: (exerciseId: string, exerciseName: string) => void;
}

const initialDraft: ExerciseDraft = {
  name: '',
  groupMuscle: '',
  category: '',
  equipment: '',
};

export function useExerciseCatalogController(
  dependencies: ExerciseCatalogControllerDependencies,
  onViewHistorico: (exerciseId: string, exerciseName: string) => void
): ExerciseCatalogControllerState {
  const [draft, setDraft] = useState<ExerciseDraft>(initialDraft);
  const [exercises, setExercises] = useState<ExercisePrimitives[]>([]);
  const [ultimosPesos, setUltimosPesos] = useState<Map<string, UltimaExecucaoValida>>(new Map());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const applyExercises = (nextExercises: ExercisePrimitives[]) => {
    startTransition(() => {
      setExercises(nextExercises);
    });
  };

  const loadExercises = async () => {
    try {
      const currentExercises = await dependencies.listExercises.execute();
      applyExercises(currentExercises);

      const pesosMap = new Map<string, UltimaExecucaoValida>();
      await Promise.all(
        currentExercises.map(async (exercise) => {
          const ultima = await dependencies.getUltimaExecucaoValida.execute(exercise.id);
          if (ultima) pesosMap.set(exercise.id, ultima);
        })
      );
      startTransition(() => setUltimosPesos(pesosMap));
    } catch (error) {
      dependencies.logger.error('exercise_catalog.load_failed', error);
      setErrorMessage('Nao foi possivel carregar os exercicios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadExercises();
  }, []);

  const onChangeField = (field: keyof ExerciseDraft, value: string) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));

    if (errorMessage) setErrorMessage(null);
    if (feedbackMessage) setFeedbackMessage(null);
  };

  const onSelectEdit = (exercise: ExercisePrimitives) => {
    setEditingExerciseId(exercise.id);
    setDraft({
      name: exercise.name,
      groupMuscle: exercise.groupMuscle,
      category: exercise.category,
      equipment: exercise.equipment ?? '',
    });
    setErrorMessage(null);
    setFeedbackMessage(null);
  };

  const onCancelEdit = () => {
    setEditingExerciseId(null);
    setDraft(initialDraft);
    setErrorMessage(null);
    setFeedbackMessage(null);
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      if (editingExerciseId) {
        const updated = await dependencies.updateExercise.execute({
          id: editingExerciseId,
          ...draft,
        });
        setEditingExerciseId(null);
        setDraft(initialDraft);
        setFeedbackMessage(`"${updated.name}" atualizado com sucesso.`);
      } else {
        const created = await dependencies.createExercise.execute(draft);
        setDraft(initialDraft);
        setFeedbackMessage(`"${created.name}" salvo com sucesso.`);
      }

      await loadExercises();
    } catch (error) {
      dependencies.logger.error('exercise_catalog.submit_failed', error, { draft });

      if (
        error instanceof ExerciseValidationError ||
        error instanceof DuplicateExerciseError ||
        error instanceof ExerciseNotFoundError
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel salvar o exercicio.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      await dependencies.deleteExercise.execute(id);
      setFeedbackMessage('Exercicio excluido com sucesso.');

      if (editingExerciseId === id) {
        setEditingExerciseId(null);
        setDraft(initialDraft);
      }

      await loadExercises();
    } catch (error) {
      dependencies.logger.error('exercise_catalog.delete_failed', error, { id });
      setErrorMessage('Nao foi possivel excluir o exercicio.');
    }
  };

  return {
    draft,
    exercises,
    ultimosPesos,
    errorMessage,
    feedbackMessage,
    isLoading,
    isSubmitting,
    editingExerciseId,
    onChangeField,
    onSubmit,
    onSelectEdit,
    onCancelEdit,
    onDelete,
    onViewHistorico,
  };
}
