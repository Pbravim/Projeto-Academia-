# Auditoria de Use Cases e Domínio
> Gerada em 2026-05-21. Atualizada em 2026-05-27 (itens implementados removidos; verificação in-code).
> Classificação: **P0** = corrupção/bloqueio de dados · **P1** = bug lógico/risk real · **P2** = qualidade/melhoria

---

## Sumário Executivo — P0s

**Todos os 6 P0s originais estão implementados.** Nenhum P0 em aberto.

---

## Sumário Executivo — P1s

| # | Módulo | Problema | Arquivo | Status |
|---|--------|----------|---------|--------|
| 1 | Histórico | Tie-breaking não-determinístico em `getUltimasExecucoesValidas` — 2 sessões com mesmo `data_hora_fim` | `SQLiteHistoricoRepository.ts:34-46` | **Aberto** |
| 2 | Plano Semanal | IDs de treinos deletados permanecem no plano sem indicação de órfão | `GetPlanoSemanalUseCase.ts` | **Aberto** |

---

## Módulo: Exercises

### Bugs resolvidos
- ✅ `musculoAlvo` atualizável via `UpdateExerciseUseCase` (PR fix/pr5)
- ✅ `normalizeText` remove acentos NFD (PR fix/pr5)
- ✅ `PRAGMA foreign_keys = ON` habilitado em toda conexão (PR fix/pr5)
- ✅ `BaixarMidiasTreinoUseCase` N+1 eliminado via `findByIds` (PR fix/pr5)
- ✅ `UpdateExerciseUseCase.execute` faz `await save` antes de retornar (verificado in-code)

### Ainda em aberto
- **P1 — SQL injection em paginação** (`SQLiteExerciseRepository.ts:52`): `LIMIT ${options.limit} OFFSET ${options.offset}` interpolado diretamente.
- **P1 — `file.delete()` sem `await`** em `ExpoMediaFileCleanup.ts:8`.
- **P2 — Zero testes** para `List`, `BaixarMidia*` use cases.
- **P2 — `updateMedia` não atualiza `updated_at`.**
- **P2 — Inconsistência** `expo-file-system/legacy` vs nova API.

### Sumário Exercises

| Prior. | Item |
|--------|------|
| P1 | SQL injection em `LIMIT/OFFSET` |
| P1 | `file.delete()` sem `await` em `ExpoMediaFileCleanup` |
| P2 | Zero testes para `List`, `BaixarMidia*` use cases |
| P2 | `updateMedia` não atualiza `updated_at` |
| P2 | Inconsistência expo-file-system legacy vs nova API |

---

## Módulo: Treinos

### Bugs resolvidos
- ✅ `ReordenarExerciciosUseCase` valida array completo + transação (PR fix/pr5)
- ✅ `UpdateTreinoUseCase` verifica nome duplicado no rename (PR fix/pr5)
- ✅ `DuplicarTreinoUseCase` gera nome único quando cópia já existe (PR fix/pr5)

### Ainda em aberto
- **P1 — `DuplicateTreinoError`** não tratado no hook — mensagem genérica para o usuário.
- **P2 — Zero testes** para 4 use cases de treinos.
- **P2 — `TreinoExercicio.create`** sem validação de invariantes (`ordem < 0`, `cargaPadrao < 0`).

### Sumário Treinos

| Prior. | Item |
|--------|------|
| P1 | `DuplicateTreinoError` não tratado no hook |
| P2 | Zero testes para 4 use cases de treinos |
| P2 | `TreinoExercicio.create` sem validação de invariantes |

---

## Módulo: Sessões

