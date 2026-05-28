# Exercises — P0 + P1 Bug Fixes Implementation Plan — ✅ IMPLEMENTADO (2026-05-22)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four bugs in the Exercises module: enable FK enforcement so `exercise_alternatives` orphans are prevented (P0), unlock `musculoAlvo` updates on custom exercises (P0), eliminate N+1 queries in `BaixarMidiasTreinoUseCase` (P1), and fix accent-insensitive normalization (P1).

**Architecture:** PRAGMA fix is one line in `ExpoSQLiteDatabaseClient.runMigrations`. The `musculoAlvo` fix touches the domain entity interface and use-case input. The N+1 fix replaces a loop of `findById` calls with a single `findByIds` batch call. The accent fix upgrades `normalizeText` with NFD decomposition.

**Tech Stack:** TypeScript, Vitest, `expo-sqlite`.

---

### Task 1: Enable `PRAGMA foreign_keys = ON`

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

No unit test possible here (infra-level pragma); correctness is enforced by the FK constraint on `exercise_alternatives` working as expected in integration.

- [ ] **Step 1: Add the pragma to `runMigrations`**

In `ExpoSQLiteDatabaseClient.ts`, find the `runMigrations` method (around line 593). The current opening lines are:

```ts
  private async runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
    await database.execAsync('PRAGMA journal_mode = WAL;');

    const versionRow = ...
```

Replace with:
```ts
  private async runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await database.execAsync('PRAGMA foreign_keys = ON;');

    const versionRow = ...
```

- [ ] **Step 2: Verify the app still boots**

