# P2 — Performance & Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 performance and architecture issues: eliminate an N+1 query in session detail loading, fix an O(N²) loop in the in-memory history repo, reduce boot-time database queries from 17 to 3, add SAVEPOINT support for nested transactions, fix a DIP violation in ExportarBancoUseCase, make muscle-group matching exact instead of substring-based, and extract a hardcoded progression increment to a named constant.

**Architecture:** Tasks 1–5 touch infrastructure and use case layers; Task 6–7 fix application logic. Tasks are independent except that Plan `2026-06-02-p2-test-coverage.md` Task 4 (GetSessaoDetalhe test) and Task 5 (SugerirSubstitutos test) should be implemented **after** Tasks 1 and 6 of this plan respectively.

**Tech Stack:** TypeScript, Vitest, SQLite (expo-sqlite), InMemory repositories.

---

### Task 1: Eliminate N+1 in GetSessaoDetalheUseCase

`GetSessaoDetalheUseCase` calls `serieRegistradaRepository.listBySessaoExercicioId(id)` once per exercise inside a `Promise.all`. With 10 exercises this is 10 round-trips. Fix: add a batch method `listBySessaoExercicioIds(ids)` and call it once.

**Files:**
- Modify: `apps/mobile/src/domain/sessoes/repositories/SerieRegistradaRepository.ts`
- Modify: `apps/mobile/src/infrastructure/sessoes/InMemorySerieRegistradaRepository.ts`
- Modify: `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`
- Modify: `apps/mobile/src/application/sessoes/use-cases/GetSessaoDetalheUseCase.ts`

- [ ] **Step 1: Add the method to the repository interface**

Open `apps/mobile/src/domain/sessoes/repositories/SerieRegistradaRepository.ts`. Add after the existing `listBySessaoExercicioId` signature:

```ts
listBySessaoExercicioIds(ids: string[]): Promise<SerieRegistrada[]>;
```

- [ ] **Step 2: Implement in InMemorySerieRegistradaRepository**

Open `apps/mobile/src/infrastructure/sessoes/InMemorySerieRegistradaRepository.ts`. Add the method:

```ts
async listBySessaoExercicioIds(ids: string[]): Promise<SerieRegistrada[]> {
  if (ids.length === 0) return [];
  const idSet = new Set(ids);
  return this.series.filter((s) => idSet.has(s.toPrimitives().sessaoExercicioId));
}
```

(If the InMemory store uses a different variable name for the series array, adjust. Read the existing `listBySessaoExercicioId` to find the correct variable.)

- [ ] **Step 3: Implement in SQLiteSerieRegistradaRepository**

Open `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`. Add:

```ts
async listBySessaoExercicioIds(ids: string[]): Promise<SerieRegistrada[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await this.database.getAllAsync<SerieRegistradaRow>(
    `SELECT * FROM series_registradas WHERE sessao_exercicio_id IN (${placeholders}) ORDER BY ordem ASC`,
    ids,
  );
  return rows.map((row) => SerieRegistrada.restore({
    id: row.id,
    sessaoExercicioId: row.sessao_exercicio_id,
    tipoSerie: row.tipo_serie as TipoSerie,
    ordem: row.ordem,
    cargaKg: row.carga_kg,
    repeticoes: row.repeticoes,
    observacao: row.observacao ?? null,
  }));
}
```

(Read the existing `listBySessaoExercicioId` in the same file to get the correct `SerieRegistradaRow` type, column names, and `SerieRegistrada.restore` call shape.)

- [ ] **Step 4: Update GetSessaoDetalheUseCase to use the batch method**

Open `apps/mobile/src/application/sessoes/use-cases/GetSessaoDetalheUseCase.ts`. Find the current N+1:

```ts
const [catalogExercicios, allSeries] = await Promise.all([
  this.dependencies.exerciseRepository.findByIds(exercicioIds),
  Promise.all(exercicios.map((se) =>
    this.dependencies.serieRegistradaRepository.listBySessaoExercicioId(se.toPrimitives().id)
  )),
]);
```

Replace with:

