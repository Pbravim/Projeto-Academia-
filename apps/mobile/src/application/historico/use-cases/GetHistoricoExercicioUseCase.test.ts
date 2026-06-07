import { describe, expect, it } from 'vitest';

import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';
import { GetHistoricoExercicioUseCase } from './GetHistoricoExercicioUseCase';

function makeDeps() {
  const historicoRepository = new InMemoryHistoricoRepository();
  const useCase = new GetHistoricoExercicioUseCase({ historicoRepository });
  return { historicoRepository, useCase };
}

describe('GetHistoricoExercicioUseCase', () => {
  it('retorna lista vazia quando nao ha historico', async () => {
    const { useCase } = makeDeps();
    const result = await useCase.execute('ex_1');
    expect(result).toHaveLength(0);
  });

  it('retorna execucoes em ordem decrescente por data', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', {
      sessaoTreinoId: 'sessao_1',
      dataExecucao: '2026-04-01T10:00:00.000Z',
      nomeSnapshot: 'Supino reto', series: [],
    });
    historicoRepository.seed('ex_1', {
      sessaoTreinoId: 'sessao_2',
      dataExecucao: '2026-04-08T10:00:00.000Z',
      nomeSnapshot: 'Supino reto', series: [],
    });

    const result = await useCase.execute('ex_1');
    expect(result).toHaveLength(2);
    expect(result[0].sessaoTreinoId).toBe('sessao_2');
    expect(result[1].sessaoTreinoId).toBe('sessao_1');
  });

  it('retorna todas as series da execucao', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', {
      sessaoTreinoId: 'sessao_1',
      dataExecucao: '2026-04-01T10:00:00.000Z',
      nomeSnapshot: 'Supino reto',
      series: [
        { id: 's1', cargaKg: 80, repeticoes: 10, observacao: null, ordem: 1, tipoSerie: 'valida' },
        { id: 's2', cargaKg: 85, repeticoes: 8, observacao: null, ordem: 2, tipoSerie: 'valida' },
        { id: 's3', cargaKg: 90, repeticoes: 6, observacao: 'pesado', ordem: 3, tipoSerie: 'valida' },
      ],
    });

    const result = await useCase.execute('ex_1');
    expect(result[0].series).toHaveLength(3);
    expect(result[0].series[2].observacao).toBe('pesado');
  });

  it('nao retorna historico de outro exercicio', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_2', {
      sessaoTreinoId: 'sessao_1',
      dataExecucao: '2026-04-01T10:00:00.000Z',
      nomeSnapshot: 'Agachamento', series: [],
    });

    const result = await useCase.execute('ex_1');
    expect(result).toHaveLength(0);
  });
});
