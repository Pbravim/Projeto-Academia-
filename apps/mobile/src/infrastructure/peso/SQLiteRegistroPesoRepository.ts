import { RegistroPeso, type RegistroPesoPrimitives } from '../../domain/peso/entities/RegistroPeso';
import type { RegistroPesoRepository } from '../../domain/peso/repositories/RegistroPesoRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

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
      `INSERT OR REPLACE INTO registros_peso (id, peso_kg, data_registro, observacao)
       VALUES (?, ?, ?, ?)`,
      [p.id, p.pesoKg, p.dataRegistro, p.observacao]
    );
  }

  async list(): Promise<RegistroPeso[]> {
    const rows = await this.database.getAll<RegistroPesoRow>(
      'SELECT * FROM registros_peso ORDER BY data_registro DESC'
    );
    return rows.map((row) => RegistroPeso.restore(mapRow(row)));
  }

  async findById(id: string): Promise<RegistroPeso | null> {
    const row = await this.database.getFirst<RegistroPesoRow>(
      'SELECT * FROM registros_peso WHERE id = ? LIMIT 1',
      [id]
    );
    return row ? RegistroPeso.restore(mapRow(row)) : null;
  }

  async delete(id: string): Promise<void> {
    await this.database.run('DELETE FROM registros_peso WHERE id = ?', [id]);
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
