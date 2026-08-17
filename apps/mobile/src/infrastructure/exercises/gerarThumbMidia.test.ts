import { beforeEach, describe, expect, it, vi } from 'vitest';

const { released, generateThumbnailsAsync, manipulate } = vi.hoisted(() => {
  const released = vi.fn();
  const generateThumbnailsAsync = vi.fn().mockResolvedValue([{ __sharedRef: 'frame0' }]);
  const saveAsync = vi.fn().mockResolvedValue({ uri: 'file:///cache/manip.jpg' });
  const renderAsync = vi.fn().mockResolvedValue({ saveAsync });
  const resize = vi.fn().mockReturnValue({ renderAsync });
  const manipulate = vi.fn(() => ({ resize, renderAsync }));
  return { released, generateThumbnailsAsync, manipulate };
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

import { gerarThumbMidia } from './gerarThumbMidia';
import { createVideoPlayer } from 'expo-video';

describe('gerarThumbMidia — vídeo usa expo-video (não expo-video-thumbnails)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extrai o frame 0 via createVideoPlayer + generateThumbnailsAsync e libera o player', async () => {
    const result = await gerarThumbMidia('ex-1', 'file:///media/video.mp4');

    expect(createVideoPlayer).toHaveBeenCalledWith('file:///media/video.mp4');
    expect(generateThumbnailsAsync).toHaveBeenCalledWith(0);
    expect(released).toHaveBeenCalled(); // sem leak de player nativo
    expect(manipulate).toHaveBeenCalledWith({ __sharedRef: 'frame0' });
    expect(result).toBe('file://DOC/exercises/thumbs/ex-1.jpg');
  });

  it('imagem/GIF não passa pelo player de vídeo', async () => {
    await gerarThumbMidia('ex-2', 'file:///media/anim.gif');
    expect(createVideoPlayer).not.toHaveBeenCalled();
    expect(manipulate).toHaveBeenCalledWith('file:///media/anim.gif');
  });
});
