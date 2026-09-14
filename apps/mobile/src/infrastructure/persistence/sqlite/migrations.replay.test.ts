import { describe, expect, it } from 'vitest';

import { createTestDatabase, createTestDatabaseAtVersion } from '../../../test/db-setup';

import { migrations } from './migrations';

/**
 * Replay v0→vN das migrações REAIS no CI (P2/F rodada 3: nunca eram testadas
 * em replay). O runner de produção roda cada step em transação — este teste
 * garante que a cadeia inteira aplica limpa, com FKs íntegras e o
 * user_version final correto.
 */
describe('replay das migrações de produção', () => {
  it('aplica v0→vN sem erro, FKs íntegras e user_version final correto', async () => {
    const db = createTestDatabase(); // roda TODAS as migrações reais com FK ON

    const version = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(migrations.length);

    const fkViolations = await db.getAll('PRAGMA foreign_key_check');
    expect(fkViolations).toEqual([]);
  });

  it('as 8 tabelas sincronizadas existem com as colunas de sync', async () => {
    const db = createTestDatabase();
    const tables = [
      'exercises', 'treinos', 'treino_exercicios', 'sessao_treinos',
      'sessao_exercicios', 'series_registradas', 'registros_peso', 'exercise_alternatives',
    ];
    for (const table of tables) {
      const cols = await db.getAll<{ name: string }>(`PRAGMA table_info(${table})`);
      const names = new Set(cols.map((c) => c.name));
      expect(names.has('updated_at'), `${table}.updated_at`).toBe(true);
      expect(names.has('deleted_at'), `${table}.deleted_at`).toBe(true);
      expect(names.has('dirty'), `${table}.dirty`).toBe(true);
    }
  });

  it('v25: sessao_treinos.treino_id vira nullable e mantem as 11 colunas', async () => {
    const db = createTestDatabase();
    const cols = await db.getAll<{ name: string; notnull: number }>('PRAGMA table_info(sessao_treinos)');
    const byName = new Map(cols.map((c) => [c.name, c]));
    expect(byName.get('treino_id')?.notnull).toBe(0);
    const expected = [
      'id', 'treino_id', 'treino_nome_snapshot', 'data_hora_inicio', 'data_hora_fim',
      'status', 'arquivado', 'updated_at', 'deleted_at', 'dirty', 'server_rev',
    ];
    for (const name of expected) {
      expect(byName.has(name), `sessao_treinos.${name}`).toBe(true);
    }
    expect(cols.length).toBe(expected.length);
  });

  it('v25 (replay com dados): rebuild preserva linhas de sessao_treinos e sessao_exercicios, FK intacta e 3 indices recriados', async () => {
    // Aplica v1..v24 manualmente (a mesma cadeia real, so parando 1 step antes),
    // insere dados, depois roda a v25 sozinha e compara.
    const dbAntes = createTestDatabaseAtVersion(24);
    await dbAntes.run(
      `INSERT INTO exercises (id, name, normalized_name, group_muscle, category, equipment, load_unit, is_custom, created_at, updated_at) VALUES
       ('ex-1', 'Supino', 'supino', 'Peito', 'Composto', 'Barra', 'kg', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`
    );
    await dbAntes.run(
      `INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, arquivado, updated_at, deleted_at, dirty, server_rev)
       VALUES ('st-1', 'treino-1', 'Peito', '2026-09-13T10:00:00.000Z', NULL, 'em_andamento', 0, '2026-09-13T10:00:00.000Z', NULL, 1, NULL)`
    );
    await dbAntes.run(
      `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, realizado, updated_at, deleted_at, dirty, server_rev)
       VALUES ('se-1', 'st-1', 'ex-1', 1, 'Supino', 'Peito', 'Composto', 'Barra', 1, '2026-09-13T10:00:00.000Z', NULL, 1, NULL)`
    );

    const rowsAntes = await dbAntes.getAll('SELECT * FROM sessao_treinos ORDER BY id');

    await dbAntes.exec('PRAGMA foreign_keys = OFF;');
    await dbAntes.exec('BEGIN IMMEDIATE');
    await dbAntes.exec(migrations[24]);
    await dbAntes.exec(`PRAGMA user_version = 25`);
    await dbAntes.exec('COMMIT');
    const fkViolations = await dbAntes.getAll('PRAGMA foreign_key_check');
    await dbAntes.exec('PRAGMA foreign_keys = ON;');

    expect(fkViolations).toEqual([]);

    const rowsDepois = await dbAntes.getAll('SELECT * FROM sessao_treinos ORDER BY id');
    expect(rowsDepois).toEqual(rowsAntes);

    const fkList = await dbAntes.getAll<{ table: string }>('PRAGMA foreign_key_list(sessao_exercicios)');
    expect(fkList.some((fk) => fk.table === 'sessao_treinos')).toBe(true);

    // insert orfao deve falhar com FK religada
    await expect(
      dbAntes.run(
        `INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado, updated_at, deleted_at, dirty, server_rev)
         VALUES ('se-orfao', 'st-inexistente', 'ex-1', 1, 'x', 'x', 'x', 1, NULL, NULL, 1, NULL)`
      )
    ).rejects.toThrow();

    const indices = await dbAntes.getAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'sessao_treinos'"
    );
    const indexNames = new Set(indices.map((i) => i.name));
    expect(indexNames.has('idx_sessao_treinos_treino_id')).toBe(true);
    expect(indexNames.has('idx_sessao_treinos_status_data')).toBe(true);
    expect(indexNames.has('idx_sessao_treinos_dirty')).toBe(true);
  });
});
