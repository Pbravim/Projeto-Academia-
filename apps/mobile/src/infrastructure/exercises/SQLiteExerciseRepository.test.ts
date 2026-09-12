import { describe, expect, it } from 'vitest';

import { Exercise } from '../../domain/exercises/entities/Exercise';
import type { SQLiteBindParams, SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';

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
  name_variations: string | null;
  primary_equipment: string | null;
}

class FakeSQLiteDatabaseClient implements SQLiteDatabaseClient {
  private readonly rows = new Map<string, ExerciseRow>();

  async exec(): Promise<void> {

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
      ,
      ,
      ,
      ,
      ,
      ,
      nameVariations,
      primaryEquipment,
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
      name_variations: nameVariations == null ? null : String(nameVariations),
      primary_equipment: primaryEquipment == null ? null : String(primaryEquipment),
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

  async getAll<T>(statement: string, params: SQLiteBindParams = []): Promise<T[]> {
    const rows = Array.from(this.rows.values());

    if (statement.includes('normalized_name LIKE')) {
      const q = String(params[0]).replace(/%/g, '');
      return rows.filter(
        (row) =>
          row.normalized_name.includes(q) ||
          (row.name_variations ?? '').toLowerCase().includes(q) ||
          (row.equipment ?? '').toLowerCase().includes(q) ||
          (row.primary_equipment ?? '').toLowerCase().includes(q)
      ) as T[];
    }

    return rows as T[];
  }

  async runWithChanges(): Promise<number> {
    return 0;
  }

  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

describe('SQLiteExerciseRepository', () => {
  it('maps persisted rows back to exercise entities', async () => {
    const database = new FakeSQLiteDatabaseClient();
    const repository = new SQLiteExerciseRepository(database);
    const exercise = Exercise.create({
      id: 'exercise_1',
      name: 'Agachamento livre',
      groupMuscles: ['Pernas'],
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

  it('finds exercises by equipment or primary equipment (LIKE)', async () => {
    const database = new FakeSQLiteDatabaseClient();
    const repository = new SQLiteExerciseRepository(database);

    await repository.save(
      Exercise.create({
        id: 'e1',
        name: 'Supino maquina',
        groupMuscles: ['Peito'],
        equipment: 'Maquina Technogym',
        createdAt: new Date('2026-01-01'),
      })
    );
    await repository.save(
      Exercise.create({
        id: 'e2',
        name: 'Agachamento livre',
        groupMuscles: ['Pernas'],
        equipment: 'Barra livre',
        primaryEquipment: 'Rack',
        createdAt: new Date('2026-01-01'),
      })
    );

    const byEquipment = await repository.findByNameOrVariation('technogym');
    const byPrimaryEquipment = await repository.findByNameOrVariation('rack');
    const noMatch = await repository.findByNameOrVariation('inexistente');

    expect(byEquipment.map((e) => e.toPrimitives().id)).toEqual(['e1']);
    expect(byPrimaryEquipment.map((e) => e.toPrimitives().id)).toEqual(['e2']);
    expect(noMatch).toEqual([]);
  });
});
