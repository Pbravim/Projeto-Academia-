# Auditoria de Use Cases e Domínio
> Gerada em 2026-05-21. Atualizada em 2026-05-22 (itens concluídos removidos).
> Classificação: **P0** = corrupção/bloqueio de dados · **P1** = bug lógico/risk real · **P2** = qualidade/melhoria

---

## Sumário Executivo de P0s Abertos

| # | Módulo | Problema | Arquivo |
|---|--------|----------|---------|
| 1 | Sessões | `FinalizarSessaoUseCase` não impede re-finalização — sobrescreve `dataHoraFim` | `FinalizarSessaoUseCase.ts:17` |
| 2 | Exercises | `exercise_alternatives` pode ter órfãos se `PRAGMA foreign_keys` não estiver ON | `ExpoSQLiteDatabaseClient.ts` |
| 3 | Dashboard | `ImportarBancoUseCase` sem `try/catch` na cópia — usuário pode ficar sem banco | `ImportarBancoUseCase.ts:61` |
| 4 | Histórico | `getHistoricoExercicios` sem batching — estoura limite de 999 bind vars do SQLite com muitos exercícios | `SQLiteHistoricoRepository.ts:92-106` |
| 5 | Exercises | `Exercise.update` não permite atualizar `musculoAlvo` — campo travado para exercícios customizados | `Exercise.ts:94` |
| 6 | Treinos | `ReordenarExerciciosUseCase` não valida que array contém TODOS os IDs — array parcial gera ordens duplicadas | `ReordenarExerciciosUseCase.ts:30-33` |

---

## Módulo: Exercises

### Domínio — `Exercise`

**Bugs e riscos:**
- **`musculoAlvo` não atualizável via `Update`** (`Exercise.ts:94`, `UpdateExerciseUseCase.ts`): campo não está em `UpdateExerciseProps`; exercícios customizados nunca podem ter `musculoAlvo` definido ou corrigido via UI. Impacta feature de substituição que usa esse campo para matching.
- **`Exercise.restore` sem validação** (`Exercise.ts:71-73`): dados corrompidos do banco geram entidade inválida sem erro.
- **`normalizeText` não remove acentos** (`normalizeText.ts:2`): `'Bíceps'` e `'Biceps'` são nomes distintos — duplicatas com variação de acento passam.
- Sem limite máximo de caracteres para `name` e `groupMuscle`.

### `CreateExerciseUseCase`
- **Race condition de duplicata** (`linhas 41-49`): `findByNormalizedName → save` não é atômico.
- **Testes faltando:** nome vazio, nome com 1 char, `groupMuscle` inválido.

### `UpdateExerciseUseCase`
- **`musculoAlvo` não atualizável** — bug de design, bloqueia feature de substituição.
- **Retorna `updatedPrimitives` antes de confirmar `save`** (`linha 52-54`): UI pode ser atualizada com estado não persistido.
- **`updateMedia` não atualiza `updated_at`** no SQLite.
- **Testes faltando:** `musculoAlvo`, `mediaOnline`, exercício `isCustom=false`.

### `DeleteExerciseUseCase`
- **`exercise_alternatives` não limpa explicitamente**: depende de FK CASCADE que está desabilitada (sem `PRAGMA foreign_keys = ON`).
- **`file.delete()` sem `await`** em `ExpoMediaFileCleanup.ts:8`: deleção pode não completar.
- **`startsWith('file://')` pode falhar** em URIs Android (`content://`).

### `ListExercisesUseCase`
- **SQL injection em paginação** (`SQLiteExerciseRepository.ts:52`): `LIMIT ${options.limit} OFFSET ${options.offset}` interpolado diretamente.
- **`InMemoryExerciseRepository.list()` ignora `options`** — testes não testam paginação.
- **Zero testes dedicados.**

### `BaixarMidiaExercicioUseCase`
- **Erros genéricos** (`Error` em vez de tipos específicos): UI não distingue "exercício não encontrado" de "download falhou".
- **`makeDirectoryAsync` silencia todos os erros** — falha de permissão vira erro genérico de FS.
- **Usa `expo-file-system/legacy`** (deprecada); `ExpoMediaFileCleanup` usa API nova — inconsistência.
- **Zero testes.**

### `BaixarMidiasTreinoUseCase`
- **P1 — N+1 queries** (`linhas 31-38`): 1 `findById` por exercício; usar `findByIds(ids)` que já existe.
- **Zero testes.**

