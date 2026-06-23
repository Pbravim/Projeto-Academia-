import { describe, expect, it } from 'vitest';

import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { ResetHistoricoUseCase } from './ResetHistoricoUseCase';

interface RunCall {
  sql: string;
  params?: unknown[];
  dentroDaTransacao: boolean;
}

function makeFakeDatabase() {
  const runs: RunCall[] = [];
  let emTransacao = false;
  const database = {
    async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
      emTransacao = true;
      try {
        return await fn();
      } finally {
        emTransacao = false;
      }
    },
    async run(sql: string, params?: unknown[]) {
      runs.push({ sql, params, dentroDaTransacao: emTransacao });
    },
  } as unknown as SQLiteDatabaseClient;
  return { database, runs };
}

describe('ResetHistoricoUseCase', () => {
  it('apaga séries, exercícios e sessões finalizadas dentro de uma transação', async () => {
    const { database, runs } = makeFakeDatabase();
    await new ResetHistoricoUseCase({ database }).execute();

    expect(runs).toHaveLength(3);
    expect(runs.every((r) => r.dentroDaTransacao)).toBe(true);
    expect(runs[0].sql).toContain('DELETE FROM series_registradas');
    expect(runs[1].sql).toContain('DELETE FROM sessao_exercicios');
    expect(runs[2].sql).toContain('DELETE FROM sessao_treinos');
    expect(runs[2].params).toEqual(['finalizada']);
  });
});
