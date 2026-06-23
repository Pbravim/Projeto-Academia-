import { describe, expect, it, vi } from 'vitest';

// BaixarMidiaExercicioUseCase (importado transitivamente por BaixarTodasMidiasUseCase)
// importa expo-file-system, que puxa react-native — mockado para rodar no ambiente node.
vi.mock('expo-file-system', () => ({
  File: vi.fn(),
  Directory: vi.fn(),
  Paths: { document: 'file:///docs/' },
}));

import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import type { BaixarMidiaExercicioUseCase } from './BaixarMidiaExercicioUseCase';
import { BaixarTodasMidiasUseCase } from './BaixarTodasMidiasUseCase';

function makeExercise(id: string, mediaOnline: string | null, mediaLocal: string | null) {
  return Exercise.create({
    id,
    name: `Ex ${id}`,
    groupMuscles: ['Peito'],
    category: 'Musculação',
    createdAt: new Date('2026-01-01'),
    isCustom: false,
    mediaOnline,
    mediaLocal,
  });
}

describe('BaixarTodasMidiasUseCase', () => {
  it('baixa apenas exercícios com URL baixável e sem mídia local', async () => {
    const exerciseRepository = new InMemoryExerciseRepository();
    await exerciseRepository.save(makeExercise('ex1', 'https://cdn.exemplo.com/a.gif', null)); // baixa
    await exerciseRepository.save(makeExercise('ex2', 'https://cdn.exemplo.com/b.gif', 'file:///b.gif')); // já tem local
    await exerciseRepository.save(makeExercise('ex3', 'https://youtube.com/watch?v=x', null)); // youtube, não baixável
    await exerciseRepository.save(makeExercise('ex4', null, null)); // sem mídia

    const baixados: string[] = [];
    const baixarMidia = {
      async execute(id: string) { baixados.push(id); },
    } as unknown as BaixarMidiaExercicioUseCase;

    await new BaixarTodasMidiasUseCase({ exerciseRepository, baixarMidia }).execute();

    expect(baixados).toEqual(['ex1']);
  });

  it('não falha quando o download de um item lança erro', async () => {
    const exerciseRepository = new InMemoryExerciseRepository();
    await exerciseRepository.save(makeExercise('ex1', 'https://cdn.exemplo.com/a.gif', null));

    const baixarMidia = {
      async execute() { throw new Error('falha de rede'); },
    } as unknown as BaixarMidiaExercicioUseCase;

    await expect(
      new BaixarTodasMidiasUseCase({ exerciseRepository, baixarMidia }).execute()
    ).resolves.toBeUndefined();
  });
});
