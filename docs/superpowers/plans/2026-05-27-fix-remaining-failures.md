# Fix Remaining Test Failures Implementation Plan — ✅ IMPLEMENTADO (2026-05-27)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 9 failing individual tests and 3 suites that fail at import, reducing the failure count from 9 (tests) + 3 (suites) to 0.

**Architecture:** Three independent failure groups: (A) `DeleteSerieUseCase` has required deps the test doesn't provide — make them optional; (B) `tipoSerie` ('valida' | 'aquecimento') is missing from the `SerieRegistrada` and `ExecucaoExercicioSerie` domain types — add it and filter warm-up sets out of all presenter/use-case calculations; (C) `better-sqlite3` is not installed and `db-setup.ts` is missing migrations v6/v8/v9/v12 — install the package and add the missing `ALTER TABLE` statements.

**Tech Stack:** TypeScript, Vitest, better-sqlite3 (dev), InMemory and SQLite repositories.

---

### Task 1: Fix `DeleteSerieUseCase` optional dependencies

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/DeleteSerieUseCase.ts`

The test creates the use case with only `{ serieRegistradaRepository: repo }` but the interface requires two additional repos that are only needed for the session-active guard.

- [ ] **Step 1: Make `sessaoExercicioRepository` and `sessaoTreinoRepository` optional**

In `DeleteSerieUseCase.ts`, replace the `interface DeleteSerieUseCaseDependencies` block and guard inside `execute`:

```ts
interface DeleteSerieUseCaseDependencies {
  serieRegistradaRepository: SerieRegistradaRepository;
  sessaoExercicioRepository?: SessaoExercicioRepository;
  sessaoTreinoRepository?: SessaoTreinoRepository;
}
```

Inside `execute`, wrap the session guard with an existence check:

```ts
    // Check if the session is still active before deleting
    const seriePrim = serie.toPrimitives();
    if (this.dependencies.sessaoExercicioRepository) {
      const sessaoExercicio = await this.dependencies.sessaoExercicioRepository.findById(
        seriePrim.sessaoExercicioId
      );
      if (sessaoExercicio && this.dependencies.sessaoTreinoRepository) {
        const sessaoPrim = sessaoExercicio.toPrimitives();
        const sessao = await this.dependencies.sessaoTreinoRepository.findById(sessaoPrim.sessaoTreinoId);
        if (sessao && !sessao.isAtiva()) {
          throw new SessaoEncerradaError();
        }
      }
    }
```

- [ ] **Step 2: Run the failing test**

```
cd apps/mobile && npx vitest run src/application/sessoes/use-cases/DeleteSerieUseCase.test.ts
```

Expected: PASS — both tests green.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/DeleteSerieUseCase.ts
git commit -m "fix(sessoes): make DeleteSerieUseCase session guard deps optional"
```

---

### Task 2: Add `tipoSerie` to domain types

**Files:**
- Modify: `apps/mobile/src/domain/sessoes/entities/SerieRegistrada.ts`
- Modify: `apps/mobile/src/domain/historico/repositories/HistoricoRepository.ts`

This is the foundation — later tasks depend on these types existing.

- [ ] **Step 1: Add `tipoSerie` to `SerieRegistradaPrimitives` and `CreateSerieRegistradaProps`**

In `apps/mobile/src/domain/sessoes/entities/SerieRegistrada.ts`, replace the two interfaces:

```ts
export interface SerieRegistradaPrimitives {
  id: string;
  sessaoExercicioId: string;
  tipoSerie: 'valida' | 'aquecimento';
  ordem: number;
  cargaKg: number;
  repeticoes: number;
  observacao: string | null;
}

export interface CreateSerieRegistradaProps {
  id: string;
  sessaoExercicioId: string;
  tipoSerie?: 'valida' | 'aquecimento';
  ordem: number;
  cargaKg: number;
  repeticoes: number;
  observacao?: string;
}
```

In the `SerieRegistrada.create()` static method, add `tipoSerie` to the constructed primitives:

```ts
    return new SerieRegistrada({
      id: input.id,
      sessaoExercicioId: input.sessaoExercicioId,
      tipoSerie: input.tipoSerie ?? 'valida',
      ordem: input.ordem,
      cargaKg: input.cargaKg,
      repeticoes: input.repeticoes,
      observacao,
    });
```