```ts
const sessaoExercicioIds = exercicios.map((se) => se.toPrimitives().id);
const [catalogExercicios, todasSeries] = await Promise.all([
  this.dependencies.exerciseRepository.findByIds(exercicioIds),
  this.dependencies.serieRegistradaRepository.listBySessaoExercicioIds(sessaoExercicioIds),
]);

// Group series by sessaoExercicioId for the map below
const seriesPorSessaoExercicio = new Map<string, SerieRegistradaPrimitives[]>();
for (const s of todasSeries) {
  const p = s.toPrimitives();
  const arr = seriesPorSessaoExercicio.get(p.sessaoExercicioId) ?? [];
  arr.push(p);
  seriesPorSessaoExercicio.set(p.sessaoExercicioId, arr);
}
```

Then update the `exerciciosComSeries` map:

```ts
const exerciciosComSeries: SessaoExercicioComSeries[] = exercicios.map((se) => {
  const primitives = se.toPrimitives();
  const exercisePrimitives = exerciseMap.get(primitives.exercicioId);
  return {
    sessaoExercicio: primitives,
    series: seriesPorSessaoExercicio.get(primitives.id) ?? [],
    mediaOnline: exercisePrimitives?.mediaOnline ?? null,
    mediaLocal: exercisePrimitives?.mediaLocal ?? null,
  };
});
```

**Note:** `todasSeries` is `SerieRegistrada[]` (domain objects) — call `.toPrimitives()` when needed.

- [ ] **Step 5: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 6: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/domain/sessoes/repositories/SerieRegistradaRepository.ts \
        apps/mobile/src/infrastructure/sessoes/InMemorySerieRegistradaRepository.ts \
        apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts \
        apps/mobile/src/application/sessoes/use-cases/GetSessaoDetalheUseCase.ts
git commit -m "perf(sessoes): replace N+1 serie queries with batch listBySessaoExercicioIds"
```

---

### Task 2: Fix O(N²) in InMemoryHistoricoRepository.getUltimasExecucoesValidas

The current implementation calls `getUltimaExecucaoValida(id)` for each exercise, which in turn calls `getHistoricoExercicio(id)` — which scans the full `records` array each time. For N exercises with M records total: O(N × M) ≈ O(N²).

**Files:**
- Modify: `apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts`

- [ ] **Step 1: Write a performance regression test**

Open (or create) `apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.test.ts`. Add:

```ts
import { describe, expect, it } from 'vitest';
import { InMemoryHistoricoRepository } from './InMemoryHistoricoRepository';

