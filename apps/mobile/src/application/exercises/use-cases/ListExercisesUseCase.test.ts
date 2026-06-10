import { describe, expect, it } from 'vitest';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { ListExercisesUseCase } from './ListExercisesUseCase';

function makeExercise(id: string, name: string) {
  return Exercise.create({
    id,
    name,
    groupMuscles: ['Peito'],
    isCustom: false,
    createdAt: new Date('2026-01-01'),
  });
}

describe('ListExercisesUseCase', () => {
  it('returns empty array when no exercises', async () => {
    const repo = new InMemoryExerciseRepository();
    const result = await new ListExercisesUseCase(repo).execute();
    expect(result).toEqual([]);
  });

  it('returns all exercises', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', 'Supino'));
    await repo.save(makeExercise('e2', 'Agachamento'));
    const result = await new ListExercisesUseCase(repo).execute();
    expect(result).toHaveLength(2);
  });

  it('returns exercises sorted alphabetically', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', 'Supino'));
    await repo.save(makeExercise('e2', 'Agachamento'));
    const result = await new ListExercisesUseCase(repo).execute();
    expect(result[0]!.name).toBe('Agachamento');
    expect(result[1]!.name).toBe('Supino');
  });
});
