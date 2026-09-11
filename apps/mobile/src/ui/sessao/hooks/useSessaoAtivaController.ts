import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ListExercisesUseCase } from '../../../application/exercises/use-cases/ListExercisesUseCase';
import { ExercicioJaNaSessaoError } from '../../../application/sessoes/errors/ExercicioJaNaSessaoError';
import type { AddExercicioASessaoUseCase } from '../../../application/sessoes/use-cases/AddExercicioASessaoUseCase';
import type { CancelarSessaoUseCase } from '../../../application/sessoes/use-cases/CancelarSessaoUseCase';
import type { DeleteSerieUseCase } from '../../../application/sessoes/use-cases/DeleteSerieUseCase';
import type { FinalizarSessaoUseCase } from '../../../application/sessoes/use-cases/FinalizarSessaoUseCase';
import type { GetSessaoDetalheUseCase, SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { RegistrarSerieInput, RegistrarSerieUseCase } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { SubstituirExercicioSessaoUseCase } from '../../../application/sessoes/use-cases/SubstituirExercicioSessaoUseCase';
import type { SugerirProgressaoUseCase,SugestaoProgressao } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { CandidatoSubstituto,SugerirSubstitutosUseCase } from '../../../application/sessoes/use-cases/SugerirSubstitutosUseCase';
import type { ToggleExercicioRealizadoUseCase } from '../../../application/sessoes/use-cases/ToggleExercicioRealizadoUseCase';
import type { UpdateSerieInput, UpdateSerieUseCase } from '../../../application/sessoes/use-cases/UpdateSerieUseCase';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { SessaoExercicioPrimitives,SubstituicaoMotivo } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
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

  // Lazy: o catálogo completo (500+ linhas × 3 JSON.parse cada) só é carregado
  // na primeira abertura do sheet "adicionar exercício" — não no mount de toda
  // sessão, que é o caminho mais quente do app.
  const exercisesLoadedRef = useRef(false);
  const ensureExercisesLoaded = () => {
    if (exercisesLoadedRef.current) return;
    exercisesLoadedRef.current = true;
    void dependencies.listExercises.execute().then(setAllExercises);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependencies é um objeto novo a cada render do pai; incluí-lo recriaria loadDetalhe e refaria o fetch a cada render, apagando o que o usuário digitou na série em andamento
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

  // Updates incrementais: recarregar a sessão inteira (detalhe + sugestões em
  // lote) a cada série registrada/removida deixava o registro visivelmente
  // lento em treinos longos. Só operações raras (adicionar/substituir
  // exercício, trocar técnica) continuam com reload completo.
  const patchExercicios = (
    ids: Set<string>,
    patch: (ex: SessaoDetalhe['exercicios'][number]) => SessaoDetalhe['exercicios'][number],
  ) => {
    setDetalhe((prev) =>
      prev === null
        ? prev
        : { ...prev, exercicios: prev.exercicios.map((ex) => (ids.has(ex.sessaoExercicio.id) ? patch(ex) : ex)) },
    );
  };

  // Espelha RegistrarSerieUseCase.atualizarCargaSeNecessario para o snapshot local.
  const novaCargaPadrao = (
    se: { execucoesRecomendadas: number | null; cargaPadrao: number | null },
    input: RegistrarSerieInput,
  ): number | null => {
    if (input.repeticoes == null || input.cargaKg == null) return null;
    if (se.execucoesRecomendadas == null) return null;
    if (input.repeticoes < se.execucoesRecomendadas) return null;
    if (se.cargaPadrao != null && input.cargaKg <= se.cargaPadrao) return null;
    return input.cargaKg;
  };

  const refreshSugestao = async (se: { id: string; exercicioId: string; execucoesRecomendadas: number | null; cargaPadrao: number | null }, cargaAtualizada: number | null) => {
    try {
      const map = await dependencies.sugerirProgressao.executeLote([
        {
          exercicioId: se.exercicioId,
          execucoesRecomendadas: se.execucoesRecomendadas,
          cargaPadrao: cargaAtualizada ?? se.cargaPadrao,
        },
      ]);
      setSugestoes((prev) => ({ ...prev, [se.id]: map.get(se.exercicioId) ?? null }));
    } catch (error) {
      dependencies.logger.error('sessao_ativa.refresh_sugestao_failed', error);
    }
  };

  const onRegistrarSerie = async (input: RegistrarSerieInput) => {
    setErrorMessage(null);
    try {
      const nova = await dependencies.registrarSerie.execute(input);
      const alvo = detalhe?.exercicios.find((ex) => ex.sessaoExercicio.id === input.sessaoExercicioId);
      const carga = alvo ? novaCargaPadrao(alvo.sessaoExercicio, input) : null;
      patchExercicios(new Set([input.sessaoExercicioId]), (ex) => ({
        ...ex,
        series: [...ex.series, nova],
        sessaoExercicio: carga != null ? { ...ex.sessaoExercicio, cargaPadrao: carga } : ex.sessaoExercicio,
      }));
      if (alvo) void refreshSugestao(alvo.sessaoExercicio, carga);
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
      const novas = await Promise.all(inputs.map((input) => dependencies.registrarSerie.execute(input)));
      const porExercicio = new Map<string, typeof novas>();
      inputs.forEach((input, i) => {
        const lista = porExercicio.get(input.sessaoExercicioId) ?? [];
        lista.push(novas[i]);
        porExercicio.set(input.sessaoExercicioId, lista);
      });
      const cargaPorExercicio = new Map<string, number>();
      for (const input of inputs) {
        const alvo = detalhe?.exercicios.find((ex) => ex.sessaoExercicio.id === input.sessaoExercicioId);
        if (!alvo) continue;
        const base = { ...alvo.sessaoExercicio, cargaPadrao: cargaPorExercicio.get(input.sessaoExercicioId) ?? alvo.sessaoExercicio.cargaPadrao };
        const carga = novaCargaPadrao(base, input);
        if (carga != null) cargaPorExercicio.set(input.sessaoExercicioId, carga);
      }
      patchExercicios(new Set(porExercicio.keys()), (ex) => ({
        ...ex,
        series: [...ex.series, ...(porExercicio.get(ex.sessaoExercicio.id) ?? [])],
        sessaoExercicio: cargaPorExercicio.has(ex.sessaoExercicio.id)
          ? { ...ex.sessaoExercicio, cargaPadrao: cargaPorExercicio.get(ex.sessaoExercicio.id)! }
          : ex.sessaoExercicio,
      }));
      for (const id of porExercicio.keys()) {
        const alvo = detalhe?.exercicios.find((ex) => ex.sessaoExercicio.id === id);
        if (alvo) void refreshSugestao(alvo.sessaoExercicio, cargaPorExercicio.get(id) ?? null);
      }
    } catch (error) {
      dependencies.logger.error('sessao_ativa.registrar_series_lote_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.registrarSeries'));
    }
  };

  const removerSeriesDoEstado = (serieIds: Set<string>) => {
    setDetalhe((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            exercicios: prev.exercicios.map((ex) =>
              ex.series.some((s) => serieIds.has(s.id))
                ? { ...ex, series: ex.series.filter((s) => !serieIds.has(s.id)) }
                : ex,
            ),
          },
    );
  };

  const onDeleteSerie = async (serieId: string) => {
    setErrorMessage(null);
    try {
      await dependencies.deleteSerie.execute(serieId);
      removerSeriesDoEstado(new Set([serieId]));
    } catch (error) {
      dependencies.logger.error('sessao_ativa.delete_serie_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.removerSerie'));
    }
  };

  const onDeleteSeries = async (serieIds: string[]) => {
    setErrorMessage(null);
    try {
      await Promise.all(serieIds.map((id) => dependencies.deleteSerie.execute(id)));
      removerSeriesDoEstado(new Set(serieIds));
    } catch (error) {
      dependencies.logger.error('sessao_ativa.delete_series_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.removerSeries'));
    }
  };

  const onToggleRealizado = async (sessaoExercicioId: string) => {
    setErrorMessage(null);
    try {
      await dependencies.toggleExercicioRealizado.execute(sessaoExercicioId);
      patchExercicios(new Set([sessaoExercicioId]), (ex) => ({
        ...ex,
        sessaoExercicio: { ...ex.sessaoExercicio, realizado: !ex.sessaoExercicio.realizado },
      }));
    } catch (error) {
      dependencies.logger.error('sessao_ativa.toggle_realizado_failed', error);
      setErrorMessage(translate(locale, 'sessao.errors.atualizarExercicio'));
    }
  };

  const onToggleRealizadoGrupo = async (sessaoExercicioIds: string[]) => {
    setErrorMessage(null);
    try {
      await Promise.all(sessaoExercicioIds.map((id) => dependencies.toggleExercicioRealizado.execute(id)));
      patchExercicios(new Set(sessaoExercicioIds), (ex) => ({
        ...ex,
        sessaoExercicio: { ...ex.sessaoExercicio, realizado: !ex.sessaoExercicio.realizado },
      }));
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
      setDetalhe((prev) =>
        prev === null
          ? prev
          : {
              ...prev,
              exercicios: prev.exercicios.map((ex) =>
                ex.series.some((s) => s.id === input.serieId)
                  ? {
                      ...ex,
                      series: ex.series.map((s) =>
                        s.id === input.serieId
                          ? {
                              ...s,
                              cargaKg: input.cargaKg,
                              repeticoes: input.repeticoes,
                              observacao: input.observacao !== undefined ? input.observacao : s.observacao,
                            }
                          : s,
                      ),
                    }
                  : ex,
              ),
            },
      );
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
    onToggleShowAddExercise: () => {
      if (!showAddExercise) ensureExercisesLoaded();
      setShowAddExercise((v) => !v);
    },
    onFinalizar,
    onCancelar,
    onAbrirSubstituicao,
    onConfirmarSubstituicao,
    onFecharSubstituicao,
    onAtualizarMetodo,
  };
}
