# Sub-project 2: Offline-first Sync Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full offline-first sync engine — `POST /sync` on the NestJS API and the mobile `SyncEngine` that rounds-trips dirty local rows to the server and applies server changes back.

**Architecture:** The server owns a `server_updated_at TIMESTAMPTZ` cursor on every synced table; clients send dirty rows and receive back everything newer than their last cursor. Conflict resolution is row-level last-write-wins on `updated_at` (ISO string, lexicographic sort). Tombstones (`deleted_at` non-null) always win deletes. The mobile `SyncEngine` collects dirty rows from each SQLite repo via a `getDirty()` method, posts them, applies server response rows, and clears dirty flags.

**Tech Stack:** NestJS + Prisma + PostgreSQL (server), Expo SQLite (mobile), `packages/contracts` for shared types, Jest for both test suites.

**Dependency order:**
- Tasks 1 & 2 are independent — run in parallel.
- Tasks 3 & 4 both depend on Task 2 — run in parallel after Task 2 completes.
- Task 5 depends on Tasks 3 & 4.

---

## File Structure

**Modified — server:**
- `apps/api/prisma/schema.prisma` — fix UserSetting PK, add `serverUpdatedAt` to all synced models, add sync cols to `TreinoExercicio`
- `apps/api/prisma/migrations/<timestamp>_sync_cursor_fix_settings/migration.sql` — new Prisma migration
- `apps/api/src/app.module.ts` — register SyncModule

**Created — server:**
- `apps/api/src/sync/sync.module.ts`
- `apps/api/src/sync/sync.service.ts`
- `apps/api/src/sync/sync.controller.ts`
- `apps/api/src/sync/sync.service.spec.ts`

**Modified — contracts:**
- `packages/contracts/src/sync.dto.ts` — add table-specific sync row types + updated request/response shapes

**Modified — mobile (7 repos get getDirty + applyServerRows):**
- `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`
- `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts`
- `apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.ts`
- `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts`
- `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts`
- `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`
- `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts`

**Created — mobile:**
- `apps/mobile/src/infrastructure/sync/SyncApiClient.ts`
- `apps/mobile/src/infrastructure/sync/SyncEngine.ts`
- `apps/mobile/src/infrastructure/sync/SyncEngine.test.ts`

---

## Task 1: Prisma Schema — Fix UserSetting PK + Add Sync Cursor

**Context:** The `UserSetting` model has `key String @id`, meaning only one user can have any given key. This must be a composite PK `(userId, key)`. Also all synced models need a `serverUpdatedAt DateTime?` column so the server can track which rows changed after a given cursor. `TreinoExercicio` is missing sync columns entirely in Prisma (though the mobile SQLite v19 migration added them).

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_sync_cursor_fix_settings/migration.sql`

- [ ] **Step 1: Update schema.prisma — fix UserSetting PK**

In `apps/api/prisma/schema.prisma`, replace the `UserSetting` model (lines 184–192):

```prisma
model UserSetting {
  userId String @map("user_id")
  key    String
  value  String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, key])
  @@map("user_settings")
}
```

- [ ] **Step 2: Update schema.prisma — add serverUpdatedAt + sync cols to all synced models**

Add `serverUpdatedAt DateTime? @map("server_updated_at") @db.Timestamptz` to: `Exercise`, `Treino`, `SessaoTreino`, `SessaoExercicio`, `SerieRegistrada`, `RegistroPeso`, `UserSetting`.

Also add full sync metadata to `TreinoExercicio` (currently missing `updatedAt`, `deletedAt`, `dirty`, `serverRev`, `serverUpdatedAt`).

The updated `TreinoExercicio` model:

```prisma
model TreinoExercicio {
  id                    String    @id
  treinoId              String    @map("treino_id")
  treino                Treino    @relation(fields: [treinoId], references: [id], onDelete: Cascade)
  exercicioId           String    @map("exercicio_id")
  ordem                 Int
  seriesRecomendadas    Int?      @map("series_recomendadas")
  execucoesRecomendadas Int?      @map("execucoes_recomendadas")
  cargaPadrao           Float?    @map("carga_padrao")
  tempoDescansoSegundos Int?      @map("tempo_descanso_segundos")
  metodo                String    @default("normal")
  grupoId               String?   @map("grupo_id")
  updatedAt             String?   @map("updated_at")
  deletedAt             String?   @map("deleted_at")
  dirty                 Boolean   @default(true)
  serverRev             String?   @map("server_rev")
  serverUpdatedAt       DateTime? @map("server_updated_at") @db.Timestamptz

  @@map("treino_exercicios")
}
```

For each of the other synced models, add only `serverUpdatedAt`:
```prisma
  serverUpdatedAt DateTime? @map("server_updated_at") @db.Timestamptz
```

- [ ] **Step 3: Create the Prisma migration**

Run in `apps/api/`:
```bash
cd apps/api && npx prisma migrate dev --name sync_cursor_fix_settings
```

Expected: Prisma generates a new migration SQL file under `prisma/migrations/`. If there is no running Postgres available, create the SQL file manually at `apps/api/prisma/migrations/20260605200000_sync_cursor_fix_settings/migration.sql`:

```sql
-- Fix UserSetting PK: drop old PK on key alone, add composite PK (user_id, key)
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_pkey";
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id", "key");

-- Add server_updated_at cursor column to all synced tables
ALTER TABLE "exercises"          ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "treinos"            ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "updated_at" TEXT;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "deleted_at" TEXT;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "dirty" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "server_rev" TEXT;
ALTER TABLE "treino_exercicios"  ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "sessao_treinos"     ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "sessao_exercicios"  ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "series_registradas" ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "registros_peso"     ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;
ALTER TABLE "user_settings"      ADD COLUMN IF NOT EXISTS "updated_at" TEXT;
ALTER TABLE "user_settings"      ADD COLUMN IF NOT EXISTS "deleted_at" TEXT;
ALTER TABLE "user_settings"      ADD COLUMN IF NOT EXISTS "dirty" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_settings"      ADD COLUMN IF NOT EXISTS "server_rev" TEXT;
ALTER TABLE "user_settings"      ADD COLUMN IF NOT EXISTS "server_updated_at" TIMESTAMPTZ;

