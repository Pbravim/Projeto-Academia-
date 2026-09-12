import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteHistoricoRepository } from './SQLiteHistoricoRepository';

const T = '2026-07-01T10:00:00.000Z';

let db: SQLiteDatabaseClient;
let repo: SQLiteHistoricoRepository;

beforeEach(async () => {
  db = createTestDatabase();
  repo = new SQLiteHistoricoRepository(db);

  await db.run(
    `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty)
     VALUES ('ex1', 'Supino', 'supino', 'Peito', 'Composto', 'kg', 1, ?, ?, 0)`,
    [T, T]
  );
  await db.run(
    `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, dirty)
     VALUES ('s1', 'tr1', 'A', ?, ?, 'finalizada', ?, 0)`,
    [T, T, T]
  );
  await db.run(
    `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, updated_at, dirty)
     VALUES ('se1', 's1', 'ex1', 0, 'Supino', 'Peito', 'Composto', ?, 0)`,
    [T]
  );
  await db.run(
    `INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty)
     VALUES ('sr1', 'se1', 'valida', 0, 60, 8, ?, 0)`,
    [T]
  );
  await db.run(
    `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, descanso_segundos, created_at, dirty)
     VALUES ('sg1', 'sr1', 2, 50, 6, 0, ?, 0)`,
    [T]
  );
  // sg2 e DE PROPOSITO mais pesado que a mae (60x8, Epley 76): 70x8 -> Epley 88.67.
  // Um PR/e1RM que olhasse os degraus por engano mudaria de resultado (achado #2, revisao 1).
  await db.run(
    `INSERT INTO serie_segmentos (id, serie_id, ordem, carga_kg, repeticoes, descanso_segundos, created_at, dirty)
     VALUES ('sg2', 'sr1', 3, 70, 8, 15, ?, 0)`,
    [T]
  );
});

describe('SQLiteHistoricoRepository — degraus', () => {
  it('getHistoricoExercicio anexa os degraus da serie, ordenados', async () => {
    const historico = await repo.getHistoricoExercicio('ex1');

    expect(historico[0].series[0].segmentos).toEqual([
      { ordem: 2, cargaKg: 50, repeticoes: 6, descansoSegundos: 0 },
      { ordem: 3, cargaKg: 70, repeticoes: 8, descansoSegundos: 15 },
    ]);
  });

  it('getHistoricoExercicios (batch) tambem anexa os degraus', async () => {
    const map = await repo.getHistoricoExercicios(['ex1']);
    const historico = map.get('ex1')!;

    expect(historico[0].series[0].segmentos).toHaveLength(2);
    expect(historico[0].series[0].segmentos?.[0]).toEqual({ ordem: 2, cargaKg: 50, repeticoes: 6, descansoSegundos: 0 });
  });

  it('degraus soft-deletados ou incompletos nao aparecem', async () => {
    await db.run(`UPDATE serie_segmentos SET deleted_at = ? WHERE id = 'sg2'`, [T]);

    const historico = await repo.getHistoricoExercicio('ex1');

    expect(historico[0].series[0].segmentos).toEqual([
      { ordem: 2, cargaKg: 50, repeticoes: 6, descansoSegundos: 0 },
    ]);
  });

  it('serie sem degraus sai com `segmentos` undefined', async () => {
    await db.run(`DELETE FROM serie_segmentos`);

    const historico = await repo.getHistoricoExercicio('ex1');

    expect(historico[0].series[0].segmentos).toBeUndefined();
  });

  it('getUltimaExecucaoValida (PR) ignora completamente os degraus, mesmo o mais pesado (sg2, Epley 88.67 > 76 da mae)', async () => {
    const pr = await repo.getUltimaExecucaoValida('ex1');

    expect(pr).toEqual({ cargaKg: 60, repeticoes: 8, dataExecucao: T });
  });
});
