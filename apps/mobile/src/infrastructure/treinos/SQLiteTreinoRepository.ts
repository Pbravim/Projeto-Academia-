import { Treino, type TreinoPrimitives } from '../../domain/treinos/entities/Treino';
import type { TreinoRepository } from '../../domain/treinos/repositories/TreinoRepository';
import { nowIso } from '../../shared/utils/syncStamp';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface TreinoRow {
  id: string;
  name: string;
  objetivo: string | null;
  created_at: string;
  updated_at: string;
}

export class SQLiteTreinoRepository implements TreinoRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(treino: Treino): Promise<void> {
    const p = treino.toPrimitives();

    await this.database.run(
      `
        INSERT OR REPLACE INTO treinos (id, name, objetivo, created_at, updated_at, deleted_at, dirty)
        VALUES (?, ?, ?, ?, ?, NULL, 1)
      `,
      [p.id, p.name, p.objetivo, p.createdAt, p.updatedAt]
    );
  }

  async list(): Promise<Treino[]> {
    const rows = await this.database.getAll<TreinoRow>(
      'SELECT id, name, objetivo, created_at, updated_at FROM treinos WHERE deleted_at IS NULL ORDER BY name ASC'
    );

    return rows.map((row) => Treino.restore(mapRowToPrimitives(row)));
  }

  async findById(id: string): Promise<Treino | null> {
    const row = await this.database.getFirst<TreinoRow>(
      'SELECT id, name, objetivo, created_at, updated_at FROM treinos WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );

    return row ? Treino.restore(mapRowToPrimitives(row)) : null;
  }

  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async getDirty(): Promise<import('@academia/contracts').TreinoSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; name: string; objetivo: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, name, objetivo, created_at, updated_at, deleted_at
       FROM treinos WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, name: r.name, objetivo: r.objetivo,
      createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@academia/contracts').TreinoSyncRow[]): Promise<void> {
    for (const r of rows) {
      // Guarda LWW no cliente: uma linha local dirty com updated_at mais novo
      // (edicao feita durante o round-trip do push) nunca e sobrescrita pelo
      // echo-back — ela continua dirty e vai no proximo push.
      await this.database.run(
        `INSERT INTO treinos (id, name, objetivo, created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           objetivo = excluded.objetivo,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at,
           dirty = 0,
           server_rev = 1
         WHERE treinos.dirty = 0 OR treinos.updated_at IS NULL OR excluded.updated_at >= treinos.updated_at`,
        [r.id, r.name, r.objetivo, r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
}

function mapRowToPrimitives(row: TreinoRow): TreinoPrimitives {
  return {
    id: row.id,
    name: row.name,
    objetivo: row.objetivo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
