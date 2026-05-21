# P0 Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 P0 bugs in the exercises module: missing transaction in DeleteExercise cascading deletes, `musculoAlvo` not updatable via `Exercise.update`, and orphaned `exercise_alternatives` rows due to missing `PRAGMA foreign_keys = ON`.

**Architecture:** `DeleteExerciseUseCase` receives `database?: SQLiteDatabaseClient` (same optional pattern as `IniciarSessaoUseCase`). `Exercise.update` and `UpdateExerciseUseCase` get `musculoAlvo` added to their input types. FK enforcement is enabled in `ExpoSQLiteDatabaseClient.runMigrations` which runs once on startup.

**Tech Stack:** TypeScript, Vitest, InMemory repositories for tests.

---

## Files Modified

- Modify: `apps/mobile/src/domain/exercises/entities/Exercise.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.test.ts`
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`
- Modify: `apps/mobile/src/bootstrap/mobileDependencies.ts`

---

### Task 1: Enable PRAGMA foreign_keys = ON in database client

**Context:** `ExpoSQLiteDatabaseClient.ts:571-590` — `runMigrations` sets `PRAGMA journal_mode = WAL` but never enables foreign key enforcement. Without `PRAGMA foreign_keys = ON`, all `REFERENCES` and `ON DELETE CASCADE` constraints in the schema are silently ignored, leaving `exercise_alternatives` and other joined rows as orphans when parents are deleted. This PRAGMA must be set per-connection (not persisted) so it belongs in the initialization path.

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

- [ ] **Step 1: Add PRAGMA foreign_keys = ON after journal_mode**

In `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`, find the `runMigrations` method (around line 571). It currently starts with:

```typescript
private async runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA journal_mode = WAL;');
```

Add `foreign_keys` line immediately after:

```typescript
private async runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to this change.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "fix(db): enable PRAGMA foreign_keys = ON on every connection"
```

---

### Task 2: Add musculoAlvo to Exercise.update and UpdateExerciseUseCase

**Context:** `Exercise.ts:34-41` — `UpdateExerciseProps` does not include `musculoAlvo`. `Exercise.update` at line 94 always copies `current.musculoAlvo` unchanged, so custom exercises can never have their target muscle set or corrected. This blocks the substitution feature which matches exercises by `musculoAlvo`. `UpdateExerciseInput` (in `UpdateExerciseUseCase.ts:6-14`) similarly lacks the field.

**Files:**
- Modify: `apps/mobile/src/domain/exercises/entities/Exercise.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts`

- [ ] **Step 1: Write failing test for musculoAlvo update**

Add to `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts` (create if it doesn't exist, otherwise append inside the describe block):

```typescript
import { describe, expect, it } from 'vitest';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { CreateExerciseUseCase } from './CreateExerciseUseCase';
import { UpdateExerciseUseCase } from './UpdateExerciseUseCase';

