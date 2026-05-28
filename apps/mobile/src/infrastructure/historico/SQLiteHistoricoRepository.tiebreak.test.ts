import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import { SQLiteHistoricoRepository } from './SQLiteHistoricoRepository';

describe('SQLiteHistoricoRepository.getUltimasExecucoesValidas — tie-breaking', () => {
  it('returns the same session when two sessions share identical data_hora_fim', async () => {
    const db = createTestDatabase();
    const repo = new SQLiteHistoricoRepository(db);
    const SAME_FIM = '2026-05-01T10:00:00.000Z';
    await db.exec(`
      INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status)
      VALUES
        ('st-aaa', 't1', 'Treino A', '2026-05-01T09:00:00Z', '${SAME_FIM}', 'finalizada'),
        ('st-zzz', 't1', 'Treino A', '2026-05-01T09:00:00Z', '${SAME_FIM}', 'finalizada');
      INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
      VALUES
        ('se-1', 'st-aaa', 'ex-1', 1, 'Supino', 'Peito', 'Composto'),
        ('se-2', 'st-zzz', 'ex-1', 1, 'Supino', 'Peito', 'Composto');
      INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
      VALUES
        ('sr-1', 'se-1', 'valida', 1, 80, 8),
        ('sr-2', 'se-2', 'valida', 1, 80, 8);
    `);
    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const map = await repo.getUltimasExecucoesValidas();
      const entry = map.get('ex-1');
      expect(entry).not.toBeUndefined();
      results.push(entry!.dataExecucao);
    }
    expect(new Set(results).size).toBe(1);
  });

  it('returns the best 1RM series from the tiebreaker session', async () => {
    const db = createTestDatabase();
    const repo = new SQLiteHistoricoRepository(db);
    const SAME_FIM = '2026-05-01T10:00:00.000Z';
    await db.exec(`
      INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status)
      VALUES
        ('st-aaa', 't1', 'Treino A', '2026-05-01T09:00:00Z', '${SAME_FIM}', 'finalizada'),
        ('st-zzz', 't1', 'Treino A', '2026-05-01T09:00:00Z', '${SAME_FIM}', 'finalizada');
      INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
      VALUES
        ('se-1', 'st-aaa', 'ex-1', 1, 'Supino', 'Peito', 'Composto'),
        ('se-2', 'st-zzz', 'ex-1', 1, 'Supino', 'Peito', 'Composto');
      INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
      VALUES
        ('sr-1', 'se-1', 'valida', 1, 60, 10),
        ('sr-2', 'se-2', 'valida', 1, 80, 8);
    `);
    const map = await repo.getUltimasExecucoesValidas();
    const entry = map.get('ex-1');
    expect(entry?.cargaKg).toBe(80);
  });
});
