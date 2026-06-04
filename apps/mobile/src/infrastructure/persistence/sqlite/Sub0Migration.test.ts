import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/db-setup';

const SYNC_TABLES = [
  'exercises', 'treinos', 'treino_exercicios', 'sessao_treinos',
  'sessao_exercicios', 'series_registradas', 'registros_peso',
  'exercise_alternatives', 'settings',
];

describe('v16 sync columns', () => {
  it('adds updated_at, deleted_at, dirty, server_rev to every user-owned table', async () => {
    const db = createTestDatabase();
    for (const table of SYNC_TABLES) {
      const cols = await db.getAll<{ name: string }>(`PRAGMA table_info(${table})`);
      const names = new Set(cols.map((c) => c.name));
      expect(names, `${table}.updated_at`).toContain('updated_at');
      expect(names, `${table}.deleted_at`).toContain('deleted_at');
      expect(names, `${table}.dirty`).toContain('dirty');
      expect(names, `${table}.server_rev`).toContain('server_rev');
    }
  });
});
