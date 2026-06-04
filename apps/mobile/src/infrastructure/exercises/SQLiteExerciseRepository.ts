import { Exercise, type ExercisePrimitives } from '../../domain/exercises/entities/Exercise';
import type { ExerciseRepository, ListExercisesOptions } from '../../domain/exercises/repositories/ExerciseRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { nowIso } from '../../shared/utils/syncStamp';

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
  media_online: string | null;
  media_local: string | null;
  musculo_alvo: string | null;
}

export class SQLiteExerciseRepository implements ExerciseRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(exercise: Exercise): Promise<void> {
    const currentExercise = exercise.toPrimitives();

    await this.database.run(
      `INSERT OR REPLACE INTO exercises (
         id, name, normalized_name, group_muscle, category, equipment,
         load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo,
         deleted_at, dirty
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
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
        currentExercise.mediaOnline,
        currentExercise.mediaLocal,
        currentExercise.musculoAlvo,
      ]
    );
  }

  async list(options?: ListExercisesOptions): Promise<Exercise[]> {
    const SELECT = `SELECT id, name, normalized_name, group_muscle, category, equipment,
              load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo
       FROM exercises WHERE deleted_at IS NULL ORDER BY normalized_name ASC`;

    if (options?.limit != null) {
      const rows = await this.database.getAll<ExerciseRow>(
        `${SELECT} LIMIT ? OFFSET ?`,
        [options.limit, options.offset ?? 0]
      );
      return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
    }

    const rows = await this.database.getAll<ExerciseRow>(SELECT);
    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
  }

  async findById(id: string): Promise<Exercise | null> {
    const row = await this.database.getFirst<ExerciseRow>(
      `SELECT id, name, normalized_name, group_muscle, category, equipment,
              load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo
       FROM exercises WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    return row ? Exercise.restore(mapRowToPrimitives(row)) : null;
  }

  async findByIds(ids: string[]): Promise<Exercise[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await this.database.getAll<ExerciseRow>(
      `SELECT id, name, normalized_name, group_muscle, category, equipment,
              load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo
       FROM exercises WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    );
    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
  }

  async findByNormalizedName(normalizedName: string): Promise<Exercise | null> {
    const row = await this.database.getFirst<ExerciseRow>(
      `SELECT id, name, normalized_name, group_muscle, category, equipment,
              load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo
       FROM exercises WHERE normalized_name = ? AND deleted_at IS NULL LIMIT 1`,
      [normalizedName]
    );

    return row ? Exercise.restore(mapRowToPrimitives(row)) : null;
  }

  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE exercises SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async updateMedia(id: string, mediaOnline: string | null, mediaLocal: string | null): Promise<void> {
    await this.database.run(
      'UPDATE exercises SET media_online = ?, media_local = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [mediaOnline, mediaLocal, nowIso(), id]
    );
  }

  async listAlternativas(exercicioId: string): Promise<Exercise[]> {
    const rows = await this.database.getAll<ExerciseRow>(
      `SELECT e.id, e.name, e.normalized_name, e.group_muscle, e.category, e.equipment,
              e.load_unit, e.is_custom, e.created_at, e.updated_at, e.media_online, e.media_local, e.musculo_alvo
       FROM exercises e
       JOIN exercise_alternatives ea ON ea.alternativa_id = e.id
       WHERE ea.exercicio_id = ? AND e.deleted_at IS NULL
       ORDER BY e.name ASC`,
      [exercicioId]
    );
    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
  }

  async addAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    await this.database.run(
      `INSERT INTO exercise_alternatives (exercicio_id, alternativa_id, updated_at, deleted_at, dirty) VALUES (?, ?, ?, NULL, 1) ON CONFLICT(exercicio_id, alternativa_id) DO UPDATE SET updated_at = excluded.updated_at, deleted_at = NULL, dirty = 1`,
      [exercicioId, alternativaId, nowIso()]
    );
  }

  async removeAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    await this.database.run(
      'UPDATE exercise_alternatives SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE exercicio_id = ? AND alternativa_id = ?',
      [nowIso(), nowIso(), exercicioId, alternativaId]
    );
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
    mediaOnline: row.media_online,
    mediaLocal: row.media_local,
    musculoAlvo: row.musculo_alvo ?? null,
  };
}
