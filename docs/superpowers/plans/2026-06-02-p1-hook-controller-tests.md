# Hook Controller Tests — P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add test files for the four hook controllers that currently have none: `useDashboardController`, `useTreinoEvolucaoController`, `useStatsController`, and `usePerfilController`. Sessão and exercise catalog controllers already have tests; these are the remaining critical paths.

**Architecture:** All tests use the custom `renderHook` helper at `apps/mobile/src/test/renderHook.tsx` (wraps `react-test-renderer`). Dependencies are mocked with `vi.fn()`. The `flush()` helper (3× `act(async () => await Promise.resolve())`) drains the microtask queue. `usePerfilController` requires mocking `expo-image-picker` and `expo-sqlite/kv-store`.

**Tech Stack:** TypeScript, Vitest, react-test-renderer, vi.fn() mocks.

**Test command:** `npm --prefix apps/mobile test`

---

### Task 1: `useDashboardController` tests

**Files:**
- Create: `apps/mobile/src/ui/dashboard/hooks/useDashboardController.test.tsx`
- Read reference: `apps/mobile/src/ui/dashboard/hooks/useDashboardController.ts`

- [ ] **Step 1: Write the test file**

```tsx
// apps/mobile/src/ui/dashboard/hooks/useDashboardController.test.tsx
import { describe, expect, it, vi } from 'vitest';

import { renderHook, act } from '../../../test/renderHook';
import {
  useDashboardController,
  type DashboardControllerDependencies,
} from './useDashboardController';
import type { DashboardStats } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';

const statsBase: DashboardStats = {
  totalSessoes: 5,
  sessoesMes: 2,
  recordes: [],
  treinoStats: [],
  aderencia: { semanal: [], mensal: [], anual: [] },
};

function makeDeps(overrides?: Partial<DashboardControllerDependencies>): DashboardControllerDependencies {
  return {
    getDashboardStats: { execute: vi.fn().mockResolvedValue(statsBase) } as never,
    resetHistorico: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    exportarHistorico: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    arquivarSessao: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    desarquivarSessao: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    deletarSessao: { execute: vi.fn().mockResolvedValue(undefined) } as never,
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ...overrides,
  };
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('useDashboardController', () => {
  it('loads stats on mount', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));
    await flush();
    expect(result.current.stats).toEqual(statsBase);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets errorMessage when load fails', async () => {
    const deps = makeDeps({
      getDashboardStats: { execute: vi.fn().mockRejectedValue(new Error('db error')) } as never,
    });
    const { result } = await renderHook(() => useDashboardController(deps));
    await flush();
    expect(result.current.stats).toBeNull();
    expect(result.current.errorMessage).toBeTruthy();
  });

  it('onReset reloads stats after success', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));
    await flush();
    await act(async () => { await result.current.onReset(); });
    await flush();
    expect(deps.resetHistorico.execute).toHaveBeenCalledTimes(1);
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(2);
  });

  it('onExportar calls exportarHistorico', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));
    await flush();
    await act(async () => { await result.current.onExportar(); });
    expect(deps.exportarHistorico.execute).toHaveBeenCalledTimes(1);
  });

  it('onDeletarSessao calls deletarSessao then reloads', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));
    await flush();
    await act(async () => { await result.current.onDeletarSessao('s1'); });
    await flush();
    expect(deps.deletarSessao.execute).toHaveBeenCalledWith('s1');
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(2);
  });

  it('onArquivarSessao calls arquivarSessao then reloads', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useDashboardController(deps));
    await flush();
    await act(async () => { await result.current.onArquivarSessao('s1'); });
    await flush();
    expect(deps.arquivarSessao.execute).toHaveBeenCalledWith('s1');
    expect(deps.getDashboardStats.execute).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose useDashboardController.test
```

