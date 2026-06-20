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
  movement_pattern: string | null;
  stabilizers: string | null;
  execution_type: string | null;
  name_variations: string | null;
  primary_equipment: string | null;
  secondary_equipment: string | null;
  catalog_version: number;
  tracking_type: string | null;
}

const EXERCISE_COLUMNS = `id, name, normalized_name, group_muscle, category, equipment,
       load_unit, is_custom, created_at, updated_at, media_online, media_local,
       musculo_alvo, movement_pattern, stabilizers, execution_type,
       name_variations, primary_equipment, secondary_equipment, catalog_version, tracking_type`;

export class SQLiteExerciseRepository implements ExerciseRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(exercise: Exercise): Promise<void> {
    const p = exercise.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO exercises (
         id, name, normalized_name, group_muscle, category, equipment,
         load_unit, is_custom, created_at, updated_at, media_online, media_local,
         musculo_alvo, movement_pattern, stabilizers, execution_type,
         name_variations, primary_equipment, secondary_equipment, catalog_version,
         tracking_type, deleted_at, dirty
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [
        p.id, p.name, p.normalizedName, serializeGroupMuscles(p.groupMuscles), p.category, p.equipment,
        p.loadUnit, p.isCustom ? 1 : 0, p.createdAt, p.updatedAt,
        p.mediaOnline, p.mediaLocal,
        JSON.stringify(p.musculoAlvo),
        p.movementPattern,
        JSON.stringify(p.stabilizers),
        p.executionType,
        JSON.stringify(p.nameVariations),
        p.primaryEquipment,
        p.secondaryEquipment,
        p.catalogVersion,
        p.trackingType,
      ]
    );
  }

  async list(options?: ListExercisesOptions): Promise<Exercise[]> {
    const SELECT = `SELECT ${EXERCISE_COLUMNS}
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
      `SELECT ${EXERCISE_COLUMNS}
       FROM exercises WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    return row ? Exercise.restore(mapRowToPrimitives(row)) : null;
  }

  async findByIds(ids: string[]): Promise<Exercise[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await this.database.getAll<ExerciseRow>(
      `SELECT ${EXERCISE_COLUMNS}
       FROM exercises WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    );
    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
  }

  async findByNormalizedName(normalizedName: string): Promise<Exercise | null> {
    const row = await this.database.getFirst<ExerciseRow>(
      `SELECT ${EXERCISE_COLUMNS}
       FROM exercises WHERE normalized_name = ? AND deleted_at IS NULL LIMIT 1`,
      [normalizedName]
    );

    return row ? Exercise.restore(mapRowToPrimitives(row)) : null;
  }

  async findByNameOrVariation(query: string): Promise<Exercise[]> {
    const q = `%${query.toLowerCase()}%`;
    const rows = await this.database.getAll<ExerciseRow>(
      `SELECT ${EXERCISE_COLUMNS}
       FROM exercises
       WHERE deleted_at IS NULL
         AND (normalized_name LIKE ?
              OR (name_variations IS NOT NULL AND LOWER(name_variations) LIKE ?))
       ORDER BY normalized_name ASC`,
      [q, q]
    );
    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
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
              e.load_unit, e.is_custom, e.created_at, e.updated_at, e.media_online, e.media_local,
              e.musculo_alvo, e.movement_pattern, e.stabilizers, e.execution_type,
              e.name_variations, e.primary_equipment, e.secondary_equipment, e.catalog_version
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

  async listEquivalentAlternativas(exercicioId: string): Promise<Exercise[]> {
    const rows = await this.database.getAll<ExerciseRow>(
      `SELECT e.id, e.name, e.normalized_name, e.group_muscle, e.category, e.equipment,
              e.load_unit, e.is_custom, e.created_at, e.updated_at, e.media_online, e.media_local,
              e.musculo_alvo, e.movement_pattern, e.stabilizers, e.execution_type,
              e.name_variations, e.primary_equipment, e.secondary_equipment, e.catalog_version
       FROM exercises e
       JOIN exercise_equivalent_alternatives ea ON ea.alternativa_id = e.id
       WHERE ea.exercicio_id = ? AND e.deleted_at IS NULL
       ORDER BY e.name ASC`,
      [exercicioId]
    );
    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
  }

  async addEquivalentAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    await this.database.run(
      `INSERT INTO exercise_equivalent_alternatives (exercicio_id, alternativa_id)
       VALUES (?, ?) ON CONFLICT(exercicio_id, alternativa_id) DO NOTHING`,
      [exercicioId, alternativaId]
    );
  }

  async listMuscleGroupAlternativas(exercicioId: string): Promise<Exercise[]> {
    const rows = await this.database.getAll<ExerciseRow>(
      `SELECT e.id, e.name, e.normalized_name, e.group_muscle, e.category, e.equipment,
              e.load_unit, e.is_custom, e.created_at, e.updated_at, e.media_online, e.media_local,
              e.musculo_alvo, e.movement_pattern, e.stabilizers, e.execution_type,
              e.name_variations, e.primary_equipment, e.secondary_equipment, e.catalog_version
       FROM exercises e
       JOIN exercise_muscle_group_alternatives ea ON ea.alternativa_id = e.id
       WHERE ea.exercicio_id = ? AND e.deleted_at IS NULL
       ORDER BY e.name ASC`,
      [exercicioId]
    );
    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
  }

  async addMuscleGroupAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    await this.database.run(
      `INSERT INTO exercise_muscle_group_alternatives (exercicio_id, alternativa_id)
       VALUES (?, ?) ON CONFLICT(exercicio_id, alternativa_id) DO NOTHING`,
      [exercicioId, alternativaId]
    );
  }

  async upsertCatalogExercise(exercise: Exercise, equivalentIds: string[], muscleGroupIds: string[]): Promise<void> {
    const p = exercise.toPrimitives();
    const now = new Date().toISOString();
    await this.database.run(
      `INSERT INTO exercises (
         id, name, normalized_name, group_muscle, category, equipment,
         load_unit, is_custom, created_at, updated_at, media_online, media_local,
         musculo_alvo, movement_pattern, stabilizers, execution_type,
         name_variations, primary_equipment, secondary_equipment, catalog_version,
         tracking_type, deleted_at, dirty
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)
       ON CONFLICT(id) DO UPDATE SET
         name               = excluded.name,
         normalized_name    = excluded.normalized_name,
         group_muscle       = excluded.group_muscle,
         category           = excluded.category,
         equipment          = excluded.equipment,
         musculo_alvo       = excluded.musculo_alvo,
         movement_pattern   = excluded.movement_pattern,
         stabilizers        = excluded.stabilizers,
         execution_type     = excluded.execution_type,
         name_variations    = excluded.name_variations,
         primary_equipment  = excluded.primary_equipment,
         secondary_equipment = excluded.secondary_equipment,
         catalog_version    = excluded.catalog_version,
         tracking_type      = excluded.tracking_type,
         updated_at         = excluded.updated_at
       WHERE exercises.is_custom = 0`,
      [
        p.id, p.name, p.normalizedName, serializeGroupMuscles(p.groupMuscles), p.category, p.equipment,
        p.loadUnit, 0, p.createdAt, now,
        p.mediaOnline, p.mediaLocal,
        JSON.stringify(p.musculoAlvo),
        p.movementPattern,
        JSON.stringify(p.stabilizers),
        p.executionType,
        JSON.stringify(p.nameVariations),
        p.primaryEquipment,
        p.secondaryEquipment,
        p.catalogVersion,
        p.trackingType,
      ]
    );

    for (const altId of equivalentIds) await this.addEquivalentAlternativa(p.id, altId);
    for (const altId of muscleGroupIds) await this.addMuscleGroupAlternativa(p.id, altId);
  }

  async getDirty(): Promise<import('@academia/contracts').ExerciseSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; name: string; normalized_name: string; group_muscle: string;
      category: string; equipment: string | null; load_unit: string; is_custom: number;
      media_online: string | null; media_local: string | null; musculo_alvo: string | null;
      movement_pattern: string | null; stabilizers: string | null; execution_type: string | null;
      name_variations: string | null; primary_equipment: string | null; secondary_equipment: string | null;
      catalog_version: number; tracking_type: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, name, normalized_name, group_muscle, category, equipment, load_unit,
              is_custom, media_online, media_local, musculo_alvo,
              movement_pattern, stabilizers, execution_type, name_variations,
              primary_equipment, secondary_equipment, catalog_version, tracking_type,
              created_at, updated_at, deleted_at
       FROM exercises WHERE dirty = 1 AND is_custom = 1`
    );
    return rows.map((r) => ({
      id: r.id, name: r.name, normalizedName: r.normalized_name,
      groupMuscle: r.group_muscle, category: r.category, equipment: r.equipment,
      loadUnit: r.load_unit, isCustom: Boolean(r.is_custom),
      mediaOnline: r.media_online, mediaLocal: r.media_local, musculoAlvo: r.musculo_alvo,
      movementPattern: r.movement_pattern, stabilizers: r.stabilizers,
      executionType: r.execution_type, nameVariations: r.name_variations,
      primaryEquipment: r.primary_equipment, secondaryEquipment: r.secondary_equipment,
      catalogVersion: r.catalog_version, trackingType: r.tracking_type,
      createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@academia/contracts').ExerciseSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO exercises
           (id, name, normalized_name, group_muscle, category, equipment, load_unit,
            is_custom, media_online, media_local, musculo_alvo,
            movement_pattern, stabilizers, execution_type, name_variations,
            primary_equipment, secondary_equipment, catalog_version, tracking_type,
            created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.name, r.normalizedName, r.groupMuscle, r.category, r.equipment,
         r.loadUnit, r.isCustom ? 1 : 0, r.mediaOnline, r.mediaLocal, r.musculoAlvo,
         r.movementPattern, r.stabilizers, r.executionType, r.nameVariations,
         r.primaryEquipment, r.secondaryEquipment, r.catalogVersion, r.trackingType,
         r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
}

/**
 * A coluna SQL `group_muscle` permanece TEXT com vírgulas (compat com sync `ExerciseSyncRow.groupMuscle`
 * e com o catálogo embutido nas migrations); o domínio só enxerga `groupMuscles: string[]`.
 * Serialização confinada a este arquivo — ver docs/exercises/catalog-maintenance.md §2.
 */
function serializeGroupMuscles(groups: string[]): string {
  return groups.join(', ');
}

function parseGroupMuscles(value: string): string[] {
  return value.split(',').map((g) => g.trim()).filter(Boolean);
}

function mapRowToPrimitives(row: ExerciseRow): ExercisePrimitives {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    groupMuscles: parseGroupMuscles(row.group_muscle),
    category: row.category,
    equipment: row.equipment,
    loadUnit: row.load_unit,
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mediaOnline: row.media_online,
    mediaLocal: row.media_local,
    musculoAlvo:        row.musculo_alvo     ? (JSON.parse(row.musculo_alvo)     as string[]) : [],
    movementPattern:    row.movement_pattern ?? null,
    stabilizers:        row.stabilizers      ? (JSON.parse(row.stabilizers)      as string[]) : [],
    executionType:      row.execution_type   as ExercisePrimitives['executionType'] ?? null,
    nameVariations:     row.name_variations  ? (JSON.parse(row.name_variations)  as string[]) : [],
    primaryEquipment:   row.primary_equipment ?? null,
    secondaryEquipment: row.secondary_equipment ?? null,
    catalogVersion:     row.catalog_version ?? 0,
    trackingType:       (row.tracking_type ?? 'reps_load') as ExercisePrimitives['trackingType'],
  };
}