### `BaixarTodasMidiasUseCase`
- **`list()` sem paginação** — carrega catálogo inteiro em memória.
- **Zero testes.**

### Repositório SQLite — Problemas
- `LIMIT/OFFSET` interpolado diretamente (SQL injection risk).

### Sumário Exercises

| Prior. | Item |
|--------|------|
| P0 | `exercise_alternatives` órfãs — `PRAGMA foreign_keys` não está ON |
| P0 | `Exercise.update` não permite atualizar `musculoAlvo` |
| P1 | `UpdateExerciseUseCase` retorna antes de confirmar `save` |
| P1 | `BaixarMidiasTreinoUseCase` N+1 queries |
| P1 | SQL injection em `LIMIT/OFFSET` |
| P1 | `file.delete()` sem `await` em `ExpoMediaFileCleanup` |
| P1 | `normalizeText` não remove acentos — duplicatas de acento passam |
| P2 | Zero testes para `List`, `BaixarMidia*` use cases |
| P2 | `updateMedia` não atualiza `updated_at` |
| P2 | Inconsistência expo-file-system legacy vs nova API |

---

## Módulo: Treinos

### Domínio — `TreinoExercicio`
- **`TreinoExercicio.create` sem nenhuma validação** (`TreinoExercicio.ts:19-21`): `ordem < 0`, `seriesRecomendadas = -5`, `cargaPadrao = -100` aceitos.
- **`MetodoExercicio` sem validação no domínio** — valores inválidos só filtrados na infra.

### `CreateTreinoUseCase`
- **Race condition de duplicata** (`linhas 32-36`): `list() → check → save` não atômico.
- **`DuplicateTreinoError` não tratado no hook** — usuário vê mensagem genérica.

### `UpdateTreinoUseCase`
- **Sem verificação de nome duplicado no update** — inconsistência com `Create`.
- **Zero testes.**

### `DuplicarTreinoUseCase`
- **Permite duplicar para nome duplicado** — sem check de unicidade.

### `ReordenarExerciciosUseCase`
- **P0 — Não valida que o array contém TODOS os IDs** (`linhas 30-33`): array parcial gera ordens duplicadas silenciosamente.
- **Sem transação.**
- **Zero testes.**

### `ListTreinoExerciciosUseCase`
- **Não valida existência do `treinoId`** — retorna lista vazia silenciosamente para IDs inexistentes.

### Repositórios SQLite — Problemas
- `updateOrdem/updateRecomendacoes/updateMetodoGrupo` são silent no-ops para ID inexistente — não verificam `rowsAffected`.

### UI — Hooks
- **`useTreinoDetailController`** `loadData` faz N+1 queries para `listAlternativas` (1 por exercício).
- **`DuplicateTreinoError`** cai no catch genérico sem mensagem específica.

### Sumário Treinos

| Prior. | Item |
|--------|------|
| P0 | `ReordenarExerciciosUseCase` não valida array completo de IDs |
| P1 | `UpdateTreinoUseCase` sem check de nome duplicado no rename |
| P1 | `DuplicarTreinoUseCase` permite nomes duplicados |
| P1 | `DuplicateTreinoError` não tratado no hook |
| P2 | Zero testes para 4 use cases de treinos |
| P2 | `TreinoExercicio.create` sem nenhuma validação de invariantes |

---

## Módulo: Sessões

### Domínio — Entidades

**`SessaoTreino`:**
- **Estado `'cancelada'` ausente no tipo**: cancelamento deleta a linha — sem auditoria, sem histórico.
- `restore()` não revalida — status inválido do banco aceito silenciosamente.

**`SessaoExercicio`:**
- `static create()` sem nenhuma validação (`linha 29`): `ordem < 0`, `seriesRecomendadas < 0` aceitos.
- `withSubstituicao()` zera `seriesRecomendadas/execucoesRecomendadas/cargaPadrao` — não documentado.

### `IniciarSessaoUseCase`
- **`findAtiva()` verificado tarde** (`linha 66`): ocorre dentro da transação, depois de buscar treino e todos os exercícios — N queries desnecessárias se já houver sessão ativa.
- **Testes faltando:** `TreinoSemExerciciosError`, `ExerciseNotFoundError`.

### `FinalizarSessaoUseCase`
- **P0 — Não impede re-finalização** (`linha 17`): sessão já finalizada tem `dataHoraFim` sobrescrito. Adicionar `if (!sessao.isAtiva()) throw new SessaoEncerradaError()`.
- **Zero testes.**

