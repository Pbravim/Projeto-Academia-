import { useEffect, useState } from 'react';
import type { GetDashboardStatsUseCase, DashboardStats } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';

export interface StatsControllerState {
  stats: DashboardStats | null;
  isLoading: boolean;
}

export function useStatsController(
  getDashboardStats: GetDashboardStatsUseCase,
): StatsControllerState {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void getDashboardStats.execute()
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  return { stats, isLoading };
}
