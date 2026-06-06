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
        currentExercise.musculoAlvo.length > 0 ? JSON.stringify(currentExercise.musculoAlvo) : null,
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

  async getDirty(): Promise<import('@academia/contracts').ExerciseSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; name: string; normalized_name: string; group_muscle: string;
      category: string; equipment: string | null; load_unit: string; is_custom: number;
      media_online: string | null; media_local: string | null; musculo_alvo: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, name, normalized_name, group_muscle, category, equipment, load_unit,
              is_custom, media_online, media_local, musculo_alvo, created_at, updated_at, deleted_at
       FROM exercises WHERE dirty = 1 AND is_custom = 1`
    );
    return rows.map((r) => ({
      id: r.id, name: r.name, normalizedName: r.normalized_name,
      groupMuscle: r.group_muscle, category: r.category, equipment: r.equipment,
      loadUnit: r.load_unit, isCustom: Boolean(r.is_custom),
      mediaOnline: r.media_online, mediaLocal: r.media_local, musculoAlvo: r.musculo_alvo,
      createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@academia/contracts').ExerciseSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO exercises
           (id, name, normalized_name, group_muscle, category, equipment, load_unit,
            is_custom, media_online, media_local, musculo_alvo, created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.name, r.normalizedName, r.groupMuscle, r.category, r.equipment,
         r.loadUnit, r.isCustom ? 1 : 0, r.mediaOnline, r.mediaLocal, r.musculoAlvo,
         r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
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
    musculoAlvo: row.musculo_alvo ? (JSON.parse(row.musculo_alvo) as string[]) : [],
    movementPattern: null,
    stabilizers: [],
    executionType: null,
    nameVariations: [],
    primaryEquipment: null,
    secondaryEquipment: null,
    catalogVersion: 0,
  };
}
