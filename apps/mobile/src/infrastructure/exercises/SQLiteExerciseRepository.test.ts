import { describe, expect, it } from 'vitest';

import { Exercise } from '../../domain/exercises/entities/Exercise';
import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';
import type { SQLiteBindParams, SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface ExerciseRow {
  id: string;
  name: string;
  normalized_name: string;
  group_muscle: string;
  category: string;
  equipment: string | null;
  load_unit: 'kg';
  is_custom: number;
  created_at: string;
  updated_at: string;
}

class FakeSQLiteDatabaseClient implements SQLiteDatabaseClient {
  private readonly rows = new Map<string, ExerciseRow>();

  async exec(): Promise<void> {
    return;
  }

  async run(_statement: string, params: SQLiteBindParams = []): Promise<void> {
    const [
      id,
      name,
      normalizedName,
      groupMuscle,
      category,
      equipment,
      loadUnit,
      isCustom,
      createdAt,
      updatedAt,
    ] = params;

    this.rows.set(String(id), {
      id: String(id),
      name: String(name),
      normalized_name: String(normalizedName),
      group_muscle: String(groupMuscle),
      category: String(category),
      equipment: equipment === null ? null : String(equipment),
      load_unit: loadUnit === 'kg' ? 'kg' : 'kg',
      is_custom: Number(isCustom),
      created_at: String(createdAt),
      updated_at: String(updatedAt),
    });
  }

  async getFirst<T>(_statement: string, params: SQLiteBindParams = []): Promise<T | null> {
    const normalizedName = String(params[0]);

    for (const row of this.rows.values()) {
      if (row.normalized_name === normalizedName) {
        return row as T;
      }
    }

    return null;
  }

  async getAll<T>(): Promise<T[]> {
    return Array.from(this.rows.values()) as T[];
  }
}

describe('SQLiteExerciseRepository', () => {
  it('maps persisted rows back to exercise entities', async () => {
    const database = new FakeSQLiteDatabaseClient();
    const repository = new SQLiteExerciseRepository(database);
    const exercise = Exercise.create({
      id: 'exercise_1',
      name: 'Agachamento livre',
      groupMuscle: 'Pernas',
      category: 'Composto',
      equipment: 'Barra livre',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    await repository.save(exercise);

    const existingExercise = await repository.findByNormalizedName('agachamento livre');
    const listedExercises = await repository.list();

    expect(existingExercise?.toPrimitives().name).toBe('Agachamento livre');
    expect(listedExercises[0].toPrimitives().equipment).toBe('Barra livre');
  });
});
