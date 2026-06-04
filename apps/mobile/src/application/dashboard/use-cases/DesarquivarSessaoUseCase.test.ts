import { describe, expect, it, vi } from 'vitest';
import { DesarquivarSessaoUseCase } from './DesarquivarSessaoUseCase';

describe('DesarquivarSessaoUseCase', () => {
  it('calls desarquivarSessao with the sessaoId', async () => {
    const repo = { desarquivarSessao: vi.fn().mockResolvedValue(1) } as never;
    await new DesarquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1');
    expect(repo.desarquivarSessao).toHaveBeenCalledWith('s1');
  });

  it('throws SessaoNotFoundError when rowsAffected is 0', async () => {
    const repo = { desarquivarSessao: vi.fn().mockResolvedValue(0) } as never;
    await expect(
      new DesarquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1')
    ).rejects.toThrow();
  });
});