### `GetSessaoDetalheUseCase`
- **N+1 de séries** (`linhas 41-44`): N queries paralelas de `listBySessaoExercicioId`. Adicionar `listAllBySessaoId()` ao repo (1 query com JOIN).
- **Zero testes.**

### `RegistrarSerieUseCase`
- **`atualizarCargaSeNecessario` fora da transação** (`linha 65`): série persistida mas carga não atualizada em caso de falha.
- **Viola SRP**: modifica `TreinoExercicio` template como efeito colateral.
- **Zero testes** — use case mais complexo e crítico sem nenhuma cobertura.

### `ToggleExercicioRealizadoUseCase`
- `!sessao?.isAtiva()` inclui `sessao === null` — lança `SessaoEncerradaError` em vez de `SessaoNotFoundError` para dados corrompidos.
- **Zero testes.**

### `AddExercicioASessaoUseCase`
- **`findBySessaoIdAndExercicioId` usa `exercicioId` atual**: exercício substituído pode ser readicionado criando duplicata lógica.
- **Zero testes.**

### `SubstituirExercicioSessaoUseCase`
- **Séries anteriores não deletadas ao substituir**: séries do exercício original ficam associadas ao novo.
- **Não verifica se novo exercício já está na sessão** — pode criar duplicatas.
- **Não impede substituição por si mesmo.**
- **Zero testes.**

### `SugerirTreinoUseCase`
- **Acoplamento cross-domain**: use case de sessão depende de `DashboardRepository`.
- `diaSemanaHoje()` não é injetável — impossível testar deterministicamente.
- **Zero testes.**

### `SugerirProgressaoUseCase`
- **Incremento fixo +2.5 kg** (`linha 63`): não configurável.
- **Zero testes.**

### `SugerirSubstitutosUseCase`
- **`exerciseRepository.list()` carrega TODO o catálogo** (`linha 37`).
- **Matching por `includes`** (`linha 75`): frágil a strings compostas.
- **Zero testes.**

### Sumário Sessões

| Prior. | Item |
|--------|------|
| P0 | `FinalizarSessaoUseCase` sem guard de re-finalização |
| P1 | `RegistrarSerieUseCase` `atualizarCarga` fora da transação |
| P1 | `SubstituirExercicioSessaoUseCase` não verifica duplicata na sessão |
| P1 | `SessaoStatus` sem estado `'cancelada'` |
| P1 | `IniciarSessaoUseCase` verifica `findAtiva()` tarde |
| P2 | Zero testes para 8 use cases de sessão |
| P2 | N+1 de séries em `GetSessaoDetalheUseCase` |
| P2 | Matching por `includes` em `SugerirSubstitutosUseCase` |
| P2 | Incremento fixo +2.5 kg em `SugerirProgressaoUseCase` |

---

## Módulo: Dashboard

### `ImportarBancoUseCase`
- **P0 — Banco deletado sem `try/catch` na cópia** (`linha 61`): backup é criado em `Paths.cache` mas se `pickedFile.copy(dest)` falha o banco original já foi deletado — usuário fica sem banco. Necessário envolver a operação de cópia em try/catch com restauração automática do backup.
- Banco importado mais novo que o schema atual pode causar comportamento inesperado nas migrações.
- **Zero testes.**

### `GetDashboardStatsUseCase` / `GetTreinoEvolucaoUseCase`
- Pass-throughs triviais sem lógica. `treinoId` não validado em `GetTreinoEvolucao`.
- **Zero testes.**

### `ArquivarSessaoUseCase` / `DesarquivarSessaoUseCase`
- **UPDATE silencioso sem verificar `rowsAffected`** — UI pensa que arquivou mas não arquivou.
- Não verifica se sessão está `finalizada` antes de arquivar.
- **Zero testes.**

### `ExportarHistoricoUseCase`
- **Arquivo CSV não deletado após exportação** — acumula em `Paths.document`.
- Injeta `SQLiteDatabaseClient` diretamente (viola separação de camadas).
- **Zero testes.**

### `ExportarBancoUseCase`
- **Acoplamento concreto**: depende de `ExpoSQLiteDatabaseClient` (classe) em vez da interface.
- **Zero testes.**

### `SqliteDashboardRepository` — Problemas SQL
- **`getStats()` — inconsistência de métricas**: `totalSessoes` conta sessões sem séries; `evolucaoPorTreino` exclui essas mesmas sessões.
- **`LIMIT 200` global** (`linha 73`): pode cortar sessões de treinos populosos arbitrariamente.
- Fórmula de 1RM (Epley) com 0 repetições dá resultado semanticamente errado.