- [ ] **Step 2: Add `tipoSerie` to `ExecucaoExercicioSerie`**

In `apps/mobile/src/domain/historico/repositories/HistoricoRepository.ts`, replace `ExecucaoExercicioSerie`:

```ts
export interface ExecucaoExercicioSerie {
  id: string;
  tipoSerie: 'valida' | 'aquecimento';
  cargaKg: number;
  repeticoes: number;
  observacao: string | null;
  ordem: number;
}
```

- [ ] **Step 3: Check TypeScript compiles cleanly**

```
cd apps/mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: Only errors about callers that haven't been updated yet (addressed in Tasks 3–5). No new errors introduced.

---

### Task 3: Update `RegistrarSerieUseCase` and `InMemorySerieRegistradaRepository`

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/RegistrarSerieUseCase.ts`
- Modify: `apps/mobile/src/infrastructure/sessoes/InMemorySerieRegistradaRepository.ts`

- [ ] **Step 1: Add `tipoSerie` to `RegistrarSerieInput`**

In `RegistrarSerieUseCase.ts`, add the optional field to the input interface:

```ts
export interface RegistrarSerieInput {
  sessaoExercicioId: string;
  cargaKg: number;
  repeticoes: number;
  tipoSerie?: 'valida' | 'aquecimento';
  observacao?: string;
}
```

In the `saveNew` closure inside `execute`, pass `tipoSerie`:

```ts
      serie = SerieRegistrada.create({
        id: this.dependencies.idGenerator(),
        sessaoExercicioId: input.sessaoExercicioId,
        tipoSerie: input.tipoSerie ?? 'valida',
        ordem: count + 1,
        cargaKg: input.cargaKg,
        repeticoes: input.repeticoes,
        observacao: input.observacao,
      });
```

- [ ] **Step 2: Preserve `tipoSerie` in `InMemorySerieRegistradaRepository.update()`**

In `InMemorySerieRegistradaRepository.ts`, in the `update` method, pass `tipoSerie` from the existing entity:

```ts
  async update(id: string, patch: { cargaKg: number; repeticoes: number; observacao?: string | null }): Promise<void> {
    const serie = this.seriesById.get(id);
    if (!serie) return;
    const p = serie.toPrimitives();
    const updated = SerieRegistrada.create({
      id: p.id,
      sessaoExercicioId: p.sessaoExercicioId,
      tipoSerie: p.tipoSerie,
      ordem: p.ordem,
      cargaKg: patch.cargaKg,
      repeticoes: patch.repeticoes,
      observacao: patch.observacao ?? undefined,
    });
    this.seriesById.set(id, updated);
  }
```

- [ ] **Step 3: Run existing RegistrarSerie tests**

```
cd apps/mobile && npx vitest run src/application/sessoes/use-cases/RegistrarSerieUseCase.test.ts
```

Expected: PASS — all existing tests still green.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/RegistrarSerieUseCase.ts apps/mobile/src/infrastructure/sessoes/InMemorySerieRegistradaRepository.ts
git commit -m "feat(sessoes): add tipoSerie to RegistrarSerieInput and InMemory update"
```

---

### Task 4: Filter `aquecimento` in use-cases and presenters

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/SugerirProgressaoUseCase.ts`
- Modify: `apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts`
- Modify: `apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.ts`
- Modify: `apps/mobile/src/ui/sessao/presenters/buildSessaoResumoViewModel.ts`

- [ ] **Step 1: Filter validas in `SugerirProgressaoUseCase._avaliar`**

In `SugerirProgressaoUseCase.ts`, replace the `_avaliar` private method:

```ts
  private _avaliar(input: SugerirProgressaoInput, execucoes: ExecucaoExercicio[]): SugestaoProgressao | null {
    const meta = input.execucoesRecomendadas;
    if (meta == null) return null;

    const ultimas2 = execucoes.slice(0, 2);
    if (ultimas2.length < 2) return null;

    for (const execucao of ultimas2) {
      const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
      if (validas.length === 0) return null;
      if (!validas.every((s) => s.repeticoes >= meta)) return null;
    }

    const validasUltima = ultimas2[0].series.filter((s) => s.tipoSerie === 'valida');
    const cargaReferencia =
      input.cargaPadrao ??
      Math.max(...validasUltima.map((s) => s.cargaKg));

    return {
      cargaSugerida: cargaReferencia + 2.5,
      motivo: `Meta de ${meta} reps atingida nas últimas 2 sessões`,
    };
  }
```

