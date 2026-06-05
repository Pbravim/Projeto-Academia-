import { SessaoTreino, type SessaoTreinoPrimitives, type SessaoStatus } from '../../domain/sessoes/entities/SessaoTreino';
import type { SessaoTreinoRepository } from '../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { nowIso } from '../../shared/utils/syncStamp';

interface SessaoTreinoRow {
  id: string;
  treino_id: string;
  treino_nome_snapshot: string;
  data_hora_inicio: string;
  data_hora_fim: string | null;
  status: SessaoStatus;
}

export class SQLiteSessaoTreinoRepository implements SessaoTreinoRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(sessao: SessaoTreino): Promise<void> {
    const p = sessao.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.treinoId, p.treinoNomeSnapshot, p.dataHoraInicio, p.dataHoraFim, p.status, nowIso()]
    );
  }

  async findById(id: string): Promise<SessaoTreino | null> {
    const row = await this.database.getFirst<SessaoTreinoRow>(
      'SELECT * FROM sessao_treinos WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    return row ? SessaoTreino.restore(mapRow(row)) : null;
  }

  async findAtiva(): Promise<SessaoTreino | null> {
    const row = await this.database.getFirst<SessaoTreinoRow>(
      "SELECT * FROM sessao_treinos WHERE status = 'em_andamento' AND deleted_at IS NULL LIMIT 1"
    );
    return row ? SessaoTreino.restore(mapRow(row)) : null;
  }

  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE sessao_treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    await this.database.run(
      'UPDATE sessao_treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE treino_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), treinoId]
    );
  }

  async getDirty(): Promise<import('@academia/contracts').SessaoTreinoSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; treino_id: string; treino_nome_snapshot: string;
      data_hora_inicio: string; data_hora_fim: string | null; status: string;
      arquivado: number; created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim,
              status, arquivado, created_at, updated_at, deleted_at
       FROM sessao_treinos WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, treinoId: r.treino_id, treinoNomeSnapshot: r.treino_nome_snapshot,
      dataHoraInicio: r.data_hora_inicio, dataHoraFim: r.data_hora_fim,
      status: r.status, arquivado: Boolean(r.arquivado),
      createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@academia/contracts').SessaoTreinoSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO sessao_treinos
           (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim,
            status, arquivado, created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.treinoId, r.treinoNomeSnapshot, r.dataHoraInicio, r.dataHoraFim,
         r.status, r.arquivado ? 1 : 0, r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
}

function mapRow(row: SessaoTreinoRow): SessaoTreinoPrimitives {
  return {
    id: row.id,
    treinoId: row.treino_id,
    treinoNomeSnapshot: row.treino_nome_snapshot,
    dataHoraInicio: row.data_hora_inicio,
    dataHoraFim: row.data_hora_fim,
    status: row.status,
  };
}
