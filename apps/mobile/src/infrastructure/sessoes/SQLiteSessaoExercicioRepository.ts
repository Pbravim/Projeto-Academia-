import { SessaoExercicio, type SessaoExercicioPrimitives } from '../../domain/sessoes/entities/SessaoExercicio';
import type { SessaoExercicioRepository } from '../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

interface SessaoExercicioRow {
  id: string;
  sessao_treino_id: string;
  exercicio_id: string;
  ordem: number;
  nome_snapshot: string;
  grupo_muscular_snapshot: string;
  categoria_snapshot: string;
  equipamento_snapshot: string | null;
  realizado: number;
  series_recomendadas: number | null;
  execucoes_recomendadas: number | null;
  carga_padrao: number | null;
}

export class SQLiteSessaoExercicioRepository implements SessaoExercicioRepository {
  constructor(private readonly database: SQLiteDatabaseClient) {}

  async save(se: SessaoExercicio): Promise<void> {
    const p = se.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO sessao_exercicios
        (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, realizado, series_recomendadas, execucoes_recomendadas, carga_padrao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.sessaoTreinoId, p.exercicioId, p.ordem, p.nomeSnapshot, p.grupoMuscularSnapshot, p.categoriaSnapshot, p.equipamentoSnapshot, p.realizado ? 1 : 0, p.seriesRecomendadas ?? null, p.execucoesRecomendadas ?? null, p.cargaPadrao ?? null]
    );
  }

  async findById(id: string): Promise<SessaoExercicio | null> {
    const row = await this.database.getFirst<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE id = ? LIMIT 1',
      [id]
    );
    return row ? SessaoExercicio.restore(mapRow(row)) : null;
  }

  async findBySessaoIdAndExercicioId(sessaoId: string, exercicioId: string): Promise<SessaoExercicio | null> {
    const row = await this.database.getFirst<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE sessao_treino_id = ? AND exercicio_id = ? LIMIT 1',
      [sessaoId, exercicioId]
    );
    return row ? SessaoExercicio.restore(mapRow(row)) : null;
  }

  async listBySessaoId(sessaoId: string): Promise<SessaoExercicio[]> {
    const rows = await this.database.getAll<SessaoExercicioRow>(
      'SELECT * FROM sessao_exercicios WHERE sessao_treino_id = ? ORDER BY ordem ASC',
      [sessaoId]
    );
    return rows.map((row) => SessaoExercicio.restore(mapRow(row)));
  }

  async countBySessaoId(sessaoId: string): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM sessao_exercicios WHERE sessao_treino_id = ?',
      [sessaoId]
    );
    return row?.count ?? 0;
  }
}

function mapRow(row: SessaoExercicioRow): SessaoExercicioPrimitives {
  return {
    id: row.id,
    sessaoTreinoId: row.sessao_treino_id,
    exercicioId: row.exercicio_id,
    ordem: row.ordem,
    nomeSnapshot: row.nome_snapshot,
    grupoMuscularSnapshot: row.grupo_muscular_snapshot,
    categoriaSnapshot: row.categoria_snapshot,
    equipamentoSnapshot: row.equipamento_snapshot,
    realizado: row.realizado === 1,
    seriesRecomendadas: row.series_recomendadas ?? null,
    execucoesRecomendadas: row.execucoes_recomendadas ?? null,
    cargaPadrao: row.carga_padrao ?? null,
  };
}
