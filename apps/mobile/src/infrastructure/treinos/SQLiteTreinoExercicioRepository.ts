import { TreinoExercicio, type TreinoExercicioPrimitives } from '../../domain/treinos/entities/TreinoExercicio';
import type { TreinoExercicioRepository } from '../../domain/treinos/repositories/TreinoExercicioRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface TreinoExercicioRow {
  id: string;
  treino_id: string;
  exercicio_id: string;
  ordem: number;
  series_recomendadas: number | null;
  execucoes_recomendadas: number | null;
}

export class SQLiteTreinoExercicioRepository implements TreinoExercicioRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(treinoExercicio: TreinoExercicio): Promise<void> {
    const p = treinoExercicio.toPrimitives();

    await this.database.run(
      `INSERT OR REPLACE INTO treino_exercicios (id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [p.id, p.treinoId, p.exercicioId, p.ordem, p.seriesRecomendadas ?? null, p.execucoesRecomendadas ?? null]
    );
  }

  async listByTreinoId(treinoId: string): Promise<TreinoExercicio[]> {
    const rows = await this.database.getAll<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas FROM treino_exercicios WHERE treino_id = ? ORDER BY ordem ASC',
      [treinoId]
    );

    return rows.map((row) => TreinoExercicio.restore(mapRowToPrimitives(row)));
  }

  async findById(id: string): Promise<TreinoExercicio | null> {
    const row = await this.database.getFirst<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas FROM treino_exercicios WHERE id = ? LIMIT 1',
      [id]
    );

    return row ? TreinoExercicio.restore(mapRowToPrimitives(row)) : null;
  }

  async findByTreinoIdAndExercicioId(
    treinoId: string,
    exercicioId: string
  ): Promise<TreinoExercicio | null> {
    const row = await this.database.getFirst<TreinoExercicioRow>(
      'SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas FROM treino_exercicios WHERE treino_id = ? AND exercicio_id = ? LIMIT 1',
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

  async updateOrdem(id: string, ordem: number): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET ordem = ? WHERE id = ?',
      [ordem, id]
    );
  }

  async updateRecomendacoes(id: string, seriesRecomendadas: number | null, execucoesRecomendadas: number | null): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET series_recomendadas = ?, execucoes_recomendadas = ? WHERE id = ?',
      [seriesRecomendadas ?? null, execucoesRecomendadas ?? null, id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.run('DELETE FROM treino_exercicios WHERE id = ?', [id]);
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    await this.database.run('DELETE FROM treino_exercicios WHERE treino_id = ?', [treinoId]);
  }
}

function mapRowToPrimitives(row: TreinoExercicioRow): TreinoExercicioPrimitives {
  return {
    id: row.id,
    treinoId: row.treino_id,
    exercicioId: row.exercicio_id,
    ordem: row.ordem,
    seriesRecomendadas: row.series_recomendadas ?? null,
    execucoesRecomendadas: row.execucoes_recomendadas ?? null,
  };
}