- [ ] **Step 2: Run SugerirProgressao test**

```
cd apps/mobile && npx vitest run src/application/sessoes/use-cases/SugerirProgressaoUseCase.test.ts
```

Expected: PASS — all 6 tests green.

- [ ] **Step 3: Filter validas in `InMemoryHistoricoRepository.getUltimaExecucaoValida`**

In `InMemoryHistoricoRepository.ts`, replace the `getUltimaExecucaoValida` method:

```ts
  async getUltimaExecucaoValida(exercicioId: string): Promise<UltimaExecucaoValida | null> {
    const execucoes = await this.getHistoricoExercicio(exercicioId);
    for (const execucao of execucoes) {
      const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
      if (validas.length === 0) continue;
      const melhor = validas.reduce((a, b) =>
        a.cargaKg * (1 + a.repeticoes / 30) >= b.cargaKg * (1 + b.repeticoes / 30) ? a : b
      );
      return { cargaKg: melhor.cargaKg, repeticoes: melhor.repeticoes, dataExecucao: execucao.dataExecucao };
    }
    return null;
  }
```

- [ ] **Step 4: Filter validas in `buildHistoricoExercicioViewModel`**

Replace the entire file `apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.ts` with:

```ts
import type { LineChartPoint } from '../../shared/LineChart';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';

export interface SerieHistoricoViewModel {
  id: string;
  descricao: string;
  rm1Estimado: string | null;
}

export interface ExecucaoHistoricoViewModel {
  data: string;
  melhorRm1: string;
  volumeTotal: string;
  series: SerieHistoricoViewModel[];
  substituiuLabel: string | null;
}

export interface PlateauInfo {
  sessoes: number;
  mensagem: string;
}

export interface HistoricoExercicioViewModel {
  exercicioNome: string;
  execucoes: ExecucaoHistoricoViewModel[];
  emptyStateMessage: string | null;
  rm1ChartPoints: LineChartPoint[];
  plateau: PlateauInfo | null;
}

const CHART_MAX = 14;

const SESSOES_PLATEAU = 4;
const MELHORA_MINIMA_KG = 1.0;

export function buildHistoricoExercicioViewModel(
  exercicioNome: string,
  execucoes: ExecucaoExercicio[]
): HistoricoExercicioViewModel {
  if (execucoes.length === 0) {
    return { exercicioNome, execucoes: [], emptyStateMessage: 'Nenhuma execucao registrada ainda.', rm1ChartPoints: [], plateau: null };
  }

  // execucoes vem desc (mais recente primeiro) — pega as últimas CHART_MAX e reverte para cronológico
  const rm1ChartPoints: LineChartPoint[] = execucoes
    .slice(0, CHART_MAX)
    .reverse()
    .map((ex) => {
      const validas = ex.series.filter((s) => s.tipoSerie === 'valida');
      const melhor = validas.reduce((max, s) => {
        const rm1 = s.cargaKg * (1 + s.repeticoes / 30);
        return rm1 > max ? rm1 : max;
      }, 0);
      return {
        value: parseFloat(melhor.toFixed(1)),
        label: formatShortDate(ex.dataExecucao),
      };
    })
    .filter((p) => p.value > 0);

  return {
    exercicioNome,
    execucoes: execucoes.map(buildExecucaoViewModel),
    emptyStateMessage: null,
    rm1ChartPoints,
    plateau: detectarPlateau(execucoes),
  };
}

function detectarPlateau(execucoes: ExecucaoExercicio[]): PlateauInfo | null {
  const comValidas = execucoes.filter((ex) =>
    ex.series.some((s) => s.tipoSerie === 'valida')
  );

  if (comValidas.length < SESSOES_PLATEAU) return null;

  const ultimas = comValidas.slice(0, SESSOES_PLATEAU);

  const rm1s = ultimas.map((ex) => {
    const validas = ex.series.filter((s) => s.tipoSerie === 'valida');
    return validas.reduce((max, s) => {
      const rm1 = s.cargaKg * (1 + s.repeticoes / 30);
      return rm1 > max ? rm1 : max;
    }, 0);
  });

  const maxNaJanela = Math.max(...rm1s);
  const rm1MaisAntigo = rm1s[SESSOES_PLATEAU - 1];

  if (maxNaJanela - rm1MaisAntigo < MELHORA_MINIMA_KG) {
    return {
      sessoes: SESSOES_PLATEAU,
      mensagem: `Sem melhora no 1RM estimado nas ultimas ${SESSOES_PLATEAU} sessoes. Considere aumentar volume, mudar a ordem dos exercicios ou trocar o estimulo.`,
    };
  }

  return null;
}

const MOTIVO_LABEL: Record<string, string> = {
  equipamento_indisponivel: 'equipamento indisponível',
  variacao: 'variação',
};

function buildExecucaoViewModel(execucao: ExecucaoExercicio): ExecucaoHistoricoViewModel {
  const validas = execucao.series.filter((s) => s.tipoSerie === 'valida');
  const melhorRm1 = validas.reduce((max, s) => {
    const rm1 = s.cargaKg * (1 + s.repeticoes / 30);
    return rm1 > max ? rm1 : max;
  }, 0);
  const volumeKg = validas.reduce((acc, s) => acc + s.cargaKg * s.repeticoes, 0);

  let substituiuLabel: string | null = null;
  if (execucao.substituiuExercicio ?? null) {
    const { nomeOriginal, motivo } = execucao.substituiuExercicio!;
    const motivoTexto = motivo ? ` · ${MOTIVO_LABEL[motivo] ?? motivo}` : '';
    substituiuLabel = `Substituiu: ${nomeOriginal}${motivoTexto}`;
  }

  return {
    data: formatDate(execucao.dataExecucao),
    melhorRm1: validas.length > 0 ? `${melhorRm1.toFixed(1)} kg` : '—',
    volumeTotal: validas.length > 0 ? formatVolume(volumeKg) : '—',
    series: execucao.series.map((s) => ({
      id: s.id,
      descricao: `${s.cargaKg} kg × ${s.repeticoes} rep`,
      rm1Estimado: s.tipoSerie === 'valida'
        ? `1RM ~${(s.cargaKg * (1 + s.repeticoes / 30)).toFixed(1)} kg`
        : null,
    })),
    substituiuLabel,
  };
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg} kg`;
}
```

- [ ] **Step 5: Run buildHistoricoExercicioViewModel tests**

```
cd apps/mobile && npx vitest run src/ui/historico/presenters/buildHistoricoExercicioViewModel.test.ts
```

Expected: PASS — all tests green including the 4 previously failing.

- [ ] **Step 6: Filter validas in `buildSessaoResumoViewModel`**

Replace the `buildSessaoResumoViewModel` function body in `apps/mobile/src/ui/sessao/presenters/buildSessaoResumoViewModel.ts`:

```ts
export function buildSessaoResumoViewModel(detalhe: SessaoDetalhe): SessaoResumoViewModel {
  const { sessao, exercicios } = detalhe;

  const duracao = calcularDuracao(sessao.dataHoraInicio, sessao.dataHoraFim);

  let totalSeriesValidas = 0;
  let volumeTotalKg = 0;

  const exerciciosVM: ExercicioResumoItem[] = exercicios.map(({ sessaoExercicio, series }) => {
    const validas = series.filter((s) => s.tipoSerie === 'valida');
    const volume = validas.reduce((acc, s) => acc + s.cargaKg * s.repeticoes, 0);

    totalSeriesValidas += validas.length;
    volumeTotalKg += volume;

    const melhor = validas.reduce<{ cargaKg: number; repeticoes: number } | null>((best, s) => {
      const rm = s.cargaKg * (1 + s.repeticoes / 30);
      const bestRm = best ? best.cargaKg * (1 + best.repeticoes / 30) : -1;
      return rm > bestRm ? s : best;
    }, null);

    return {
      nome: sessaoExercicio.nomeSnapshot,
      realizado: validas.length > 0,
      totalSeriesValidas: validas.length,
      volume,
      melhorSerie: melhor ? `${melhor.cargaKg}kg × ${melhor.repeticoes}` : null,
    };
  });

  return {
    treinoNome: sessao.treinoNomeSnapshot,
    duracao,
    totalExercicios: exercicios.length,
    exerciciosRealizados: exercicios.filter(({ series }) =>
      series.some((s) => s.tipoSerie === 'valida')
    ).length,
    totalSeriesValidas,
    volumeTotal: formatVolume(volumeTotalKg),
    exercicios: exerciciosVM,
  };
}
```

- [ ] **Step 7: Run buildSessaoResumoViewModel tests**

```
cd apps/mobile && npx vitest run src/ui/sessao/presenters/buildSessaoResumoViewModel.test.ts
```

Expected: PASS — all tests green including the 3 previously failing.

- [ ] **Step 8: Run full InMemory suite to check no regressions**

```
cd apps/mobile && npm test 2>&1 | grep -E "Tests|FAIL"
```

Expected: 0 individual test failures (only the 3 file-level suite failures from better-sqlite3 remain).

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/SugerirProgressaoUseCase.ts \
        apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts \
        apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.ts \
        apps/mobile/src/ui/sessao/presenters/buildSessaoResumoViewModel.ts
git commit -m "fix: filter aquecimento series from all presenter and progression calculations"
```