-- Index to make cursor queries fast
CREATE INDEX IF NOT EXISTS "exercises_server_updated_at_idx"          ON "exercises"          ("server_updated_at");
CREATE INDEX IF NOT EXISTS "treinos_server_updated_at_idx"            ON "treinos"            ("server_updated_at");
CREATE INDEX IF NOT EXISTS "treino_exercicios_server_updated_at_idx"  ON "treino_exercicios"  ("server_updated_at");
CREATE INDEX IF NOT EXISTS "sessao_treinos_server_updated_at_idx"     ON "sessao_treinos"     ("server_updated_at");
CREATE INDEX IF NOT EXISTS "sessao_exercicios_server_updated_at_idx"  ON "sessao_exercicios"  ("server_updated_at");
CREATE INDEX IF NOT EXISTS "series_registradas_server_updated_at_idx" ON "series_registradas" ("server_updated_at");
CREATE INDEX IF NOT EXISTS "registros_peso_server_updated_at_idx"     ON "registros_peso"     ("server_updated_at");
CREATE INDEX IF NOT EXISTS "user_settings_server_updated_at_idx"      ON "user_settings"      ("server_updated_at");
```

Also create the lock file entry `apps/api/prisma/migrations/20260605200000_sync_cursor_fix_settings/migration.toml`:
```toml
migration_name = "20260605200000_sync_cursor_fix_settings"
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd apps/api && npx prisma generate
```

Expected: `Generated Prisma Client` message, no errors.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat(api): fix UserSetting PK, add server_updated_at sync cursor to all synced models"
```

---

## Task 2: Contracts — Table-Specific Sync Row Types

**Context:** The current `packages/contracts/src/sync.dto.ts` only has generic `SyncRow` (id, updatedAt, deletedAt). The sync endpoint needs all data fields per table so the server can upsert real rows. `SyncRequest` changes to a table-keyed payload; `SyncResponse` carries the cursor as an ISO string (the max `server_updated_at` seen).

**Files:**
- Modify: `packages/contracts/src/sync.dto.ts`

- [ ] **Step 1: Write the new sync.dto.ts**

Replace the entire content of `packages/contracts/src/sync.dto.ts`:

```typescript
export interface SyncRow {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExerciseSyncRow extends SyncRow {
  name: string;
  normalizedName: string;
  groupMuscle: string;
  category: string;
  equipment: string | null;
  loadUnit: string;
  isCustom: boolean;
  mediaOnline: string | null;
  mediaLocal: string | null;
  musculoAlvo: string | null;
  createdAt: string;
}

export interface TreinoSyncRow extends SyncRow {
  name: string;
  objetivo: string | null;
  createdAt: string;
}

export interface TreinoExercicioSyncRow extends SyncRow {
  treinoId: string;
  exercicioId: string;
  ordem: number;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  metodo: string;
  grupoId: string | null;
}

export interface SessaoTreinoSyncRow extends SyncRow {
  treinoId: string;
  treinoNomeSnapshot: string;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  status: string;
  arquivado: boolean;
  createdAt: string;
}

export interface SessaoExercicioSyncRow extends SyncRow {
  sessaoTreinoId: string;
  exercicioId: string;
  ordem: number;
  nomeSnapshot: string;
  grupoMuscularSnapshot: string;
  categoriaSnapshot: string;
  equipamentoSnapshot: string | null;
  musculoAlvoSnapshot: string | null;
  nomeOriginalSnapshot: string | null;
  realizado: boolean;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  metodo: string;
  grupoId: string | null;
  substituidoPorExercicioId: string | null;
  substituicaoMotivo: string | null;
  createdAt: string;
}

export interface SerieRegistradaSyncRow extends SyncRow {
  sessaoExercicioId: string;
  tipoSerie: string;
  ordem: number;
  cargaKg: number;
  repeticoes: number;
  observacao: string | null;
  createdAt: string;
}

export interface RegistroPesoSyncRow extends SyncRow {
  pesoKg: number;
  dataRegistro: string;
  observacao: string | null;
  createdAt: string;
}

export interface UserSettingSyncRow {
  key: string;
  value: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncChanges {
  exercises: ExerciseSyncRow[];
  treinos: TreinoSyncRow[];
  treinoExercicios: TreinoExercicioSyncRow[];
  sessaoTreinos: SessaoTreinoSyncRow[];
  sessaoExercicios: SessaoExercicioSyncRow[];
  seriesRegistradas: SerieRegistradaSyncRow[];
  registrosPeso: RegistroPesoSyncRow[];
  userSettings: UserSettingSyncRow[];
}

export interface SyncRequest {
  since: string | null;
  changes: SyncChanges;
}

export interface SyncResponse {
  serverChanges: SyncChanges;
  newCursor: string;
}
```

- [ ] **Step 2: Verify the contracts package compiles**

```bash
cd packages/contracts && npx tsc --noEmit
```

Expected: no errors. If `tsconfig.json` doesn't exist, check `packages/contracts/package.json` for the build script and use it instead.

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/sync.dto.ts
git commit -m "feat(contracts): expand sync DTOs with table-specific row types"
```

---

## Task 3: Server — SyncService, SyncController, SyncModule

**Depends on:** Task 2 (contracts types must be merged first).

**Context:** `SyncService.sync(userId, request)` applies incoming changes with LWW and returns rows updated since the cursor. LWW rule: for each incoming row, if the server already has a row with a **later or equal** `updated_at`, keep the server version; otherwise upsert the client row. Tombstones: if incoming `deletedAt` is non-null, set `deletedAt` regardless of timestamps (tombstones always win deletes per spec). The server stamps `serverUpdatedAt = NOW()` on every row it writes. Pull: return all rows for `userId` where `serverUpdatedAt > since` (NULL means first sync, return everything). All operations run in a Prisma transaction.

**Files:**
- Create: `apps/api/src/sync/sync.module.ts`
- Create: `apps/api/src/sync/sync.service.ts`
- Create: `apps/api/src/sync/sync.controller.ts`
- Create: `apps/api/src/sync/sync.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write the failing test first**

