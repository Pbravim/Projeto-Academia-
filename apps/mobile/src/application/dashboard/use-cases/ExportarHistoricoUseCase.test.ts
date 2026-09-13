import { describe, expect, it, vi } from 'vitest';

import { ExportarHistoricoUseCase } from './ExportarHistoricoUseCase';

vi.mock('expo-file-system', () => {
  const mockFileInstance = {
    uri: 'file:///cache/historico_2026-09-12.csv',
    write: vi.fn(),
    delete: vi.fn(),
  };
  return {
    File: vi.fn(function () { return mockFileInstance; }) as any,
    Paths: { cache: 'file:///cache/' },
  };
});

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

const seriesRow = {
  sessao_id: 's1',
  data_hora_inicio: '2024-01-15T10:00:00.000Z',
  data_hora_fim: '2024-01-15T11:00:00.000Z',
  treino_id: 'tr1',
  treino_nome_snapshot: 'Treino A',
  sessao_exercicio_id: 'se1',
  exercicio_ordem: 1,
  exercicio_id: 'ex1',
  nome_snapshot: 'Supino',
  grupo_muscular_snapshot: 'Peito',
  equipamento_snapshot: 'Barra',
  tracking_type_snapshot: 'reps_load',
  metodo: 'normal',
  grupo_id: null,
  substituido_por_exercicio_id: null,
  nome_original_snapshot: null,
  substituicao_motivo: null,
  serie_id: 'sr1',
  serie_ordem: 1,
  carga_kg: 80,
  repeticoes: 10,
  duracao_segundos: null,
  distancia_metros: null,
  intensidade: null,
  observacao: null,
};

function makeRepo(series = [seriesRow], segmentos: unknown[] = []) {
  return { listRowsParaExportacao: vi.fn().mockResolvedValue({ series, segmentos }) };
}

describe('ExportarHistoricoUseCase', () => {
  it('csv: creates a File named historico_<data>.csv and shares with mimeType text/csv', async () => {
    const { shareAsync } = await import('expo-sharing');
    const { File } = await import('expo-file-system');
    const historicoExportRepository = makeRepo();
    const useCase = new ExportarHistoricoUseCase({
      historicoExportRepository,
      now: () => new Date('2026-09-12T18:00:00.000Z'),
    });

    await useCase.execute('csv');

    expect(File).toHaveBeenCalledWith(expect.anything(), 'historico_2026-09-12.csv');
    expect(shareAsync).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ mimeType: 'text/csv' }));
  });

  it('json: creates a .json File, shares with mimeType application/json and writes a parseable schema', async () => {
    const { shareAsync } = await import('expo-sharing');
    const { File } = await import('expo-file-system');
    const mockFileInstance = vi.mocked(File).mock.results[0]?.value ?? (File as unknown as () => { write: (s: string) => void })();
    const historicoExportRepository = makeRepo();
    const useCase = new ExportarHistoricoUseCase({
      historicoExportRepository,
      now: () => new Date('2026-09-12T18:00:00.000Z'),
    });

    await useCase.execute('json');

    expect(File).toHaveBeenCalledWith(expect.anything(), 'historico_2026-09-12.json');
    expect(shareAsync).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ mimeType: 'application/json' }));
    const written = vi.mocked(mockFileInstance.write).mock.calls.at(-1)?.[0];
    expect(JSON.parse(written)).toMatchObject({ schema: 'projeto-academia/historico@2' });
  });

  it('throws when there are no rows to export', async () => {
    const historicoExportRepository = makeRepo([]);
    const useCase = new ExportarHistoricoUseCase({ historicoExportRepository });
    await expect(useCase.execute('csv')).rejects.toThrow('Nenhum historico para exportar.');
  });

  it('throws when sharing is not available', async () => {
    const { isAvailableAsync } = await import('expo-sharing');
    vi.mocked(isAvailableAsync).mockResolvedValueOnce(false);
    const historicoExportRepository = makeRepo();
    const useCase = new ExportarHistoricoUseCase({ historicoExportRepository });
    await expect(useCase.execute('csv')).rejects.toThrow('Compartilhamento nao disponivel neste dispositivo.');
  });

  it('uses the injected now() to fix the exported date', async () => {
    const { File } = await import('expo-file-system');
    const historicoExportRepository = makeRepo();
    const useCase = new ExportarHistoricoUseCase({
      historicoExportRepository,
      now: () => new Date('2020-05-01T00:00:00.000Z'),
    });

    await useCase.execute('csv');

    expect(File).toHaveBeenCalledWith(expect.anything(), 'historico_2020-05-01.csv');
  });
});
