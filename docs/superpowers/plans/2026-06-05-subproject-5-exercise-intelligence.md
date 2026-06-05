# Sub-projeto 5: Exercise Intelligence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Exercise entity with structured biomechanical data, build a versioned seed infrastructure that works across multiple research sessions, and upgrade the substitution engine to 3-layer tiered scoring.

**Architecture:** Migration v17 adds all new columns atomically. A new `ExerciseSeedLoader` reads per-sub-group JSON files from `seeds/` and upserts catalog exercises by `id`, versioned via a `catalog_version` column. `SugerirSubstitutosUseCase` gains three scoring layers (exact movement+muscles → same movement OR high muscle overlap → same group). The old `exercise_alternatives` table is kept; two new typed tables are added for equivalent vs muscle-group alternatives.

**Tech Stack:** TypeScript 5.9 strict, Expo SQLite 16, Vitest 4.1, React Native

---

## File Map

### Created
| File | Responsibility |
|------|---------------|
| `apps/mobile/src/infrastructure/exercises/ExerciseSeedLoader.ts` | Reads seed JSON files, upserts catalog exercises, tracks version in `settings` |
| `apps/mobile/src/infrastructure/exercises/ExerciseSeedLoader.test.ts` | Unit tests for loader using InMemory DB |
| `apps/mobile/src/infrastructure/exercises/seeds/_manifest.json` | Research session tracker (for the skill, not read by app) |
| `apps/mobile/src/infrastructure/exercises/seeds/peito_press.json` | First seed batch — chest press variations |
| `apps/mobile/src/infrastructure/exercises/seeds/peito_fly.json` | Second seed batch — chest fly/isolation variations |

### Modified
| File | What changes |
|------|-------------|
| `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts` | Add migration v17 |
| `apps/mobile/src/domain/exercises/entities/Exercise.ts` | Add 7 new fields to primitives; update create/restore/update |
| `apps/mobile/src/domain/exercises/repositories/ExerciseRepository.ts` | Add `listEquivalentAlternativas`, `listMuscleGroupAlternativas`, `findByNameOrVariation` |
| `apps/mobile/src/infrastructure/exercises/InMemoryExerciseRepository.ts` | Implement 3 new methods |
| `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts` | New columns in all SELECTs, new methods, upsert logic |
| `apps/mobile/src/domain/sessoes/entities/SessaoExercicio.ts` | `musculoAlvoSnapshot: string[]`, add `movementPatternSnapshot: string \| null` |
| `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts` | Parse/serialize JSON array for musculo_alvo_snapshot |
| `apps/mobile/src/application/sessoes/use-cases/IniciarSessaoUseCase.ts` | Pass `movementPattern` into snapshot |
| `apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.ts` | Update `withSubstituicao` call signature |
| `apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.ts` | 3-layer scoring; new `CandidatoSubstituto.similaridade` field |
| `apps/mobile/src/ui/sessao/components/SubstituirExercicioModal.tsx` | New section labels matching `similaridade` values |
| `apps/mobile/src/bootstrap/mobileDependencies.ts` | Instantiate and call `ExerciseSeedLoader` on startup |
| `C:/Users/Usuario/.claude/skills/exercise-intelligence-research/SKILL.md` | Add session scoping + save-to-file instructions |

---

## Task 1: Migration v17

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

- [ ] **Step 1: Open the migrations array and add v17 at the end**

After the last migration entry (currently v16), append:

```typescript
// v17: exercise intelligence — structured biomechanical fields + typed alternatives
// musculo_alvo column format changes from plain string to JSON array.
// sessao_exercicios.musculo_alvo_snapshot also becomes JSON array.
`ALTER TABLE exercises ADD COLUMN movement_pattern TEXT;
 ALTER TABLE exercises ADD COLUMN stabilizers TEXT;
 ALTER TABLE exercises ADD COLUMN execution_type TEXT;
 ALTER TABLE exercises ADD COLUMN name_variations TEXT;
 ALTER TABLE exercises ADD COLUMN primary_equipment TEXT;
 ALTER TABLE exercises ADD COLUMN secondary_equipment TEXT;
 ALTER TABLE exercises ADD COLUMN catalog_version INTEGER NOT NULL DEFAULT 0;
 CREATE TABLE IF NOT EXISTS exercise_equivalent_alternatives (
   exercicio_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
   alternativa_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
   PRIMARY KEY (exercicio_id, alternativa_id)
 );
 CREATE TABLE IF NOT EXISTS exercise_muscle_group_alternatives (
   exercicio_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
   alternativa_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
   PRIMARY KEY (exercicio_id, alternativa_id)
 );
 ALTER TABLE sessao_exercicios ADD COLUMN movement_pattern_snapshot TEXT;
 UPDATE exercises
   SET musculo_alvo = json_array(musculo_alvo)
   WHERE musculo_alvo IS NOT NULL AND musculo_alvo NOT LIKE '[%';
 UPDATE sessao_exercicios
   SET musculo_alvo_snapshot = json_array(musculo_alvo_snapshot)
   WHERE musculo_alvo_snapshot IS NOT NULL AND musculo_alvo_snapshot NOT LIKE '[%';`,
```

- [ ] **Step 2: Run the test suite to confirm no migration regression**

```bash
npm --prefix apps/mobile test -- --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass (currently 299).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "feat(sub5): migration v17 — exercise intelligence columns + typed alternatives tables"
```

---

## Task 2: Exercise Entity — New Fields

**Files:**
- Modify: `apps/mobile/src/domain/exercises/entities/Exercise.ts`
- Modify: `apps/mobile/src/domain/exercises/entities/Exercise.test.ts`

- [ ] **Step 1: Write failing tests for new fields**

Add to `Exercise.test.ts`:

```typescript
it('creates an exercise with biomechanical fields', () => {
  const exercise = Exercise.create({
    id: 'ex-bio-1',
    name: 'Supino Reto com Barra',
    groupMuscle: 'Peito, Triceps, Ombros',
    category: 'Composto',
    equipment: 'Barra olimpica',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    movementPattern: 'Horizontal Push',
    musculoAlvo: ['peitoral_medio', 'peitoral_esternal'],
    stabilizers: ['rotador_externo', 'serratus_anterior'],
    executionType: 'Bilateral',
    nameVariations: ['Supino Reto', 'Bench Press', 'Barbell Bench Press'],
    primaryEquipment: 'Barbell',
    secondaryEquipment: 'Flat Bench',
    catalogVersion: 1,
  });

  const p = exercise.toPrimitives();
  expect(p.movementPattern).toBe('Horizontal Push');
  expect(p.musculoAlvo).toEqual(['peitoral_medio', 'peitoral_esternal']);
  expect(p.stabilizers).toEqual(['rotador_externo', 'serratus_anterior']);
  expect(p.executionType).toBe('Bilateral');
  expect(p.nameVariations).toEqual(['Supino Reto', 'Bench Press', 'Barbell Bench Press']);
  expect(p.primaryEquipment).toBe('Barbell');
  expect(p.secondaryEquipment).toBe('Flat Bench');
  expect(p.catalogVersion).toBe(1);
});

it('defaults new fields to empty/null when not provided', () => {
  const exercise = Exercise.create({
    id: 'ex-bio-2',
    name: 'Supino Reto',
    groupMuscle: 'Peito',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const p = exercise.toPrimitives();
  expect(p.movementPattern).toBeNull();
  expect(p.musculoAlvo).toEqual([]);
  expect(p.stabilizers).toEqual([]);
  expect(p.executionType).toBeNull();
  expect(p.nameVariations).toEqual([]);
  expect(p.primaryEquipment).toBeNull();
  expect(p.secondaryEquipment).toBeNull();
  expect(p.catalogVersion).toBe(0);
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm --prefix apps/mobile test -- Exercise.test --reporter=verbose
```

Expected: FAIL — `p.movementPattern` does not exist.

- [ ] **Step 3: Update `ExercisePrimitives`, `CreateExerciseProps`, `UpdateExerciseProps`**

Replace the interfaces in `Exercise.ts`:

```typescript
export interface ExercisePrimitives {
  id: string;
  name: string;
  normalizedName: string;
  groupMuscle: string;
  category: string;
  equipment: string | null;
  loadUnit: 'kg';
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
  mediaOnline: string | null;
  mediaLocal: string | null;
  // biomechanical fields (v17)
  musculoAlvo: string[];
  movementPattern: string | null;
  stabilizers: string[];
  executionType: 'Unilateral' | 'Bilateral' | 'Can Be Both' | null;
  nameVariations: string[];
  primaryEquipment: string | null;
  secondaryEquipment: string | null;
  catalogVersion: number;
}

export interface CreateExerciseProps {
  id: string;
  name: string;
  groupMuscle: string;
  category?: string | null;
  equipment?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  isCustom?: boolean;
  mediaOnline?: string | null;
  mediaLocal?: string | null;
  // biomechanical fields (v17)
  musculoAlvo?: string[];
  movementPattern?: string | null;
  stabilizers?: string[];
  executionType?: 'Unilateral' | 'Bilateral' | 'Can Be Both' | null;
  nameVariations?: string[];
  primaryEquipment?: string | null;
  secondaryEquipment?: string | null;
  catalogVersion?: number;
}

export interface UpdateExerciseProps {
  name: string;
  groupMuscle: string;
  category?: string | null;
  equipment?: string | null;
  mediaOnline?: string | null;
  mediaLocal?: string | null;
  musculoAlvo?: string[];
  movementPattern?: string | null;
  stabilizers?: string[];
  executionType?: 'Unilateral' | 'Bilateral' | 'Can Be Both' | null;
  nameVariations?: string[];
  primaryEquipment?: string | null;
  secondaryEquipment?: string | null;
}
```

