import { describe, expect, it } from 'vitest';

import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';

import { GetUltimaExecucaoValidaUseCase } from './GetUltimaExecucaoValidaUseCase';

function makeDeps() {
  const historicoRepository = new InMemoryHistoricoRepository();
  const useCase = new GetUltimaExecucaoValidaUseCase({ historicoRepository });
  return { historicoRepository, useCase };
}

describe('GetUltimaExecucaoValidaUseCase', () => {
  it('retorna null quando nao ha historico', async () => {
    const { useCase } = makeDeps();
    const result = await useCase.execute('ex_1');
    expect(result).toBeNull();
  });

  it('retorna null quando nao ha series registradas', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', {
      sessaoTreinoId: 'sessao_1',
      dataExecucao: '2026-04-01T10:00:00.000Z',
      nomeSnapshot: 'Supino reto',
      series: [],
    });
    const result = await useCase.execute('ex_1');
    expect(result).toBeNull();
  });

  it('retorna a melhor serie por 1RM da sessao mais recente', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', {
      sessaoTreinoId: 'sessao_1',
      dataExecucao: '2026-04-01T10:00:00.000Z',
      nomeSnapshot: 'Supino reto',
      series: [
        { id: 's1', cargaKg: 80, repeticoes: 10, observacao: null, ordem: 1, tipoSerie: 'valida' },
        { id: 's2', cargaKg: 85, repeticoes: 8, observacao: null, ordem: 2, tipoSerie: 'valida' },
      ],
    });

    const result = await useCase.execute('ex_1');
    expect(result?.cargaKg).toBe(85);
    expect(result?.dataExecucao).toBe('2026-04-01T10:00:00.000Z');
  });

  it('prioriza sessao mais recente', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', {
      sessaoTreinoId: 'sessao_1',
      dataExecucao: '2026-04-01T10:00:00.000Z',
      nomeSnapshot: 'Supino reto',
      series: [
        { id: 's1', cargaKg: 80, repeticoes: 10, observacao: null, ordem: 1, tipoSerie: 'valida' },
      ],
    });
    historicoRepository.seed('ex_1', {
      sessaoTreinoId: 'sessao_2',
      dataExecucao: '2026-04-08T10:00:00.000Z',
      nomeSnapshot: 'Supino reto',
      series: [
        { id: 's2', cargaKg: 85, repeticoes: 8, observacao: null, ordem: 1, tipoSerie: 'valida' },
      ],
    });

    const result = await useCase.execute('ex_1');
    expect(result?.cargaKg).toBe(85);
    expect(result?.dataExecucao).toBe('2026-04-08T10:00:00.000Z');
  });

  it('nao retorna historico de outro exercicio', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_2', {
      sessaoTreinoId: 'sessao_1',
      dataExecucao: '2026-04-01T10:00:00.000Z',
      nomeSnapshot: 'Agachamento',
      series: [],
    });

    const result = await useCase.execute('ex_1');
    expect(result).toBeNull();
  });
});
