import { describe, expect, it, vi } from 'vitest';

import type { DashboardRepository, ExercicioEvolucao } from '../../../domain/dashboard/repositories/DashboardRepository';

import { GetTreinoEvolucaoUseCase } from './GetTreinoEvolucaoUseCase';

describe('GetTreinoEvolucaoUseCase', () => {
  it('returns evolucao for given treinoId', async () => {
    const data = [{ exercicioId: 'ex1' }] as unknown as ExercicioEvolucao[];
    const repo = { getEvolucaoExercicios: vi.fn().mockResolvedValue(data) } as unknown as DashboardRepository;
    const result = await new GetTreinoEvolucaoUseCase({ dashboardRepository: repo }).execute('t1');
    expect(result).toEqual(data);
    expect(repo.getEvolucaoExercicios).toHaveBeenCalledWith('t1');
  });

  it('propagates errors from repository', async () => {
    const repo = { getEvolucaoExercicios: vi.fn().mockRejectedValue(new Error('db error')) } as unknown as DashboardRepository;
    await expect(
      new GetTreinoEvolucaoUseCase({ dashboardRepository: repo }).execute('t1')
    ).rejects.toThrow('db error');
  });
});
