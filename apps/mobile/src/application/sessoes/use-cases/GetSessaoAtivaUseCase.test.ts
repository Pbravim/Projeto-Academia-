import { describe, expect, it } from 'vitest';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { GetSessaoAtivaUseCase } from './GetSessaoAtivaUseCase';

function makeSessaoAtiva(id = 's1') {
  return SessaoTreino.create({
    id,
    treinoId: 't1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-01-01T10:00:00Z'),
  });
}

describe('GetSessaoAtivaUseCase', () => {
  it('returns null when no active session', async () => {
    const repo = new InMemorySessaoTreinoRepository();
    const result = await new GetSessaoAtivaUseCase(repo).execute();
    expect(result).toBeNull();
  });

  it('returns active session', async () => {
    const repo = new InMemorySessaoTreinoRepository();
    await repo.save(makeSessaoAtiva('s1'));
    const result = await new GetSessaoAtivaUseCase(repo).execute();
    expect(result?.id).toBe('s1');
  });

  it('returns null after session is finalized', async () => {
    const repo = new InMemorySessaoTreinoRepository();
    const sessao = makeSessaoAtiva('s1');
    const finalizada = sessao.finalizar(new Date('2026-01-01T11:00:00Z'));
    await repo.save(finalizada);
    const result = await new GetSessaoAtivaUseCase(repo).execute();
    expect(result).toBeNull();
  });
});
