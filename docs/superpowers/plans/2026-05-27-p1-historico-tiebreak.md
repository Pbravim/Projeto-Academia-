# Histórico — P1 Tie-Breaking Determinístico em `getUltimasExecucoesValidas`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que `getUltimasExecucoesValidas` retorne sempre a mesma sessão quando dois treinos têm idêntico `data_hora_fim`.

**Architecture:** O subquery atual agrupa por `exercicio_id` e usa `MAX(data_hora_fim)`. Se duas sessões têm o mesmo timestamp, o JOIN `st.data_hora_fim = latest.max_fim` pode retornar linhas de ambas, e o primeiro row que aparecer vence de forma não-determinística. A correção adiciona `MAX(st2.id) AS max_id` ao subquery e acrescenta `AND st.id = latest.max_id` ao JOIN, elegendo sempre a sessão com maior UUID (criada por último) como tiebreaker.

**Tech Stack:** TypeScript, Vitest, `better-sqlite3` (test DB via `db-setup.ts`), SQLite.

---

### Task 1: Corrigir tie-breaking em `getUltimasExecucoesValidas`

**Files:**
- Modify: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`
- Create: `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.tiebreak.test.ts`

- [ ] **Step 1: Escrever o teste que expõe o bug**

```ts
// apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.tiebreak.test.ts
import { describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/db-setup';
import { SQLiteHistoricoRepository } from './SQLiteHistoricoRepository';

describe('SQLiteHistoricoRepository.getUltimasExecucoesValidas — tie-breaking', () => {
  it('returns the same session when two sessions share identical data_hora_fim', async () => {
    const db = createTestDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    // Two finalized sessions for the same exercise, same timestamp but different IDs
    const SAME_FIM = '2026-05-01T10:00:00.000Z';
    await db.exec(`
      INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status)
      VALUES
        ('st-aaa', 't1', 'Treino A', '2026-05-01T09:00:00Z', '${SAME_FIM}', 'finalizada'),
        ('st-zzz', 't1', 'Treino A', '2026-05-01T09:00:00Z', '${SAME_FIM}', 'finalizada');

      INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
      VALUES
        ('se-1', 'st-aaa', 'ex-1', 1, 'Supino', 'Peito', 'Composto'),
        ('se-2', 'st-zzz', 'ex-1', 1, 'Supino', 'Peito', 'Composto');

      INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
      VALUES
        ('sr-1', 'se-1', 'valida', 1, 80, 8),
        ('sr-2', 'se-2', 'valida', 1, 80, 8);
    `);

    // Run 10 times — must return consistently the same session (highest ID wins: 'st-zzz' > 'st-aaa')
    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const map = await repo.getUltimasExecucoesValidas();
      const entry = map.get('ex-1');
      expect(entry).not.toBeUndefined();
      results.push(entry!.dataExecucao);
    }
    expect(new Set(results).size).toBe(1);
  });

  it('returns the best 1RM series from the tiebreaker session', async () => {
    const db = createTestDatabase();
    const repo = new SQLiteHistoricoRepository(db);

    const SAME_FIM = '2026-05-01T10:00:00.000Z';
    await db.exec(`
      INSERT INTO sessao_treinos (id, treino_id, treino_nome_snapshot, data_hora_inicio, data_hora_fim, status)
      VALUES
        ('st-aaa', 't1', 'Treino A', '2026-05-01T09:00:00Z', '${SAME_FIM}', 'finalizada'),
        ('st-zzz', 't1', 'Treino A', '2026-05-01T09:00:00Z', '${SAME_FIM}', 'finalizada');

      INSERT INTO sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem, nome_snapshot, grupo_muscular_snapshot, categoria_snapshot)
      VALUES
        ('se-1', 'st-aaa', 'ex-1', 1, 'Supino', 'Peito', 'Composto'),
        ('se-2', 'st-zzz', 'ex-1', 1, 'Supino', 'Peito', 'Composto');

      INSERT INTO series_registradas (id, sessao_exercicio_id, tipo_serie, ordem, carga_kg, repeticoes)
      VALUES
        ('sr-1', 'se-1', 'valida', 1, 60, 10),  -- session st-aaa: 60 kg
        ('sr-2', 'se-2', 'valida', 1, 80, 8);   -- session st-zzz: 80 kg (best 1RM, and higher ID wins)
    `);

    const map = await repo.getUltimasExecucoesValidas();
    const entry = map.get('ex-1');
    expect(entry?.cargaKg).toBe(80);
  });
});
```

- [ ] **Step 2: Confirmar que o teste falha (ou é não-determinístico) antes da fix**

```
cd apps/mobile && npx vitest run src/infrastructure/historico/SQLiteHistoricoRepository.tiebreak.test.ts
```

Expected: O teste de consistência pode PASS ou FAIL dependendo de como o SQLite ordena internamente — confirma que o comportamento não é garantido.

- [ ] **Step 3: Corrigir o SQL em `getUltimasExecucoesValidas`**

Em `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts`, substituir a query de `getUltimasExecucoesValidas` (linhas 34-47):

```ts
  async getUltimasExecucoesValidas(): Promise<Map<string, UltimaExecucaoValida>> {
    const rows = await this.database.getAll<{ exercicio_id: string; carga_kg: number; repeticoes: number; data_hora_fim: string }>(
      `SELECT se.exercicio_id, sr.carga_kg, sr.repeticoes, st.data_hora_fim
       FROM (
         SELECT se2.exercicio_id, MAX(st2.data_hora_fim) AS max_fim, MAX(st2.id) AS max_id
         FROM sessao_exercicios se2
         JOIN sessao_treinos st2 ON se2.sessao_treino_id = st2.id
         WHERE st2.status = 'finalizada' AND st2.data_hora_fim IS NOT NULL
         GROUP BY se2.exercicio_id
       ) latest
       JOIN sessao_exercicios se ON se.exercicio_id = latest.exercicio_id
       JOIN sessao_treinos st ON se.sessao_treino_id = st.id
         AND st.data_hora_fim = latest.max_fim
         AND st.id = latest.max_id
       JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
       ORDER BY se.exercicio_id, (sr.carga_kg * (1.0 + sr.repeticoes / 30.0)) DESC`
    );

    const result = new Map<string, UltimaExecucaoValida>();
    for (const row of rows) {
      if (!result.has(row.exercicio_id)) {
        result.set(row.exercicio_id, {
          cargaKg: row.carga_kg,
          repeticoes: row.repeticoes,
          dataExecucao: row.data_hora_fim,
        });
      }
    }
    return result;
  }
```

- [ ] **Step 4: Confirmar que os testes passam**

```
cd apps/mobile && npx vitest run src/infrastructure/historico/SQLiteHistoricoRepository.tiebreak.test.ts
```

Expected: PASS — ambos os testes verdes.

- [ ] **Step 5: Rodar a suite completa**

```
cd apps/mobile && npm test 2>&1 | tail -4
```

Expected: 191+ passed, 0 failed.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts \
        apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.tiebreak.test.ts
git commit -m "fix(historico): add stable tiebreaker to getUltimasExecucoesValidas using MAX(id)"
```
