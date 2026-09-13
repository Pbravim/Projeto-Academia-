import { useCallback, useEffect, useRef, useState } from 'react';

import type { ExportFormato } from '../../../application/dashboard/export/HistoricoExportTypes';
import type { ArquivarSessaoUseCase } from '../../../application/dashboard/use-cases/ArquivarSessaoUseCase';
import type { DeletarSessaoUseCase } from '../../../application/dashboard/use-cases/DeletarSessaoUseCase';
import type { DesarquivarSessaoUseCase } from '../../../application/dashboard/use-cases/DesarquivarSessaoUseCase';
import type { ExportarHistoricoUseCase } from '../../../application/dashboard/use-cases/ExportarHistoricoUseCase';
import type { DashboardStats, GetDashboardStatsUseCase } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import type { ResetHistoricoUseCase } from '../../../application/dashboard/use-cases/ResetHistoricoUseCase';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';
import { useExportarHistorico } from '../../shared/hooks/useExportarHistorico';
import { translate, useLocale } from '../../shared/i18n';
import { useTabActive } from '../../shared/tabActivity';

export interface DashboardControllerDependencies {
  getDashboardStats: GetDashboardStatsUseCase;
  resetHistorico: ResetHistoricoUseCase;
  exportarHistorico: ExportarHistoricoUseCase;
  arquivarSessao: ArquivarSessaoUseCase;
  desarquivarSessao: DesarquivarSessaoUseCase;
  deletarSessao: DeletarSessaoUseCase;
  logger: AppLogger;
}

export interface DashboardControllerState {
  stats: DashboardStats | null;
  isLoading: boolean;
  isResetting: boolean;
  isExporting: boolean;
  exportFormatoVisible: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onReset: () => Promise<void>;
  onExportar: () => void;
  onFecharExportar: () => void;
  onExportarFormato: (formato: ExportFormato) => Promise<void>;
  onVerEvolucao: (treinoId: string, treinoNome: string) => void;
  onVerRecordes: () => void;
  onArquivarSessao: (sessaoId: string) => Promise<void>;
  onDesarquivarSessao: (sessaoId: string) => Promise<void>;
  onDeletarSessao: (sessaoId: string) => Promise<void>;
  onArquivarTodasSessoesTreino: (sessaoIds: string[]) => Promise<void>;
  onDeletarTodasSessoesTreino: (sessaoIds: string[]) => Promise<void>;
}

export function useDashboardController(dependencies: DashboardControllerDependencies): DashboardControllerState {
  const locale = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const exp = useExportarHistorico({
    exportarHistorico: dependencies.exportarHistorico,
    logger: dependencies.logger,
    onError: (e) => setErrorMessage(e instanceof Error ? e.message : translate(locale, 'dashboard.errors.export')),
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await dependencies.getDashboardStats.execute();
      setStats(result);
    } catch (error) {
      dependencies.logger.error('dashboard.load_failed', error);
      setErrorMessage(translate(locale, 'dashboard.errors.loadStats'));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependencies é injetado uma vez por tela (DI); incluir getDashboardStats/logger recriaria load a cada render sem motivo
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep-alive: a aba fica montada oculta; recarrega ao reativar para não
  // exibir stats congelados (ex.: sessão finalizada em outra aba).
  const tabActive = useTabActive();
  const firstActivationRef = useRef(true);
  useEffect(() => {
    if (!tabActive) return;
    if (firstActivationRef.current) {
      firstActivationRef.current = false; // load inicial do mount já cobre
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load muda a cada troca de locale; incluí-lo recarregaria ao trocar idioma, não só ao reativar a aba
  }, [tabActive]);

  const onReset = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      await dependencies.resetHistorico.execute();
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.reset_failed', error);
      setErrorMessage(translate(locale, 'dashboard.errors.reset'));
    } finally {
      setIsResetting(false);
    }
  };

  const onExportar = () => {
    setErrorMessage(null);
    exp.abrir();
  };

  // Falha silenciosa era P2 (auditoria rodada 3): a linha não sumia e o usuário
  // tocava de novo sem saber por quê — todo catch abaixo mostra errorMessage.
  const onArquivarSessao = async (sessaoId: string) => {
    try {
      await dependencies.arquivarSessao.execute(sessaoId);
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.arquivar_sessao_failed', error);
      setErrorMessage(translate(locale, 'dashboard.errors.arquivarSessao'));
    }
  };

  const onDesarquivarSessao = async (sessaoId: string) => {
    try {
      await dependencies.desarquivarSessao.execute(sessaoId);
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.desarquivar_sessao_failed', error);
      setErrorMessage(translate(locale, 'dashboard.errors.desarquivarSessao'));
    }
  };

  const onDeletarSessao = async (sessaoId: string) => {
    try {
      await dependencies.deletarSessao.execute(sessaoId);
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.deletar_sessao_failed', error);
      setErrorMessage(translate(locale, 'dashboard.errors.deletarSessao'));
    }
  };

  const onArquivarTodasSessoesTreino = async (sessaoIds: string[]) => {
    try {
      for (const id of sessaoIds) {
        await dependencies.arquivarSessao.execute(id);
      }
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.arquivar_todas_failed', error);
      setErrorMessage(translate(locale, 'dashboard.errors.arquivarSessao'));
    }
  };

  const onDeletarTodasSessoesTreino = async (sessaoIds: string[]) => {
    try {
      for (const id of sessaoIds) {
        await dependencies.deletarSessao.execute(id);
      }
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.deletar_todas_failed', error);
      setErrorMessage(translate(locale, 'dashboard.errors.deletarSessao'));
    }
  };

  return {
    stats,
    isLoading,
    isResetting,
    isExporting: exp.isExporting,
    exportFormatoVisible: exp.formatoVisible,
    errorMessage,
    onRefresh: () => { void load(); },
    onReset,
    onExportar,
    onFecharExportar: exp.fechar,
    onExportarFormato: exp.exportar,
    onVerEvolucao: () => {},
    onVerRecordes: () => {},
    onArquivarSessao,
    onDesarquivarSessao,
    onDeletarSessao,
    onArquivarTodasSessoesTreino,
    onDeletarTodasSessoesTreino,
  };
}