- [ ] **Step 4: Update `Exercise.create`, `Exercise.update`, `Exercise.restore`**

In `Exercise.create`, add after `const equipment = ...` line:

```typescript
const musculoAlvo = input.musculoAlvo ?? [];
const movementPattern = input.movementPattern ?? null;
const stabilizers = input.stabilizers ?? [];
const executionType = input.executionType ?? null;
const nameVariations = input.nameVariations ?? [];
const primaryEquipment = normalizeOptionalText(input.primaryEquipment);
const secondaryEquipment = normalizeOptionalText(input.secondaryEquipment);
const catalogVersion = input.catalogVersion ?? 0;
```

Add these fields to the `new Exercise({...})` call:

```typescript
return new Exercise({
  id: input.id,
  name,
  normalizedName: normalizeText(name),
  groupMuscle,
  category,
  equipment,
  loadUnit: 'kg',
  isCustom: input.isCustom ?? true,
  createdAt,
  updatedAt,
  mediaOnline: normalizeOptionalText(input.mediaOnline),
  mediaLocal: normalizeOptionalText(input.mediaLocal),
  musculoAlvo,
  movementPattern,
  stabilizers,
  executionType,
  nameVariations,
  primaryEquipment,
  secondaryEquipment,
  catalogVersion,
});
```

In `Exercise.update`, add the same new fields (reading from `input` with fallback to `current`):

```typescript
return new Exercise({
  ...current,  // spread first — preserves id, isCustom, loadUnit, createdAt, catalog fields
  name,
  normalizedName: normalizeText(name),
  groupMuscle,
  category,
  equipment,
  updatedAt: updatedAt.toISOString(),
  mediaOnline: 'mediaOnline' in input ? normalizeOptionalText(input.mediaOnline) : current.mediaOnline,
  mediaLocal:  'mediaLocal'  in input ? normalizeOptionalText(input.mediaLocal)  : current.mediaLocal,
  musculoAlvo:       'musculoAlvo'       in input ? (input.musculoAlvo ?? [])                        : current.musculoAlvo,
  movementPattern:   'movementPattern'   in input ? (input.movementPattern ?? null)                  : current.movementPattern,
  stabilizers:       'stabilizers'       in input ? (input.stabilizers ?? [])                        : current.stabilizers,
  executionType:     'executionType'     in input ? (input.executionType ?? null)                    : current.executionType,
  nameVariations:    'nameVariations'    in input ? (input.nameVariations ?? [])                     : current.nameVariations,
  primaryEquipment:  'primaryEquipment'  in input ? normalizeOptionalText(input.primaryEquipment)    : current.primaryEquipment,
  secondaryEquipment:'secondaryEquipment'in input ? normalizeOptionalText(input.secondaryEquipment)  : current.secondaryEquipment,
});
```

- [ ] **Step 5: Run tests to confirm PASS**

```bash
npm --prefix apps/mobile test -- Exercise.test --reporter=verbose
```

Expected: all 5 tests in `Exercise.test.ts` pass.

- [ ] **Step 6: Run full suite to confirm no regressions**

```bash
npm --prefix apps/mobile test 2>&1 | tail -5
```

Expected: same count as before (299+).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/domain/exercises/entities/Exercise.ts \
        apps/mobile/src/domain/exercises/entities/Exercise.test.ts
git commit -m "feat(sub5): add biomechanical fields to Exercise entity"
```

---

## Task 3: ExerciseRepository Interface — New Methods

**Files:**
- Modify: `apps/mobile/src/domain/exercises/repositories/ExerciseRepository.ts`

- [ ] **Step 1: Add three new methods to the interface**

```typescript
import type { Exercise } from '../entities/Exercise';

export interface ListExercisesOptions {
  limit?: number;
  offset?: number;
}

export interface ExerciseRepository {
  save(exercise: Exercise): Promise<void>;
  list(options?: ListExercisesOptions): Promise<Exercise[]>;
  findById(id: string): Promise<Exercise | null>;
  findByIds(ids: string[]): Promise<Exercise[]>;
  findByNormalizedName(normalizedName: string): Promise<Exercise | null>;
  findByNameOrVariation(query: string): Promise<Exercise[]>;
  delete(id: string): Promise<void>;
  updateMedia(id: string, mediaOnline: string | null, mediaLocal: string | null): Promise<void>;
  // flat list (kept for backward compat)
  listAlternativas(exercicioId: string): Promise<Exercise[]>;
  addAlternativa(exercicioId: string, alternativaId: string): Promise<void>;
  removeAlternativa(exercicioId: string, alternativaId: string): Promise<void>;
  // typed alternatives (v17)
  listEquivalentAlternativas(exercicioId: string): Promise<Exercise[]>;
  addEquivalentAlternativa(exercicioId: string, alternativaId: string): Promise<void>;
  listMuscleGroupAlternativas(exercicioId: string): Promise<Exercise[]>;
  addMuscleGroupAlternativa(exercicioId: string, alternativaId: string): Promise<void>;
  // seed upsert (used by ExerciseSeedLoader only)
  upsertCatalogExercise(exercise: Exercise, equivalentIds: string[], muscleGroupIds: string[]): Promise<void>;
}
```

- [ ] **Step 2: Run typecheck to see all files that now fail to implement the interface**

```bash
npm --prefix apps/mobile run typecheck 2>&1 | grep "error TS"
```

Expected: `InMemoryExerciseRepository.ts` and `SQLiteExerciseRepository.ts` report missing method errors. No other surprises.

- [ ] **Step 3: Commit interface only**

```bash
git add apps/mobile/src/domain/exercises/repositories/ExerciseRepository.ts
git commit -m "feat(sub5): extend ExerciseRepository interface with typed alternatives + seed upsert"
```

---

## Task 4: InMemoryExerciseRepository — Implement New Methods

**Files:**
- Modify: `apps/mobile/src/infrastructure/exercises/InMemoryExerciseRepository.ts`

- [ ] **Step 1: Add storage maps and implement all new methods**

Replace the file content:

```typescript
import { Exercise } from '../../domain/exercises/entities/Exercise';
import type { ExerciseRepository, ListExercisesOptions } from '../../domain/exercises/repositories/ExerciseRepository';