Create `apps/api/src/sync/sync.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SyncRequest } from '@projeto-academia/contracts';

const makePrisma = () => ({
  $transaction: jest.fn(),
  exercise: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  treino: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  treinoExercicio: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  sessaoTreino: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  sessaoExercicio: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  serieRegistrada: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  registroPeso: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  userSetting: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
});

describe('SyncService', () => {
  let service: SyncService;
  let mockPrisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    mockPrisma = makePrisma();
    mockPrisma.$transaction.mockImplementation((fn: (tx: any) => Promise<any>) =>
      fn(mockPrisma),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<SyncService>(SyncService);
  });

  const emptyChanges = (): SyncRequest['changes'] => ({
    exercises: [],
    treinos: [],
    treinoExercicios: [],
    sessaoTreinos: [],
    sessaoExercicios: [],
    seriesRegistradas: [],
    registrosPeso: [],
    userSettings: [],
  });

  it('returns empty serverChanges and a cursor when no changes exist', async () => {
    const result = await service.sync('user-1', {
      since: null,
      changes: emptyChanges(),
    });
    expect(result.serverChanges.exercises).toEqual([]);
    expect(typeof result.newCursor).toBe('string');
    expect(result.newCursor).toMatch(/^\d{4}-/);
  });

  it('upserts an incoming treino row', async () => {
    const now = new Date().toISOString();
    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-1', name: 'Peito', objetivo: null, createdAt: now, updatedAt: now, deletedAt: null }],
      },
    });
    expect(mockPrisma.treino.upsert).toHaveBeenCalledTimes(1);
    const call = mockPrisma.treino.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'treino-1' });
    expect(call.create.name).toBe('Peito');
    expect(call.create.userId).toBe('user-1');
  });

  it('does not overwrite a newer server row (LWW)', async () => {
    const serverTime = '2026-06-05T12:00:00.000Z';
    const clientTime = '2026-06-05T10:00:00.000Z';
    mockPrisma.treino.findMany.mockResolvedValueOnce([
      { id: 'treino-1', name: 'Server version', updatedAt: serverTime, deletedAt: null, userId: 'user-1', objetivo: null, createdAt: serverTime, serverUpdatedAt: new Date() },
    ]);
    await service.sync('user-1', {
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 'treino-1', name: 'Client version', objetivo: null, createdAt: clientTime, updatedAt: clientTime, deletedAt: null }],
      },
    });
    const call = mockPrisma.treino.upsert.mock.calls[0][0];
    expect(call.update.name).toBe('Server version');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/api && npx jest sync.service --passWithNoTests 2>&1 | head -20
```

Expected: `FAIL` — `SyncService` not found.

- [ ] **Step 3: Create sync.service.ts**

