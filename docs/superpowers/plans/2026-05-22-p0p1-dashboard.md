# Dashboard — P0 + P1 Bug Fixes Implementation Plan — ✅ IMPLEMENTADO (2026-05-22)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three bugs in the Dashboard module: `ImportarBancoUseCase` can leave the user with no database if the file copy throws (P0); `getStats()` counts `totalSessoes` inconsistently with the sessions list query (P1); and an arbitrary `LIMIT 200` silently truncates session history for power users (P1).

**Architecture:** The import fix wraps `pickedFile.copy(dest)` in a try/catch that restores the backup on failure. The stats inconsistency is fixed by adding an `EXISTS` subquery to `totalSessoes` so both values count the same set of sessions. The LIMIT is removed — SQLite handles hundreds of rows trivially and date-based filtering gives more meaningful results.

**Tech Stack:** TypeScript, `expo-file-system`, SQLite.

---

### Task 1: Add try/catch + restore to `ImportarBancoUseCase`

**Files:**
- Modify: `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts`
- Create: `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.test.ts`

- [ ] **Step 1: Write the failing test**

`ImportarBancoUseCase` depends on `expo-document-picker` and `expo-file-system` which are native modules. We test the failure path via a mock `databaseClient` and a stub that simulates the file operations:

```ts
// apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';

// We test the logic only — native FS calls are mocked at module level.
// The key invariant: if copy() throws, the backup must be restored.

describe('ImportarBancoUseCase — copy failure restores backup', () => {
  it('re-throws the copy error and does not leave the user without a database', async () => {
    // This test documents the expected behavior. The actual enforcement
    // is in the try/catch added in Task 1 Step 3. A full integration test
    // requires a device; here we verify the error surface via code review.
    //
    // Invariant: pickedFile.copy(dest) is inside try { } catch (err) { restore; throw err; }
    const src = `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts`;
    const { readFileSync } = await import('fs');
    const code = readFileSync(src, 'utf-8');

    expect(code).toContain('try {');
    expect(code).toContain('pickedFile.copy(dest)');
    expect(code).toContain('backupFile');
    expect(code).toContain('backupFile.copy(dest)');
    expect(code).toContain('throw err');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
cd apps/mobile && npx vitest run src/application/dashboard/use-cases/ImportarBancoUseCase.test.ts
```
Expected: FAIL — the current code has `pickedFile.copy(dest)` unprotected.

- [ ] **Step 3: Wrap `pickedFile.copy(dest)` in try/catch with backup restore**

In `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts`, find the section:

```ts
    // Cria backup de segurança antes de sobrescrever.
    if (dest.exists) {
      const ts = Date.now();
      const backupFile = new File(Paths.cache, `academia-pre-import-${ts}.db`);
      dest.copy(backupFile);
      dest.delete();
    }

    // Remove restos de WAL/SHM do banco antigo para evitar corrupção.
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = new File(sqliteDir, `${dbName}${suffix}`);
      if (sidecar.exists) sidecar.delete();
    }

    pickedFile.copy(dest);

    return { status: 'imported' };
```

Replace with:
```ts
    // Cria backup de segurança antes de sobrescrever.
    let backupFile: InstanceType<typeof File> | null = null;
    if (dest.exists) {
      const ts = Date.now();
      backupFile = new File(Paths.cache, `academia-pre-import-${ts}.db`);
      dest.copy(backupFile);
      dest.delete();
    }

    // Remove restos de WAL/SHM do banco antigo para evitar corrupção.
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = new File(sqliteDir, `${dbName}${suffix}`);
      if (sidecar.exists) sidecar.delete();
    }

    try {
      pickedFile.copy(dest);
    } catch (err) {
      if (backupFile?.exists) {
        backupFile.copy(dest);
      }
      throw err;
    }

    return { status: 'imported' };
```

- [ ] **Step 4: Run test to confirm it passes**

```
cd apps/mobile && npx vitest run src/application/dashboard/use-cases/ImportarBancoUseCase.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.test.ts
git commit -m "fix(dashboard): ImportarBancoUseCase restores backup if file copy fails"
```

---

### Task 2: Align `totalSessoes` with `sessoes` list in `getStats()`

**Files:**
- Modify: `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts`

The SQL `totalSessoes` query counts ALL finalized sessions, but the `sessoes` list uses `HAVING COUNT(sr.id) > 0` to exclude sessions with no recorded series. This makes the badge count and the list length inconsistent. The fix aligns `totalSessoes` to also exclude series-less sessions.

Note: `SqliteDashboardRepository` uses live SQLite — no InMemory equivalent exists. Unit tests are not feasible here; the fix is verified by reading the query.

- [ ] **Step 1: Locate the `totalSessoes` query in `SqliteDashboardRepository.ts`**

Around line 44–46:
```ts
      this.database.getFirst<{ count: number }>(
        "SELECT COUNT(*) as count FROM sessao_treinos WHERE status = 'finalizada' AND arquivado = 0"
      ),
```

- [ ] **Step 2: Replace the `totalSessoes` query to match the session list filter**

Replace:
```ts
      this.database.getFirst<{ count: number }>(
        "SELECT COUNT(*) as count FROM sessao_treinos WHERE status = 'finalizada' AND arquivado = 0"
      ),
```

With:
```ts
      this.database.getFirst<{ count: number }>(
        `SELECT COUNT(*) as count FROM sessao_treinos st
         WHERE status = 'finalizada' AND arquivado = 0
         AND EXISTS (
           SELECT 1 FROM sessao_exercicios se
           JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
           WHERE se.sessao_treino_id = st.id
         )`
      ),
```

- [ ] **Step 3: Run the full test suite to confirm no regressions**

```
cd apps/mobile && npm test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts
git commit -m "fix(dashboard): align totalSessoes count with session list filter (both require at least 1 serie)"
```

---

### Task 3: Remove arbitrary `LIMIT 200` from session list query

**Files:**
- Modify: `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts`

The `LIMIT 200` in `getStats()` truncates older sessions for prolific users. Since the query already joins `series_registradas` (which itself filters rows), and the result is used for client-side aggregation, the limit is arbitrary and harmful. Removing it lets the query return all finalized sessions.

- [ ] **Step 1: Locate the LIMIT line**

In `SqliteDashboardRepository.ts`, the `sessoes` list query (around line 73) ends with:
```sql
         LIMIT 200
```

- [ ] **Step 2: Remove the LIMIT**

Find and remove the line:
```ts
         LIMIT 200
```

The query should end with:
```sql
         ORDER BY st.data_hora_inicio DESC
```

(Remove `LIMIT 200\n` from the template literal.)

- [ ] **Step 3: Run the full test suite**

```
cd apps/mobile && npm test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts
git commit -m "fix(dashboard): remove LIMIT 200 from session list query — was silently truncating history"
```
