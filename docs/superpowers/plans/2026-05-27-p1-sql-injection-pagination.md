# Exercises — P1 SQL Injection em Paginação de `SQLiteExerciseRepository`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a interpolação direta de `LIMIT` e `OFFSET` em `SQLiteExerciseRepository.list()` por bind parameters para eliminar o risco de SQL injection.

**Architecture:** A correção troca `LIMIT ${options.limit} OFFSET ${options.offset ?? 0}` por `LIMIT ? OFFSET ?` com valores passados via array de bind params. Como SQLite suporta paginação via bind vars, a mudança é de uma linha lógica. Extrai-se também os dois campos SQL (`SELECT` + `FROM`) numa const para evitar duplicação entre o path com e sem paginação.

**Tech Stack:** TypeScript, Vitest, `InMemoryExerciseRepository` (test) e mock `SQLiteDatabaseClient`.

---

### Task 1: Parametrizar LIMIT/OFFSET em `SQLiteExerciseRepository.list()`

**Files:**
- Modify: `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`
- Create: `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.pagination.test.ts`

- [ ] **Step 1: Escrever o teste que documenta o comportamento esperado**

O teste usa um mock de `SQLiteDatabaseClient` para verificar que os valores de `limit` e `offset` chegam como bind params, nunca interpolados no SQL.

```ts
// apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.pagination.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';

function makeMockDb(): SQLiteDatabaseClient {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getFirst: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue(undefined),
    runWithChanges: vi.fn().mockResolvedValue(0),
    withTransaction: vi.fn((fn: () => Promise<unknown>) => fn()),
  } as unknown as SQLiteDatabaseClient;
}

describe('SQLiteExerciseRepository.list — pagination', () => {
  it('passes limit and offset as bind params, not string interpolation', async () => {
    const db = makeMockDb();
    const repo = new SQLiteExerciseRepository(db);

    await repo.list({ limit: 20, offset: 40 });

    expect(db.getAll).toHaveBeenCalledOnce();
    const [sql, params] = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];

    // SQL must NOT contain the literal numbers 20 or 40
    expect(sql).not.toContain('20');
    expect(sql).not.toContain('40');

    // Values must be passed as bind parameters
    expect(params).toContain(20);
    expect(params).toContain(40);
    expect(sql).toContain('LIMIT ?');
    expect(sql).toContain('OFFSET ?');
  });

  it('calls without params when no pagination options provided', async () => {
    const db = makeMockDb();
    const repo = new SQLiteExerciseRepository(db);

    await repo.list();

    expect(db.getAll).toHaveBeenCalledOnce();
    const [sql, params] = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[] | undefined];

    expect(sql).not.toContain('LIMIT');
    expect(params).toBeUndefined();
  });

  it('uses offset 0 when limit is provided without explicit offset', async () => {
    const db = makeMockDb();
    const repo = new SQLiteExerciseRepository(db);

    await repo.list({ limit: 10 });

    const [, params] = (db.getAll as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(params).toEqual([10, 0]);
  });
});
```

- [ ] **Step 2: Confirmar que o teste falha**

```
cd apps/mobile && npx vitest run src/infrastructure/exercises/SQLiteExerciseRepository.pagination.test.ts
```

Expected: FAIL — o SQL atual contém `${options.limit}` interpolado.

- [ ] **Step 3: Corrigir `list()` em `SQLiteExerciseRepository.ts`**

Em `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`, substituir o método `list()` (linhas 50-62) com:

```ts
  async list(options?: ListExercisesOptions): Promise<Exercise[]> {
    const SELECT = `SELECT id, name, normalized_name, group_muscle, category, equipment,
              load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo
       FROM exercises ORDER BY normalized_name ASC`;

    if (options?.limit != null) {
      const rows = await this.database.getAll<ExerciseRow>(
        `${SELECT} LIMIT ? OFFSET ?`,
        [options.limit, options.offset ?? 0]
      );
      return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
    }

    const rows = await this.database.getAll<ExerciseRow>(SELECT);
    return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
  }
```

- [ ] **Step 4: Confirmar que os testes passam**

```
cd apps/mobile && npx vitest run src/infrastructure/exercises/SQLiteExerciseRepository.pagination.test.ts
```

Expected: PASS — 3 testes verdes.

- [ ] **Step 5: Rodar a suite completa**

```
cd apps/mobile && npm test 2>&1 | tail -4
```

Expected: 0 failed.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts \
        apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.pagination.test.ts
git commit -m "fix(exercises): use bind params for LIMIT/OFFSET to prevent SQL injection"
```
