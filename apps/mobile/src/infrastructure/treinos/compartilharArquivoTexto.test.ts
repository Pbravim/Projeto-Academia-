import { beforeEach, describe, expect, it, vi } from 'vitest';

import { compartilharArquivoTexto } from './compartilharArquivoTexto';

const mockFileInstance = vi.hoisted(() => ({
  uri: 'file:///cache/treino_treino-a.json',
  write: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('expo-file-system', () => ({
  File: vi.fn(function () { return mockFileInstance; }) as unknown,
  Paths: { cache: 'file:///cache/' },
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

describe('compartilharArquivoTexto', () => {
  beforeEach(() => {
    mockFileInstance.write.mockClear();
    mockFileInstance.delete.mockClear();
  });

  it('escreve o conteudo, compartilha com mimeType application/json e apaga o arquivo depois', async () => {
    const { shareAsync } = await import('expo-sharing');
    const { File } = await import('expo-file-system');

    await compartilharArquivoTexto('treino_treino-a.json', '{"schema":"x"}');

    expect(File).toHaveBeenCalledWith(expect.anything(), 'treino_treino-a.json');
    expect(mockFileInstance.write).toHaveBeenCalledWith('{"schema":"x"}');
    expect(shareAsync).toHaveBeenCalledWith(
      mockFileInstance.uri,
      expect.objectContaining({ mimeType: 'application/json', UTI: 'public.json' })
    );
    expect(mockFileInstance.delete).toHaveBeenCalledTimes(1);
  });

  it('lanca quando o compartilhamento nao esta disponivel', async () => {
    const { isAvailableAsync } = await import('expo-sharing');
    vi.mocked(isAvailableAsync).mockResolvedValueOnce(false);

    await expect(compartilharArquivoTexto('treino_x.json', '{}')).rejects.toThrow(
      'Compartilhamento nao disponivel neste dispositivo.'
    );
  });

  it('apaga o arquivo mesmo se shareAsync rejeitar', async () => {
    const { shareAsync } = await import('expo-sharing');
    vi.mocked(shareAsync).mockRejectedValueOnce(new Error('share falhou'));

    await expect(compartilharArquivoTexto('treino_x.json', '{}')).rejects.toThrow('share falhou');

    expect(mockFileInstance.delete).toHaveBeenCalledTimes(1);
  });
});
