import { useEffect, useState } from 'react';

import type { DashboardStats,GetDashboardStatsUseCase } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { useTabActive } from '../../shared/tabActivity';

export interface StatsControllerState {
  stats: DashboardStats | null;
  isLoading: boolean;
}

export function useStatsController(
  getDashboardStats: GetDashboardStatsUseCase,
): StatsControllerState {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep-alive: a aba monta visível (tabActive=true) e fica montada oculta;
  // o mesmo effect cobre o load inicial e o refresh silencioso ao reativar.
  const tabActive = useTabActive();
  useEffect(() => {
    if (!tabActive) return;
    void getDashboardStats.execute()
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, [tabActive]);

  return { stats, isLoading };
}
