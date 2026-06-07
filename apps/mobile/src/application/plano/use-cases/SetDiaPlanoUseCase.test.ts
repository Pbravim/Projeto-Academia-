import { describe, expect, it, vi } from 'vitest';
import type { PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import { SetDiaPlanoUseCase } from './SetDiaPlanoUseCase';

describe('SetDiaPlanoUseCase', () => {
  it('passes null when treinoId is null', async () => {
    const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as unknown as PlanoSemanalRepository;
    await new SetDiaPlanoUseCase(repo).execute('seg', null);
    expect(repo.setDia).toHaveBeenCalledWith('seg', null);
  });

  it('passes treinoId when non-empty', async () => {
    const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as unknown as PlanoSemanalRepository;
    await new SetDiaPlanoUseCase(repo).execute('seg', 't1');
    expect(repo.setDia).toHaveBeenCalledWith('seg', 't1');
  });

  it('converts empty string to null', async () => {
    const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as unknown as PlanoSemanalRepository;
    await new SetDiaPlanoUseCase(repo).execute('seg', '');
    expect(repo.setDia).toHaveBeenCalledWith('seg', null);
  });

  it('converts whitespace-only string to null', async () => {
    const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as unknown as PlanoSemanalRepository;
    await new SetDiaPlanoUseCase(repo).execute('seg', '   ');
    expect(repo.setDia).toHaveBeenCalledWith('seg', null);
  });
});
