import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';

import { SQLiteHistoricoRepository } from './SQLiteHistoricoRepository';

let db: SQLiteDatabaseClient;

beforeEach(() => {
  db = createTestDatabase();
});

describe('SQLiteHistoricoRepository ignores tombstones', () => {
  it('excludes soft-deleted series from history aggregation', async () => {
    // Seed one finalized session with exercise, a live series and a tombstoned series
    await db.run(
      "INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty) VALUES ('e1','Supino','supino','Peito','Composto','kg',1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z',1)"
    );
    await db.run(
      "INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, dirty) VALUES ('s1','tr1','A','2026-01-02T10:00:00.000Z','2026-01-02T11:00:00.000Z','finalizada','2026-01-02T11:00:00.000Z',1)"
    );
    await db.run(
      "INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado, metodo, updated_at, dirty) VALUES ('se1','s1','e1',0,'Supino','Peito','Composto',1,'normal','2026-01-02T10:00:00.000Z',1)"
    );
    // Live series: 100 kg
    await db.run(
      "INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty) VALUES ('sr1','se1','valida',0,100,10,'2026-01-02T10:10:00.000Z',1)"
    );
    // Tombstoned series: 999 kg (should not appear in results)
    await db.run(
      "INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, deleted_at, dirty) VALUES ('sr2','se1','valida',1,999,10,'2026-01-02T10:11:00.000Z','2026-01-02T10:12:00.000Z',1)"
    );

    const repo = new SQLiteHistoricoRepository(db);
    const result = await repo.getHistoricoExercicio('e1');

    // Invariant: 999 kg must never appear in the result
    // Extract all cargaKg values from all series
    const allCargas = result.flatMap((historico) =>
      historico.series.map((serie) => serie.cargaKg)
    );

    expect(allCargas).not.toContain(999);
    expect(allCargas).toContain(100); // Verify we got the live series
    expect(result[0].series).toHaveLength(1); // Only one series should be returned
  });

  it('excludes soft-deleted sessions from last executions', async () => {
    // Seed one exercise with multiple sessions
    await db.run(
      "INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty) VALUES ('ex1','Agachamento','agachamento','Perna','Composto','kg',0,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z',1)"
    );

    // Session 1: live (older)
    await db.run(
      "INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, dirty) VALUES ('sess1','tr1','B','2026-01-01T10:00:00.000Z','2026-01-01T11:00:00.000Z','finalizada','2026-01-01T11:00:00.000Z',1)"
    );
    await db.run(
      "INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado, metodo, updated_at, dirty) VALUES ('se_1','sess1','ex1',0,'Agachamento','Perna','Composto',1,'normal','2026-01-01T10:00:00.000Z',1)"
    );
    await db.run(
      "INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty) VALUES ('sr_1','se_1','valida',0,80,12,'2026-01-01T10:10:00.000Z',1)"
    );

    // Session 2: tombstoned (would be newer, but should be ignored)
    await db.run(
      "INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, deleted_at, dirty) VALUES ('sess2','tr1','B','2026-01-02T10:00:00.000Z','2026-01-02T11:00:00.000Z','finalizada','2026-01-02T11:00:00.000Z','2026-01-02T12:00:00.000Z',1)"
    );
    await db.run(
      "INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado, metodo, updated_at, dirty) VALUES ('se_2','sess2','ex1',0,'Agachamento','Perna','Composto',1,'normal','2026-01-02T10:00:00.000Z',1)"
    );
    await db.run(
      "INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty) VALUES ('sr_2','se_2','valida',0,150,10,'2026-01-02T10:10:00.000Z',1)"
    );

    const repo = new SQLiteHistoricoRepository(db);
    const lastExecution = await repo.getUltimaExecucaoValida('ex1');

    // Should get session 1 (live) not session 2 (tombstoned)
    expect(lastExecution).not.toBeNull();
    expect(lastExecution!.cargaKg).toBe(80); // From session 1, not 150 from deleted session 2
  });
});