---

### Task 5: Add `tipoSerie` to SQLite repositories and add v18 DB migration

**Files:**
- Modify: `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`
- Modify: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

This task makes the SQLite path consistent with the domain changes. Migration v17 removed `tipo_serie`; v18 re-adds it with a safe default so all historical series appear as 'valida'.

- [ ] **Step 1: Add `tipo_serie` to `SQLiteSerieRegistradaRepository`**

In `apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`, replace `SerieRegistradaRow`:

```ts
interface SerieRegistradaRow {
  id: string;
  sessao_exercicio_id: string;
  tipo_serie: string;
  ordem: number;
  carga_kg: number;
  repeticoes: number;
  observacao: string | null;
}
```

Replace `save()`:

```ts
  async save(serie: SerieRegistrada): Promise<void> {
    const p = serie.toPrimitives();
    await this.database.run(
      `INSERT OR REPLACE INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.sessaoExercicioId, p.tipoSerie, p.ordem, p.cargaKg, p.repeticoes, p.observacao]
    );
  }
```

Replace `mapRow()` at the bottom:

```ts
function mapRow(row: SerieRegistradaRow): SerieRegistradaPrimitives {
  return {
    id: row.id,
    sessaoExercicioId: row.sessao_exercicio_id,
    tipoSerie: row.tipo_serie === 'aquecimento' ? 'aquecimento' : 'valida',
    ordem: row.ordem,
    cargaKg: row.carga_kg,
    repeticoes: row.repeticoes,
    observacao: row.observacao,
  };
}
```

- [ ] **Step 2: Add `tipo_serie` to `SQLiteHistoricoRepository`**

Read `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`.

Find the `HistoricoRow` interface and add `tipo_serie: string | null`.

Find the SELECT queries inside `getHistoricoExercicios` (the chunk loop) and add `sr.tipo_serie` to the column list:

```sql
SELECT se.exercicio_id, se.sessao_treino_id, se.nome_snapshot, st.data_hora_fim,
       se.nome_original_snapshot, se.substituicao_motivo,
       sr.id as serie_id, sr.tipo_serie, sr.carga_kg, sr.repeticoes, sr.observacao, sr.ordem
