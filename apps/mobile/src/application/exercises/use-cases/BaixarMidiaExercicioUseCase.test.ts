import { Directory, File } from 'expo-file-system';
import { describe, expect, it, vi } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';

import { BaixarMidiaExercicioUseCase } from './BaixarMidiaExercicioUseCase';

vi.mock('expo-file-system', () => {
  const mockDownloadedFile = {
    name: 'e1.mp4',
    uri: 'file:///documents/exercises/e1.mp4',
  };
  const mockFile = {
    exists: false,
    uri: 'file:///documents/exercises/e1.mp4',
    downloadContent: vi.fn().mockResolvedValue({ status: 200 }),
    copy: vi.fn(),
    delete: vi.fn(),
    name: 'e1.mp4',
  };
  const mockDir = {
    exists: true,
    create: vi.fn(),
    uri: 'file:///documents/exercises/',
  };
  const FileMock = vi.fn(() => mockFile) as any;
  FileMock.downloadFileAsync = vi.fn().mockResolvedValue(mockDownloadedFile);
  return {
    Directory: vi.fn(() => mockDir),
    File: FileMock,
    Paths: { document: 'file:///documents/' },
  };
});

function makeExercise(id: string, mediaOnline: string | null) {
  return Exercise.create({
    id,
    name: 'Supino',
    groupMuscles: ['Peito'],
    isCustom: false,
    mediaOnline: mediaOnline ?? undefined,
    createdAt: new Date('2026-01-01'),
  });
}

describe('BaixarMidiaExercicioUseCase', () => {
  it('throws when exercise not found', async () => {
    const repo = new InMemoryExerciseRepository();
    await expect(
      new BaixarMidiaExercicioUseCase({ exerciseRepository: repo }).execute('nonexistent')
    ).rejects.toThrow();
  });

  it('throws when exercise has no mediaOnline', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', null));
    await expect(
      new BaixarMidiaExercicioUseCase({ exerciseRepository: repo }).execute('e1')
    ).rejects.toThrow();
  });

  it('throws for YouTube URLs', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', 'https://youtube.com/watch?v=abc'));
    await expect(
      new BaixarMidiaExercicioUseCase({ exerciseRepository: repo }).execute('e1')
    ).rejects.toThrow();
  });

  it('throws for youtu.be URLs', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e2', 'https://youtu.be/abc123'));
    await expect(
      new BaixarMidiaExercicioUseCase({ exerciseRepository: repo }).execute('e2')
    ).rejects.toThrow();
  });

  // O mock de módulo acima usa arrow functions, que não aceitam `new`; os
  // testes de download real precisam de construtores de verdade.
  function usarConstrutoresReais() {
    vi.mocked(Directory).mockImplementation(function (this: unknown) {
      return { exists: true, create: vi.fn(), uri: 'file:///documents/exercises/' } as unknown as InstanceType<typeof Directory>;
    });
    vi.mocked(File).mockImplementation(function (this: unknown) {
      return { exists: false, uri: 'file:///documents/exercises/e1.mp4' } as unknown as InstanceType<typeof File>;
    });
  }

  it('aguarda o move assíncrono quando o nome baixado difere de <id>.<ext>', async () => {
    usarConstrutoresReais();
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', 'https://cdn.example.com/videos/supino-reto.mp4'));
    let moved = false;
    const move = vi.fn(async () => {
      await Promise.resolve();
      moved = true;
    });
    vi.mocked(File.downloadFileAsync).mockResolvedValueOnce({
      uri: 'file:///documents/exercises/supino-reto.mp4',
      move,
    } as unknown as InstanceType<typeof File>);

    const uri = await new BaixarMidiaExercicioUseCase({ exerciseRepository: repo }).execute('e1');

    expect(move).toHaveBeenCalledTimes(1);
    expect(moved).toBe(true);
    expect(uri).toBe('file:///documents/exercises/e1.mp4');
    expect((await repo.findById('e1'))?.toPrimitives().mediaLocal).toBe(uri);
  });

  it('usa a URI baixada quando o move assíncrono rejeita', async () => {
    usarConstrutoresReais();
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', 'https://cdn.example.com/videos/supino-reto.mp4'));
    vi.mocked(File.downloadFileAsync).mockResolvedValueOnce({
      uri: 'file:///documents/exercises/supino-reto.mp4',
      move: vi.fn().mockRejectedValue(new Error('destino existe')),
    } as unknown as InstanceType<typeof File>);

    const uri = await new BaixarMidiaExercicioUseCase({ exerciseRepository: repo }).execute('e1');

    expect(uri).toBe('file:///documents/exercises/supino-reto.mp4');
  });
});
