# P0 Dashboard + Infra — Pendente

> Tasks 1 (DeletarSessao), 2 (ResetHistorico) e 4 (PlanoSemanal.setDia) foram concluídas. Restam Tasks 3 e 5.

**Files:**
- Modify: `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts`
- Modify: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`

---

### Task 3: ImportarBancoUseCase — add try/catch around file copy

**Context:** `ImportarBancoUseCase.ts:61` — a linha `pickedFile.copy(dest)` está fora de try/catch. O backup é criado antes em `Paths.cache`, mas se a cópia falhar o banco original já foi deletado — o usuário fica sem banco. Fix: envolver a cópia em try/catch que restaura o backup em caso de erro.

**Files:**
- Modify: `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts`

- [ ] **Step 1: Substituir o bloco de cópia por versão segura**

Localizar no `execute()` o bloco que começa em `// Cria backup de segurança antes de sobrescrever.` e substituir por:

```typescript
// Cria backup de segurança antes de sobrescrever.
let backupFile: File | null = null;
if (dest.exists) {
  const ts = Date.now();
  backupFile = new File(Paths.cache, `academia-pre-import-${ts}.db`);
  try {
    dest.copy(backupFile);
  } catch {
    throw new Error('Falha ao criar backup do banco atual. Importacao cancelada.');
  }
  dest.delete();
}

// Remove restos de WAL/SHM do banco antigo para evitar corrupcao.
for (const suffix of ['-wal', '-shm']) {
  const sidecar = new File(sqliteDir, `${dbName}${suffix}`);
  if (sidecar.exists) sidecar.delete();
}

try {
  pickedFile.copy(dest);
} catch {
  if (backupFile?.exists) {
    backupFile.copy(dest);
  }
  throw new Error('Falha ao copiar banco importado. Banco original foi restaurado.');
}
```

- [ ] **Step 2: Verificar TypeScript e commitar**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
git add apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts
git commit -m "fix(dashboard): guard ImportarBancoUseCase against data loss on copy failure"
```

---

### Task 5: SQLiteHistoricoRepository.getHistoricoExercicios — batch >999 IDs

**Context:** `SQLiteHistoricoRepository.ts:92-106` — `IN (${placeholders})` com todos os IDs de uma vez. SQLite limita a 999 bound parameters. Com >999 exercícios a query lança erro nativo. Fix: dividir `exercicioIds` em chunks de 999 e mesclar resultados.

**Files:**
- Modify: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`

- [ ] **Step 1: Substituir getHistoricoExercicios por versão batched**

Localizar o método `getHistoricoExercicios` e substituir por:

```typescript
async getHistoricoExercicios(exercicioIds: string[]): Promise<Map<string, ExecucaoExercicio[]>> {
  if (exercicioIds.length === 0) return new Map();

  const BATCH_SIZE = 999;
  const result = new Map<string, ExecucaoExercicio[]>();

  for (let i = 0; i < exercicioIds.length; i += BATCH_SIZE) {
    const batch = exercicioIds.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(', ');
    const rows = await this.database.getAll<HistoricoRow>(
      `SELECT se.exercicio_id, se.sessao_treino_id, se.nome_snapshot, st.data_hora_fim,
              se.nome_original_snapshot, se.substituicao_motivo,
              sr.id as serie_id, sr.carga_kg, sr.repeticoes, sr.observacao, sr.ordem
       FROM sessao_exercicios se
       INNER JOIN sessao_treinos st ON se.sessao_treino_id = st.id
       INNER JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
       WHERE se.exercicio_id IN (${placeholders}) AND st.status = 'finalizada' AND st.data_hora_fim IS NOT NULL
       ORDER BY se.exercicio_id, st.data_hora_fim DESC, sr.ordem ASC`,
      batch
    );

    const byExercicio = new Map<string, HistoricoRow[]>();
    for (const row of rows) {
      const list = byExercicio.get(row.exercicio_id) ?? [];
      list.push(row);
      byExercicio.set(row.exercicio_id, list);
    }
    for (const [id, idRows] of byExercicio) {
      result.set(id, groupBySession(idRows));
    }
  }

  return result;
}
```

**Nota:** manter o SQL idêntico ao atual (copiar do arquivo). Apenas adicionar o loop de batching.

- [ ] **Step 2: Verificar TypeScript e commitar**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -20
cd apps/mobile && npx vitest run
git add apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts
git commit -m "fix(historico): batch getHistoricoExercicios to stay under SQLite 999 param limit"
```
