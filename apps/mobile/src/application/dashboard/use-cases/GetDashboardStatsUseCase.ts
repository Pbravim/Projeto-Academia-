import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';

export interface SessaoComVolume {
  id: string;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  volumeTotal: number;
  duracaoMin: number | null;
}

export interface EvolucaoPorTreino {
  treinoNome: string;
  sessoes: SessaoComVolume[];
}

export interface RecordeItem {
  exercicioNome: string;
  melhorOrmKg: number;
}

export interface DashboardStats {
  totalSessoes: number;
  sessoesUltimoMes: number;
  evolucaoPorTreino: EvolucaoPorTreino[];
  recordesPessoais: RecordeItem[];
}

interface GetDashboardStatsDependencies {
  database: SQLiteDatabaseClient;
}

/** Agrega estatísticas de treino para o dashboard de evolução. */
export class GetDashboardStatsUseCase {
  constructor(private readonly deps: GetDashboardStatsDependencies) {}

  async execute(): Promise<DashboardStats> {
    const [total, sessoes, records, ultimoMes] = await Promise.all([
      this.deps.database.getFirst<{ count: number }>(
        "SELECT COUNT(*) as count FROM sessao_treinos WHERE status = 'finalizada'"
      ),
      this.deps.database.getAll<{
        id: string;
        treino_nome_snapshot: string;
        data_hora_inicio: string;
        data_hora_fim: string | null;
        volume_total: number;
      }>(
        `SELECT
           st.id,
           st.treino_nome_snapshot,
           st.data_hora_inicio,
           st.data_hora_fim,
           COALESCE(SUM(CASE WHEN sr.tipo_serie = 'valida' THEN sr.carga_kg * sr.repeticoes ELSE 0 END), 0) AS volume_total
         FROM sessao_treinos st
         LEFT JOIN sessao_exercicios se ON se.sessao_treino_id = st.id
         LEFT JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
         WHERE st.status = 'finalizada'
         GROUP BY st.id
         ORDER BY st.data_hora_inicio DESC`
      ),
      this.deps.database.getAll<{ exercicio_nome: string; melhor_orm: number }>(
        `SELECT e.name AS exercicio_nome,
                MAX(sr.carga_kg * (1.0 + sr.repeticoes / 30.0)) AS melhor_orm
         FROM series_registradas sr
         JOIN sessao_exercicios se ON sr.sessao_exercicio_id = se.id
         JOIN exercises e ON se.exercicio_id = e.id
         WHERE sr.tipo_serie = 'valida'
         GROUP BY se.exercicio_id
         ORDER BY melhor_orm DESC
         LIMIT 10`
      ),
      this.deps.database.getFirst<{ count: number }>(
        "SELECT COUNT(*) as count FROM sessao_treinos WHERE status = 'finalizada' AND data_hora_inicio >= ?",
        [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
      ),
    ]);

    // Group sessions by treino name, keep last 10 per group
    const byTreino = new Map<string, SessaoComVolume[]>();
    for (const row of sessoes) {
      const entry: SessaoComVolume = {
        id: row.id,
        dataHoraInicio: row.data_hora_inicio,
        dataHoraFim: row.data_hora_fim,
        volumeTotal: Math.round(row.volume_total),
        duracaoMin:
          row.data_hora_fim
            ? Math.round((new Date(row.data_hora_fim).getTime() - new Date(row.data_hora_inicio).getTime()) / 60000)
            : null,
      };
      const list = byTreino.get(row.treino_nome_snapshot) ?? [];
      list.push(entry);
      byTreino.set(row.treino_nome_snapshot, list);
    }

    // sessoes already come DESC by date; take first 10 per group
    const evolucaoPorTreino: EvolucaoPorTreino[] = Array.from(byTreino.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([treinoNome, s]) => ({ treinoNome, sessoes: s.slice(0, 10) }));

    return {
      totalSessoes: total?.count ?? 0,
      sessoesUltimoMes: ultimoMes?.count ?? 0,
      evolucaoPorTreino,
      recordesPessoais: records.map((r) => ({
        exercicioNome: r.exercicio_nome,
        melhorOrmKg: Math.round(r.melhor_orm * 10) / 10,
      })),
    };
  }
}
