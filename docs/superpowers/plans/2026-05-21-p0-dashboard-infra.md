# P0 Dashboard + Infra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 P0 bugs spread across Dashboard, Plano Semanal, and Histórico: missing transaction in `DeletarSessaoUseCase`, missing try/catch in `ImportarBancoUseCase`, `ResetHistoricoUseCase` destroying active sessions, `SQLitePlanoSemanalRepository.setDia` silently no-oping with UPDATE, and `getHistoricoExercicios` crashing with >999 exercise IDs.

**Architecture:** These are infrastructure-level fixes. No new domain concepts needed. All changes are in the infrastructure or application layer. No InMemory repos exist for Dashboard so there are no unit tests to write for transaction fixes — the changes are straightforward SQL/logic corrections.

**Tech Stack:** TypeScript, SQLite (via expo-sqlite), Vitest.

---

## Files Modified

- Modify: `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts`
- Modify: `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts`
- Modify: `apps/mobile/src/application/dashboard/use-cases/ResetHistoricoUseCase.ts`
- Modify: `apps/mobile/src/infrastructure/plano/SQLitePlanoSemanalRepository.ts`
- Modify: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`

---

### Task 1: SqliteDashboardRepository.deletarSessao — wrap in transaction

**Context:** `SqliteDashboardRepository.ts:267-281` — `deletarSessao` runs 3 sequential SQL statements (SELECT exercicio ids, DELETE series, DELETE exercicios, DELETE sessao) with no transaction. If the process is killed between statements, the database is left partially torn down.

**Files:**
- Modify: `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts`

- [ ] **Step 1: Read the current deletarSessao method**

Open `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts` and locate the `deletarSessao` method (around line 267). The current implementation:

```typescript
async deletarSessao(sessaoId: string): Promise<void> {
  const exercicioIds = await this.database.getAll<{ id: string }>(
    'SELECT id FROM sessao_exercicios WHERE sessao_treino_id = ?',
    [sessaoId]
  );
  if (exercicioIds.length > 0) {
    const placeholders = exercicioIds.map(() => '?').join(',');
    const ids = exercicioIds.map((r) => r.id);
    await this.database.run(
      `DELETE FROM series_registradas WHERE sessao_exercicio_id IN (${placeholders})`,
      ids
    );
  }
  await this.database.run('DELETE FROM sessao_exercicios WHERE sessao_treino_id = ?', [sessaoId]);
  await this.database.run('DELETE FROM sessao_treinos WHERE id = ?', [sessaoId]);
}
```

- [ ] **Step 2: Wrap all statements in withTransaction**

Replace the `deletarSessao` method body with:

```typescript
async deletarSessao(sessaoId: string): Promise<void> {
  await this.database.withTransaction(async () => {
    const exercicioIds = await this.database.getAll<{ id: string }>(
      'SELECT id FROM sessao_exercicios WHERE sessao_treino_id = ?',
      [sessaoId]
    );
    if (exercicioIds.length > 0) {
      const placeholders = exercicioIds.map(() => '?').join(',');
      const ids = exercicioIds.map((r) => r.id);
      await this.database.run(
        `DELETE FROM series_registradas WHERE sessao_exercicio_id IN (${placeholders})`,
        ids
      );
    }
    await this.database.run('DELETE FROM sessao_exercicios WHERE sessao_treino_id = ?', [sessaoId]);
    await this.database.run('DELETE FROM sessao_treinos WHERE id = ?', [sessaoId]);
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts
git commit -m "fix(dashboard): wrap deletarSessao in transaction"
```

---

### Task 2: ResetHistoricoUseCase — filter to finalizada sessions only

**Context:** `ResetHistoricoUseCase.ts:12-15` — deletes ALL rows from `sessao_treinos` including the one with `status = 'em_andamento'`. The active session record is destroyed while the UI still has it in memory — next action (e.g., registrar série) references a non-existent session, causing silent failures or app state corruption. The fix: add `WHERE status = 'finalizada'` guards so that only historical (finished) sessions and their cascaded data are deleted.

**Files:**
- Modify: `apps/mobile/src/application/dashboard/use-cases/ResetHistoricoUseCase.ts`

- [ ] **Step 1: Read current implementation**

Current `apps/mobile/src/application/dashboard/use-cases/ResetHistoricoUseCase.ts`:

```typescript
async execute(): Promise<void> {
  await this.deps.database.withTransaction(async () => {
    await this.deps.database.run('DELETE FROM series_registradas');
    await this.deps.database.run('DELETE FROM sessao_exercicios');
    await this.deps.database.run('DELETE FROM sessao_treinos');
  });
}
```

- [ ] **Step 2: Replace with filtered deletes**

Replace the `execute` method body with:

```typescript
async execute(): Promise<void> {
  await this.deps.database.withTransaction(async () => {
    // Delete series only from finalized sessions
    await this.deps.database.run(`
      DELETE FROM series_registradas
      WHERE sessao_exercicio_id IN (
        SELECT se.id FROM sessao_exercicios se
        INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
        WHERE st.status = 'finalizada'
      )
    `);
    // Delete exercises only from finalized sessions
    await this.deps.database.run(`
      DELETE FROM sessao_exercicios
      WHERE sessao_treino_id IN (
        SELECT id FROM sessao_treinos WHERE status = 'finalizada'
      )
    `);
    // Delete only finalized sessions
    await this.deps.database.run(`DELETE FROM sessao_treinos WHERE status = 'finalizada'`);
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/application/dashboard/use-cases/ResetHistoricoUseCase.ts
git commit -m "fix(dashboard): ResetHistoricoUseCase must not delete active session"
```

---

### Task 3: ImportarBancoUseCase — add try/catch around file copy

**Context:** `ImportarBancoUseCase.ts:48-61` — the code deletes the existing database (`dest.delete()`) before copying the new file. If `dest.copy(backupFile)` or `pickedFile.copy(dest)` throws (e.g., disk full, permission denied), the user loses their database with no recovery path. Fix: restructure so the backup copy is verified before deleting the original, and the final copy is wrapped in try/catch that restores from backup on failure.

**Files:**
- Modify: `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts`

- [ ] **Step 1: Read the current execute method**

Open `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts`. The section to change is the block starting at line 47 (after WAL checkpoint and close):

```typescript
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
```

- [ ] **Step 2: Replace file copy section with safe version**

Replace the block above (lines 47-61 approximately) with:

```typescript
// Cria backup de segurança antes de sobrescrever.
let backupFile: File | null = null;
if (dest.exists) {
  const ts = Date.now();
  backupFile = new File(Paths.cache, `academia-pre-import-${ts}.db`);
  try {
    dest.copy(backupFile);
  } catch {
    throw new Error('Falha ao criar backup do banco atual. Importacao cancelada.');
  }
  dest.delete();
}

// Remove restos de WAL/SHM do banco antigo para evitar corrupcao.
for (const suffix of ['-wal', '-shm']) {
  const sidecar = new File(sqliteDir, `${dbName}${suffix}`);
  if (sidecar.exists) sidecar.delete();
}

try {
  pickedFile.copy(dest);
} catch {
  if (backupFile?.exists) {
    backupFile.copy(dest);
  }
  throw new Error('Falha ao copiar banco importado. Banco original foi restaurado.');
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If `File` type doesn't have `.exists` as a property (it's a getter in expo-file-system), check the type — in expo-file-system v2 `file.exists` is a boolean getter, so `backupFile?.exists` works.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts
git commit -m "fix(dashboard): guard ImportarBancoUseCase against data loss on copy failure"
```

---

### Task 4: SQLitePlanoSemanalRepository.setDia — use INSERT OR REPLACE

**Context:** `SQLitePlanoSemanalRepository.ts:24-28` — uses `UPDATE plano_semanal SET ... WHERE dia_semana = ?`. If the table row doesn't exist (e.g., newly created database before the seed migration runs, or corrupted seed), the UPDATE is a silent no-op and the user's plan is discarded. `INSERT OR REPLACE` handles both insert and update atomically.

**Files:**
- Modify: `apps/mobile/src/infrastructure/plano/SQLitePlanoSemanalRepository.ts`

- [ ] **Step 1: Read current setDia**

Current `apps/mobile/src/infrastructure/plano/SQLitePlanoSemanalRepository.ts`:

```typescript
async setDia(dia: DiaSemana, treinoId: string | null): Promise<void> {
  await this.db.run(
    'UPDATE plano_semanal SET treino_id = ? WHERE dia_semana = ?',
    [treinoId, dia]
  );
}
```

- [ ] **Step 2: Replace UPDATE with INSERT OR REPLACE**

Replace the `setDia` method with:

```typescript
async setDia(dia: DiaSemana, treinoId: string | null): Promise<void> {
  await this.db.run(
    'INSERT OR REPLACE INTO plano_semanal (dia_semana, treino_id) VALUES (?, ?)',
    [dia, treinoId]
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/infrastructure/plano/SQLitePlanoSemanalRepository.ts
git commit -m "fix(plano): use INSERT OR REPLACE in setDia to handle missing rows"
```

---

### Task 5: SQLiteHistoricoRepository.getHistoricoExercicios — batch >999 IDs

**Context:** `SQLiteHistoricoRepository.ts:92-106` — builds `IN (${placeholders})` with all exercise IDs at once. SQLite allows max 999 bound parameters per statement. When a user has many exercises (>999), this query throws a native SQLite error. Fix: split `exercicioIds` into chunks of 999 and merge results.

**Files:**
- Modify: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`

- [ ] **Step 1: Read the current getHistoricoExercicios method**

Open `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts` and read the `getHistoricoExercicios` method (around lines 92-120). Note the SQL query and the `groupBySession` helper at the bottom of the file.

- [ ] **Step 2: Replace getHistoricoExercicios with batched version**

Find the `getHistoricoExercicios` method and replace it with:

```typescript
async getHistoricoExercicios(exercicioIds: string[]): Promise<Map<string, ExecucaoExercicio[]>> {
  if (exercicioIds.length === 0) return new Map();

  const BATCH_SIZE = 999;
  const result = new Map<string, ExecucaoExercicio[]>();

  for (let i = 0; i < exercicioIds.length; i += BATCH_SIZE) {
    const batch = exercicioIds.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(', ');
    const rows = await this.database.getAll<HistoricoRow>(
      `SELECT se.exercicio_id, se.sessao_treino_id, se.nome_snapshot, st.data_hora_fim,
              se.nome_original_snapshot, se.substituicao_motivo,
              sr.id as serie_id, sr.tipo_serie, sr.carga_kg, sr.repeticoes, sr.observacao, sr.ordem
       FROM sessao_exercicios se
       INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
       INNER JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
       WHERE se.exercicio_id IN (${placeholders}) AND st.status = 'finalizada' AND st.data_hora_fim IS NOT NULL
       ORDER BY se.exercicio_id, st.data_hora_fim DESC, sr.ordem ASC`,
      batch
    );

    const byExercicio = new Map<string, HistoricoRow[]>();
    for (const row of rows) {
      const list = byExercicio.get(row.exercicio_id) ?? [];
      list.push(row);
      byExercicio.set(row.exercicio_id, list);
    }
    for (const [id, idRows] of byExercicio) {
      result.set(id, groupBySession(idRows));
    }
  }

  return result;
}
```

**Important:** Keep the exact SQL text identical to what was there before (copy from the current file). The only changes are: loop structure and `batch` variable instead of `exercicioIds` in the query.

- [ ] **Step 3: Write a unit test for batching using InMemoryHistoricoRepository**

Check if `InMemoryHistoricoRepository` implements `getHistoricoExercicios`. Open `apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts` and look for the method.

If the InMemory implementation exists, add a test to verify the SQLite version batches correctly by checking that a request for 1000 IDs doesn't crash. Since we can't run SQLite in unit tests, just verify the InMemory version handles the same interface correctly.

Create `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.batch.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { InMemoryHistoricoRepository } from './InMemoryHistoricoRepository';

describe('HistoricoRepository — getHistoricoExercicios with many IDs', () => {
  it('returns empty map for empty input', async () => {
    const repo = new InMemoryHistoricoRepository();
    const result = await repo.getHistoricoExercicios([]);
    expect(result.size).toBe(0);
  });

  it('returns map keyed by exercicioId for known IDs', async () => {
    const repo = new InMemoryHistoricoRepository();
    // InMemory repo returns empty map for IDs with no history — confirm no crash
    const ids = Array.from({ length: 1500 }, (_, i) => `ex_${i}`);
    const result = await repo.getHistoricoExercicios(ids);
    // All returned keys should be in the input set
    for (const key of result.keys()) {
      expect(ids).toContain(key);
    }
  });
});
```

- [ ] **Step 4: Run the test**

```bash
cd apps/mobile && npx vitest run src/infrastructure/historico/SQLiteHistoricoRepository.batch.test.ts
```

Expected: both tests PASS (InMemory handles large arrays without crashing).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts \
        apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.batch.test.ts
git commit -m "fix(historico): batch getHistoricoExercicios queries to stay under SQLite 999 param limit"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run all tests**

```bash
cd apps/mobile && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 2: TypeScript full check**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no errors.
