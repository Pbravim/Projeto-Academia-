# Auditoria de Use Cases e Domínio
> Gerada em 2026-05-21. Atualizada em 2026-06-04 (todos os P1s e P2s CQ implementados; tasks 3-7 do plano performance/arch concluídas).
> Classificação: **P0** = corrupção/bloqueio de dados · **P1** = bug lógico/risk real · **P2** = qualidade/melhoria

---

## Sumário Executivo — P0s

**Todos os 6 P0s originais estão implementados.** Nenhum P0 em aberto.

---

## Sumário Executivo — P1s

**Todos os P1s implementados.** Nenhum P1 em aberto.

| # | Módulo | Problema | Status |
|---|--------|----------|--------|
| 1 | Histórico | Tie-breaking não-determinístico em `getUltimasExecucoesValidas` | ✅ `69bca9c` |
| 2 | Plano Semanal | IDs de treinos deletados permanecem no plano | ✅ `cf3b413` |
| 3 | Sessões | `SubstituirExercicioSessaoUseCase` não deletava séries ao substituir | ✅ `c878569` |
| 4 | Exercises | SQL injection em `LIMIT/OFFSET` | ✅ `f62f437` |

---

## Módulo: Exercises

### Bugs resolvidos
- ✅ `musculoAlvo` atualizável via `UpdateExerciseUseCase` (PR fix/pr5)
- ✅ `normalizeText` remove acentos NFD (PR fix/pr5)
- ✅ `PRAGMA foreign_keys = ON` habilitado em toda conexão (PR fix/pr5)
- ✅ `BaixarMidiasTreinoUseCase` N+1 eliminado via `findByIds` (PR fix/pr5)
- ✅ `UpdateExerciseUseCase.execute` faz `await save` antes de retornar (verificado in-code)

### Bugs resolvidos (adicionais)
- ✅ SQL injection em `LIMIT/OFFSET` — bind params (`f62f437`)
- ✅ `file.delete()` sem `await` — era falso positivo; nova API `expo-file-system` é síncrona (comentário em `ExpoMediaFileCleanup.ts:21`)

### Bugs resolvidos (adicionais 2026-06-04)
- ✅ `updateMedia` não atualizava `updated_at` — corrigido (`f711c70`)
- ✅ `expo-file-system/legacy` migrado para nova API em `ExerciseFormFields` e `useExerciseCatalogController` (`f711c70`)

### Ainda em aberto
- **P2 — Zero testes** para `List`, `BaixarMidia*` use cases.

### Sumário Exercises

| Prior. | Item |
|--------|------|
| P2 | Zero testes para `List`, `BaixarMidia*` use cases |

---

## Módulo: Treinos

### Bugs resolvidos
- ✅ `ReordenarExerciciosUseCase` valida array completo + transação (PR fix/pr5)
- ✅ `UpdateTreinoUseCase` verifica nome duplicado no rename (PR fix/pr5)
- ✅ `DuplicarTreinoUseCase` gera nome único quando cópia já existe (PR fix/pr5)

### Bugs resolvidos (adicionais 2026-06-04)
- ✅ `DuplicateTreinoError` agora tratado em `useTreinoListController` (`f711c70`)
- ✅ `TreinoExercicio.create` com validação de invariantes (`ordem>=0`, `cargaPadrao>=0`, `seriesRecomendadas>0`) (`f711c70`)

### Ainda em aberto
- **P2 — Zero testes** para 4 use cases de treinos.

### Sumário Treinos

| Prior. | Item |
|--------|------|
| P2 | Zero testes para 4 use cases de treinos |

---

## Módulo: Sessões

### Bugs resolvidos
- ✅ `FinalizarSessaoUseCase` guarda re-finalização com `SessaoEncerradaError` (PR fix/pr5)
- ✅ `SessaoStatus` inclui `'cancelada'`; `CancelarSessaoUseCase` faz soft-delete (PR fix/pr5)
- ✅ `SubstituirExercicioSessaoUseCase` verifica duplicata na sessão (verificado in-code)
- ✅ `ArquivarSessaoUseCase` / `DesarquivarSessaoUseCase` verificam `rowsAffected` (verificado in-code)
- ✅ `IniciarSessaoUseCase` checa `findAtiva()` antes de qualquer outra query (verificado in-code)
- ✅ `RegistrarSerieUseCase` — `atualizarCargaSeNecessario` está dentro da transação (verificado in-code)