Create `apps/api/src/sync/sync.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SyncRequest, SyncResponse, SyncChanges } from '@projeto-academia/contracts';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async sync(userId: string, req: SyncRequest): Promise<SyncResponse> {
    const sinceDate = req.since ? new Date(req.since) : null;
    const now = new Date();

    const serverChanges = await this.prisma.$transaction(async (tx) => {
      await this.applyExercises(tx, userId, req.changes.exercises, now);
      await this.applyTreinos(tx, userId, req.changes.treinos, now);
      await this.applyTreinoExercicios(tx, req.changes.treinoExercicios, now);
      await this.applySessaoTreinos(tx, userId, req.changes.sessaoTreinos, now);
      await this.applySessaoExercicios(tx, req.changes.sessaoExercicios, now);
      await this.applySeriesRegistradas(tx, req.changes.seriesRegistradas, now);
      await this.applyRegistrosPeso(tx, userId, req.changes.registrosPeso, now);
      await this.applyUserSettings(tx, userId, req.changes.userSettings, now);

      return this.pullChanges(tx, userId, sinceDate);
    });

    return { serverChanges, newCursor: now.toISOString() };
  }

  private lwwUpdate<T extends { updatedAt: string }>(incoming: T, existing: T | undefined): T {
    if (!existing) return incoming;
    if (incoming.deletedAt !== undefined && (incoming as any).deletedAt !== null) return incoming;
    return incoming.updatedAt >= existing.updatedAt ? incoming : existing;
  }

  private async applyExercises(tx: any, userId: string, rows: SyncRequest['changes']['exercises'], now: Date) {
    const existing = rows.length === 0 ? [] : await tx.exercise.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map(existing.map((r: any) => [r.id, r]));
    for (const row of rows) {
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
      await tx.exercise.upsert({
        where: { id: row.id },
        create: {
          id: winner.id, name: winner.name, normalizedName: winner.normalizedName,
          groupMuscle: winner.groupMuscle, category: winner.category,
          equipment: winner.equipment, loadUnit: winner.loadUnit,
          isCustom: winner.isCustom, mediaOnline: winner.mediaOnline,
          mediaLocal: winner.mediaLocal, musculoAlvo: winner.musculoAlvo,
          createdAt: winner.createdAt, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
          userId,
        },
        update: {
          name: winner.name, normalizedName: winner.normalizedName,
          groupMuscle: winner.groupMuscle, category: winner.category,
          equipment: winner.equipment, loadUnit: winner.loadUnit,
          isCustom: winner.isCustom, mediaOnline: winner.mediaOnline,
          mediaLocal: winner.mediaLocal, musculoAlvo: winner.musculoAlvo,
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async applyTreinos(tx: any, userId: string, rows: SyncRequest['changes']['treinos'], now: Date) {
    const existing = rows.length === 0 ? [] : await tx.treino.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map(existing.map((r: any) => [r.id, r]));
    for (const row of rows) {
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
      await tx.treino.upsert({
        where: { id: row.id },
        create: {
          id: winner.id, name: winner.name, objetivo: winner.objetivo,
          createdAt: winner.createdAt, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
          userId,
        },
        update: {
          name: winner.name, objetivo: winner.objetivo,
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async applyTreinoExercicios(tx: any, rows: SyncRequest['changes']['treinoExercicios'], now: Date) {
    const existing = rows.length === 0 ? [] : await tx.treinoExercicio.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map(existing.map((r: any) => [r.id, r]));
    for (const row of rows) {
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
      await tx.treinoExercicio.upsert({
        where: { id: row.id },
        create: {
          id: winner.id, treinoId: winner.treinoId, exercicioId: winner.exercicioId,
          ordem: winner.ordem, seriesRecomendadas: winner.seriesRecomendadas,
          execucoesRecomendadas: winner.execucoesRecomendadas, cargaPadrao: winner.cargaPadrao,
          tempoDescansoSegundos: winner.tempoDescansoSegundos, metodo: winner.metodo,
          grupoId: winner.grupoId, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        },
        update: {
          ordem: winner.ordem, seriesRecomendadas: winner.seriesRecomendadas,
          execucoesRecomendadas: winner.execucoesRecomendadas, cargaPadrao: winner.cargaPadrao,
          tempoDescansoSegundos: winner.tempoDescansoSegundos, metodo: winner.metodo,
          grupoId: winner.grupoId, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async applySessaoTreinos(tx: any, userId: string, rows: SyncRequest['changes']['sessaoTreinos'], now: Date) {
    const existing = rows.length === 0 ? [] : await tx.sessaoTreino.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map(existing.map((r: any) => [r.id, r]));
    for (const row of rows) {
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
      await tx.sessaoTreino.upsert({
        where: { id: row.id },
        create: {
          id: winner.id, treinoId: winner.treinoId,
          treinoNomeSnapshot: winner.treinoNomeSnapshot,
          dataHoraInicio: winner.dataHoraInicio, dataHoraFim: winner.dataHoraFim,
          status: winner.status, arquivado: winner.arquivado,
          createdAt: winner.createdAt, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
          userId,
        },
        update: {
          treinoNomeSnapshot: winner.treinoNomeSnapshot,
          dataHoraFim: winner.dataHoraFim, status: winner.status,
          arquivado: winner.arquivado, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async applySessaoExercicios(tx: any, rows: SyncRequest['changes']['sessaoExercicios'], now: Date) {
    const existing = rows.length === 0 ? [] : await tx.sessaoExercicio.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map(existing.map((r: any) => [r.id, r]));
    for (const row of rows) {
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
      await tx.sessaoExercicio.upsert({
        where: { id: row.id },
        create: {
          id: winner.id, sessaoTreinoId: winner.sessaoTreinoId,
          exercicioId: winner.exercicioId, ordem: winner.ordem,
          nomeSnapshot: winner.nomeSnapshot, grupoMuscularSnapshot: winner.grupoMuscularSnapshot,
          categoriaSnapshot: winner.categoriaSnapshot, equipamentoSnapshot: winner.equipamentoSnapshot,
          musculoAlvoSnapshot: winner.musculoAlvoSnapshot, nomeOriginalSnapshot: winner.nomeOriginalSnapshot,
          realizado: winner.realizado, seriesRecomendadas: winner.seriesRecomendadas,
          execucoesRecomendadas: winner.execucoesRecomendadas, cargaPadrao: winner.cargaPadrao,
          tempoDescansoSegundos: winner.tempoDescansoSegundos, metodo: winner.metodo,
          grupoId: winner.grupoId, substituidoPorExercicioId: winner.substituidoPorExercicioId,
          substituicaoMotivo: winner.substituicaoMotivo,
          createdAt: winner.createdAt, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        },
        update: {
          nomeSnapshot: winner.nomeSnapshot, realizado: winner.realizado,
          seriesRecomendadas: winner.seriesRecomendadas, execucoesRecomendadas: winner.execucoesRecomendadas,
          cargaPadrao: winner.cargaPadrao, tempoDescansoSegundos: winner.tempoDescansoSegundos,
          metodo: winner.metodo, grupoId: winner.grupoId,
          substituidoPorExercicioId: winner.substituidoPorExercicioId,
          substituicaoMotivo: winner.substituicaoMotivo,
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async applySeriesRegistradas(tx: any, rows: SyncRequest['changes']['seriesRegistradas'], now: Date) {
    const existing = rows.length === 0 ? [] : await tx.serieRegistrada.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map(existing.map((r: any) => [r.id, r]));
    for (const row of rows) {
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
      await tx.serieRegistrada.upsert({
        where: { id: row.id },
        create: {
          id: winner.id, sessaoExercicioId: winner.sessaoExercicioId,
          tipoSerie: winner.tipoSerie, ordem: winner.ordem,
          cargaKg: winner.cargaKg, repeticoes: winner.repeticoes,
          observacao: winner.observacao, createdAt: winner.createdAt,
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now,
        },
        update: {
          tipoSerie: winner.tipoSerie, ordem: winner.ordem,
          cargaKg: winner.cargaKg, repeticoes: winner.repeticoes,
          observacao: winner.observacao, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async applyRegistrosPeso(tx: any, userId: string, rows: SyncRequest['changes']['registrosPeso'], now: Date) {
    const existing = rows.length === 0 ? [] : await tx.registroPeso.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map(existing.map((r: any) => [r.id, r]));
    for (const row of rows) {
      const winner = this.lwwUpdate(row, existingMap.get(row.id));
      await tx.registroPeso.upsert({
        where: { id: row.id },
        create: {
          id: winner.id, pesoKg: winner.pesoKg, dataRegistro: winner.dataRegistro,
          observacao: winner.observacao, createdAt: winner.createdAt,
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now, userId,
        },
        update: {
          pesoKg: winner.pesoKg, dataRegistro: winner.dataRegistro,
          observacao: winner.observacao, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async applyUserSettings(tx: any, userId: string, rows: SyncRequest['changes']['userSettings'], now: Date) {
    const existing = rows.length === 0 ? [] : await tx.userSetting.findMany({
      where: { userId, key: { in: rows.map((r) => r.key) } },
      select: { key: true, updatedAt: true, deletedAt: true },
    });
    const existingMap = new Map(existing.map((r: any) => [r.key, r]));
    for (const row of rows) {
      const existingRow = existingMap.get(row.key);
      const winner =
        !existingRow || row.deletedAt !== null || row.updatedAt >= (existingRow.updatedAt ?? '')
          ? row
          : existingRow;
      await tx.userSetting.upsert({
        where: { userId_key: { userId, key: row.key } },
        create: {
          userId, key: row.key, value: winner.value,
          updatedAt: winner.updatedAt, deletedAt: winner.deletedAt,
          dirty: false, serverUpdatedAt: now,
        },
        update: {
          value: winner.value, updatedAt: winner.updatedAt,
          deletedAt: winner.deletedAt, dirty: false, serverUpdatedAt: now,
        },
      });
    }
  }

  private async pullChanges(tx: any, userId: string, since: Date | null): Promise<SyncChanges> {
    const cursor = since ? { gt: since } : undefined;
    const where = (extra = {}) => ({ ...extra, serverUpdatedAt: cursor });

    const [exercises, treinos, treinoExercicios, sessaoTreinos,
           sessaoExercicios, seriesRegistradas, registrosPeso, userSettings] = await Promise.all([
      tx.exercise.findMany({ where: where({ OR: [{ userId }, { isCustom: false }] }) }),
      tx.treino.findMany({ where: where({ userId }) }),
      tx.treinoExercicio.findMany({
        where: { serverUpdatedAt: cursor, treino: { userId } },
        include: { treino: false },
      }),
      tx.sessaoTreino.findMany({ where: where({ userId }) }),
      tx.sessaoExercicio.findMany({
        where: { serverUpdatedAt: cursor, sessaoTreino: { userId } },
      }),
      tx.serieRegistrada.findMany({
        where: { serverUpdatedAt: cursor, sessaoExercicio: { sessaoTreino: { userId } } },
      }),
      tx.registroPeso.findMany({ where: where({ userId }) }),
      tx.userSetting.findMany({ where: where({ userId }) }),
    ]);

    return {
      exercises: exercises.map(this.mapExercise),
      treinos: treinos.map(this.mapTreino),
      treinoExercicios: treinoExercicios.map(this.mapTreinoExercicio),
      sessaoTreinos: sessaoTreinos.map(this.mapSessaoTreino),
      sessaoExercicios: sessaoExercicios.map(this.mapSessaoExercicio),
      seriesRegistradas: seriesRegistradas.map(this.mapSerieRegistrada),
      registrosPeso: registrosPeso.map(this.mapRegistroPeso),
      userSettings: userSettings.map(this.mapUserSetting),
    };
  }

  private mapExercise = (r: any) => ({
    id: r.id, name: r.name, normalizedName: r.normalizedName,
    groupMuscle: r.groupMuscle, category: r.category, equipment: r.equipment,
    loadUnit: r.loadUnit, isCustom: r.isCustom, mediaOnline: r.mediaOnline,
    mediaLocal: r.mediaLocal, musculoAlvo: r.musculoAlvo,
    createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapTreino = (r: any) => ({
    id: r.id, name: r.name, objetivo: r.objetivo,
    createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapTreinoExercicio = (r: any) => ({
    id: r.id, treinoId: r.treinoId, exercicioId: r.exercicioId, ordem: r.ordem,
    seriesRecomendadas: r.seriesRecomendadas, execucoesRecomendadas: r.execucoesRecomendadas,
    cargaPadrao: r.cargaPadrao, tempoDescansoSegundos: r.tempoDescansoSegundos,
    metodo: r.metodo, grupoId: r.grupoId,
    updatedAt: r.updatedAt ?? '', deletedAt: r.deletedAt,
  });

  private mapSessaoTreino = (r: any) => ({
    id: r.id, treinoId: r.treinoId, treinoNomeSnapshot: r.treinoNomeSnapshot,
    dataHoraInicio: r.dataHoraInicio, dataHoraFim: r.dataHoraFim,
    status: r.status, arquivado: r.arquivado,
    createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapSessaoExercicio = (r: any) => ({
    id: r.id, sessaoTreinoId: r.sessaoTreinoId, exercicioId: r.exercicioId,
    ordem: r.ordem, nomeSnapshot: r.nomeSnapshot,
    grupoMuscularSnapshot: r.grupoMuscularSnapshot, categoriaSnapshot: r.categoriaSnapshot,
    equipamentoSnapshot: r.equipamentoSnapshot, musculoAlvoSnapshot: r.musculoAlvoSnapshot,
    nomeOriginalSnapshot: r.nomeOriginalSnapshot, realizado: r.realizado,
    seriesRecomendadas: r.seriesRecomendadas, execucoesRecomendadas: r.execucoesRecomendadas,
    cargaPadrao: r.cargaPadrao, tempoDescansoSegundos: r.tempoDescansoSegundos,
    metodo: r.metodo, grupoId: r.grupoId,
    substituidoPorExercicioId: r.substituidoPorExercicioId, substituicaoMotivo: r.substituicaoMotivo,
    createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapSerieRegistrada = (r: any) => ({
    id: r.id, sessaoExercicioId: r.sessaoExercicioId, tipoSerie: r.tipoSerie,
    ordem: r.ordem, cargaKg: r.cargaKg, repeticoes: r.repeticoes,
    observacao: r.observacao, createdAt: r.createdAt,
    updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapRegistroPeso = (r: any) => ({
    id: r.id, pesoKg: r.pesoKg, dataRegistro: r.dataRegistro,
    observacao: r.observacao, createdAt: r.createdAt,
    updatedAt: r.updatedAt, deletedAt: r.deletedAt,
  });

  private mapUserSetting = (r: any) => ({
    key: r.key, value: r.value, updatedAt: r.updatedAt ?? '', deletedAt: r.deletedAt,
  });
}
```

