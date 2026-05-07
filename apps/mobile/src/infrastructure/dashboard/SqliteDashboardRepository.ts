import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import type {
  DashboardRepository,
  DashboardStats,
  EvolucaoPorTreino,
  ExercicioEvolucao,
  SessaoComVolume,
  SessaoExercicioEvolucao,
  SerieEvolucao,
} from '../../domain/dashboard/repositories/DashboardRepository';

export class SqliteDashboardRepository implements DashboardRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async getStats(): Promise<DashboardStats> {
    const [total, sessoes, records, ultimoMes] = await Promise.all([
      this.database.getFirst<{ count: number }>(
        "SELECT COUNT(*) as count FROM sessao_treinos WHERE status = 'finalizada'"
      ),
      this.database.getAll<{
        id: string;
        treino_id: string;
        treino_nome_snapshot: string;
        data_hora_inicio: string;
        data_hora_fim: string | null;
        volume_total: number;
        melhor_orm: number;
      }>(
        `SELECT
           st.id,
           st.treino_id,
           st.treino_nome_snapshot,
           st.data_hora_inicio,
           st.data_hora_fim,
           COALESCE(SUM(CASE WHEN sr.tipo_serie = 'valida' THEN sr.carga_kg * sr.repeticoes ELSE 0 END), 0) AS volume_total,
           COALESCE(MAX(CASE WHEN sr.tipo_serie = 'valida' THEN sr.carga_kg * (1.0 + sr.repeticoes / 30.0) ELSE 0 END), 0) AS melhor_orm
         FROM sessao_treinos st
         LEFT JOIN sessao_exercicios se ON se.sessao_treino_id = st.id
         LEFT JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
         WHERE st.status = 'finalizada'
         GROUP BY st.id
         ORDER BY st.data_hora_inicio DESC`
      ),
      this.database.getAll<{ exercicio_nome: string; melhor_orm: number }>(
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
      this.database.getFirst<{ count: number }>(
        "SELECT COUNT(*) as count FROM sessao_treinos WHERE status = 'finalizada' AND data_hora_inicio >= ?",
        [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
      ),
    ]);

    const byTreino = new Map<string, { treinoId: string; sessoes: SessaoComVolume[] }>();
    for (const row of sessoes) {
      const entry: SessaoComVolume = {
        id: row.id,
        dataHoraInicio: row.data_hora_inicio,
        dataHoraFim: row.data_hora_fim,
        volumeTotal: Math.round(row.volume_total),
        melhorOrm: Math.round(row.melhor_orm * 10) / 10,
        duracaoMin: row.data_hora_fim
          ? Math.round(
              (new Date(row.data_hora_fim).getTime() - new Date(row.data_hora_inicio).getTime()) /
                60000
            )
          : null,
      };
      const key = row.treino_nome_snapshot;
      const existing = byTreino.get(key) ?? { treinoId: row.treino_id, sessoes: [] };
      existing.sessoes.push(entry);
      byTreino.set(key, existing);
    }

    const evolucaoPorTreino: EvolucaoPorTreino[] = Array.from(byTreino.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([treinoNome, { treinoId, sessoes }]) => ({
        treinoId,
        treinoNome,
        sessoes: sessoes.slice(0, 10),
      }));

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

  async getEvolucaoExercicios(treinoId: string): Promise<ExercicioEvolucao[]> {
    const rows = await this.database.getAll<{
      exercicio_id: string;
      exercicio_nome: string;
      group_muscle: string;
      sessao_id: string;
      data_hora_inicio: string;
      carga_kg: number;
      repeticoes: number;
    }>(
      `SELECT
         se.exercicio_id,
         se.nome_snapshot           AS exercicio_nome,
         se.grupo_muscular_snapshot AS group_muscle,
         st.id                      AS sessao_id,
         st.data_hora_inicio,
         sr.carga_kg,
         sr.repeticoes
       FROM sessao_treinos st
       JOIN sessao_exercicios se ON se.sessao_treino_id = st.id
       JOIN series_registradas sr
         ON sr.sessao_exercicio_id = se.id AND sr.tipo_serie = 'valida'
       WHERE st.treino_id = ? AND st.status = 'finalizada'
       ORDER BY se.nome_snapshot ASC, st.data_hora_inicio DESC, sr.ordem ASC`,
      [treinoId]
    );

    type ExAccum = {
      nome: string;
      group: string;
      sessaoOrder: string[];
      sessoes: Map<string, { dataHoraInicio: string; series: SerieEvolucao[] }>;
    };

    const byExercicio = new Map<string, ExAccum>();

    for (const row of rows) {
      let ex = byExercicio.get(row.exercicio_id);
      if (!ex) {
        ex = { nome: row.exercicio_nome, group: row.group_muscle, sessaoOrder: [], sessoes: new Map() };
        byExercicio.set(row.exercicio_id, ex);
      }

      if (!ex.sessoes.has(row.sessao_id)) {
        if (ex.sessaoOrder.length >= 10) continue;
        ex.sessaoOrder.push(row.sessao_id);
        ex.sessoes.set(row.sessao_id, { dataHoraInicio: row.data_hora_inicio, series: [] });
      }

      ex.sessoes.get(row.sessao_id)!.series.push({ cargaKg: row.carga_kg, repeticoes: row.repeticoes });
    }

    return Array.from(byExercicio.entries()).map(([exercicioId, ex]) => {
      const sessoes: SessaoExercicioEvolucao[] = ex.sessaoOrder.map((sid) => {
        const s = ex.sessoes.get(sid)!;
        const melhorOrm = s.series.reduce((max, sr) => {
          const orm = sr.cargaKg * (1 + sr.repeticoes / 30);
          return orm > max ? orm : max;
        }, 0);
        return {
          sessaoId: sid,
          dataHoraInicio: s.dataHoraInicio,
          melhorOrm: Math.round(melhorOrm * 10) / 10,
          series: s.series,
        };
      });
      return { exercicioId, exercicioNome: ex.nome, groupMuscle: ex.group, sessoes };
    });
  }
}
