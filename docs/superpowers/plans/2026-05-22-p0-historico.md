# Histórico — P0 Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the P0 bug in `SQLiteHistoricoRepository.getHistoricoExercicios` where passing more than 999 exercise IDs crashes SQLite (bind variable limit). Chunk the IDs into batches of 999 and merge the results.

**Architecture:** Split `exercicioIds` into 999-element slices, run one SQL query per slice, concatenate the raw rows, sort to restore ordering, then group by session as before.

**Tech Stack:** TypeScript, Vitest, `InMemoryHistoricoRepository` (already handles this correctly — the fix targets the SQLite path only).

---

### Task 1: Batch `getHistoricoExercicios` queries at 999 IDs per chunk

**Files:**
- Modify: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`
- Create: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.batch.test.ts`

- [ ] **Step 1: Write the failing test using InMemoryHistoricoRepository as a contract spec**

We cannot unit-test the SQLite path directly, but we can test the batching logic with a mock database client that records how many times it's called:

```ts
// apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.batch.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { SQLiteBindParams, SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteHistoricoRepository } from './SQLiteHistoricoRepository';

function makeIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `ex-${i + 1}`);
}

function makeMockDatabase(): SQLiteDatabaseClient {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getFirst: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
    withTransaction: vi.fn((fn: () => Promise<unknown>) => fn()),
    execAsync: vi.fn().mockResolvedValue(undefined),
    checkpointWal: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getSetting: vi.fn().mockResolvedValue(null),
    setSetting: vi.fn().mockResolvedValue(undefined),
    get databaseFileName() { return 'test.db'; },
    get databaseName() { return 'test'; },
  } as unknown as SQLiteDatabaseClient;
}

describe('SQLiteHistoricoRepository.getHistoricoExercicios', () => {
  it('returns empty map for empty input without querying the DB', async () => {
    const db = makeMockDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    const result = await repo.getHistoricoExercicios([]);

    expect(result.size).toBe(0);
    expect(db.getAll).not.toHaveBeenCalled();
  });

  it('issues a single query for 999 IDs', async () => {
    const db = makeMockDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    await repo.getHistoricoExercicios(makeIds(999));

    expect(db.getAll).toHaveBeenCalledTimes(1);
    const [sql, params] = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0] as [string, SQLiteBindParams];
    expect((params as string[]).length).toBe(999);
    expect(sql).toContain('IN (');
  });

  it('issues two queries for 1000 IDs (999 + 1)', async () => {
    const db = makeMockDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    await repo.getHistoricoExercicios(makeIds(1000));

    expect(db.getAll).toHaveBeenCalledTimes(2);
    const firstParams = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0][1] as string[];
    const secondParams = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[1][1] as string[];
    expect(firstParams.length).toBe(999);
    expect(secondParams.length).toBe(1);
  });

  it('issues three queries for 2500 IDs (999 + 999 + 502)', async () => {
    const db = makeMockDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    await repo.getHistoricoExercicios(makeIds(2500));

    expect(db.getAll).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd apps/mobile && npx vitest run src/infrastructure/historico/SQLiteHistoricoRepository.batch.test.ts
```
Expected: FAIL — currently a single query is issued for all IDs regardless of count.

- [ ] **Step 3: Rewrite `getHistoricoExercicios` to chunk at 999**

In `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`, replace the `getHistoricoExercicios` method (lines 91–119) with:

```ts
  async getHistoricoExercicios(exercicioIds: string[]): Promise<Map<string, ExecucaoExercicio[]>> {
    if (exercicioIds.length === 0) return new Map();

    const CHUNK_SIZE = 999;
    const allRows: HistoricoRow[] = [];

    for (let i = 0; i < exercicioIds.length; i += CHUNK_SIZE) {
      const chunk = exercicioIds.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => '?').join(', ');
      const rows = await this.database.getAll<HistoricoRow>(
        `SELECT se.exercicio_id, se.sessao_treino_id, se.nome_snapshot, st.data_hora_fim,
                se.nome_original_snapshot, se.substituicao_motivo,
                sr.id as serie_id, sr.carga_kg, sr.repeticoes, sr.observacao, sr.ordem
         FROM sessao_exercicios se
         INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
         INNER JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
         WHERE se.exercicio_id IN (${placeholders}) AND st.status = 'finalizada' AND st.data_hora_fim IS NOT NULL
         ORDER BY se.exercicio_id, st.data_hora_fim DESC, sr.ordem ASC`,
        chunk
      );
      allRows.push(...rows);
    }

    // Re-sort merged results to maintain consistent ordering across chunks.
    allRows.sort((a, b) => {
      if (a.exercicio_id !== b.exercicio_id) return a.exercicio_id.localeCompare(b.exercicio_id);
      if (a.data_hora_fim !== b.data_hora_fim) return b.data_hora_fim.localeCompare(a.data_hora_fim);
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    });

    const byExercicio = new Map<string, HistoricoRow[]>();
    for (const row of allRows) {
      const list = byExercicio.get(row.exercicio_id) ?? [];
      list.push(row);
      byExercicio.set(row.exercicio_id, list);
    }

    const result = new Map<string, ExecucaoExercicio[]>();
    for (const [id, idRows] of byExercicio) {
      result.set(id, groupBySession(idRows));
    }
    return result;
  }
```

- [ ] **Step 4: Run tests to confirm they pass**

```
cd apps/mobile && npx vitest run src/infrastructure/historico/SQLiteHistoricoRepository.batch.test.ts
```
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Run the full test suite**

```
cd apps/mobile && npm test
```
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.batch.test.ts
git commit -m "fix(historico): getHistoricoExercicios batches queries at 999 IDs to stay within SQLite bind limit"
```