### `ExpoSQLiteDatabaseClient` — Problemas
- **`withTransaction` não suporta aninhamento** — segundo `BEGIN` falha; `SAVEPOINT` seria mais robusto.
- **`ensureColumns`** executa 17 queries `PRAGMA table_info` a cada boot — agrupar por tabela (4 queries).

### Sumário Dashboard

| Prior. | Item |
|--------|------|
| P0 | `ImportarBancoUseCase` sem try/catch na cópia — usuário pode perder banco |
| P1 | `arquivar/desarquivar` não verificam `rowsAffected` |
| P1 | Inconsistência `totalSessoes` vs `evolucaoPorTreino` |
| P1 | Arquivo CSV não deletado após exportação |
| P1 | `LIMIT 200` pode cortar sessões recentes |
| P2 | Zero testes para todos os 8 use cases |
| P2 | `withTransaction` sem suporte a aninhamento |
| P2 | `ExportarBancoUseCase` depende de classe concreta (violação DIP) |
| P2 | `ensureColumns` 17 queries por boot |

---

## Módulo: Peso

### Domínio — `RegistroPeso`
- Sem limite superior de `pesoKg` (9999 kg aceito).
- `dataRegistro` aceita datas futuras — proteção só na UI.

### `RegistrarPesoUseCase`
- **Testes faltando:** `NaN`, `Infinity`, observação com só espaços, data futura.

### `SQLiteRegistroPesoRepository`
- `INSERT OR REPLACE` substitui silenciosamente registro existente com mesmo ID.
- Sem testes de integração.

### UI — `usePesoController` / `buildPesoViewModel`
- Parse de vírgula com `replace` sem regex — múltiplas vírgulas ignoradas silenciosamente.
- `deltaPositivo: true` resulta em cor vermelha — naming contra-intuitivo; renomear para `pesoAumentou`.

---

## Módulo: Plano Semanal

### `SetDiaPlanoUseCase`
- `treinoId` string vazia aceito e persistido.

### `GetPlanoSemanalUseCase`
- IDs de treinos deletados retornam no plano sem indicação de referência órfã.

### Geral
- **Zero testes** para ambos os use cases.
- **Sem `InMemoryPlanoSemanalRepository`** — impossível testar use cases sem mocks manuais.

---

## Módulo: Histórico

### `SQLiteHistoricoRepository`
- **P0 — `getHistoricoExercicios` sem batching**: `IN (?)` com > 999 IDs estoura limite do SQLite.
- **Tie-breaking não-determinístico** em `getUltimasExecucoesValidas` para sessões com mesmo `data_hora_fim`.
- `row.ordem!` non-null assertion frágil.
- **Fórmula de 1RM (Epley) duplicada** em SQLite (SQL) e InMemory (TypeScript) — extrair para `src/shared/utils/estimativa1rm.ts`.

### `GetUltimasExecucoesValidasUseCase`
- **Zero testes** — único dos 3 use cases de histórico sem cobertura.

### Geral
- `InMemoryHistoricoRepository.getUltimasExecucoesValidas` usa loop O(N²) sobre registros.
- Sem testes de integração para `SQLiteHistoricoRepository`.

---

## Problemas Transversais (Cross-Cutting)

| Tema | Descrição |
|------|-----------|
| **Transações** | 2 use cases fazem múltiplos writes sem `withTransaction`: `FinalizarSessao` (re-entry risk), `ReordenarExercicios` (N updates não atômicos). |
| **Clean Architecture** | 3 use cases importam `SQLiteDatabaseClient` (infra) diretamente: `AddExercicioAoTreino`, `RegistrarSerie`, `IniciarSessao`. Deveria existir uma abstração `UnitOfWork` na camada de application. |
| **Cobertura de testes** | ~45 use cases; testes existem em: `CreateExercise`, `UpdateExercise`, `DeleteExercise`, `RegistrarPeso`, `ListPeso`, `DeletePeso`, `GetHistoricoExercicio`, `GetUltimaExecucaoValida`, `CancelarSessao`, `IniciarSessao`, `DeleteTreino`, `CreateTreino`, `DuplicarTreino`, `RemoveExercicioDoTreino`, `DeleteSerie`. **Ausência total** em: `Finalizar`, `GetAtiva`, `GetDetalhe`, `RegistrarSerie`, `Toggle`, `Substituir`, `SugerirProgressao`, `SugerirSubstitutos`, `SugerirTreino`, `UpdateTreino`, `Reordenar`, `ListTreinoExercicios`, `ListTreinos`, `BaixarMidias*`, `ArquivarSessao`, `Desarquivar`, `Deletar`, `ExportarHistorico`, `ExportarBanco`, `ImportarBanco`, `GetDashboardStats`, `GetTreinoEvolucao`, `GetPlano`, `SetDia`. |
| **Fórmula 1RM duplicada** | Implementada em SQL (`SqliteDashboardRepository`, `SQLiteHistoricoRepository`) e TypeScript (`InMemoryHistoricoRepository`). Extrair para `src/shared/utils/estimativa1rm.ts`. |
| **Erros genéricos** | `BaixarMidiaExercicioUseCase`, `ExportarHistoricoUseCase` lançam `Error` genérico em vez de tipos — UI não distingue erros. |
| **InMemory incompleto** | `InMemoryPlanoSemanalRepository` ausente. `InMemorySerieRegistradaRepository.deleteByExercicioId` é no-op. `InMemoryExerciseRepository.list()` ignora `options`. |
| **`musculoAlvo` não atualizável** | Campo adicionado ao `Exercise` mas não incluído em `UpdateExerciseProps` nem `UpdateExerciseInput` — exercícios customizados não podem ter o campo definido via UI. |

