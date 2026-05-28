# Fix tie-breaking in getUltimasExecucoesValidas — ✅ IMPLEMENTADO (2026-05-27)

## Problem
When two sessions share the same `data_hora_fim`, the result of `getUltimasExecucoesValidas` is non-deterministic.
This causes inconsistent 1RM estimates in UI presenters that depend on this method.

## Solution
Use `MAX(st2.id)` as a tiebreaker in the SQL subquery.

### Changes
1. Added `MAX(st2.id) AS max_id` to the subquery that finds latest execution
2. Added `AND st.id = latest.max_id` to the JOIN condition
3. Created comprehensive tests in `SQLiteHistoricoRepository.tiebreak.test.ts`

### Tests
- Test 1: Verifies deterministic results across 10 repeated calls when two sessions have identical `data_hora_fim`
- Test 2: Verifies the higher-ID session is selected and its best 1RM is returned

### Test Results
```
Test Files  1 passed (1)
Tests  2 passed (2)
```
