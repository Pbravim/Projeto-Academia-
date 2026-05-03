import { startTransition, useEffect, useState } from 'react';

import type { CreateTreinoUseCase } from '../../../application/treinos/use-cases/CreateTreinoUseCase';
import type { DeleteTreinoUseCase } from '../../../application/treinos/use-cases/DeleteTreinoUseCase';
import type { ListTreinosUseCase } from '../../../application/treinos/use-cases/ListTreinosUseCase';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { TreinoValidationError } from '../../../domain/treinos/errors/TreinoValidationError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

export interface TreinoDraft {
  name: string;
  objetivo: string;
}

export interface TreinoListControllerDependencies {
  createTreino: CreateTreinoUseCase;
  listTreinos: ListTreinosUseCase;
  deleteTreino: DeleteTreinoUseCase;
  logger: AppLogger;
}

export interface TreinoListControllerState {
  draft: TreinoDraft;
  treinos: TreinoPrimitives[];
  errorMessage: string | null;
  feedbackMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onChangeField: (field: keyof TreinoDraft, value: string) => void;
  onSubmit: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelectTreino: (treino: TreinoPrimitives) => void;
}

const initialDraft: TreinoDraft = { name: '', objetivo: '' };

export function useTreinoListController(
  dependencies: TreinoListControllerDependencies,
  onSelectTreino: (treino: TreinoPrimitives) => void
): TreinoListControllerState {
  const [draft, setDraft] = useState<TreinoDraft>(initialDraft);
  const [treinos, setTreinos] = useState<TreinoPrimitives[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTreinos = async () => {
    try {
      const result = await dependencies.listTreinos.execute();
      startTransition(() => setTreinos(result));
    } catch (error) {
      dependencies.logger.error('treino_list.load_failed', error);
      setErrorMessage('Nao foi possivel carregar os treinos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTreinos();
  }, []);

  const onChangeField = (field: keyof TreinoDraft, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    if (errorMessage) setErrorMessage(null);
    if (feedbackMessage) setFeedbackMessage(null);
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const created = await dependencies.createTreino.execute({
        name: draft.name,
        objetivo: draft.objetivo || undefined,
      });
      setDraft(initialDraft);
      setFeedbackMessage(`"${created.name}" criado com sucesso.`);
      await loadTreinos();
    } catch (error) {
      dependencies.logger.error('treino_list.create_failed', error, { draft });

      if (error instanceof TreinoValidationError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel criar o treino.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      await dependencies.deleteTreino.execute(id);
      setFeedbackMessage('Treino excluido com sucesso.');
      await loadTreinos();
    } catch (error) {
      dependencies.logger.error('treino_list.delete_failed', error, { id });
      setErrorMessage('Nao foi possivel excluir o treino.');
    }
  };

  return {
    draft,
    treinos,
    errorMessage,
    feedbackMessage,
    isLoading,
    isSubmitting,
    onChangeField,
    onSubmit,
    onDelete,
    onSelectTreino,
  };
}
