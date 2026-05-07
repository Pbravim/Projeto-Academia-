import { describe, expect, it } from 'vitest';

import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';
import { SugerirProgressaoUseCase } from './SugerirProgressaoUseCase';

function makeExecucao(dataExecucao: string, series: { cargaKg: number; repeticoes: number; tipoSerie: 'valida' | 'aquecimento' }[]) {
  return {
    sessaoTreinoId: 'sessao_1',
    nomeSnapshot: 'Supino reto',
    dataExecucao,
    series: series.map((s, i) => ({ ...s, id: `sr_${i}`, observacao: null, ordem: i + 1 })),
  };
}

function makeDeps() {
  const historicoRepository = new InMemoryHistoricoRepository();
  const useCase = new SugerirProgressaoUseCase({ historicoRepository });
  return { historicoRepository, useCase };
}

describe('SugerirProgressaoUseCase', () => {
  it('retorna null quando execucoesRecomendadas é null', async () => {
    const { useCase } = makeDeps();

    const result = await useCase.execute({
      exercicioId: 'ex_1',
      execucoesRecomendadas: null,
      cargaPadrao: 80,
    });

    expect(result).toBeNull();
  });

  it('retorna null quando há menos de 2 execuções', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', makeExecucao('2026-05-01T10:00:00Z', [
      { cargaKg: 80, repeticoes: 10, tipoSerie: 'valida' },
    ]));

    const result = await useCase.execute({
      exercicioId: 'ex_1',
      execucoesRecomendadas: 10,
      cargaPadrao: 80,
    });

    expect(result).toBeNull();
  });

  it('retorna null quando uma das 2 execuções não atingiu a meta de reps', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', makeExecucao('2026-05-02T10:00:00Z', [
      { cargaKg: 80, repeticoes: 10, tipoSerie: 'valida' },
    ]));
    historicoRepository.seed('ex_1', makeExecucao('2026-05-01T10:00:00Z', [
      { cargaKg: 80, repeticoes: 8, tipoSerie: 'valida' },
    ]));

    const result = await useCase.execute({
      exercicioId: 'ex_1',
      execucoesRecomendadas: 10,
      cargaPadrao: 80,
    });

    expect(result).toBeNull();
  });

  it('retorna null quando execução não tem séries válidas', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', makeExecucao('2026-05-02T10:00:00Z', [
      { cargaKg: 60, repeticoes: 15, tipoSerie: 'aquecimento' },
    ]));
    historicoRepository.seed('ex_1', makeExecucao('2026-05-01T10:00:00Z', [
      { cargaKg: 80, repeticoes: 10, tipoSerie: 'valida' },
    ]));

    const result = await useCase.execute({
      exercicioId: 'ex_1',
      execucoesRecomendadas: 10,
      cargaPadrao: 80,
    });

    expect(result).toBeNull();
  });

  it('retorna sugestão de cargaPadrao + 2.5 quando ambas as execuções atingiram a meta', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', makeExecucao('2026-05-02T10:00:00Z', [
      { cargaKg: 80, repeticoes: 10, tipoSerie: 'valida' },
      { cargaKg: 80, repeticoes: 10, tipoSerie: 'valida' },
    ]));
    historicoRepository.seed('ex_1', makeExecucao('2026-05-01T10:00:00Z', [
      { cargaKg: 80, repeticoes: 12, tipoSerie: 'valida' },
    ]));

    const result = await useCase.execute({
      exercicioId: 'ex_1',
      execucoesRecomendadas: 10,
      cargaPadrao: 80,
    });

    expect(result).not.toBeNull();
    expect(result!.cargaSugerida).toBe(82.5);
  });

  it('usa carga máxima da última execução como referência quando cargaPadrao é null', async () => {
    const { historicoRepository, useCase } = makeDeps();
    historicoRepository.seed('ex_1', makeExecucao('2026-05-02T10:00:00Z', [
      { cargaKg: 85, repeticoes: 10, tipoSerie: 'valida' },
      { cargaKg: 80, repeticoes: 10, tipoSerie: 'valida' },
    ]));
    historicoRepository.seed('ex_1', makeExecucao('2026-05-01T10:00:00Z', [
      { cargaKg: 82, repeticoes: 10, tipoSerie: 'valida' },
    ]));

    const result = await useCase.execute({
      exercicioId: 'ex_1',
      execucoesRecomendadas: 10,
      cargaPadrao: null,
    });

    expect(result).not.toBeNull();
    expect(result!.cargaSugerida).toBe(87.5);
  });
});