Expected: 6 tests pass. If `DashboardStats` type differs (e.g., `aderencia` shape), adjust `statsBase` to match what the real type requires.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/ui/dashboard/hooks/useDashboardController.test.tsx
git commit -m "test(dashboard): add useDashboardController tests"
```

---

### Task 2: `useTreinoEvolucaoController` tests

**Files:**
- Create: `apps/mobile/src/ui/dashboard/hooks/useTreinoEvolucaoController.test.tsx`
- Read reference: `apps/mobile/src/ui/dashboard/hooks/useTreinoEvolucaoController.ts`

- [ ] **Step 1: Write the test file**

```tsx
// apps/mobile/src/ui/dashboard/hooks/useTreinoEvolucaoController.test.tsx
import { describe, expect, it, vi } from 'vitest';

import { renderHook, act } from '../../../test/renderHook';
import {
  useTreinoEvolucaoController,
  type TreinoEvolucaoControllerDeps,
} from './useTreinoEvolucaoController';
import type { ExercicioEvolucao } from '../../../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';

const evolucaoBase: ExercicioEvolucao[] = [
  {
    exercicioId: 'ex1',
    exercicioNome: 'Supino',
    sessoes: [
      { data: '2026-01-01', rmEstimado: 80, volume: 1200 },
    ],
  },
];

function makeDeps(overrides?: Partial<TreinoEvolucaoControllerDeps>): TreinoEvolucaoControllerDeps {
  return {
    getTreinoEvolucao: { execute: vi.fn().mockResolvedValue(evolucaoBase) } as never,
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ...overrides,
  };
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('useTreinoEvolucaoController', () => {
  it('loads evolucao on mount for given treinoId', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useTreinoEvolucaoController('t1', deps));
    await flush();
    expect(result.current.exercicios).toEqual(evolucaoBase);
    expect(result.current.isLoading).toBe(false);
    expect(deps.getTreinoEvolucao.execute).toHaveBeenCalledWith('t1');
  });

  it('sets errorMessage when load fails', async () => {
    const deps = makeDeps({
      getTreinoEvolucao: { execute: vi.fn().mockRejectedValue(new Error('db error')) } as never,
    });
    const { result } = await renderHook(() => useTreinoEvolucaoController('t1', deps));
    await flush();
    expect(result.current.exercicios).toEqual([]);
    expect(result.current.errorMessage).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose useTreinoEvolucaoController.test
```

Expected: 2 tests pass. If the `ExercicioEvolucao` type shape differs, read `apps/mobile/src/application/dashboard/use-cases/GetTreinoEvolucaoUseCase.ts` and adjust `evolucaoBase`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/ui/dashboard/hooks/useTreinoEvolucaoController.test.tsx
git commit -m "test(dashboard): add useTreinoEvolucaoController tests"
```

---

### Task 3: `useStatsController` tests

**Files:**
- Create: `apps/mobile/src/ui/perfil/hooks/useStatsController.test.tsx`
- Read reference: `apps/mobile/src/ui/perfil/hooks/useStatsController.ts`

- [ ] **Step 1: Write the test file**

```tsx
// apps/mobile/src/ui/perfil/hooks/useStatsController.test.tsx
import { describe, expect, it, vi } from 'vitest';

import { renderHook, act } from '../../../test/renderHook';
import { useStatsController } from './useStatsController';
import type { DashboardStats, GetDashboardStatsUseCase } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';

const statsBase: DashboardStats = {
  totalSessoes: 10,
  sessoesMes: 3,
  recordes: [],
  treinoStats: [],
  aderencia: { semanal: [], mensal: [], anual: [] },
};

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

describe('useStatsController', () => {
  it('loads stats on mount', async () => {
    const getDashboardStats: GetDashboardStatsUseCase = {
      execute: vi.fn().mockResolvedValue(statsBase),
    } as never;
    const { result } = await renderHook(() => useStatsController(getDashboardStats));
    await flush();
    expect(result.current.stats).toEqual(statsBase);
    expect(result.current.isLoading).toBe(false);
  });

  it('starts in loading state', async () => {
    let resolve: (v: DashboardStats) => void;
    const getDashboardStats: GetDashboardStatsUseCase = {
      execute: vi.fn().mockReturnValue(new Promise<DashboardStats>((r) => { resolve = r; })),
    } as never;
    const { result } = await renderHook(() => useStatsController(getDashboardStats));
    expect(result.current.isLoading).toBe(true);
    await act(async () => { resolve!(statsBase); await Promise.resolve(); });
    await flush();
    expect(result.current.isLoading).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose useStatsController.test
```

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/ui/perfil/hooks/useStatsController.test.tsx
git commit -m "test(perfil): add useStatsController tests"
```

---

### Task 4: `usePerfilController` tests

**Files:**
- Create: `apps/mobile/src/ui/perfil/hooks/usePerfilController.test.tsx`
- Read reference: `apps/mobile/src/ui/perfil/hooks/usePerfilController.ts`

`usePerfilController` uses `expo-sqlite/kv-store` (`Storage`) and `expo-image-picker` directly (no use cases). Both must be mocked.

- [ ] **Step 1: Write the test file**

```tsx
// apps/mobile/src/ui/perfil/hooks/usePerfilController.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderHook, act } from '../../../test/renderHook';
import { usePerfilController, PERFIL_NOME_KEY, PERFIL_FOTO_KEY } from './usePerfilController';

// Mock expo-sqlite kv-store
const kvStore: Record<string, string> = {};
vi.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItem: vi.fn((key: string) => Promise.resolve(kvStore[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => { kvStore[key] = value; return Promise.resolve(); }),
  },
}));

// Mock expo-image-picker
vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  requestCameraPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: vi.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchCameraAsync: vi.fn().mockResolvedValue({ canceled: true, assets: [] }),
  UIImagePickerControllerQualityType: { Medium: 1 },
}));

