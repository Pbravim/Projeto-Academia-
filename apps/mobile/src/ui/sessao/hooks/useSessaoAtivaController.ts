import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AddExercicioASessaoUseCase } from '../../../application/sessoes/use-cases/AddExercicioASessaoUseCase';
import type { CancelarSessaoUseCase } from '../../../application/sessoes/use-cases/CancelarSessaoUseCase';
import type { DeleteSerieUseCase } from '../../../application/sessoes/use-cases/DeleteSerieUseCase';
import type { UpdateSerieInput, UpdateSerieUseCase } from '../../../application/sessoes/use-cases/UpdateSerieUseCase';
import type { FinalizarSessaoUseCase } from '../../../application/sessoes/use-cases/FinalizarSessaoUseCase';
import type { GetSessaoDetalheUseCase, SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { RegistrarSerieInput, RegistrarSerieUseCase } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { ToggleExercicioRealizadoUseCase } from '../../../application/sessoes/use-cases/ToggleExercicioRealizadoUseCase';
import type { SugestaoProgressao, SugerirProgressaoUseCase } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { SugerirSubstitutosUseCase, CandidatoSubstituto } from '../../../application/sessoes/use-cases/SugerirSubstitutosUseCase';
import type { SubstituirExercicioSessaoUseCase } from '../../../application/sessoes/use-cases/SubstituirExercicioSessaoUseCase';
import type { ListExercisesUseCase } from '../../../application/exercises/use-cases/ListExercisesUseCase';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { SubstituicaoMotivo, SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { ExercicioJaNaSessaoError } from '../../../application/sessoes/errors/ExercicioJaNaSessaoError';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';

export interface SessaoAtivaControllerDependencies {
  getSessaoDetalhe: GetSessaoDetalheUseCase;
  registrarSerie: RegistrarSerieUseCase;
  deleteSerie: DeleteSerieUseCase;
  updateSerie: UpdateSerieUseCase;
  toggleExercicioRealizado: ToggleExercicioRealizadoUseCase;
  addExercicioASessao: AddExercicioASessaoUseCase;
  finalizarSessao: FinalizarSessaoUseCase;
  cancelarSessao: CancelarSessaoUseCase;
  sugerirProgressao: SugerirProgressaoUseCase;
  sugerirSubstitutos: SugerirSubstitutosUseCase;
  substituirExercicio: SubstituirExercicioSessaoUseCase;
  listExercises: ListExercisesUseCase;
  atualizarMetodoSessaoExercicio: (sessaoExercicioId: string, metodo: SessaoExercicioPrimitives['metodo']) => Promise<void>;
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
  temSerieValida: boolean;
  candidatosSubstituicao: CandidatoSubstituto[];
  sessaoExercicioSubstituindo: string | null;
  onRegistrarSerie: (input: RegistrarSerieInput) => Promise<void>;
  onRegistrarSeriesEmLote: (inputs: RegistrarSerieInput[]) => Promise<void>;
  onDeleteSerie: (serieId: string) => Promise<void>;
  onDeleteSeries: (serieIds: string[]) => Promise<void>;
  onUpdateSerie: (input: UpdateSerieInput) => Promise<void>;
  onToggleRealizado: (sessaoExercicioId: string) => Promise<void>;
  onToggleRealizadoGrupo: (sessaoExercicioIds: string[]) => Promise<void>;
  onAddExercicio: (exercicioId: string) => Promise<void>;
  onToggleShowAddExercise: () => void;
  onFinalizar: () => Promise<void>;
  onCancelar: () => Promise<void>;
  onAbrirSubstituicao: (sessaoExercicioId: string) => Promise<void>;
  onConfirmarSubstituicao: (novoExercicioId: string, motivo: SubstituicaoMotivo | null) => Promise<void>;
  onFecharSubstituicao: () => void;
  onAtualizarMetodo: (sessaoExercicioId: string, metodo: SessaoExercicioPrimitives['metodo']) => Promise<void>;
}

export function useSessaoAtivaController(
  sessao: SessaoTreinoPrimitives,
  dependencies: SessaoAtivaControllerDependencies,
  onFinalizado: (detalhe: SessaoDetalhe) => void,
  onCancelado: () => void
): SessaoAtivaControllerState {
  const locale = useLocale();
  const [detalhe, setDetalhe] = useState<SessaoDetalhe | null>(null);
  const [sugestoes, setSugestoes] = useState<Record<string, SugestaoProgressao | null>>({});
  const [allExercises, setAllExercises] = useState<ExercisePrimitives[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [candidatosSubstituicao, setCandidatosSubstituicao] = useState<CandidatoSubstituto[]>([]);
  const [sessaoExercicioSubstituindo, setSessaoExercicioSubstituindo] = useState<string | null>(null);

  useEffect(() => {
    void dependencies.listExercises.execute().then(setAllExercises);
  }, []);

  const loadDetalhe = useCallback(async () => {
    try {
      const d = await dependencies.getSessaoDetalhe.execute(sessao.id);
      setDetalhe(d);

      const inputs = d.exercicios.map(({ sessaoExercicio: se }) => ({
        exercicioId: se.exercicioId,
        execucoesRecomendadas: se.execucoesRecomendadas,
        cargaPadrao: se.cargaPadrao,
      }));
      const sugestaoMap = await dependencies.sugerirProgressao.executeLote(inputs);
      const sugestoesEntries = d.exercicios.map(({ sessaoExercicio: se }) => [
        se.id,
        sugestaoMap.get(se.exercicioId) ?? null,
      ] as const);
      setSugestoes(Object.fromEntries(sugestoesEntries));
    } catch (error) {
      dependencies.logger.error('sessao_ativa.load_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.load'));
    }
  }, [sessao.id, locale]);

  useEffect(() => {
    void loadDetalhe();
  }, [loadDetalhe]);

  const sessionExerciseIds = useMemo(
    () => new Set(detalhe?.exercicios.map((e) => e.sessaoExercicio.exercicioId)),
    [detalhe],
  );
  const availableExercises = useMemo(
    () => allExercises.filter((e) => !sessionExerciseIds.has(e.id)),
    [allExercises, sessionExerciseIds],
  );

  const temSerieValida = detalhe?.exercicios.some((ex) => ex.series.length > 0) ?? false;

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
        setErrorMessage(translate(locale, 'sessao.errors.registrarSerie'));
      }
    }
  };

  const onRegistrarSeriesEmLote = async (inputs: RegistrarSerieInput[]) => {
    setErrorMessage(null);
    try {
      await Promise.all(inputs.map((input) => dependencies.registrarSerie.execute(input)));
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.registrar_series_lote_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.registrarSeries'));
    }
  };

  const onDeleteSerie = async (serieId: string) => {
    setErrorMessage(null);
    try {
      await dependencies.deleteSerie.execute(serieId);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.delete_serie_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.removerSerie'));
    }
  };

  const onDeleteSeries = async (serieIds: string[]) => {
    setErrorMessage(null);
    try {
      await Promise.all(serieIds.map((id) => dependencies.deleteSerie.execute(id)));
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.delete_series_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.removerSeries'));
    }
  };

  const onToggleRealizado = async (sessaoExercicioId: string) => {
    setErrorMessage(null);
    try {
      await dependencies.toggleExercicioRealizado.execute(sessaoExercicioId);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.toggle_realizado_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.atualizarExercicio'));
    }
  };

  const onToggleRealizadoGrupo = async (sessaoExercicioIds: string[]) => {
    setErrorMessage(null);
    try {
      await Promise.all(sessaoExercicioIds.map((id) => dependencies.toggleExercicioRealizado.execute(id)));
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.toggle_realizado_grupo_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.atualizarExercicios'));
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
        setErrorMessage(translate(locale, 'sessao.errors.adicionarExercicio'));
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
      setErrorMessage(translate(locale, 'sessao.errors.finalizar'));
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
      setErrorMessage(translate(locale, 'sessao.errors.cancelar'));
    } finally {
      setIsCanceling(false);
    }
  };

  const onAbrirSubstituicao = async (sessaoExercicioId: string) => {
    setSessaoExercicioSubstituindo(sessaoExercicioId);
    setCandidatosSubstituicao([]);
    try {
      const candidatos = await dependencies.sugerirSubstitutos.execute(sessaoExercicioId);
      setCandidatosSubstituicao(candidatos);
    } catch (error) {
      dependencies.logger.error('sessao_ativa.sugerir_substitutos_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.carregarSubstitutos'));
    }
  };

  const onConfirmarSubstituicao = async (novoExercicioId: string, motivo: SubstituicaoMotivo | null) => {
    if (!sessaoExercicioSubstituindo) return;
    setErrorMessage(null);
    try {
      await dependencies.substituirExercicio.execute({
        sessaoExercicioId: sessaoExercicioSubstituindo,
        novoExercicioId,
        motivo,
      });
      setSessaoExercicioSubstituindo(null);
      setCandidatosSubstituicao([]);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.substituir_exercicio_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.substituir'));
    }
  };

  const onFecharSubstituicao = () => {
    setSessaoExercicioSubstituindo(null);
    setCandidatosSubstituicao([]);
  };

  const onAtualizarMetodo = async (sessaoExercicioId: string, metodo: SessaoExercicioPrimitives['metodo']) => {
    setErrorMessage(null);
    try {
      await dependencies.atualizarMetodoSessaoExercicio(sessaoExercicioId, metodo);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.atualizar_metodo_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.atualizarTecnica'));
    }
  };

  const onUpdateSerie = async (input: UpdateSerieInput) => {
    setErrorMessage(null);
    try {
      await dependencies.updateSerie.execute(input);
      await loadDetalhe();
    } catch (error) {
      dependencies.logger.error('sessao_ativa.update_serie_failed', error);
      if (error instanceof SessaoValidationError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(translate(locale, 'sessao.errors.atualizarSerie'));
      }
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
    temSerieValida,
    candidatosSubstituicao,
    sessaoExercicioSubstituindo,
    onRegistrarSerie,
    onRegistrarSeriesEmLote,
    onDeleteSerie,
    onDeleteSeries,
    onUpdateSerie,
    onToggleRealizado,
    onToggleRealizadoGrupo,
    onAddExercicio,
    onToggleShowAddExercise: () => setShowAddExercise((v) => !v),
    onFinalizar,
    onCancelar,
    onAbrirSubstituicao,
    onConfirmarSubstituicao,
    onFecharSubstituicao,
    onAtualizarMetodo,
  };
}