```

Find the `groupBySession` helper function. In the `series` mapping inside it, add `tipoSerie`:

```ts
    series: sessaoRows.map((r) => ({
      id: r.serie_id,
      tipoSerie: r.tipo_serie === 'aquecimento' ? 'aquecimento' : 'valida' as const,
      cargaKg: r.carga_kg,
      repeticoes: r.repeticoes,
      observacao: r.observacao,
      ordem: r.ordem ?? 0,
    })),
```

Also update `getHistoricoExercicio` if it has a separate SELECT — add `sr.tipo_serie` there too and map it the same way.

- [ ] **Step 3: Add v18 migration to `ExpoSQLiteDatabaseClient.ts`**

Read `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`. Find the `migrations` array. After the last entry (v17), add:

```ts
  // v18: re-add tipo_serie to series_registradas (removed in v17, restored for warm-up tracking)
  // Existing rows default to 'valida' which is semantically correct.
  `ALTER TABLE series_registradas ADD COLUMN tipo_serie TEXT NOT NULL DEFAULT 'valida';`,
```

- [ ] **Step 4: Run tests to confirm no regressions**

```
cd apps/mobile && npm test 2>&1 | grep -E "Tests|FAIL"
```

Expected: same as after Task 4 — 0 individual test failures, only the 3 suite-level failures from missing better-sqlite3.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts \
        apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts \
        apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "feat(db): re-add tipo_serie to series_registradas (v18) and update SQLite repos"
```