- [ ] **Step 4: Create sync.module.ts**

Create `apps/api/src/sync/sync.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SyncService],
  controllers: [SyncController],
})
export class SyncModule {}
```

- [ ] **Step 5: Create sync.controller.ts**

Create `apps/api/src/sync/sync.controller.ts`:

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import type { SyncRequest } from '@projeto-academia/contracts';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  sync(@CurrentUser() user: { userId: string }, @Body() body: SyncRequest) {
    return this.syncService.sync(user.userId, body);
  }
}
```

- [ ] **Step 6: Register SyncModule in app.module.ts**

In `apps/api/src/app.module.ts`, add `SyncModule` to the imports array:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExercisesModule } from './exercises/exercises.module';
import { TreinosModule } from './treinos/treinos.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ExercisesModule,
    TreinosModule,
    SyncModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Run the tests**

```bash
cd apps/api && npx jest sync.service
```

Expected: all 3 tests PASS.

- [ ] **Step 8: TypeScript check**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/sync/ apps/api/src/app.module.ts
git commit -m "feat(api): add POST /sync endpoint with LWW merge and cursor-based pull"
```

---

## Task 4: Mobile — Add getDirty() + applyServerRows() to All SQLite Repos

**Depends on:** Task 2 (contracts types).

**Context:** Each SQLite repository needs two new methods:
- `getDirty(): Promise<XxxSyncRow[]>` — returns all rows where `dirty = 1` (or for `exercise`, only `isCustom = 1` rows since catalog rows are never synced)
- `applyServerRows(rows: XxxSyncRow[]): Promise<void>` — upserts each row, sets `dirty = 0` and `server_rev = now`

The `server_rev` column in SQLite is an INTEGER (from v19 migration). We use it as a flag (`1` = acknowledged by server); set to `1` when applying server rows.

**Files** (all modify existing files):
- `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`
- `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts`
- `apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.ts`
- `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts`
- `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts`
- `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`
- `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts`

- [ ] **Step 1: Add getDirty + applyServerRows to SQLiteExerciseRepository**

At the end of the class in `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts`, add:

