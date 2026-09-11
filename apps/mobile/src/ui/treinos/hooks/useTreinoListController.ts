import { startTransition, useEffect, useState } from 'react';

import { DuplicateTreinoError } from '../../../application/treinos/errors/DuplicateTreinoError';
import type { CreateTreinoUseCase } from '../../../application/treinos/use-cases/CreateTreinoUseCase';
import type { DeleteTreinoUseCase } from '../../../application/treinos/use-cases/DeleteTreinoUseCase';
import type { DuplicarTreinoUseCase } from '../../../application/treinos/use-cases/DuplicarTreinoUseCase';
import type { ListTreinosUseCase } from '../../../application/treinos/use-cases/ListTreinosUseCase';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { TreinoValidationError } from '../../../domain/treinos/errors/TreinoValidationError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';

export interface TreinoDraft {
  name: string;
  objetivo: string;
}

export interface TreinoListControllerDependencies {
  createTreino: CreateTreinoUseCase;
  listTreinos: ListTreinosUseCase;
  deleteTreino: DeleteTreinoUseCase;
  duplicarTreino: DuplicarTreinoUseCase;
  countExerciciosByTreino: () => Promise<Record<string, number>>;
  logger: AppLogger;
}

export interface TreinoListControllerState {
  draft: TreinoDraft;
  treinos: TreinoPrimitives[];
  treinosVazios: Set<string>;
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
  reload: () => Promise<void>;
}

const initialDraft: TreinoDraft = { name: '', objetivo: '' };

export function useTreinoListController(
  dependencies: TreinoListControllerDependencies,
  onSelectTreino: (treino: TreinoPrimitives) => void,
  onAfterMutation?: () => Promise<void>,
): TreinoListControllerState {
  const locale = useLocale();
  const [draft, setDraft] = useState<TreinoDraft>(initialDraft);
  const [treinos, setTreinos] = useState<TreinoPrimitives[]>([]);
  const [treinosVazios, setTreinosVazios] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicandoId, setDuplicandoId] = useState<string | null>(null);

  const loadTreinos = async () => {
    try {
      const [result, counts] = await Promise.all([
        dependencies.listTreinos.execute(),
        dependencies.countExerciciosByTreino(),
      ]);
      startTransition(() => {
        setTreinos(result);
        setTreinosVazios(new Set(result.filter((t) => !counts[t.id]).map((t) => t.id)));
      });
    } catch (error) {
      dependencies.logger.error('treino_list.load_failed', error);
      setErrorMessage(translate(locale, 'treinos.list.errors.load'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTreinos();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTreinos é recriada a cada render; este efeito é só de montagem (roda 1x)
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

      if (error instanceof TreinoValidationError || error instanceof DuplicateTreinoError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(translate(locale, 'treinos.list.errors.create'));
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
      setFeedbackMessage(translate(locale, 'treinos.list.feedback.excluido'));
      await loadTreinos();
      await onAfterMutation?.();
    } catch (error) {
      dependencies.logger.error('treino_list.delete_failed', error, { id });
      setErrorMessage(translate(locale, 'treinos.list.errors.delete'));
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
      await onAfterMutation?.();
      onSelectTreino(copia);
    } catch (error) {
      dependencies.logger.error('treino_list.duplicate_failed', error, { id });
      setErrorMessage(translate(locale, 'treinos.list.errors.duplicate'));
    } finally {
      setDuplicandoId(null);
    }
  };

  return {
    draft,
    treinos,
    treinosVazios,
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
    reload: loadTreinos,
  };
}
