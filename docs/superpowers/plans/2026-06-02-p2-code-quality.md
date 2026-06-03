# P2 — Code Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 code quality issues: extract the duplicated 1RM formula to a shared utility, rename a misleading boolean field, fix a single-replace regex bug, add missing validations in two use cases, update a missing timestamp, surface a swallowed error type to the UI, and migrate two files off the deprecated `expo-file-system/legacy` API.

**Architecture:** All changes are isolated — no shared state between tasks. Each task touches 1-3 files. Tasks 1-7 are test-driven; Task 8 (expo-file-system migration) is pure refactor with no behavior change.

**Tech Stack:** TypeScript, Vitest. Test command: `npm --prefix apps/mobile test`.

---

### Task 1: Extract 1RM formula to shared utility

The formula `carga * (1 + reps / 30)` is duplicated in TypeScript (`InMemoryHistoricoRepository.ts:50`) and SQL (`SqliteDashboardRepository`, `SQLiteHistoricoRepository`). Extract the TypeScript one to a utility. The SQL copies are harder to consolidate and can remain as-is.

**Files:**
- Create: `apps/mobile/src/shared/utils/estimativa1rm.ts`
- Modify: `apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/shared/utils/estimativa1rm.test.ts
import { describe, expect, it } from 'vitest';
import { estimativa1rm } from './estimativa1rm';

describe('estimativa1rm', () => {
  it('returns carga when reps is 0', () => {
    expect(estimativa1rm(100, 0)).toBe(100);
  });

  it('calculates correctly for typical values', () => {
    // 80 * (1 + 10/30) = 80 * 1.333... ≈ 106.67
    expect(estimativa1rm(80, 10)).toBeCloseTo(106.67, 1);
  });

  it('matches the formula used in SQL: carga * (1 + reps / 30)', () => {
    const carga = 60;
    const reps = 5;
    expect(estimativa1rm(carga, reps)).toBe(carga * (1 + reps / 30));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm --prefix apps/mobile test -- --reporter=verbose estimativa1rm.test
```

Expected: FAIL — `estimativa1rm` not found.

- [ ] **Step 3: Create the utility**

```ts
// apps/mobile/src/shared/utils/estimativa1rm.ts
export function estimativa1rm(cargaKg: number, repeticoes: number): number {
  return cargaKg * (1 + repeticoes / 30);
}
```

- [ ] **Step 4: Update InMemoryHistoricoRepository to use the utility**

Open `apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts`. At the top, add:

```ts
import { estimativa1rm } from '../../shared/utils/estimativa1rm';
```

Find the `reduce` in `getUltimaExecucaoValida` (around line 50):

```ts
const melhor = validas.reduce((a, b) =>
  a.cargaKg * (1 + a.repeticoes / 30) >= b.cargaKg * (1 + b.repeticoes / 30) ? a : b
);
```

Replace with:

```ts
const melhor = validas.reduce((a, b) =>
  estimativa1rm(a.cargaKg, a.repeticoes) >= estimativa1rm(b.cargaKg, b.repeticoes) ? a : b
);
```

- [ ] **Step 5: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose estimativa1rm.test
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/shared/utils/estimativa1rm.ts \
        apps/mobile/src/shared/utils/estimativa1rm.test.ts \
        apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts
git commit -m "refactor(historico): extract 1RM formula to shared estimativa1rm utility"
```

---

### Task 2: Rename deltaPositivo → pesoAumentou

`deltaPositivo: boolean` in `RegistroPesoCardViewModel` means "the delta is positive (weight went up)". The name is ambiguous — `pesoAumentou` says exactly what it means.

**Files:**
- Modify: `apps/mobile/src/ui/peso/presenters/buildPesoViewModel.ts`
- Find and update all consumers with: `grep -r "deltaPositivo" apps/mobile/src --include="*.ts" --include="*.tsx" -l`

- [ ] **Step 1: Find all consumers**

```bash
grep -r "deltaPositivo" apps/mobile/src --include="*.ts" --include="*.tsx" -l
```

Note every file returned.

- [ ] **Step 2: Rename the field definition**

In `apps/mobile/src/ui/peso/presenters/buildPesoViewModel.ts`, rename `deltaPositivo` to `pesoAumentou` in both the interface definition and the object literal that assigns it.

The field assignment (around line 41):
```ts
deltaPositivo: delta !== null ? delta > 0 : false,
```
becomes:
```ts
pesoAumentou: delta !== null ? delta > 0 : false,
```

The interface declaration:
```ts
deltaPositivo: boolean;
```
becomes:
```ts
pesoAumentou: boolean;
```

- [ ] **Step 3: Update every consumer**

In each file found in Step 1, rename `deltaPositivo` → `pesoAumentou`. Common locations: screen components that read the field, style conditionals like `viewModel.deltaPositivo ? styles.up : styles.down`.

- [ ] **Step 4: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors mentioning `deltaPositivo` or `pesoAumentou`.

- [ ] **Step 5: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "refactor(peso): rename deltaPositivo to pesoAumentou for clarity"
```

