import { Treino, type TreinoPrimitives } from '../../domain/treinos/entities/Treino';
import type { TreinoRepository } from '../../domain/treinos/repositories/TreinoRepository';
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
        INSERT OR REPLACE INTO treinos (id, name, objetivo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      [p.id, p.name, p.objetivo, p.createdAt, p.updatedAt]
    );
  }

  async list(): Promise<Treino[]> {
    const rows = await this.database.getAll<TreinoRow>(
      'SELECT id, name, objetivo, created_at, updated_at FROM treinos ORDER BY name ASC'
    );

    return rows.map((row) => Treino.restore(mapRowToPrimitives(row)));
  }

  async findById(id: string): Promise<Treino | null> {
    const row = await this.database.getFirst<TreinoRow>(
      'SELECT id, name, objetivo, created_at, updated_at FROM treinos WHERE id = ? LIMIT 1',
      [id]
    );

    return row ? Treino.restore(mapRowToPrimitives(row)) : null;
  }

  async delete(id: string): Promise<void> {
    await this.database.run('DELETE FROM treinos WHERE id = ?', [id]);
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
