# Sessões — P1 `SubstituirExercicioSessaoUseCase` Deleta Séries ao Substituir — ✅ IMPLEMENTADO (2026-05-27)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quando um exercício é substituído durante uma sessão ativa, deletar as séries registradas para o exercício original antes de salvar a substituição.

**Architecture:** `SubstituirExercicioSessaoUseCase` recebe `SerieRegistradaRepository` como dependência adicional e chama `deleteBySessaoExercicioId(sessaoExercicioId)` antes de `sessaoExercicioRepository.save(substituido)`. O `sessaoExercicioId` permanece o mesmo após a substituição — o exercício referenciado muda, mas as séries antigas ficam ligadas a esse mesmo ID. Deletar as séries limpa o estado de forma limpa e consistente.

**Tech Stack:** TypeScript, Vitest, InMemory repositories.

---

### Task 1: Deletar séries ao substituir exercício

**Files:**
- Modify: `apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.ts`
- Create: `apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.test.ts
import { describe, expect, it } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { SerieRegistrada } from '../../../domain/sessoes/entities/SerieRegistrada';
import { SessaoExercicio } from '../../../domain/sessoes/entities/SessaoExercicio';
import { SessaoTreino } from '../../../domain/sessoes/entities/SessaoTreino';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';
import { InMemorySerieRegistradaRepository } from '../../../infrastructure/sessoes/InMemorySerieRegistradaRepository';
import { InMemorySessaoExercicioRepository } from '../../../infrastructure/sessoes/InMemorySessaoExercicioRepository';
import { InMemorySessaoTreinoRepository } from '../../../infrastructure/sessoes/InMemorySessaoTreinoRepository';
import { SubstituirExercicioSessaoUseCase } from './SubstituirExercicioSessaoUseCase';

function makeSessaoAtiva(id = 'sessao-1') {
  return SessaoTreino.create({
    id,
    treinoId: 'treino-1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: new Date('2026-05-22T09:00:00Z'),
  });
}

function makeSessaoExercicio(id: string, sessaoId: string, exercicioId: string) {
  return SessaoExercicio.create({
    id,
    sessaoTreinoId: sessaoId,
    exercicioId,
    ordem: 1,
    nomeSnapshot: 'Exercício',
    grupoMuscularSnapshot: 'Peito',
    categoriaSnapshot: 'Composto',
  });
}

function makeExercise(id: string) {
  return Exercise.create({
    id,
    name: `Exercício ${id}`,
    normalizedName: `exercicio ${id}`,
    groupMuscle: 'Peito',
    category: 'Composto',
    loadUnit: 'kg',
    isCustom: false,
    createdAt: new Date('2026-01-01'),
  });
}

describe('SubstituirExercicioSessaoUseCase', () => {
  it('deletes series of the original exercise when substituting', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const sessaoExRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exerciseRepo = new InMemoryExerciseRepository();

    const sessao = makeSessaoAtiva();
    await sessaoRepo.save(sessao);

    const seOriginal = makeSessaoExercicio('se-1', 'sessao-1', 'ex-1');
    await sessaoExRepo.save(seOriginal);

    // Register 2 series for original exercise
    await serieRepo.save(SerieRegistrada.create({ id: 'sr-1', sessaoExercicioId: 'se-1', tipoSerie: 'valida', ordem: 1, cargaKg: 80, repeticoes: 8 }));
    await serieRepo.save(SerieRegistrada.create({ id: 'sr-2', sessaoExercicioId: 'se-1', tipoSerie: 'valida', ordem: 2, cargaKg: 80, repeticoes: 8 }));

    await exerciseRepo.save(makeExercise('ex-1'));
    await exerciseRepo.save(makeExercise('ex-2'));

    const uc = new SubstituirExercicioSessaoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: sessaoExRepo,
      exerciseRepository: exerciseRepo,
      serieRegistradaRepository: serieRepo,
    });

    await uc.execute({ sessaoExercicioId: 'se-1', novoExercicioId: 'ex-2', motivo: null });

    // Series for original exercise must be deleted
    const seriesRestantes = await serieRepo.listBySessaoExercicioId('se-1');
    expect(seriesRestantes).toHaveLength(0);
  });

  it('does not throw when there are no series to delete', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const sessaoExRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exerciseRepo = new InMemoryExerciseRepository();

    const sessao = makeSessaoAtiva();
    await sessaoRepo.save(sessao);
    await sessaoExRepo.save(makeSessaoExercicio('se-1', 'sessao-1', 'ex-1'));
    await exerciseRepo.save(makeExercise('ex-1'));
    await exerciseRepo.save(makeExercise('ex-2'));

    const uc = new SubstituirExercicioSessaoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: sessaoExRepo,
      exerciseRepository: exerciseRepo,
      serieRegistradaRepository: serieRepo,
    });

    await expect(
      uc.execute({ sessaoExercicioId: 'se-1', novoExercicioId: 'ex-2', motivo: null })
    ).resolves.not.toThrow();
  });

  it('throws DuplicateExercicioInSessaoError when new exercise already exists in session', async () => {
    const sessaoRepo = new InMemorySessaoTreinoRepository();
    const sessaoExRepo = new InMemorySessaoExercicioRepository();
    const serieRepo = new InMemorySerieRegistradaRepository();
    const exerciseRepo = new InMemoryExerciseRepository();

    const sessao = makeSessaoAtiva();
    await sessaoRepo.save(sessao);
    await sessaoExRepo.save(makeSessaoExercicio('se-1', 'sessao-1', 'ex-1'));
    await sessaoExRepo.save(makeSessaoExercicio('se-2', 'sessao-1', 'ex-2'));
    await exerciseRepo.save(makeExercise('ex-1'));
    await exerciseRepo.save(makeExercise('ex-2'));

    const uc = new SubstituirExercicioSessaoUseCase({
      sessaoTreinoRepository: sessaoRepo,
      sessaoExercicioRepository: sessaoExRepo,
      exerciseRepository: exerciseRepo,
      serieRegistradaRepository: serieRepo,
    });

    const { DuplicateExercicioInSessaoError } = await import('./SubstituirExercicioSessaoUseCase');
    await expect(
      uc.execute({ sessaoExercicioId: 'se-1', novoExercicioId: 'ex-2', motivo: null })
    ).rejects.toThrow(DuplicateExercicioInSessaoError);
  });
});
```

