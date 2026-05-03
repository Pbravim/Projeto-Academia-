import { describe, expect, it } from 'vitest';

import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';
import { FinalizarSessaoUseCase } from './FinalizarSessaoUseCase';

function makeSessao(id = 'sessao_1') {
  return SessaoTreino.create({
    id,
    treinoId: 'treino_1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-05-02T10:00:00.000Z'),
  });
}

describe('FinalizarSessaoUseCase', () => {
  it('finalizes a session and sets dataHoraFim', async () => {
    const repo = new InMemorySessaoTreinoRepository();
    await repo.save(makeSessao());

    const useCase = new FinalizarSessaoUseCase({
      sessaoTreinoRepository: repo,
      now: () => new Date('2026-05-02T11:30:00.000Z'),
    });

    const result = await useCase.execute('sessao_1');

    expect(result.status).toBe('finalizada');
    expect(result.dataHoraFim).toBe('2026-05-02T11:30:00.000Z');
  });

  it('throws SessaoNotFoundError when session does not exist', async () => {
    const repo = new InMemorySessaoTreinoRepository();
    const useCase = new FinalizarSessaoUseCase({ sessaoTreinoRepository: repo, now: () => new Date() });

    await expect(useCase.execute('non_existent')).rejects.toThrow(SessaoNotFoundError);
  });
});