// Mock react-native Alert
vi.mock('react-native', async (importOriginal) => {
  const rn = await importOriginal<typeof import('react-native')>();
  return { ...rn, Alert: { alert: vi.fn() } };
});

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  Object.keys(kvStore).forEach((k) => delete kvStore[k]);
  vi.clearAllMocks();
});

describe('usePerfilController', () => {
  it('starts with empty displayName when no stored value', async () => {
    const { result } = await renderHook(() => usePerfilController());
    await flush();
    expect(result.current.displayName).toBe('');
    expect(result.current.photoUri).toBeNull();
  });

  it('loads stored name and photo on mount', async () => {
    kvStore[PERFIL_NOME_KEY] = 'Pedro';
    kvStore[PERFIL_FOTO_KEY] = 'file:///photos/me.jpg';
    const { result } = await renderHook(() => usePerfilController());
    await flush();
    expect(result.current.displayName).toBe('Pedro');
    expect(result.current.photoUri).toBe('file:///photos/me.jpg');
  });

  it('onSaveName persists trimmed name and calls callback', async () => {
    const onNameSaved = vi.fn();
    const { result } = await renderHook(() => usePerfilController(onNameSaved));
    await flush();
    await act(async () => { await result.current.onSaveName('  Maria  '); });
    expect(result.current.displayName).toBe('Maria');
    expect(kvStore[PERFIL_NOME_KEY]).toBe('Maria');
    expect(onNameSaved).toHaveBeenCalledWith('Maria');
  });

  it('onPickPhoto does nothing when picker is cancelled', async () => {
    const { result } = await renderHook(() => usePerfilController());
    await flush();
    await act(async () => { result.current.onPickPhoto(); });
    await flush();
    expect(result.current.photoUri).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm --prefix apps/mobile test -- --reporter=verbose usePerfilController.test
```

Expected: 4 tests pass. The mock for `expo-sqlite/kv-store` needs to match the exact import path used in `usePerfilController.ts` (`import { Storage } from 'expo-sqlite/kv-store'`). If the import path differs, adjust the `vi.mock(...)` path accordingly.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/ui/perfil/hooks/usePerfilController.test.tsx
git commit -m "test(perfil): add usePerfilController tests"
```

---

### Task 5: Verify full test suite still green

- [ ] **Step 1: Run all tests**

```bash
npm --prefix apps/mobile test
```

Expected: all existing tests pass plus the 4 new test files (14+ new tests total). Confirm no regressions.

- [ ] **Step 2: Done — no additional commit needed**
