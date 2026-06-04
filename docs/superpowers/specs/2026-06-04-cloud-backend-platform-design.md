# Cloud Backend & Multi-App Platform — Design

> Created 2026-06-04. Status: **approved decomposition, awaiting per-sub-project specs.**
> This is the **overarching** design. Each sub-project (0–4) gets its own spec → plan → implementation cycle.

---

## Vision

Evolve the app from a single-user, 100%-local SQLite workout tracker into a small platform:

- **User app** (existing Expo app) — offline-first, backed up and synced across the user's devices.
- **Custom backend** — NestJS + Postgres, the source of cloud truth and the sync hub.
- **Trainer↔client** — a coach can assign workouts to and monitor a client, sharing data through the same sync engine.
- **Trainer surface** — mobile-first (a role-gated section of the existing app); a web surface comes later.

## Goals

1. **Backup / device migration** — never lose data when changing phones.
2. **Multi-device sync** — same user, multiple devices, kept consistent.
3. **Trainer↔client** — assign workouts, read client history, with server-enforced permissions.
4. **Offline-first** — app fully works in a basement gym; local SQLite stays the source of truth and syncs opportunistically.

## Non-Goals (now)

- Social login (added later, after email/password works).
- Web app (dir reserved; built after sub-projects 0–3).
- CRDTs / real-time collaborative editing (data is effectively single-writer; LWW suffices).
- Social features, wearables, monetization, product analytics.

---

## Decomposition & Sequencing

Each row is an independent spec → plan → build cycle. Build strictly in order; ship after sub-project 2.

| # | Sub-project | Delivers | Depends on |
|---|---|---|---|
| **0** | Foundations / migration prep | UUIDv7 IDs, sync metadata columns, soft deletes — all inside the existing app, still local-only and shippable | — |
| **1** | Backend skeleton + auth | NestJS + Postgres, schema ported from SQLite v15, Passport+JWT auth, one user's data round-tripping | 0 |
| **2** | Offline-first sync engine | Custom delta sync behind repository interfaces; LWW + tombstones | 0, 1 |
| **3** | Trainer↔client model | Roles, trainer-assigns-workout, read-only history sharing, server-side permissions over the sync engine | 2 |
| **4** | Trainer mobile surface | Role-gated trainer section in the existing Expo app | 3 |

**Milestone after #2:** "My data, backed up and synced across my devices." This banks the backup + multi-device wins and de-risks the trainer features before building them.

---

## Repo Shape

Keep the monorepo; separate by surface (npm/yarn workspaces):

```
apps/
  mobile/      # existing Expo user app (later also hosts the trainer section)
  api/         # NestJS + Postgres backend  (sub-project 1)
  web/         # reserved — trainer/admin web panel (built later)
packages/
  contracts/   # shared TS types: domain DTOs + sync protocol shapes
```

`packages/contracts` is imported by both `mobile` and `api`, so the client/server contract cannot silently drift. ORM: **Prisma** (migration ergonomics + type-safety).

---

## Cross-Cutting Decisions

### Identity
- `generateId` → **UUIDv7** (time-ordered, globally unique, index-friendly), generated client-side. Repository interfaces unchanged, so domain/use-cases are untouched.

### Sync metadata (every synced table)
- `updated_at` (ms epoch) — drives LWW.
- `deleted_at` (nullable) — tombstone; deletes become soft. UI never sees tombstoned rows.
- server-assigned `rev` / `server_updated_at` — server ordering for the pull cursor.
- client-side `dirty` flag — marks unsynced local changes.

### Auth (sub-project 1)
- NestJS **Passport + JWT**: short-lived access token + long-lived refresh token (rotated on use).
- Tokens stored in `expo-secure-store`.
- **Social OAuth added later**, not in scope now.
- Every synced row carries `user_id` (FK); ownership enforced server-side, never trusted from the client.

### Sync engine — **Option A: custom delta sync** (sub-project 2)
- Endpoint `POST /sync`: client sends `{ since: cursor, changes: [...dirtyRows] }`; server returns `{ serverChanges, newCursor }`.
- A `SyncRepository` decorator wraps existing SQLite repos, tracking the `dirty` flag — domain/use-cases stay clean.
- **Conflict policy:** row-level **last-write-wins** by `updated_at` (most recent data prevails); deletes win via tombstone. Immutable session snapshots make same-row conflicts nearly impossible — no CRDTs.
- Pure TypeScript on both ends; no third-party sync vendor (honors the "custom NestJS, full control" choice).

### Trainer↔client model (sketch — detailed in sub-project 3)
- `trainer_links` table: `trainer_user_id` ↔ `client_user_id` + `status`.
- Trainer creates workout templates assigned to a client; reads the client's session history.
- Sharing rides the **same** sync engine with server-side permission checks.
- Trainer UI is a **role-gated section of the existing Expo app** (mobile-first), not a separate build.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sync engine (sub-project 2) is the hard core | Ship 0→1 first; data is single-writer-mostly so conflicts are rare; LWW is simple and sufficient |
| ID migration breaks existing local data | Single user, one dataset today — low stakes; do it as one tested SQLite migration (v16) |
| Client/server contract drift | `packages/contracts` shared types imported by both sides |
| Scope creep into trainer/web too early | Strict 0→1→2 sequencing; trainer + web gated behind a shipped sync milestone |

---

## Next Step

Proceed to the detailed spec for **sub-project 0 (Foundations / migration prep)**, then its implementation plan.
