import { useEffect, useRef, useState } from 'react';

import { SessaoJaAtivaError } from '../../../application/sessoes/errors/SessaoJaAtivaError';
import { TreinoSemExerciciosError } from '../../../application/sessoes/errors/TreinoSemExerciciosError';
import type { DecisaoFinalizacao } from '../../../application/sessoes/use-cases/GetDecisaoFinalizacaoUseCase';
import type { GetSessaoAtivaUseCase } from '../../../application/sessoes/use-cases/GetSessaoAtivaUseCase';
import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { IniciarSessaoLivreUseCase } from '../../../application/sessoes/use-cases/IniciarSessaoLivreUseCase';
import type { IniciarSessaoUseCase } from '../../../application/sessoes/use-cases/IniciarSessaoUseCase';
import type { SugerirTreinoUseCase, SugestaoTreino } from '../../../application/sessoes/use-cases/SugerirTreinoUseCase';
import type { ListTreinoExerciciosUseCase } from '../../../application/treinos/use-cases/ListTreinoExerciciosUseCase';
import type { ListTreinosUseCase } from '../../../application/treinos/use-cases/ListTreinosUseCase';
import type { SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { translate, useLocale } from '../../shared/i18n';
import { formatShortDate } from '../../shared/i18n/formatters';
import { useTabActive } from '../../shared/tabActivity';

type SessaoView = 'loading' | 'inicio' | 'ativa' | 'resumo' | 'decisao';

export interface SessaoFeatureControllerDependencies {
  getSessaoAtiva: GetSessaoAtivaUseCase;
  iniciarSessao: IniciarSessaoUseCase;
  iniciarSessaoLivre: IniciarSessaoLivreUseCase;
  sugerirTreino: SugerirTreinoUseCase;
  listTreinos: ListTreinosUseCase;
  listTreinoExercicios: ListTreinoExerciciosUseCase;
  logger: AppLogger;
}

export interface SessaoFeatureControllerState {
  view: SessaoView;
  sessaoAtiva: SessaoTreinoPrimitives | null;
  sessaoResumo: SessaoDetalhe | null;
  decisaoPendente: DecisaoFinalizacao | null;
  treinos: TreinoPrimitives[];
  treinosComExercicios: Set<string>;
  sugestao: SugestaoTreino | null;
  errorMessage: string | null;
  isIniciando: boolean;
  onIniciarSessao: (treinoId: string) => Promise<void>;
  onIniciarLivre: () => Promise<void>;
  onSessaoFinalizada: (detalhe: SessaoDetalhe, decisao?: DecisaoFinalizacao) => void;
  onSessaoCancelada: () => void;
  onFecharResumo: () => void;
  onDecisaoConcluida: () => void;
}

export function useSessaoFeatureController(
  dependencies: SessaoFeatureControllerDependencies
): SessaoFeatureControllerState {
  const locale = useLocale();
  const [view, setView] = useState<SessaoView>('loading');
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoTreinoPrimitives | null>(null);
  const [sessaoResumo, setSessaoResumo] = useState<SessaoDetalhe | null>(null);
  const [decisaoPendente, setDecisaoPendente] = useState<DecisaoFinalizacao | null>(null);
  const [treinos, setTreinos] = useState<TreinoPrimitives[]>([]);
  const [treinosComExercicios, setTreinosComExercicios] = useState<Set<string>>(new Set());
  const [sugestao, setSugestao] = useState<SugestaoTreino | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIniciando, setIsIniciando] = useState(false);

  useEffect(() => {
    void checkSessaoAtiva();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkSessaoAtiva é recriada a cada render; este efeito é só de montagem (roda 1x)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 'view' é só guarda de leitura (não deve reexecutar ao mudar) e checkSessaoAtiva é recriada a cada render; o efeito deve rodar só ao (des)ativar a aba
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

  const onIniciarLivre = async () => {
    setIsIniciando(true);
    setErrorMessage(null);

    try {
      const nome = translate(locale, 'sessao.livre.nomeSugerido', { data: formatShortDate(new Date(), locale) });
      const sessao = await dependencies.iniciarSessaoLivre.execute({ nome });
      setSessaoAtiva(sessao);
      setView('ativa');
    } catch (error) {
      dependencies.logger.error('sessao_feature.iniciar_livre_failed', error);

      if (error instanceof SessaoJaAtivaError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(translate(locale, 'sessao.errors.iniciarLivre'));
      }
    } finally {
      setIsIniciando(false);
    }
  };

  const onSessaoFinalizada = (detalhe: SessaoDetalhe, decisao: DecisaoFinalizacao = { tipo: 'nenhuma' }) => {
    setSessaoAtiva(null);
    setSessaoResumo(detalhe);
    if (decisao.tipo === 'nenhuma') {
      setView('resumo');
    } else {
      setDecisaoPendente(decisao);
      setView('decisao');
    }
  };

  const onDecisaoConcluida = () => {
    setDecisaoPendente(null);
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
    decisaoPendente,
    treinos,
    treinosComExercicios,
    sugestao,
    errorMessage,
    isIniciando,
    onIniciarSessao,
    onIniciarLivre,
    onSessaoFinalizada,
    onSessaoCancelada,
    onFecharResumo,
    onDecisaoConcluida,
  };
}
