import { startTransition, useEffect, useState } from 'react';

import type { CreateTreinoUseCase } from '../../../application/treinos/use-cases/CreateTreinoUseCase';
import type { DeleteTreinoUseCase } from '../../../application/treinos/use-cases/DeleteTreinoUseCase';
import type { DuplicarTreinoUseCase } from '../../../application/treinos/use-cases/DuplicarTreinoUseCase';
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
  duplicarTreino: DuplicarTreinoUseCase;
  logger: AppLogger;
}

export interface TreinoListControllerState {
  draft: TreinoDraft;
  treinos: TreinoPrimitives[];
  errorMessage: string | null;
  feedbackMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  deletingId: string | null;
  duplicandoId: string | null;
  onChangeField: (field: keyof TreinoDraft, value: string) => void;
  onSubmit: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicandoId, setDuplicandoId] = useState<string | null>(null);

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
      await loadTreinos();
      onSelectTreino(created);
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
    if (deletingId) return;
    setDeletingId(id);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      await dependencies.deleteTreino.execute(id);
      setFeedbackMessage('Treino excluido com sucesso.');
      await loadTreinos();
    } catch (error) {
      dependencies.logger.error('treino_list.delete_failed', error, { id });
      setErrorMessage('Nao foi possivel excluir o treino.');
    } finally {
      setDeletingId(null);
    }
  };

  const onDuplicate = async (id: string) => {
    if (duplicandoId) return;
    setDuplicandoId(id);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const copia = await dependencies.duplicarTreino.execute(id);
      await loadTreinos();
      onSelectTreino(copia);
    } catch (error) {
      dependencies.logger.error('treino_list.duplicate_failed', error, { id });
      setErrorMessage('Nao foi possivel duplicar o treino.');
    } finally {
      setDuplicandoId(null);
    }
  };

  return {
    draft,
    treinos,
    errorMessage,
    feedbackMessage,
    isLoading,
    isSubmitting,
    deletingId,
    duplicandoId,
    onChangeField,
    onSubmit,
    onDelete,
    onDuplicate,
    onSelectTreino,
  };
}