---

### Task 6: Install `better-sqlite3` and update `db-setup.ts`

**Files:**
- Modify: `apps/mobile/src/test/db-setup.ts`
- Run: `npm install` in `apps/mobile`

The 3 SQLite test files fail at import because `better-sqlite3` is in `package.json` but not in `node_modules`. Additionally, `db-setup.ts` is missing migrations added in v6, v8, v9, and v12 of `ExpoSQLiteDatabaseClient`, so inserting `SessaoExercicio` or `Exercise` rows would hit "no such column" errors even after the package is installed.

- [ ] **Step 1: Install `better-sqlite3`**

```
cd apps/mobile && npm install
```

Expected: `better-sqlite3` appears in `node_modules/better-sqlite3/`. This may take 1–2 minutes on first run (native compilation). If it fails with a node-gyp error, run:

```
cd apps/mobile && npm install better-sqlite3 --build-from-source
```

Verify:

```
cd apps/mobile && node -e "require('better-sqlite3'); console.log('OK')"
```

Expected: prints `OK`.

- [ ] **Step 2: Add missing migrations to `db-setup.ts`**

Read `apps/mobile/src/test/db-setup.ts`. After the existing v4 entry in the `migrations` array, add one more entry that brings the schema up to the v12 level (the columns used by the SQLite repositories):

```ts
    // v5-v12: columns added in production migrations that the SQL repos require
    `ALTER TABLE exercises ADD COLUMN media_online TEXT;
     ALTER TABLE exercises ADD COLUMN media_local TEXT;
     ALTER TABLE exercises ADD COLUMN musculo_alvo TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN tempo_descanso_segundos INTEGER;
     ALTER TABLE sessao_exercicios ADD COLUMN substituido_por_exercicio_id TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN substituicao_motivo TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN musculo_alvo_snapshot TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN nome_original_snapshot TEXT;
     ALTER TABLE sessao_exercicios ADD COLUMN metodo TEXT NOT NULL DEFAULT 'normal';
     ALTER TABLE sessao_exercicios ADD COLUMN grupo_id TEXT;
     ALTER TABLE treino_exercicios ADD COLUMN tempo_descanso_segundos INTEGER;
     ALTER TABLE treino_exercicios ADD COLUMN metodo TEXT NOT NULL DEFAULT 'normal';
     ALTER TABLE treino_exercicios ADD COLUMN grupo_id TEXT;`,
```

Note: the existing `try/catch` in `db-setup.ts` ignores "duplicate column name" errors, so this is safe to run even if some columns already exist.

- [ ] **Step 3: Run the 3 previously-broken suites**

```
cd apps/mobile && npx vitest run src/application/sessoes/use-cases/GetSessaoDetalheUseCase.p2.test.ts src/application/sessoes/use-cases/RegistrarSerieUseCase.p1.test.ts src/application/treinos/use-cases/ReordenarExerciciosUseCase.p1.test.ts
```

Expected: PASS — all 3 suites now run and their tests are green.

If any test fails with a "no such column" error, read the failing query, identify which column is missing, and add the corresponding `ALTER TABLE` to the migration block added in Step 2.

- [ ] **Step 4: Run the full test suite**

```
cd apps/mobile && npm test 2>&1 | tail -5
```

Expected: `Tests  0 failed | N passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/test/db-setup.ts
git commit -m "fix(test): add missing migrations to db-setup and install better-sqlite3"
```
