import { startTransition, useEffect, useState } from 'react';

import type { MetodoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import type { AddExercicioAoTreinoUseCase } from '../../../application/treinos/use-cases/AddExercicioAoTreinoUseCase';
import type { BaixarMidiasTreinoUseCase, ProgressoBaixarMidias } from '../../../application/exercises/use-cases/BaixarMidiasTreinoUseCase';
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
  updateMetodoGrupo: (id: string, metodo: MetodoExercicio, grupoId: string | null) => Promise<void>;
  baixarMidiasTreino: BaixarMidiasTreinoUseCase;
  listAlternativas: (exercicioId: string) => Promise<ExercisePrimitives[]>;
  addAlternativa: (exercicioId: string, alternativaId: string) => Promise<void>;
  removeAlternativa: (exercicioId: string, alternativaId: string) => Promise<void>;
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
  onMoveUpInGroup: (treinoExercicioId: string) => Promise<void>;
  onMoveDownInGroup: (treinoExercicioId: string) => Promise<void>;
  onUpdateRecomendacoes: (treinoExercicioId: string, series: number | null, execucoes: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null) => Promise<void>;
  onUpdateMetodoGrupo: (treinoExercicioId: string, metodo: MetodoExercicio, grupoId: string | null) => Promise<void>;
  onUpdateNome: (novoNome: string) => Promise<void>;
  onUpdateObjetivo: (novoObjetivo: string | null) => Promise<void>;
  progressoBaixarMidias: ProgressoBaixarMidias | null;
  onBaixarMidias: () => Promise<void>;
  alternativasByExercicioId: Map<string, ExercisePrimitives[]>;
  onAddAlternativa: (exercicioId: string, alternativaId: string) => Promise<void>;
  onRemoveAlternativa: (exercicioId: string, alternativaId: string) => Promise<void>;
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
  const [alternativasByExercicioId, setAlternativasByExercicioId] = useState<Map<string, ExercisePrimitives[]>>(new Map());

  const loadData = async () => {
    try {
      const [exercicios, exercises] = await Promise.all([
        dependencies.listTreinoExercicios.execute(treino.id),
        dependencies.listExercises.execute(),
      ]);

      const alternativasEntries = await Promise.all(
        exercicios.map(async (te) => {
          const alts = await dependencies.listAlternativas(te.exercicioId);
          return [te.exercicioId, alts] as const;
        })
      );

      startTransition(() => {
        setTreinoExercicios(exercicios);
        setAvailableExercises(exercises);
        setExercisesById(new Map(exercises.map((e) => [e.id, e])));
        setAlternativasByExercicioId(new Map(alternativasEntries));
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

  // Builds ordered blocks: grouped exercises with the same grupoId form a single block.
  function buildBlocks(sorted: TreinoExercicioPrimitives[]): TreinoExercicioPrimitives[][] {
    const blocks: TreinoExercicioPrimitives[][] = [];
    for (const te of sorted) {
      if (te.grupoId) {
        const last = blocks[blocks.length - 1];
        if (last && last[0].grupoId === te.grupoId) {
          last.push(te);
          continue;
        }
      }
      blocks.push([te]);
    }
    return blocks;
  }

  const onMoveUp = async (treinoExercicioId: string) => {
    const sorted = [...treinoExercicios].sort((a, b) => a.ordem - b.ordem);
    const blocks = buildBlocks(sorted);
    const blockIdx = blocks.findIndex((b) => b.some((te) => te.id === treinoExercicioId));
    if (blockIdx <= 0) return;
    const moved = [...blocks];
    [moved[blockIdx - 1], moved[blockIdx]] = [moved[blockIdx], moved[blockIdx - 1]];
    await reorder(moved.flat().map((te) => te.id));
  };

  const onMoveDown = async (treinoExercicioId: string) => {
    const sorted = [...treinoExercicios].sort((a, b) => a.ordem - b.ordem);
    const blocks = buildBlocks(sorted);
    const blockIdx = blocks.findIndex((b) => b.some((te) => te.id === treinoExercicioId));
    if (blockIdx < 0 || blockIdx >= blocks.length - 1) return;
    const moved = [...blocks];
    [moved[blockIdx], moved[blockIdx + 1]] = [moved[blockIdx + 1], moved[blockIdx]];
    await reorder(moved.flat().map((te) => te.id));
  };

  const onMoveUpInGroup = async (treinoExercicioId: string) => {
    const sorted = [...treinoExercicios].sort((a, b) => a.ordem - b.ordem);
    const te = sorted.find((x) => x.id === treinoExercicioId);
    if (!te?.grupoId) return;
    const members = sorted.filter((x) => x.grupoId === te.grupoId);
    const idxInGroup = members.findIndex((x) => x.id === treinoExercicioId);
    if (idxInGroup <= 0) return;
    const prev = members[idxInGroup - 1];
    const newIds = sorted.map((x) => x.id);
    const iA = sorted.findIndex((x) => x.id === prev.id);
    const iB = sorted.findIndex((x) => x.id === treinoExercicioId);
    [newIds[iA], newIds[iB]] = [newIds[iB], newIds[iA]];
    await reorder(newIds);
  };

  const onMoveDownInGroup = async (treinoExercicioId: string) => {
    const sorted = [...treinoExercicios].sort((a, b) => a.ordem - b.ordem);
    const te = sorted.find((x) => x.id === treinoExercicioId);
    if (!te?.grupoId) return;
    const members = sorted.filter((x) => x.grupoId === te.grupoId);
    const idxInGroup = members.findIndex((x) => x.id === treinoExercicioId);
    if (idxInGroup >= members.length - 1) return;
    const next = members[idxInGroup + 1];
    const newIds = sorted.map((x) => x.id);
    const iA = sorted.findIndex((x) => x.id === treinoExercicioId);
    const iB = sorted.findIndex((x) => x.id === next.id);
    [newIds[iA], newIds[iB]] = [newIds[iB], newIds[iA]];
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

  const onUpdateMetodoGrupo = async (treinoExercicioId: string, metodo: MetodoExercicio, grupoId: string | null) => {
    try {
      await dependencies.updateMetodoGrupo(treinoExercicioId, metodo, grupoId);
      setTreinoExercicios((prev) =>
        prev.map((te) => te.id === treinoExercicioId ? { ...te, metodo, grupoId } : te)
      );
    } catch (error) {
      dependencies.logger.error('treino_detail.update_metodo_grupo_failed', error);
      setErrorMessage('Nao foi possivel atualizar o metodo.');
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

  const [progressoBaixarMidias, setProgressoBaixarMidias] = useState<ProgressoBaixarMidias | null>(null);

  const onBaixarMidias = async () => {
    setErrorMessage(null);
    setProgressoBaixarMidias({ total: 0, concluido: 0, nomeAtual: 'Preparando...' });
    try {
      const { baixados } = await dependencies.baixarMidiasTreino.execute(
        treino.id,
        (p) => setProgressoBaixarMidias(p)
      );
      setFeedbackMessage(baixados > 0 ? `${baixados} midia(s) baixada(s) com sucesso.` : 'Nenhuma midia nova para baixar.');
      await loadData();
    } catch (error) {
      dependencies.logger.error('treino_detail.baixar_midias_failed', error);
      setErrorMessage('Nao foi possivel baixar as midias.');
    } finally {
      setProgressoBaixarMidias(null);
    }
  };

  const onAddAlternativa = async (exercicioId: string, alternativaId: string) => {
    try {
      await dependencies.addAlternativa(exercicioId, alternativaId);
      const updated = await dependencies.listAlternativas(exercicioId);
      setAlternativasByExercicioId((prev) => new Map(prev).set(exercicioId, updated));
    } catch (error) {
      dependencies.logger.error('treino_detail.add_alternativa_failed', error);
    }
  };

  const onRemoveAlternativa = async (exercicioId: string, alternativaId: string) => {
    try {
      await dependencies.removeAlternativa(exercicioId, alternativaId);
      setAlternativasByExercicioId((prev) => {
        const next = new Map(prev);
        next.set(exercicioId, (next.get(exercicioId) ?? []).filter((a) => a.id !== alternativaId));
        return next;
      });
    } catch (error) {
      dependencies.logger.error('treino_detail.remove_alternativa_failed', error);
    }
  };

  const onUpdateObjetivo = async (novoObjetivo: string | null) => {
    setErrorMessage(null);
    try {
      const updated = await dependencies.updateTreino.execute({
        id: treino.id,
        name: localTreino.name,
        objetivo: novoObjetivo,
      });
      setLocalTreino(updated);
    } catch (error) {
      dependencies.logger.error('treino_detail.update_objetivo_failed', error);
      setErrorMessage('Nao foi possivel atualizar o objetivo.');
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
    onMoveUpInGroup,
    onMoveDownInGroup,
    onUpdateRecomendacoes,
    onUpdateMetodoGrupo,
    onUpdateNome,
    onUpdateObjetivo,
    progressoBaixarMidias,
    onBaixarMidias,
    alternativasByExercicioId,
    onAddAlternativa,
    onRemoveAlternativa,
    onBack,
  };
}
