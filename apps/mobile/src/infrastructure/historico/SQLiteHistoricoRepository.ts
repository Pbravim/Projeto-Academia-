import type {
  ExecucaoExercicio,
  ExecucaoExercicioSerie,
  HistoricoRepository,
  UltimaExecucaoValida,
} from '../../domain/historico/repositories/HistoricoRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface UltimaRow {
  carga_kg: number;
  repeticoes: number;
  data_hora_fim: string;
}

interface HistoricoRow {
  sessao_treino_id: string;
  nome_snapshot: string;
  data_hora_fim: string;
  serie_id: string | null;
  tipo_serie: string | null;
  carga_kg: number | null;
  repeticoes: number | null;
  observacao: string | null;
  ordem: number | null;
}

export class SQLiteHistoricoRepository implements HistoricoRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async getUltimaExecucaoValida(exercicioId: string): Promise<UltimaExecucaoValida | null> {
    const row = await this.database.getFirst<UltimaRow>(
      `SELECT sr.carga_kg, sr.repeticoes, st.data_hora_fim
       FROM series_registradas sr
       INNER JOIN sessao_exercicios se ON sr.sessao_exercicio_id = se.id
       INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
       WHERE se.exercicio_id = ? AND sr.tipo_serie = 'valida' AND st.status = 'finalizada'
       ORDER BY st.data_hora_fim DESC, (sr.carga_kg * (1.0 + sr.repeticoes / 30.0)) DESC
       LIMIT 1`,
      [exercicioId]
    );
    if (!row) return null;
    return { cargaKg: row.carga_kg, repeticoes: row.repeticoes, dataExecucao: row.data_hora_fim };
  }

  async getHistoricoExercicio(exercicioId: string): Promise<ExecucaoExercicio[]> {
    const rows = await this.database.getAll<HistoricoRow>(
      `SELECT se.sessao_treino_id, se.nome_snapshot, st.data_hora_fim,
              sr.id as serie_id, sr.tipo_serie, sr.carga_kg, sr.repeticoes, sr.observacao, sr.ordem
       FROM sessao_exercicios se
       INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
       LEFT JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
       WHERE se.exercicio_id = ? AND st.status = 'finalizada' AND st.data_hora_fim IS NOT NULL
       ORDER BY st.data_hora_fim DESC, sr.ordem ASC`,
      [exercicioId]
    );
    return groupBySession(rows);
  }
}

function groupBySession(rows: HistoricoRow[]): ExecucaoExercicio[] {
  const sessaoMap = new Map<string, ExecucaoExercicio>();
  const sessaoOrder: string[] = [];

  for (const row of rows) {
    if (!sessaoMap.has(row.sessao_treino_id)) {
      sessaoMap.set(row.sessao_treino_id, {
        sessaoTreinoId: row.sessao_treino_id,
        dataExecucao: row.data_hora_fim,
        nomeSnapshot: row.nome_snapshot,
        series: [],
      });
      sessaoOrder.push(row.sessao_treino_id);
    }

    if (row.serie_id !== null && row.tipo_serie !== null && row.carga_kg !== null && row.repeticoes !== null) {
      const serie: ExecucaoExercicioSerie = {
        id: row.serie_id,
        tipoSerie: row.tipo_serie as 'aquecimento' | 'valida',
        cargaKg: row.carga_kg,
        repeticoes: row.repeticoes,
        observacao: row.observacao,
        ordem: row.ordem!,
      };
      sessaoMap.get(row.sessao_treino_id)!.series.push(serie);
    }
  }

  return sessaoOrder.map((id) => sessaoMap.get(id)!);
}
