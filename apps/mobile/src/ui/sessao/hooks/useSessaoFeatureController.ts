import { useEffect, useRef, useState } from 'react';

import type { GetSessaoAtivaUseCase } from '../../../application/sessoes/use-cases/GetSessaoAtivaUseCase';
import type { IniciarSessaoUseCase } from '../../../application/sessoes/use-cases/IniciarSessaoUseCase';
import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SugerirTreinoUseCase, SugestaoTreino } from '../../../application/sessoes/use-cases/SugerirTreinoUseCase';
import type { ListTreinosUseCase } from '../../../application/treinos/use-cases/ListTreinosUseCase';
import type { ListTreinoExerciciosUseCase } from '../../../application/treinos/use-cases/ListTreinoExerciciosUseCase';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { SessaoJaAtivaError } from '../../../application/sessoes/errors/SessaoJaAtivaError';
import { TreinoSemExerciciosError } from '../../../application/sessoes/errors/TreinoSemExerciciosError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';
import { useTabActive } from '../../shared/tabActivity';

type SessaoView = 'loading' | 'inicio' | 'ativa' | 'resumo';

export interface SessaoFeatureControllerDependencies {
  getSessaoAtiva: GetSessaoAtivaUseCase;
  iniciarSessao: IniciarSessaoUseCase;
  sugerirTreino: SugerirTreinoUseCase;
  listTreinos: ListTreinosUseCase;
  listTreinoExercicios: ListTreinoExerciciosUseCase;
  logger: AppLogger;
}

export interface SessaoFeatureControllerState {
  view: SessaoView;
  sessaoAtiva: SessaoTreinoPrimitives | null;
  sessaoResumo: SessaoDetalhe | null;
  treinos: TreinoPrimitives[];
  treinosComExercicios: Set<string>;
  sugestao: SugestaoTreino | null;
  errorMessage: string | null;
  isIniciando: boolean;
  onIniciarSessao: (treinoId: string) => Promise<void>;
  onSessaoFinalizada: (detalhe: SessaoDetalhe) => void;
  onSessaoCancelada: () => void;
  onFecharResumo: () => void;
}

export function useSessaoFeatureController(
  dependencies: SessaoFeatureControllerDependencies
): SessaoFeatureControllerState {
  const locale = useLocale();
  const [view, setView] = useState<SessaoView>('loading');
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoTreinoPrimitives | null>(null);
  const [sessaoResumo, setSessaoResumo] = useState<SessaoDetalhe | null>(null);
  const [treinos, setTreinos] = useState<TreinoPrimitives[]>([]);
  const [treinosComExercicios, setTreinosComExercicios] = useState<Set<string>>(new Set());
  const [sugestao, setSugestao] = useState<SugestaoTreino | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIniciando, setIsIniciando] = useState(false);

  useEffect(() => {
    void checkSessaoAtiva();
  }, []);

  // Keep-alive: recarrega lista de treinos/sugestão ao reativar a aba (ex.:
  // treino criado em outra aba). Só na view 'inicio' — recarregar durante
  // sessão ativa ou resumo resetaria o estado em andamento.
  const tabActive = useTabActive();
  const firstActivationRef = useRef(true);
  useEffect(() => {
    if (!tabActive) return;
    if (firstActivationRef.current) {
      firstActivationRef.current = false; // load inicial do mount já cobre
      return;
    }
    if (view !== 'inicio') return;
    void checkSessaoAtiva();
  }, [tabActive]);

  const checkSessaoAtiva = async () => {
    try {
      const [sessao, listaTreinos, sugestaoResult] = await Promise.all([
        dependencies.getSessaoAtiva.execute(),
        dependencies.listTreinos.execute(),
        dependencies.sugerirTreino.execute(),
      ]);
      setTreinos(listaTreinos);
      setSugestao(sugestaoResult);

      const exerciciosPorTreino = await Promise.all(
        listaTreinos.map((t) => dependencies.listTreinoExercicios.execute(t.id))
      );
      const comExercicios = new Set(
        listaTreinos.filter((_, i) => exerciciosPorTreino[i].length > 0).map((t) => t.id)
      );
      setTreinosComExercicios(comExercicios);

      if (sessao) {
        setSessaoAtiva(sessao);
        setView('ativa');
      } else {
        setView('inicio');
      }
    } catch (error) {
      dependencies.logger.error('sessao_feature.check_failed', error);
      setView('inicio');
    }
  };

  const onIniciarSessao = async (treinoId: string) => {
    setIsIniciando(true);
    setErrorMessage(null);

    try {
      const sessao = await dependencies.iniciarSessao.execute(treinoId);
      setSessaoAtiva(sessao);
      setView('ativa');
    } catch (error) {
      dependencies.logger.error('sessao_feature.iniciar_failed', error);

      if (error instanceof SessaoJaAtivaError || error instanceof TreinoSemExerciciosError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(translate(locale, 'sessao.errors.iniciar'));
      }
    } finally {
      setIsIniciando(false);
    }
  };

  const onSessaoFinalizada = (detalhe: SessaoDetalhe) => {
    setSessaoAtiva(null);
    setSessaoResumo(detalhe);
    setView('resumo');
  };

  const onSessaoCancelada = () => {
    setSessaoAtiva(null);
    setView('inicio');
  };

  const onFecharResumo = () => {
    setSessaoResumo(null);
    setView('inicio');
    void checkSessaoAtiva();
  };

  return {
    view,
    sessaoAtiva,
    sessaoResumo,
    treinos,
    treinosComExercicios,
    sugestao,
    errorMessage,
    isIniciando,
    onIniciarSessao,
    onSessaoFinalizada,
    onSessaoCancelada,
    onFecharResumo,
  };
}