export class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly exercisesById = new Map<string, Exercise>();
  private readonly alternativasById = new Map<string, Set<string>>();
  private readonly equivalentById = new Map<string, Set<string>>();
  private readonly muscleGroupById = new Map<string, Set<string>>();

  async save(exercise: Exercise): Promise<void> {
    this.exercisesById.set(exercise.toPrimitives().id, exercise);
  }

  async list(options?: ListExercisesOptions): Promise<Exercise[]> {
    const all = Array.from(this.exercisesById.values());
    if (options?.limit != null) {
      return all.slice(options.offset ?? 0, (options.offset ?? 0) + options.limit);
    }
    return all;
  }

  async findById(id: string): Promise<Exercise | null> {
    return this.exercisesById.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Exercise[]> {
    return ids.flatMap((id) => {
      const e = this.exercisesById.get(id);
      return e ? [e] : [];
    });
  }

  async findByNormalizedName(normalizedName: string): Promise<Exercise | null> {
    for (const exercise of this.exercisesById.values()) {
      if (exercise.toPrimitives().normalizedName === normalizedName) return exercise;
    }
    return null;
  }

  async findByNameOrVariation(query: string): Promise<Exercise[]> {
    const q = query.trim().toLowerCase();
    const results: Exercise[] = [];
    for (const exercise of this.exercisesById.values()) {
      const p = exercise.toPrimitives();
      const inName = p.normalizedName.includes(q);
      const inVariations = p.nameVariations.some((v) => v.toLowerCase().includes(q));
      if (inName || inVariations) results.push(exercise);
    }
    return results;
  }

  async delete(id: string): Promise<void> {
    this.exercisesById.delete(id);
  }

  async updateMedia(id: string, mediaOnline: string | null, mediaLocal: string | null): Promise<void> {
    const ex = this.exercisesById.get(id);
    if (!ex) return;
    this.exercisesById.set(id, Exercise.restore({ ...ex.toPrimitives(), mediaOnline, mediaLocal }));
  }

  async listAlternativas(exercicioId: string): Promise<Exercise[]> {
    const ids = this.alternativasById.get(exercicioId) ?? new Set();
    return [...ids].map((id) => this.exercisesById.get(id)).filter(Boolean) as Exercise[];
  }

  async addAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    const set = this.alternativasById.get(exercicioId) ?? new Set<string>();
    set.add(alternativaId);
    this.alternativasById.set(exercicioId, set);
  }

  async removeAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    this.alternativasById.get(exercicioId)?.delete(alternativaId);
  }

  async listEquivalentAlternativas(exercicioId: string): Promise<Exercise[]> {
    const ids = this.equivalentById.get(exercicioId) ?? new Set();
    return [...ids].map((id) => this.exercisesById.get(id)).filter(Boolean) as Exercise[];
  }

  async addEquivalentAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    const set = this.equivalentById.get(exercicioId) ?? new Set<string>();
    set.add(alternativaId);
    this.equivalentById.set(exercicioId, set);
  }

  async listMuscleGroupAlternativas(exercicioId: string): Promise<Exercise[]> {
    const ids = this.muscleGroupById.get(exercicioId) ?? new Set();
    return [...ids].map((id) => this.exercisesById.get(id)).filter(Boolean) as Exercise[];
  }

  async addMuscleGroupAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    const set = this.muscleGroupById.get(exercicioId) ?? new Set<string>();
    set.add(alternativaId);
    this.muscleGroupById.set(exercicioId, set);
  }

  async upsertCatalogExercise(exercise: Exercise, equivalentIds: string[], muscleGroupIds: string[]): Promise<void> {
    this.exercisesById.set(exercise.toPrimitives().id, exercise);
    for (const altId of equivalentIds) await this.addEquivalentAlternativa(exercise.toPrimitives().id, altId);
    for (const altId of muscleGroupIds) await this.addMuscleGroupAlternativa(exercise.toPrimitives().id, altId);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm --prefix apps/mobile run typecheck 2>&1 | grep "InMemory"
```

Expected: no errors for `InMemoryExerciseRepository`.

- [ ] **Step 3: Run test suite**

```bash
npm --prefix apps/mobile test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/infrastructure/exercises/InMemoryExerciseRepository.ts
git commit -m "feat(sub5): implement new ExerciseRepository methods in InMemory adapter"
```

---

## Task 5: SQLiteExerciseRepository — New Columns + New Methods

**Files:**
- Modify: `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`

- [ ] **Step 1: Update `ExerciseRow` and `mapRowToPrimitives`**

Replace `ExerciseRow` interface and `mapRowToPrimitives` at the top of the file:

```typescript
interface ExerciseRow {
  id: string;
  name: string;
  normalized_name: string;
  group_muscle: string;
  category: string;
  equipment: string | null;
  load_unit: 'kg';
  is_custom: number;
  created_at: string;
  updated_at: string;
  media_online: string | null;
  media_local: string | null;
  musculo_alvo: string | null;       // JSON array string e.g. '["peitoral_medio"]'
  movement_pattern: string | null;
  stabilizers: string | null;        // JSON array string
  execution_type: string | null;
  name_variations: string | null;    // JSON array string
  primary_equipment: string | null;
  secondary_equipment: string | null;
  catalog_version: number;
}

function mapRowToPrimitives(row: ExerciseRow): ExercisePrimitives {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    groupMuscle: row.group_muscle,
    category: row.category,
    equipment: row.equipment,
    loadUnit: row.load_unit,
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mediaOnline: row.media_online,
    mediaLocal: row.media_local,
    musculoAlvo:        row.musculo_alvo     ? (JSON.parse(row.musculo_alvo)     as string[]) : [],
    movementPattern:    row.movement_pattern ?? null,
    stabilizers:        row.stabilizers      ? (JSON.parse(row.stabilizers)      as string[]) : [],
    executionType:      row.execution_type   as ExercisePrimitives['executionType'] ?? null,
    nameVariations:     row.name_variations  ? (JSON.parse(row.name_variations)  as string[]) : [],
    primaryEquipment:   row.primary_equipment ?? null,
    secondaryEquipment: row.secondary_equipment ?? null,
    catalogVersion:     row.catalog_version ?? 0,
  };
}
```

- [ ] **Step 2: Update the `SELECT` column lists throughout the file**

Replace every `SELECT` column list with:

```sql
SELECT id, name, normalized_name, group_muscle, category, equipment,
       load_unit, is_custom, created_at, updated_at, media_online, media_local,
       musculo_alvo, movement_pattern, stabilizers, execution_type,
       name_variations, primary_equipment, secondary_equipment, catalog_version
