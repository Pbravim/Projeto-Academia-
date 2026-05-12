import { useCallback, useEffect, useState } from 'react';

import type { DashboardStats, GetDashboardStatsUseCase } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import type { ExportarHistoricoUseCase } from '../../../application/dashboard/use-cases/ExportarHistoricoUseCase';
import type { ResetHistoricoUseCase } from '../../../application/dashboard/use-cases/ResetHistoricoUseCase';
import type { ArquivarSessaoUseCase } from '../../../application/dashboard/use-cases/ArquivarSessaoUseCase';
import type { DesarquivarSessaoUseCase } from '../../../application/dashboard/use-cases/DesarquivarSessaoUseCase';
import type { DeletarSessaoUseCase } from '../../../application/dashboard/use-cases/DeletarSessaoUseCase';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

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
  errorMessage: string | null;
  onRefresh: () => void;
  onReset: () => Promise<void>;
  onExportar: () => Promise<void>;
  onVerEvolucao: (treinoId: string, treinoNome: string) => void;
  onVerRecordes: () => void;
  onArquivarSessao: (sessaoId: string) => Promise<void>;
  onDesarquivarSessao: (sessaoId: string) => Promise<void>;
  onDeletarSessao: (sessaoId: string) => Promise<void>;
  onArquivarTodasSessoesTreino: (sessaoIds: string[]) => Promise<void>;
  onDeletarTodasSessoesTreino: (sessaoIds: string[]) => Promise<void>;
}

export function useDashboardController(dependencies: DashboardControllerDependencies): DashboardControllerState {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await dependencies.getDashboardStats.execute();
      setStats(result);
    } catch (error) {
      dependencies.logger.error('dashboard.load_failed', error);
      setErrorMessage('Nao foi possivel carregar as estatisticas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onReset = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      await dependencies.resetHistorico.execute();
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.reset_failed', error);
      setErrorMessage('Nao foi possivel resetar o historico.');
    } finally {
      setIsResetting(false);
    }
  };

  const onExportar = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      await dependencies.exportarHistorico.execute();
    } catch (error) {
      dependencies.logger.error('dashboard.export_failed', error);
      const msg = error instanceof Error ? error.message : 'Nao foi possivel exportar o historico.';
      setErrorMessage(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const onArquivarSessao = async (sessaoId: string) => {
    try {
      await dependencies.arquivarSessao.execute(sessaoId);
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.arquivar_sessao_failed', error);
    }
  };

  const onDesarquivarSessao = async (sessaoId: string) => {
    try {
      await dependencies.desarquivarSessao.execute(sessaoId);
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.desarquivar_sessao_failed', error);
    }
  };

  const onDeletarSessao = async (sessaoId: string) => {
    try {
      await dependencies.deletarSessao.execute(sessaoId);
      await load();
    } catch (error) {
      dependencies.logger.error('dashboard.deletar_sessao_failed', error);
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
    }
  };

  return {
    stats,
    isLoading,
    isResetting,
    isExporting,
    errorMessage,
    onRefresh: () => { void load(); },
    onReset,
    onExportar,
    onVerEvolucao: () => {},
    onVerRecordes: () => {},
    onArquivarSessao,
    onDesarquivarSessao,
    onDeletarSessao,
    onArquivarTodasSessoesTreino,
    onDeletarTodasSessoesTreino,
  };
}
