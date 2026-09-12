import { SerieRegistrada, type SerieRegistradaPrimitives } from '../../domain/sessoes/entities/SerieRegistrada';
import type { SerieRegistradaRepository } from '../../domain/sessoes/repositories/SerieRegistradaRepository';
import { nowIso } from '../../shared/utils/syncStamp';
import type { SQLiteBindParams,SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface SerieRegistradaRow {
  id: string;
  sessao_exercicio_id: string;
  ordem: number;
  carga_kg: number | null;
  repeticoes: number | null;
  observacao: string | null;
  tipo_serie: string | null;
  duracao_segundos: number | null;
  distancia_metros: number | null;
  intensidade: number | null;
}

export class SQLiteSerieRegistradaRepository implements SerieRegistradaRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(serie: SerieRegistrada): Promise<void> {
    const p = serie.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao, duracao_segundos, distancia_metros, intensidade, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.sessaoExercicioId, p.tipoSerie, p.ordem, p.cargaKg ?? null, p.repeticoes ?? null, p.observacao, p.duracaoSegundos ?? null, p.distanciaMetros ?? null, p.intensidade ?? null, nowIso()]
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

  async maxOrdemBySessaoExercicioId(sessaoExercicioId: string): Promise<number> {
    // Considera tambem as soft-deletadas: assim o `ordem` nunca e reutilizado e o CSV
    // exportado nao gera linhas com `Serie` duplicada apos deletar+recriar.
    const row = await this.database.getFirst<{ maxOrdem: number | null }>(
      'SELECT MAX(ordem) as maxOrdem FROM series_registradas WHERE sessao_exercicio_id = ?',
      [sessaoExercicioId]
    );
    return row?.maxOrdem ?? 0;
  }

  /**
   * Tombstona os segmentos (serie_segmentos) das series que casam com `whereSeries` ANTES
   * do UPDATE da mae: o sync de C3 nao pode empurrar filhos vivos de uma mae morta.
   * ON DELETE CASCADE cobre so o DELETE fisico (rebuild de tabela); soft-delete precisa
   * deste passo explicito porque splitSqlStatements nao entende BEGIN...END de trigger.
   */
  private async tombstoneSegmentosDe(whereSeries: string, params: SQLiteBindParams): Promise<void> {
    await this.database.run(
      `UPDATE serie_segmentos SET deleted_at = ?, updated_at = ?, dirty = 1
       WHERE deleted_at IS NULL AND serie_id IN (
         SELECT id FROM series_registradas WHERE ${whereSeries}
       )`,
      [nowIso(), nowIso(), ...params]
    );
  }

  async delete(id: string): Promise<void> {
    await this.tombstoneSegmentosDe('id = ?', [id]);
    await this.database.run(
      'UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async deleteBySessaoExercicioId(sessaoExercicioId: string): Promise<void> {
    await this.tombstoneSegmentosDe('sessao_exercicio_id = ? AND deleted_at IS NULL', [sessaoExercicioId]);
    await this.database.run(
      'UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE sessao_exercicio_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), sessaoExercicioId]
    );
  }

  async deleteBySessaoExercicioIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await this.tombstoneSegmentosDe(`sessao_exercicio_id IN (${placeholders}) AND deleted_at IS NULL`, ids);
    await this.database.run(
      `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE sessao_exercicio_id IN (${placeholders}) AND deleted_at IS NULL`,
      [nowIso(), nowIso(), ...ids]
    );
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    const whereSeries = `sessao_exercicio_id IN (
         SELECT id FROM sessao_exercicios WHERE exercicio_id = ?
       ) AND deleted_at IS NULL`;
    await this.tombstoneSegmentosDe(whereSeries, [exercicioId]);
    await this.database.run(
      `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1
       WHERE ${whereSeries}`,
      [nowIso(), nowIso(), exercicioId]
    );
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    const whereSeries = `deleted_at IS NULL AND sessao_exercicio_id IN (
         SELECT se.id FROM sessao_exercicios se
         INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
         WHERE st.treino_id = ?
       )`;
    await this.tombstoneSegmentosDe(whereSeries, [treinoId]);
    await this.database.run(
      `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1
       WHERE ${whereSeries}`,
      [nowIso(), nowIso(), treinoId]
    );
  }

  async update(id: string, patch: { cargaKg?: number | null; repeticoes?: number | null; duracaoSegundos?: number | null; distanciaMetros?: number | null; intensidade?: number | null; observacao?: string | null }): Promise<void> {
    await this.database.run(
      `UPDATE series_registradas SET carga_kg = ?, repeticoes = ?, duracao_segundos = ?, distancia_metros = ?, intensidade = ?, observacao = ?, updated_at = ?, dirty = 1 WHERE id = ?`,
      [patch.cargaKg ?? null, patch.repeticoes ?? null, patch.duracaoSegundos ?? null, patch.distanciaMetros ?? null, patch.intensidade ?? null, patch.observacao ?? null, nowIso(), id]
    );
  }

  async getDirty(): Promise<import('@academia/contracts').SerieRegistradaSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; sessao_exercicio_id: string; tipo_serie: string; ordem: number;
      carga_kg: number | null; repeticoes: number | null; observacao: string | null;
      duracao_segundos: number | null; distancia_metros: number | null; intensidade: number | null;
      updated_at: string; deleted_at: string | null;
    }>(
      // series_registradas has no created_at column (the domain doesn't model one);
      // the wire's createdAt is derived from updated_at.
      `SELECT id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao,
              duracao_segundos, distancia_metros, intensidade,
              updated_at, deleted_at
       FROM series_registradas WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, sessaoExercicioId: r.sessao_exercicio_id, tipoSerie: r.tipo_serie,
      ordem: r.ordem, cargaKg: r.carga_kg, repeticoes: r.repeticoes,
      duracaoSegundos: r.duracao_segundos, distanciaMetros: r.distancia_metros, intensidade: r.intensidade,
      observacao: r.observacao, createdAt: r.updated_at,
      updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@academia/contracts').SerieRegistradaSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        // No created_at column on series_registradas; createdAt rides on the wire only.
        // Guarda LWW: linha local dirty mais nova nunca e sobrescrita pelo echo-back.
        `INSERT INTO series_registradas
           (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao,
            duracao_segundos, distancia_metros, intensidade,
            updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
         ON CONFLICT(id) DO UPDATE SET
           sessao_exercicio_id = excluded.sessao_exercicio_id,
           tipo_serie = excluded.tipo_serie,
           ordem = excluded.ordem,
           carga_kg = excluded.carga_kg,
           repeticoes = excluded.repeticoes,
           observacao = excluded.observacao,
           duracao_segundos = excluded.duracao_segundos,
           distancia_metros = excluded.distancia_metros,
           intensidade = excluded.intensidade,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at,
           dirty = 0,
           server_rev = 1
         WHERE series_registradas.dirty = 0 OR series_registradas.updated_at IS NULL OR excluded.updated_at >= series_registradas.updated_at`,
        [r.id, r.sessaoExercicioId, r.tipoSerie, r.ordem, r.cargaKg, r.repeticoes,
         r.observacao, r.duracaoSegundos ?? null, r.distanciaMetros ?? null, r.intensidade ?? null,
         r.updatedAt, r.deletedAt]
      );
    }
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
    duracaoSegundos: row.duracao_segundos,
    distanciaMetros: row.distancia_metros,
    intensidade: row.intensidade,
    tipoSerie: row.tipo_serie === 'aquecimento' ? 'aquecimento' : 'valida',
  };
}
