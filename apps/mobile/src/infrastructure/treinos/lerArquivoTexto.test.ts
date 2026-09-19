import * as DocumentPicker from 'expo-document-picker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lerArquivoTexto } from './lerArquivoTexto';

const mockFileInstance = vi.hoisted(() => ({
  text: vi.fn().mockResolvedValue('{"schema":"projeto-academia/treino@1"}'),
}));

vi.mock('expo-file-system', () => ({
  File: vi.fn(function () { return mockFileInstance; }) as unknown,
}));

vi.mock('expo-document-picker', () => ({
  getDocumentAsync: vi.fn(),
}));

describe('lerArquivoTexto', () => {
  beforeEach(() => {
    mockFileInstance.text.mockClear();
  });

  it('devolve null quando o usuário cancela a escolha', async () => {
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null } as never);

    const result = await lerArquivoTexto();

    expect(result).toBeNull();
  });

  it('devolve o texto do arquivo escolhido', async () => {
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/treino.json' } as never],
    } as never);

    const result = await lerArquivoTexto();

    expect(result).toBe('{"schema":"projeto-academia/treino@1"}');
  });

  it('pede tipos json/texto/qualquer e copyToCacheDirectory', async () => {
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null } as never);

    await lerArquivoTexto();

    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      })
    );
  });
});