```typescript
  async getDirty(): Promise<import('@projeto-academia/contracts').ExerciseSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; name: string; normalized_name: string; group_muscle: string;
      category: string; equipment: string | null; load_unit: string; is_custom: number;
      media_online: string | null; media_local: string | null; musculo_alvo: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, name, normalized_name, group_muscle, category, equipment, load_unit,
              is_custom, media_online, media_local, musculo_alvo, created_at, updated_at, deleted_at
       FROM exercises WHERE dirty = 1 AND is_custom = 1`
    );
    return rows.map((r) => ({
      id: r.id, name: r.name, normalizedName: r.normalized_name,
      groupMuscle: r.group_muscle, category: r.category, equipment: r.equipment,
      loadUnit: r.load_unit, isCustom: Boolean(r.is_custom),
      mediaOnline: r.media_online, mediaLocal: r.media_local, musculoAlvo: r.musculo_alvo,
      createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@projeto-academia/contracts').ExerciseSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO exercises
           (id, name, normalized_name, group_muscle, category, equipment, load_unit,
            is_custom, media_online, media_local, musculo_alvo, created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.name, r.normalizedName, r.groupMuscle, r.category, r.equipment,
         r.loadUnit, r.isCustom ? 1 : 0, r.mediaOnline, r.mediaLocal, r.musculoAlvo,
         r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
```

- [ ] **Step 2: Add getDirty + applyServerRows to SQLiteTreinoRepository**

At the end of the class in `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts`, add:

```typescript
  async getDirty(): Promise<import('@projeto-academia/contracts').TreinoSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; name: string; objetivo: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, name, objetivo, created_at, updated_at, deleted_at
       FROM treinos WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, name: r.name, objetivo: r.objetivo,
      createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@projeto-academia/contracts').TreinoSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO treinos (id, name, objetivo, created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.name, r.objetivo, r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
```

- [ ] **Step 3: Add getDirty + applyServerRows to SQLiteTreinoExercicioRepository**

Read the current content of `apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.ts` to find the class end, then add:

```typescript
  async getDirty(): Promise<import('@projeto-academia/contracts').TreinoExercicioSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; treino_id: string; exercicio_id: string; ordem: number;
      series_recomendadas: number | null; execucoes_recomendadas: number | null;
      carga_padrao: number | null; tempo_descanso_segundos: number | null;
      metodo: string; grupo_id: string | null; updated_at: string | null; deleted_at: string | null;
    }>(
      `SELECT id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas,
              carga_padrao, tempo_descanso_segundos, metodo, grupo_id, updated_at, deleted_at
       FROM treino_exercicios WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, treinoId: r.treino_id, exercicioId: r.exercicio_id, ordem: r.ordem,
      seriesRecomendadas: r.series_recomendadas, execucoesRecomendadas: r.execucoes_recomendadas,
      cargaPadrao: r.carga_padrao, tempoDescansoSegundos: r.tempo_descanso_segundos,
      metodo: r.metodo, grupoId: r.grupo_id,
      updatedAt: r.updated_at ?? new Date().toISOString(), deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@projeto-academia/contracts').TreinoExercicioSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO treino_exercicios
           (id, treino_id, exercicio_id, ordem, series_recomendadas, execucoes_recomendadas,
            carga_padrao, tempo_descanso_segundos, metodo, grupo_id, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.treinoId, r.exercicioId, r.ordem, r.seriesRecomendadas, r.execucoesRecomendadas,
         r.cargaPadrao, r.tempoDescansoSegundos, r.metodo, r.grupoId, r.updatedAt, r.deletedAt]
      );
    }
  }
```

- [ ] **Step 4: Add getDirty + applyServerRows to SQLiteSessaoTreinoRepository**

At the end of the class in `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts`, add:

```typescript
  async getDirty(): Promise<import('@projeto-academia/contracts').SessaoTreinoSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; treino_id: string; treino_nome_snapshot: string;
      data_hora_inicio: string; data_hora_fim: string | null; status: string;
      arquivado: number; created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim,
              status, arquivado, created_at, updated_at, deleted_at
       FROM sessao_treinos WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, treinoId: r.treino_id, treinoNomeSnapshot: r.treino_nome_snapshot,
      dataHoraInicio: r.data_hora_inicio, dataHoraFim: r.data_hora_fim,
      status: r.status, arquivado: Boolean(r.arquivado),
      createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@projeto-academia/contracts').SessaoTreinoSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO sessao_treinos
           (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim,
            status, arquivado, created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.treinoId, r.treinoNomeSnapshot, r.dataHoraInicio, r.dataHoraFim,
         r.status, r.arquivado ? 1 : 0, r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
```

- [ ] **Step 5: Add getDirty + applyServerRows to SQLiteSessaoExercicioRepository**

Read `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts` to find the class end, then add:

```typescript
  async getDirty(): Promise<import('@projeto-academia/contracts').SessaoExercicioSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; sessao_treino_id: string; exercicio_id: string; ordem: number;
      nome_snapshot: string; grupo_muscular_snapshot: string; categoria_snapshot: string;
      equipamento_snapshot: string | null; musculo_alvo_snapshot: string | null;
      nome_original_snapshot: string | null; realizado: number;
      series_recomendadas: number | null; execucoes_recomendadas: number | null;
      carga_padrao: number | null; tempo_descanso_segundos: number | null;
      metodo: string; grupo_id: string | null;
      substituido_por_exercicio_id: string | null; substituicao_motivo: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot,
              categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, nome_original_snapshot,
              realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos,
              metodo, grupo_id, substituido_por_exercicio_id, substituicao_motivo,
              created_at, updated_at, deleted_at
       FROM sessao_exercicios WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, sessaoTreinoId: r.sessao_treino_id, exercicioId: r.exercicio_id,
      ordem: r.ordem, nomeSnapshot: r.nome_snapshot,
      grupoMuscularSnapshot: r.grupo_muscular_snapshot, categoriaSnapshot: r.categoria_snapshot,
      equipamentoSnapshot: r.equipamento_snapshot, musculoAlvoSnapshot: r.musculo_alvo_snapshot,
      nomeOriginalSnapshot: r.nome_original_snapshot, realizado: Boolean(r.realizado),
      seriesRecomendadas: r.series_recomendadas, execucoesRecomendadas: r.execucoes_recomendadas,
      cargaPadrao: r.carga_padrao, tempoDescansoSegundos: r.tempo_descanso_segundos,
      metodo: r.metodo, grupoId: r.grupo_id,
      substituidoPorExercicioId: r.substituido_por_exercicio_id,
      substituicaoMotivo: r.substituicao_motivo,
      createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@projeto-academia/contracts').SessaoExercicioSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO sessao_exercicios
           (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot,
            categoria_snapshot, equipamento_snapshot, musculo_alvo_snapshot, nome_original_snapshot,
            realizado, series_recomendadas, execucoes_recomendadas, carga_padrao, tempo_descanso_segundos,
            metodo, grupo_id, substituido_por_exercicio_id, substituicao_motivo,
            created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.sessaoTreinoId, r.exercicioId, r.ordem, r.nomeSnapshot,
         r.grupoMuscularSnapshot, r.categoriaSnapshot, r.equipamentoSnapshot,
         r.musculoAlvoSnapshot, r.nomeOriginalSnapshot, r.realizado ? 1 : 0,
         r.seriesRecomendadas, r.execucoesRecomendadas, r.cargaPadrao, r.tempoDescansoSegundos,
         r.metodo, r.grupoId, r.substituidoPorExercicioId, r.substituicaoMotivo,
         r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
```

- [ ] **Step 6: Add getDirty + applyServerRows to SQLiteSerieRegistradaRepository**

At the end of the class in `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`, add:

```typescript
  async getDirty(): Promise<import('@projeto-academia/contracts').SerieRegistradaSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; sessao_exercicio_id: string; tipo_serie: string; ordem: number;
      carga_kg: number; repeticoes: number; observacao: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao,
              created_at, updated_at, deleted_at
       FROM series_registradas WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, sessaoExercicioId: r.sessao_exercicio_id, tipoSerie: r.tipo_serie,
      ordem: r.ordem, cargaKg: r.carga_kg, repeticoes: r.repeticoes,
      observacao: r.observacao, createdAt: r.created_at,
      updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@projeto-academia/contracts').SerieRegistradaSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO series_registradas
           (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao,
            created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.sessaoExercicioId, r.tipoSerie, r.ordem, r.cargaKg, r.repeticoes,
         r.observacao, r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
```

- [ ] **Step 7: Add getDirty + applyServerRows to SQLiteRegistroPesoRepository**

At the end of the class in `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts`, add:

```typescript
  async getDirty(): Promise<import('@projeto-academia/contracts').RegistroPesoSyncRow[]> {
    const rows = await this.database.getAll<{
      id: string; peso_kg: number; data_registro: string; observacao: string | null;
      created_at: string; updated_at: string; deleted_at: string | null;
    }>(
      `SELECT id, peso_kg, data_registro, observacao, created_at, updated_at, deleted_at
       FROM registros_peso WHERE dirty = 1`
    );
    return rows.map((r) => ({
      id: r.id, pesoKg: r.peso_kg, dataRegistro: r.data_registro,
      observacao: r.observacao, createdAt: r.created_at,
      updatedAt: r.updated_at, deletedAt: r.deleted_at,
    }));
  }

  async applyServerRows(rows: import('@projeto-academia/contracts').RegistroPesoSyncRow[]): Promise<void> {
    for (const r of rows) {
      await this.database.run(
        `INSERT OR REPLACE INTO registros_peso
           (id, peso_kg, data_registro, observacao, created_at, updated_at, deleted_at, dirty, server_rev)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [r.id, r.pesoKg, r.dataRegistro, r.observacao, r.createdAt, r.updatedAt, r.deletedAt]
      );
    }
  }
```

- [ ] **Step 8: TypeScript check on mobile**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the new methods. Ignore pre-existing unrelated errors if any.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts \
        apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts \
        apps/mobile/src/infrastructure/treinos/SQLiteTreinoExercicioRepository.ts \
        apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts \
        apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts \
        apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts \
        apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts
git commit -m "feat(mobile): add getDirty + applyServerRows to all sync-capable SQLite repos"
```

---

## Task 5: Mobile — SyncApiClient + SyncEngine

**Depends on:** Tasks 3 (contracts finalized) and 4 (repos have getDirty/applyServerRows).

**Context:** `SyncApiClient` is a thin HTTP wrapper for `POST /sync`. `SyncEngine` is the orchestrator: it calls `getDirty()` on all 7 repos, posts to the server, applies `serverChanges` via `applyServerRows()`, and persists the cursor to AsyncStorage. The cursor key is `@sync/cursor`. SyncEngine catches network errors silently (offline is normal); it throws on server errors (4xx/5xx) so the caller can show an error.

**Files:**
- Create: `apps/mobile/src/infrastructure/sync/SyncApiClient.ts`
- Create: `apps/mobile/src/infrastructure/sync/SyncEngine.ts`
- Create: `apps/mobile/src/infrastructure/sync/SyncEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/infrastructure/sync/SyncEngine.test.ts`:

```typescript
import { SyncEngine } from './SyncEngine';
import type { SyncResponse } from '@projeto-academia/contracts';

const emptyChanges = () => ({
  exercises: [], treinos: [], treinoExercicios: [], sessaoTreinos: [],
  sessaoExercicios: [], seriesRegistradas: [], registrosPeso: [], userSettings: [],
});

const makeRepo = (dirtyRows: any[] = []) => ({
  getDirty: jest.fn().mockResolvedValue(dirtyRows),
  applyServerRows: jest.fn().mockResolvedValue(undefined),
});

const makeStorage = (initial: string | null = null) => ({
  getItem: jest.fn().mockResolvedValue(initial),
  setItem: jest.fn().mockResolvedValue(undefined),
});

describe('SyncEngine', () => {
  let apiClient: { sync: jest.Mock };
  let storage: ReturnType<typeof makeStorage>;
  let exerciseRepo: ReturnType<typeof makeRepo>;
  let treinoRepo: ReturnType<typeof makeRepo>;
  let treinoExercicioRepo: ReturnType<typeof makeRepo>;
  let sessaoTreinoRepo: ReturnType<typeof makeRepo>;
  let sessaoExercicioRepo: ReturnType<typeof makeRepo>;
  let serieRepo: ReturnType<typeof makeRepo>;
  let pesoRepo: ReturnType<typeof makeRepo>;

  const makeEngine = () =>
    new SyncEngine(
      { sync: apiClient.sync },
      storage,
      exerciseRepo,
      treinoRepo,
      treinoExercicioRepo,
      sessaoTreinoRepo,
      sessaoExercicioRepo,
      serieRepo,
      pesoRepo,
    );

  beforeEach(() => {
    apiClient = { sync: jest.fn() };
    storage = makeStorage();
    exerciseRepo = makeRepo();
    treinoRepo = makeRepo();
    treinoExercicioRepo = makeRepo();
    sessaoTreinoRepo = makeRepo();
    sessaoExercicioRepo = makeRepo();
    serieRepo = makeRepo();
    pesoRepo = makeRepo();
  });

  it('sends dirty rows and applies server changes', async () => {
    const serverCursor = '2026-06-05T14:00:00.000Z';
    const serverResponse: SyncResponse = {
      serverChanges: { ...emptyChanges(), treinos: [{ id: 't1', name: 'Server treino', objetivo: null, createdAt: serverCursor, updatedAt: serverCursor, deletedAt: null }] },
      newCursor: serverCursor,
    };
    apiClient.sync.mockResolvedValue(serverResponse);
    treinoRepo = makeRepo([{ id: 'local-1', name: 'Local', objetivo: null, createdAt: '2026-06-05T10:00:00.000Z', updatedAt: '2026-06-05T10:00:00.000Z', deletedAt: null }]);

    const engine = makeEngine();
    await engine.run();

    expect(apiClient.sync).toHaveBeenCalledWith({
      since: null,
      changes: expect.objectContaining({ treinos: [expect.objectContaining({ id: 'local-1' })] }),
    });
    expect(treinoRepo.applyServerRows).toHaveBeenCalledWith(serverResponse.serverChanges.treinos);
    expect(storage.setItem).toHaveBeenCalledWith('@sync/cursor', serverCursor);
  });

  it('passes stored cursor as since on subsequent runs', async () => {
    const cursor = '2026-06-05T12:00:00.000Z';
    storage = makeStorage(cursor);
    apiClient.sync.mockResolvedValue({ serverChanges: emptyChanges(), newCursor: cursor });
    const engine = makeEngine();
    await engine.run();
    expect(apiClient.sync).toHaveBeenCalledWith(expect.objectContaining({ since: cursor }));
  });

  it('does not throw on network error (offline-safe)', async () => {
    apiClient.sync.mockRejectedValue(new TypeError('Network request failed'));
    const engine = makeEngine();
    await expect(engine.run()).resolves.not.toThrow();
  });

  it('re-throws on server error (4xx/5xx)', async () => {
    apiClient.sync.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    const engine = makeEngine();
    await expect(engine.run()).rejects.toThrow('Unauthorized');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd apps/mobile && npx jest SyncEngine --passWithNoTests 2>&1 | head -20
```

Expected: `FAIL` — `SyncEngine` not found.

- [ ] **Step 3: Create SyncApiClient.ts**

Create `apps/mobile/src/infrastructure/sync/SyncApiClient.ts`:

```typescript
import type { SyncRequest, SyncResponse } from '@projeto-academia/contracts';

export class SyncApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getAccessToken: () => Promise<string>,
  ) {}

  async sync(request: SyncRequest): Promise<SyncResponse> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = Object.assign(new Error(`Sync failed: ${response.status}`), { status: response.status });
      throw error;
    }
    return response.json() as Promise<SyncResponse>;
  }
}
```

- [ ] **Step 4: Create SyncEngine.ts**

Create `apps/mobile/src/infrastructure/sync/SyncEngine.ts`:

```typescript
import type {
  SyncRequest, SyncResponse,
  ExerciseSyncRow, TreinoSyncRow, TreinoExercicioSyncRow,
  SessaoTreinoSyncRow, SessaoExercicioSyncRow,
  SerieRegistradaSyncRow, RegistroPesoSyncRow,
} from '@projeto-academia/contracts';

const CURSOR_KEY = '@sync/cursor';

interface SyncClient {
  sync(req: SyncRequest): Promise<SyncResponse>;
}

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

interface SyncableRepo<T> {
  getDirty(): Promise<T[]>;
  applyServerRows(rows: T[]): Promise<void>;
}

export class SyncEngine {
  constructor(
    private readonly client: SyncClient,
    private readonly storage: StorageAdapter,
    private readonly exerciseRepo: SyncableRepo<ExerciseSyncRow>,
    private readonly treinoRepo: SyncableRepo<TreinoSyncRow>,
    private readonly treinoExercicioRepo: SyncableRepo<TreinoExercicioSyncRow>,
    private readonly sessaoTreinoRepo: SyncableRepo<SessaoTreinoSyncRow>,
    private readonly sessaoExercicioRepo: SyncableRepo<SessaoExercicioSyncRow>,
    private readonly serieRepo: SyncableRepo<SerieRegistradaSyncRow>,
    private readonly pesoRepo: SyncableRepo<RegistroPesoSyncRow>,
  ) {}

  async run(): Promise<void> {
    const since = await this.storage.getItem(CURSOR_KEY);

    const [exercises, treinos, treinoExercicios, sessaoTreinos,
           sessaoExercicios, seriesRegistradas, registrosPeso] = await Promise.all([
      this.exerciseRepo.getDirty(),
      this.treinoRepo.getDirty(),
      this.treinoExercicioRepo.getDirty(),
      this.sessaoTreinoRepo.getDirty(),
      this.sessaoExercicioRepo.getDirty(),
      this.serieRepo.getDirty(),
      this.pesoRepo.getDirty(),
    ]);

    let response: SyncResponse;
    try {
      response = await this.client.sync({
        since,
        changes: { exercises, treinos, treinoExercicios, sessaoTreinos,
                   sessaoExercicios, seriesRegistradas, registrosPeso, userSettings: [] },
      });
    } catch (err: unknown) {
      if (err instanceof TypeError) return; // network offline — silent
      throw err;
    }

    const { serverChanges, newCursor } = response;

    await Promise.all([
      serverChanges.exercises.length > 0 ? this.exerciseRepo.applyServerRows(serverChanges.exercises) : Promise.resolve(),
      serverChanges.treinos.length > 0 ? this.treinoRepo.applyServerRows(serverChanges.treinos) : Promise.resolve(),
      serverChanges.treinoExercicios.length > 0 ? this.treinoExercicioRepo.applyServerRows(serverChanges.treinoExercicios) : Promise.resolve(),
      serverChanges.sessaoTreinos.length > 0 ? this.sessaoTreinoRepo.applyServerRows(serverChanges.sessaoTreinos) : Promise.resolve(),
      serverChanges.sessaoExercicios.length > 0 ? this.sessaoExercicioRepo.applyServerRows(serverChanges.sessaoExercicios) : Promise.resolve(),
      serverChanges.seriesRegistradas.length > 0 ? this.serieRepo.applyServerRows(serverChanges.seriesRegistradas) : Promise.resolve(),
      serverChanges.registrosPeso.length > 0 ? this.pesoRepo.applyServerRows(serverChanges.registrosPeso) : Promise.resolve(),
    ]);

    await this.storage.setItem(CURSOR_KEY, newCursor);
  }
}
```

- [ ] **Step 5: Run the tests**

```bash
cd apps/mobile && npx jest SyncEngine
```

Expected: all 4 tests PASS.

- [ ] **Step 6: TypeScript check on mobile**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from the new sync files. Stop if you see errors in sync files; fix them before continuing.

- [ ] **Step 7: Run the full mobile test suite to confirm no regressions**

```bash
cd apps/mobile && npx jest --passWithNoTests 2>&1 | tail -10
```

Expected: same or more passing tests than before; no new failures.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/infrastructure/sync/
git commit -m "feat(mobile): add SyncApiClient + SyncEngine — offline-first sync round-trip"
```

---

## Self-Review

**Spec coverage check:**
- `POST /sync` endpoint with JWT auth ✓ (Task 3, SyncController)
- Client sends `{ since: cursor, changes: [...dirtyRows] }` ✓ (SyncRequest in Task 2, SyncEngine in Task 5)
- Server returns `{ serverChanges, newCursor }` ✓ (SyncResponse in Task 2, SyncService in Task 3)
- `SyncRepository` decorator wraps existing SQLite repos using `dirty` flag ✓ (getDirty/applyServerRows in Task 4)
- Conflict policy: LWW by `updated_at` ✓ (lwwUpdate in SyncService)
- Tombstones win deletes ✓ (lwwUpdate checks deletedAt)
- Cursor: server-assigned via `server_updated_at` TIMESTAMPTZ ✓ (Task 1 migration, Task 3 service)
- UserSetting PK bug fixed ✓ (Task 1)

**Gaps identified and addressed:**
- `TreinoExercicio` lacked Prisma sync columns → added in Task 1
- `UserSettings` sync missing from SyncEngine → tracked but deferred (the `userSettings: []` stub in SyncEngine is intentional; settings sync is a sub-concern, the infrastructure is wired but UI for settings sync is out of scope for sub-project 2)
