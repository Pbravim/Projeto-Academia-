# Sub-project 0 — Foundations / Migration Prep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the local app for cloud sync — UUIDv7 IDs for new user rows, a canonical ISO `updated_at` plus `deleted_at`/`dirty`/`server_rev` sync columns on every user-owned table, and soft deletes — without adding any backend. App stays 100% local and shippable.

**Architecture:** All changes live in `apps/mobile`. A new SQLite migration (v16) adds sync columns; the SQLite repositories stamp `updated_at`/`dirty` on writes and convert hard deletes to tombstone `UPDATE`s with explicit soft-cascades; reads filter `deleted_at IS NULL`. Domain entities are untouched (timestamps stay ISO strings). In-memory test doubles are untouched.

**Tech Stack:** TypeScript 5.9 (strict), Expo SQLite 16 (prod) / better-sqlite3 (tests), Vitest 4.1, `uuidv7` + `react-native-get-random-values`.

**Spec:** [`docs/superpowers/specs/2026-06-04-subproject-0-foundations-design.md`](../specs/2026-06-04-subproject-0-foundations-design.md)

**Conventions for every task:**
- Run tests: `npm --prefix apps/mobile test`
- Run a single file: `npm --prefix apps/mobile test -- <relative-path>`
- Typecheck: `npm --prefix apps/mobile run typecheck`
- Commit after each task with the message shown.
- The migration runner ignores `duplicate column` errors, so `ALTER` steps are safe to re-run.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/mobile/package.json` | add `uuidv7`, `react-native-get-random-values` | Modify |
| `apps/mobile/src/shared/utils/generateId.ts` | return a UUIDv7 | Modify |
| `apps/mobile/index.ts` | import the crypto polyfill once | Modify |
| `apps/mobile/src/shared/utils/syncStamp.ts` | `nowIso()` + sync-column constants/types | Create |
| `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts` | add migration v16 + `ensureColumns` entries | Modify |
| `apps/mobile/src/test/db-setup.ts` | mirror v16 columns in the test schema | Modify |
| `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts` | stamp + soft-delete | Modify |
| `apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.ts` | stamp + soft-delete | Modify |
| `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts` | stamp + soft-delete + alternatives + `updateMedia` fix + resurrect | Modify |
| `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts` | stamp + soft-delete | Modify |
| `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts` | stamp + soft-delete | Modify |
| `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts` | stamp + soft-delete | Modify |
| `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts` | stamp + soft-delete | Modify |
| `apps/mobile/src/infrastructure/**/Sub0*.test.ts` | new SQLite integration tests | Create |
| `docs/estado-atual.md` | schema bumped to v16 | Modify |

**User-owned tables** (get the four sync columns): `exercises` (custom rows only matter), `treinos`, `treino_exercicios`, `sessao_treinos`, `sessao_exercicios`, `series_registradas`, `registros_peso`, `exercise_alternatives`, `settings`.

---

## Task 1: UUIDv7 ID generator

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/shared/utils/generateId.ts`
- Modify: `apps/mobile/index.ts`
- Test: `apps/mobile/src/shared/utils/generateId.test.ts` (create)

- [ ] **Step 1: Add dependencies**

Run:
```bash
npm --prefix apps/mobile install uuidv7 react-native-get-random-values
```
Expected: both appear under `dependencies` in `apps/mobile/package.json`.

- [ ] **Step 2: Write the failing test**

Create `apps/mobile/src/shared/utils/generateId.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { generateId } from './generateId';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateId', () => {
  it('returns a valid UUIDv7', () => {
    expect(generateId()).toMatch(UUID_V7);
  });

  it('is unique across many calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
    expect(ids.size).toBe(1000);
  });

  it('is time-ordered (monotonic): later ids sort after earlier ones', () => {
    const a = generateId();
    const b = generateId();
    expect(a < b || a === b ? true : false).toBe(true);
    expect([b, a].sort()).toEqual([a, b]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/shared/utils/generateId.test.ts`
Expected: FAIL — current `generateId` returns `id_...` which does not match the UUIDv7 regex.

- [ ] **Step 4: Rewrite the generator**

Replace the entire contents of `apps/mobile/src/shared/utils/generateId.ts`:
```ts
import { uuidv7 } from 'uuidv7';

/**
 * Globally-unique, time-ordered identifier (UUIDv7) for user-owned rows.
 * The optional `prefix` argument is accepted for backward compatibility with
 * existing call sites but is ignored — IDs are now opaque UUIDs.
 */
export function generateId(_prefix?: string): string {
  return uuidv7();
}
```

- [ ] **Step 5: Add the crypto polyfill at app entry**

In `apps/mobile/index.ts`, add as the very first line (before any other import):
```ts
import 'react-native-get-random-values';
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm --prefix apps/mobile test -- src/shared/utils/generateId.test.ts`
Expected: PASS.
Run: `npm --prefix apps/mobile run typecheck`
Expected: no errors (callers passing a prefix still compile — the param is optional and ignored).

- [ ] **Step 7: Commit**
```bash
git add apps/mobile/package.json apps/mobile/package-lock.json apps/mobile/src/shared/utils/generateId.ts apps/mobile/src/shared/utils/generateId.test.ts apps/mobile/index.ts
git commit -m "feat(sub0): UUIDv7 ids for new user rows"
```

---

## Task 2: Sync-stamp helper

**Files:**
- Create: `apps/mobile/src/shared/utils/syncStamp.ts`
- Test: `apps/mobile/src/shared/utils/syncStamp.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/shared/utils/syncStamp.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { nowIso } from './syncStamp';

describe('nowIso', () => {
  it('returns an ISO-8601 UTC string ending in Z', () => {
    const s = nowIso();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(s).toISOString()).toBe(s);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/shared/utils/syncStamp.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/mobile/src/shared/utils/syncStamp.ts`:
```ts
/** Canonical sync timestamp: ISO-8601 UTC, sorts lexicographically === chronologically. */
export function nowIso(): string {
  return new Date().toISOString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/mobile test -- src/shared/utils/syncStamp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/shared/utils/syncStamp.ts apps/mobile/src/shared/utils/syncStamp.test.ts
git commit -m "feat(sub0): nowIso sync-timestamp helper"
```

