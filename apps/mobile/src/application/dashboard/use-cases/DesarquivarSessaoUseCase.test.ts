import { describe, expect, it, vi } from 'vitest';
import type { DashboardRepository } from '../../../domain/dashboard/repositories/DashboardRepository';
import { DesarquivarSessaoUseCase } from './DesarquivarSessaoUseCase';

describe('DesarquivarSessaoUseCase', () => {
  it('calls desarquivarSessao with the sessaoId', async () => {
    const repo = { desarquivarSessao: vi.fn().mockResolvedValue(1) } as unknown as DashboardRepository;
    await new DesarquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1');
    expect(repo.desarquivarSessao).toHaveBeenCalledWith('s1');
  });

  it('throws SessaoNotFoundError when rowsAffected is 0', async () => {
    const repo = { desarquivarSessao: vi.fn().mockResolvedValue(0) } as unknown as DashboardRepository;
    await expect(
      new DesarquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1')
    ).rejects.toThrow();
  });
});
