import { describe, expect, it, vi } from 'vitest';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
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
});
