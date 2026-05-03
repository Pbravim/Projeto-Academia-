import { Exercise, type ExercisePrimitives } from '../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../domain/exercises/repositories/ExerciseRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

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

export class SQLiteExerciseRepository implements ExerciseRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(exercise: Exercise): Promise<void> {
    const currentExercise = exercise.toPrimitives();

    await this.database.run(
      `
        INSERT OR REPLACE INTO exercises (
          id,
          name,
          normalized_name,
          group_muscle,
          category,
          equipment,
          load_unit,
          is_custom,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        currentExercise.id,
        currentExercise.name,
        currentExercise.normalizedName,
        currentExercise.groupMuscle,
        currentExercise.category,
        currentExercise.equipment,
        currentExercise.loadUnit,
        currentExercise.isCustom ? 1 : 0,
        currentExercise.createdAt,
        currentExercise.updatedAt,
      ]
    );
  }

  async list(): Promise<Exercise[]> {
    const rows = await this.database.getAll<ExerciseRow>(
      `
        SELECT
          id,
          name,
          normalized_name,
          group_muscle,
          category,
          equipment,
          load_unit,
          is_custom,
          created_at,
          updated_at
        FROM exercises
        ORDER BY name ASC
      `
    );

    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
  }

  async findById(id: string): Promise<Exercise | null> {
    const row = await this.database.getFirst<ExerciseRow>(
      `
        SELECT
          id,
          name,
          normalized_name,
          group_muscle,
          category,
          equipment,
          load_unit,
          is_custom,
          created_at,
          updated_at
        FROM exercises
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    return row ? Exercise.restore(mapRowToPrimitives(row)) : null;
  }

  async findByNormalizedName(normalizedName: string): Promise<Exercise | null> {
    const row = await this.database.getFirst<ExerciseRow>(
      `
        SELECT
          id,
          name,
          normalized_name,
          group_muscle,
          category,
          equipment,
          load_unit,
          is_custom,
          created_at,
          updated_at
        FROM exercises
        WHERE normalized_name = ?
        LIMIT 1
      `,
      [normalizedName]
    );

    return row ? Exercise.restore(mapRowToPrimitives(row)) : null;
  }

  async delete(id: string): Promise<void> {
    await this.database.run('DELETE FROM exercises WHERE id = ?', [id]);
  }
}

function mapRowToPrimitives(row: ExerciseRow): ExercisePrimitives {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    groupMuscle: row.group_muscle,
    category: row.category,
    equipment: row.equipment,
    loadUnit: row.load_unit,
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
