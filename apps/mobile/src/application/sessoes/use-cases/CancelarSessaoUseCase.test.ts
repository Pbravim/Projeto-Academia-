import { describe, expect, it } from 'vitest';

import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
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
    const { sessaoTreinoRepository, sessaoExercicioRepository, serieRegistradaRepository, useCase } = makeDeps();

    await sessaoTreinoRepository.save(makeSessao('sessao_1'));

    const exercicio = SessaoExercicio.create({
      id: 'se_1',
      sessaoTreinoId: 'sessao_1',
      exercicioId: 'ex_1',
      nomeSnapshot: 'Supino',
      grupoMuscularSnapshot: 'Peito',
      categoriaSnapshot: 'Composto',
      equipamentoSnapshot: null,
      musculoAlvoSnapshot: null,
      realizado: false,
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      cargaPadrao: null,
      tempoDescansoSegundos: null,
      metodo: 'normal' as const,
      grupoId: null,
      substituidoPorExercicioId: null,
      substituicaoMotivo: null,
      nomeOriginalSnapshot: null,
      ordem: 1,
    });
    await sessaoExercicioRepository.save(exercicio);

    const serie = SerieRegistrada.create({
      id: 'sr_1',
      sessaoExercicioId: 'se_1',
      tipoSerie: 'valida',
      cargaKg: 80,
      repeticoes: 10,
      ordem: 1,
    });
    await serieRegistradaRepository.save(serie);

    await useCase.execute('sessao_1');

    const sessoesRestantes = await sessaoTreinoRepository.findById('sessao_1');
    const exerciciosRestantes = await sessaoExercicioRepository.listBySessaoId('sessao_1');
    const seriesRestantes = await serieRegistradaRepository.listBySessaoExercicioId('se_1');

    expect(sessoesRestantes).toBeNull();
    expect(exerciciosRestantes).toHaveLength(0);
    expect(seriesRestantes).toHaveLength(0);
  });

  it('repositórios ficam vazios após cancelamento com múltiplos exercícios e séries', async () => {
    const { sessaoTreinoRepository, sessaoExercicioRepository, serieRegistradaRepository, useCase } = makeDeps();

    await sessaoTreinoRepository.save(makeSessao('sessao_1'));

    for (let i = 1; i <= 3; i++) {
      const ex = SessaoExercicio.create({
        id: `se_${i}`,
        sessaoTreinoId: 'sessao_1',
        exercicioId: `ex_${i}`,
        nomeSnapshot: `Exercicio ${i}`,
        grupoMuscularSnapshot: 'Peito',
        categoriaSnapshot: 'Composto',
        equipamentoSnapshot: null,
        musculoAlvoSnapshot: null,
        realizado: false,
        seriesRecomendadas: null,
        execucoesRecomendadas: null,
        cargaPadrao: null,
        tempoDescansoSegundos: null,
        metodo: 'normal' as const,
        grupoId: null,
        substituidoPorExercicioId: null,
        substituicaoMotivo: null,
        nomeOriginalSnapshot: null,
        ordem: i,
      });
      await sessaoExercicioRepository.save(ex);

      const serie = SerieRegistrada.create({
        id: `sr_${i}`,
        sessaoExercicioId: `se_${i}`,
        tipoSerie: 'valida',
        cargaKg: 60 + i * 5,
        repeticoes: 10,
        ordem: 1,
      });
      await serieRegistradaRepository.save(serie);
    }

    await useCase.execute('sessao_1');

    expect(await sessaoTreinoRepository.findById('sessao_1')).toBeNull();
    expect(await sessaoExercicioRepository.listBySessaoId('sessao_1')).toHaveLength(0);
    for (let i = 1; i <= 3; i++) {
      expect(await serieRegistradaRepository.listBySessaoExercicioId(`se_${i}`)).toHaveLength(0);
    }
  });
});
