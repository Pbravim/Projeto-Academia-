# Sub-project 0 — Foundations / Migration Prep — Design

> Created 2026-06-04. Part of the [cloud backend platform](2026-06-04-cloud-backend-platform-design.md).
> Status: **awaiting user review before implementation plan.**

## Purpose

Prepare the existing local app for cloud sync **without adding a backend**. After this sub-project the app is still 100% local and fully shippable — but every user-owned row has globally-unique IDs and sync metadata, and deletes are soft. This de-risks sub-projects 1–2 by getting the invasive local-schema changes done while the app is still simple to reason about.

## Scope boundaries

**In scope:** UUIDv7 for user-owned rows, sync-metadata columns (migration v16), soft deletes + tombstone propagation, write-time stamping of `dirty`/`sync_updated_at`.

**Out of scope (later sub-projects):** any backend, `/sync` endpoint, auth/`user_id`, conflict resolution, media-blob sync, the `SyncRepository` decorator (the stamping lives inline in repos for now and is refactored into a decorator in sub-project 2).

## Definitions

- **User-owned tables:** `exercises` (rows where `is_custom=1` only), `treinos`, `treino_exercicios`, `sessao_treinos`, `sessao_exercicios`, `series_registradas`, `registros_peso`, `exercise_alternatives`, `settings`.
- **Global catalog:** `exercises` rows where `is_custom=0` (`seed-ex-*`, `gif-ex-*`). Keep deterministic IDs; **not** synced; no behavior change.

---

## Component 1 — UUIDv7 IDs for user-owned rows

- Replace the body of `shared/utils/generateId.ts` to return a **UUIDv7** string (time-ordered, monotonic, collision-safe across devices). Use the `uuidv7` package (small, RN-friendly) with the `react-native-get-random-values` polyfill imported once at app entry.
- Keep the exported signature `generateId(): string` so call sites don't change. The optional `prefix` param is dropped (no caller relies on the prefix for logic — verify during implementation).
- **Existing user rows are NOT re-keyed** — single device, no collisions, and an in-place FK rewrite is needless risk. Only rows created *after* this change get UUIDv7.
- Global catalog IDs are untouched (they're created by seed migrations, not `generateId`).

**Acceptance:** `generateId()` returns a valid v7 UUID; two calls in the same ms are monotonically increasing; all existing call sites compile and pass.

---

## Component 2 — Sync-metadata columns (migration v16)

Add four columns to **each user-owned table** (one `ALTER` block, appended as migration index 15 → `user_version` 16):

| Column | Type | Meaning |
|---|---|---|
| `sync_updated_at` | INTEGER | ms-epoch of last local write; drives last-write-wins. Dedicated column so it doesn't collide with the existing ISO `updated_at` text columns. |
| `deleted_at` | INTEGER NULL | tombstone; set on delete, else NULL |
| `dirty` | INTEGER NOT NULL DEFAULT 1 | 1 = local change not yet pushed |
| `server_rev` | INTEGER NULL | server-assigned revision (populated in sub-project 2; NULL until first sync) |

- **Backfill** in the same migration: `sync_updated_at = <migration run time>`, `deleted_at = NULL`, `dirty = 1` (so the first cloud sync pushes the whole existing dataset up), `server_rev = NULL`.
- The `exercises` table gets the columns too, but global rows (`is_custom=0`) are filtered out of all sync selection by `is_custom=0` — they're inert.
- `sessao_treinos.arquivado` (domain archive) is unrelated to `deleted_at` (sync tombstone); both coexist.
- Migration is idempotent-tolerant per the existing runner (duplicate-column errors ignored), consistent with prior steps.

**Acceptance:** fresh DB and a v15→v16 upgrade both end at `user_version=16` with the four columns on every user-owned table; existing data intact; global rows unaffected.

---

## Component 3 — Soft deletes + tombstone propagation

Behind the repository interfaces (domain/use-cases unchanged):

- Every `delete` becomes `UPDATE … SET deleted_at = <now>, sync_updated_at = <now>, dirty = 1`.
- Every **read** query gains `AND deleted_at IS NULL`. The UI never sees tombstoned rows.
- **Cascades become cascade-soft-deletes** and must stamp children dirty so deletions propagate on sync:
  - delete `treino` → tombstone its `treino_exercicios`
  - delete `sessao_treino` → tombstone its `sessao_exercicios` → their `series_registradas`
  - delete custom `exercise` → tombstone its `exercise_alternatives` rows
- The existing SQLite `ON DELETE CASCADE` FKs no longer fire (we no longer hard-DELETE); cascading is done explicitly in the repos within the existing transaction wrapper.
- `UNIQUE` constraints (e.g. `exercises.normalized_name`, `treino_exercicios(treino_id, exercicio_id)`): a tombstoned row still occupies the unique slot. Decision: **on re-create of a name/pair that matches a tombstoned row, resurrect-and-overwrite that row** (clear `deleted_at`, update fields, bump `sync_updated_at`/`dirty`) rather than inserting a duplicate. Keeps uniqueness honest and avoids orphan tombstones.

**Acceptance:** deleting a treino hides it and its exercises from all reads; the rows still exist with `deleted_at` set and `dirty=1`; re-creating a same-named exercise resurrects the tombstone; all cascade paths covered by tests.

---

## Component 4 — Write-time stamping

- Every create/update in a user-owned repo sets `sync_updated_at = Date.now()` and `dirty = 1`.
- Centralize the "now" via the existing clock/util if present; otherwise a small `stamp()` helper used by the repos.
- This is deliberately inline in the SQLite repos for now; sub-project 2 extracts it into a `SyncRepository` decorator.

**Acceptance:** any create/update leaves the row with a fresh `sync_updated_at` and `dirty=1`.

---

## Testing

- Keep all **218** existing tests green.
- Add: UUIDv7 validity + monotonicity; v16 migration shape (columns present, backfill values, idempotent re-run); soft-delete hides rows; each cascade-soft-delete path; tombstone resurrection on unique re-create; write stamping sets `dirty`/`sync_updated_at`.
- Test strategy unchanged: InMemory repos for use cases, real SQLite (better-sqlite3 in node) for migration/repo integration. **InMemory repos must mirror the soft-delete + stamping behavior** so use-case tests stay representative.

## Risks

| Risk | Mitigation |
|---|---|
| Soft delete misses a read path → ghost rows appear | Audit every `SELECT` in user-owned repos; tests per cascade path |
| Unique constraints vs tombstones | Resurrect-and-overwrite rule (Component 3) |
| InMemory and SQLite repos diverge in soft-delete semantics | Shared behavioral test suite run against both |
| Existing ISO `updated_at` confused with `sync_updated_at` | Dedicated, separately-named column; existing column untouched |

## Done = shippable

App still runs fully offline/local, no backend, no auth. `estado-atual.md` schema bumped to v16. Ready for sub-project 1 (backend skeleton + auth).
