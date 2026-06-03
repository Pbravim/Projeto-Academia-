# P2 — Use Case Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add missing tests for 16 use cases that currently have no `.test.ts` file, bringing coverage from ~45% to ~100% of use cases.

**Architecture:** All tests follow the same pattern used throughout the project: InMemory repositories for domain-layer use cases, `vi.fn()` mocks for infrastructure-only repos (DashboardRepository, ExportarBanco), `vi.mock(...)` for platform APIs (expo-file-system, expo-sharing). See any existing `*.test.ts` in `application/` for the exact import and helper patterns. Test command: `npm --prefix apps/mobile test`.

**Tech Stack:** TypeScript, Vitest, InMemory repositories, vi.fn() mocks.

**Execution note:** Run Plan `2026-06-02-p2-performance-arch.md` first — Task 1 there fixes the N+1 in `GetSessaoDetalheUseCase` and Task 6 fixes `SugerirSubstitutosUseCase` matching. Tests here are written for the *corrected* behavior.

---

### Task 1: Exercises — ListExercisesUseCase + BaixarMidiaExercicioUseCase

**Files:**
- Create: `apps/mobile/src/application/exercises/use-cases/ListExercisesUseCase.test.ts`
- Create: `apps/mobile/src/application/exercises/use-cases/BaixarMidiaExercicioUseCase.test.ts`

- [ ] **Step 1: Write ListExercisesUseCase.test.ts**

```ts
// apps/mobile/src/application/exercises/use-cases/ListExercisesUseCase.test.ts
import { describe, expect, it } from 'vitest';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { ListExercisesUseCase } from './ListExercisesUseCase';

function makeExercise(id: string, name: string) {
  return Exercise.create({
    id,
    name,
    normalizedName: name.toLowerCase(),
    groupMuscle: 'Peito',
    isCustom: false,
    loadUnit: 'kg',
    createdAt: new Date('2026-01-01'),
  });
}

describe('ListExercisesUseCase', () => {
  it('returns empty array when no exercises', async () => {
    const repo = new InMemoryExerciseRepository();
    const result = await new ListExercisesUseCase(repo).execute();
    expect(result).toEqual([]);
  });

  it('returns exercises sorted A-Z', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e2', 'Supino'));
    await repo.save(makeExercise('e1', 'Agachamento'));
    await repo.save(makeExercise('e3', 'Rosca'));
    const result = await new ListExercisesUseCase(repo).execute();
    expect(result.map((e) => e.name)).toEqual(['Agachamento', 'Rosca', 'Supino']);
  });

  it('returns primitives (plain objects)', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', 'Supino'));
    const result = await new ListExercisesUseCase(repo).execute();
    expect(result[0]).toMatchObject({ id: 'e1', name: 'Supino' });
  });
});
```

- [ ] **Step 2: Write BaixarMidiaExercicioUseCase.test.ts**

`BaixarMidiaExercicioUseCase` uses the new `expo-file-system` API (Directory, File, Paths objects). Mock them.

```ts
// apps/mobile/src/application/exercises/use-cases/BaixarMidiaExercicioUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { BaixarMidiaExercicioUseCase } from './BaixarMidiaExercicioUseCase';

// Mock the new expo-file-system API
vi.mock('expo-file-system', () => {
  const mockFile = {
    exists: false,
    uri: 'file:///documents/exercises/e1_local.mp4',
    downloadContent: vi.fn().mockResolvedValue({ status: 200 }),
    copy: vi.fn(),
    delete: vi.fn(),
  };
  const mockDir = {
    exists: true,
    create: vi.fn(),
    uri: 'file:///documents/exercises/',
  };
  return {
    Directory: vi.fn(() => mockDir),
    File: vi.fn(() => mockFile),
    Paths: { document: 'file:///documents/' },
  };
});

function makeExercise(id: string, mediaOnline: string | null) {
  return Exercise.create({
    id,
    name: 'Supino',
    normalizedName: 'supino',
    groupMuscle: 'Peito',
    isCustom: false,
    loadUnit: 'kg',
    mediaOnline: mediaOnline ?? undefined,
    createdAt: new Date('2026-01-01'),
  });
}

describe('BaixarMidiaExercicioUseCase', () => {
  it('throws when exercise not found', async () => {
    const repo = new InMemoryExerciseRepository();
    const useCase = new BaixarMidiaExercicioUseCase({ exerciseRepository: repo });
    await expect(useCase.execute('nonexistent')).rejects.toThrow('Exercicio nao encontrado.');
  });

  it('throws when exercise has no mediaOnline', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', null));
    const useCase = new BaixarMidiaExercicioUseCase({ exerciseRepository: repo });
    await expect(useCase.execute('e1')).rejects.toThrow('Exercicio sem URL de midia.');
  });

  it('throws for YouTube URLs', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', 'https://youtube.com/watch?v=abc'));
    const useCase = new BaixarMidiaExercicioUseCase({ exerciseRepository: repo });
    await expect(useCase.execute('e1')).rejects.toThrow('nao pode ser baixado');
  });

  it('returns local URI on success', async () => {
    const repo = new InMemoryExerciseRepository();
    await repo.save(makeExercise('e1', 'https://example.com/video.mp4'));
    const useCase = new BaixarMidiaExercicioUseCase({ exerciseRepository: repo });
    const result = await useCase.execute('e1');
    expect(result).toContain('e1');
    expect(result).toMatch(/\.mp4$/);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose ListExercisesUseCase.test BaixarMidiaExercicioUseCase.test
```