FROM exercises
```

There are 5 places: `list`, `findById`, `findByIds`, `findByNormalizedName`, `listAlternativas`. Update all of them.

- [ ] **Step 3: Update `save` to include new columns**

Replace the `save` method:

```typescript
async save(exercise: Exercise): Promise<void> {
  const p = exercise.toPrimitives();
  await this.database.run(
    `INSERT OR REPLACE INTO exercises (
       id, name, normalized_name, group_muscle, category, equipment,
       load_unit, is_custom, created_at, updated_at, media_online, media_local,
       musculo_alvo, movement_pattern, stabilizers, execution_type,
       name_variations, primary_equipment, secondary_equipment, catalog_version,
       deleted_at, dirty
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
    [
      p.id, p.name, p.normalizedName, p.groupMuscle, p.category, p.equipment,
      p.loadUnit, p.isCustom ? 1 : 0, p.createdAt, p.updatedAt,
      p.mediaOnline, p.mediaLocal,
      JSON.stringify(p.musculoAlvo),
      p.movementPattern,
      JSON.stringify(p.stabilizers),
      p.executionType,
      JSON.stringify(p.nameVariations),
      p.primaryEquipment,
      p.secondaryEquipment,
      p.catalogVersion,
    ]
  );
}
```

- [ ] **Step 4: Add `findByNameOrVariation`**

Add after `findByNormalizedName`:

```typescript
async findByNameOrVariation(query: string): Promise<Exercise[]> {
  const q = `%${query.toLowerCase()}%`;
  const rows = await this.database.getAll<ExerciseRow>(
    `SELECT id, name, normalized_name, group_muscle, category, equipment,
            load_unit, is_custom, created_at, updated_at, media_online, media_local,
            musculo_alvo, movement_pattern, stabilizers, execution_type,
            name_variations, primary_equipment, secondary_equipment, catalog_version
     FROM exercises
     WHERE deleted_at IS NULL
       AND (normalized_name LIKE ?
            OR (name_variations IS NOT NULL AND LOWER(name_variations) LIKE ?))
     ORDER BY normalized_name ASC`,
    [q, q]
  );
  return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
}
```

- [ ] **Step 5: Add typed alternatives methods**

Add after `removeAlternativa`:

```typescript
async listEquivalentAlternativas(exercicioId: string): Promise<Exercise[]> {
  const rows = await this.database.getAll<ExerciseRow>(
    `SELECT e.id, e.name, e.normalized_name, e.group_muscle, e.category, e.equipment,
            e.load_unit, e.is_custom, e.created_at, e.updated_at, e.media_online, e.media_local,
            e.musculo_alvo, e.movement_pattern, e.stabilizers, e.execution_type,
            e.name_variations, e.primary_equipment, e.secondary_equipment, e.catalog_version
     FROM exercises e
     JOIN exercise_equivalent_alternatives ea ON ea.alternativa_id = e.id
     WHERE ea.exercicio_id = ? AND e.deleted_at IS NULL
     ORDER BY e.name ASC`,
    [exercicioId]
  );
  return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
}

async addEquivalentAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
  await this.database.run(
    `INSERT INTO exercise_equivalent_alternatives (exercicio_id, alternativa_id)
     VALUES (?, ?) ON CONFLICT(exercicio_id, alternativa_id) DO NOTHING`,
    [exercicioId, alternativaId]
  );
}

async listMuscleGroupAlternativas(exercicioId: string): Promise<Exercise[]> {
  const rows = await this.database.getAll<ExerciseRow>(
    `SELECT e.id, e.name, e.normalized_name, e.group_muscle, e.category, e.equipment,
            e.load_unit, e.is_custom, e.created_at, e.updated_at, e.media_online, e.media_local,
            e.musculo_alvo, e.movement_pattern, e.stabilizers, e.execution_type,
            e.name_variations, e.primary_equipment, e.secondary_equipment, e.catalog_version
     FROM exercises e
     JOIN exercise_muscle_group_alternatives ea ON ea.alternativa_id = e.id
     WHERE ea.exercicio_id = ? AND e.deleted_at IS NULL
     ORDER BY e.name ASC`,
    [exercicioId]
  );
  return rows.map((row) => Exercise.restore(mapRowToPrimitives(row)));
}

async addMuscleGroupAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
  await this.database.run(
    `INSERT INTO exercise_muscle_group_alternatives (exercicio_id, alternativa_id)
     VALUES (?, ?) ON CONFLICT(exercicio_id, alternativa_id) DO NOTHING`,
    [exercicioId, alternativaId]
  );
}
```

- [ ] **Step 6: Add `upsertCatalogExercise`**

Add at the end of the class:

```typescript
async upsertCatalogExercise(exercise: Exercise, equivalentIds: string[], muscleGroupIds: string[]): Promise<void> {
  const p = exercise.toPrimitives();
  const now = nowIso();
  await this.database.run(
    `INSERT INTO exercises (
       id, name, normalized_name, group_muscle, category, equipment,
       load_unit, is_custom, created_at, updated_at, media_online, media_local,
       musculo_alvo, movement_pattern, stabilizers, execution_type,
       name_variations, primary_equipment, secondary_equipment, catalog_version,
       deleted_at, dirty
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)
     ON CONFLICT(id) DO UPDATE SET
       name               = excluded.name,
       normalized_name    = excluded.normalized_name,
       group_muscle       = excluded.group_muscle,
       category           = excluded.category,
       equipment          = excluded.equipment,
       musculo_alvo       = excluded.musculo_alvo,
       movement_pattern   = excluded.movement_pattern,
       stabilizers        = excluded.stabilizers,
       execution_type     = excluded.execution_type,
       name_variations    = excluded.name_variations,
       primary_equipment  = excluded.primary_equipment,
       secondary_equipment = excluded.secondary_equipment,
       catalog_version    = excluded.catalog_version,
       updated_at         = excluded.updated_at
     WHERE exercises.is_custom = 0`,
    [
      p.id, p.name, p.normalizedName, p.groupMuscle, p.category, p.equipment,
      p.loadUnit, 0, p.createdAt, now,
      p.mediaOnline, p.mediaLocal,
      JSON.stringify(p.musculoAlvo),
      p.movementPattern,
      JSON.stringify(p.stabilizers),
      p.executionType,
      JSON.stringify(p.nameVariations),
      p.primaryEquipment,
      p.secondaryEquipment,
      p.catalogVersion,
    ]
  );

  for (const altId of equivalentIds) await this.addEquivalentAlternativa(p.id, altId);
  for (const altId of muscleGroupIds) await this.addMuscleGroupAlternativa(p.id, altId);
}
```

- [ ] **Step 7: Run typecheck and tests**

```bash
npm --prefix apps/mobile run typecheck 2>&1 | grep "SQLiteExercise"
npm --prefix apps/mobile test 2>&1 | tail -5
```

Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts
git commit -m "feat(sub5): update SQLiteExerciseRepository with v17 columns and typed alternatives"
```

---

## Task 6: SessaoExercicio — Array Snapshot + Movement Pattern

**Files:**
- Modify: `apps/mobile/src/domain/sessoes/entities/SessaoExercicio.ts`

- [ ] **Step 1: Update `SessaoExercicioPrimitives` and `withSubstituicao`**

Change `musculoAlvoSnapshot` from `string | null` to `string[]`, and add `movementPatternSnapshot`:

```typescript
export interface SessaoExercicioPrimitives {
  id: string;
  sessaoTreinoId: string;
  exercicioId: string;
  ordem: number;
  nomeSnapshot: string;
  grupoMuscularSnapshot: string;
  categoriaSnapshot: string;
  equipamentoSnapshot: string | null;
  musculoAlvoSnapshot: string[];           // was string | null
  movementPatternSnapshot: string | null;  // NEW
  realizado: boolean;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  metodo: 'normal' | 'drop_set' | 'piramide' | 'rest_pause';
  grupoId: string | null;
  substituidoPorExercicioId: string | null;
  substituicaoMotivo: SubstituicaoMotivo | null;
  nomeOriginalSnapshot: string | null;
}
```

Update `withSubstituicao` signature (the `novoMusculoAlvo` parameter):

```typescript
withSubstituicao(
  novoExercicioId: string,
  novoNome: string,
  novoGrupoMuscular: string,
  novaCategoria: string,
  novoEquipamento: string | null,
  novoMusculoAlvo: string[],              // was string | null
  novoMovementPattern: string | null,     // NEW
  motivo: SubstituicaoMotivo | null,
): SessaoExercicio {
  return new SessaoExercicio({
    ...this.props,
    exercicioId: novoExercicioId,
    nomeSnapshot: novoNome,
    grupoMuscularSnapshot: novoGrupoMuscular,
    categoriaSnapshot: novaCategoria,
    equipamentoSnapshot: novoEquipamento,
    musculoAlvoSnapshot: novoMusculoAlvo,
    movementPatternSnapshot: novoMovementPattern,
    substituidoPorExercicioId: novoExercicioId,
    substituicaoMotivo: motivo,
    nomeOriginalSnapshot: this.props.nomeOriginalSnapshot ?? this.props.nomeSnapshot,
  });
}
```

- [ ] **Step 2: Run typecheck to see callers that need updating**

```bash
npm --prefix apps/mobile run typecheck 2>&1 | grep -E "(sessao|Sessao|substituicao|Substitui)"
```

Expected: errors in `SubstituirExercicioSessaoUseCase.ts`, `IniciarSessaoUseCase.ts`, and any test helpers that call `makeSE` or `SessaoExercicio.create` without the new field.

- [ ] **Step 3: Update `IniciarSessaoUseCase.ts` to pass new snapshot fields**

Locate where `SessaoExercicio.create` is called (the snapshot construction). Add the new fields:

```typescript
SessaoExercicio.create({
  // ... existing fields ...
  musculoAlvoSnapshot: exercicio.musculoAlvo,           // now string[]
  movementPatternSnapshot: exercicio.movementPattern,   // NEW
  // ...
})
```

- [ ] **Step 4: Update `SubstituirExercicioSessaoUseCase.ts` call to `withSubstituicao`**

Find the `withSubstituicao(...)` call. Add the new arguments:

```typescript
sessaoExercicio.withSubstituicao(
  novoExercicio.id,
  novoExercicio.name,
  novoExercicio.groupMuscle,
  novoExercicio.category,
  novoExercicio.equipment,
  novoExercicio.musculoAlvo,         // now string[]
  novoExercicio.movementPattern,     // NEW
  motivo,
)
```

- [ ] **Step 5: Update test helpers**

In `SugerirSubstitutosUseCase.test.ts`, update `makeSE` helper:

```typescript
function makeSE(id: string, exercicioId: string, grupoMuscular = 'Peito', musculoAlvo: string[] = [], movementPattern: string | null = null) {
  return SessaoExercicio.create({
    // ... existing fields ...
    musculoAlvoSnapshot: musculoAlvo,
    movementPatternSnapshot: movementPattern,
    // ...
  });
}
```

Update any other test files that construct `SessaoExercicioPrimitives` directly (run typecheck to find them all).

- [ ] **Step 6: Update `SQLiteSessaoExercicioRepository.ts`**

Find `mapRowToPrimitives` (or equivalent mapping function). Update:

```typescript
musculoAlvoSnapshot: row.musculo_alvo_snapshot
  ? (JSON.parse(row.musculo_alvo_snapshot) as string[])
  : [],
movementPatternSnapshot: row.movement_pattern_snapshot ?? null,
```

In the `save`/`INSERT` method for `sessao_exercicios`, serialize:

```typescript
JSON.stringify(p.musculoAlvoSnapshot),   // was p.musculoAlvoSnapshot directly
p.movementPatternSnapshot,               // new column
```

- [ ] **Step 7: Run full test suite**

```bash
npm --prefix apps/mobile test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/domain/sessoes/entities/SessaoExercicio.ts \
        apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts \
        apps/mobile/src/application/sessoes/use-cases/IniciarSessaoUseCase.ts \
        apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.ts
git commit -m "feat(sub5): update SessaoExercicio snapshot to array musculoAlvo + movementPattern"
```

---

## Task 7: ExerciseSeedLoader

**Files:**
- Create: `apps/mobile/src/infrastructure/exercises/ExerciseSeedLoader.ts`
- Create: `apps/mobile/src/infrastructure/exercises/ExerciseSeedLoader.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `ExerciseSeedLoader.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ExerciseSeedLoader } from './ExerciseSeedLoader';
import { InMemoryExerciseRepository } from './InMemoryExerciseRepository';

const SEED_FILE_V1 = {
  catalog_version: 1,
  exercises: [
    {
      id: 'test-seed-001',
      name: 'Supino Reto com Barra',
      name_variations: ['Bench Press', 'Supino Reto'],
      group_muscle: 'Peito, Triceps, Ombros',
      category: 'Composto',
      equipment: 'Barra olimpica',
      primary_equipment: 'Barbell',
      secondary_equipment: 'Flat Bench',
      movement_pattern: 'Horizontal Push',
      musculo_alvo: ['peitoral_medio', 'peitoral_esternal'],
      stabilizers: ['rotador_externo', 'serratus_anterior'],
      execution_type: 'Bilateral',
      equivalent_alternatives: [],
      muscle_group_alternatives: [],
    },
  ],
};

describe('ExerciseSeedLoader', () => {
  let repo: InMemoryExerciseRepository;
  let loader: ExerciseSeedLoader;

  beforeEach(() => {
    repo = new InMemoryExerciseRepository();
    loader = new ExerciseSeedLoader(repo);
  });

  it('inserts a new catalog exercise from seed data', async () => {
    await loader.loadSeedFile(SEED_FILE_V1);

    const exercise = await repo.findById('test-seed-001');
    expect(exercise).not.toBeNull();
    expect(exercise!.toPrimitives().movementPattern).toBe('Horizontal Push');
    expect(exercise!.toPrimitives().musculoAlvo).toEqual(['peitoral_medio', 'peitoral_esternal']);
    expect(exercise!.toPrimitives().nameVariations).toEqual(['Bench Press', 'Supino Reto']);
    expect(exercise!.toPrimitives().catalogVersion).toBe(1);
  });

  it('is idempotent — running twice does not duplicate', async () => {
    await loader.loadSeedFile(SEED_FILE_V1);
    await loader.loadSeedFile(SEED_FILE_V1);

    const all = await repo.list();
    expect(all.filter((e) => e.toPrimitives().id === 'test-seed-001')).toHaveLength(1);
  });

  it('updates catalog exercise when version increases', async () => {
    await loader.loadSeedFile(SEED_FILE_V1);

    const v2 = {
      catalog_version: 2,
      exercises: [
        { ...SEED_FILE_V1.exercises[0], movement_pattern: 'Horizontal Pull', musculo_alvo: ['dorsal'] },
      ],
    };
    await loader.loadSeedFile(v2);

    const exercise = await repo.findById('test-seed-001');
    expect(exercise!.toPrimitives().movementPattern).toBe('Horizontal Pull');
    expect(exercise!.toPrimitives().musculoAlvo).toEqual(['dorsal']);
    expect(exercise!.toPrimitives().catalogVersion).toBe(2);
  });

  it('never overwrites user-created exercises (is_custom = true)', async () => {
    const { Exercise } = await import('../../domain/exercises/entities/Exercise');
    const { normalizeText } = await import('../../shared/utils/normalizeText');
    const userEx = Exercise.create({
      id: 'test-seed-001',
      name: 'Meu Supino Custom',
      groupMuscle: 'Peito',
      createdAt: new Date(),
      isCustom: true,
    });
    await repo.save(userEx);

    await loader.loadSeedFile(SEED_FILE_V1);

    const after = await repo.findById('test-seed-001');
    expect(after!.toPrimitives().name).toBe('Meu Supino Custom');
    expect(after!.toPrimitives().isCustom).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm --prefix apps/mobile test -- ExerciseSeedLoader --reporter=verbose
```

Expected: FAIL — `ExerciseSeedLoader` does not exist.

- [ ] **Step 3: Create `ExerciseSeedLoader.ts`**

```typescript
import { Exercise } from '../../domain/exercises/entities/Exercise';
import { normalizeText } from '../../shared/utils/normalizeText';
import type { ExerciseRepository } from '../../domain/exercises/repositories/ExerciseRepository';

export interface SeedExerciseEntry {
  id: string;
  name: string;
  name_variations: string[];
  group_muscle: string;
  category: string;
  equipment: string | null;
  primary_equipment: string | null;
  secondary_equipment: string | null;
  movement_pattern: string | null;
  musculo_alvo: string[];
  stabilizers: string[];
  execution_type: 'Unilateral' | 'Bilateral' | 'Can Be Both' | null;
  equivalent_alternatives: string[];
  muscle_group_alternatives: string[];
  media_local?: string | null;
  media_online?: string | null;
}

export interface SeedFile {
  catalog_version: number;
  exercises: SeedExerciseEntry[];
}

export class ExerciseSeedLoader {
  constructor(private readonly repository: ExerciseRepository) {}

  async loadSeedFile(seed: SeedFile): Promise<void> {
    for (const entry of seed.exercises) {
      const existing = await this.repository.findById(entry.id);
      if (existing && existing.toPrimitives().isCustom) continue; // never overwrite user exercises

      const exercise = Exercise.restore({
        id: entry.id,
        name: entry.name,
        normalizedName: normalizeText(entry.name),
        groupMuscle: entry.group_muscle,
        category: entry.category,
        equipment: entry.equipment,
        loadUnit: 'kg',
        isCustom: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        mediaOnline: entry.media_online ?? null,
        mediaLocal: entry.media_local ?? null,
        musculoAlvo: entry.musculo_alvo,
        movementPattern: entry.movement_pattern,
        stabilizers: entry.stabilizers,
        executionType: entry.execution_type,
        nameVariations: entry.name_variations,
        primaryEquipment: entry.primary_equipment,
        secondaryEquipment: entry.secondary_equipment,
        catalogVersion: seed.catalog_version,
      });

      await this.repository.upsertCatalogExercise(
        exercise,
        entry.equivalent_alternatives,
        entry.muscle_group_alternatives,
      );
    }
  }
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
npm --prefix apps/mobile test -- ExerciseSeedLoader --reporter=verbose
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/infrastructure/exercises/ExerciseSeedLoader.ts \
        apps/mobile/src/infrastructure/exercises/ExerciseSeedLoader.test.ts
git commit -m "feat(sub5): add ExerciseSeedLoader with versioned upsert logic"
```

---

## Task 8: First Seed Files — Peito Press + Peito Fly

**Files:**
- Create: `apps/mobile/src/infrastructure/exercises/seeds/_manifest.json`
- Create: `apps/mobile/src/infrastructure/exercises/seeds/peito_press.json`
- Create: `apps/mobile/src/infrastructure/exercises/seeds/peito_fly.json`

- [ ] **Step 1: Create the research manifest**

Create `seeds/_manifest.json`:

```json
{
  "_comment": "Research session tracker — read by the exercise-intelligence-research skill, NOT by the app",
  "sessions": {
    "peito_press": {
      "status": "complete",
      "exercise_count": 18,
      "researched_at": "2026-06-05",
      "covers": ["seed-ex-001","seed-ex-002","seed-ex-003","seed-ex-004","gif-ex-001","gif-ex-002","gif-ex-003","gif-ex-004","gif-ex-005","gif-ex-006","gif-ex-007","gif-ex-008","gif-ex-018","gif-ex-019","gif-ex-020","gif-ex-032","gif-ex-033","gif-ex-034"]
    },
    "peito_fly": {
      "status": "complete",
      "exercise_count": 15,
      "researched_at": "2026-06-05",
      "covers": ["seed-ex-005","seed-ex-006","gif-ex-009","gif-ex-010","gif-ex-011","gif-ex-012","gif-ex-013","gif-ex-014","gif-ex-015","gif-ex-016","gif-ex-017","gif-ex-021","gif-ex-027","gif-ex-028","gif-ex-035"]
    }
  },
  "pending_sessions": [
    "costas_pull_vertical",
    "costas_pull_horizontal",
    "ombros_press",
    "ombros_lateral",
    "biceps",
    "triceps_push_down",
    "triceps_overhead",
    "quadriceps",
    "posterior_gluteos",
    "abdome",
    "panturrilha"
  ]
}
```

- [ ] **Step 2: Create `peito_press.json`**

```json
{
  "catalog_version": 1,
  "exercises": [
    {
      "id": "seed-ex-001",
      "name": "Supino Reto com Barra",
      "name_variations": ["Supino Reto", "Bench Press", "Barbell Bench Press", "Supino Plano com Barra"],
      "group_muscle": "Peito, Triceps, Ombros",
      "category": "Composto",
      "equipment": "Barra olimpica",
      "primary_equipment": "Barbell",
      "secondary_equipment": "Flat Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio", "peitoral_esternal"],
      "stabilizers": ["rotador_externo", "serratus_anterior", "core"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-004", "gif-ex-004", "gif-ex-018"],
      "muscle_group_alternatives": ["seed-ex-005", "seed-ex-006", "gif-ex-021"]
    },
    {
      "id": "seed-ex-002",
      "name": "Supino Inclinado com Barra",
      "name_variations": ["Supino Inclinado", "Incline Bench Press", "Incline Barbell Press"],
      "group_muscle": "Peito, Ombros, Triceps",
      "category": "Composto",
      "equipment": "Barra olimpica",
      "primary_equipment": "Barbell",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior", "peitoral_clavicular"],
      "stabilizers": ["rotador_externo", "serratus_anterior", "core"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-005", "gif-ex-006", "gif-ex-007", "gif-ex-032", "gif-ex-033"],
      "muscle_group_alternatives": ["gif-ex-009", "gif-ex-014", "gif-ex-016"]
    },
    {
      "id": "seed-ex-003",
      "name": "Supino Declinado com Barra",
      "name_variations": ["Supino Declinado", "Decline Bench Press", "Decline Barbell Press"],
      "group_muscle": "Peito, Triceps",
      "category": "Composto",
      "equipment": "Barra olimpica",
      "primary_equipment": "Barbell",
      "secondary_equipment": "Decline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_inferior", "peitoral_esternal_inferior"],
      "stabilizers": ["rotador_externo", "serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-008"],
      "muscle_group_alternatives": ["gif-ex-012", "gif-ex-015", "gif-ex-017"]
    },
    {
      "id": "seed-ex-004",
      "name": "Supino Reto com Haltere",
      "name_variations": ["Supino com Haltere", "Dumbbell Bench Press", "Supino Haltere"],
      "group_muscle": "Peito, Triceps",
      "category": "Composto",
      "equipment": "Haltere",
      "primary_equipment": "Dumbbell",
      "secondary_equipment": "Flat Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio", "peitoral_esternal"],
      "stabilizers": ["rotador_externo", "serratus_anterior", "core"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-001", "gif-ex-004", "gif-ex-018"],
      "muscle_group_alternatives": ["seed-ex-005", "seed-ex-006", "gif-ex-021"]
    },
    {
      "id": "gif-ex-001",
      "name": "Supino Reto Pes Elevados",
      "name_variations": ["Bench Press Feet Up", "Supino Pés no Banco"],
      "group_muscle": "Peito, Triceps, Ombros",
      "category": "Composto",
      "equipment": "Barra olimpica",
      "primary_equipment": "Barbell",
      "secondary_equipment": "Flat Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio", "peitoral_esternal"],
      "stabilizers": ["core", "serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-001", "seed-ex-004"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-002",
      "name": "Supino Reto Unilateral com Halteres",
      "name_variations": ["One Arm Dumbbell Press", "Supino Unilateral"],
      "group_muscle": "Peito, Triceps",
      "category": "Composto",
      "equipment": "Haltere",
      "primary_equipment": "Dumbbell",
      "secondary_equipment": "Flat Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["rotador_externo", "core", "obliquos"],
      "execution_type": "Unilateral",
      "equivalent_alternatives": [],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-003",
      "name": "Supino Alternado com Halteres",
      "name_variations": ["Alternating Dumbbell Press", "Supino Alternado"],
      "group_muscle": "Peito, Triceps",
      "category": "Composto",
      "equipment": "Haltere",
      "primary_equipment": "Dumbbell",
      "secondary_equipment": "Flat Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["rotador_externo", "core"],
      "execution_type": "Can Be Both",
      "equivalent_alternatives": [],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-004",
      "name": "Supino no Smith",
      "name_variations": ["Smith Machine Bench Press", "Supino Smith", "Supino no Guia"],
      "group_muscle": "Peito, Triceps, Ombros",
      "category": "Composto",
      "equipment": "Smith",
      "primary_equipment": "Smith Machine",
      "secondary_equipment": "Flat Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio", "peitoral_esternal"],
      "stabilizers": ["serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-001", "seed-ex-004", "gif-ex-018"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-005",
      "name": "Supino Inclinado com Halteres",
      "name_variations": ["Incline Dumbbell Press", "Supino Inclinado Haltere"],
      "group_muscle": "Peito, Ombros, Triceps",
      "category": "Composto",
      "equipment": "Haltere",
      "primary_equipment": "Dumbbell",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior", "peitoral_clavicular"],
      "stabilizers": ["rotador_externo", "serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-002", "gif-ex-006", "gif-ex-007"],
      "muscle_group_alternatives": ["gif-ex-009", "gif-ex-014"]
    },
    {
      "id": "gif-ex-006",
      "name": "Supino Inclinado no Smith",
      "name_variations": ["Incline Smith Press", "Smith Inclinado"],
      "group_muscle": "Peito, Ombros, Triceps",
      "category": "Composto",
      "equipment": "Smith",
      "primary_equipment": "Smith Machine",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior", "peitoral_clavicular"],
      "stabilizers": ["serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-002", "gif-ex-005", "gif-ex-007"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-007",
      "name": "Supino Inclinado com Barra Variacao",
      "name_variations": ["Incline Barbell Press Variation"],
      "group_muscle": "Peito, Ombros, Triceps",
      "category": "Composto",
      "equipment": "Barra olimpica",
      "primary_equipment": "Barbell",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior", "peitoral_clavicular"],
      "stabilizers": ["rotador_externo", "serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-002", "gif-ex-005", "gif-ex-006"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-008",
      "name": "Supino Declinado no Smith",
      "name_variations": ["Decline Smith Press", "Smith Declinado"],
      "group_muscle": "Peito, Triceps",
      "category": "Composto",
      "equipment": "Smith",
      "primary_equipment": "Smith Machine",
      "secondary_equipment": "Decline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_inferior"],
      "stabilizers": ["serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-003"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-018",
      "name": "Press Peitoral na Maquina",
      "name_variations": ["Chest Press Machine", "Maquina de Supino", "Hammer Strength Chest Press"],
      "group_muscle": "Peito, Triceps",
      "category": "Composto",
      "equipment": "Maquina",
      "primary_equipment": "Pec Deck",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-001", "seed-ex-004", "gif-ex-004"],
      "muscle_group_alternatives": ["gif-ex-021", "gif-ex-028"]
    },
    {
      "id": "gif-ex-019",
      "name": "Press Peitoral Variacao",
      "name_variations": ["Chest Press Variation"],
      "group_muscle": "Peito, Triceps",
      "category": "Composto",
      "equipment": "Maquina",
      "primary_equipment": "Pec Deck",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-018"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-020",
      "name": "Press Inclinado no Cabo",
      "name_variations": ["Incline Cable Press", "Cable Incline Press"],
      "group_muscle": "Peito, Ombros, Triceps",
      "category": "Composto",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior"],
      "stabilizers": ["serratus_anterior", "core"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-002", "gif-ex-005"],
      "muscle_group_alternatives": ["gif-ex-010", "gif-ex-014"]
    },
    {
      "id": "gif-ex-032",
      "name": "Supino Inclinado no Cabo",
      "name_variations": ["Incline Cable Bench Press"],
      "group_muscle": "Peito, Ombros, Triceps",
      "category": "Composto",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior"],
      "stabilizers": ["serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-002", "gif-ex-005"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-033",
      "name": "Supino Inclinado no Smith Bonus",
      "name_variations": ["Smith Incline Bench Press Bonus"],
      "group_muscle": "Peito, Ombros, Triceps",
      "category": "Composto",
      "equipment": "Smith",
      "primary_equipment": "Smith Machine",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior"],
      "stabilizers": ["serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-002", "gif-ex-006"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-034",
      "name": "Supino Reto Pegada Aberta",
      "name_variations": ["Wide Grip Bench Press", "Supino Pegada Larga"],
      "group_muscle": "Peito, Triceps, Ombros",
      "category": "Composto",
      "equipment": "Barra olimpica",
      "primary_equipment": "Barbell",
      "secondary_equipment": "Flat Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio", "peitoral_lateral"],
      "stabilizers": ["rotador_externo", "serratus_anterior"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-001"],
      "muscle_group_alternatives": []
    }
  ]
}
```

- [ ] **Step 3: Create `peito_fly.json`**

```json
{
  "catalog_version": 1,
  "exercises": [
    {
      "id": "seed-ex-005",
      "name": "Crucifixo com Haltere",
      "name_variations": ["Crucifixo", "Dumbbell Fly", "Fly com Haltere", "Dumbbell Chest Fly"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Haltere",
      "primary_equipment": "Dumbbell",
      "secondary_equipment": "Flat Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio", "peitoral_esternal"],
      "stabilizers": ["biceps_braquial", "coracobrachialis"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-011", "gif-ex-013", "gif-ex-021", "gif-ex-028"],
      "muscle_group_alternatives": ["seed-ex-001", "seed-ex-004"]
    },
    {
      "id": "seed-ex-006",
      "name": "Crossover no Cabo",
      "name_variations": ["Cable Crossover", "Cross Over", "Polia Cruzada", "Cable Fly"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["biceps_braquial", "coracobrachialis"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-013", "gif-ex-021"],
      "muscle_group_alternatives": ["seed-ex-001", "seed-ex-004"]
    },
    {
      "id": "gif-ex-009",
      "name": "Crucifixo Inclinado com Halteres",
      "name_variations": ["Incline Dumbbell Fly", "Crucifixo Inclinado"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Haltere",
      "primary_equipment": "Dumbbell",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior", "peitoral_clavicular"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-010", "gif-ex-014", "gif-ex-016", "gif-ex-027"],
      "muscle_group_alternatives": ["seed-ex-002", "gif-ex-005"]
    },
    {
      "id": "gif-ex-010",
      "name": "Crucifixo Inclinado no Cabo",
      "name_variations": ["Incline Cable Fly", "Cable Incline Fly"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-009", "gif-ex-014", "gif-ex-016"],
      "muscle_group_alternatives": ["seed-ex-002"]
    },
    {
      "id": "gif-ex-011",
      "name": "Crucifixo Polia Baixa",
      "name_variations": ["Low Cable Fly", "Polia Baixa Peito", "Cable Fly Polia Baixa"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio", "peitoral_esternal"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-005", "gif-ex-013"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-012",
      "name": "Cross Over Polia Alta",
      "name_variations": ["High Cable Crossover", "Polia Alta Crossover"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_inferior"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-015", "gif-ex-017"],
      "muscle_group_alternatives": ["seed-ex-003"]
    },
    {
      "id": "gif-ex-013",
      "name": "Cross Over Polia Media",
      "name_variations": ["Mid Cable Crossover", "Cable Fly Neutro"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-006", "gif-ex-011"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-014",
      "name": "Cross Over Polia Baixa",
      "name_variations": ["Low to High Cable Fly", "Polia Baixa para Cima"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-010", "gif-ex-016"],
      "muscle_group_alternatives": ["seed-ex-002"]
    },
    {
      "id": "gif-ex-015",
      "name": "Crucifixo Cabo Alto",
      "name_variations": ["High Cable Fly", "Cable Fly Alto"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_inferior"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-012", "gif-ex-017"],
      "muscle_group_alternatives": ["seed-ex-003"]
    },
    {
      "id": "gif-ex-016",
      "name": "Crucifixo Cabo Baixo",
      "name_variations": ["Low Cable Chest Fly", "Cable Fly Inferior"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-009", "gif-ex-014"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-017",
      "name": "Crucifixo Declinado no Cabo",
      "name_variations": ["Decline Cable Fly", "Crucifixo Declinado"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Cabo",
      "primary_equipment": "Cable",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_inferior"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-012", "gif-ex-015"],
      "muscle_group_alternatives": ["seed-ex-003"]
    },
    {
      "id": "gif-ex-021",
      "name": "Peck Deck",
      "name_variations": ["Pec Deck", "Voador", "Butterfly Machine", "Maquina Voador"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Maquina",
      "primary_equipment": "Pec Deck",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-005", "gif-ex-013", "gif-ex-028", "gif-ex-035"],
      "muscle_group_alternatives": ["seed-ex-001", "gif-ex-018"]
    },
    {
      "id": "gif-ex-027",
      "name": "Crucifixo Inclinado Banco com Halteres",
      "name_variations": ["Incline Bench Dumbbell Fly"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Haltere",
      "primary_equipment": "Dumbbell",
      "secondary_equipment": "Incline Bench",
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_superior"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-009", "gif-ex-010"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-028",
      "name": "Crucifixo Maquina",
      "name_variations": ["Machine Fly", "Maquina Crucifixo", "Chest Fly Machine"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Maquina",
      "primary_equipment": "Pec Deck",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["seed-ex-005", "gif-ex-021", "gif-ex-035"],
      "muscle_group_alternatives": []
    },
    {
      "id": "gif-ex-035",
      "name": "Voador Maquina",
      "name_variations": ["Fly Machine", "Voador", "Pec Deck Fly"],
      "group_muscle": "Peito",
      "category": "Isolado",
      "equipment": "Maquina",
      "primary_equipment": "Pec Deck",
      "secondary_equipment": null,
      "movement_pattern": "Horizontal Push",
      "musculo_alvo": ["peitoral_medio"],
      "stabilizers": ["biceps_braquial"],
      "execution_type": "Bilateral",
      "equivalent_alternatives": ["gif-ex-021", "gif-ex-028"],
      "muscle_group_alternatives": []
    }
  ]
}
```

- [ ] **Step 4: Commit seed files**

```bash
git add apps/mobile/src/infrastructure/exercises/seeds/
git commit -m "feat(sub5): add peito_press and peito_fly seed files (catalog_version 1)"
```

---

## Task 9: Wire Seed Loader into Bootstrap

**Files:**
- Modify: `apps/mobile/src/bootstrap/mobileDependencies.ts`

- [ ] **Step 1: Import and call ExerciseSeedLoader after DB init**

Find the section in `mobileDependencies.ts` where `SQLiteExerciseRepository` is instantiated. After the DB client is initialized and before use cases are created, add:

```typescript
import { ExerciseSeedLoader } from '../infrastructure/exercises/ExerciseSeedLoader';
import peitoPress from '../infrastructure/exercises/seeds/peito_press.json';
import peitoFly from '../infrastructure/exercises/seeds/peito_fly.json';
```

Then, in the initialization function (wherever the DB client is ready), call:

```typescript
const seedLoader = new ExerciseSeedLoader(exerciseRepository);
await Promise.all([
  seedLoader.loadSeedFile(peitoPress),
  seedLoader.loadSeedFile(peitoFly),
]);
```

> **Note on JSON imports:** Expo/Metro supports JSON imports out of the box. If TypeScript complains about `resolveJsonModule`, ensure `tsconfig.json` has `"resolveJsonModule": true`.

- [ ] **Step 2: Run typecheck**

```bash
npm --prefix apps/mobile run typecheck 2>&1 | grep -E "(SeedLoader|seed)"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/bootstrap/mobileDependencies.ts
git commit -m "feat(sub5): wire ExerciseSeedLoader into bootstrap startup"
```

---

## Task 10: SugerirSubstitutosUseCase — 3-Layer Scoring

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.ts`
- Modify: `apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.test.ts`

- [ ] **Step 1: Write failing tests for the new 3-layer behavior**

Add to `SugerirSubstitutosUseCase.test.ts`:

```typescript
function makeExerciseWithPattern(
  id: string,
  groupMuscle: string,
  musculoAlvo: string[] = [],
  movementPattern: string | null = null,
) {
  return Exercise.create({
    id,
    name: `Ex-${id}`,
    groupMuscle,
    createdAt: new Date('2026-01-01'),
    musculoAlvo,
    movementPattern,
  });
}

it('layer 1 (quase_igual): same movement AND muscle overlap ranks above same-group-only', async () => {
  const seRepo = new InMemorySessaoExercicioRepository();
  const exRepo = new InMemoryExerciseRepository();

  await seRepo.save(makeSE('se1', 'ex1', 'Peito', ['peitoral_medio'], 'Horizontal Push'));
  await exRepo.save(makeExerciseWithPattern('ex1', 'Peito', ['peitoral_medio'], 'Horizontal Push'));
  // quase_igual — same pattern AND muscle
  await exRepo.save(makeExerciseWithPattern('ex2', 'Peito', ['peitoral_medio'], 'Horizontal Push'));
  // similar — same pattern, different muscle
  await exRepo.save(makeExerciseWithPattern('ex3', 'Peito', ['peitoral_inferior'], 'Horizontal Push'));
  // mesmo_grupo — different pattern, same group
  await exRepo.save(makeExerciseWithPattern('ex4', 'Peito', ['peitoral_medio'], 'Vertical Push'));

  const useCase = new SugerirSubstitutosUseCase({
    sessaoExercicioRepository: seRepo,
    exerciseRepository: exRepo,
    historicoRepository: new InMemoryHistoricoRepository(),
  });

  const result = await useCase.execute('se1');
  const ex2 = result.find((r) => r.exercicio.id === 'ex2');
  const ex3 = result.find((r) => r.exercicio.id === 'ex3');
  const ex4 = result.find((r) => r.exercicio.id === 'ex4');

  expect(ex2?.similaridade).toBe('quase_igual');
  expect(ex3?.similaridade).toBe('similar');
  expect(ex4?.similaridade).toBe('mesmo_grupo');

  const ids = result.map((r) => r.exercicio.id);
  expect(ids.indexOf('ex2')).toBeLessThan(ids.indexOf('ex3'));
  expect(ids.indexOf('ex3')).toBeLessThan(ids.indexOf('ex4'));
});

it('falls back gracefully when exercises have no movement_pattern set', async () => {
  const seRepo = new InMemorySessaoExercicioRepository();
  const exRepo = new InMemoryExerciseRepository();

  await seRepo.save(makeSE('se1', 'ex1', 'Peito', []));
  await exRepo.save(makeExercise('ex1', 'Peito'));
  await exRepo.save(makeExercise('ex2', 'Peito'));

  const useCase = new SugerirSubstitutosUseCase({
    sessaoExercicioRepository: seRepo,
    exerciseRepository: exRepo,
    historicoRepository: new InMemoryHistoricoRepository(),
  });

  const result = await useCase.execute('se1');
  expect(result.map((r) => r.exercicio.id)).toContain('ex2');
  expect(result[0].similaridade).toBe('mesmo_grupo');
});
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm --prefix apps/mobile test -- SugerirSubstitutos --reporter=verbose
```

Expected: FAIL on new tests (`similaridade` field does not exist).

- [ ] **Step 3: Rewrite `SugerirSubstitutosUseCase.ts`**

```typescript
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { HistoricoRepository, UltimaExecucaoValida } from '../../../domain/historico/repositories/HistoricoRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

export type SimilaridadeNivel = 'quase_igual' | 'similar' | 'mesmo_grupo';

export interface CandidatoSubstituto {
  exercicio: ExercisePrimitives;
  predefinido: boolean;
  similaridade: SimilaridadeNivel;
  ultimaExecucao: UltimaExecucaoValida | null;
}

interface Dependencies {
  sessaoExercicioRepository: SessaoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  historicoRepository: HistoricoRepository;
}

function splitGrupos(groupMuscle: string): string[] {
  return groupMuscle.split(',').map((g) => g.trim()).filter(Boolean);
}

function temIntersecaoDeGrupo(a: string, b: string): boolean {
  const ga = splitGrupos(a);
  const gb = new Set(splitGrupos(b));
  return ga.some((g) => gb.has(g));
}

function musculoOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  return a.filter((m) => setB.has(m)).length / Math.max(a.length, b.length);
}

/**
 * Returns substitution candidates in three tiers:
 *   0. Pre-defined substitutes (manual list)
 *   1. quase_igual  — same movement_pattern AND musculo overlap ≥ 0.5
 *   2. similar      — same movement_pattern OR musculo overlap ≥ 0.5
 *   3. mesmo_grupo  — same groupMuscle (fallback, original behaviour)
 */
export class SugerirSubstitutosUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(sessaoExercicioId: string): Promise<CandidatoSubstituto[]> {
    const sessaoExercicio = await this.deps.sessaoExercicioRepository.findById(sessaoExercicioId);
    if (!sessaoExercicio) throw new SessaoExercicioNotFoundError(sessaoExercicioId);

    const p = sessaoExercicio.toPrimitives();
    const todosNaSessao = await this.deps.sessaoExercicioRepository.listBySessaoId(p.sessaoTreinoId);
    const idsNaSessao = new Set(todosNaSessao.map((se) => se.toPrimitives().exercicioId));

    const [todosExercicios, ultimasExecucoes, equivalentes] = await Promise.all([
      this.deps.exerciseRepository.list(),
      this.deps.historicoRepository.getUltimasExecucoesValidas(),
      this.deps.exerciseRepository.listEquivalentAlternativas(p.exercicioId),
    ]);

    const musculos = p.musculoAlvoSnapshot;   // string[]
    const grupo = p.grupoMuscularSnapshot;
    const pattern = p.movementPatternSnapshot;

    const idsPredefinidos = new Set(equivalentes.map((e) => e.toPrimitives().id));

    const camada0: CandidatoSubstituto[] = equivalentes
      .map((ex) => ex.toPrimitives())
      .filter((ep) => !idsNaSessao.has(ep.id))
      .map((ep) => ({
        exercicio: ep,
        predefinido: true,
        similaridade: 'quase_igual' as SimilaridadeNivel,
        ultimaExecucao: ultimasExecucoes.get(ep.id) ?? null,
      }));

    const camada1: CandidatoSubstituto[] = [];
    const camada2: CandidatoSubstituto[] = [];
    const camada3: CandidatoSubstituto[] = [];

    for (const ex of todosExercicios) {
      const ep = ex.toPrimitives();
      if (idsNaSessao.has(ep.id) || idsPredefinidos.has(ep.id)) continue;

      const base: Omit<CandidatoSubstituto, 'similaridade'> = {
        exercicio: ep,
        predefinido: false,
        ultimaExecucao: ultimasExecucoes.get(ep.id) ?? null,
      };

      const samePattern = pattern !== null && ep.movementPattern === pattern;
      const overlap = musculoOverlap(musculos, ep.musculoAlvo);

      if (samePattern && overlap >= 0.5) {
        camada1.push({ ...base, similaridade: 'quase_igual' });
      } else if (samePattern || overlap >= 0.5) {
        camada2.push({ ...base, similaridade: 'similar' });
      } else if (temIntersecaoDeGrupo(ep.groupMuscle, grupo)) {
        camada3.push({ ...base, similaridade: 'mesmo_grupo' });
      }
    }

    return [...camada0, ...camada1, ...camada2, ...camada3];
  }
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
npm --prefix apps/mobile test -- SugerirSubstitutos --reporter=verbose
```

Expected: all tests pass including the new ones.

- [ ] **Step 5: Run full test suite**

```bash
npm --prefix apps/mobile test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.ts \
        apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.test.ts
git commit -m "feat(sub5): 3-layer substitution scoring (quase_igual / similar / mesmo_grupo)"
```

---

## Task 11: SubstituirExercicioModal — New Labels

**Files:**
- Modify: `apps/mobile/src/ui/sessao/components/SubstituirExercicioModal.tsx`

- [ ] **Step 1: Update the modal to use `similaridade` instead of `enfaseDiferente`**

In `SubstituirExercicioModal.tsx`, replace the three `candidatos.filter(...)` lines at the top of the component:

```typescript
// Before
const predefinidos = candidatos.filter((c) => c.predefinido);
const camada1 = candidatos.filter((c) => !c.predefinido && !c.enfaseDiferente);
const camada2 = candidatos.filter((c) => !c.predefinido && c.enfaseDiferente);

// After
const predefinidos = candidatos.filter((c) => c.predefinido);
const quaseIguais = candidatos.filter((c) => !c.predefinido && c.similaridade === 'quase_igual');
const similares   = candidatos.filter((c) => !c.predefinido && c.similaridade === 'similar');
const mesmoGrupo  = candidatos.filter((c) => !c.predefinido && c.similaridade === 'mesmo_grupo');
```

Replace the JSX sections that render `camada1` and `camada2`:

```tsx
{quaseIguais.length > 0 ? (
  <>
    <Text style={styles.sectionLabel}>Quase igual</Text>
    {quaseIguais.map((cand) => (
      <CandidatoRow key={cand.exercicio.id} candidato={cand} selected={selecionado === cand.exercicio.id} onPress={() => handleSelecionado(cand.exercicio.id)} styles={styles} theme={c} />
    ))}
  </>
) : null}

{similares.length > 0 ? (
  <>
    <Text style={styles.sectionLabel}>Similar</Text>
    {similares.map((cand) => (
      <CandidatoRow key={cand.exercicio.id} candidato={cand} selected={selecionado === cand.exercicio.id} onPress={() => handleSelecionado(cand.exercicio.id)} styles={styles} theme={c} />
    ))}
  </>
) : null}

{mesmoGrupo.length > 0 ? (
  <>
    <Text style={styles.sectionLabel}>Mesmo grupo muscular</Text>
    {mesmoGrupo.map((cand) => (
      <CandidatoRow key={cand.exercicio.id} candidato={cand} selected={selecionado === cand.exercicio.id} onPress={() => handleSelecionado(cand.exercicio.id)} styles={styles} theme={c} />
    ))}
  </>
) : null}
```

In `CandidatoRow`, remove the `{candidato.enfaseDiferente ? '  ⚠ Ênfase diferente' : ''}` text from the meta line.

- [ ] **Step 2: Run typecheck**

```bash
npm --prefix apps/mobile run typecheck 2>&1 | grep "Modal"
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npm --prefix apps/mobile test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/ui/sessao/components/SubstituirExercicioModal.tsx
git commit -m "feat(sub5): update SubstituirExercicioModal with 3-tier similarity labels"
```

---

## Task 12: Search by Name Variations

**Files:**
- Modify any screen that calls `findByNormalizedName` or search exercise list UI

- [ ] **Step 1: Find all search entry points**

```bash
npm --prefix apps/mobile run typecheck 2>&1
grep -r "findByNormalizedName\|normalizeText.*search\|ListExercises" apps/mobile/src/ui --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 2: Update exercise list UI to use `findByNameOrVariation` when searching**

In the screen/hook that handles the search query input, replace the filter that currently does string matching on `normalizedName` with a call to `findByNameOrVariation(query)` from the repository, or if filtering in-memory, update it to also check `nameVariations`:

```typescript
// In-memory filter pattern (update wherever this exists in UI hooks):
const matchesQuery = (p: ExercisePrimitives, q: string) => {
  const norm = q.toLowerCase();
  return (
    p.normalizedName.includes(norm) ||
    p.nameVariations.some((v) => v.toLowerCase().includes(norm))
  );
};
```

- [ ] **Step 3: Run typecheck and tests**

```bash
npm --prefix apps/mobile run typecheck 2>&1 | tail -10
npm --prefix apps/mobile test 2>&1 | tail -5
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -p  # stage only the search-related changes
git commit -m "feat(sub5): extend exercise search to include name variations"
```

---

## Task 13: Update the Exercise Intelligence Research Skill

**Files:**
- Modify: `C:/Users/Usuario/.claude/skills/exercise-intelligence-research/SKILL.md`

- [ ] **Step 1: Add session scoping + file saving sections to the skill**

After the `## Overview` section, add:

```markdown
## Session Scoping

Each research session covers ONE sub-group, not an entire muscle. This keeps sessions focused and completable.

Recommended scope per session:

| Session | Scope | Target file |
|---------|-------|-------------|
| 1 | Peito — Press horizontal | `seeds/peito_press.json` |
| 2 | Peito — Fly / isolação | `seeds/peito_fly.json` |
| 3 | Costas — Pull vertical | `seeds/costas_pull_vertical.json` |
| 4 | Costas — Pull horizontal | `seeds/costas_pull_horizontal.json` |
| 5 | Ombros — Press | `seeds/ombros_press.json` |
| 6 | Ombros — Lateral / posterior | `seeds/ombros_lateral.json` |
| 7 | Bíceps | `seeds/biceps.json` |
| 8 | Tríceps — Push down | `seeds/triceps_push_down.json` |
| 9 | Tríceps — Overhead / testa | `seeds/triceps_overhead.json` |
| 10 | Quadríceps | `seeds/quadriceps.json` |
| 11 | Posterior / glúteos | `seeds/posterior_gluteos.json` |
| 12 | Abdome | `seeds/abdome.json` |
| 13 | Panturrilha | `seeds/panturrilha.json` |

At the start of each session, check `seeds/_manifest.json` to see what is already complete and which session to continue.

## Saving Output

After researching a sub-group, save results to the corresponding JSON file under:

`apps/mobile/src/infrastructure/exercises/seeds/<sub-group>.json`

**File format:**

```json
{
  "catalog_version": 1,
  "exercises": [ ...exercise objects... ]
}
```

- Set `catalog_version: 1` for initial research. Increment to `2` when correcting/enriching existing data.
- Each file is an array of exercise objects (see Output Format section).
- The seed loader does an upsert by `id` — running it twice is safe.
- Never change existing exercise `id` values — they are foreign keys in user data.

After saving, update `seeds/_manifest.json`:

```json
{
  "sessions": {
    "<sub-group-name>": {
      "status": "complete",
      "exercise_count": N,
      "researched_at": "YYYY-MM-DD",
      "covers": ["id-1", "id-2", ...]
    }
  }
}
```

## ID Reference

Existing exercise IDs to enrich (do NOT create new IDs for these):

- `seed-ex-001` through `seed-ex-043` — original seed exercises (no GIF)
- `gif-ex-001` through `gif-ex-NNN` — exercises with GIF media

For new exercises not yet in the catalog, generate a new ID following the pattern `gif-ex-NNN` (increment from the highest existing number) or `seed-ex-NNN` (if no GIF).
```

- [ ] **Step 2: Verify the skill file is valid**

```bash
cat "C:/Users/Usuario/.claude/skills/exercise-intelligence-research/SKILL.md" | head -5
```

Expected: shows frontmatter with `name:` and `description:` fields.

- [ ] **Step 3: Commit**

```bash
git add "C:/Users/Usuario/.claude/skills/exercise-intelligence-research/SKILL.md"
git commit -m "docs(sub5): update exercise-intelligence-research skill with session scoping and file saving instructions"
```

---

## Final Verification

- [ ] **Run full test suite**

```bash
npm --prefix apps/mobile test 2>&1 | tail -10
```

Expected: all tests pass (base 299 + new tests from Tasks 2 and 7 and 10).

- [ ] **Run typecheck**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: zero errors.

- [ ] **Verify seed data loads on startup**

Run the app in Expo Go. Open the exercise catalog and search for "bench press" — should find "Supino Reto com Barra" via name variations. Open the substitution modal for a chest exercise — should show tiered sections (Quase igual / Similar / Mesmo grupo muscular).

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|-------------|-----------|
| v17 migration atomic | Task 1 |
| Exercise entity new fields | Task 2 |
| ExerciseRepository new methods | Task 3 |
| InMemory adapter | Task 4 |
| SQLite adapter + upsert | Task 5 |
| SessaoExercicio snapshot array | Task 6 |
| Seed loader versioned upsert | Task 7 |
| Seed files peito_press + peito_fly | Task 8 |
| Bootstrap wiring | Task 9 |
| 3-layer substitution | Task 10 |
| Modal new labels | Task 11 |
| Name variation search | Task 12 |
| Skill session scoping + save | Task 13 |
| Never overwrite user exercises | Task 7 test 4 + Task 5 upsert WHERE clause |
| `catalog_version` for future cloud | Task 1 (column) + Task 5 (upsert) + Task 7 |
| Manifest for research tracking | Task 8 (`_manifest.json`) + Task 13 (skill) |
