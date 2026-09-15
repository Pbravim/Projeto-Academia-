import { describe, expect, it } from 'vitest';

import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoJaAtivaError } from '../errors/SessaoJaAtivaError';

import { IniciarSessaoLivreUseCase } from './IniciarSessaoLivreUseCase';

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  let counter = 0;
  const useCase = new IniciarSessaoLivreUseCase({
    sessaoTreinoRepository,
    idGenerator: () => `sessao_${++counter}`,
    now: () => new Date('2026-09-15T10:00:00.000Z'),
  });
  return { sessaoTreinoRepository, useCase };
}

describe('IniciarSessaoLivreUseCase (#33 — D5)', () => {
  it('cria a sessao com treinoId null e o snapshot igual ao nome informado', async () => {
    const { useCase } = makeDeps();

    const sessao = await useCase.execute({ nome: 'Treino livre 15/09' });

    expect(sessao.treinoId).toBeNull();
    expect(sessao.treinoNomeSnapshot).toBe('Treino livre 15/09');
    expect(sessao.status).toBe('em_andamento');
  });

  it('rejeita iniciar quando ja existe sessao ativa', async () => {
    const { sessaoTreinoRepository, useCase } = makeDeps();
    await sessaoTreinoRepository.save(
      SessaoTreino.create({ id: 'sessao_existente', treinoId: null, treinoNomeSnapshot: 'Ja ativa', dataHoraInicio: new Date() })
    );

    await expect(useCase.execute({ nome: 'Treino livre 15/09' })).rejects.toBeInstanceOf(SessaoJaAtivaError);
  });

  it('rejeita nome vazio ou muito curto', async () => {
    const { useCase } = makeDeps();

    await expect(useCase.execute({ nome: '' })).rejects.toBeInstanceOf(SessaoValidationError);
    await expect(useCase.execute({ nome: ' a ' })).rejects.toBeInstanceOf(SessaoValidationError);
  });

  it('usa withTransaction quando a dependencia database e informada', async () => {
    const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
    const chamadas: string[] = [];
    const database = {
      withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
        chamadas.push('withTransaction');
        return fn();
      },
    };
    const useCase = new IniciarSessaoLivreUseCase({
      sessaoTreinoRepository,
      idGenerator: () => 'sessao_1',
      now: () => new Date('2026-09-15T10:00:00.000Z'),
      database,
    });

    await useCase.execute({ nome: 'Treino livre 15/09' });

    expect(chamadas).toEqual(['withTransaction']);
  });
});
