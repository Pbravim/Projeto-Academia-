import { useCallback, useEffect, useState } from 'react';

import type { DashboardStats, GetDashboardStatsUseCase } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import type { AppLogger } from '../../../infrastructure/logging/AppLogger';

export interface DashboardControllerDependencies {
  getDashboardStats: GetDashboardStatsUseCase;
  logger: AppLogger;
}

export interface DashboardControllerState {
  stats: DashboardStats | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
}

export function useDashboardController(dependencies: DashboardControllerDependencies): DashboardControllerState {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  return {
    stats,
    isLoading,
    errorMessage,
    onRefresh: () => { void load(); },
  };
}
