import { SerieSegmento, type SerieSegmentoPrimitives } from '../../domain/sessoes/entities/SerieSegmento';
import type { SerieSegmentoRepository } from '../../domain/sessoes/repositories/SerieSegmentoRepository';
import { nowIso } from '../../shared/utils/syncStamp';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface SerieSegmentoRow {
  id: string;
  serie_id: string;
  ordem: number;
  carga_kg: number | null;
  repeticoes: number | null;
  descanso_segundos: number | null;
}

export class SQLiteSerieSegmentoRepository implements SerieSegmentoRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  /** Sem update use case no escopo desta fatia: `save` so cria (created_at fixo na 1a escrita). */
  async save(segmento: SerieSegmento): Promise<void> {
    const p = segmento.toPrimitives();
    const now = nowIso();
    await this.database.run(
      `INSERT OR REPLACE INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, descanso_segundos, created_at, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.serieId, p.ordem, p.cargaKg, p.repeticoes, p.descansoSegundos, now, now]
    );
  }

  async findById(id: string): Promise<SerieSegmento | null> {
    const row = await this.database.getFirst<SerieSegmentoRow>(
      'SELECT * FROM serie_segmentos WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    return row ? SerieSegmento.restore(mapRow(row)) : null;
  }

  async listBySerieId(serieId: string): Promise<SerieSegmento[]> {
    const rows = await this.database.getAll<SerieSegmentoRow>(
      'SELECT * FROM serie_segmentos WHERE serie_id = ? AND deleted_at IS NULL ORDER BY ordem ASC',
      [serieId]
    );
    return rows.map((row) => SerieSegmento.restore(mapRow(row)));
  }

  async listBySerieIds(serieIds: string[]): Promise<SerieSegmento[]> {
    if (serieIds.length === 0) return [];
    const placeholders = serieIds.map(() => '?').join(', ');
    const rows = await this.database.getAll<SerieSegmentoRow>(
      `SELECT * FROM serie_segmentos WHERE serie_id IN (${placeholders}) AND deleted_at IS NULL ORDER BY serie_id ASC, ordem ASC`,
      serieIds
    );
    return rows.map((row) => SerieSegmento.restore(mapRow(row)));
  }

  async maxOrdemBySerieId(serieId: string): Promise<number> {
    // Considera tambem os soft-deletados (mesma razao de maxOrdemBySessaoExercicioId).
    // Sem filhos, o degrau 1 e a propria serie-mae -> devolve 1.
    const row = await this.database.getFirst<{ maxOrdem: number | null }>(
      'SELECT MAX(ordem) as maxOrdem FROM serie_segmentos WHERE serie_id = ?',
      [serieId]
    );
    return row?.maxOrdem ?? 1;
  }

  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE serie_segmentos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), id]
    );
  }

  async deleteBySerieIds(serieIds: string[]): Promise<void> {
    if (serieIds.length === 0) return;
    const placeholders = serieIds.map(() => '?').join(', ');
    await this.database.run(
      `UPDATE serie_segmentos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE serie_id IN (${placeholders}) AND deleted_at IS NULL`,
      [nowIso(), nowIso(), ...serieIds]
    );
  }
}

function mapRow(row: SerieSegmentoRow): SerieSegmentoPrimitives {
  return {
    id: row.id,
    serieId: row.serie_id,
    ordem: row.ordem,
    cargaKg: row.carga_kg,
    repeticoes: row.repeticoes,
    descansoSegundos: row.descanso_segundos,
  };
}