---

## Ranking de Prioridade Final

### P0 — Corrigir antes do próximo release (6 itens)
1. `FinalizarSessaoUseCase` sem guard de re-finalização (sobrescreve `dataHoraFim`)
2. `ImportarBancoUseCase` sem try/catch na cópia do arquivo (usuário pode perder banco)
3. `exercise_alternatives` órfãs — `PRAGMA foreign_keys = ON` não está configurado
4. `Exercise.update` não permite atualizar `musculoAlvo`
5. `getHistoricoExercicios` sem batching (> 999 IDs quebra SQLite)
6. `ReordenarExerciciosUseCase` não valida array completo de IDs

### P1 — Corrigir em seguida (13 itens)
1. `RegistrarSerieUseCase` — `atualizarCarga` fora da transação
2. `SubstituirExercicioSessaoUseCase` — não verifica duplicata na sessão
3. `UpdateExerciseUseCase` — retorna antes de confirmar `save`
4. `UpdateTreinoUseCase` — sem check de nome duplicado no rename
5. `DuplicarTreinoUseCase` — permite nomes duplicados
6. `BaixarMidiasTreinoUseCase` — N+1 queries (`findById` por exercício)
7. `ArquivarSessaoUseCase/DesarquivarSessaoUseCase` — UPDATE sem verificar `rowsAffected`
8. `IniciarSessaoUseCase` — `findAtiva()` verificado tarde (N queries desnecessárias)
9. `getStats()` — inconsistência `totalSessoes` vs `evolucaoPorTreino`
10. Arquivo CSV não deletado após exportação (`ExportarHistoricoUseCase`)
11. `LIMIT 200` global pode cortar sessões
12. `SessaoStatus` sem estado `'cancelada'`
13. N+1 de séries em `GetSessaoDetalheUseCase`
14. Tie-breaking não-determinístico em `getUltimasExecucoesValidas`
15. `normalizeText` não remove acentos — duplicatas de acento passam
16. IDs de treinos deletados permanecem no plano sem indicação de órfão

### P2 — Melhorias de qualidade (17 itens)
1. **Cobertura de testes** para ~30 use cases sem testes
2. **Fórmula 1RM duplicada** — extrair para utilitário compartilhado
3. `InMemoryPlanoSemanalRepository` ausente
4. `withTransaction` sem suporte a aninhamento (`SAVEPOINT`)
5. `ensureColumns` 17 queries por boot — agrupar por tabela
6. `ExportarBancoUseCase/ImportarBancoUseCase` dependem de classe concreta
7. `SugerirSubstitutosUseCase` matching por `includes` frágil
8. Incremento fixo +2.5 kg em `SugerirProgressaoUseCase`
9. `DuplicateTreinoError` não tratado no hook (mensagem genérica)
10. N+1 de `listAlternativas` em `useTreinoDetailController`
11. `TreinoExercicio.create` sem nenhuma validação de invariantes
12. `updateMedia` não atualiza `updated_at`
13. Inconsistência `expo-file-system/legacy` vs nova API
14. `deltaPositivo` naming contra-intuitivo — renomear para `pesoAumentou`
15. Parse de vírgula sem regex global em `usePesoController`
16. `MetodoExercicio` sem validação no domínio
17. `grupoId` sem verificação de existência
