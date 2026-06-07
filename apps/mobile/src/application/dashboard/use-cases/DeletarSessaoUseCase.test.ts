import { describe, expect, it, vi } from 'vitest';
import type { DashboardRepository } from '../../../domain/dashboard/repositories/DashboardRepository';
import { DeletarSessaoUseCase } from './DeletarSessaoUseCase';

describe('DeletarSessaoUseCase', () => {
  it('calls deletarSessao with the sessaoId', async () => {
    const repo = { deletarSessao: vi.fn().mockResolvedValue(undefined) } as unknown as DashboardRepository;
    await new DeletarSessaoUseCase({ dashboardRepository: repo }).execute('s1');
    expect(repo.deletarSessao).toHaveBeenCalledWith('s1');
  });

  it('resolves without throwing when deletarSessao succeeds', async () => {
    const repo = { deletarSessao: vi.fn().mockResolvedValue(undefined) } as unknown as DashboardRepository;
    await expect(
      new DeletarSessaoUseCase({ dashboardRepository: repo }).execute('s2')
    ).resolves.toBeUndefined();
  });
});
