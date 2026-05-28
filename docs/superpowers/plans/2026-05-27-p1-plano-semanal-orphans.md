# Plano Semanal — P1 Limpar Referências Órfãs ao Deletar Treino

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que ao deletar um treino, todos os dias do plano semanal que referenciam esse treino sejam automaticamente limpos (definidos como `null`).

**Architecture:** `DeleteTreinoUseCase` é o ponto correto para centralizar a limpeza — quando um treino é deletado, as referências no plano devem ser removidas atomicamente. Adiciona-se `clearTreino(treinoId)` à interface `PlanoSemanalRepository`, implementada no SQLite e InMemory, e o use case passa a chamar esse método.

**Tech Stack:** TypeScript, Vitest, InMemory repositories.

---

### Task 1: Adicionar `clearTreino` à `PlanoSemanalRepository`

**Files:**
- Modify: `apps/mobile/src/domain/plano/repositories/PlanoSemanalRepository.ts`
- Modify: `apps/mobile/src/infrastructure/plano/SQLitePlanoSemanalRepository.ts`
- Modify: `apps/mobile/src/infrastructure/plano/InMemoryPlanoSemanalRepository.ts`

- [ ] **Step 1: Adicionar método à interface**

Em `apps/mobile/src/domain/plano/repositories/PlanoSemanalRepository.ts`:

```ts
import type { DiaSemana } from '../entities/DiaSemana';

export type PlanoSemanal = Record<DiaSemana, string | null>;

export interface PlanoSemanalRepository {
  getPlano(): Promise<PlanoSemanal>;
  setDia(dia: DiaSemana, treinoId: string | null): Promise<void>;
  clearTreino(treinoId: string): Promise<void>;
}
```

- [ ] **Step 2: Implementar em `SQLitePlanoSemanalRepository`**

Em `apps/mobile/src/infrastructure/plano/SQLitePlanoSemanalRepository.ts`, adicionar o método após `setDia`:

```ts
  async clearTreino(treinoId: string): Promise<void> {
    await this.db.run(
      'UPDATE plano_semanal SET treino_id = NULL WHERE treino_id = ?',
      [treinoId]
    );
  }
```

- [ ] **Step 3: Implementar em `InMemoryPlanoSemanalRepository`**

Ler `apps/mobile/src/infrastructure/plano/InMemoryPlanoSemanalRepository.ts`. Adicionar o método `clearTreino`:

```ts
  async clearTreino(treinoId: string): Promise<void> {
    for (const dia of DIAS_SEMANA) {
      if (this.plano[dia] === treinoId) {
        this.plano[dia] = null;
      }
    }
  }
```

- [ ] **Step 4: Rodar testes existentes para confirmar sem regressões**

```
cd apps/mobile && npx vitest run src/infrastructure/plano src/application/plano
```

Expected: PASS.

---

### Task 2: Conectar `DeleteTreinoUseCase` ao `PlanoSemanalRepository`

**Files:**
- Modify: `apps/mobile/src/application/treinos/use-cases/DeleteTreinoUseCase.ts`
- Modify: `apps/mobile/src/application/treinos/use-cases/DeleteTreinoUseCase.test.ts`

- [ ] **Step 1: Ler o use case atual**

Ler `apps/mobile/src/application/treinos/use-cases/DeleteTreinoUseCase.ts` para entender a interface de dependências.

- [ ] **Step 2: Escrever o teste que falha**

Ler `apps/mobile/src/application/treinos/use-cases/DeleteTreinoUseCase.test.ts` para entender os testes existentes, depois adicionar:

```ts
import { InMemoryPlanoSemanalRepository } from '../../../infrastructure/plano/InMemoryPlanoSemanalRepository';

// Inside describe block, add:
  it('clears plano semanal entries that reference the deleted treino', async () => {
    const treinoRepo = new InMemoryTreinoRepository();
    const teRepo = new InMemoryTreinoExercicioRepository();
    const planoRepo = new InMemoryPlanoSemanalRepository();

    const treino = Treino.create({ id: 'treino-1', name: 'Treino A', createdAt: new Date() });
    await treinoRepo.save(treino);
    await planoRepo.setDia('seg', 'treino-1');
    await planoRepo.setDia('qua', 'treino-1');

    const uc = new DeleteTreinoUseCase({
      treinoRepository: treinoRepo,
      treinoExercicioRepository: teRepo,
      planoSemanalRepository: planoRepo,
    });

    await uc.execute('treino-1');

    const plano = await planoRepo.getPlano();
    expect(plano.seg).toBeNull();
    expect(plano.qua).toBeNull();
  });
```

- [ ] **Step 3: Confirmar que o teste falha**

```
cd apps/mobile && npx vitest run src/application/treinos/use-cases/DeleteTreinoUseCase.test.ts
```

Expected: FAIL — `planoSemanalRepository` não existe nas deps.

- [ ] **Step 4: Adicionar `planoSemanalRepository` às deps e chamar `clearTreino`**

No `DeleteTreinoUseCase.ts`, adicionar `planoSemanalRepository?: PlanoSemanalRepository` às dependências e chamar `clearTreino` no `execute`. Exemplo (ajustar conforme estrutura atual):

```ts
import type { PlanoSemanalRepository } from '../../../domain/plano/repositories/PlanoSemanalRepository';

// Na interface de dependências:
  planoSemanalRepository?: PlanoSemanalRepository;

// No execute, após deletar o treino:
  await this.dependencies.planoSemanalRepository?.clearTreino(treinoId);
```

Opcional (`?`) para não quebrar instâncias sem o repo (retrocompatível).

- [ ] **Step 5: Confirmar que o teste passa**

```
cd apps/mobile && npx vitest run src/application/treinos/use-cases/DeleteTreinoUseCase.test.ts
```

Expected: PASS — todos os testes verdes incluindo o novo.

- [ ] **Step 6: Rodar a suite completa**

```
cd apps/mobile && npm test 2>&1 | tail -4
```

Expected: 0 failed.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/domain/plano/repositories/PlanoSemanalRepository.ts \
        apps/mobile/src/infrastructure/plano/SQLitePlanoSemanalRepository.ts \
        apps/mobile/src/infrastructure/plano/InMemoryPlanoSemanalRepository.ts \
        apps/mobile/src/application/treinos/use-cases/DeleteTreinoUseCase.ts \
        apps/mobile/src/application/treinos/use-cases/DeleteTreinoUseCase.test.ts
git commit -m "fix(plano): DeleteTreinoUseCase limpa entradas do plano semanal ao deletar treino"
```