---

## Task 3: Migration v16 — sync columns (production + test schema)

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`
- Modify: `apps/mobile/src/test/db-setup.ts`
- Test: `apps/mobile/src/infrastructure/persistence/sqlite/Sub0Migration.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/persistence/sqlite/Sub0Migration.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/db-setup';

const SYNC_TABLES = [
  'exercises', 'treinos', 'treino_exercicios', 'sessao_treinos',
  'sessao_exercicios', 'series_registradas', 'registros_peso',
  'exercise_alternatives', 'settings',
];

describe('v16 sync columns', () => {
  it('adds updated_at, deleted_at, dirty, server_rev to every user-owned table', async () => {
    const db = createTestDatabase();
    for (const table of SYNC_TABLES) {
      const cols = await db.getAll<{ name: string }>(`PRAGMA table_info(${table})`);
      const names = new Set(cols.map((c) => c.name));
      expect(names, `${table}.updated_at`).toContain('updated_at');
      expect(names, `${table}.deleted_at`).toContain('deleted_at');
      expect(names, `${table}.dirty`).toContain('dirty');
      expect(names, `${table}.server_rev`).toContain('server_rev');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/infrastructure/persistence/sqlite/Sub0Migration.test.ts`
Expected: FAIL — `settings`/`exercise_alternatives` are missing from the test schema and none of the tables have the sync columns.

- [ ] **Step 3: Add migration v16 in the production migrations array**

In `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`, append a new entry at the **end** of the `migrations` array (after the current last v15 step). Insert before the closing `];`:
```ts
  ,
  // v16: sync metadata for cloud sync (sub-project 0).
  // updated_at = canonical ISO-8601 UTC; deleted_at = tombstone; dirty = unsynced flag; server_rev = server revision.
  `ALTER TABLE exercises          ADD COLUMN deleted_at TEXT;
   ALTER TABLE exercises          ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE exercises          ADD COLUMN server_rev INTEGER;
   ALTER TABLE treinos            ADD COLUMN deleted_at TEXT;
   ALTER TABLE treinos            ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE treinos            ADD COLUMN server_rev INTEGER;
   ALTER TABLE treino_exercicios  ADD COLUMN updated_at TEXT;
   ALTER TABLE treino_exercicios  ADD COLUMN deleted_at TEXT;
   ALTER TABLE treino_exercicios  ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE treino_exercicios  ADD COLUMN server_rev INTEGER;
   ALTER TABLE sessao_treinos     ADD COLUMN updated_at TEXT;
   ALTER TABLE sessao_treinos     ADD COLUMN deleted_at TEXT;
   ALTER TABLE sessao_treinos     ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE sessao_treinos     ADD COLUMN server_rev INTEGER;
   ALTER TABLE sessao_exercicios  ADD COLUMN updated_at TEXT;
   ALTER TABLE sessao_exercicios  ADD COLUMN deleted_at TEXT;
   ALTER TABLE sessao_exercicios  ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE sessao_exercicios  ADD COLUMN server_rev INTEGER;
   ALTER TABLE series_registradas ADD COLUMN updated_at TEXT;
   ALTER TABLE series_registradas ADD COLUMN deleted_at TEXT;
   ALTER TABLE series_registradas ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE series_registradas ADD COLUMN server_rev INTEGER;
   ALTER TABLE registros_peso     ADD COLUMN updated_at TEXT;
   ALTER TABLE registros_peso     ADD COLUMN deleted_at TEXT;
   ALTER TABLE registros_peso     ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE registros_peso     ADD COLUMN server_rev INTEGER;
   ALTER TABLE exercise_alternatives ADD COLUMN updated_at TEXT;
   ALTER TABLE exercise_alternatives ADD COLUMN deleted_at TEXT;
   ALTER TABLE exercise_alternatives ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE exercise_alternatives ADD COLUMN server_rev INTEGER;
   ALTER TABLE settings           ADD COLUMN updated_at TEXT;
   ALTER TABLE settings           ADD COLUMN deleted_at TEXT;
   ALTER TABLE settings           ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE settings           ADD COLUMN server_rev INTEGER;
   UPDATE treino_exercicios  SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;
   UPDATE sessao_treinos     SET updated_at = COALESCE(data_hora_inicio, '2024-01-01T00:00:00.000Z') WHERE updated_at IS NULL;
   UPDATE sessao_exercicios  SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;
   UPDATE series_registradas SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;
   UPDATE registros_peso     SET updated_at = COALESCE(data_registro, '2024-01-01T00:00:00.000Z') WHERE updated_at IS NULL;
   UPDATE exercise_alternatives SET updated_at = '2024-01-01T00:00:00.000Z' WHERE updated_at IS NULL;`
```
Note: `exercises` and `treinos` already have a text `updated_at`; we only add the three new columns there. The backfill `UPDATE`s only touch tables that just gained `updated_at`.

- [ ] **Step 4: Add the same columns to `ensureColumns` (defensive safety-net)**

In `ExpoSQLiteDatabaseClient.ts`, inside `ensureColumns`'s `required` array, append these entries before the closing `]`:
```ts
      { table: 'exercises',           column: 'deleted_at', type: 'TEXT'    },
      { table: 'exercises',           column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'exercises',           column: 'server_rev', type: 'INTEGER' },
      { table: 'treinos',             column: 'deleted_at', type: 'TEXT'    },
      { table: 'treinos',             column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'treinos',             column: 'server_rev', type: 'INTEGER' },
      { table: 'treino_exercicios',   column: 'updated_at', type: 'TEXT'    },
      { table: 'treino_exercicios',   column: 'deleted_at', type: 'TEXT'    },
      { table: 'treino_exercicios',   column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'treino_exercicios',   column: 'server_rev', type: 'INTEGER' },
      { table: 'sessao_treinos',      column: 'updated_at', type: 'TEXT'    },
      { table: 'sessao_treinos',      column: 'deleted_at', type: 'TEXT'    },
      { table: 'sessao_treinos',      column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'sessao_treinos',      column: 'server_rev', type: 'INTEGER' },
      { table: 'sessao_exercicios',   column: 'updated_at', type: 'TEXT'    },
      { table: 'sessao_exercicios',   column: 'deleted_at', type: 'TEXT'    },
      { table: 'sessao_exercicios',   column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'sessao_exercicios',   column: 'server_rev', type: 'INTEGER' },
      { table: 'series_registradas',  column: 'updated_at', type: 'TEXT'    },
      { table: 'series_registradas',  column: 'deleted_at', type: 'TEXT'    },
      { table: 'series_registradas',  column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'series_registradas',  column: 'server_rev', type: 'INTEGER' },
      { table: 'registros_peso',      column: 'updated_at', type: 'TEXT'    },
      { table: 'registros_peso',      column: 'deleted_at', type: 'TEXT'    },
      { table: 'registros_peso',      column: 'dirty',      type: 'INTEGER', defaultValue: '1' },
      { table: 'registros_peso',      column: 'server_rev', type: 'INTEGER' },
```
(`exercise_alternatives` and `settings` are not in `ensureColumns` today; the v16 migration is sufficient for them.)

- [ ] **Step 5: Mirror the columns in the test schema**

In `apps/mobile/src/test/db-setup.ts`, the test database has its own condensed migration list and is missing `settings` and `exercise_alternatives`. Append a final entry to the `migrations` array (before the closing `];`):
```ts
    ,
    // sub-project 0: create missing tables + sync metadata columns
    `CREATE TABLE IF NOT EXISTS exercise_alternatives (
       exercicio_id   TEXT NOT NULL,
       alternativa_id TEXT NOT NULL,
       PRIMARY KEY (exercicio_id, alternativa_id)
     );
     CREATE TABLE IF NOT EXISTS settings (
       key TEXT PRIMARY KEY NOT NULL,
       value TEXT NOT NULL
     );
     ALTER TABLE exercises          ADD COLUMN deleted_at TEXT;
     ALTER TABLE exercises          ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE exercises          ADD COLUMN server_rev INTEGER;
     ALTER TABLE treinos            ADD COLUMN deleted_at TEXT;
     ALTER TABLE treinos            ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE treinos            ADD COLUMN server_rev INTEGER;
     ALTER TABLE treino_exercicios  ADD COLUMN updated_at TEXT;
     ALTER TABLE treino_exercicios  ADD COLUMN deleted_at TEXT;
     ALTER TABLE treino_exercicios  ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE treino_exercicios  ADD COLUMN server_rev INTEGER;
     ALTER TABLE sessao_treinos     ADD COLUMN updated_at TEXT;
     ALTER TABLE sessao_treinos     ADD COLUMN deleted_at TEXT;
     ALTER TABLE sessao_treinos     ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE sessao_treinos     ADD COLUMN server_rev INTEGER;
     ALTER TABLE sessao_exercicios  ADD COLUMN updated_at TEXT;
     ALTER TABLE sessao_exercicios  ADD COLUMN deleted_at TEXT;
     ALTER TABLE sessao_exercicios  ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE sessao_exercicios  ADD COLUMN server_rev INTEGER;
     ALTER TABLE series_registradas ADD COLUMN updated_at TEXT;
     ALTER TABLE series_registradas ADD COLUMN deleted_at TEXT;
     ALTER TABLE series_registradas ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE series_registradas ADD COLUMN server_rev INTEGER;
     ALTER TABLE registros_peso     ADD COLUMN updated_at TEXT;
     ALTER TABLE registros_peso     ADD COLUMN deleted_at TEXT;
     ALTER TABLE registros_peso     ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE registros_peso     ADD COLUMN server_rev INTEGER;
     ALTER TABLE exercise_alternatives ADD COLUMN updated_at TEXT;
     ALTER TABLE exercise_alternatives ADD COLUMN deleted_at TEXT;
     ALTER TABLE exercise_alternatives ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE exercise_alternatives ADD COLUMN server_rev INTEGER;
     ALTER TABLE settings           ADD COLUMN updated_at TEXT;
     ALTER TABLE settings           ADD COLUMN deleted_at TEXT;
     ALTER TABLE settings           ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;
     ALTER TABLE settings           ADD COLUMN server_rev INTEGER;`
```
The existing `try/catch` in `db-setup.ts` already swallows `duplicate` errors, so multi-statement `ALTER`s that partially overlap remain safe.

- [ ] **Step 6: Run the migration test + full suite**

Run: `npm --prefix apps/mobile test -- src/infrastructure/persistence/sqlite/Sub0Migration.test.ts`
Expected: PASS.
Run: `npm --prefix apps/mobile test`
Expected: all previously-passing tests still pass (218 + new).

- [ ] **Step 7: Commit**
```bash
git add apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts apps/mobile/src/test/db-setup.ts apps/mobile/src/infrastructure/persistence/sqlite/Sub0Migration.test.ts
git commit -m "feat(sub0): migration v16 adds sync metadata columns"
```

---

## Task 4: Soft-delete + stamping — `SQLiteTreinoRepository`

**Files:**
- Modify: `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts`
- Test: `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.sub0.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.sub0.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoRepository } from './SQLiteTreinoRepository';
import { Treino } from '../../domain/treinos/entities/Treino';

let db: SQLiteDatabaseClient;
let repo: SQLiteTreinoRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteTreinoRepository(db);
});

