import { describe, expect, it, vi } from 'vitest';

import { act,renderHook } from '../../../test/renderHook';

import { useHistoricoExercicioController } from './useHistoricoExercicioController';

vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

/**
 * Regressão P2 (rodada 3, apêndice E): erro de load era só logado e a tela caía
 * no empty state "nenhuma execução" — usuário via "sem histórico" para um
 * exercício que TEM histórico, sem opção de tentar de novo.
 */

const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never;

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useHistoricoExercicioController — erro de load', () => {
  it('expõe errorMessage no erro e onRetry recarrega com sucesso', async () => {
    const execucao = {
      sessaoTreinoId: 's1',
      dataExecucao: '2026-07-01T10:00:00.000Z',
      nomeSnapshot: 'Supino',
      series: [{ id: 'sr1', cargaKg: 80, repeticoes: 8, tipoSerie: 'valida' as const, observacao: null, ordem: 1 }],
    };
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('db falhou'))
      .mockResolvedValueOnce([execucao]);

    const { result } = await renderHook(() =>
      useHistoricoExercicioController('ex-1', 'Supino', { getHistoricoExercicio: { execute } as never, logger }, vi.fn()),
    );
    await flush();

    // Erro não pode virar empty state silencioso.
    expect(result.current.errorMessage).not.toBeNull();

    await act(async () => {
      await result.current.onRetry();
    });
    await flush();

    expect(result.current.errorMessage).toBeNull();
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
