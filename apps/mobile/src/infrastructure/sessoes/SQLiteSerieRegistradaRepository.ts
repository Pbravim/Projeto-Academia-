import { SerieRegistrada, type SerieRegistradaPrimitives } from '../../domain/sessoes/entities/SerieRegistrada';
import type { SerieRegistradaRepository } from '../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { nowIso } from '../../shared/utils/syncStamp';

interface SerieRegistradaRow {
  id: string;
  sessao_exercicio_id: string;
  ordem: number;
  carga_kg: number;
  repeticoes: number;
  observacao: string | null;
  tipo_serie: string | null;
}

export class SQLiteSerieRegistradaRepository implements SerieRegistradaRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(serie: SerieRegistrada): Promise<void> {
    const p = serie.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.sessaoExercicioId, p.tipoSerie, p.ordem, p.cargaKg, p.repeticoes, p.observacao, nowIso()]
    );
  }

  async findById(id: string): Promise<SerieRegistrada | null> {
    const row = await this.database.getFirst<SerieRegistradaRow>(
      'SELECT * FROM series_registradas WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    return row ? SerieRegistrada.restore(mapRow(row)) : null;
  }

  async listBySessaoExercicioId(sessaoExercicioId: string): Promise<SerieRegistrada[]> {
    const rows = await this.database.getAll<SerieRegistradaRow>(
      'SELECT * FROM series_registradas WHERE sessao_exercicio_id = ? AND deleted_at IS NULL ORDER BY ordem ASC',
      [sessaoExercicioId]
    );
    return rows.map((row) => SerieRegistrada.restore(mapRow(row)));
  }

  async listBySessaoExercicioIds(ids: string[]): Promise<SerieRegistrada[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await this.database.getAll<SerieRegistradaRow>(
      `SELECT * FROM series_registradas WHERE sessao_exercicio_id IN (${placeholders}) AND deleted_at IS NULL ORDER BY ordem ASC`,
      ids,
    );
    return rows.map((row) => SerieRegistrada.restore(mapRow(row)));
  }

  async countBySessaoExercicioId(sessaoExercicioId: string): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM series_registradas WHERE sessao_exercicio_id = ? AND deleted_at IS NULL',
      [sessaoExercicioId]
    );
    return row?.count ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async deleteBySessaoExercicioId(sessaoExercicioId: string): Promise<void> {
    await this.database.run(
      'UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE sessao_exercicio_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), sessaoExercicioId]
    );
  }

  async deleteBySessaoExercicioIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await this.database.run(
      `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE sessao_exercicio_id IN (${placeholders}) AND deleted_at IS NULL`,
      [nowIso(), nowIso(), ...ids]
    );
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    await this.database.run(
      `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1
       WHERE sessao_exercicio_id IN (
         SELECT id FROM sessao_exercicios WHERE exercicio_id = ?
       ) AND deleted_at IS NULL`,
      [nowIso(), nowIso(), exercicioId]
    );
  }

  async update(id: string, patch: { cargaKg: number; repeticoes: number; observacao?: string | null }): Promise<void> {
    await this.database.run(
      `UPDATE series_registradas SET carga_kg = ?, repeticoes = ?, observacao = ?, updated_at = ?, dirty = 1 WHERE id = ?`,
      [patch.cargaKg, patch.repeticoes, patch.observacao ?? null, nowIso(), id]
    );
  }
}

function mapRow(row: SerieRegistradaRow): SerieRegistradaPrimitives {
  return {
    id: row.id,
    sessaoExercicioId: row.sessao_exercicio_id,
    ordem: row.ordem,
    cargaKg: row.carga_kg,
    repeticoes: row.repeticoes,
    observacao: row.observacao,
    tipoSerie: (row.tipo_serie === 'aquecimento' ? 'aquecimento' : 'valida') as const,
  };
}
