import { describe, expect, it, vi } from 'vitest';

import type { DashboardRepository, DashboardStats } from '../../../domain/dashboard/repositories/DashboardRepository';

import { GetDashboardStatsUseCase } from './GetDashboardStatsUseCase';

describe('GetDashboardStatsUseCase', () => {
  it('returns stats from repository', async () => {
    const stats = { totalSessoes: 5 } as unknown as DashboardStats;
    const repo = { getStats: vi.fn().mockResolvedValue(stats) } as unknown as DashboardRepository;
    const result = await new GetDashboardStatsUseCase({ dashboardRepository: repo }).execute();
    expect(result).toEqual(stats);
    expect(repo.getStats).toHaveBeenCalledOnce();
  });

  it('propagates errors from repository', async () => {
    const repo = { getStats: vi.fn().mockRejectedValue(new Error('db error')) } as unknown as DashboardRepository;
    await expect(
      new GetDashboardStatsUseCase({ dashboardRepository: repo }).execute()
    ).rejects.toThrow('db error');
  });
});