```
cd apps/mobile && npm test
```
Expected: all existing tests pass (PRAGMA pragmas have no effect on unit tests using InMemory repos).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "fix(db): enable PRAGMA foreign_keys = ON on every connection"
```

---

### Task 2: Allow `musculoAlvo` to be updated on custom exercises

**Files:**
- Modify: `apps/mobile/src/domain/exercises/entities/Exercise.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts` (after the existing `describe` block):

```ts
  it('updates musculoAlvo on a custom exercise', async () => {
    const repo = makeRepo();
    const create = makeCreateUseCase(repo);
    const update = makeUpdateUseCase(repo);

    await create.execute({ name: 'Exercicio Customizado', groupMuscle: 'Peito', category: 'Composto' });

    const updated = await update.execute({
      id: 'exercise_1',
      name: 'Exercicio Customizado',
      groupMuscle: 'Peito',
      category: 'Composto',
      musculoAlvo: 'peitoral_medio',
    });

    expect(updated.musculoAlvo).toBe('peitoral_medio');
  });

  it('clears musculoAlvo when null is passed', async () => {
    const repo = makeRepo();
    const create = makeCreateUseCase(repo);
    const update = makeUpdateUseCase(repo);

    await create.execute({
      name: 'Exercicio Customizado',
      groupMuscle: 'Peito',
      category: 'Composto',
      musculoAlvo: 'peitoral_medio',
    });

    const updated = await update.execute({
      id: 'exercise_1',
      name: 'Exercicio Customizado',
      groupMuscle: 'Peito',
      category: 'Composto',
      musculoAlvo: null,
    });

    expect(updated.musculoAlvo).toBeNull();
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd apps/mobile && npx vitest run src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts
```
Expected: FAIL — `musculoAlvo` is always `null` (not updated).

- [ ] **Step 3: Add `musculoAlvo` to `UpdateExerciseProps` in `Exercise.ts`**

In `apps/mobile/src/domain/exercises/entities/Exercise.ts`, find `UpdateExerciseProps` and add the field:

```ts
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

Then find the `Exercise.update` static method and change line 94 from:
```ts
      musculoAlvo: current.musculoAlvo,
```
to:
```ts
      musculoAlvo: 'musculoAlvo' in input ? normalizeOptionalText(input.musculoAlvo) : current.musculoAlvo,
```

- [ ] **Step 4: Add `musculoAlvo` to `UpdateExerciseInput` in `UpdateExerciseUseCase.ts`**

In `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts`, find `UpdateExerciseInput` and add the field:

```ts
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

- [ ] **Step 5: Run tests to confirm they pass**

```
cd apps/mobile && npx vitest run src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts
```
Expected: PASS — all tests green including the two new ones.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/domain/exercises/entities/Exercise.ts apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts
git commit -m "fix(exercises): allow musculoAlvo to be updated via UpdateExerciseUseCase"
```

---

### Task 3: Eliminate N+1 in `BaixarMidiasTreinoUseCase`

**Files:**
- Modify: `apps/mobile/src/application/exercises/use-cases/BaixarMidiasTreinoUseCase.ts`
- Create: `apps/mobile/src/application/exercises/use-cases/BaixarMidiasTreinoUseCase.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/application/exercises/use-cases/BaixarMidiasTreinoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { BaixarMidiaExercicioUseCase } from './BaixarMidiaExercicioUseCase';
import { BaixarMidiasTreinoUseCase } from './BaixarMidiasTreinoUseCase';

function makeExercise(id: string, opts: { mediaOnline?: string; mediaLocal?: string } = {}) {
  return Exercise.create({
    id,
    name: `Exercise ${id}`,
    groupMuscle: 'Peito',
    category: 'Composto',
    createdAt: new Date('2026-01-01'),
    mediaOnline: opts.mediaOnline ?? null,
    mediaLocal: opts.mediaLocal ?? null,
  });
}

describe('BaixarMidiasTreinoUseCase', () => {
  it('uses findByIds instead of N individual findById calls', async () => {
    const exerciseRepo = new InMemoryExerciseRepository();
    const treinoExercicioRepo = new InMemoryTreinoExercicioRepository();

    const ex1 = makeExercise('ex-1', { mediaOnline: 'https://example.com/a.gif' });
    const ex2 = makeExercise('ex-2', { mediaOnline: 'https://example.com/b.gif' });
    await exerciseRepo.save(ex1);
    await exerciseRepo.save(ex2);

    const te1 = TreinoExercicio.create({ id: 'te-1', treinoId: 'treino-1', exercicioId: 'ex-1', ordem: 1 });
    const te2 = TreinoExercicio.create({ id: 'te-2', treinoId: 'treino-1', exercicioId: 'ex-2', ordem: 2 });
    await treinoExercicioRepo.save(te1);
    await treinoExercicioRepo.save(te2);

    const findByIdsSpy = vi.spyOn(exerciseRepo, 'findByIds');
    const findByIdSpy = vi.spyOn(exerciseRepo, 'findById');

    const baixarMidia = { execute: vi.fn().mockResolvedValue(undefined) } as unknown as BaixarMidiaExercicioUseCase;

    const uc = new BaixarMidiasTreinoUseCase({
      exerciseRepository: exerciseRepo,
      treinoExercicioRepository: treinoExercicioRepo,
      baixarMidia,
    });

    await uc.execute('treino-1');

    expect(findByIdsSpy).toHaveBeenCalledOnce();
    expect(findByIdSpy).not.toHaveBeenCalled();
    expect(baixarMidia.execute).toHaveBeenCalledTimes(2);
  });

  it('returns correct counts of baixados and ignorados', async () => {
    const exerciseRepo = new InMemoryExerciseRepository();
    const treinoExercicioRepo = new InMemoryTreinoExercicioRepository();

    const comMidia = makeExercise('ex-1', { mediaOnline: 'https://example.com/a.gif' });
    const semMidia = makeExercise('ex-2');
    const jaTemLocal = makeExercise('ex-3', { mediaOnline: 'https://example.com/b.gif', mediaLocal: 'local.gif' });
    await exerciseRepo.save(comMidia);
    await exerciseRepo.save(semMidia);
    await exerciseRepo.save(jaTemLocal);

    for (const [i, id] of ['ex-1', 'ex-2', 'ex-3'].entries()) {
      await treinoExercicioRepo.save(
        TreinoExercicio.create({ id: `te-${i + 1}`, treinoId: 'treino-1', exercicioId: id, ordem: i + 1 })
      );
    }

    const baixarMidia = { execute: vi.fn().mockResolvedValue(undefined) } as unknown as BaixarMidiaExercicioUseCase;
    const uc = new BaixarMidiasTreinoUseCase({
      exerciseRepository: exerciseRepo,
      treinoExercicioRepository: treinoExercicioRepo,
      baixarMidia,
    });

    const result = await uc.execute('treino-1');

    expect(result.baixados).toBe(1);
    expect(result.ignorados).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd apps/mobile && npx vitest run src/application/exercises/use-cases/BaixarMidiasTreinoUseCase.test.ts
```
Expected: FAIL — `findByIdsSpy` not called, `findByIdSpy` is called N times.

- [ ] **Step 3: Replace loop with batch `findByIds` in `BaixarMidiasTreinoUseCase.ts`**

Full replacement for `execute` method:
```ts
  async execute(
    treinoId: string,
    onProgress?: (progresso: ProgressoBaixarMidias) => void
  ): Promise<{ baixados: number; ignorados: number }> {
    const treinoExercicios = await this.deps.treinoExercicioRepository.listByTreinoId(treinoId);

    const exercicioIds = treinoExercicios.map((te) => te.toPrimitives().exercicioId);
    const exercises = await this.deps.exerciseRepository.findByIds(exercicioIds);
    const exerciseMap = new Map(exercises.map((e) => [e.toPrimitives().id, e]));

    const pendentes: Array<{ id: string; nome: string }> = [];
    let semMidia = 0;
    let jaTemLocal = 0;

    for (const te of treinoExercicios) {
      const ex = exerciseMap.get(te.toPrimitives().exercicioId);
      if (!ex) continue;
      const p = ex.toPrimitives();
      if (!p.mediaOnline || !isDownloadableUrl(p.mediaOnline)) { semMidia++; continue; }
      if (p.mediaLocal) { jaTemLocal++; continue; }
      pendentes.push({ id: p.id, nome: p.name });
    }

    let baixados = 0;
    const ignorados = semMidia + jaTemLocal;

    for (let i = 0; i < pendentes.length; i++) {
      const item = pendentes[i]!;
      onProgress?.({ total: pendentes.length, concluido: i, nomeAtual: item.nome });
      try {
        await this.deps.baixarMidia.execute(item.id);
        baixados++;
      } catch {
        // Continua mesmo se um falhar
      }
    }

    onProgress?.({ total: pendentes.length, concluido: pendentes.length, nomeAtual: '' });
    return { baixados, ignorados };
  }
```

- [ ] **Step 4: Run tests to confirm they pass**

```
cd apps/mobile && npx vitest run src/application/exercises/use-cases/BaixarMidiasTreinoUseCase.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/application/exercises/use-cases/BaixarMidiasTreinoUseCase.ts apps/mobile/src/application/exercises/use-cases/BaixarMidiasTreinoUseCase.test.ts
git commit -m "fix(exercises): eliminate N+1 in BaixarMidiasTreinoUseCase via findByIds"
```

---

### Task 4: Fix accent-insensitive normalization in `normalizeText`

**Files:**
- Modify: `apps/mobile/src/shared/utils/normalizeText.ts`
- Create: `apps/mobile/src/shared/utils/normalizeText.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/shared/utils/normalizeText.test.ts
import { describe, expect, it } from 'vitest';

import { normalizeText } from './normalizeText';

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(normalizeText('  Supino Reto  ')).toBe('supino reto');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeText('Supino   Reto')).toBe('supino reto');
  });

  it('removes accents so accented and unaccented are equal', () => {
    expect(normalizeText('Bíceps')).toBe('biceps');
    expect(normalizeText('Remada Curvada')).toBe('remada curvada');
    expect(normalizeText('Elevação Lateral')).toBe('elevacao lateral');
    expect(normalizeText('Panturrilha')).toBe('panturrilha');
  });

  it('treats accented and unaccented variants as the same normalized name', () => {
    expect(normalizeText('Bíceps')).toBe(normalizeText('Biceps'));
    expect(normalizeText('Rosca Direta com Bárra')).toBe(normalizeText('Rosca Direta com Barra'));
  });
});
```

- [ ] **Step 2: Run tests to confirm accent tests fail**

```
cd apps/mobile && npx vitest run src/shared/utils/normalizeText.test.ts
```
Expected: FAIL — `normalizeText('Bíceps')` returns `'bíceps'` not `'biceps'`.

- [ ] **Step 3: Add NFD normalization to `normalizeText.ts`**

Full replacement:
```ts
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
cd apps/mobile && npx vitest run src/shared/utils/normalizeText.test.ts
```
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Run all exercise tests to confirm no regressions**

```
cd apps/mobile && npx vitest run src/application/exercises
```
Expected: PASS — the `normalizedName` column in the DB already stores lowercased names; the new normalization is additive (removes diacritics before lower-casing).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/shared/utils/normalizeText.ts apps/mobile/src/shared/utils/normalizeText.test.ts
git commit -m "fix(exercises): normalizeText strips accents to prevent duplicate entries like Biceps/Bíceps"
```
