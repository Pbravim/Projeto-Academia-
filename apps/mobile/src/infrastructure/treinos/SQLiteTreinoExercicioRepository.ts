import { TreinoExercicio, type TreinoExercicioPrimitives, type MetodoExercicio } from '../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../domain/treinos/repositories/TreinoExercicioRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface TreinoExercicioRow {
  id: string;
  treino_id: string;
  exercicio_id: string;
  ordem: number;
  series_recomendadas: number | null;
  execucoes_recomendadas: number | null;
  carga_padrao: number | null;
  tempo_descanso_segundos: number | null;
  metodo: string | null;
  grupo_id: string | null;
}

export class SQLiteTreinoExercicioRepository implements TreinoExercicioRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(treinoExercicio: TreinoExercicio): Promise<void> {
    const p = treinoExercicio.toPrimitives();

    await this.database.run(
      `INSERT OR REPLACE INTO treino_exercicios (id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.treinoId, p.exercicioId, p.ordem, p.seriesRecomendadas ?? null, p.execucoesRecomendadas ?? null, p.cargaPadrao ?? null, p.tempoDescansoSegundos ?? null, p.metodo, p.grupoId ?? null]
    );
  }

  async listByTreinoId(treinoId: string): Promise<TreinoExercicio[]> {
    const rows = await this.database.getAll<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id FROM treino_exercicios WHERE treino_id = ? ORDER BY ordem ASC',
      [treinoId]
    );

    return rows.map((row) => TreinoExercicio.restore(mapRowToPrimitives(row)));
  }

  async findById(id: string): Promise<TreinoExercicio | null> {
    const row = await this.database.getFirst<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id FROM treino_exercicios WHERE id = ? LIMIT 1',
      [id]
    );

    return row ? TreinoExercicio.restore(mapRowToPrimitives(row)) : null;
  }

  async findByTreinoIdAndExercicioId(
    treinoId: string,
    exercicioId: string
  ): Promise<TreinoExercicio | null> {
    const row = await this.database.getFirst<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id FROM treino_exercicios WHERE treino_id = ? AND exercicio_id = ? LIMIT 1',
      [treinoId, exercicioId]
    );

    return row ? TreinoExercicio.restore(mapRowToPrimitives(row)) : null;
  }

  async countByTreinoId(treinoId: string): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM treino_exercicios WHERE treino_id = ?',
      [treinoId]
    );

    return row?.count ?? 0;
  }

  async countAllByTreino(): Promise<Record<string, number>> {
    const rows = await this.database.getAll<{ treino_id: string; count: number }>(
      'SELECT treino_id, COUNT(*) as count FROM treino_exercicios GROUP BY treino_id',
      []
    );

    return Object.fromEntries(rows.map((r) => [r.treino_id, r.count]));
  }

  async updateOrdem(id: string, ordem: number): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET ordem = ? WHERE id = ?',
      [ordem, id]
    );
  }

  async updateRecomendacoes(id: string, seriesRecomendadas: number | null, execucoesRecomendadas: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET series_recomendadas = ?, execucoes_recomendadas = ?, carga_padrao = ?, tempo_descanso_segundos = ? WHERE id = ?',
      [seriesRecomendadas ?? null, execucoesRecomendadas ?? null, cargaPadrao ?? null, tempoDescansoSegundos ?? null, id]
    );
  }

  async updateMetodoGrupo(id: string, metodo: MetodoExercicio, grupoId: string | null): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET metodo = ?, grupo_id = ? WHERE id = ?',
      [metodo, grupoId ?? null, id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.run('DELETE FROM treino_exercicios WHERE id = ?', [id]);
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    await this.database.run('DELETE FROM treino_exercicios WHERE treino_id = ?', [treinoId]);
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    await this.database.run('DELETE FROM treino_exercicios WHERE exercicio_id = ?', [exercicioId]);
  }
}

const VALID_METODO = new Set<string>(['normal', 'drop_set', 'piramide', 'rest_pause']);
function toMetodo(v: string | null): MetodoExercicio {
  return (v && VALID_METODO.has(v)) ? v as MetodoExercicio : 'normal';
}

function mapRowToPrimitives(row: TreinoExercicioRow): TreinoExercicioPrimitives {
  return {
    id: row.id,
    treinoId: row.treino_id,
    exercicioId: row.exercicio_id,
    ordem: row.ordem,
    seriesRecomendadas: row.series_recomendadas ?? null,
    execucoesRecomendadas: row.execucoes_recomendadas ?? null,
    cargaPadrao: row.carga_padrao ?? null,
    tempoDescansoSegundos: row.tempo_descanso_segundos ?? null,
    metodo: toMetodo(row.metodo),
    grupoId: row.grupo_id ?? null,
  };
}
