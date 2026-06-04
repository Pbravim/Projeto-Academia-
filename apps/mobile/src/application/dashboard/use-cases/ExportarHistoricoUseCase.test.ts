import { describe, expect, it, vi } from 'vitest';
import { ExportarHistoricoUseCase } from './ExportarHistoricoUseCase';

vi.mock('expo-file-system', () => {
  const mockFileInstance = {
    uri: 'file:///docs/historico_treinos.csv',
    write: vi.fn(),
    delete: vi.fn(),
  };
  return {
    File: vi.fn(function () { return mockFileInstance; }) as any,
    Paths: { document: 'file:///docs/' },
  };
});

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

describe('ExportarHistoricoUseCase', () => {
  const row = {
    data_hora_inicio: '2024-01-15T10:00:00Z',
    treino_nome: 'Treino A',
    exercicio_nome: 'Supino',
    serie_ordem: 1,
    carga_kg: 80,
    repeticoes: 10,
    observacao: null,
  };

  it('calls shareAsync when there is data to export', async () => {
    const { shareAsync } = await import('expo-sharing');
    const database = { getAll: vi.fn().mockResolvedValue([row]) } as never;
    const useCase = new ExportarHistoricoUseCase({ database });
    await useCase.execute();
    expect(shareAsync).toHaveBeenCalled();
  });

  it('throws when there are no rows to export', async () => {
    const database = { getAll: vi.fn().mockResolvedValue([]) } as never;
    const useCase = new ExportarHistoricoUseCase({ database });
    await expect(useCase.execute()).rejects.toThrow('Nenhum historico para exportar.');
  });

  it('throws when sharing is not available', async () => {
    const { isAvailableAsync } = await import('expo-sharing');
    vi.mocked(isAvailableAsync).mockResolvedValueOnce(false);
    const database = { getAll: vi.fn().mockResolvedValue([row]) } as never;
    const useCase = new ExportarHistoricoUseCase({ database });
    await expect(useCase.execute()).rejects.toThrow('Compartilhamento nao disponivel neste dispositivo.');
  });
});