### Bugs resolvidos (adicionais)
- ✅ `SubstituirExercicioSessaoUseCase` deleta séries do exercício original ao substituir (`c878569`)

### Bugs resolvidos (adicionais 2026-06-04)
- ✅ `SugerirSubstitutosUseCase` usa interseção exata de grupos (sem `includes` frágil) (`e812145`)
- ✅ `INCREMENTO_CARGA_KG` extraído como constante nomeada em `SugerirProgressaoUseCase` (`12f5425`)

### Ainda em aberto
- **P2 — Zero testes** para 8 use cases de sessão.
- **P2 — N+1 de séries** em `GetSessaoDetalheUseCase`.

### Sumário Sessões

| Prior. | Item |
|--------|------|
| P2 | Zero testes para 8 use cases de sessão |
| P2 | N+1 de séries em `GetSessaoDetalheUseCase` |

---

## Módulo: Dashboard

### Bugs resolvidos
- ✅ `ImportarBancoUseCase` restaura backup se cópia falhar (PR fix/pr5)
- ✅ `totalSessoes` alinhado com filtro da lista de sessões (PR fix/pr5)
- ✅ `LIMIT 200` removido da query de sessões (PR fix/pr5)
- ✅ `ArquivarSessaoUseCase` / `DesarquivarSessaoUseCase` verificam `rowsAffected` (verificado in-code)
- ✅ `ExportarHistoricoUseCase` deleta CSV no `finally` (verificado in-code)

### Bugs resolvidos (adicionais 2026-06-04)
- ✅ `withTransaction` suporta aninhamento via `SAVEPOINT` (`79f9276`)
- ✅ `ExportarBancoUseCase` injetado via `DatabaseExportPort` (DIP corrigido) (`67c7219`)
- ✅ `ensureColumns` reduzido de 17 para 3 PRAGMA queries (`a2a8102`)

### Ainda em aberto
- **P2 — Zero testes** para todos os use cases de dashboard.

### Sumário Dashboard

| Prior. | Item |
|--------|------|
| P2 | Zero testes para todos os 8 use cases |

---

## Módulo: Histórico

### Bugs resolvidos
- ✅ `getHistoricoExercicios` batcha queries em chunks de 999 (PR fix/pr5)

### Bugs resolvidos (adicionais)
- ✅ Tie-breaking determinístico em `getUltimasExecucoesValidas` — `MAX(st.id)` como critério secundário (`69bca9c`)

### Bugs resolvidos (adicionais 2026-06-04)
- ✅ Fórmula 1RM TypeScript extraída para `estimativa1rm.ts` e usada em `InMemoryHistoricoRepository` (CQ-1, pré-sessão)

### Ainda em aberto
- **P2 — Fórmula 1RM duplicada** em SQL (`SqliteDashboardRepository`, `SQLiteHistoricoRepository`) — SQL copies harder to consolidate, lower priority.
- **P2 — `InMemoryHistoricoRepository.getUltimasExecucoesValidas`** usa loop O(N²).

### Sumário Histórico

| Prior. | Item |
|--------|------|
| P2 | Fórmula 1RM em SQL ainda duplicada (TS resolvido) |
| P2 | `InMemoryHistoricoRepository.getUltimasExecucoesValidas` O(N²) |

---

## Módulo: Plano Semanal

### Bugs resolvidos (adicionais)
- ✅ `DeleteTreinoUseCase` limpa entradas do plano semanal ao deletar treino (`cf3b413`)

### Bugs resolvidos (adicionais 2026-06-04)
- ✅ `SetDiaPlanoUseCase` coerce string vazia/whitespace para `null` (`f711c70`)

### Sumário Plano Semanal

Nenhum item em aberto.

---

## Módulo: Peso

### Bugs resolvidos (2026-06-04)
- ✅ Parse de vírgula corrigido com `/,/g` em `usePesoController` via `parsePesoInput` (`f711c70`)
- ✅ `deltaPositivo` renomeado para `pesoAumentou` em todos os consumidores (`f711c70`)

