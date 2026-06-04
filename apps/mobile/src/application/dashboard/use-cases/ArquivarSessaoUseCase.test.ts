import { describe, expect, it, vi } from 'vitest';
import { ArquivarSessaoUseCase } from './ArquivarSessaoUseCase';

describe('ArquivarSessaoUseCase', () => {
  it('calls arquivarSessao with the sessaoId', async () => {
    const repo = { arquivarSessao: vi.fn().mockResolvedValue(1) } as never;
    await new ArquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1');
    expect(repo.arquivarSessao).toHaveBeenCalledWith('s1');
  });

  it('throws SessaoNotFoundError when rowsAffected is 0', async () => {
    const repo = { arquivarSessao: vi.fn().mockResolvedValue(0) } as never;
    await expect(
      new ArquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1')
    ).rejects.toThrow();
  });
});