---

### Task 3: Fix parse de vírgula (single replace → regex global)

`.replace(',', '.')` only replaces the first comma. Input `"1,234,56"` becomes `"1.234,56"` — still unparseable.

**Files:**
- Modify: `apps/mobile/src/ui/peso/hooks/usePesoController.ts`
- Check for other occurrences: `grep -r "replace.*','.*'.'" apps/mobile/src --include="*.ts" --include="*.tsx"`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/ui/peso/hooks/usePesoController.test.ts
// If this file already exists, add the test inside the existing describe.
// If not, create it.
import { describe, expect, it } from 'vitest';

// The parsing logic is inline in the controller — extract it to a testable helper.
// If extraction is too invasive, test indirectly through the controller.
// For now, test the pure function directly after extraction.
import { parsePesoInput } from './usePesoController';

describe('parsePesoInput', () => {
  it('parses integer', () => expect(parsePesoInput('80')).toBe(80));
  it('parses decimal with dot', () => expect(parsePesoInput('80.5')).toBe(80.5));
  it('parses decimal with comma', () => expect(parsePesoInput('80,5')).toBe(80.5));
  it('returns NaN for empty', () => expect(parsePesoInput('')).toBeNaN());
});
```

- [ ] **Step 2: Extract and fix the helper in usePesoController.ts**

Open `apps/mobile/src/ui/peso/hooks/usePesoController.ts`. Find the line with `.replace(',', '.')` (around line 78).

Add a named export for the helper (above the hook function):

```ts
export function parsePesoInput(input: string): number {
  return parseFloat(input.replace(/,/g, '.'));
}
```

Replace the inline parse:

```ts
// before:
const pesoKg = parseFloat(pesoKgInput.replace(',', '.'));
// after:
const pesoKg = parsePesoInput(pesoKgInput);
```

- [ ] **Step 3: Check for other occurrences**

```bash
grep -r "replace.*','.*'\\.'" apps/mobile/src --include="*.ts" --include="*.tsx"
```

Fix any additional occurrences using the same `/,/g` regex pattern.

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose usePesoController.test
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "fix(peso): use regex global to replace all commas in float input parsing"
```

---

### Task 4: SetDiaPlanoUseCase — reject empty string treinoId

`SetDiaPlanoUseCase.execute('seg', '')` silently persists an empty string, creating an orphaned reference. An empty string should be treated as `null` (clear the day).

**Files:**
- Modify: `apps/mobile/src/application/plano/use-cases/SetDiaPlanoUseCase.ts`
- Modify (or create): test file alongside the use case

- [ ] **Step 1: Write failing test**

```ts
// apps/mobile/src/application/plano/use-cases/SetDiaPlanoUseCase.test.ts
// If the file already exists, add tests inside the existing describe.
import { describe, expect, it, vi } from 'vitest';
import { SetDiaPlanoUseCase } from './SetDiaPlanoUseCase';

describe('SetDiaPlanoUseCase', () => {
  it('passes null when treinoId is null', async () => {
    const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as never;
    await new SetDiaPlanoUseCase(repo).execute('seg', null);
    expect(repo.setDia).toHaveBeenCalledWith('seg', null);
  });

  it('passes treinoId when non-empty', async () => {
    const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as never;
    await new SetDiaPlanoUseCase(repo).execute('seg', 't1');
    expect(repo.setDia).toHaveBeenCalledWith('seg', 't1');
  });

  it('converts empty string to null', async () => {
    const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as never;
    await new SetDiaPlanoUseCase(repo).execute('seg', '');
    expect(repo.setDia).toHaveBeenCalledWith('seg', null);
  });

  it('converts whitespace-only string to null', async () => {
    const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as never;
    await new SetDiaPlanoUseCase(repo).execute('seg', '   ');
    expect(repo.setDia).toHaveBeenCalledWith('seg', null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm --prefix apps/mobile test -- --reporter=verbose SetDiaPlanoUseCase.test
```

Expected: last 2 tests FAIL.

- [ ] **Step 3: Fix the use case**

Open `apps/mobile/src/application/plano/use-cases/SetDiaPlanoUseCase.ts`. Change `execute`:

