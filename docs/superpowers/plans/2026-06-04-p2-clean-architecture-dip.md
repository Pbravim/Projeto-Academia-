# P2 — Clean Architecture: Fix 3 DIP Violations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three use cases in the application layer directly import `ExpoSQLiteDatabaseClient` (infrastructure), violating the Dependency Inversion Principle. Fix by injecting a narrow port interface instead.

**Affected use cases:**
- `AddExercicioAoTreinoUseCase` — uses `withTransaction` directly from the client
- `RegistrarSerieUseCase` — uses `withTransaction` directly from the client
- `IniciarSessaoUseCase` — uses `withTransaction` directly from the client

**Pattern:** Each use case needs a `TransactionPort` interface with a single `withTransaction<T>(fn: () => Promise<T>): Promise<T>` method. The concrete `ExpoSQLiteDatabaseClient` already implements this — just needs `implements TransactionPort` declared.

**Architecture:** All 3 tasks are independent and can be parallelized. No behavior changes — pure structural fix.

**Tech Stack:** TypeScript, Vitest. Test command: `npm --prefix apps/mobile test`.

---

### Task 1: AddExercicioAoTreinoUseCase — inject TransactionPort

**Files:**
- Create: `apps/mobile/src/domain/shared/ports/TransactionPort.ts`
- Modify: `apps/mobile/src/application/treinos/use-cases/AddExercicioAoTreinoUseCase.ts`
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`
- Check: `apps/mobile/src/bootstrap/mobileDependencies.ts` (wiring — no change expected)

- [ ] **Step 1: Read AddExercicioAoTreinoUseCase.ts**

```bash
cat apps/mobile/src/application/treinos/use-cases/AddExercicioAoTreinoUseCase.ts
```

Confirm it imports `ExpoSQLiteDatabaseClient` and calls `.withTransaction(...)`.

- [ ] **Step 2: Create TransactionPort interface**

```ts
// apps/mobile/src/domain/shared/ports/TransactionPort.ts
export interface TransactionPort {
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
```

- [ ] **Step 3: Update the use case**

In `AddExercicioAoTreinoUseCase.ts`, replace:

```ts
// Remove:
import type { ExpoSQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient';

// Add:
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
```

In the deps interface, change the type of `databaseClient` (or whatever the field is named) from `ExpoSQLiteDatabaseClient` to `TransactionPort`.

- [ ] **Step 4: Declare ExpoSQLiteDatabaseClient implements TransactionPort**

Open `ExpoSQLiteDatabaseClient.ts`. Add:

```ts
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';

export class ExpoSQLiteDatabaseClient implements TransactionPort {
  // existing code unchanged
}
```

`withTransaction` is already implemented — no body changes needed.

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
git add apps/mobile/src/domain/shared/ports/TransactionPort.ts \
        apps/mobile/src/application/treinos/use-cases/AddExercicioAoTreinoUseCase.ts \
        apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "refactor(treinos): inject TransactionPort instead of SQLiteDatabaseClient in AddExercicioAoTreinoUseCase"
```

---

### Task 2: RegistrarSerieUseCase — inject TransactionPort

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/RegistrarSerieUseCase.ts`
- No changes to `TransactionPort.ts` or `ExpoSQLiteDatabaseClient.ts` needed (done in Task 1)

- [ ] **Step 1: Read RegistrarSerieUseCase.ts**

```bash
cat apps/mobile/src/application/sessoes/use-cases/RegistrarSerieUseCase.ts
```

Confirm it imports `ExpoSQLiteDatabaseClient` and uses `.withTransaction(...)`.

- [ ] **Step 2: Update the import and deps interface**

Replace the `ExpoSQLiteDatabaseClient` import with:

```ts
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
```

Change the deps interface field type accordingly.

- [ ] **Step 3: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/RegistrarSerieUseCase.ts
git commit -m "refactor(sessoes): inject TransactionPort instead of SQLiteDatabaseClient in RegistrarSerieUseCase"
```

---

### Task 3: IniciarSessaoUseCase — inject TransactionPort

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/IniciarSessaoUseCase.ts`

- [ ] **Step 1: Read IniciarSessaoUseCase.ts**

```bash
cat apps/mobile/src/application/sessoes/use-cases/IniciarSessaoUseCase.ts
```

Confirm it imports `ExpoSQLiteDatabaseClient` and uses `.withTransaction(...)`.

- [ ] **Step 2: Update the import and deps interface**

Replace the `ExpoSQLiteDatabaseClient` import with:

```ts
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
```

Change the deps interface field type accordingly.

- [ ] **Step 3: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/IniciarSessaoUseCase.ts
git commit -m "refactor(sessoes): inject TransactionPort instead of SQLiteDatabaseClient in IniciarSessaoUseCase"
```
