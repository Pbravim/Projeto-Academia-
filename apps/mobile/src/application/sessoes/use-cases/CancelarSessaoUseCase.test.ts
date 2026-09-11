import { describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

import { CancelarSessaoUseCase } from './CancelarSessaoUseCase';

function makeDeps() {
  const sessaoTreinoRepository = new InMemorySessaoTreinoRepository();
  const sessaoExercicioRepository = new InMemorySessaoExercicioRepository();
  const serieRegistradaRepository = new InMemorySerieRegistradaRepository();
  const useCase = new CancelarSessaoUseCase({
    sessaoTreinoRepository,
    sessaoExercicioRepository,
    serieRegistradaRepository,
  });
  return { sessaoTreinoRepository, sessaoExercicioRepository, serieRegistradaRepository, useCase };
}

function makeSessao(id = 'sessao_1') {
  return SessaoTreino.create({
    id,
    treinoId: 'treino_1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-05-02T10:00:00.000Z'),
  });
}

describe('CancelarSessaoUseCase', () => {
  it('lança SessaoNotFoundError quando sessão não existe', async () => {
    const { useCase } = makeDeps();

    await expect(useCase.execute('inexistente')).rejects.toThrow(SessaoNotFoundError);
  });

  it('lança SessaoEncerradaError quando sessão já foi finalizada', async () => {
    const { sessaoTreinoRepository, useCase } = makeDeps();

    const sessaoFinalizada = makeSessao('sessao_1').finalizar(new Date());
    await sessaoTreinoRepository.save(sessaoFinalizada);

    await expect(useCase.execute('sessao_1')).rejects.toThrow(SessaoEncerradaError);
  });

  it('remove sessão, exercícios e séries em cascata', async () => {
    const { sessaoTreinoRepository, useCase } = makeDeps();

    await sessaoTreinoRepository.save(makeSessao('sessao_1'));

    await useCase.execute('sessao_1');

    const sessaoRestante = await sessaoTreinoRepository.findById('sessao_1');
    expect(sessaoRestante).not.toBeNull();
    expect(sessaoRestante!.toPrimitives().status).toBe('cancelada');
  });

  it('repositórios ficam vazios após cancelamento com múltiplos exercícios e séries', async () => {
    const { sessaoTreinoRepository, useCase } = makeDeps();

    await sessaoTreinoRepository.save(makeSessao('sessao_1'));

    await useCase.execute('sessao_1');

    const sessaoRestante = await sessaoTreinoRepository.findById('sessao_1');
    expect(sessaoRestante).not.toBeNull();
    expect(sessaoRestante!.toPrimitives().status).toBe('cancelada');
  });

  it('leaves the session in the repository with status cancelada instead of deleting it', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const sessaoExercicioRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();

    const sessao = SessaoTreino.create({
      id: 'sessao-1',
      treinoId: 'treino-1',
      treinoNomeSnapshot: 'Treino A',
      dataHoraInicio: new Date('2026-05-22T09:00:00.000Z'),
    });
    await sessaoRepo.save(sessao);

    const uc = new CancelarSessaoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: sessaoExercicioRepo,
      serieRegistradaRepository: serieRepo,
    });
    await uc.execute('sessao-1');

    const found = await sessaoRepo.findById('sessao-1');
    expect(found).not.toBeNull();
    expect(found!.toPrimitives().status).toBe('cancelada');

    const ativa = await sessaoRepo.findAtiva();
    expect(ativa).toBeNull();
  });
});
