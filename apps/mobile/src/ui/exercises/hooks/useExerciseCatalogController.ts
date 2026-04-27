import { startTransition, useEffect, useState } from 'react';

import { DuplicateExerciseError } from '../../../application/exercises/errors/DuplicateExerciseError';
import type { CreateExerciseUseCase } from '../../../application/exercises/use-cases/CreateExerciseUseCase';
import type { ListExercisesUseCase } from '../../../application/exercises/use-cases/ListExercisesUseCase';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { ExerciseValidationError } from '../../../domain/exercises/errors/ExerciseValidationError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

export interface ExerciseDraft {
  name: string;
  groupMuscle: string;
  category: string;
  equipment: string;
}

export interface ExerciseCatalogControllerDependencies {
  createExercise: CreateExerciseUseCase;
  listExercises: ListExercisesUseCase;
  logger: AppLogger;
}

export interface ExerciseCatalogControllerState {
  draft: ExerciseDraft;
  exercises: ExercisePrimitives[];
  errorMessage: string | null;
  feedbackMessage: string | null;
  isSubmitting: boolean;
  onChangeField: (field: keyof ExerciseDraft, value: string) => void;
  onSubmit: () => Promise<void>;
}

const initialDraft: ExerciseDraft = {
  name: '',
  groupMuscle: '',
  category: '',
  equipment: '',
};

export function useExerciseCatalogController(
  dependencies: ExerciseCatalogControllerDependencies
): ExerciseCatalogControllerState {
  const [draft, setDraft] = useState<ExerciseDraft>(initialDraft);
  const [exercises, setExercises] = useState<ExercisePrimitives[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyExercises = (nextExercises: ExercisePrimitives[]) => {
    startTransition(() => {
      setExercises(nextExercises);
    });
  };

  const loadExercises = async () => {
    try {
      const currentExercises = await dependencies.listExercises.execute();
      applyExercises(currentExercises);
    } catch (error) {
      dependencies.logger.error('exercise_catalog.load_failed', error);
      setErrorMessage('Nao foi possivel carregar os exercicios.');
    }
  };

  useEffect(() => {
    void loadExercises();
  }, []);

  const onChangeField = (field: keyof ExerciseDraft, value: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage(null);
    }

    if (feedbackMessage) {
      setFeedbackMessage(null);
    }
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const createdExercise = await dependencies.createExercise.execute(draft);

      setDraft(initialDraft);
      setFeedbackMessage(`"${createdExercise.name}" salvo com sucesso.`);
      await loadExercises();
    } catch (error) {
      dependencies.logger.error('exercise_catalog.create_failed', error, {
        draft,
      });

      if (error instanceof ExerciseValidationError || error instanceof DuplicateExerciseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel salvar o exercicio.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    draft,
    exercises,
    errorMessage,
    feedbackMessage,
    isSubmitting,
    onChangeField,
    onSubmit,
  };
}
