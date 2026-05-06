import { useCallback, useEffect, useState } from 'react';

import type { AddExercicioASessaoUseCase } from '../../../application/sessoes/use-cases/AddExercicioASessaoUseCase';
import type { CancelarSessaoUseCase } from '../../../application/sessoes/use-cases/CancelarSessaoUseCase';
import type { DeleteSerieUseCase } from '../../../application/sessoes/use-cases/DeleteSerieUseCase';
import type { FinalizarSessaoUseCase } from '../../../application/sessoes/use-cases/FinalizarSessaoUseCase';
import type { GetSessaoDetalheUseCase, SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { RegistrarSerieInput, RegistrarSerieUseCase } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { ToggleExercicioRealizadoUseCase } from '../../../application/sessoes/use-cases/ToggleExercicioRealizadoUseCase';
import type { SugestaoProgressao, SugerirProgressaoUseCase } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { ListExercisesUseCase } from '../../../application/exercises/use-cases/ListExercisesUseCase';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import { ExercicioJaNaSessaoError } from '../../../application/sessoes/errors/ExercicioJaNaSessaoError';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

export interface SessaoAtivaControllerDependencies {
  getSessaoDetalhe: GetSessaoDetalheUseCase;
  registrarSerie: RegistrarSerieUseCase;
  deleteSerie: DeleteSerieUseCase;
  toggleExercicioRealizado: ToggleExercicioRealizadoUseCase;
  addExercicioASessao: AddExercicioASessaoUseCase;
  finalizarSessao: FinalizarSessaoUseCase;
  cancelarSessao: CancelarSessaoUseCase;
  sugerirProgressao: SugerirProgressaoUseCase;
  listExercises: ListExercisesUseCase;
  logger: AppLogger;
}

export interface SessaoAtivaControllerState {
  detalhe: SessaoDetalhe | null;
  sugestoes: Record<string, SugestaoProgressao | null>;
  availableExercises: ExercisePrimitives[];
  showAddExercise: boolean;
  errorMessage: string | null;
  feedbackMessage: string | null;
  isFinalizing: boolean;
  isCanceling: boolean;
  onRegistrarSerie: (input: RegistrarSerieInput) => Promise<void>;
  onDeleteSerie: (serieId: string) => Promise<void>;
  onToggleRealizado: (sessaoExercicioId: string) => Promise<void>;
  onAddExercicio: (exercicioId: string) => Promise<void>;
  onToggleShowAddExercise: () => void;
  onFinalizar: () => Promise<void>;
  onCancelar: () => Promise<void>;
}

export function useSessaoAtivaController(
  sessao: SessaoTreinoPrimitives,
  dependencies: SessaoAtivaControllerDependencies,
  onFinalizado: (detalhe: SessaoDetalhe) => void,
  onCancelado: () => void
): SessaoAtivaControllerState {
  const [detalhe, setDetalhe] = useState<SessaoDetalhe | null>(null);
  const [sugestoes, setSugestoes] = useState<Record<string, SugestaoProgressao | null>>({});
  const [allExercises, setAllExercises] = useState<ExercisePrimitives[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const loadDetalhe = useCallback(async () => {
    try {
      const [d, exercises] = await Promise.all([
        dependencies.getSessaoDetalhe.execute(sessao.id),
        dependencies.listExercises.execute(),
      ]);
      setDetalhe(d);
      setAllExercises(exercises);

      const sugestoesEntries = await Promise.all(
        d.exercicios.map(async ({ sessaoExercicio: se }) => {
          const sug = await dependencies.sugerirProgressao.execute({
            exercicioId: se.exercicioId,
            execucoesRecomendadas: se.execucoesRecomendadas,
            cargaPadrao: se.cargaPadrao,
          });
          return [se.id, sug] as const;
        })
      );
      setSugestoes(Object.fromEntries(sugestoesEntries));
    } catch (error) {
      dependencies.logger.error('sessao_ativa.load_failed', error);
      setErrorMessage('Nao foi possivel carregar a sessao.');
    }
  }, [sessao.id]);

  useEffect(() => {
    void loadDetalhe();
  }, [loadDetalhe]);

  const availableExercises = detalhe
    ? allExercises.filter(
        (e) => !detalhe.exercicios.some((se) => se.sessaoExercicio.exercicioId === e.id)
      )
    : [];

  const onRegistrarSerie = async (input: RegistrarSerieInput) => {
    setErrorMessage(null);
    try {
      await dependencies.registrarSerie.execute(input);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.registrar_serie_failed', error);
      if (error instanceof SessaoValidationError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel registrar a serie.');
      }
    }
  };

  const onDeleteSerie = async (serieId: string) => {
    setErrorMessage(null);
    try {
      await dependencies.deleteSerie.execute(serieId);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.delete_serie_failed', error);
      setErrorMessage('Nao foi possivel remover a serie.');
    }
  };

  const onToggleRealizado = async (sessaoExercicioId: string) => {
    setErrorMessage(null);
    try {
      await dependencies.toggleExercicioRealizado.execute(sessaoExercicioId);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.toggle_realizado_failed', error);
      setErrorMessage('Nao foi possivel atualizar o exercicio.');
    }
  };

  const onAddExercicio = async (exercicioId: string) => {
    setErrorMessage(null);
    try {
      await dependencies.addExercicioASessao.execute({ sessaoId: sessao.id, exercicioId });
      setShowAddExercise(false);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.add_exercicio_failed', error);
      if (error instanceof ExercicioJaNaSessaoError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel adicionar o exercicio.');
      }
    }
  };

  const onFinalizar = async () => {
    setIsFinalizing(true);
    setErrorMessage(null);
    try {
      await dependencies.finalizarSessao.execute(sessao.id);
      const detalheCompleto = await dependencies.getSessaoDetalhe.execute(sessao.id);
      onFinalizado(detalheCompleto);
    } catch (error) {
      dependencies.logger.error('sessao_ativa.finalizar_failed', error);
      setErrorMessage('Nao foi possivel finalizar a sessao.');
      setIsFinalizing(false);
    }
  };

  const onCancelar = async () => {
    setIsCanceling(true);
    setErrorMessage(null);
    try {
      await dependencies.cancelarSessao.execute(sessao.id);
      onCancelado();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.cancelar_failed', error);
      setErrorMessage('Nao foi possivel cancelar a sessao.');
      setIsCanceling(false);
    }
  };

  return {
    detalhe,
    sugestoes,
    availableExercises,
    showAddExercise,
    errorMessage,
    feedbackMessage,
    isFinalizing,
    isCanceling,
    onRegistrarSerie,
    onDeleteSerie,
    onToggleRealizado,
    onAddExercicio,
    onToggleShowAddExercise: () => setShowAddExercise((v) => !v),
    onFinalizar,
    onCancelar,
  };
}