### Bugs resolvidos
- ✅ `FinalizarSessaoUseCase` guarda re-finalização com `SessaoEncerradaError` (PR fix/pr5)
- ✅ `SessaoStatus` inclui `'cancelada'`; `CancelarSessaoUseCase` faz soft-delete (PR fix/pr5)
- ✅ `SubstituirExercicioSessaoUseCase` verifica duplicata na sessão (verificado in-code)
- ✅ `ArquivarSessaoUseCase` / `DesarquivarSessaoUseCase` verificam `rowsAffected` (verificado in-code)
- ✅ `IniciarSessaoUseCase` checa `findAtiva()` antes de qualquer outra query (verificado in-code)
- ✅ `RegistrarSerieUseCase` — `atualizarCargaSeNecessario` está dentro da transação (verificado in-code)

### Ainda em aberto
- **P1 — `SubstituirExercicioSessaoUseCase`** séries originais não deletadas ao substituir.
- **P2 — Zero testes** para 8 use cases de sessão.
- **P2 — N+1 de séries** em `GetSessaoDetalheUseCase`.
- **P2 — Matching por `includes`** em `SugerirSubstitutosUseCase` (frágil).
- **P2 — Incremento fixo +2.5 kg** em `SugerirProgressaoUseCase` (não configurável).

### Sumário Sessões

| Prior. | Item |
|--------|------|
| P1 | `SubstituirExercicioSessaoUseCase` não deleta séries ao substituir |
| P2 | Zero testes para 8 use cases de sessão |
| P2 | N+1 de séries em `GetSessaoDetalheUseCase` |
| P2 | Matching por `includes` em `SugerirSubstitutosUseCase` |
| P2 | Incremento fixo +2.5 kg em `SugerirProgressaoUseCase` |

---

## Módulo: Dashboard

### Bugs resolvidos
- ✅ `ImportarBancoUseCase` restaura backup se cópia falhar (PR fix/pr5)
- ✅ `totalSessoes` alinhado com filtro da lista de sessões (PR fix/pr5)
- ✅ `LIMIT 200` removido da query de sessões (PR fix/pr5)
- ✅ `ArquivarSessaoUseCase` / `DesarquivarSessaoUseCase` verificam `rowsAffected` (verificado in-code)
- ✅ `ExportarHistoricoUseCase` deleta CSV no `finally` (verificado in-code)

### Ainda em aberto
- **P2 — Zero testes** para todos os use cases de dashboard.
- **P2 — `withTransaction` sem suporte a aninhamento** (`SAVEPOINT`).
- **P2 — `ExportarBancoUseCase`** depende de classe concreta (violação DIP).
- **P2 — `ensureColumns`** 17 queries por boot — agrupar por tabela (4 queries).

### Sumário Dashboard

| Prior. | Item |
|--------|------|
| P2 | Zero testes para todos os 8 use cases |
| P2 | `withTransaction` sem suporte a aninhamento |
| P2 | `ExportarBancoUseCase` depende de classe concreta |
| P2 | `ensureColumns` 17 queries por boot |

---

## Módulo: Histórico

### Bugs resolvidos
- ✅ `getHistoricoExercicios` batcha queries em chunks de 999 (PR fix/pr5)

### Ainda em aberto
- **P1 — Tie-breaking não-determinístico** em `getUltimasExecucoesValidas` (`SQLiteHistoricoRepository.ts:34-46`): quando duas sessões têm o mesmo `data_hora_fim`, a query não tem critério de desempate estável — o ranking pode variar entre execuções. Fix: adicionar `st.id` ao ORDER BY como critério secundário.
- **P2 — Fórmula 1RM duplicada** em SQL (`SqliteDashboardRepository`, `SQLiteHistoricoRepository`) e TypeScript (`InMemoryHistoricoRepository`). Extrair para `src/shared/utils/estimativa1rm.ts`.
- **P2 — `InMemoryHistoricoRepository.getUltimasExecucoesValidas`** usa loop O(N²).

### Sumário Histórico

| Prior. | Item |
|--------|------|
| P1 | Tie-breaking não-determinístico em `getUltimasExecucoesValidas` |
| P2 | Fórmula 1RM duplicada — extrair para utilitário compartilhado |
| P2 | `InMemoryHistoricoRepository.getUltimasExecucoesValidas` O(N²) |

