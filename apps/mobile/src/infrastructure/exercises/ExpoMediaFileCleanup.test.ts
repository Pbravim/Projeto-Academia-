import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppLogger } from '../logging/AppLogger';

import { ExpoMediaFileCleanup } from './ExpoMediaFileCleanup';

// Estado controlado pelo teste: o que o `File` nativo devolve/faz em cada caso.
const nativeFile = vi.hoisted(() => ({
  exists: true,
  delete: vi.fn(),
  /** Quando setado, o construtor de `File` lança (API nativa recusando o URI). */
  constructorError: null as Error | null,
}));

const FileCtor = vi.hoisted(() => vi.fn());

vi.mock('expo-file-system', () => ({
  File: FileCtor,
}));

describe('ExpoMediaFileCleanup', () => {
  const logger: AppLogger = { info: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    nativeFile.exists = true;
    nativeFile.constructorError = null;
    nativeFile.delete.mockReset();
    FileCtor.mockReset();
    // `function` (não arrow): o código sob teste chama `new File(uri)`.
    FileCtor.mockImplementation(function () {
      if (nativeFile.constructorError) throw nativeFile.constructorError;
      return {
        get exists() {
          return nativeFile.exists;
        },
        delete: nativeFile.delete,
      };
    } as unknown as () => unknown);
    (logger.info as ReturnType<typeof vi.fn>).mockReset();
    (logger.error as ReturnType<typeof vi.fn>).mockReset();
  });

  it('apaga o arquivo quando o URI file:// existe', async () => {
    await new ExpoMediaFileCleanup(logger).deleteFileIfExists(
      'file:///docs/midias/agachamento.mp4',
    );

    expect(FileCtor).toHaveBeenCalledTimes(1);
    expect(FileCtor).toHaveBeenCalledWith('file:///docs/midias/agachamento.mp4');
    expect(nativeFile.delete).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('não tenta apagar quando o arquivo não existe mais', async () => {
    nativeFile.exists = false;

    await new ExpoMediaFileCleanup(logger).deleteFileIfExists('file:///docs/midias/sumiu.mp4');

    expect(FileCtor).toHaveBeenCalledTimes(1);
    expect(nativeFile.delete).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('pula URIs content:// sem nem tocar na API nativa de arquivos', async () => {
    await new ExpoMediaFileCleanup(logger).deleteFileIfExists(
      'content://media/external/video/42',
    );

    expect(FileCtor).not.toHaveBeenCalled();
    expect(nativeFile.delete).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('media_cleanup.content_uri_skipped', {
      uri: 'content://media/external/video/42',
    });
  });

  it('engole erro do construtor nativo: não rejeita e registra o URI que falhou', async () => {
    const boom = new Error('EPERM: operation not permitted');
    nativeFile.constructorError = boom;

    await expect(
      new ExpoMediaFileCleanup(logger).deleteFileIfExists('file:///docs/midias/protegido.mp4'),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('media_cleanup.delete_failed', boom, {
      uri: 'file:///docs/midias/protegido.mp4',
    });
  });

  it('engole erro do delete() nativo: não rejeita e registra o URI que falhou', async () => {
    const boom = new Error('ENOENT');
    nativeFile.delete.mockImplementation(() => {
      throw boom;
    });

    await expect(
      new ExpoMediaFileCleanup(logger).deleteFileIfExists('file:///docs/midias/corrida.mp4'),
    ).resolves.toBeUndefined();

    expect(nativeFile.delete).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('media_cleanup.delete_failed', boom, {
      uri: 'file:///docs/midias/corrida.mp4',
    });
  });

  it('URI relativo (sem esquema) segue pelo caminho normal de deleção', async () => {
    await new ExpoMediaFileCleanup(logger).deleteFileIfExists('midias/local.jpg');

    expect(FileCtor).toHaveBeenCalledWith('midias/local.jpg');
    expect(nativeFile.delete).toHaveBeenCalledTimes(1);
  });
});
