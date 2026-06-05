import { RegistroPeso, type RegistroPesoPrimitives } from '../../domain/peso/entities/RegistroPeso';
import type { RegistroPesoRepository } from '../../domain/peso/repositories/RegistroPesoRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { nowIso } from '../../shared/utils/syncStamp';

interface RegistroPesoRow {
  id: string;
  peso_kg: number;
  data_registro: string;
  observacao: string | null;
}

export class SQLiteRegistroPesoRepository implements RegistroPesoRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(registro: RegistroPeso): Promise<void> {
    const p = registro.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO registros_peso (id, peso_kg, data_registro, observacao, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.pesoKg, p.dataRegistro, p.observacao, nowIso()]
    );
  }

  async list(): Promise<RegistroPeso[]> {
    const rows = await this.database.getAll<RegistroPesoRow>(
      'SELECT * FROM registros_peso WHERE deleted_at IS NULL ORDER BY data_registro DESC'
    );
    return rows.map((row) => RegistroPeso.restore(mapRow(row)));
  }

  async findById(id: string): Promise<RegistroPeso | null> {
    const row = await this.database.getFirst<RegistroPesoRow>(
      'SELECT * FROM registros_peso WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    return row ? RegistroPeso.restore(mapRow(row)) : null;
  }

  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE registros_peso SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async getDirty(): Promise<import('@academia/contracts').RegistroPesoSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; peso_kg: number; data_registro: string; observacao: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, peso_kg, data_registro, observacao, created_at, updated_at, deleted_at
       FROM registros_peso WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, pesoKg: r.peso_kg, dataRegistro: r.data_registro,
      observacao: r.observacao, createdAt: r.created_at,
      updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@academia/contracts').RegistroPesoSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO registros_peso
           (id, peso_kg, data_registro, observacao, created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.pesoKg, r.dataRegistro, r.observacao, r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
}

function mapRow(row: RegistroPesoRow): RegistroPesoPrimitives {
  return {
    id: row.id,
    pesoKg: row.peso_kg,
    dataRegistro: row.data_registro,
    observacao: row.observacao,
  };
}
