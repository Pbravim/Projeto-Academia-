import { describe, expect, it, vi } from 'vitest';

import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';

import { GetHistoricoAnteriorDaSessaoUseCase } from './GetHistoricoAnteriorDaSessaoUseCase';

describe('GetHistoricoAnteriorDaSessaoUseCase', () => {
  it('excludes current, same-time and later sessions and uses one bulk read', async () => {
    const repo = new InMemoryHistoricoRepository();
    for (const [id, data] of [['old', '01'], ['current', '01'], ['same', '02'], ['future', '03']]) {
      repo.seed('ex', { sessaoTreinoId: id, dataExecucao: `2026-10-${data}T10:00:00Z`, nomeSnapshot: 'Supino', series: [] });
    }
    const bulk = vi.spyOn(repo, 'getHistoricoExercicios');
    const result = await new GetHistoricoAnteriorDaSessaoUseCase(repo).execute({
      sessaoId: 'current', inicio: '2026-10-02T10:00:00Z', exercicioIds: ['ex', 'ex', 'new'],
    });
    expect(result.get('ex')?.map((ex) => ex.sessaoTreinoId)).toEqual(['old']);
    expect(result.get('new')).toEqual([]);
    expect(bulk).toHaveBeenCalledExactlyOnceWith(['ex', 'new']);
  });
});