---

## Módulo: Plano Semanal

### Ainda em aberto
- **P1 — IDs de treinos deletados** permanecem no plano sem indicação de órfão: `GetPlanoSemanalUseCase` passa tudo do repo sem filtrar referências inválidas.
- **P2 — `SetDiaPlanoUseCase`** aceita `treinoId` string vazia e persiste.

### Sumário Plano Semanal

| Prior. | Item |
|--------|------|
| P1 | IDs de treinos deletados retornam no plano sem indicação |
| P2 | `SetDiaPlanoUseCase` aceita `treinoId` vazio |

---

## Módulo: Peso

### Ainda em aberto (todos P2)
- Parse de vírgula com `replace` sem regex — múltiplas vírgulas ignoradas.
- `deltaPositivo` naming contra-intuitivo — renomear para `pesoAumentou`.

---

## Problemas Transversais (Cross-Cutting)

| Tema | Descrição |
|------|-----------|
| **Cobertura de testes** | ~45 use cases; testes ausentes em: `Finalizar`, `GetAtiva`, `GetDetalhe`, `RegistrarSerie`, `Toggle`, `Substituir`, `SugerirProgressao`, `SugerirSubstitutos`, `SugerirTreino`, `UpdateTreino`, `Reordenar`, `ListTreinoExercicios`, `ListTreinos`, `BaixarMidias*`, `ArquivarSessao`, `Desarquivar`, `Deletar`, `ExportarHistorico`, `ExportarBanco`, `ImportarBanco`, `GetDashboardStats`, `GetTreinoEvolucao`, `GetPlano`, `SetDia`. |
| **Clean Architecture** | 3 use cases importam `SQLiteDatabaseClient` (infra) diretamente: `AddExercicioAoTreino`, `RegistrarSerie`, `IniciarSessao`. |
| **Fórmula 1RM duplicada** | Em SQL (`SqliteDashboardRepository`, `SQLiteHistoricoRepository`) e TypeScript. Extrair para `src/shared/utils/estimativa1rm.ts`. |

---

## Ranking de Prioridade Final

### P1 — Corrigir em seguida (4 itens)

1. **Histórico** — Tie-breaking não-determinístico em `getUltimasExecucoesValidas` (`SQLiteHistoricoRepository.ts:34-46`)
2. **Plano Semanal** — IDs de treinos deletados sem indicação de órfão
3. **Sessões** — `SubstituirExercicioSessaoUseCase` não deleta séries ao substituir (séries do exercício original ficam órfãs)
4. **Exercises** — SQL injection em paginação (`LIMIT/OFFSET` interpolado diretamente)

### P2 — Melhorias de qualidade (17 itens)

1. **Cobertura de testes** — ~30 use cases sem testes
2. **Fórmula 1RM duplicada** — extrair para utilitário compartilhado
3. `withTransaction` sem suporte a aninhamento (`SAVEPOINT`)
4. `ensureColumns` 17 queries por boot — agrupar
5. `ExportarBancoUseCase` depende de classe concreta
6. `SugerirSubstitutosUseCase` matching por `includes` frágil
7. Incremento fixo +2.5 kg em `SugerirProgressaoUseCase`
8. `DuplicateTreinoError` não tratado no hook
9. N+1 de séries em `GetSessaoDetalheUseCase`
10. `TreinoExercicio.create` sem validação de invariantes
11. `updateMedia` não atualiza `updated_at`
12. Inconsistência `expo-file-system/legacy` vs nova API
13. `deltaPositivo` naming contra-intuitivo
14. Parse de vírgula sem regex global
15. `SetDiaPlanoUseCase` aceita `treinoId` vazio
16. `file.delete()` sem `await` em `ExpoMediaFileCleanup`
17. `InMemoryHistoricoRepository.getUltimasExecucoesValidas` O(N²)