describe('UpdateExerciseUseCase — musculoAlvo', () => {
  it('updates musculoAlvo on a custom exercise', async () => {
    const repo = new InMemoryExerciseRepository();
    const create = new CreateExerciseUseCase({
      exerciseRepository: repo,
      idGenerator: () => 'ex_1',
      now: () => new Date('2026-05-21T10:00:00.000Z'),
    });
    const update = new UpdateExerciseUseCase({
      exerciseRepository: repo,
      now: () => new Date('2026-05-21T11:00:00.000Z'),
    });

    await create.execute({ name: 'Supino reto', groupMuscle: 'Peito', category: 'Composto' });

    const result = await update.execute({
      id: 'ex_1',
      name: 'Supino reto',
      groupMuscle: 'Peito',
      category: 'Composto',
      musculoAlvo: 'peitoral maior',
    });

    expect(result.musculoAlvo).toBe('peitoral maior');
  });

  it('clears musculoAlvo when null is passed', async () => {
    const repo = new InMemoryExerciseRepository();
    const create = new CreateExerciseUseCase({
      exerciseRepository: repo,
      idGenerator: () => 'ex_2',
      now: () => new Date('2026-05-21T10:00:00.000Z'),
    });
    const update = new UpdateExerciseUseCase({
      exerciseRepository: repo,
      now: () => new Date('2026-05-21T11:00:00.000Z'),
    });

    await create.execute({ name: 'Rosca direta', groupMuscle: 'Bíceps', category: 'Isolado', musculoAlvo: 'braquial' });

    const result = await update.execute({
      id: 'ex_2',
      name: 'Rosca direta',
      groupMuscle: 'Bíceps',
      category: 'Isolado',
      musculoAlvo: null,
    });

    expect(result.musculoAlvo).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/mobile && npx vitest run src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts
```

Expected: FAIL — TypeScript error that `musculoAlvo` is not in `UpdateExerciseInput`, or the field is returned unchanged.

- [ ] **Step 3: Add musculoAlvo to UpdateExerciseProps in Exercise entity**

In `apps/mobile/src/domain/exercises/entities/Exercise.ts`, find `UpdateExerciseProps` (around line 34) and add `musculoAlvo`:

```typescript
export interface UpdateExerciseProps {
  name: string;
  groupMuscle: string;
  category?: string | null;
  equipment?: string | null;
  mediaOnline?: string | null;
  mediaLocal?: string | null;
  musculoAlvo?: string | null;
}
```

Then in the `static update` method (around line 75), change the `musculoAlvo` line from:

```typescript
      musculoAlvo: current.musculoAlvo,
```

to:

```typescript
      musculoAlvo: 'musculoAlvo' in input ? normalizeOptionalText(input.musculoAlvo) : current.musculoAlvo,
```

- [ ] **Step 4: Add musculoAlvo to UpdateExerciseInput in the use case**

In `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts`, find `UpdateExerciseInput` (around line 6) and add the field:

```typescript
export interface UpdateExerciseInput {
  id: string;
  name: string;
  groupMuscle: string;
  category: string;
  equipment?: string;
  mediaOnline?: string;
  mediaLocal?: string;
  musculoAlvo?: string | null;
}
```

Then in `execute`, update the call to `Exercise.update` to pass `musculoAlvo`. The full `execute` method currently calls:

```typescript
const updated = Exercise.update(currentPrimitives, input, this.dependencies.now());
```

`input` already contains all fields including the new `musculoAlvo` — no change needed to the call itself since `input` is typed as `UpdateExerciseInput` which now includes `musculoAlvo`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/mobile && npx vitest run src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Run full exercise suite to check for regressions**

```bash
cd apps/mobile && npx vitest run src/application/exercises/ src/domain/exercises/
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/domain/exercises/entities/Exercise.ts \
        apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts \
        apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts
git commit -m "fix(exercises): allow musculoAlvo to be updated via UpdateExerciseUseCase"
```

---

### Task 3: DeleteExerciseUseCase — wrap cascade deletes in transaction

**Context:** `DeleteExerciseUseCase.ts:34-37` — 4 sequential `await` delete calls with no transaction. A failure between steps leaves the database in a partially-deleted state (e.g., removed from `treino_exercicios` but still in `exercises`). Pattern: inject `database?: SQLiteDatabaseClient`. Wrap the 4 deletes inside `withTransaction`. Existing unit tests use InMemory repos and pass `undefined` for `database` — they continue to work unchanged.

**Files:**
- Modify: `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.test.ts`
- Modify: `apps/mobile/src/bootstrap/mobileDependencies.ts`

- [ ] **Step 1: Add cascade test to verify all repos are cleaned**

In `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.test.ts`, append this describe block after the existing one:

```typescript
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';

describe('DeleteExerciseUseCase — cascade', () => {
  it('removes exercise from treinos, sessoes and series', async () => {
    const exerciseRepo = new InMemoryExerciseRepository();
    const treinoExercicioRepo = new InMemoryTreinoExercicioRepository();
    const sessaoExercicioRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();

    const create = new CreateExerciseUseCase({
      exerciseRepository: exerciseRepo,
      idGenerator: () => 'ex_1',
      now: () => new Date('2026-05-21T10:00:00.000Z'),
    });
    await create.execute({ name: 'Supino reto', groupMuscle: 'Peito', category: 'Composto' });

    await treinoExercicioRepo.save(
      TreinoExercicio.create({ id: 'te_1', treinoId: 'treino_1', exercicioId: 'ex_1', ordem: 1 })
    );

    const sessaoExercicio = SessaoExercicio.create({
      id: 'se_1',
      sessaoTreinoId: 'sessao_1',
      exercicioId: 'ex_1',
      nomeSnapshot: 'Supino reto',
      grupoMuscularSnapshot: 'Peito',
      categoriaSnapshot: 'Composto',
      equipamentoSnapshot: null,
      musculoAlvoSnapshot: null,
      realizado: false,
      seriesRecomendadas: null,
      execucoesRecomendadas: null,
      cargaPadrao: null,
      tempoDescansoSegundos: null,
      metodo: 'normal' as const,
      grupoId: null,
      substituidoPorExercicioId: null,
      substituicaoMotivo: null,
      nomeOriginalSnapshot: null,
      ordem: 1,
    });
    await sessaoExercicioRepo.save(sessaoExercicio);
    await serieRepo.save(
      SerieRegistrada.create({ id: 'sr_1', sessaoExercicioId: 'se_1', tipoSerie: 'valida', cargaKg: 80, repeticoes: 10, ordem: 1 })
    );

    const del = new DeleteExerciseUseCase({
      exerciseRepository: exerciseRepo,
      treinoExercicioRepository: treinoExercicioRepo,
      sessaoExercicioRepository: sessaoExercicioRepo,
      serieRegistradaRepository: serieRepo,
    });
    await del.execute('ex_1');

    expect(await exerciseRepo.findById('ex_1')).toBeNull();
    expect(await treinoExercicioRepo.listByTreinoId('treino_1')).toHaveLength(0);
    expect(await sessaoExercicioRepo.listBySessaoId('sessao_1')).toHaveLength(0);
    expect(await serieRepo.listBySessaoExercicioId('se_1')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify new test passes (it should, cascade already works in InMemory)**

```bash
cd apps/mobile && npx vitest run src/application/exercises/use-cases/DeleteExerciseUseCase.test.ts
```

Expected: all tests PASS (InMemory repos handle cascade correctly; this confirms the test structure is valid).

- [ ] **Step 3: Wrap deletes in withTransaction**

Replace `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.ts` with:

```typescript
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { TreinoExercicioRepository } from '../../../domain/treinos/repositories/TreinoExercicioRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';
import { ExerciseNotFoundError } from '../errors/ExerciseNotFoundError';

export interface MediaFileCleanup {
  deleteFileIfExists(uri: string): Promise<void>;
}

interface DeleteExerciseUseCaseDependencies {
  exerciseRepository: ExerciseRepository;
  treinoExercicioRepository: TreinoExercicioRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
  mediaFileCleanup?: MediaFileCleanup;
  database?: SQLiteDatabaseClient;
}

/**
 * Remove um exercicio do catalogo com cascata completa:
 * 1. Remove de todos os treinos (treino_exercicios)
 * 2. Remove series de sessoes que usavam esse exercicio
 * 3. Remove o exercicio das sessoes
 * 4. Remove do catalogo
 */
export class DeleteExerciseUseCase {
  constructor(private readonly dependencies: DeleteExerciseUseCaseDependencies) {}

  /** @throws {ExerciseNotFoundError} exercicio nao encontrado */
  async execute(id: string): Promise<void> {
    const exercise = await this.dependencies.exerciseRepository.findById(id);
    if (!exercise) throw new ExerciseNotFoundError(id);

    const cascade = async () => {
      await this.dependencies.treinoExercicioRepository.deleteByExercicioId(id);
      await this.dependencies.serieRegistradaRepository.deleteByExercicioId(id);
      await this.dependencies.sessaoExercicioRepository.deleteByExercicioId(id);
      await this.dependencies.exerciseRepository.delete(id);
    };

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(cascade);
    } else {
      await cascade();
    }

    const { mediaLocal } = exercise.toPrimitives();
    if (mediaLocal && mediaLocal.startsWith('file://') && this.dependencies.mediaFileCleanup) {
      try {
        await this.dependencies.mediaFileCleanup.deleteFileIfExists(mediaLocal);
      } catch {
        // Falha silenciosa - arquivo orphan na pior das hipoteses
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they still pass**

```bash
cd apps/mobile && npx vitest run src/application/exercises/use-cases/DeleteExerciseUseCase.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Wire database in bootstrap**

In `apps/mobile/src/bootstrap/mobileDependencies.ts`, find the `deleteExercise` instantiation (around line 110). Add `database: databaseClient`:

```typescript
deleteExercise: new DeleteExerciseUseCase({
  exerciseRepository,
  treinoExercicioRepository,
  sessaoExercicioRepository,
  serieRegistradaRepository,
  mediaFileCleanup: new ExpoMediaFileCleanup(),
  database: databaseClient,
}),
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.ts \
        apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.test.ts \
        apps/mobile/src/bootstrap/mobileDependencies.ts
git commit -m "fix(exercises): wrap DeleteExerciseUseCase cascade deletes in transaction"
```