### Ainda em aberto
- **P2 — Parse de vírgula** ainda usa `replace(',', '.')` (single-replace) em 9 outros arquivos: `TreinoDetailScreen.tsx`, `BiSetDetalheScreen.tsx`, `ExercicioDetalheScreen.tsx`. Ver plano `2026-06-04-p2-comma-parse-screens.md`.

---

## Problemas Transversais (Cross-Cutting)

| Tema | Descrição |
|------|-----------|
| **Cobertura de testes** | ~45 use cases; testes ausentes em: `Finalizar`, `GetAtiva`, `GetDetalhe`, `RegistrarSerie`, `Toggle`, `Substituir`, `SugerirProgressao`, `SugerirSubstitutos`, `SugerirTreino`, `UpdateTreino`, `Reordenar`, `ListTreinoExercicios`, `ListTreinos`, `BaixarMidias*`, `ArquivarSessao`, `Desarquivar`, `Deletar`, `ExportarHistorico`, `ExportarBanco`, `ImportarBanco`, `GetDashboardStats`, `GetTreinoEvolucao`, `GetPlano`, `SetDia`. Ver plano `2026-06-02-p2-test-coverage.md`. |
| **Clean Architecture** | 3 use cases importam `SQLiteDatabaseClient` (infra) diretamente: `AddExercicioAoTreino`, `RegistrarSerie`, `IniciarSessao`. Ver plano `2026-06-04-p2-clean-architecture-dip.md`. |
| **Fórmula 1RM duplicada** | Em SQL (`SqliteDashboardRepository`, `SQLiteHistoricoRepository`) — TypeScript já extraído para `estimativa1rm.ts`. SQL copies harder to consolidate. |
| **Parse de vírgula** | 9 ocorrências restantes em telas de treino. Ver plano `2026-06-04-p2-comma-parse-screens.md`. |

---

## Ranking de Prioridade Final

### P1 — Todos resolvidos ✅

1. ✅ **Histórico** — Tie-breaking determinístico (`69bca9c`)
2. ✅ **Plano Semanal** — Orphans limpos ao deletar treino (`cf3b413`)
3. ✅ **Sessões** — `SubstituirExercicioSessaoUseCase` deleta séries ao substituir (`c878569`)
4. ✅ **Exercises** — SQL injection em `LIMIT/OFFSET` corrigido com bind params (`f62f437`)

### P2 — Melhorias de qualidade (status 2026-06-04)

| # | Item | Status |
|---|------|--------|
| 1 | Cobertura de testes — ~30 use cases sem testes | ⬜ aberto |
| 2 | N+1 de séries em `GetSessaoDetalheUseCase` | ⬜ aberto |
| 3 | `InMemoryHistoricoRepository` O(N²) | ⬜ aberto |
| 4 | Clean Architecture — 3 DIP violations (SQLiteDatabaseClient direto) | ⬜ aberto |
| 5 | Parse de vírgula — 9 ocorrências restantes em telas | ⬜ aberto |
| 6 | Fórmula 1RM em SQL ainda duplicada | ⬜ baixa prioridade |
| 7 | `withTransaction` sem SAVEPOINT | ✅ `79f9276` |
| 8 | `ensureColumns` 17 queries por boot | ✅ `a2a8102` |
| 9 | `ExportarBancoUseCase` DIP violation | ✅ `67c7219` |
| 10 | `SugerirSubstitutosUseCase` matching frágil | ✅ `e812145` |
| 11 | Incremento fixo +2.5 kg | ✅ `12f5425` |
| 12 | `DuplicateTreinoError` não tratado | ✅ `f711c70` |
| 13 | `TreinoExercicio.create` sem validação | ✅ `f711c70` |
| 14 | `updateMedia` não atualiza `updated_at` | ✅ `f711c70` |
| 15 | `expo-file-system/legacy` inconsistência | ✅ `f711c70` |
| 16 | `deltaPositivo` naming | ✅ `f711c70` |
| 17 | Parse de vírgula em `usePesoController` | ✅ `f711c70` |
| 18 | `SetDiaPlanoUseCase` aceita `treinoId` vazio | ✅ `f711c70` |
| 19 | Fórmula 1RM TypeScript duplicada | ✅ CQ-1 |
| 20 | `file.delete()` sem `await` | ✅ falso positivo (API é síncrona) |
