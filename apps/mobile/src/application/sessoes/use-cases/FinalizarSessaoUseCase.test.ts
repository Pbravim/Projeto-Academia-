import { describe, expect, it } from 'vitest';

import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';
import { FinalizarSessaoUseCase } from './FinalizarSessaoUseCase';

function makeRepo() {
  return new InMemorySessaoTreinoRepository();
}

function makeUseCase(repo: InMemorySessaoTreinoRepository) {
  return new FinalizarSessaoUseCase({
    sessaoTreinoRepository: repo,
    now: () => new Date('2026-05-22T10:00:00.000Z'),
  });
}

function makeActiveSessao(id = 'sessao-1') {
  return SessaoTreino.create({
    id,
    treinoId: 'treino-1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-05-22T09:00:00.000Z'),
  });
}

describe('FinalizarSessaoUseCase', () => {
  it('finalizes an active session and sets dataHoraFim', async () => {
    const repo = makeRepo();
    await repo.save(makeActiveSessao());

    const result = await makeUseCase(repo).execute('sessao-1');

    expect(result.status).toBe('finalizada');
    expect(result.dataHoraFim).toBe('2026-05-22T10:00:00.000Z');

    // Relê o repositório: o retorno correto não prova a persistência — uma
    // mutação que remove o save() passava com asserts só sobre `result`.
    const persistida = await repo.findById('sessao-1');
    expect(persistida?.toPrimitives()).toMatchObject({
      status: 'finalizada',
      dataHoraFim: '2026-05-22T10:00:00.000Z',
    });
  });

  it('throws SessaoNotFoundError when session does not exist', async () => {
    const repo = makeRepo();

    await expect(makeUseCase(repo).execute('nao-existe')).rejects.toThrow(SessaoNotFoundError);
  });

  it('throws SessaoEncerradaError when re-finalizing an already finished session', async () => {
    const repo = makeRepo();
    const finalizada = makeActiveSessao().finalizar(new Date('2026-05-22T09:30:00.000Z'));
    await repo.save(finalizada);

    await expect(makeUseCase(repo).execute('sessao-1')).rejects.toThrow(SessaoEncerradaError);
  });
});

describe('SessaoTreino.cancelar', () => {
  it('returns a new entity with status cancelada', () => {
    const sessao = SessaoTreino.create({
      id: 's1',
      treinoId: 't1',
      treinoNomeSnapshot: 'A',
      dataHoraInicio: new Date('2026-05-22T08:00:00.000Z'),
    });

    const cancelada = sessao.cancelar();

    expect(cancelada.toPrimitives().status).toBe('cancelada');
    expect(cancelada.isAtiva()).toBe(false);
  });

  it('use case rejeita finalizar uma sessão cancelada (P3-F: teste antigo não assertava throw)', async () => {
    const repo = makeRepo();
    await repo.save(makeActiveSessao().cancelar());

    await expect(makeUseCase(repo).execute('sessao-1')).rejects.toThrow(SessaoEncerradaError);
  });
});