Expected: all tests pass. If the `Directory`/`File` mock shape doesn't match, read `BaixarMidiaExercicioUseCase.ts` and adjust the mock to match the properties it accesses.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/application/exercises/use-cases/ListExercisesUseCase.test.ts \
        apps/mobile/src/application/exercises/use-cases/BaixarMidiaExercicioUseCase.test.ts
git commit -m "test(exercises): add ListExercisesUseCase and BaixarMidiaExercicioUseCase tests"
```

---

### Task 2: Treinos — ListTreinosUseCase + ListTreinoExerciciosUseCase

**Files:**
- Create: `apps/mobile/src/application/treinos/use-cases/ListTreinosUseCase.test.ts`
- Create: `apps/mobile/src/application/treinos/use-cases/ListTreinoExerciciosUseCase.test.ts`

The InMemory repos for treinos are at `apps/mobile/src/infrastructure/treinos/`. Read `UpdateTreinoUseCase.test.ts` to see exact import paths.

- [ ] **Step 1: Read UpdateTreinoUseCase.test.ts to get import paths**

Run: `cat "apps/mobile/src/application/treinos/use-cases/UpdateTreinoUseCase.test.ts" | head -20`

Note the exact paths for `InMemoryTreinoRepository`, `InMemoryTreinoExercicioRepository`, and the `Treino.create`/`TreinoExercicio.create` factory call signatures.

- [ ] **Step 2: Write ListTreinosUseCase.test.ts**

```ts
// apps/mobile/src/application/treinos/use-cases/ListTreinosUseCase.test.ts
import { describe, expect, it } from 'vitest';
// Adjust import paths from what you read in Step 1
import { InMemoryTreinoRepository } from '../../../infrastructure/treinos/InMemoryTreinoRepository';
import { Treino } from '../../../domain/treinos/entities/Treino';
import { ListTreinosUseCase } from './ListTreinosUseCase';

function makeTreino(id: string, name: string) {
  return Treino.create({ id, name, createdAt: new Date('2026-01-01') });
}

