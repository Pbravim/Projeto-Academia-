# PR-4: SQL Indexes — Design Spec

**Date:** 2026-05-22  
**Branch:** `feat/pr4-sql-indexes` (off `main`)  
**Audit phase:** Fase 7  
**Status:** Approved

---

## Goal

Add 7 SQL indexes via a new migration (v14) in `ExpoSQLiteDatabaseClient.ts`. Currently zero explicit indexes exist across all tables — every multi-row query runs a full table scan. This migration eliminates the most expensive scans without introducing schema or data changes.

---

## Architecture

Single new string appended to the `migrations` array in:

```
apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
```

The array currently has 13 entries (v1–v13). The new entry becomes v14. All statements use `CREATE INDEX IF NOT EXISTS` — safe to run on any device regardless of migration history.

The `db-setup.ts` test helper at `apps/mobile/src/test/db-setup.ts` must also receive the new migration string so tests that initialize a fresh schema see the correct indexes.

---

## The 7 Indexes

| Index name | Table | Columns | Justification |
|---|---|---|---|
| `idx_sessao_treinos_status_arquivado_inicio` | `sessao_treinos` | `(status, arquivado, data_hora_inicio)` | Every dashboard query filters by status+arquivado; many also ORDER BY data_hora_inicio |
| `idx_sessao_treinos_treino_id` | `sessao_treinos` | `(treino_id)` | `findSugestaoRotacao`, `deleteByTreinoId` |
| `idx_sessao_exercicios_sessao_treino_id` | `sessao_exercicios` | `(sessao_treino_id)` | Primary JOIN in every session read |
| `idx_sessao_exercicios_exercicio_id` | `sessao_exercicios` | `(exercicio_id)` | Historico queries join on this column |
| `idx_series_registradas_sessao_exercicio_id` | `series_registradas` | `(sessao_exercicio_id)` | Most frequent JOIN in the entire app |
| `idx_registros_peso_data_registro` | `registros_peso` | `(data_registro)` | Weight history ORDER BY |
| `idx_exercises_musculo_alvo` | `exercises` | `(musculo_alvo)` | Substitute matching queries |

**Skipped:** `treino_exercicios(treino_id)` — already covered by the implicit index on `UNIQUE(treino_id, exercicio_id)`.

---

## Migration String (v14)

```sql
CREATE INDEX IF NOT EXISTS idx_sessao_treinos_status_arquivado_inicio
  ON sessao_treinos (status, arquivado, data_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_sessao_treinos_treino_id
  ON sessao_treinos (treino_id);
CREATE INDEX IF NOT EXISTS idx_sessao_exercicios_sessao_treino_id
  ON sessao_exercicios (sessao_treino_id);
CREATE INDEX IF NOT EXISTS idx_sessao_exercicios_exercicio_id
  ON sessao_exercicios (exercicio_id);
CREATE INDEX IF NOT EXISTS idx_series_registradas_sessao_exercicio_id
  ON series_registradas (sessao_exercicio_id);
CREATE INDEX IF NOT EXISTS idx_registros_peso_data_registro
  ON registros_peso (data_registro);
CREATE INDEX IF NOT EXISTS idx_exercises_musculo_alvo
  ON exercises (musculo_alvo);
```

---

## Files Modified

| File | Change |
|---|---|
| `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts` | Append v14 migration string to `migrations` array |
| `apps/mobile/src/test/db-setup.ts` | Add v14 indexes to the test schema helper |

---

## Testing

No unit tests needed — `CREATE INDEX` is DDL and has no observable behavioral difference in InMemory repositories. Verification:

1. TypeScript compiles cleanly: `npx tsc --noEmit`
2. Full test suite passes: `npx vitest run`

---

## Implementation Notes

- "Haiku" model will be used for the implementing subagent.
- Single commit on `feat/pr4-sql-indexes`.
- No bootstrap wiring changes — indexes are transparent to the application layer.
