import { createVideoPlayer } from 'expo-video';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { extrairFrameZero, gerarThumbMidia } from './gerarThumbMidia';

const { released, generateThumbnailsAsync, manipulate, resize, saveAsync } = vi.hoisted(() => {
  const releasedFn = vi.fn();
  const generateThumbnailsAsyncFn = vi.fn().mockResolvedValue([{ __sharedRef: 'frame0' }]);
  const saveAsyncFn = vi.fn().mockResolvedValue({ uri: 'file:///cache/manip.jpg' });
  const renderAsync = vi.fn().mockResolvedValue({ saveAsync: saveAsyncFn });
  const resizeFn = vi.fn().mockReturnValue({ renderAsync });
  const manipulateFn = vi.fn(() => ({ resize: resizeFn, renderAsync }));
  return {
    released: releasedFn,
    generateThumbnailsAsync: generateThumbnailsAsyncFn,
    manipulate: manipulateFn,
    resize: resizeFn,
    saveAsync: saveAsyncFn,
  };
});

vi.mock('expo-video', () => ({
  createVideoPlayer: vi.fn(() => ({ generateThumbnailsAsync, release: released })),
}));

vi.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate },
  SaveFormat: { JPEG: 'jpeg' },
}));

vi.mock('expo-file-system', () => {
  class File {
    path: string;
    constructor(...parts: unknown[]) { this.path = parts.map((p) => (typeof p === 'string' ? p : (p as { path: string }).path)).join('/'); }
    get exists() { return false; }
    get uri() { return `file://${this.path}`; }
    move() {}
    delete() {}
  }
  class Directory extends File { create() {} }
  return { File, Directory, Paths: { document: 'DOC' } };
});

describe('gerarThumbMidia — vídeo usa expo-video (não expo-video-thumbnails)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extrai o frame 0 via createVideoPlayer + generateThumbnailsAsync e libera o player', async () => {
    const result = await gerarThumbMidia('ex-1', 'file:///media/video.mp4');

    expect(createVideoPlayer).toHaveBeenCalledWith('file:///media/video.mp4');
    expect(generateThumbnailsAsync).toHaveBeenCalledWith(0);
    expect(released).toHaveBeenCalled(); // sem leak de player nativo
    expect(manipulate).toHaveBeenCalledWith({ __sharedRef: 'frame0' });
    expect(resize).toHaveBeenCalledWith({ width: 160 });
    expect(saveAsync).toHaveBeenCalledWith({ compress: 0.7, format: 'jpeg' });
    expect(result).toBe('file://DOC/exercises/thumbs/ex-1.jpg');
  });

  it('imagem/GIF não passa pelo player de vídeo', async () => {
    await gerarThumbMidia('ex-2', 'file:///media/anim.gif');
    expect(createVideoPlayer).not.toHaveBeenCalled();
    expect(manipulate).toHaveBeenCalledWith('file:///media/anim.gif');
  });

  it('generateThumbnailsAsync sem frames -> resultado null, manipulate não chamado e player liberado', async () => {
    generateThumbnailsAsync.mockResolvedValueOnce([]);

    const result = await gerarThumbMidia('ex-3', 'file:///media/video.mp4');

    expect(result).toBeNull();
    expect(manipulate).not.toHaveBeenCalled();
    expect(released).toHaveBeenCalled();
  });

  it('generateThumbnailsAsync rejeitando -> resultado null (falha silenciosa) e player liberado no finally', async () => {
    generateThumbnailsAsync.mockRejectedValueOnce(new Error('falha nativa'));

    const result = await gerarThumbMidia('ex-4', 'file:///media/video.mp4');

    expect(result).toBeNull();
    expect(released).toHaveBeenCalled();
  });
});

describe('extrairFrameZero', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extrai o frame 0 via createVideoPlayer + generateThumbnailsAsync e libera o player', async () => {
    const result = await extrairFrameZero('file:///media/video.mp4');

    expect(createVideoPlayer).toHaveBeenCalledWith('file:///media/video.mp4');
    expect(generateThumbnailsAsync).toHaveBeenCalledWith(0);
    expect(released).toHaveBeenCalled();
    expect(result).toEqual({ __sharedRef: 'frame0' });
  });

  it('lista de frames vazia -> retorna null e libera o player', async () => {
    generateThumbnailsAsync.mockResolvedValueOnce([]);

    const result = await extrairFrameZero('file:///media/video.mp4');

    expect(result).toBeNull();
    expect(released).toHaveBeenCalled();
  });

  it('generateThumbnailsAsync rejeitando -> propaga o erro e libera o player no finally', async () => {
    generateThumbnailsAsync.mockRejectedValueOnce(new Error('falha nativa'));

    await expect(extrairFrameZero('file:///media/video.mp4')).rejects.toThrow('falha nativa');
    expect(released).toHaveBeenCalled();
  });
});
