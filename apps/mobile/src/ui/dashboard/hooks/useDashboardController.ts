import { useCallback, useEffect, useState } from 'react';

import type { DashboardStats, GetDashboardStatsUseCase } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import type { ExportarHistoricoUseCase } from '../../../application/dashboard/use-cases/ExportarHistoricoUseCase';
import type { ResetHistoricoUseCase } from '../../../application/dashboard/use-cases/ResetHistoricoUseCase';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

export interface DashboardControllerDependencies {
  getDashboardStats: GetDashboardStatsUseCase;
  resetHistorico: ResetHistoricoUseCase;
  exportarHistorico: ExportarHistoricoUseCase;
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
  };
}
