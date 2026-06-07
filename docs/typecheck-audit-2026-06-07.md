# Typecheck Audit — 2026-06-07

> **Status: RESOLVED.** All 27 errors below were fixed across commits
> `a705308` (Group A), `2fed0d3` (Group B), `f4ed2c1` (Group C), and `b6b3a0e`
> (Group D + the two cascading errors that surfaced once the others were
> fixed). `npm --prefix apps/mobile run typecheck` now reports zero errors;
> all 311 tests still pass. Kept below for historical reference.

Pre-existing typecheck errors found while finishing sub-project 5 (exercise
intelligence). None of these block sub-5 — they predate it (verified against
`034d39b`, the commit before this session's work: 29 errors there vs 27 now).
Captured here so they can be fixed in a follow-up batch.

Run: `npm --prefix apps/mobile run typecheck`

---

## Group A — `as never` mock-typing pattern (7 files, 14 errors)

Test files cast a partial mock object directly `as never`, which makes every
property access on it (`repo.setDia`, `repo.arquivarSessao`, …) fail with
`Property 'X' does not exist on type 'never'`. The fix is to cast through
`unknown` to the actual repository/dependency interface type instead, e.g.:

```typescript
// before
const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as never;

// after
const repo = { setDia: vi.fn().mockResolvedValue(undefined) } as unknown as PlanoRepository;
```

Files:
- `src/application/plano/use-cases/SetDiaPlanoUseCase.test.ts` (4 occurrences — `PlanoRepository`)
- `src/application/dashboard/use-cases/ArquivarSessaoUseCase.test.ts` (2 — `SessaoRepository` or whatever `ArquivarSessaoUseCase` depends on)
- `src/application/dashboard/use-cases/DeletarSessaoUseCase.test.ts` (2)
- `src/application/dashboard/use-cases/DesarquivarSessaoUseCase.test.ts` (2)
- `src/application/dashboard/use-cases/GetDashboardStatsUseCase.test.ts` (2 — also `stats` object cast)
- `src/application/dashboard/use-cases/GetTreinoEvolucaoUseCase.test.ts` (2 — also `data` array cast)
- `src/application/dashboard/use-cases/ExportarBancoUseCase.test.ts` (1 — `checkpointWal`)

For each file, open the use-case under test to find the actual dependency
interface name/import path, then cast to that type (`as unknown as <Interface>`)
instead of `as never`.

---

## Group B — Test fixture drift vs. current entity/type shapes (5 files, 10 errors)

Entities changed shape (sub-5's array-based `musculoAlvo`, `tipoSerie` on series,
etc.) and these fixtures weren't updated:

1. **`normalizedName` no longer accepted in `CreateExerciseProps`** (it's derived
   from `name` inside `Exercise.create`) — remove the `normalizedName: '...'` line
   from the fixture object literals:
   - `src/application/sessoes/use-cases/GetSessaoDetalheUseCase.p2.test.ts` lines ~51, ~61
   - `src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.test.ts` line ~50

2. **`TreinoExercicioPrimitives` missing required fields** in object literals
   passed to `teRepo.save(...)` / similar — compare against the current
   `TreinoExercicioPrimitives` type (likely needs `cargaPadrao`,
   `seriesRecomendadas`, `execucoesRecomendadas`, etc.) and add the missing fields:
   - `src/application/treinos/use-cases/ReordenarExerciciosUseCase.test.ts` lines ~22-24 (3 occurrences)
   - `src/application/sessoes/use-cases/RegistrarSerieUseCase.p1.test.ts` line ~75

3. **`ExecucaoExercicioSerie` requires `tipoSerie`** — the seeded `series` array
   entries are missing `tipoSerie: 'valida' | 'aquecimento'`:
   - `src/application/historico/use-cases/GetHistoricoExercicioUseCase.test.ts` lines ~45-47 (add `tipoSerie: 'valida'` to each series fixture, matching the existing test's intent — check surrounding assertions to confirm `'valida'` is correct rather than `'aquecimento'`)

---

## Group C — Invalid `as const` on conditional expressions (2 files, 2 errors)

`TS1355: A 'const' assertion can only be applied to references to enum members,
or string, number, boolean, array, or object literals.`

Both are the same pattern — a ternary already produces the literal union type
`'aquecimento' | 'valida'`, so `as const` is both invalid and unnecessary. Just
remove ` as const`:

```typescript
// before
tipoSerie: (row.tipo_serie === 'aquecimento' ? 'aquecimento' : 'valida') as const,

// after
tipoSerie: row.tipo_serie === 'aquecimento' ? 'aquecimento' : 'valida',
```

Files:
- `src/infrastructure/historico/SQLiteHistoricoRepository.ts` line 162
- `src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts` line 142

---

## Group D — Misc one-off errors (5 files, 5 errors)

Each needs individual investigation — no shared pattern:

1. **`src/app/MobileApp.tsx(139,13)`** — `TS2322`: the `dependencies` object passed
   to `<SessaoFeature>` doesn't satisfy `SessaoFeatureDependencies` (missing
   `feature.sugerirSubstitutos`? — check the type definition vs. what
   `mobileDependencies.sessao` actually provides, likely a bootstrap wiring gap
   from one of the recent sub-5 use-case additions).

2. **`src/application/exercises/use-cases/BaixarMidiaExercicioUseCase.ts(59,24)`**
   — `TS2339: Property 'name' does not exist on type 'File'`. `downloadedFile` is
   typed as the Expo `File` (from `expo-file-system/next`), which has no `.name`.
   Find the correct property (likely `.uri` parsed for a filename, or there's a
   different type/import that does expose `name`) and use that instead.

3. **`src/application/exercises/use-cases/BaixarMidiasTreinoUseCase.test.ts(8,5)`**
   — `TS2554: Expected 1-2 arguments, but got 3` on a `vi.mock(...)` call (the
   3-arg form with `{ virtual: true }` may no longer be the right signature for
   the installed vitest version — check how other test files in this repo mock
   `expo-file-system/next` and align this one to that pattern).

4. **`src/test/db-setup.ts(1,22)`** — `TS7016`: missing type declarations for
   `better-sqlite3`. Check if `@types/better-sqlite3` is installed as a dev
   dependency; if not, add it (`npm --prefix apps/mobile install -D
   @types/better-sqlite3`) or add a local `.d.ts` declaration if a `@types`
   package doesn't exist for the installed version.

5. **`src/ui/exercises/hooks/useExerciseCatalogController.test.tsx(28,3)`** —
   `TS2322: Type 'string' is not assignable to type 'string[]'` — the fixture has
   `musculoAlvo: 'Peito'` (a string) where `ExercisePrimitives.musculoAlvo` is now
   `string[]`. Change to `musculoAlvo: ['Peito']` (or whatever muscle id makes
   sense given the surrounding test). Note: this file is also the one with a
   pre-existing, unrelated rolldown/react-native parse failure at runtime — fixing
   this typecheck error won't fix that; leave the runtime failure alone.

---

## Verification after each group

```bash
npm --prefix apps/mobile run typecheck 2>&1 | grep -c "error TS"   # should drop by the group's error count
npm --prefix apps/mobile test 2>&1 | tail -6                        # 311 passing, no new failures
```

Baseline: 27 errors total (29 before sub-5's Task 11/12 fixes incidentally fixed 2).
