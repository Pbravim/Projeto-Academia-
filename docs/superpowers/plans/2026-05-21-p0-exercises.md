# P0 Exercises — ✅ IMPLEMENTADO (2026-05-22)

> Task 3 (DeleteExercise transaction) foi concluída. Restam Tasks 1 e 2.

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`
- Modify: `apps/mobile/src/domain/exercises/entities/Exercise.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts`

---

### Task 1: Enable PRAGMA foreign_keys = ON in database client

**Context:** `ExpoSQLiteDatabaseClient.ts` — `runMigrations` define `PRAGMA journal_mode = WAL` mas nunca habilita enforcement de FKs. Sem `PRAGMA foreign_keys = ON`, todos os `REFERENCES` e `ON DELETE CASCADE` são silenciosamente ignorados — `exercise_alternatives` vira órfã quando o exercício pai é deletado. Este PRAGMA precisa ser definido por-conexão (não é persistido).

**Files:**
- Modify: `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts`

- [ ] **Step 1: Adicionar PRAGMA foreign_keys = ON após journal_mode**

No método `runMigrations`, encontrar:

```typescript
await database.execAsync('PRAGMA journal_mode = WAL;');
```

Adicionar imediatamente após:

```typescript
await database.execAsync('PRAGMA foreign_keys = ON;');
```

- [ ] **Step 2: Verificar TypeScript e commitar**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
git add apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts
git commit -m "fix(db): enable PRAGMA foreign_keys = ON on every connection"
```

---

### Task 2: Add musculoAlvo to Exercise.update and UpdateExerciseUseCase

**Context:** `Exercise.ts:34-41` — `UpdateExerciseProps` não inclui `musculoAlvo`. `Exercise.update` na linha 94 sempre copia `current.musculoAlvo` sem alteração. Exercícios customizados nunca podem ter o campo definido ou corrigido — bloqueia a feature de substituição que faz matching por `musculoAlvo`.

**Files:**
- Modify: `apps/mobile/src/domain/exercises/entities/Exercise.ts`
- Modify: `apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts`

- [ ] **Step 1: Adicionar musculoAlvo a UpdateExerciseProps (Exercise.ts)**

Localizar `UpdateExerciseProps` (linha ~34) e adicionar o campo:

```typescript
export interface UpdateExerciseProps {
  name: string;
  groupMuscle: string;
  category?: string | null;
  equipment?: string | null;
  mediaOnline?: string | null;
  mediaLocal?: string | null;
  musculoAlvo?: string | null;   // add this line
}
```

No método `static update` (linha ~94), alterar:

```typescript
// antes:
musculoAlvo: current.musculoAlvo,

// depois:
musculoAlvo: 'musculoAlvo' in input ? normalizeOptionalText(input.musculoAlvo) : current.musculoAlvo,
```

- [ ] **Step 2: Adicionar musculoAlvo a UpdateExerciseInput (UpdateExerciseUseCase.ts)**

Localizar `UpdateExerciseInput` e adicionar:

```typescript
musculoAlvo?: string | null;
```

- [ ] **Step 3: Escrever testes para musculoAlvo**

Adicionar ao `UpdateExerciseUseCase.test.ts`:

```typescript
it('updates musculoAlvo on a custom exercise', async () => {
  // create exercise, then update with musculoAlvo: 'peitoral maior'
  // expect result.musculoAlvo === 'peitoral maior'
});

it('clears musculoAlvo when null is passed', async () => {
  // create exercise with musculoAlvo: 'braquial', then update with musculoAlvo: null
  // expect result.musculoAlvo === null
});
```

- [ ] **Step 4: Verificar TypeScript e testes**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
cd apps/mobile && npx vitest run src/application/exercises/
git add apps/mobile/src/domain/exercises/entities/Exercise.ts \
        apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.ts \
        apps/mobile/src/application/exercises/use-cases/UpdateExerciseUseCase.test.ts
git commit -m "fix(exercises): allow musculoAlvo to be updated via UpdateExerciseUseCase"
```
