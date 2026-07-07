import { describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../../test/db-setup';
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
});
