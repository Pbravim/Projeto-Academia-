import { useEffect, useState } from 'react';

import type { GetSessaoAtivaUseCase } from '../../../application/sessoes/use-cases/GetSessaoAtivaUseCase';
import type { IniciarSessaoUseCase } from '../../../application/sessoes/use-cases/IniciarSessaoUseCase';
import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { ListTreinosUseCase } from '../../../application/treinos/use-cases/ListTreinosUseCase';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import { SessaoJaAtivaError } from '../../../application/sessoes/errors/SessaoJaAtivaError';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

type SessaoView = 'loading' | 'inicio' | 'ativa' | 'resumo';

export interface SessaoFeatureControllerDependencies {
  getSessaoAtiva: GetSessaoAtivaUseCase;
  iniciarSessao: IniciarSessaoUseCase;
  listTreinos: ListTreinosUseCase;
  logger: AppLogger;
}

export interface SessaoFeatureControllerState {
  view: SessaoView;
  sessaoAtiva: SessaoTreinoPrimitives | null;
  sessaoResumo: SessaoDetalhe | null;
  treinos: TreinoPrimitives[];
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
  const [view, setView] = useState<SessaoView>('loading');
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoTreinoPrimitives | null>(null);
  const [sessaoResumo, setSessaoResumo] = useState<SessaoDetalhe | null>(null);
  const [treinos, setTreinos] = useState<TreinoPrimitives[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIniciando, setIsIniciando] = useState(false);

  useEffect(() => {
    void checkSessaoAtiva();
  }, []);

  const checkSessaoAtiva = async () => {
    try {
      const [sessao, listaTreinos] = await Promise.all([
        dependencies.getSessaoAtiva.execute(),
        dependencies.listTreinos.execute(),
      ]);
      setTreinos(listaTreinos);
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

      if (error instanceof SessaoJaAtivaError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Nao foi possivel iniciar a sessao.');
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
    errorMessage,
    isIniciando,
    onIniciarSessao,
    onSessaoFinalizada,
    onSessaoCancelada,
    onFecharResumo,
  };
}
