import { SerieRegistrada, type SerieRegistradaPrimitives, type TipoSerie } from '../../domain/sessoes/entities/SerieRegistrada';
import type { SerieRegistradaRepository } from '../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface SerieRegistradaRow {
  id: string;
  sessao_exercicio_id: string;
  tipo_serie: TipoSerie;
  ordem: number;
  carga_kg: number;
  repeticoes: number;
  observacao: string | null;
}

export class SQLiteSerieRegistradaRepository implements SerieRegistradaRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(serie: SerieRegistrada): Promise<void> {
    const p = serie.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.sessaoExercicioId, p.tipoSerie, p.ordem, p.cargaKg, p.repeticoes, p.observacao]
    );
  }

  async findById(id: string): Promise<SerieRegistrada | null> {
    const row = await this.database.getFirst<SerieRegistradaRow>(
      'SELECT * FROM series_registradas WHERE id = ? LIMIT 1',
      [id]
    );
    return row ? SerieRegistrada.restore(mapRow(row)) : null;
  }

  async listBySessaoExercicioId(sessaoExercicioId: string): Promise<SerieRegistrada[]> {
    const rows = await this.database.getAll<SerieRegistradaRow>(
      'SELECT * FROM series_registradas WHERE sessao_exercicio_id = ? ORDER BY ordem ASC',
      [sessaoExercicioId]
    );
    return rows.map((row) => SerieRegistrada.restore(mapRow(row)));
  }

  async countBySessaoExercicioId(sessaoExercicioId: string): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM series_registradas WHERE sessao_exercicio_id = ?',
      [sessaoExercicioId]
    );
    return row?.count ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.database.run('DELETE FROM series_registradas WHERE id = ?', [id]);
  }

  async deleteBySessaoExercicioId(sessaoExercicioId: string): Promise<void> {
    await this.database.run('DELETE FROM series_registradas WHERE sessao_exercicio_id = ?', [sessaoExercicioId]);
  }
}

function mapRow(row: SerieRegistradaRow): SerieRegistradaPrimitives {
  return {
    id: row.id,
    sessaoExercicioId: row.sessao_exercicio_id,
    tipoSerie: row.tipo_serie,
    ordem: row.ordem,
    cargaKg: row.carga_kg,
    repeticoes: row.repeticoes,
    observacao: row.observacao,
  };
}