- [ ] **Step 2: Confirmar que o primeiro teste falha**

```
cd apps/mobile && npx vitest run src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.test.ts
```

Expected: FAIL — séries não são deletadas (o use case não tem `serieRegistradaRepository`).

- [ ] **Step 3: Adicionar `serieRegistradaRepository` e deletar séries**

Em `apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.ts`, substituir a interface `Dependencies` e o método `execute`:

```ts
import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';
import type { SessaoExercicioRepository } from '../../../domain/sessoes/repositories/SessaoExercicioRepository';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { SerieRegistradaRepository } from '../../../domain/sessoes/repositories/SerieRegistradaRepository';
import type { SubstituicaoMotivo } from '../../../domain/sessoes/entities/SessaoExercicio';
import { ExerciseNotFoundError } from '../../exercises/errors/ExerciseNotFoundError';
import { SessaoEncerradaError } from '../errors/SessaoEncerradaError';
import { SessaoExercicioNotFoundError } from '../errors/SessaoExercicioNotFoundError';

export interface SubstituirExercicioInput {
  sessaoExercicioId: string;
  novoExercicioId: string;
  motivo: SubstituicaoMotivo | null;
}

interface Dependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  sessaoExercicioRepository: SessaoExercicioRepository;
  exerciseRepository: ExerciseRepository;
  serieRegistradaRepository: SerieRegistradaRepository;
}

export class DuplicateExercicioInSessaoError extends Error {
  constructor(exercicioId: string) {
    super(`Exercicio ${exercicioId} ja esta presente nesta sessao.`);
    this.name = 'DuplicateExercicioInSessaoError';
  }
}

export class SubstituirExercicioSessaoUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(input: SubstituirExercicioInput): Promise<void> {
    const sessaoExercicio = await this.deps.sessaoExercicioRepository.findById(input.sessaoExercicioId);
    if (!sessaoExercicio) throw new SessaoExercicioNotFoundError(input.sessaoExercicioId);

    const sessao = await this.deps.sessaoTreinoRepository.findById(sessaoExercicio.toPrimitives().sessaoTreinoId);
    if (!sessao || !sessao.isAtiva()) throw new SessaoEncerradaError();

    const novoExercicio = await this.deps.exerciseRepository.findById(input.novoExercicioId);
    if (!novoExercicio) throw new ExerciseNotFoundError(input.novoExercicioId);

    const sessaoId = sessaoExercicio.toPrimitives().sessaoTreinoId;
    const existing = await this.deps.sessaoExercicioRepository.findBySessaoIdAndExercicioId(
      sessaoId,
      input.novoExercicioId
    );
    if (existing) throw new DuplicateExercicioInSessaoError(input.novoExercicioId);

    // Delete series recorded for the original exercise before saving the substitution
    await this.deps.serieRegistradaRepository.deleteBySessaoExercicioId(input.sessaoExercicioId);

    const ex = novoExercicio.toPrimitives();
    const substituido = sessaoExercicio.withSubstituicao(
      ex.id, ex.name, ex.groupMuscle, ex.category, ex.equipment, ex.musculoAlvo, input.motivo,
    );
    await this.deps.sessaoExercicioRepository.save(substituido);
  }
}
```

- [ ] **Step 4: Confirmar que todos os testes passam**

```
cd apps/mobile && npx vitest run src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.test.ts
```

Expected: PASS — 3 testes verdes.

- [ ] **Step 5: Rodar a suite completa**

```
cd apps/mobile && npm test 2>&1 | tail -4
```

Expected: 0 failed. Se houver falhas em outros arquivos que instanciam `SubstituirExercicioSessaoUseCase`, adicionar `serieRegistradaRepository` nas dependências nesses locais.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.ts \
        apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.test.ts
git commit -m "fix(sessoes): SubstituirExercicioSessaoUseCase deleta series ao substituir exercicio"
```
