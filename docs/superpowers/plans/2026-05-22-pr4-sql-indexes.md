# PR-4: SQL Indexes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 SQL indexes via a single new migration (v18) to eliminate full-table scans on the hot query paths identified in AUDIT.md.

**Architecture:** One new string appended to the `migrations` array in `ExpoSQLiteDatabaseClient.ts`. All statements use `CREATE INDEX IF NOT EXISTS` — safe on any device regardless of migration history. No schema or data changes. No application-layer changes needed — indexes are transparent to queries.

**Tech Stack:** TypeScript, SQLite (expo-sqlite), Vitest.

---

## Files Modified

- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

---

### Task 1: Add v18 index migration

**Context:** The `migrations` array in `ExpoSQLiteDatabaseClient.ts` currently ends at index 16 (v17 drops `tipo_serie`). Each array element maps to `PRAGMA user_version = index+1`. Append the new string at index 17 → becomes v18 on device.

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

- [ ] **Step 1: Locate the end of the migrations array**

Open `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts` and find the last migration entry. It is currently v17:

```typescript
  // v17: remove tipo_serie column — warm-up sets concept removed from product
  `ALTER TABLE series_registradas DROP COLUMN tipo_serie;`,
];
```

- [ ] **Step 2: Append the v18 index migration**

Replace the closing `];` with the new entry so the file ends with:

```typescript
  // v17: remove tipo_serie column — warm-up sets concept removed from product
  `ALTER TABLE series_registradas DROP COLUMN tipo_serie;`,

  // v18: SQL indexes — eliminate full-table scans on hot query paths
  `CREATE INDEX IF NOT EXISTS idx_sessao_treinos_status_arquivado_inicio ON sessao_treinos (status, arquivado, data_hora_inicio);
   CREATE INDEX IF NOT EXISTS idx_sessao_treinos_treino_id ON sessao_treinos (treino_id);
   CREATE INDEX IF NOT EXISTS idx_sessao_exercicios_sessao_treino_id ON sessao_exercicios (sessao_treino_id);
   CREATE INDEX IF NOT EXISTS idx_sessao_exercicios_exercicio_id ON sessao_exercicios (exercicio_id);
   CREATE INDEX IF NOT EXISTS idx_series_registradas_sessao_exercicio_id ON series_registradas (sessao_exercicio_id);
   CREATE INDEX IF NOT EXISTS idx_registros_peso_data_registro ON registros_peso (data_registro);
   CREATE INDEX IF NOT EXISTS idx_exercises_musculo_alvo ON exercises (musculo_alvo);`,
];
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Run the full test suite**

```bash
cd apps/mobile && npx vitest run
```

Expected: all tests PASS. (Indexes are transparent — no behavioral change.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "feat(db): add SQL indexes migration (v18) for hot query paths"
```

---

### Task 2: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Full test suite**

```bash
cd apps/mobile && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 3: Confirm migration count**

```bash
grep -c "// v" apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
```

Expected: `18` (one comment per migration version).