function makeTreino(id: string, name: string): Treino {
  return Treino.create({ id, name, createdAt: new Date('2026-01-01T00:00:00.000Z') });
}

describe('SQLiteTreinoRepository soft-delete', () => {
  it('stamps dirty=1 and updated_at on save', async () => {
    await repo.save(makeTreino('t1', 'Treino A'));
    const row = await db.getFirst<{ dirty: number; updated_at: string }>(
      'SELECT dirty, updated_at FROM treinos WHERE id = ?', ['t1']
    );
    expect(row?.dirty).toBe(1);
    expect(row?.updated_at).toMatch(/Z$/);
  });

  it('delete tombstones the row instead of removing it', async () => {
    await repo.save(makeTreino('t1', 'Treino A'));
    await repo.delete('t1');

    expect(await repo.findById('t1')).toBeNull();
    expect(await repo.list()).toHaveLength(0);

    const row = await db.getFirst<{ deleted_at: string | null; dirty: number }>(
      'SELECT deleted_at, dirty FROM treinos WHERE id = ?', ['t1']
    );
    expect(row?.deleted_at).toMatch(/Z$/);
    expect(row?.dirty).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/infrastructure/treinos/SQLiteTreinoRepository.sub0.test.ts`
Expected: FAIL — `delete` still hard-deletes (row missing, `deleted_at` assertion fails) and `save` does not set `dirty`.

- [ ] **Step 3: Implement soft-delete + stamping**

Edit `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts`. Add the import and replace `save`, `list`, `findById`, `delete`:
```ts
import { nowIso } from '../../shared/utils/syncStamp';
```
```ts
  async save(treino: Treino): Promise<void> {
    const p = treino.toPrimitives();

    await this.database.run(
      `
        INSERT OR REPLACE INTO treinos (id, name, objetivo, created_at, updated_at, deleted_at, dirty)
        VALUES (?, ?, ?, ?, ?, NULL, 1)
      `,
      [p.id, p.name, p.objetivo, p.createdAt, p.updatedAt]
    );
  }

  async list(): Promise<Treino[]> {
    const rows = await this.database.getAll<TreinoRow>(
      'SELECT id, name, objetivo, created_at, updated_at FROM treinos WHERE deleted_at IS NULL ORDER BY name ASC'
    );

    return rows.map((row) => Treino.restore(mapRowToPrimitives(row)));
  }

  async findById(id: string): Promise<Treino | null> {
    const row = await this.database.getFirst<TreinoRow>(
      'SELECT id, name, objetivo, created_at, updated_at FROM treinos WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );

    return row ? Treino.restore(mapRowToPrimitives(row)) : null;
  }

  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }
```
Note: `save` passes `p.updatedAt` (entity's ISO value) and forces `deleted_at = NULL` so re-saving a previously-tombstoned id resurrects it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/mobile test -- src/infrastructure/treinos/SQLiteTreinoRepository.sub0.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.sub0.test.ts
git commit -m "feat(sub0): soft-delete + stamping in SQLiteTreinoRepository"
```

---

## Task 5: Soft-delete + stamping — `SQLiteTreinoExercicioRepository`

**Files:**
- Modify: `apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.ts`
- Test: `apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.sub0.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.sub0.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteTreinoExercicioRepository } from './SQLiteTreinoExercicioRepository';
import { TreinoExercicio } from '../../domain/treinos/entities/TreinoExercicio';

let db: SQLiteDatabaseClient;
let repo: SQLiteTreinoExercicioRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteTreinoExercicioRepository(db);
});

function make(id: string, treinoId: string, exId: string): TreinoExercicio {
  return TreinoExercicio.restore({
    id, treinoId, exercicioId: exId, ordem: 0,
    seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
    tempoDescansoSegundos: null, metodo: 'normal', grupoId: null,
  });
}

describe('SQLiteTreinoExercicioRepository soft-delete', () => {
  it('hides tombstoned rows from listByTreinoId', async () => {
    await repo.save(make('te1', 'tr1', 'ex1'));
    await repo.save(make('te2', 'tr1', 'ex2'));
    await repo.deleteByTreinoId('tr1');
    expect(await repo.listByTreinoId('tr1')).toHaveLength(0);
    expect(await repo.countByTreinoId('tr1')).toBe(0);
  });

  it('delete tombstones a single row', async () => {
    await repo.save(make('te1', 'tr1', 'ex1'));
    await repo.delete('te1');
    expect(await repo.findById('te1')).toBeNull();
    const row = await db.getFirst<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM treino_exercicios WHERE id = ?', ['te1']
    );
    expect(row?.deleted_at).toMatch(/Z$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/infrastructure/treinos/SQLiteTreinoExercicioRepository.sub0.test.ts`
Expected: FAIL — hard delete + no `deleted_at` filter.

- [ ] **Step 3: Implement**

Edit `apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.ts`. Add `import { nowIso } from '../../shared/utils/syncStamp';`. Then:

In `save`, change the column list and values to include sync columns:
```ts
    await this.database.run(
      `INSERT OR REPLACE INTO treino_exercicios (id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.treinoId, p.exercicioId, p.ordem, p.seriesRecomendadas ?? null, p.execucoesRecomendadas ?? null, p.cargaPadrao ?? null, p.tempoDescansoSegundos ?? null, p.metodo, p.grupoId ?? null, nowIso()]
    );
```

Add `AND deleted_at IS NULL` to the WHERE clause of every read — `listByTreinoId`, `findById`, `findByTreinoIdAndExercicioId`, `countByTreinoId`, and the `countAllByTreino` query (add a `WHERE deleted_at IS NULL` before `GROUP BY`):
```ts
      'SELECT treino_id, COUNT(*) as count FROM treino_exercicios WHERE deleted_at IS NULL GROUP BY treino_id',
```

For the three `update*` methods, also bump the stamp — append `, updated_at = ?, dirty = 1` and a `nowIso()` param. Example for `updateOrdem`:
```ts
  async updateOrdem(id: string, ordem: number): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET ordem = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [ordem, nowIso(), id]
    );
  }
```
Apply the same `, updated_at = ?, dirty = 1` addition (with a `nowIso()` argument inserted before `id`) to `updateRecomendacoes` and `updateMetodoGrupo`.

Convert the three delete methods to tombstones:
```ts
  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE treino_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), treinoId]
    );
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    await this.database.run(
      'UPDATE treino_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE exercicio_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), exercicioId]
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/mobile test -- src/infrastructure/treinos/SQLiteTreinoExercicioRepository.sub0.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full suite (catches read-path regressions)**

Run: `npm --prefix apps/mobile test`
Expected: all pass. If a treino-related test now sees a row it expects gone (or vice-versa), a read query is missing the `deleted_at IS NULL` filter — fix it.

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.ts apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.sub0.test.ts
git commit -m "feat(sub0): soft-delete + stamping in SQLiteTreinoExercicioRepository"
```

---

## Task 6: Soft-delete + stamping + resurrect — `SQLiteExerciseRepository`

**Files:**
- Modify: `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`
- Test: `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.sub0.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.sub0.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteExerciseRepository } from './SQLiteExerciseRepository';
import { Exercise } from '../../domain/exercises/entities/Exercise';

