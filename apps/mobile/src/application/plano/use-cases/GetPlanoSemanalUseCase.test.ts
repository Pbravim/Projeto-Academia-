import { describe, expect, it } from 'vitest';

import { InMemoryPlanoSemanalRepository } from '../../../infrastructure/plano/InMemoryPlanoSemanalRepository';
import { GetPlanoSemanalUseCase } from './GetPlanoSemanalUseCase';

describe('GetPlanoSemanalUseCase', () => {
  it('retorna o plano vazio quando nada foi definido', async () => {
    const repo = new InMemoryPlanoSemanalRepository();
    const useCase = new GetPlanoSemanalUseCase(repo);

    const plano = await useCase.execute();

    expect(plano).toEqual({
      seg: null, ter: null, qua: null, qui: null, sex: null, sab: null, dom: null,
    });
  });

  it('retorna o plano com os dias definidos no repositório', async () => {
    const repo = new InMemoryPlanoSemanalRepository();
    await repo.setPlano({ seg: 't1', qua: 't2' });
    const useCase = new GetPlanoSemanalUseCase(repo);

    const plano = await useCase.execute();

    expect(plano.seg).toBe('t1');
    expect(plano.qua).toBe('t2');
    expect(plano.ter).toBeNull();
  });
});