```ts
execute(dia: DiaSemana, treinoId: string | null): Promise<void> {
  const normalizado = typeof treinoId === 'string' && treinoId.trim() === '' ? null : treinoId;
  return this.repository.setDia(dia, normalizado);
}
```

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose SetDiaPlanoUseCase.test
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/application/plano/use-cases/SetDiaPlanoUseCase.ts \
        apps/mobile/src/application/plano/use-cases/SetDiaPlanoUseCase.test.ts
git commit -m "fix(plano): coerce empty string treinoId to null in SetDiaPlanoUseCase"
```

---

### Task 5: updateMedia — add updated_at timestamp

`SQLiteExerciseRepository.updateMedia()` does not update `updated_at`, creating stale timestamps after media is attached.

**Files:**
- Modify: `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`

- [ ] **Step 1: Locate the method**

Open `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`. Find `updateMedia` (around line 105). Current SQL:

```sql
UPDATE exercises SET media_online = ?, media_local = ? WHERE id = ?
```

- [ ] **Step 2: Add updated_at to the UPDATE**

Change the SQL to:

```ts
await this.database.run(
  'UPDATE exercises SET media_online = ?, media_local = ?, updated_at = datetime(\'now\') WHERE id = ?',
  [mediaOnline, mediaLocal, id]
);
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

Expected: all tests pass (this is an infra change; existing tests are not affected).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts
git commit -m "fix(exercises): update updated_at when updateMedia is called"
```

---

### Task 6: TreinoExercicio.create — add invariant validation

`TreinoExercicio.create()` accepts any `TreinoExercicioPrimitives` without validation. Add guards for `ordem >= 0`, `cargaPadrao >= 0`, and `seriesRecomendadas > 0`. `restore()` is for DB hydration — do NOT add validation there.

**Files:**
- Modify: `apps/mobile/src/domain/treinos/entities/TreinoExercicio.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/domain/treinos/entities/TreinoExercicio.test.ts
// If the file already exists, add tests inside the existing describe.
import { describe, expect, it } from 'vitest';
import { TreinoExercicio } from './TreinoExercicio';

function base() {
  return {
    id: 'te1', treinoId: 't1', exercicioId: 'ex1',
    ordem: 0, seriesRecomendadas: null, execucoesRecomendadas: null,
    cargaPadrao: null, tempoDescansoSegundos: null, metodo: 'normal' as const, grupoId: null,
  };
}

describe('TreinoExercicio.create', () => {
  it('creates with valid props', () => {
    expect(() => TreinoExercicio.create(base())).not.toThrow();
  });

  it('throws when ordem is negative', () => {
    expect(() => TreinoExercicio.create({ ...base(), ordem: -1 })).toThrow();
  });

  it('throws when cargaPadrao is negative', () => {
    expect(() => TreinoExercicio.create({ ...base(), cargaPadrao: -5 })).toThrow();
  });

  it('throws when seriesRecomendadas is zero', () => {
    expect(() => TreinoExercicio.create({ ...base(), seriesRecomendadas: 0 })).toThrow();
  });

  it('allows null optional fields', () => {
    expect(() => TreinoExercicio.create(base())).not.toThrow();
  });
});