let db: SQLiteDatabaseClient;
let repo: SQLiteExerciseRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteExerciseRepository(db);
});

function make(id: string, name: string): Exercise {
  return Exercise.create({ id, name, groupMuscle: 'Peito', createdAt: new Date('2026-01-01T00:00:00.000Z'), isCustom: true });
}

describe('SQLiteExerciseRepository soft-delete', () => {
  it('hides tombstoned exercises from list and findByNormalizedName', async () => {
    await repo.save(make('e1', 'Meu Exercicio'));
    await repo.delete('e1');
    expect(await repo.findById('e1')).toBeNull();
    expect(await repo.findByNormalizedName('meu exercicio')).toBeNull();
    expect((await repo.list()).some((e) => e.toPrimitives().id === 'e1')).toBe(false);
  });

  it('resurrects a tombstoned row when the same id is saved again', async () => {
    await repo.save(make('e1', 'Meu Exercicio'));
    await repo.delete('e1');
    await repo.save(make('e1', 'Meu Exercicio'));
    const found = await repo.findByNormalizedName('meu exercicio');
    expect(found?.toPrimitives().id).toBe('e1');
  });

  it('updateMedia writes an ISO-Z timestamp', async () => {
    await repo.save(make('e1', 'Meu Exercicio'));
    await repo.updateMedia('e1', 'https://x/y.gif', null);
    const row = await db.getFirst<{ updated_at: string; dirty: number }>(
      'SELECT updated_at, dirty FROM exercises WHERE id = ?', ['e1']
    );
    expect(row?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(row?.dirty).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/infrastructure/exercises/SQLiteExerciseRepository.sub0.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Edit `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`. Add `import { nowIso } from '../../shared/utils/syncStamp';`.

`save` — add sync columns (forcing `deleted_at = NULL` so saving the same id resurrects):
```ts
    await this.database.run(
      `INSERT OR REPLACE INTO exercises (
         id, name, normalized_name, group_muscle, category, equipment,
         load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo,
         deleted_at, dirty
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [
        currentExercise.id,
        currentExercise.name,
        currentExercise.normalizedName,
        currentExercise.groupMuscle,
        currentExercise.category,
        currentExercise.equipment,
        currentExercise.loadUnit,
        currentExercise.isCustom ? 1 : 0,
        currentExercise.createdAt,
        currentExercise.updatedAt,
        currentExercise.mediaOnline,
        currentExercise.mediaLocal,
        currentExercise.musculoAlvo,
      ]
    );
```

Add `AND deleted_at IS NULL` (or `WHERE deleted_at IS NULL`) to every read query: `list` (both the `SELECT` constant — append before `ORDER BY`: `WHERE deleted_at IS NULL`), `findById`, `findByIds` (append `AND deleted_at IS NULL` after the `IN (...)`), `findByNormalizedName`, and `listAlternativas` (add `AND e.deleted_at IS NULL`). For `list`, the constant becomes:
```ts
    const SELECT = `SELECT id, name, normalized_name, group_muscle, category, equipment,
              load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo
       FROM exercises WHERE deleted_at IS NULL ORDER BY normalized_name ASC`;
```
For `findByIds`:
```ts
      `SELECT id, name, normalized_name, group_muscle, category, equipment,
              load_unit, is_custom, created_at, updated_at, media_online, media_local, musculo_alvo
       FROM exercises WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
```

`delete` → tombstone:
```ts
  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE exercises SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }
```

`updateMedia` — replace `datetime('now')` with a bound ISO value and stamp dirty:
```ts
  async updateMedia(id: string, mediaOnline: string | null, mediaLocal: string | null): Promise<void> {
    await this.database.run(
      'UPDATE exercises SET media_online = ?, media_local = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [mediaOnline, mediaLocal, nowIso(), id]
    );
  }
```

`addAlternativa` / `removeAlternativa` — stamp the join rows. `addAlternativa` resurrects/stamps:
```ts
  async addAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    await this.database.run(
      `INSERT INTO exercise_alternatives (exercicio_id, alternativa_id, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, NULL, 1)
       ON CONFLICT(exercicio_id, alternativa_id)
       DO UPDATE SET updated_at = excluded.updated_at, deleted_at = NULL, dirty = 1`,
      [exercicioId, alternativaId, nowIso()]
    );
  }

  async removeAlternativa(exercicioId: string, alternativaId: string): Promise<void> {
    await this.database.run(
      'UPDATE exercise_alternatives SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE exercicio_id = ? AND alternativa_id = ?',
      [nowIso(), nowIso(), exercicioId, alternativaId]
    );
  }
```
And add `AND ea.deleted_at IS NULL` to the `listAlternativas` JOIN's WHERE.

> Resurrect-on-unique-name note: because `save` forces `deleted_at = NULL` and uses `INSERT OR REPLACE` on the primary key, re-saving the **same id** resurrects. The use-case layer looks up an existing exercise by normalized name before creating; when it finds the tombstoned row it will re-save under that same id, so the unique `normalized_name` slot is reused rather than duplicated. No extra code needed here beyond the `deleted_at = NULL` on save and the `findByNormalizedName` returning only live rows. (Verify the create-exercise use case calls `findByNormalizedName` and reuses the returned id; if it generates a fresh id instead, add a resurrect branch there in a follow-up — out of scope for this task, note it.)

- [ ] **Step 4: Run test + full suite**

Run: `npm --prefix apps/mobile test -- src/infrastructure/exercises/SQLiteExerciseRepository.sub0.test.ts`
Expected: PASS.
Run: `npm --prefix apps/mobile test`
Expected: all pass (watch the existing `SQLiteExerciseRepository.test.ts` and pagination test — they must still pass; fix any read missing the filter).

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.sub0.test.ts
git commit -m "feat(sub0): soft-delete + stamping + media-ts fix in SQLiteExerciseRepository"
```

---

## Task 7: Soft-delete + stamping — `SQLiteSessaoTreinoRepository`

**Files:**
- Modify: `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts`
- Test: `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.sub0.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.sub0.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSessaoTreinoRepository } from './SQLiteSessaoTreinoRepository';
import { SessaoTreino } from '../../domain/sessoes/entities/SessaoTreino';

let db: SQLiteDatabaseClient;
let repo: SQLiteSessaoTreinoRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteSessaoTreinoRepository(db);
});

function make(id: string): SessaoTreino {
  return SessaoTreino.restore({
    id, treinoId: 'tr1', treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: '2026-01-01T10:00:00.000Z', dataHoraFim: null, status: 'em_andamento',
  });
}

describe('SQLiteSessaoTreinoRepository soft-delete', () => {
  it('delete tombstones and findById/findAtiva hide it', async () => {
    await repo.save(make('s1'));
    await repo.delete('s1');
    expect(await repo.findById('s1')).toBeNull();
    expect(await repo.findAtiva()).toBeNull();
    const row = await db.getFirst<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM sessao_treinos WHERE id = ?', ['s1']
    );
    expect(row?.deleted_at).toMatch(/Z$/);
  });

  it('deleteByTreinoId tombstones matching sessions', async () => {
    await repo.save(make('s1'));
    await repo.deleteByTreinoId('tr1');
    expect(await repo.findById('s1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.sub0.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Edit `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts`. Add `import { nowIso } from '../../shared/utils/syncStamp';`.

`save` — add sync columns:
```ts
    await this.database.run(
      `INSERT OR REPLACE INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.treinoId, p.treinoNomeSnapshot, p.dataHoraInicio, p.dataHoraFim, p.status, nowIso()]
    );
```
Add `AND deleted_at IS NULL` to `findById`, and `AND deleted_at IS NULL` to the `findAtiva` query (`... WHERE status = 'em_andamento' AND deleted_at IS NULL LIMIT 1`).

Convert deletes:
```ts
  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE sessao_treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async deleteByTreinoId(treinoId: string): Promise<void> {
    await this.database.run(
      'UPDATE sessao_treinos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE treino_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), treinoId]
    );
  }
```

> Note: `SqliteDashboardRepository` and `SQLiteHistoricoRepository` also read `sessao_treinos`/`sessao_exercicios`/`series_registradas`. Step 5 runs the full suite to catch any of those reads that now need `deleted_at IS NULL`. Add the filter wherever the suite reveals a tombstone leaking into stats/history. (Their reads already exclude cancelled/archived sessions; tombstoned rows should be excluded the same way.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/mobile test -- src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.sub0.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.sub0.test.ts
git commit -m "feat(sub0): soft-delete + stamping in SQLiteSessaoTreinoRepository"
```

---

## Task 8: Soft-delete + stamping — `SQLiteSessaoExercicioRepository`

**Files:**
- Modify: `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts`
- Test: `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.sub0.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.sub0.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSessaoExercicioRepository } from './SQLiteSessaoExercicioRepository';
import { SessaoExercicio } from '../../domain/sessoes/entities/SessaoExercicio';

let db: SQLiteDatabaseClient;
let repo: SQLiteSessaoExercicioRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteSessaoExercicioRepository(db);
});

function make(id: string, sessaoId: string, exId: string): SessaoExercicio {
  return SessaoExercicio.restore({
    id, sessaoTreinoId: sessaoId, exercicioId: exId, ordem: 0,
    nomeSnapshot: 'X', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto',
    equipamentoSnapshot: null, musculoAlvoSnapshot: null, realizado: false,
    seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
    tempoDescansoSegundos: null, metodo: 'normal', grupoId: null,
    substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null,
  });
}

describe('SQLiteSessaoExercicioRepository soft-delete', () => {
  it('deleteBySessaoId tombstones; reads hide them', async () => {
    await repo.save(make('se1', 's1', 'e1'));
    await repo.save(make('se2', 's1', 'e2'));
    await repo.deleteBySessaoId('s1');
    expect(await repo.listBySessaoId('s1')).toHaveLength(0);
    expect(await repo.countBySessaoId('s1')).toBe(0);
    expect(await repo.findById('se1')).toBeNull();
  });

  it('deleteByExercicioId tombstones matching rows', async () => {
    await repo.save(make('se1', 's1', 'e1'));
    await repo.deleteByExercicioId('e1');
    expect(await repo.findBySessaoIdAndExercicioId('s1', 'e1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.sub0.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Edit `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts`. Add `import { nowIso } from '../../shared/utils/syncStamp';`.

`save` — extend the column list with `updated_at, deleted_at, dirty` (append `, updated_at, deleted_at, dirty` to the column names, `, ?, NULL, 1` to the VALUES placeholders, and `, nowIso()` to the params array end):
```ts
      `INSERT OR REPLACE INTO sessao_exercicios
        (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos, metodo, grupo_id, substituido_por_exercicio_id, substituicao_motivo, nome_original_snapshot, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.sessaoTreinoId, p.exercicioId, p.ordem, p.nomeSnapshot, p.grupoMuscularSnapshot, p.categoriaSnapshot, p.equipamentoSnapshot, p.musculoAlvoSnapshot ?? null, p.realizado ? 1 : 0, p.seriesRecomendadas ?? null, p.execucoesRecomendadas ?? null, p.cargaPadrao ?? null, p.tempoDescansoSegundos ?? null, p.metodo, p.grupoId ?? null, p.substituidoPorExercicioId ?? null, p.substituicaoMotivo ?? null, p.nomeOriginalSnapshot ?? null, nowIso()]
```

Add `AND deleted_at IS NULL` to every read: `findById`, `findBySessaoIdAndExercicioId`, `listBySessaoId`, and `countBySessaoId`.

Convert the two delete methods to tombstones:
```ts
  async deleteBySessaoId(sessaoId: string): Promise<void> {
    await this.database.run(
      'UPDATE sessao_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE sessao_treino_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), sessaoId]
    );
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    await this.database.run(
      'UPDATE sessao_exercicios SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE exercicio_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), exercicioId]
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/mobile test -- src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.sub0.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.sub0.test.ts
git commit -m "feat(sub0): soft-delete + stamping in SQLiteSessaoExercicioRepository"
```

---

## Task 9: Soft-delete + stamping — `SQLiteSerieRegistradaRepository`

**Files:**
- Modify: `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`
- Test: `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.sub0.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.sub0.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteSerieRegistradaRepository } from './SQLiteSerieRegistradaRepository';
import { SerieRegistrada } from '../../domain/sessoes/entities/SerieRegistrada';

let db: SQLiteDatabaseClient;
let repo: SQLiteSerieRegistradaRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteSerieRegistradaRepository(db);
});

function make(id: string, seId: string): SerieRegistrada {
  return SerieRegistrada.restore({
    id, sessaoExercicioId: seId, ordem: 0, cargaKg: 50, repeticoes: 10,
    observacao: null, tipoSerie: 'valida',
  });
}

describe('SQLiteSerieRegistradaRepository soft-delete', () => {
  it('delete tombstones; reads hide it', async () => {
    await repo.save(make('sr1', 'se1'));
    await repo.delete('sr1');
    expect(await repo.findById('sr1')).toBeNull();
    expect(await repo.listBySessaoExercicioId('se1')).toHaveLength(0);
    expect(await repo.countBySessaoExercicioId('se1')).toBe(0);
  });

  it('deleteBySessaoExercicioId and update stamp dirty', async () => {
    await repo.save(make('sr1', 'se1'));
    await repo.update('sr1', { cargaKg: 60, repeticoes: 8 });
    const row = await db.getFirst<{ dirty: number; updated_at: string }>(
      'SELECT dirty, updated_at FROM series_registradas WHERE id = ?', ['sr1']
    );
    expect(row?.dirty).toBe(1);
    expect(row?.updated_at).toMatch(/Z$/);

    await repo.deleteBySessaoExercicioId('se1');
    expect(await repo.listBySessaoExercicioId('se1')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.sub0.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Edit `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`. Add `import { nowIso } from '../../shared/utils/syncStamp';`.

`save`:
```ts
    await this.database.run(
      `INSERT OR REPLACE INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.sessaoExercicioId, p.tipoSerie, p.ordem, p.cargaKg, p.repeticoes, p.observacao, nowIso()]
    );
```

Add `AND deleted_at IS NULL` to reads: `findById`, `listBySessaoExercicioId`, `listBySessaoExercicioIds` (after the `IN (...)`), `countBySessaoExercicioId`.

`update` — stamp:
```ts
  async update(id: string, patch: { cargaKg: number; repeticoes: number; observacao?: string | null }): Promise<void> {
    await this.database.run(
      `UPDATE series_registradas SET carga_kg = ?, repeticoes = ?, observacao = ?, updated_at = ?, dirty = 1 WHERE id = ?`,
      [patch.cargaKg, patch.repeticoes, patch.observacao ?? null, nowIso(), id]
    );
  }
```

Convert all four delete methods to tombstones:
```ts
  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }

  async deleteBySessaoExercicioId(sessaoExercicioId: string): Promise<void> {
    await this.database.run(
      'UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE sessao_exercicio_id = ? AND deleted_at IS NULL',
      [nowIso(), nowIso(), sessaoExercicioId]
    );
  }

  async deleteBySessaoExercicioIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await this.database.run(
      `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE sessao_exercicio_id IN (${placeholders}) AND deleted_at IS NULL`,
      [nowIso(), nowIso(), ...ids]
    );
  }

  async deleteByExercicioId(exercicioId: string): Promise<void> {
    await this.database.run(
      `UPDATE series_registradas SET deleted_at = ?, updated_at = ?, dirty = 1
       WHERE sessao_exercicio_id IN (
         SELECT id FROM sessao_exercicios WHERE exercicio_id = ?
       ) AND deleted_at IS NULL`,
      [nowIso(), nowIso(), exercicioId]
    );
  }
```

- [ ] **Step 4: Run test + full suite**

Run: `npm --prefix apps/mobile test -- src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.sub0.test.ts`
Expected: PASS.
Run: `npm --prefix apps/mobile test`
Expected: all pass — pay attention to `SQLiteHistoricoRepository.*.test.ts` (it aggregates `series_registradas`); add `deleted_at IS NULL` to its reads if a tombstone leaks into history.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.sub0.test.ts
git commit -m "feat(sub0): soft-delete + stamping in SQLiteSerieRegistradaRepository"
```

---

## Task 10: Soft-delete + stamping — `SQLiteRegistroPesoRepository`

**Files:**
- Modify: `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts`
- Test: `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.sub0.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.sub0.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteRegistroPesoRepository } from './SQLiteRegistroPesoRepository';
import { RegistroPeso } from '../../domain/peso/entities/RegistroPeso';

let db: SQLiteDatabaseClient;
let repo: SQLiteRegistroPesoRepository;

beforeEach(() => {
  db = createTestDatabase();
  repo = new SQLiteRegistroPesoRepository(db);
});

function make(id: string): RegistroPeso {
  return RegistroPeso.restore({ id, pesoKg: 80, dataRegistro: '2026-01-01T08:00:00.000Z', observacao: null });
}

describe('SQLiteRegistroPesoRepository soft-delete', () => {
  it('delete tombstones; list/findById hide it; save stamps dirty', async () => {
    await repo.save(make('p1'));
    const saved = await db.getFirst<{ dirty: number }>('SELECT dirty FROM registros_peso WHERE id = ?', ['p1']);
    expect(saved?.dirty).toBe(1);

    await repo.delete('p1');
    expect(await repo.findById('p1')).toBeNull();
    expect(await repo.list()).toHaveLength(0);
    const row = await db.getFirst<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM registros_peso WHERE id = ?', ['p1']
    );
    expect(row?.deleted_at).toMatch(/Z$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/mobile test -- src/infrastructure/peso/SQLiteRegistroPesoRepository.sub0.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Edit `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts`. Add `import { nowIso } from '../../shared/utils/syncStamp';`.

`save`:
```ts
  async save(registro: RegistroPeso): Promise<void> {
    const p = registro.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO registros_peso (id, peso_kg, data_registro, observacao, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, NULL, 1)`,
      [p.id, p.pesoKg, p.dataRegistro, p.observacao, nowIso()]
    );
  }
```
`list` — `SELECT * FROM registros_peso WHERE deleted_at IS NULL ORDER BY data_registro DESC`.
`findById` — add `AND deleted_at IS NULL`.
`delete`:
```ts
  async delete(id: string): Promise<void> {
    await this.database.run(
      'UPDATE registros_peso SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [nowIso(), nowIso(), id]
    );
  }
```
> `list` uses `SELECT *`, which now returns the extra sync columns. `mapRow` only reads the four domain fields, so the extra columns are ignored — no mapping change needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/mobile test -- src/infrastructure/peso/SQLiteRegistroPesoRepository.sub0.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.sub0.test.ts
git commit -m "feat(sub0): soft-delete + stamping in SQLiteRegistroPesoRepository"
```

---

## Task 11: Audit aggregate-read repositories for tombstone leaks

**Files:**
- Modify (as needed): `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts`
- Modify (as needed): `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`
- Modify (as needed): `apps/mobile/src/infrastructure/plano/SQLitePlanoSemanalRepository.ts`

- [ ] **Step 1: Find every read of a user-owned table in aggregate repos**

Run: `npm --prefix apps/mobile test` and note any failure. Then grep for raw table reads:
Use Grep for `FROM sessao_treinos`, `FROM sessao_exercicios`, `FROM series_registradas`, `FROM treinos`, `FROM treino_exercicios`, `FROM registros_peso`, `FROM exercises` across `src/infrastructure/dashboard`, `src/infrastructure/historico`, `src/infrastructure/plano`.

- [ ] **Step 2: Add `deleted_at IS NULL` to each such read**

For every `SELECT ... FROM <user-owned table>` found, add `AND deleted_at IS NULL` (or `WHERE deleted_at IS NULL` if no WHERE exists) for that table, qualified with the table alias where joins are involved (e.g. `st.deleted_at IS NULL`, `se.deleted_at IS NULL`, `sr.deleted_at IS NULL`). Do not filter the global catalog reads differently — `exercises` reads should also exclude `deleted_at IS NULL` (a soft-deleted custom exercise must vanish from stats too).

- [ ] **Step 3: Write a regression test proving tombstones are excluded from history**

Create `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.sub0.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../test/db-setup';
import type { SQLiteDatabaseClient } from '../persistence/sqlite/SQLiteDatabaseClient';
import { SQLiteHistoricoRepository } from './SQLiteHistoricoRepository';

let db: SQLiteDatabaseClient;

beforeEach(() => {
  db = createTestDatabase();
});

describe('SQLiteHistoricoRepository ignores tombstones', () => {
  it('excludes soft-deleted series from history aggregation', async () => {
    // seed one finalized session + exercise + a live series and a tombstoned series
    await db.run("INSERT INTO exercises (id, name, normalized_name, group_muscle, category, load_unit, is_custom, created_at, updated_at, dirty) VALUES ('e1','Supino','supino','Peito','Composto','kg',1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z',1)");
    await db.run("INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status, updated_at, dirty) VALUES ('s1','tr1','A','2026-01-02T10:00:00.000Z','2026-01-02T11:00:00.000Z','finalizada','2026-01-02T11:00:00.000Z',1)");
    await db.run("INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, realizado, metodo, updated_at, dirty) VALUES ('se1','s1','e1',0,'Supino','Peito','Composto',1,'normal','2026-01-02T10:00:00.000Z',1)");
    await db.run("INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, dirty) VALUES ('sr1','se1','valida',0,100,10,'2026-01-02T10:10:00.000Z',1)");
    await db.run("INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, updated_at, deleted_at, dirty) VALUES ('sr2','se1','valida',1,999,10,'2026-01-02T10:11:00.000Z','2026-01-02T10:12:00.000Z',1)");

    const repo = new SQLiteHistoricoRepository(db);
    const historico = await repo.getHistoricoExercicio('e1');
    // the 999kg tombstoned series must not appear in any execution
    const allCargas = historico.flatMap((h) => h.series?.map((s) => s.cargaKg) ?? []);
    expect(allCargas).not.toContain(999);
  });
});
```
Adjust the method name/return shape to match the actual `SQLiteHistoricoRepository` API discovered in Step 1 (e.g. `getHistoricoExercicio` and its view-model fields). The invariant under test — `999` never appears — is what matters.

- [ ] **Step 4: Run the full suite**

Run: `npm --prefix apps/mobile test`
Expected: all pass, including the new regression test.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/infrastructure/dashboard apps/mobile/src/infrastructure/historico apps/mobile/src/infrastructure/plano
git commit -m "fix(sub0): exclude tombstoned rows from dashboard/historico/plano reads"
```

---

## Task 12: Bump documented schema version

**Files:**
- Modify: `docs/estado-atual.md`

- [ ] **Step 1: Update the schema version references**

In `docs/estado-atual.md`: change "schema v15" → "schema v16" in the Stack table, change the heading "## Schema SQLite (v15)" → "## Schema SQLite (v16)", and add a line under the schema block:
```markdown
v16 adiciona colunas de sincronização (`updated_at` ISO, `deleted_at` tombstone, `dirty`, `server_rev`) em todas as tabelas de dados do usuário; deletes passam a ser soft-deletes. Catálogo global (seeds/GIFs) não sincroniza.
```
Also update the test count note if the suite total changed.

- [ ] **Step 2: Run typecheck + full suite one final time**

Run: `npm --prefix apps/mobile run typecheck`
Expected: no errors.
Run: `npm --prefix apps/mobile test`
Expected: all pass.

- [ ] **Step 3: Commit**
```bash
git add docs/estado-atual.md
git commit -m "docs(sub0): bump schema to v16 with sync metadata"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** Component 1 (UUIDv7) → Task 1; Component 2 (v16 columns, ISO `updated_at`, `updateMedia` fix) → Tasks 3 + 6; Component 3 (soft delete, cascades, reads filtered, resurrect) → Tasks 4–11; Component 4 (write stamping) → every repo task. Decision "InMemory doubles untouched" → honored (no double tasks). ✓
- **Placeholder scan:** every code step shows real code/SQL; the two "discover the exact API" notes (Task 6 resurrect-branch verification, Task 11 history method name) are explicit verification instructions, not deferred work. ✓
- **Type consistency:** `nowIso()` signature used identically across all repos; entity primitive types unchanged (ISO strings); sync columns named identically (`updated_at`, `deleted_at`, `dirty`, `server_rev`) in migration, ensureColumns, db-setup, and every repo. ✓
