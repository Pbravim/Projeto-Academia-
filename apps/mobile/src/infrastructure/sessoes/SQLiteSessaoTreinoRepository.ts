import { SessaoTreino, type SessaoTreinoPrimitives, type SessaoStatus } from '../../domain/sessoes/entities/SessaoTreino';
import type { SessaoTreinoRepository } from '../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

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
      `INSERT OR REPLACE INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [p.id, p.treinoId, p.treinoNomeSnapshot, p.dataHoraInicio, p.dataHoraFim, p.status]
    );
  }

  async findById(id: string): Promise<SessaoTreino | null> {
    const row = await this.database.getFirst<SessaoTreinoRow>(
      'SELECT * FROM sessao_treinos WHERE id = ? LIMIT 1',
      [id]
    );
    return row ? SessaoTreino.restore(mapRow(row)) : null;
  }

  async findAtiva(): Promise<SessaoTreino | null> {
    const row = await this.database.getFirst<SessaoTreinoRow>(
      "SELECT * FROM sessao_treinos WHERE status = 'em_andamento' LIMIT 1"
    );
    return row ? SessaoTreino.restore(mapRow(row)) : null;
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
