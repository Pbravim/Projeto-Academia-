# UpdateSerieUseCase — P1 Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing test file for `UpdateSerieUseCase`. The use case and its full UI wiring already exist — this plan covers test coverage only.

**Architecture:** The use case validates input via `SerieRegistrada.create()`, checks the session is still active via `sessaoTreinoRepository.findById()`, then calls `serieRegistradaRepository.update()`. Tests use InMemory repositories only. Three cases: happy path, serie not found (silent), and session already finalized (throws `SessaoEncerradaError`).

**Tech Stack:** TypeScript, Vitest, InMemory repositories.

---

### Task 1: Write tests for `UpdateSerieUseCase`

**Files:**
- Create: `apps/mobile/src/application/sessoes/use-cases/UpdateSerieUseCase.test.ts`
- Read reference: `apps/mobile/src/application/sessoes/use-cases/UpdateSerieUseCase.ts`
- Read reference: `apps/mobile/src/infrastructure/sessoes/InMemorySerieRegistradaRepository.ts`
- Read reference: `apps/mobile/src/infrastructure/sessoes/InMemorySessaoExercicioRepository.ts`
- Read reference: `apps/mobile/src/infrastructure/sessoes/InMemorySessaoTreinoRepository.ts`

- [ ] **Step 1: Write the test file**

```ts
// apps/mobile/src/application/sessoes/use-cases/UpdateSerieUseCase.test.ts
import { describe, expect, it } from 'vitest';

import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { UpdateSerieUseCase } from './UpdateSerieUseCase';

function makeSessaoAtiva(id = 's1') {
  return SessaoTreino.create({
    id,
    treinoId: 't1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-01-01T10:00:00Z'),
  });
}

function makeSessaoFinalizada(id = 's1') {
  const s = makeSessaoAtiva(id);
  s.finalizar(new Date('2026-01-01T11:00:00Z'));
  return s;
}

function makeSessaoExercicio(id: string, sessaoId: string) {
  return SessaoExercicio.create({
    id,
    sessaoTreinoId: sessaoId,
    exercicioId: 'ex1',
    ordem: 0,
    nomeSnapshot: 'Supino',
    grupoMuscularSnapshot: 'Peito',
    categoriaSnapshot: 'Composto',
  });
}

function makeSerie(id: string, sessaoExercicioId: string) {
  return SerieRegistrada.create({
    id,
    sessaoExercicioId,
    ordem: 0,
    cargaKg: 50,
    repeticoes: 10,
  });
}

function makeRepos() {
  return {
    serieRepo: new InMemorySerieRegistradaRepository(),
    sessaoExRepo: new InMemorySessaoExercicioRepository(),
    sessaoRepo: new InMemorySessaoTreinoRepository(),
  };
}

describe('UpdateSerieUseCase', () => {
  it('updates cargaKg and repeticoes when session is active', async () => {
    const { serieRepo, sessaoExRepo, sessaoRepo } = makeRepos();
    const sessao = makeSessaoAtiva();
    const se = makeSessaoExercicio('se1', sessao.toPrimitives().id);
    const serie = makeSerie('sr1', se.toPrimitives().id);
    await sessaoRepo.save(sessao);
    await sessaoExRepo.save(se);
    await serieRepo.save(serie);

    const useCase = new UpdateSerieUseCase({
      serieRegistradaRepository: serieRepo,
      sessaoExercicioRepository: sessaoExRepo,
      sessaoTreinoRepository: sessaoRepo,
    });

    await useCase.execute({ serieId: 'sr1', cargaKg: 70, repeticoes: 8, observacao: 'ok' });

    const updated = await serieRepo.findById('sr1');
    expect(updated?.toPrimitives().cargaKg).toBe(70);
    expect(updated?.toPrimitives().repeticoes).toBe(8);
    expect(updated?.toPrimitives().observacao).toBe('ok');
  });

  it('does nothing when serie does not exist', async () => {
    const { serieRepo, sessaoExRepo, sessaoRepo } = makeRepos();
    const useCase = new UpdateSerieUseCase({
      serieRegistradaRepository: serieRepo,
      sessaoExercicioRepository: sessaoExRepo,
      sessaoTreinoRepository: sessaoRepo,
    });

    await expect(
      useCase.execute({ serieId: 'nonexistent', cargaKg: 50, repeticoes: 5 }),
    ).resolves.toBeUndefined();
  });

  it('throws SessaoEncerradaError when session is already finalized', async () => {
    const { serieRepo, sessaoExRepo, sessaoRepo } = makeRepos();
    const sessao = makeSessaoFinalizada();
    const se = makeSessaoExercicio('se1', sessao.toPrimitives().id);
    const serie = makeSerie('sr1', se.toPrimitives().id);
    await sessaoRepo.save(sessao);
    await sessaoExRepo.save(se);
    await serieRepo.save(serie);

    const useCase = new UpdateSerieUseCase({
      serieRegistradaRepository: serieRepo,
      sessaoExercicioRepository: sessaoExRepo,
      sessaoTreinoRepository: sessaoRepo,
    });

    await expect(
      useCase.execute({ serieId: 'sr1', cargaKg: 60, repeticoes: 6 }),
    ).rejects.toThrow(SessaoEncerradaError);
  });

  it('trims observacao to null when empty string', async () => {
    const { serieRepo, sessaoExRepo, sessaoRepo } = makeRepos();
    const sessao = makeSessaoAtiva();
    const se = makeSessaoExercicio('se1', sessao.toPrimitives().id);
    const serie = makeSerie('sr1', se.toPrimitives().id);
    await sessaoRepo.save(sessao);
    await sessaoExRepo.save(se);
    await serieRepo.save(serie);

    const useCase = new UpdateSerieUseCase({
      serieRegistradaRepository: serieRepo,
      sessaoExercicioRepository: sessaoExRepo,
      sessaoTreinoRepository: sessaoRepo,
    });

    await useCase.execute({ serieId: 'sr1', cargaKg: 40, repeticoes: 12, observacao: null });

    const updated = await serieRepo.findById('sr1');
    expect(updated?.toPrimitives().observacao).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to see it passes (or fix what breaks)**

```bash
npm --prefix apps/mobile test -- --reporter=verbose UpdateSerieUseCase.test
```

Expected: 4 tests pass. If any `InMemory` repository is missing a method (e.g., `findById`), check the existing interface at `apps/mobile/src/domain/sessoes/repositories/SerieRegistradaRepository.ts` and add it to the in-memory impl.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/UpdateSerieUseCase.test.ts
git commit -m "test(sessoes): add UpdateSerieUseCase tests"
```
