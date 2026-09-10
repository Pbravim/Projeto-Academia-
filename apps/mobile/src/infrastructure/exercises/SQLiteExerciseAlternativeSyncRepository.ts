import type { ExerciseAlternativeSyncRow } from '@academia/contracts';

import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

/**
 * Ponte de sync da tabela exercise_alternatives (vínculos manuais de alternativa).
 * A tabela marca dirty desde a v-sync, mas ficava fora do pipeline — links custom
 * nunca chegavam ao servidor e um restore os perdia (P2 rodada 3, apêndice C).
 */
export class SQLiteExerciseAlternativeSyncRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async getDirty(): Promise<ExerciseAlternativeSyncRow[]> {
    const rows = await this.database.getAll<{
      exercicio_id: string; alternativa_id: string;
      updated_at: string | null; deleted_at: string | null;
    }>(
      `SELECT exercicio_id, alternativa_id, updated_at, deleted_at
       FROM exercise_alternatives WHERE dirty = 1`,
    );
    return rows.map((r) => ({
      exercicioId: r.exercicio_id,
      alternativaId: r.alternativa_id,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: ExerciseAlternativeSyncRow[]): Promise<void> {
    for (const r of rows) {
      // FK para exercises (ON DELETE CASCADE): um vínculo cujo exercício ainda
      // não existe neste device (ex.: catálogo de versão mais nova) estouraria a
      // FK e abortaria o pull inteiro — pular é seguro, o vínculo chega no
      // próximo pull junto com o exercício.
      const missing = await this.database.getFirst<{ n: number }>(
        `SELECT (SELECT COUNT(*) FROM exercises WHERE id IN (?, ?)) AS n`,
        [r.exercicioId, r.alternativaId],
      );
      if ((missing?.n ?? 0) < 2) continue;

      // Guarda LWW: linha local dirty mais nova nunca é sobrescrita pelo echo-back.
      await this.database.run(
        `INSERT INTO exercise_alternatives
           (exercicio_id, alternativa_id, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, 0, 1)
         ON CONFLICT(exercicio_id, alternativa_id) DO UPDATE SET
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at,
           dirty = 0,
           server_rev = 1
         WHERE exercise_alternatives.dirty = 0
            OR exercise_alternatives.updated_at IS NULL
            OR excluded.updated_at >= exercise_alternatives.updated_at`,
        [r.exercicioId, r.alternativaId, r.updatedAt, r.deletedAt],
      );
    }
  }
}