describe('ListTreinosUseCase', () => {
  it('returns empty array when no treinos', async () => {
    const repo = new InMemoryTreinoRepository();
    const result = await new ListTreinosUseCase(repo).execute();
    expect(result).toEqual([]);
  });

  it('returns all treinos as primitives', async () => {
    const repo = new InMemoryTreinoRepository();
    await repo.save(makeTreino('t1', 'Treino A'));
    await repo.save(makeTreino('t2', 'Treino B'));
    const result = await new ListTreinosUseCase(repo).execute();
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toContain('t1');
    expect(result.map((t) => t.id)).toContain('t2');
  });
});
```

- [ ] **Step 3: Write ListTreinoExerciciosUseCase.test.ts**

```ts
// apps/mobile/src/application/treinos/use-cases/ListTreinoExerciciosUseCase.test.ts
import { describe, expect, it } from 'vitest';
// Adjust import paths from what you read in Step 1
import { InMemoryTreinoExercicioRepository } from '../../../infrastructure/treinos/InMemoryTreinoExercicioRepository';
import { TreinoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { ListTreinoExerciciosUseCase } from './ListTreinoExerciciosUseCase';

function makeTE(id: string, treinoId: string, ordem: number) {
  return TreinoExercicio.create({
    id,
    treinoId,
    exercicioId: 'ex1',
    ordem,
    seriesRecomendadas: null,
    execucoesRecomendadas: null,
    cargaPadrao: null,
    tempoDescansoSegundos: null,
    metodo: 'normal',
    grupoId: null,
  });
}

describe('ListTreinoExerciciosUseCase', () => {
  it('returns empty array when no exercises for treino', async () => {
    const repo = new InMemoryTreinoExercicioRepository();
    const result = await new ListTreinoExerciciosUseCase(repo).execute('t1');
    expect(result).toEqual([]);
  });

  it('returns only exercises for the given treino', async () => {
    const repo = new InMemoryTreinoExercicioRepository();
    await repo.save(makeTE('te1', 't1', 0));
    await repo.save(makeTE('te2', 't2', 0));
    const result = await new ListTreinoExerciciosUseCase(repo).execute('t1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('te1');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose ListTreinosUseCase.test ListTreinoExerciciosUseCase.test
```

Expected: all tests pass. Fix any import path issues if InMemory repo paths differ.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/application/treinos/use-cases/ListTreinosUseCase.test.ts \
        apps/mobile/src/application/treinos/use-cases/ListTreinoExerciciosUseCase.test.ts
git commit -m "test(treinos): add ListTreinosUseCase and ListTreinoExerciciosUseCase tests"
```

---

### Task 3: Sessões — GetSessaoAtivaUseCase + ToggleExercicioRealizadoUseCase

**Files:**
- Create: `apps/mobile/src/application/sessoes/use-cases/GetSessaoAtivaUseCase.test.ts`
- Create: `apps/mobile/src/application/sessoes/use-cases/ToggleExercicioRealizadoUseCase.test.ts`

- [ ] **Step 1: Write GetSessaoAtivaUseCase.test.ts**

```ts
// apps/mobile/src/application/sessoes/use-cases/GetSessaoAtivaUseCase.test.ts
import { describe, expect, it } from 'vitest';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { GetSessaoAtivaUseCase } from './GetSessaoAtivaUseCase';

function makeSessaoAtiva(id = 's1') {
  return SessaoTreino.create({ id, treinoId: 't1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date('2026-01-01T10:00:00Z') });
}

describe('GetSessaoAtivaUseCase', () => {
  it('returns null when no active session', async () => {
    const repo = new InMemorySessaoTreinoRepository();
    const result = await new GetSessaoAtivaUseCase(repo).execute();
    expect(result).toBeNull();
  });

  it('returns active session primitives', async () => {
    const repo = new InMemorySessaoTreinoRepository();
    await repo.save(makeSessaoAtiva('s1'));
    const result = await new GetSessaoAtivaUseCase(repo).execute();
    expect(result?.id).toBe('s1');
    expect(result?.status).toBe('em_andamento');
  });

  it('returns null after session is finalized', async () => {
    const repo = new InMemorySessaoTreinoRepository();
    const sessao = makeSessaoAtiva('s1');
    sessao.finalizar(new Date('2026-01-01T11:00:00Z'));
    await repo.save(sessao);
    const result = await new GetSessaoAtivaUseCase(repo).execute();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Write ToggleExercicioRealizadoUseCase.test.ts**

```ts
// apps/mobile/src/application/sessoes/use-cases/ToggleExercicioRealizadoUseCase.test.ts
import { describe, expect, it } from 'vitest';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';
import { ToggleExercicioRealizadoUseCase } from './ToggleExercicioRealizadoUseCase';

function makeSessao(id = 's1') {
  return SessaoTreino.create({ id, treinoId: 't1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date('2026-01-01T10:00:00Z') });
}

function makeExercicio(id: string, sessaoId: string, realizado = false) {
  const se = SessaoExercicio.create({ id, sessaoTreinoId: sessaoId, exercicioId: 'ex1', ordem: 0, nomeSnapshot: 'Supino', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto' });
  return realizado ? se.withRealizado(true) : se;
}

describe('ToggleExercicioRealizadoUseCase', () => {
  it('toggles realizado from false to true', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const sessao = makeSessao();
    const se = makeExercicio('se1', sessao.toPrimitives().id, false);
    await sessaoRepo.save(sessao);
    await seRepo.save(se);
    const useCase = new ToggleExercicioRealizadoUseCase({ sessaoTreinoRepository: sessaoRepo, sessaoExercicioRepository: seRepo });
    const result = await useCase.execute('se1');
    expect(result.realizado).toBe(true);
  });

  it('toggles realizado from true to false', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const sessao = makeSessao();
    const se = makeExercicio('se1', sessao.toPrimitives().id, true);
    await sessaoRepo.save(sessao);
    await seRepo.save(se);
    const useCase = new ToggleExercicioRealizadoUseCase({ sessaoTreinoRepository: sessaoRepo, sessaoExercicioRepository: seRepo });
    const result = await useCase.execute('se1');
    expect(result.realizado).toBe(false);
  });

  it('throws SessaoExercicioNotFoundError when exercise not found', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const useCase = new ToggleExercicioRealizadoUseCase({ sessaoTreinoRepository: sessaoRepo, sessaoExercicioRepository: seRepo });
    await expect(useCase.execute('nonexistent')).rejects.toThrow(SessaoExercicioNotFoundError);
  });

  it('throws SessaoEncerradaError when session is finalized', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const sessao = makeSessao();
    sessao.finalizar(new Date('2026-01-01T11:00:00Z'));
    const se = makeExercicio('se1', sessao.toPrimitives().id);
    await sessaoRepo.save(sessao);
    await seRepo.save(se);
    const useCase = new ToggleExercicioRealizadoUseCase({ sessaoTreinoRepository: sessaoRepo, sessaoExercicioRepository: seRepo });
    await expect(useCase.execute('se1')).rejects.toThrow(SessaoEncerradaError);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose GetSessaoAtivaUseCase.test ToggleExercicioRealizadoUseCase.test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/GetSessaoAtivaUseCase.test.ts \
        apps/mobile/src/application/sessoes/use-cases/ToggleExercicioRealizadoUseCase.test.ts
git commit -m "test(sessoes): add GetSessaoAtivaUseCase and ToggleExercicioRealizadoUseCase tests"
```

---

### Task 4: Sessões — GetSessaoDetalheUseCase

**Files:**
- Create: `apps/mobile/src/application/sessoes/use-cases/GetSessaoDetalheUseCase.test.ts`

**Note:** After Plan `2026-06-02-p2-performance-arch.md` Task 1, `GetSessaoDetalheUseCase` uses `listBySessaoExercicioIds` instead of per-exercise calls. The InMemory repo will also have this method. Write the test against the corrected implementation.

- [ ] **Step 1: Write the test file**

```ts
// apps/mobile/src/application/sessoes/use-cases/GetSessaoDetalheUseCase.test.ts
import { describe, expect, it } from 'vitest';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';
import { GetSessaoDetalheUseCase } from './GetSessaoDetalheUseCase';

function makeSessao(id = 's1') {
  return SessaoTreino.create({ id, treinoId: 't1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date('2026-01-01T10:00:00Z') });
}
function makeSE(id: string, sessaoId: string, exercicioId = 'ex1') {
  return SessaoExercicio.create({ id, sessaoTreinoId: sessaoId, exercicioId, ordem: 0, nomeSnapshot: 'Supino', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto' });
}
function makeSerie(id: string, seId: string) {
  return SerieRegistrada.create({ id, sessaoExercicioId: seId, ordem: 0, cargaKg: 50, repeticoes: 10 });
}
function makeExercise(id: string) {
  return Exercise.create({ id, name: 'Supino', normalizedName: 'supino', groupMuscle: 'Peito', isCustom: false, loadUnit: 'kg', createdAt: new Date('2026-01-01') });
}

describe('GetSessaoDetalheUseCase', () => {
  it('throws SessaoNotFoundError when session does not exist', async () => {
    const deps = {
      sessaoTreinoRepository: new InMemorySessaoTreinoRepository(),
      sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
      serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
      exerciseRepository: new InMemoryExerciseRepository(),
    };
    await expect(new GetSessaoDetalheUseCase(deps).execute('nonexistent')).rejects.toThrow(SessaoNotFoundError);
  });

  it('returns session with exercises and series', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const seRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exRepo = new InMemoryExerciseRepository();

    const sessao = makeSessao('s1');
    const se = makeSE('se1', 's1', 'ex1');
    const serie = makeSerie('sr1', 'se1');
    const exercise = makeExercise('ex1');

    await sessaoRepo.save(sessao);
    await seRepo.save(se);
    await serieRepo.save(serie);
    await exRepo.save(exercise);

    const result = await new GetSessaoDetalheUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: seRepo,
      serieRegistradaRepository: serieRepo,
      exerciseRepository: exRepo,
    }).execute('s1');

    expect(result.sessao.id).toBe('s1');
    expect(result.exercicios).toHaveLength(1);
    expect(result.exercicios[0].sessaoExercicio.id).toBe('se1');
    expect(result.exercicios[0].series).toHaveLength(1);
    expect(result.exercicios[0].series[0].cargaKg).toBe(50);
  });

  it('returns session with no exercises when none added', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    await sessaoRepo.save(makeSessao('s1'));
    const result = await new GetSessaoDetalheUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
      serieRegistradaRepository: new InMemorySerieRegistradaRepository(),
      exerciseRepository: new InMemoryExerciseRepository(),
    }).execute('s1');
    expect(result.exercicios).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose GetSessaoDetalheUseCase.test
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/GetSessaoDetalheUseCase.test.ts
git commit -m "test(sessoes): add GetSessaoDetalheUseCase tests"
```

---

### Task 5: Sessões — SugerirSubstitutosUseCase + SugerirTreinoUseCase

**Files:**
- Create: `apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.test.ts`
- Create: `apps/mobile/src/application/sessoes/use-cases/SugerirTreinoUseCase.test.ts`

**Note:** `SugerirSubstitutosUseCase` tests reflect the corrected comma-split matching from Plan `2026-06-02-p2-performance-arch.md` Task 6. `SugerirTreinoUseCase` depends on `DashboardRepository` (no InMemory version) — mock with `vi.fn()`.

- [ ] **Step 1: Write SugerirSubstitutosUseCase.test.ts**

```ts
// apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.test.ts
import { describe, expect, it } from 'vitest';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';
import { SugerirSubstitutosUseCase } from './SugerirSubstitutosUseCase';

function makeSessao() {
  return SessaoTreino.create({ id: 's1', treinoId: 't1', treinoNomeSnapshot: 'Treino A', dataHoraInicio: new Date('2026-01-01T10:00:00Z') });
}
function makeSE(id: string, exercicioId: string) {
  return SessaoExercicio.create({ id, sessaoTreinoId: 's1', exercicioId, ordem: 0, nomeSnapshot: 'X', grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto' });
}
function makeExercise(id: string, groupMuscle: string) {
  return Exercise.create({ id, name: `Ex-${id}`, normalizedName: id, groupMuscle, isCustom: false, loadUnit: 'kg', createdAt: new Date('2026-01-01') });
}

describe('SugerirSubstitutosUseCase', () => {
  it('throws SessaoExercicioNotFoundError when se not found', async () => {
    const useCase = new SugerirSubstitutosUseCase({
      sessaoExercicioRepository: new InMemorySessaoExercicioRepository(),
      exerciseRepository: new InMemoryExerciseRepository(),
      historicoRepository: new InMemoryHistoricoRepository(),
    });
    await expect(useCase.execute('nonexistent')).rejects.toThrow(SessaoExercicioNotFoundError);
  });

  it('suggests exercises with same muscle group, excludes ones already in session', async () => {
    const seRepo = new InMemorySessaoExercicioRepository();
    const exRepo = new InMemoryExerciseRepository();

    await seRepo.save(makeSE('se1', 'ex1'));
    await exRepo.save(makeExercise('ex1', 'Peito'));  // the original (in session)
    await exRepo.save(makeExercise('ex2', 'Peito'));  // same muscle — should be suggested
    await exRepo.save(makeExercise('ex3', 'Costas')); // different muscle — not suggested in tier 2
    await exRepo.save(makeExercise('ex4', 'Peito'));  // another same muscle — should be suggested

    const useCase = new SugerirSubstitutosUseCase({
      sessaoExercicioRepository: seRepo,
      exerciseRepository: exRepo,
      historicoRepository: new InMemoryHistoricoRepository(),
    });

    const result = await useCase.execute('se1');
    const ids = result.map((r) => r.exercicio.id);
    expect(ids).toContain('ex2');
    expect(ids).toContain('ex4');
    expect(ids).not.toContain('ex1'); // the original, already in session
  });
});
```

- [ ] **Step 2: Write SugerirTreinoUseCase.test.ts**

```ts
// apps/mobile/src/application/sessoes/use-cases/SugerirTreinoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { SugerirTreinoUseCase } from './SugerirTreinoUseCase';
import type { DashboardRepository, TreinoComUltimaSessao } from '../../../domain/dashboard/repositories/DashboardRepository';

const treinoRow: TreinoComUltimaSessao = {
  id: 't1', name: 'Treino A', objetivo: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', ultimaSessao: null,
};

function makeDashboardRepo(override?: Partial<DashboardRepository>): DashboardRepository {
  return {
    getStats: vi.fn(),
    getEvolucaoExercicios: vi.fn(),
    arquivarSessao: vi.fn(),
    desarquivarSessao: vi.fn(),
    deletarSessao: vi.fn(),
    findSugestaoRotacao: vi.fn().mockResolvedValue(treinoRow),
    findTreinoComUltimaSessao: vi.fn().mockResolvedValue(treinoRow),
    ...override,
  } as never;
}

describe('SugerirTreinoUseCase', () => {
  it('returns null when no treinos exist', async () => {
    const repo = makeDashboardRepo({ findSugestaoRotacao: vi.fn().mockResolvedValue(null) });
    const result = await new SugerirTreinoUseCase({ dashboardRepository: repo }).execute();
    expect(result).toBeNull();
  });

  it('returns rotacao suggestion with fonte=rotacao when no plano', async () => {
    const repo = makeDashboardRepo();
    const result = await new SugerirTreinoUseCase({ dashboardRepository: repo }).execute();
    expect(result?.treino.id).toBe('t1');
    expect(result?.fonte).toBe('rotacao');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose SugerirSubstitutosUseCase.test SugerirTreinoUseCase.test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.test.ts \
        apps/mobile/src/application/sessoes/use-cases/SugerirTreinoUseCase.test.ts
git commit -m "test(sessoes): add SugerirSubstitutosUseCase and SugerirTreinoUseCase tests"
```

---

### Task 6: Dashboard — Arquivar + Desarquivar + Deletar

**Files:**
- Create: `apps/mobile/src/application/dashboard/use-cases/ArquivarSessaoUseCase.test.ts`
- Create: `apps/mobile/src/application/dashboard/use-cases/DesarquivarSessaoUseCase.test.ts`
- Create: `apps/mobile/src/application/dashboard/use-cases/DeletarSessaoUseCase.test.ts`

All three use `DashboardRepository` with no InMemory version — mock with `vi.fn()`.

- [ ] **Step 1: Read ArquivarSessaoUseCase.ts, DesarquivarSessaoUseCase.ts, DeletarSessaoUseCase.ts**

Note the error types they throw (e.g., `SessaoNotFoundError`) and the method signatures they call on the repo.

- [ ] **Step 2: Write ArquivarSessaoUseCase.test.ts**

```ts
// apps/mobile/src/application/dashboard/use-cases/ArquivarSessaoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { ArquivarSessaoUseCase } from './ArquivarSessaoUseCase';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

function makeRepo(rowsAffected: number) {
  return { arquivarSessao: vi.fn().mockResolvedValue(rowsAffected) } as never;
}

describe('ArquivarSessaoUseCase', () => {
  it('calls arquivarSessao with the sessaoId', async () => {
    const repo = makeRepo(1);
    await new ArquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1');
    expect(repo.arquivarSessao).toHaveBeenCalledWith('s1');
  });

  it('throws SessaoNotFoundError when rowsAffected is 0', async () => {
    const repo = makeRepo(0);
    await expect(new ArquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1'))
      .rejects.toThrow(SessaoNotFoundError);
  });
});
```

- [ ] **Step 3: Write DesarquivarSessaoUseCase.test.ts**

```ts
// apps/mobile/src/application/dashboard/use-cases/DesarquivarSessaoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { DesarquivarSessaoUseCase } from './DesarquivarSessaoUseCase';
import { SessaoNotFoundError } from '../errors/SessaoNotFoundError';

function makeRepo(rowsAffected: number) {
  return { desarquivarSessao: vi.fn().mockResolvedValue(rowsAffected) } as never;
}

describe('DesarquivarSessaoUseCase', () => {
  it('calls desarquivarSessao with the sessaoId', async () => {
    const repo = makeRepo(1);
    await new DesarquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1');
    expect(repo.desarquivarSessao).toHaveBeenCalledWith('s1');
  });

  it('throws SessaoNotFoundError when rowsAffected is 0', async () => {
    const repo = makeRepo(0);
    await expect(new DesarquivarSessaoUseCase({ dashboardRepository: repo }).execute('s1'))
      .rejects.toThrow(SessaoNotFoundError);
  });
});
```

- [ ] **Step 4: Write DeletarSessaoUseCase.test.ts**

```ts
// apps/mobile/src/application/dashboard/use-cases/DeletarSessaoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { DeletarSessaoUseCase } from './DeletarSessaoUseCase';

describe('DeletarSessaoUseCase', () => {
  it('calls deletarSessao with the sessaoId', async () => {
    const repo = { deletarSessao: vi.fn().mockResolvedValue(undefined) } as never;
    await new DeletarSessaoUseCase({ dashboardRepository: repo }).execute('s1');
    expect(repo.deletarSessao).toHaveBeenCalledWith('s1');
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose ArquivarSessaoUseCase.test DesarquivarSessaoUseCase.test DeletarSessaoUseCase.test
```

Expected: all tests pass. If any error class import paths differ, check the actual file and fix imports.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/application/dashboard/use-cases/ArquivarSessaoUseCase.test.ts \
        apps/mobile/src/application/dashboard/use-cases/DesarquivarSessaoUseCase.test.ts \
        apps/mobile/src/application/dashboard/use-cases/DeletarSessaoUseCase.test.ts
git commit -m "test(dashboard): add ArquivarSessaoUseCase, DesarquivarSessaoUseCase, DeletarSessaoUseCase tests"
```

---

### Task 7: Dashboard — GetDashboardStatsUseCase + GetTreinoEvolucaoUseCase

**Files:**
- Create: `apps/mobile/src/application/dashboard/use-cases/GetDashboardStatsUseCase.test.ts`
- Create: `apps/mobile/src/application/dashboard/use-cases/GetTreinoEvolucaoUseCase.test.ts`

First read both use case files to understand their execute() signatures.

- [ ] **Step 1: Read GetDashboardStatsUseCase.ts and GetTreinoEvolucaoUseCase.ts**

These use `DashboardRepository.getStats()` and `getEvolucaoExercicios(treinoId)` respectively.

- [ ] **Step 2: Write GetDashboardStatsUseCase.test.ts**

```ts
// apps/mobile/src/application/dashboard/use-cases/GetDashboardStatsUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { GetDashboardStatsUseCase } from './GetDashboardStatsUseCase';
import type { DashboardStats } from '../../../domain/dashboard/repositories/DashboardRepository';

const statsBase: DashboardStats = {
  totalSessoes: 5,
  sessoesUltimoMes: 2,
  aderenciaSemanal: [],
  aderenciaMensal: [],
  aderenciaAnual: [],
  evolucaoPorTreino: [],
  recordesPessoais: [],
};

describe('GetDashboardStatsUseCase', () => {
  it('returns stats from repository', async () => {
    const repo = { getStats: vi.fn().mockResolvedValue(statsBase) } as never;
    const result = await new GetDashboardStatsUseCase(repo).execute();
    expect(result).toEqual(statsBase);
    expect(repo.getStats).toHaveBeenCalledOnce();
  });

  it('propagates errors from repository', async () => {
    const repo = { getStats: vi.fn().mockRejectedValue(new Error('db error')) } as never;
    await expect(new GetDashboardStatsUseCase(repo).execute()).rejects.toThrow('db error');
  });
});
```

- [ ] **Step 3: Write GetTreinoEvolucaoUseCase.test.ts**

```ts
// apps/mobile/src/application/dashboard/use-cases/GetTreinoEvolucaoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { GetTreinoEvolucaoUseCase } from './GetTreinoEvolucaoUseCase';
import type { ExercicioEvolucao } from '../../../domain/dashboard/repositories/DashboardRepository';

const evolucaoBase: ExercicioEvolucao[] = [
  { exercicioId: 'ex1', exercicioNome: 'Supino', groupMuscle: 'Peito', sessoes: [] },
];

describe('GetTreinoEvolucaoUseCase', () => {
  it('returns evolucao for the given treinoId', async () => {
    const repo = { getEvolucaoExercicios: vi.fn().mockResolvedValue(evolucaoBase) } as never;
    const result = await new GetTreinoEvolucaoUseCase(repo).execute('t1');
    expect(result).toEqual(evolucaoBase);
    expect(repo.getEvolucaoExercicios).toHaveBeenCalledWith('t1');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose GetDashboardStatsUseCase.test GetTreinoEvolucaoUseCase.test
```

Expected: all tests pass. Adjust the `DashboardStats` fixture to match the actual type if needed.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/application/dashboard/use-cases/GetDashboardStatsUseCase.test.ts \
        apps/mobile/src/application/dashboard/use-cases/GetTreinoEvolucaoUseCase.test.ts
git commit -m "test(dashboard): add GetDashboardStatsUseCase and GetTreinoEvolucaoUseCase tests"
```

---

### Task 8: Dashboard — ExportarHistoricoUseCase + ExportarBancoUseCase

**Files:**
- Create: `apps/mobile/src/application/dashboard/use-cases/ExportarHistoricoUseCase.test.ts`
- Create: `apps/mobile/src/application/dashboard/use-cases/ExportarBancoUseCase.test.ts`

Both use platform APIs (expo-sharing, expo-file-system) that require `vi.mock`. First read both use case files.

- [ ] **Step 1: Read ExportarHistoricoUseCase.ts and ExportarBancoUseCase.ts**

Note what expo-sharing methods they call and what arguments they receive.

- [ ] **Step 2: Write ExportarHistoricoUseCase.test.ts**

```ts
// apps/mobile/src/application/dashboard/use-cases/ExportarHistoricoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { ExportarHistoricoUseCase } from './ExportarHistoricoUseCase';

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('expo-file-system', () => ({
  documentDirectory: 'file:///docs/',
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
  deleteAsync: vi.fn().mockResolvedValue(undefined),
  File: vi.fn(() => ({ exists: false, uri: 'file:///docs/historico.csv', delete: vi.fn() })),
  Paths: { document: 'file:///docs/' },
  Directory: vi.fn(() => ({ exists: true, create: vi.fn(), uri: 'file:///docs/' })),
}));

// InMemory or mock repo depending on what ExportarHistoricoUseCase needs — read the file first
describe('ExportarHistoricoUseCase', () => {
  it('calls shareAsync with the CSV path', async () => {
    const { shareAsync } = await import('expo-sharing');
    // Adjust the repo mock to match ExportarHistoricoUseCase's actual dependencies
    const repo = { getSeriesFinalizadas: vi.fn().mockResolvedValue([]) } as never;
    // The constructor signature may differ — read the file and adjust
    const useCase = new ExportarHistoricoUseCase(repo);
    await useCase.execute();
    expect(shareAsync).toHaveBeenCalled();
  });
});
```

**Important:** Read `ExportarHistoricoUseCase.ts` before implementing. The constructor accepts a `SessaoTreinoRepository` or similar. Adjust the mock to match.

- [ ] **Step 3: Write ExportarBancoUseCase.test.ts**

`ExportarBancoUseCase` depends on `ExpoSQLiteDatabaseClient`. After Plan `2026-06-02-p2-performance-arch.md` Task 5, it accepts a `DatabaseExportPort` interface instead.

```ts
// apps/mobile/src/application/dashboard/use-cases/ExportarBancoUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { ExportarBancoUseCase } from './ExportarBancoUseCase';

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('expo-file-system', () => ({
  File: vi.fn(() => ({ exists: true, uri: 'file:///docs/SQLite/db.db', delete: vi.fn(), copy: vi.fn() })),
  Directory: vi.fn(() => ({ exists: true, uri: 'file:///docs/SQLite/' })),
  Paths: { document: 'file:///docs/', cache: 'file:///cache/' },
}));

describe('ExportarBancoUseCase', () => {
  it('calls checkpointWal and shareAsync', async () => {
    const { shareAsync } = await import('expo-sharing');
    // After the DIP fix, databaseClient accepts DatabaseExportPort interface
    const databaseClient = {
      checkpointWal: vi.fn().mockResolvedValue(undefined),
      databaseFileName: 'academia.db',
    } as never;
    const useCase = new ExportarBancoUseCase({ databaseClient });
    await useCase.execute();
    expect(databaseClient.checkpointWal).toHaveBeenCalled();
    expect(shareAsync).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose ExportarHistoricoUseCase.test ExportarBancoUseCase.test
```

Expected: all tests pass. Both require careful mock alignment with the actual file implementation.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/application/dashboard/use-cases/ExportarHistoricoUseCase.test.ts \
        apps/mobile/src/application/dashboard/use-cases/ExportarBancoUseCase.test.ts
git commit -m "test(dashboard): add ExportarHistoricoUseCase and ExportarBancoUseCase tests"
```

---

### Task 9: Verify full suite

- [ ] **Step 1: Run all tests**

```bash
npm --prefix apps/mobile test
```

Expected: 234+ tests passing (was 218 before this plan), 0 failures.