describe('InMemoryHistoricoRepository.getUltimasExecucoesValidas', () => {
  it('returns the best serie per exercicio', async () => {
    const repo = new InMemoryHistoricoRepository();
    repo.seed('ex1', {
      dataExecucao: '2026-01-01T10:00:00Z',
      series: [
        { tipoSerie: 'valida', cargaKg: 50, repeticoes: 10 },
        { tipoSerie: 'valida', cargaKg: 60, repeticoes: 8 },
      ],
    });
    repo.seed('ex2', {
      dataExecucao: '2026-01-02T10:00:00Z',
      series: [{ tipoSerie: 'valida', cargaKg: 40, repeticoes: 12 }],
    });

    const result = await repo.getUltimasExecucoesValidas();

    expect(result.size).toBe(2);
    // ex1: 60 * (1 + 8/30) = 76 vs 50 * (1 + 10/30) = 66.67 → 60kg wins
    expect(result.get('ex1')?.cargaKg).toBe(60);
    expect(result.get('ex2')?.cargaKg).toBe(40);
  });

  it('excludes exercises with only aquecimento series', async () => {
    const repo = new InMemoryHistoricoRepository();
    repo.seed('ex1', {
      dataExecucao: '2026-01-01T10:00:00Z',
      series: [{ tipoSerie: 'aquecimento', cargaKg: 20, repeticoes: 15 }],
    });
    const result = await repo.getUltimasExecucoesValidas();
    expect(result.has('ex1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they pass with current O(N²) implementation**

```bash
npm --prefix apps/mobile test -- --reporter=verbose InMemoryHistoricoRepository.test
```

Expected: tests pass (correctness is unchanged; we're just fixing performance).

- [ ] **Step 3: Refactor getUltimasExecucoesValidas to single-pass O(N)**

Replace the current method with a single pass over `records`:

```ts
async getUltimasExecucoesValidas(): Promise<Map<string, UltimaExecucaoValida>> {
  // Single pass: for each exercicio, find the most recent execution that has valid series
  // and within that execution find the best serie by 1RM.
  const byExercicio = new Map<string, { dataExecucao: string; melhor: { cargaKg: number; repeticoes: number } }>();

  for (const { exercicioId, execucao } of this.records) {
    const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
    if (validas.length === 0) continue;

    const existing = byExercicio.get(exercicioId);
    const isNewer = !existing || new Date(execucao.dataExecucao) > new Date(existing.dataExecucao);
    if (!isNewer) continue;

    const melhor = validas.reduce((a, b) =>
      estimativa1rm(a.cargaKg, a.repeticoes) >= estimativa1rm(b.cargaKg, b.repeticoes) ? a : b
    );
    byExercicio.set(exercicioId, { dataExecucao: execucao.dataExecucao, melhor });
  }

  const result = new Map<string, UltimaExecucaoValida>();
  for (const [exercicioId, { dataExecucao, melhor }] of byExercicio) {
    result.set(exercicioId, { cargaKg: melhor.cargaKg, repeticoes: melhor.repeticoes, dataExecucao });
  }
  return result;
}
```

Also add the import if not already present:

```ts
import { estimativa1rm } from '../../shared/utils/estimativa1rm';
```

(This depends on Task 1 of Plan `2026-06-02-p2-code-quality.md`. If that task hasn't been done yet, inline the formula: `cargaKg * (1 + repeticoes / 30)`.)

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose InMemoryHistoricoRepository.test
```

Expected: all tests pass (same results, faster implementation).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts \
        apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.test.ts
git commit -m "perf(historico): replace O(N²) loop with single-pass O(N) in getUltimasExecucoesValidas"
```

---

### Task 3: Optimize ensureColumns — 3 PRAGMA queries instead of 17

`ensureColumns` runs one `PRAGMA table_info(table)` per column (17 queries). Since there are only 3 unique tables (`treino_exercicios`, `sessao_exercicios`, `exercises`), group columns by table and run 1 PRAGMA per table.

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

- [ ] **Step 1: Locate ensureColumns**

Open `ExpoSQLiteDatabaseClient.ts`. Find `private async ensureColumns` (around line 716). The current loop:

```ts
for (const { table, column, type, defaultValue } of required) {
  const info = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = info.some((col) => col.name === column);
  if (!exists) { ... }
}
```

- [ ] **Step 2: Rewrite to group by table**

Replace the for loop with:

```ts
// Group columns by table to minimize PRAGMA queries
const byTable = new Map<string, { column: string; type: string; defaultValue?: string }[]>();
for (const col of required) {
  const list = byTable.get(col.table) ?? [];
  list.push({ column: col.column, type: col.type, defaultValue: col.defaultValue });
  byTable.set(col.table, list);
}

for (const [table, cols] of byTable) {
  const info = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const existing = new Set(info.map((c) => c.name));
  for (const { column, type, defaultValue } of cols) {
    if (!existing.has(column)) {
      const def = defaultValue ? ` NOT NULL DEFAULT ${defaultValue}` : '';
      await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def};`);
      this.logger.info('database.column_added', { table, column });
    }
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "perf(db): reduce ensureColumns from 17 PRAGMA queries to 3 by grouping per table"
```

---

### Task 4: Add SAVEPOINT support to withTransaction

Nested `withTransaction()` calls currently cause SQLite to throw `"cannot start a transaction within a transaction"`. Fix using SAVEPOINT for inner calls.

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

- [ ] **Step 1: Find withTransaction**

Open `ExpoSQLiteDatabaseClient.ts`. Find `async withTransaction<T>` (around line 560). Current implementation:

```ts
async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  await this.run('BEGIN');
  try {
    const result = await fn();
    await this.run('COMMIT');
    return result;
  } catch (err) {
    await this.run('ROLLBACK');
    throw err;
  }
}
```

- [ ] **Step 2: Add transaction depth counter and SAVEPOINT logic**

Add a private field above the method (find a good location in the class, near other private state):

```ts
private _txDepth = 0;
```

Replace the method body:

```ts
async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const depth = this._txDepth;
  if (depth === 0) {
    await this.run('BEGIN');
  } else {
    await this.run(`SAVEPOINT sp${depth}`);
  }
  this._txDepth++;
  try {
    const result = await fn();
    this._txDepth--;
    if (this._txDepth === 0) {
      await this.run('COMMIT');
    } else {
      await this.run(`RELEASE SAVEPOINT sp${depth}`);
    }
    return result;
  } catch (err) {
    this._txDepth--;
    if (this._txDepth === 0) {
      await this.run('ROLLBACK');
    } else {
      await this.run(`ROLLBACK TO SAVEPOINT sp${depth}`);
    }
    throw err;
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "fix(db): add SAVEPOINT support to withTransaction for safe nesting"
```

---

### Task 5: Fix ExportarBancoUseCase DIP — inject interface, not concrete class

`ExportarBancoUseCase` takes `ExpoSQLiteDatabaseClient` (concrete infra class) in its deps. Create a `DatabaseExportPort` interface and inject that instead.

**Files:**
- Create: `apps/mobile/src/domain/dashboard/ports/DatabaseExportPort.ts`
- Modify: `apps/mobile/src/application/dashboard/use-cases/ExportarBancoUseCase.ts`
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`
- Modify: `apps/mobile/src/bootstrap/mobileDependencies.ts`

- [ ] **Step 1: Create the port interface**

```ts
// apps/mobile/src/domain/dashboard/ports/DatabaseExportPort.ts
export interface DatabaseExportPort {
  checkpointWal(): Promise<void>;
  databaseFileName: string;
}
```

- [ ] **Step 2: Update ExportarBancoUseCase to use the interface**

Open `apps/mobile/src/application/dashboard/use-cases/ExportarBancoUseCase.ts`. Change the import and deps interface:

```ts
// Remove:
import type { ExpoSQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient';
// Add:
import type { DatabaseExportPort } from '../../../domain/dashboard/ports/DatabaseExportPort';

interface ExportarBancoDependencies {
  databaseClient: DatabaseExportPort;  // was: ExpoSQLiteDatabaseClient
}
```

The rest of the implementation (`checkpointWal()`, `databaseFileName`) stays the same — both exist on the interface.

- [ ] **Step 3: Declare ExpoSQLiteDatabaseClient implements the interface**

Open `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`. Add the import and `implements` declaration to the class:

```ts
import type { DatabaseExportPort } from '../../../domain/dashboard/ports/DatabaseExportPort';

export class ExpoSQLiteDatabaseClient implements DatabaseExportPort {
  // ... existing code unchanged ...
}
```

Verify `checkpointWal()` and `databaseFileName` are already present (they are — no implementation changes needed).

- [ ] **Step 4: Verify mobileDependencies.ts compiles**

Open `apps/mobile/src/bootstrap/mobileDependencies.ts`. The wiring for `ExportarBancoUseCase` passes a concrete `ExpoSQLiteDatabaseClient` — this is still valid because the concrete class now implements the interface.

- [ ] **Step 5: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no errors.

- [ ] **Step 6: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/domain/dashboard/ports/DatabaseExportPort.ts \
        apps/mobile/src/application/dashboard/use-cases/ExportarBancoUseCase.ts \
        apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "refactor(dashboard): extract DatabaseExportPort interface to decouple ExportarBancoUseCase from infra"
```

---

### Task 6: Fix SugerirSubstitutosUseCase — exact group matching

The current logic uses `.includes()` to match muscle groups:

```ts
ep.groupMuscle === grupoMuscular || ep.groupMuscle.includes(grupoMuscular) || grupoMuscular.includes(ep.groupMuscle)
```

This causes false positives when one group name is a substring of another (e.g., `"Ombros"` matching `"Ombros, Trapezio"`). Fix: split comma-delimited groups and use exact set intersection.

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.ts`

- [ ] **Step 1: Read the full matching logic**

Open `apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.ts`. Find the camada1/camada2 classification (around line 55-85).

- [ ] **Step 2: Add helper functions above the class**

```ts
function splitGrupos(groupMuscle: string): string[] {
  return groupMuscle.split(',').map((g) => g.trim()).filter(Boolean);
}

function temIntersecaoDeGrupo(a: string, b: string): boolean {
  const ga = splitGrupos(a);
  const gb = new Set(splitGrupos(b));
  return ga.some((g) => gb.has(g));
}
```

- [ ] **Step 3: Replace the includes-based matching**

Find the line that classifies exercises into `camada2` (same groupMuscle but different ênfase). It looks like:

```ts
} else if (ep.groupMuscle === grupoMuscular || ep.groupMuscle.includes(grupoMuscular) || grupoMuscular.includes(ep.groupMuscle)) {
  camada2.push({ ...candidato, enfaseDiferente: true });
}
```

Replace with:

```ts
} else if (temIntersecaoDeGrupo(ep.groupMuscle, grupoMuscular)) {
  camada2.push({ ...candidato, enfaseDiferente: true });
}
```

For camada1 (same `musculoAlvo`), the existing exact-string match is fine — leave it as-is.

- [ ] **Step 4: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.ts
git commit -m "fix(sessoes): replace substring includes with exact group intersection in SugerirSubstitutosUseCase"
```

---

### Task 7: Extract hardcoded +2.5 kg increment in SugerirProgressaoUseCase

The progression increment is hardcoded as `2.5` with no way to configure it per exercise or load unit.

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/SugerirProgressaoUseCase.ts`

- [ ] **Step 1: Find the hardcoded value**

Open `apps/mobile/src/application/sessoes/use-cases/SugerirProgressaoUseCase.ts`. Find (around line 64):

```ts
return {
  cargaSugerida: cargaReferencia + 2.5,
  motivo: `Meta de ${meta} reps atingida nas últimas 2 sessões`,
};
```

- [ ] **Step 2: Extract to exported constant**

Add above the class declaration:

```ts
/** Incremento de carga sugerido ao atingir a meta de repetições. */
export const INCREMENTO_CARGA_KG = 2.5;
```

Replace the hardcoded value:

```ts
return {
  cargaSugerida: cargaReferencia + INCREMENTO_CARGA_KG,
  motivo: `Meta de ${meta} reps atingida nas últimas 2 sessões`,
};
```

- [ ] **Step 3: Verify no existing tests break**

```bash
npm --prefix apps/mobile test -- --reporter=verbose SugerirProgressaoUseCase.test
```

Expected: all existing tests pass.

- [ ] **Step 4: Add a test that verifies the constant is used**

In the existing `SugerirProgressaoUseCase.test.ts`, add one test:

```ts
it('increments carga by INCREMENTO_CARGA_KG', async () => {
  // This test verifies the constant drives the increment.
  // If the increment changes, only INCREMENTO_CARGA_KG needs updating.
  const repo = new InMemoryHistoricoRepository();
  const meta = 10;
  const cargaReferencia = 50;

  // Two sessions where all reps met the target
  const makeExecucao = (data: string) => ({
    dataExecucao: data,
    series: [
      { tipoSerie: 'valida' as const, cargaKg: cargaReferencia, repeticoes: meta },
      { tipoSerie: 'valida' as const, cargaKg: cargaReferencia, repeticoes: meta },
    ],
  });
  repo.seed('ex1', makeExecucao('2026-01-02T10:00:00Z'));
  repo.seed('ex1', makeExecucao('2026-01-01T10:00:00Z'));

  const result = await new SugerirProgressaoUseCase({ historicoRepository: repo }).execute({
    exercicioId: 'ex1',
    execucoesRecomendadas: meta,
    cargaPadrao: cargaReferencia,
  });

  expect(result?.cargaSugerida).toBe(cargaReferencia + INCREMENTO_CARGA_KG);
});
```

- [ ] **Step 5: Run full test suite**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/SugerirProgressaoUseCase.ts
git commit -m "refactor(sessoes): extract hardcoded 2.5 kg increment to INCREMENTO_CARGA_KG constant"
```
