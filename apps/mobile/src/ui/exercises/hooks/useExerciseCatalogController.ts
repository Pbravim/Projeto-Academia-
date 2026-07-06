import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { File, Paths } from 'expo-file-system';

import { DuplicateExerciseError } from '../../../application/exercises/errors/DuplicateExerciseError';
import { ExerciseNotFoundError } from '../../../application/exercises/errors/ExerciseNotFoundError';
import type { CreateExerciseUseCase } from '../../../application/exercises/use-cases/CreateExerciseUseCase';
import type { DeleteExerciseUseCase } from '../../../application/exercises/use-cases/DeleteExerciseUseCase';
import type { ListExercisesUseCase } from '../../../application/exercises/use-cases/ListExercisesUseCase';
import type { UpdateExerciseUseCase } from '../../../application/exercises/use-cases/UpdateExerciseUseCase';
import type { GetUltimasExecucoesValidasUseCase } from '../../../application/historico/use-cases/GetUltimasExecucoesValidasUseCase';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { ExerciseValidationError } from '../../../domain/exercises/errors/ExerciseValidationError';
import type { UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';

export interface ExerciseDraft {
  name: string;
  groupMuscle: string;
  category: string;
  equipment: string;
  mediaOnline: string;
  mediaLocal: string | null;
  musculoAlvo: string;
  movementPattern: string;
  executionType: string;
  primaryEquipment: string;
  secondaryEquipment: string;
}

export interface ExerciseCatalogControllerDependencies {
  createExercise: CreateExerciseUseCase;
  updateExercise: UpdateExerciseUseCase;
  deleteExercise: DeleteExerciseUseCase;
  listExercises: ListExercisesUseCase;
  getUltimasExecucoesValidas: GetUltimasExecucoesValidasUseCase;
  exerciseRepository: ExerciseRepository;
  logger: AppLogger;
}

export interface ExerciseCatalogControllerState {
  draft: ExerciseDraft;
  exercises: ExercisePrimitives[];
  ultimosPesos: Map<string, UltimaExecucaoValida>;
  alternativas: ExercisePrimitives[];
  errorMessage: string | null;
  feedbackMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  deletingId: string | null;
  editingExerciseId: string | null;
  onChangeField: (field: keyof ExerciseDraft, value: string) => void;
  onChangeMediaLocal: (value: string | null) => void;
  onSubmit: () => Promise<void>;
  onSelectEdit: (exercise: ExercisePrimitives) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => Promise<void>;
  onAddAlternativa: (alternativaId: string) => Promise<void>;
  onRemoveAlternativa: (alternativaId: string) => Promise<void>;
  onViewHistorico: (exerciseId: string, exerciseName: string) => void;
}

const initialDraft: ExerciseDraft = {
  name: '',
  groupMuscle: '',
  category: '',
  equipment: '',
  mediaOnline: '',
  mediaLocal: null,
  musculoAlvo: '',
  movementPattern: '',
  executionType: '',
  primaryEquipment: '',
  secondaryEquipment: '',
};

export function useExerciseCatalogController(
  dependencies: ExerciseCatalogControllerDependencies,
  onViewHistorico: (exerciseId: string, exerciseName: string) => void
): ExerciseCatalogControllerState {
  const locale = useLocale();
  const [draft, setDraft] = useState<ExerciseDraft>(initialDraft);
  const [exercises, setExercises] = useState<ExercisePrimitives[]>([]);
  const [ultimosPesos, setUltimosPesos] = useState<Map<string, UltimaExecucaoValida>>(new Map());
  const [alternativas, setAlternativas] = useState<ExercisePrimitives[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  const showFeedback = useCallback((message: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedbackMessage(message);
    feedbackTimer.current = setTimeout(() => setFeedbackMessage(null), 2000);
  }, []);

  const applyExercises = (nextExercises: ExercisePrimitives[]) => {
    startTransition(() => {
      setExercises(nextExercises);
    });
  };

  const loadExercises = async () => {
    try {
      const [currentExercises, pesosMap] = await Promise.all([
        dependencies.listExercises.execute(),
        dependencies.getUltimasExecucoesValidas.execute(),
      ]);
      startTransition(() => {
        applyExercises(currentExercises);
        setUltimosPesos(pesosMap);
      });
    } catch (error) {
      dependencies.logger.error('exercise_catalog.load_failed', error);
      setErrorMessage(translate(locale, 'exercises.errors.load'));
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
      groupMuscle: exercise.groupMuscles.join(', '),
      category: exercise.category,
      equipment: exercise.equipment ?? '',
      mediaOnline: exercise.mediaOnline ?? '',
      mediaLocal: exercise.mediaLocal ?? null,
      musculoAlvo: exercise.musculoAlvo.join(', '),
      movementPattern: exercise.movementPattern ?? '',
      executionType: exercise.executionType ?? '',
      primaryEquipment: exercise.primaryEquipment ?? '',
      secondaryEquipment: exercise.secondaryEquipment ?? '',
    });
    setErrorMessage(null);
    setFeedbackMessage(null);
    void dependencies.exerciseRepository.listAlternativas(exercise.id).then((exs) => {
      setAlternativas(exs.map((e) => e.toPrimitives()));
    });
  };

  const onCancelEdit = () => {
    setEditingExerciseId(null);
    setDraft(initialDraft);
    setAlternativas([]);
    setErrorMessage(null);
    setFeedbackMessage(null);
  };

  const onAddAlternativa = async (alternativaId: string) => {
    if (!editingExerciseId) return;
    await dependencies.exerciseRepository.addAlternativa(editingExerciseId, alternativaId);
    const updated = await dependencies.exerciseRepository.listAlternativas(editingExerciseId);
    setAlternativas(updated.map((e) => e.toPrimitives()));
  };

  const onRemoveAlternativa = async (alternativaId: string) => {
    if (!editingExerciseId) return;
    await dependencies.exerciseRepository.removeAlternativa(editingExerciseId, alternativaId);
    setAlternativas((prev) => prev.filter((e) => e.id !== alternativaId));
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    // '__outro__' é sentinela do ChipPicker (clicou "Outro" mas não digitou nada).
    // Tratado como vazio para acionar a validação do domínio corretamente.
    const stripOutro = (value: string) => (value === '__outro__' ? '' : value);
    const toListOrUndefined = (value: string) => {
      const items = value.split(',').map((s) => s.trim()).filter(Boolean);
      return items.length > 0 ? items : undefined;
    };
    const executionType = stripOutro(draft.executionType);

    // O draft mantém groupMuscle como string com vírgulas (formato do multi-select);
    // o domínio recebe o array.
    const { groupMuscle: groupMuscleDraft, ...draftRest } = draft;
    const cleanDraft = {
      ...draftRest,
      groupMuscles: toListOrUndefined(groupMuscleDraft) ?? [],
      category: stripOutro(draft.category),
      equipment: stripOutro(draft.equipment),
      mediaOnline: draft.mediaOnline.trim() || undefined,
      mediaLocal: draft.mediaLocal ?? undefined,
      musculoAlvo: toListOrUndefined(draft.musculoAlvo),
      movementPattern: stripOutro(draft.movementPattern) || undefined,
      primaryEquipment: stripOutro(draft.primaryEquipment) || undefined,
      secondaryEquipment: stripOutro(draft.secondaryEquipment) || undefined,
      executionType: (executionType || undefined) as 'Unilateral' | 'Bilateral' | 'Can Be Both' | undefined,
    };

    try {
      if (editingExerciseId) {
        const updated = await dependencies.updateExercise.execute({
          id: editingExerciseId,
          ...cleanDraft,
        });
        startTransition(() => {
          setExercises((prev) => prev.map((e) => e.id === updated.id ? updated : e));
        });
        setEditingExerciseId(null);
        setDraft(initialDraft);
        showFeedback(translate(locale, 'exercises.feedback.updated', { nome: updated.name }));
      } else {
        const created = await dependencies.createExercise.execute(cleanDraft);

        // Se o usuário selecionou um arquivo local antes de criar o exercício,
        // ele foi salvo com caminho temporário (tmp_). Agora que temos o ID real,
        // movemos para o caminho canônico e atualizamos o banco.
        if (cleanDraft.mediaLocal && cleanDraft.mediaLocal.includes('tmp_')) {
          try {
            const ext = cleanDraft.mediaLocal.split('.').pop() ?? 'mp4';
            const srcFile = new File(cleanDraft.mediaLocal);
            const destFile = new File(Paths.document, 'exercises', `${created.id}.${ext}`);
            srcFile.move(destFile);
            await dependencies.exerciseRepository.updateMedia(created.id, created.mediaOnline, destFile.uri);
          } catch {
            // Falha silenciosa — o arquivo tmp ainda funciona enquanto existir
          }
        }

        startTransition(() => {
          setExercises((prev) => [created, ...prev]);
        });
        setDraft(initialDraft);
        showFeedback(translate(locale, 'exercises.feedback.created', { nome: created.name }));
      }
    } catch (error) {
      dependencies.logger.error('exercise_catalog.submit_failed', error, { draft });

      if (
        error instanceof ExerciseValidationError ||
        error instanceof DuplicateExerciseError ||
        error instanceof ExerciseNotFoundError
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(translate(locale, 'exercises.errors.save'));
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
      await dependencies.deleteExercise.execute(id);
      showFeedback(translate(locale, 'exercises.feedback.deleted'));

      startTransition(() => {
        setExercises((prev) => prev.filter((e) => e.id !== id));
      });

      if (editingExerciseId === id) {
        setEditingExerciseId(null);
        setDraft(initialDraft);
      }
    } catch (error) {
      dependencies.logger.error('exercise_catalog.delete_failed', error, { id });
      setErrorMessage(translate(locale, 'exercises.errors.delete'));
    } finally {
      setDeletingId(null);
    }
  };

  return {
    draft,
    exercises,
    ultimosPesos,
    alternativas,
    errorMessage,
    feedbackMessage,
    isLoading,
    isSubmitting,
    deletingId,
    editingExerciseId,
    onChangeField,
    onChangeMediaLocal: (value: string | null) => setDraft((d) => ({ ...d, mediaLocal: value })),
    onSubmit,
    onSelectEdit,
    onCancelEdit,
    onDelete,
    onAddAlternativa,
    onRemoveAlternativa,
    onViewHistorico,
  };
}