describe('TreinoExercicio.restore', () => {
  it('does NOT throw for negative ordem (DB data trusted)', () => {
    expect(() => TreinoExercicio.restore({ ...base(), ordem: -1 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify failures**

```bash
npm --prefix apps/mobile test -- --reporter=verbose TreinoExercicio.test
```

Expected: 3 tests FAIL (negative ordem, negative cargaPadrao, zero series).

- [ ] **Step 3: Add validation to create()**

```ts
static create(props: TreinoExercicioPrimitives): TreinoExercicio {
  if (props.ordem < 0) {
    throw new Error('TreinoExercicio: ordem deve ser >= 0');
  }
  if (props.cargaPadrao !== null && props.cargaPadrao !== undefined && props.cargaPadrao < 0) {
    throw new Error('TreinoExercicio: cargaPadrao deve ser >= 0');
  }
  if (props.seriesRecomendadas !== null && props.seriesRecomendadas !== undefined && props.seriesRecomendadas <= 0) {
    throw new Error('TreinoExercicio: seriesRecomendadas deve ser > 0');
  }
  return new TreinoExercicio(props);
}
```

`restore()` remains unchanged (no validation — trusts DB data).

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose TreinoExercicio.test
```

Expected: all 6 tests pass. Also run the full suite to check nothing regressed:

```bash
npm --prefix apps/mobile test
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/domain/treinos/entities/TreinoExercicio.ts \
        apps/mobile/src/domain/treinos/entities/TreinoExercicio.test.ts
git commit -m "feat(treinos): add invariant validation to TreinoExercicio.create"
```

---

### Task 7: Surface DuplicateTreinoError message in useTreinoListController

`DuplicateTreinoError` is thrown by `CreateTreinoUseCase` and `UpdateTreinoUseCase` with the message `Ja existe um treino chamado "X"`. The hook's catch block only handles `TreinoValidationError` and falls through to a generic `"Nao foi possivel criar o treino."` message — the user never sees the duplicate name message.

**Files:**
- Modify: `apps/mobile/src/ui/treinos/hooks/useTreinoListController.ts`

- [ ] **Step 1: Find and read the catch block**

Open `apps/mobile/src/ui/treinos/hooks/useTreinoListController.ts`. Find the `onSubmit` catch block (around line 100-107). It looks like:

```ts
if (error instanceof TreinoValidationError) {
  setErrorMessage(error.message);
} else {
  setErrorMessage('Nao foi possivel criar o treino.');
}
```

- [ ] **Step 2: Add DuplicateTreinoError import**

At the top of the file, add:

```ts
import { DuplicateTreinoError } from '../../../application/treinos/errors/DuplicateTreinoError';
```

- [ ] **Step 3: Handle DuplicateTreinoError in the catch block**

Change the catch block to:

```ts
if (error instanceof TreinoValidationError || error instanceof DuplicateTreinoError) {
  setErrorMessage(error.message);
} else {
  setErrorMessage('Nao foi possivel criar o treino.');
}
```

- [ ] **Step 4: Check if onDuplicate and onSubmit-for-update also need the same fix**

Search for other catch blocks in the same file that call `setErrorMessage` with a generic message. Apply the same pattern wherever `createTreino` or `updateTreino` is called.

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
git add apps/mobile/src/ui/treinos/hooks/useTreinoListController.ts
git commit -m "fix(treinos): surface DuplicateTreinoError message in useTreinoListController"
```

---

### Task 8: Migrate expo-file-system/legacy → new API

Two files still use the deprecated `expo-file-system/legacy` API while the rest of the project already uses the new API (`Directory`, `File`, `Paths` from `expo-file-system`). Migrate both files.

**Files:**
- Modify: `apps/mobile/src/ui/exercises/components/ExerciseFormFields.tsx`
- Modify: `apps/mobile/src/ui/exercises/hooks/useExerciseCatalogController.ts`

- [ ] **Step 1: Read both files in full**

```bash
grep -n "FileSystemLegacy\|expo-file-system" apps/mobile/src/ui/exercises/components/ExerciseFormFields.tsx
grep -n "FileSystemLegacy\|expo-file-system" apps/mobile/src/ui/exercises/hooks/useExerciseCatalogController.ts
```

Note every legacy method used.

- [ ] **Step 2: Migrate ExerciseFormFields.tsx**

Replace the import:

```ts
// Remove:
import * as FileSystemLegacy from 'expo-file-system/legacy';
// Add:
import { Directory, File, Paths } from 'expo-file-system';
```

In `handlePickFile`, replace the directory creation and file copy:

```ts
// Before (legacy):
const dir = FileSystemLegacy.documentDirectory + 'exercises/';
await FileSystemLegacy.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
const id = exercicioId ?? ('tmp_' + Date.now());
const dest = dir + id + '_local.' + ext;
await deleteFileIfLocal(currentLocalRef.current);
await FileSystemLegacy.copyAsync({ from: asset.uri, to: dest });
onChangeLocal(dest);

// After (new API):
const exercisesDir = new Directory(Paths.document, 'exercises');
if (!exercisesDir.exists) { try { exercisesDir.create(); } catch {} }
const id = exercicioId ?? ('tmp_' + Date.now());
const destFile = new File(exercisesDir, `${id}_local.${ext}`);
await deleteFileIfLocal(currentLocalRef.current);
const sourceFile = new File(asset.uri);
sourceFile.copy(destFile);
onChangeLocal(destFile.uri);
```

In `deleteFileIfLocal`, replace the delete call:

```ts
// Before:
await FileSystemLegacy.deleteAsync(uri, { idempotent: true });

// After:
try {
  const f = new File(uri);
  if (f.exists) f.delete();
} catch {}
```

- [ ] **Step 3: Migrate useExerciseCatalogController.ts**

Read the file and apply equivalent migrations. The controller likely uses `FileSystemLegacy` only for file cleanup (checking if a file exists or deleting). Replace with `new File(uri).exists` and `new File(uri).delete()`.

- [ ] **Step 4: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors in the modified files.

- [ ] **Step 5: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/ui/exercises/components/ExerciseFormFields.tsx \
        apps/mobile/src/ui/exercises/hooks/useExerciseCatalogController.ts
git commit -m "refactor(exercises): migrate expo-file-system/legacy to new API in ExerciseFormFields and useExerciseCatalogController"
```
