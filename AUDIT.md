# Auditoria de Use Cases e Domínio
> Gerada em 2026-05-21. Cobre toda a camada `application/**/use-cases/` e `domain/**`.
> Classificação: **P0** = corrupção/bloqueio de dados · **P1** = bug lógico/risk real · **P2** = qualidade/melhoria

---

## Sumário Executivo de P0s

| # | Módulo | Problema | Arquivo |
|---|--------|----------|---------|
| 1 | Sessões | `CancelarSessaoUseCase` sem transação — falha parcial deixa sessão em_andamento sem exercícios, bloqueando o app | `CancelarSessaoUseCase.ts:23-27` |
| 2 | Sessões | `FinalizarSessaoUseCase` não impede re-finalização — sobrescreve `dataHoraFim` | `FinalizarSessaoUseCase.ts:17` |
| 3 | Sessões | `DeleteSerieUseCase` não verifica sessão ativa — deleta séries de histórico finalizado | `DeleteSerieUseCase.ts:13-18` |
| 4 | Exercises | `DeleteExerciseUseCase` sem transação — cascata parcial corrompe banco | `DeleteExerciseUseCase.ts:34-37` |
| 5 | Exercises | `exercise_alternatives` pode ter órfãos se `PRAGMA foreign_keys` não estiver ON | `SQLiteExerciseRepository.ts` |
| 6 | Treinos | `DeleteTreinoUseCase` sem transação — deleção parcial possível | `DeleteTreinoUseCase.ts:22-24` |
| 7 | Treinos | `DuplicarTreinoUseCase` sem transação — treino salvo sem exercícios | `DuplicarTreinoUseCase.ts:33-51` |
| 8 | Treinos | `RemoveExercicioDoTreinoUseCase` sem transação — ordens corrompidas | `RemoveExercicioDoTreinoUseCase.ts:21-29` |
| 9 | Dashboard | `DeletarSessaoUseCase` sem transação — 3 DELETEs sem atomicidade | `SqliteDashboardRepository.ts:267-281` |
| 10 | Dashboard | `ImportarBancoUseCase` sem `try/catch` na cópia — usuário pode ficar sem banco | `ImportarBancoUseCase.ts:48-61` |
| 11 | Dashboard | `ResetHistoricoUseCase` não filtra `status='finalizada'` — destroi sessão ativa | `ResetHistoricoUseCase.ts:12-15` |
| 12 | Plano | `SQLitePlanoSemanalRepository.setDia` usa `UPDATE` sem verificar se linha existe — configuração descartada silenciosamente | `SQLitePlanoSemanalRepository.ts:24-28` |
| 13 | Histórico | `getHistoricoExercicios` sem batching — estoura limite de 999 bind vars do SQLite com muitos exercícios | `SQLiteHistoricoRepository.ts:92-106` |

---

## Módulo: Exercises

### Domínio — `Exercise`

**Bugs e riscos:**
- **`musculoAlvo` não atualizável via `Update`** (`Exercise.ts:94`, `UpdateExerciseUseCase.ts:6-14`): campo não está em `UpdateExerciseProps`; exercícios customizados nunca podem ter `musculoAlvo` definido ou corrigido. Impacta diretamente o feature de substituição que usa esse campo para matching.
- **`Exercise.restore` sem validação** (`Exercise.ts:71-73`): dados corrompidos do banco geram entidade inválida sem erro.
- **`normalizeText` não remove acentos** (`normalizeText.ts:2`): `'Bíceps'` e `'Biceps'` são nomes distintos — duplicatas com variação de acento passam.
- **Typo na mensagem** (`Exercise.ts:107`): `"e obrigatorio"` → deveria ser `"é obrigatório"`.
- **`loadUnit` hardcoded como `'kg'`** (`Exercise.ts:11,61,88`): nenhuma abstração para unidades alternativas.
- Sem limite máximo de caracteres para `name` e `groupMuscle`.

### `CreateExerciseUseCase`
- **Propósito:** Cria exercício no catálogo garantindo unicidade pelo nome normalizado.
- **Race condition de duplicata** (`linhas 41-49`): `findByNormalizedName → save` não é atômico. UNIQUE constraint do SQLite capturaria, mas resultaria em erro genérico de DB, não `DuplicateExerciseError`.
- **`category` string vazia aceita silenciosamente** (`linha 49`): `normalizeOptionalText('')` retorna `null` mas o tipo `string` no input não documenta isso.
- **Testes faltando:** nome vazio, nome com 1 char, `groupMuscle` inválido, `isCustom=true` no retorno, campos opcionais.

### `UpdateExerciseUseCase`
- **`musculoAlvo` não atualizável** — bug de design, bloqueia feature de substituição.
- **Retorna `updatedPrimitives` antes de confirmar `save`** (`linha 52-54`): UI pode ser atualizada com estado não persistido. Mover `return` para após o `await save`.
- **`updateMedia` não atualiza `updated_at`** no SQLite — campo de auditoria desatualizado.
- **Testes faltando:** `UpdateExerciseUseCase` sem testes dedicados para `musculoAlvo`, `mediaOnline`, exercício `isCustom=false`.

### `DeleteExerciseUseCase`
- **P0 — Cascata manual sem transação** (`linhas 34-37`): 4 DELETEs sequenciais; falha entre passos deixa banco inconsistente.
- **`exercise_alternatives` não limpa explicitamente**: depende de FK CASCADE que pode estar desabilitada.
- **`file.delete()` sem `await`** em `ExpoMediaFileCleanup.ts:8`: deleção pode não completar.
- **`startsWith('file://')` pode falhar** em URIs Android (`content://`).
- **Testes faltando:** verificação de cascade nos repos dependentes, `mediaFileCleanup` mockado.

### `ListExercisesUseCase`
- **Dupla ordenação** (`SQLiteExerciseRepository.ts:58` + `ListExercisesUseCase.ts:13`): SQL ordena por `normalized_name ASC`, use case reordena por `localeCompare('pt-BR')` — podem divergir para exercícios customizados com acentos.
- **SQL injection em paginação** (`SQLiteExerciseRepository.ts:52`): `LIMIT ${options.limit} OFFSET ${options.offset}` interpolado diretamente. Usar parâmetros bindados.
- **`InMemoryExerciseRepository.list()` ignora `options`** — testes não testam paginação.
- **Zero testes dedicados.**

### `BaixarMidiaExercicioUseCase`
- **Erros genéricos** (`Error` em vez de tipos específicos): UI não distingue "exercício não encontrado" de "download falhou".
- **Re-download sobrescreve sem verificação** de arquivo existente.
- **`makeDirectoryAsync` silencia todos os erros** — falha de permissão vira erro genérico de FS.
- **Usa `expo-file-system/legacy`** (deprecada); `ExpoMediaFileCleanup` usa API nova — inconsistência.
- **Zero testes.**

### `BaixarMidiasTreinoUseCase`
- **P1 — N+1 queries** (`linhas 31-38`): 1 `findById` por exercício; usar `findByIds(ids)` que já existe.
- **Progresso reportado antes do download** (semântica "iniciando" em vez de "concluído").
- **Falhas silenciosas** sem contagem de `falhos` no retorno.
- **Download sequencial** — sem concorrência (diferente de `BaixarTodasMidiasUseCase`).
- **Zero testes.**

### `BaixarTodasMidiasUseCase`
- **`list()` sem paginação** — carrega catálogo inteiro em memória.
- **Sem cancelamento** — sem `AbortController`.
- **Falhas totalmente silenciosas** sem logging.
- **Zero testes.**

### Repositório SQLite — Problemas
- `INSERT OR REPLACE` pode quebrar FKs com `ON DELETE CASCADE` — DELETE+INSERT implícito.
- `LIMIT/OFFSET` interpolado diretamente (SQL injection risk).
- `musculo_alvo ?? null` redundante mas funcional.

### Sumário Exercises

| Prior. | Item |
|--------|------|
| P0 | `DeleteExerciseUseCase` cascata sem transação |
| P0 | `exercise_alternatives` órfãs se FK desabilitada |
| P0 | `Exercise.update` não permite atualizar `musculoAlvo` |
| P1 | `UpdateExerciseUseCase` retorna antes de confirmar `save` |
| P1 | `BaixarMidiasTreinoUseCase` N+1 queries |
| P1 | SQL injection em `LIMIT/OFFSET` |
| P1 | `file.delete()` sem `await` em `ExpoMediaFileCleanup` |
| P1 | `normalizeText` não remove acentos — duplicatas de acento passam |
| P2 | Zero testes para `List`, `BaixarMidia*` use cases |
| P2 | Typo `"e obrigatorio"` |
| P2 | `updateMedia` não atualiza `updated_at` |
| P2 | Inconsistência expo-file-system legacy vs nova API |

---

## Módulo: Treinos

### Domínio — `Treino`
- **Typo** (`Treino.ts:62`): `'e obrigatorio'` → `'é obrigatório'`.
- Sem limite máximo de chars para `name` e `objetivo`.
- `Treino.restore` sem validação de primitivos.

### Domínio — `TreinoExercicio`
- **`TreinoExercicio.create` sem nenhuma validação** (`TreinoExercicio.ts:19-21`): `ordem < 0`, `seriesRecomendadas = -5`, `cargaPadrao = -100` aceitos.
- **`MetodoExercicio` sem validação no domínio** — valores inválidos só filtrados na infra.
- **`grupoId` sem verificação de existência.**

### `CreateTreinoUseCase`
- **Race condition de duplicata** (`linhas 32-36`): `list() → check → save` não atômico.
- **`list()` inteira para checar duplicata** — ineficiente; precisaria `findByName` no repo.
- **`DuplicateTreinoError` não tratado no hook** — usuário vê mensagem genérica.
- **Testes faltando:** `DuplicateTreinoError`, nome com espaços duplos.

### `UpdateTreinoUseCase`
- **Sem verificação de nome duplicado no update** — inconsistência com `Create`.
- **Zero testes.**

### `DeleteTreinoUseCase`
- **P0 — Sem transação** (`linhas 22-24`): 3 deletes sequenciais.
- `SerieRegistrada` e `SessaoExercicio` dependem de FK CASCADE; não verificado se ativo.
- **Testes faltando:** verificar deleção de `TreinoExercicio`s.

### `DuplicarTreinoUseCase`
- **P0 — Sem transação** (`linhas 33-51`): treino salvo antes dos exercícios; falha deixa treino vazio.
- **Loop sequencial de `save`** — usar `Promise.all`.
- **Permite duplicar para nome duplicado** — sem check de unicidade.
- **Zero testes.**

### `AddExercicioAoTreinoUseCase`
- **`database` opcional** — se não injetado, executa sem transação (produção sempre injeta, mas frágil).
- **Viola Clean Architecture**: use case de application importa interface de infraestrutura (`SQLiteDatabaseClient`).
- **Zero testes.**

### `RemoveExercicioDoTreinoUseCase`
- **P0 — Sem transação**: `delete + N×updateOrdem` não atômicos.
- **`Promise.all` de N writes paralelos** sem transação.
- **Não bloqueia remoção com sessão ativa.**
- **Zero testes.**

### `ReordenarExerciciosUseCase`
- **Não valida que o array contém TODOS os IDs** (`linhas 30-33`): array parcial gera ordens duplicadas silenciosamente.
- **Sem transação.**
- **Zero testes.**

### `ListTreinoExerciciosUseCase`
- **Não valida existência do `treinoId`** — retorna lista vazia silenciosamente para IDs inexistentes.

### Repositórios SQLite — Problemas
- `updateOrdem/updateRecomendacoes/updateMetodoGrupo` são silent no-ops para ID inexistente — não verificam `rowsAffected`.
- `INSERT OR REPLACE` pode acionar FK CASCADE apagando exercícios vinculados.

### UI — Hooks
- **`useTreinoDetailController`** `loadData` faz N+1 queries para `listAlternativas` (1 por exercício).
- **`DuplicateTreinoError`** cai no catch genérico sem mensagem específica.
- **`onAddAlternativa/onRemoveAlternativa`** não expõem erro ao usuário.
- **`feedbackMessage`** sem auto-dismiss.

### Sumário Treinos

| Prior. | Item |
|--------|------|
| P0 | `DeleteTreinoUseCase` sem transação |
| P0 | `DuplicarTreinoUseCase` sem transação |
| P0 | `RemoveExercicioDoTreinoUseCase` sem transação |
| P0 | `ReordenarExerciciosUseCase` não valida array completo de IDs |
| P0 | `updateOrdem` silent no-op para ID inexistente |
| P1 | `UpdateTreinoUseCase` sem check de nome duplicado |
| P1 | `DuplicarTreinoUseCase` permite nomes duplicados |
| P1 | `DuplicateTreinoError` não tratado no hook |
| P1 | `AddExercicioAoTreinoUseCase` importa infra no use case (violação DIP) |
| P1 | N+1 de `listAlternativas` em `useTreinoDetailController` |
| P2 | Zero testes para 6 use cases de treinos |
| P2 | `TreinoExercicio.create` sem nenhuma validação |
| P2 | Typo `'e obrigatorio'` |

---

## Módulo: Sessões

### Domínio — Entidades

**`SessaoTreino`:**
- **Estado `'cancelada'` ausente no tipo** (`SessaoTreino.ts:1`): cancelamento deleta a linha — sem auditoria, sem histórico, potencial estado-zumbi se delete falha parcialmente.
- Sem validação de `treinoNomeSnapshot` vazio ou `dataHoraInicio` no futuro.
- `restore()` não revalida — status inválido do banco aceito silenciosamente.

**`SessaoExercicio`:**
- `static create()` sem nenhuma validação (`linha 29`): `ordem < 0`, `seriesRecomendadas < 0` aceitos.
- `withSubstituicao()` zera `seriesRecomendadas/execucoesRecomendadas/cargaPadrao` — não documentado.

**`SerieRegistrada`:**
- Única entidade com validações reais: `cargaKg >= 0`, `repeticoes >= 1`.
- Sem validação de `ordem >= 1`.

### `IniciarSessaoUseCase`
- **`findAtiva()` verificado tarde** (`linha 66`): ocorre dentro da transação, depois de buscar treino e todos os exercícios — N queries desnecessárias se já houver sessão ativa. Mover para primeiro passo.
- Sem batch insert de `SessaoExercicio` — N INSERTs sequenciais para treinos grandes.
- **Testes faltando:** `TreinoSemExerciciosError`, `ExerciseNotFoundError`, múltiplos exercícios verificando ordem.

### `CancelarSessaoUseCase`
- **P0 — Sem transação** (`linhas 23-27`): 3 deletes sequenciais; falha entre eles deixa sessão `em_andamento` sem exercícios — bloqueia permanentemente novas sessões.

### `FinalizarSessaoUseCase`
- **P0 — Não impede re-finalização** (`linha 17`): sessão já finalizada tem `dataHoraFim` sobrescrito. Adicionar `if (!sessao.isAtiva()) throw new SessaoEncerradaError()`.
- Não verifica se ao menos um exercício foi realizado.
- **Zero testes.**

### `GetSessaoDetalheUseCase`
- **N+1 de séries** (`linhas 41-44`): N queries paralelas de `listBySessaoExercicioId`. Adicionar `listAllBySessaoId()` ao repo (1 query com JOIN).
- **Zero testes.**

### `RegistrarSerieUseCase`
- **`atualizarCargaSeNecessario` fora da transação** (`linha 73`): série persistida mas carga não atualizada em caso de falha.
- **Série de aquecimento pode atualizar `cargaPadrao`** (`linhas 83-85`): sem verificação de `tipoSerie`. Adicionar `if (input.tipoSerie === 'aquecimento') return`.
- **Viola SRP**: modifica `TreinoExercicio` template como efeito colateral. Deveria ser evento de domínio.
- **Zero testes** — use case mais complexo e crítico sem nenhuma cobertura.

### `DeleteSerieUseCase`
- **P0 — Não verifica sessão ativa** (`linhas 13-18`): séries de sessões finalizadas podem ser deletadas, corrompendo histórico.
- Não reordena séries restantes — "buracos" na numeração (1, 3 após deletar 2).
- **Zero testes.**

### `ToggleExercicioRealizadoUseCase`
- `!sessao?.isAtiva()` inclui `sessao === null` — lança `SessaoEncerradaError` em vez de `SessaoNotFoundError` para dados corrompidos.
- **Zero testes.**

### `AddExercicioASessaoUseCase`
- **`findBySessaoIdAndExercicioId` usa `exercicioId` atual** (`linhas 45-49`): exercício substituído pode ser readicionado criando duplicata lógica.
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
- **Incremento fixo +2.5 kg** (`linha 63`): não configurável por exercício ou categoria.
- Depende da ordenação de `getHistoricoExercicio()` — não garantida pela interface.
- **Zero testes** (lógica pura em `_avaliar` ideal para unit tests).

### `SugerirSubstitutosUseCase`
- **`exerciseRepository.list()` carrega TODO o catálogo** (`linha 37`): adicionar `listByGrupoMuscular()`.
- **Matching por `includes`** (`linha 75`): `ep.groupMuscle.includes(grupoMuscular)` — frágil a strings compostas.
- **Zero testes.**

### Repositórios InMemory — Problemas
- `InMemorySerieRegistradaRepository.deleteByExercicioId` é no-op explícito — testes que dependam de cascade falham silenciosamente.
- Deletar de `Map` durante iteração é seguro mas frágil como padrão.

### Sumário Sessões

| Prior. | Item |
|--------|------|
| P0 | `CancelarSessaoUseCase` sem transação — bloqueia app permanentemente |
| P0 | `FinalizarSessaoUseCase` sem guard de re-finalização |
| P0 | `DeleteSerieUseCase` não verifica sessão ativa |
| P1 | `RegistrarSerieUseCase` atualiza carga de série de aquecimento |
| P1 | `RegistrarSerieUseCase` `atualizarCarga` fora da transação |
| P1 | `SubstituirExercicioSessaoUseCase` não verifica duplicata na sessão |
| P1 | `SessaoStatus` sem estado `'cancelada'` |
| P1 | `IniciarSessaoUseCase` verifica `findAtiva()` tarde |
| P2 | Zero testes para 9 de 13 use cases de sessão |
| P2 | N+1 de séries em `GetSessaoDetalheUseCase` |
| P2 | Matching por `includes` em `SugerirSubstitutosUseCase` |
| P2 | Incremento fixo +2.5 kg em `SugerirProgressaoUseCase` |

---

## Módulo: Dashboard

### Domínio — `DashboardRepository`
- **`arquivar/desarquivar/deletar Sessao` não pertencem ao Dashboard** semanticamente — deveriam estar em `SessaoTreinoRepository`.
- **`findSugestaoRotacao/findTreinoComUltimaSessao`** também são de domínio de Sessão/Treino, não Dashboard.
- `DashboardStats.evolucaoPorTreino` une stats de alto nível e dados detalhados — escalabilidade ruim.
- Sem tipos de erro de domínio — erros de infra propagam crus para UI.

### `GetDashboardStatsUseCase` / `GetTreinoEvolucaoUseCase`
- Pass-throughs triviais sem lógica. `treinoId` não validado em `GetTreinoEvolucao`.
- **Zero testes.**

### `ArquivarSessaoUseCase` / `DesarquivarSessaoUseCase`
- **UPDATE silencioso sem verificar `rowsAffected`** — UI pensa que arquivou mas não arquivou.
- Não verifica se sessão está `finalizada` antes de arquivar.
- **Zero testes.**

### `DeletarSessaoUseCase`
- **P0 — 3 queries destrutivas sem transação** (`SqliteDashboardRepository.ts:267-281`).
- FKs com `ON DELETE CASCADE` resolveriam isso automaticamente se `PRAGMA foreign_keys = ON`.
- **Zero testes.**

### `ExportarHistoricoUseCase`
- **Arquivo CSV não deletado após exportação** — acumula em `Paths.document`.
- Inclui sessões arquivadas sem documentar a decisão.
- `file.write(csv)` — verificar se é síncrono ou precisa de `await`.
- Injeta `SQLiteDatabaseClient` diretamente (viola separação de camadas).
- **Zero testes.**

### `ExportarBancoUseCase`
- **Acoplamento concreto**: depende de `ExpoSQLiteDatabaseClient` (classe) em vez da interface.
- `checkpointWal` e `databaseFileName` ausentes na interface `SQLiteDatabaseClient`.
- **Zero testes.**

### `ImportarBancoUseCase`
- **P0 — Banco deletado sem `try/catch` na cópia** (`linhas 48-61`): usuário pode ficar sem banco.
- Backup em `Paths.cache` sem mecanismo de restauração automática.
- Banco importado mais novo que o schema atual pode causar comportamento inesperado nas migrações.
- **Zero testes.**

### `ResetHistoricoUseCase`
- **P0 — Não filtra `status='finalizada'`** (`linhas 12-15`): sessão em andamento destruída.
- Injeta `SQLiteDatabaseClient` diretamente em vez de repositório.

### `SqliteDashboardRepository` — Problemas SQL

- **`getStats()` — inconsistência de métricas**: `totalSessoes` conta sessões sem séries; `evolucaoPorTreino` exclui essas mesmas sessões.
- **`LIMIT 200` global** (`linha 73`): pode cortar sessões de treinos populosos arbitrariamente.
- **Nenhum índice criado em nenhuma migration** — full scans em `sessao_treinos`, `sessao_exercicios`, `series_registradas`. Índices necessários: `(status, arquivado, data_hora_inicio)`, `(sessao_treino_id)`, `(sessao_exercicio_id, tipo_serie)`, `(treino_id, status)`.
- **`findSugestaoRotacao` sem índice em `sessao_treinos(treino_id)`** — custo O(n*m) sem índice.
- Fórmula de 1RM (Epley) com 0 repetições dá resultado semanticamente errado.

### `ExpoSQLiteDatabaseClient` — Problemas
- **`withTransaction` não suporta aninhamento** — segundo `BEGIN` falha; `SAVEPOINT` seria mais robusto.
- **`ensureColumns`** executa 17 queries `PRAGMA table_info` a cada boot — agrupar por tabela (4 queries).
- **Split de SQL por `;`** frágil para strings com `;` literal nas migrations futuras.
- `PRAGMA wal_checkpoint(FULL)` — `TRUNCATE` reduziria tamanho do arquivo de backup.

### Sumário Dashboard

| Prior. | Item |
|--------|------|
| P0 | `DeletarSessaoUseCase` sem transação |
| P0 | `ImportarBancoUseCase` sem try/catch na cópia |
| P0 | `ResetHistoricoUseCase` destrói sessão ativa |
| P1 | `arquivar/desarquivar` não verificam `rowsAffected` |
| P1 | Inconsistência `totalSessoes` vs `evolucaoPorTreino` |
| P1 | Arquivo CSV não deletado após exportação |
| P1 | `LIMIT 200` pode cortar sessões recentes |
| P2 | Zero índices SQL em toda a base |
| P2 | Zero testes para todos os 9 use cases |
| P2 | `withTransaction` sem suporte a aninhamento |
| P2 | `ExportarBancoUseCase` depende de classe concreta (violação DIP) |
| P2 | `ensureColumns` 17 queries por boot |

---

## Módulo: Peso

### Domínio — `RegistroPeso`
- Sem limite superior de `pesoKg` (9999 kg aceito).
- `id` não validado (string vazia aceita).
- `restore()` sem validação — dados corrompidos geram entidade inválida.
- `dataRegistro` aceita datas futuras — proteção só na UI.

### `RegistrarPesoUseCase`
- `dataRegistro` futuro aceito na camada de aplicação.
- Parse de vírgula (`replace(',', '.')`) feito na UI, não no use case — inconsistência de responsabilidade.
- **Testes faltando:** `NaN`, `Infinity`, observação com só espaços, data futura.

### `ListRegistrosPesoUseCase`
- Ordering delegado ao repo sem contrato explícito na interface — repositório futuro poderia quebrar silenciosamente.
- Sem paginação.

### `DeleteRegistroPesoUseCase`
- `id` não validado — string vazia é no-op silencioso.
- Sem confirmação de que o registro existia.

### `SQLiteRegistroPesoRepository`
- `INSERT OR REPLACE` substitui silenciosamente registro existente com mesmo ID.
- Sem índice em `data_registro` — full scan para `ORDER BY`.
- Sem testes de integração.

### UI — `usePesoController` / `buildPesoViewModel`
- `loadRegistros` não memoizada com `useCallback`.
- `startTransition` inconsistente (usado em load, não em delete).
- Parse de vírgula com `replace` sem regex — múltiplas vírgulas ignoradas silenciosamente.
- `pesoAtual` exibido sem formatação de decimal consistente (diferente de `formatDelta`).
- `deltaPositivo: true` resulta em cor vermelha — naming contra-intuitivo; renomear para `pesoAumentou`.

---

## Módulo: Plano Semanal

### `SQLitePlanoSemanalRepository`
- **P0 — `setDia` usa `UPDATE` puro** (`linhas 24-28`): se a linha não existir no banco, UPDATE é no-op silencioso — configuração do usuário descartada. Usar `INSERT OR REPLACE`. Verificar se existe migration que popula as 7 linhas iniciais.

### `SetDiaPlanoUseCase`
- `treinoId` string vazia aceito e persistido.
- `dia: DiaSemana` não tem type guard em runtime.

### `GetPlanoSemanalUseCase`
- IDs de treinos deletados retornam no plano sem indicação de referência órfã.

### Geral
- **Zero testes** para ambos os use cases.
- **Sem `InMemoryPlanoSemanalRepository`** — impossível testar use cases sem mocks manuais.
- `diaSemanaHoje()` sem testes e não injetável.

---

## Módulo: Histórico

### `SQLiteHistoricoRepository`
- **P0 — `getHistoricoExercicios` sem batching**: `IN (?)` com > 999 IDs estoura limite do SQLite.
- **Tie-breaking não-determinístico** em `getUltimasExecucoesValidas` para sessões com mesmo `data_hora_fim`.
- `tipoSerie` cast inseguro `as 'aquecimento' | 'valida'` — valor inválido do banco aceito.
- `row.ordem!` non-null assertion frágil.
- **Fórmula de 1RM (Epley) duplicada** em SQLite (SQL) e InMemory (TypeScript) — extrair para `src/shared/utils/estimativa1rm.ts`.
- Sem índices em `se.exercicio_id`, `st.status`, `st.data_hora_fim`.
- `getUltimasExecucoesValidas` trafega todas as séries e descarta no TS — ineficiente para volumes grandes.

### `GetUltimasExecucoesValidasUseCase`
- **Zero testes** — único dos 3 use cases de histórico sem cobertura.

### Geral
- `InMemoryHistoricoRepository.getUltimasExecucoesValidas` usa loop O(N²) sobre registros.
- Sem testes de integração para `SQLiteHistoricoRepository`.

---

## Problemas Transversais (Cross-Cutting)

| Tema | Descrição |
|------|-----------|
| **Transações** | 8 use cases fazem múltiplos writes sem `withTransaction`. Ver: `CancelarSessao`, `FinalizarSessao` (re-entry), `DeletarSessao`, `DeleteTreino`, `DuplicarTreino`, `RemoveExercicioDoTreino`, `DeleteExercise`, `DeleteSerie`. |
| **Índices SQL** | Nenhuma migration cria índice explicitamente. Full scans em todas as tabelas principais (`sessao_treinos`, `sessao_exercicios`, `series_registradas`, `exercises`). |
| **Clean Architecture** | 4 use cases importam `SQLiteDatabaseClient` (infra) diretamente: `AddExercicioAoTreino`, `AddExercicioASessao`, `RegistrarSerie`, `IniciarSessao`. Deveria existir uma abstração `UnitOfWork` na camada de application. |
| **Cobertura de testes** | ~55 use cases; testes existem em: `CreateExercise`, `UpdateExercise`, `DeleteExercise`, `RegistrarPeso`, `ListPeso`, `DeletePeso`, `GetHistoricoExercicio`, `GetUltimaExecucaoValida`, `CancelarSessao`, `IniciarSessao`, `DeleteTreino`, `CreateTreino`. **Ausência total** em: `Finalizar`, `GetAtiva`, `GetDetalhe`, `RegistrarSerie`, `DeleteSerie`, `Toggle`, `Substituir`, `SugerirProgressao`, `SugerirSubstitutos`, `SugerirTreino`, `UpdateTreino`, `Duplicar`, `AddExercicioAoTreino`, `RemoveExercicio`, `Reordenar`, `ListTreinoExercicios`, `ListTreinos`, `BaixarMidias*`, `ArquivarSessao`, `Desarquivar`, `Deletar`, `ExportarHistorico`, `ExportarBanco`, `ImportarBanco`, `Reset`, `GetDashboardStats`, `GetTreinoEvolucao`, `GetPlano`, `SetDia`. |
| **Fórmula 1RM duplicada** | Implementada em SQL (`SqliteDashboardRepository`, `SQLiteHistoricoRepository`) e TypeScript (`InMemoryHistoricoRepository`). Extrair para `src/shared/utils/estimativa1rm.ts`. |
| **Erros genéricos** | `BaixarMidiaExercicioUseCase`, `ExportarHistoricoUseCase` lançam `Error` genérico em vez de tipos — UI não distingue erros. |
| **InMemory incompleto** | `InMemoryPlanoSemanalRepository` ausente. `InMemorySerieRegistradaRepository.deleteByExercicioId` é no-op. `InMemoryExerciseRepository.list()` ignora `options`. |
| **`musculoAlvo` não atualizável** | Campo adicionado ao `Exercise` mas não incluído em `UpdateExerciseProps` nem `UpdateExerciseInput` — exercícios customizados não podem ter o campo definido via UI. |

---

## Ranking de Prioridade Final

### P0 — Corrigir antes do próximo release (13 itens)
1. `CancelarSessaoUseCase` sem transação (bloqueia app)
2. `FinalizarSessaoUseCase` sem guard de re-finalização
3. `DeleteSerieUseCase` não verifica sessão ativa
4. `DeleteExerciseUseCase` cascata sem transação
5. `DeleteTreinoUseCase` sem transação
6. `DuplicarTreinoUseCase` sem transação
7. `RemoveExercicioDoTreinoUseCase` sem transação
8. `DeletarSessaoUseCase` (Dashboard) sem transação
9. `ImportarBancoUseCase` sem try/catch na cópia do arquivo
10. `ResetHistoricoUseCase` não filtra `status='finalizada'`
11. `SQLitePlanoSemanalRepository.setDia` UPDATE silencioso
12. `getHistoricoExercicios` sem batching (> 999 IDs quebra SQLite)
13. `Exercise.update` não permite atualizar `musculoAlvo`

### P1 — Corrigir em seguida (18 itens)
1. `RegistrarSerieUseCase` — série de aquecimento pode atualizar `cargaPadrao`
2. `RegistrarSerieUseCase` — `atualizarCarga` fora da transação
3. `SubstituirExercicioSessaoUseCase` — não verifica duplicata na sessão
4. `UpdateExerciseUseCase` — retorna antes de confirmar `save`
5. `UpdateTreinoUseCase` — sem check de nome duplicado no rename
6. `DuplicarTreinoUseCase` — permite nomes duplicados
7. `ReordenarExerciciosUseCase` — não valida array completo de IDs
8. `BaixarMidiasTreinoUseCase` — N+1 queries (`findById` por exercício)
9. `ArquivarSessaoUseCase/DesarquivarSessaoUseCase` — UPDATE sem verificar `rowsAffected`
10. `IniciarSessaoUseCase` — `findAtiva()` verificado tarde (N queries desnecessárias)
11. `getStats()` — inconsistência `totalSessoes` vs `evolucaoPorTreino`
12. Arquivo CSV não deletado após exportação (`ExportarHistoricoUseCase`)
13. `LIMIT 200` global pode cortar sessões
14. `SessaoStatus` sem estado `'cancelada'`
15. N+1 de séries em `GetSessaoDetalheUseCase`
16. Tie-breaking não-determinístico em `getUltimasExecucoesValidas`
17. `normalizeText` não remove acentos — duplicatas de acento passam
18. IDs de treinos deletados permanecem no plano sem indicação de órfão

### P2 — Melhorias de qualidade (20+ itens)
1. **Índices SQL** em todas as tabelas principais (nenhum existe)
2. **Cobertura de testes** para ~40 use cases sem testes
3. **Fórmula 1RM duplicada** — extrair para utilitário compartilhado
4. `InMemoryPlanoSemanalRepository` ausente
5. `withTransaction` sem suporte a aninhamento (`SAVEPOINT`)
6. `ensureColumns` 17 queries por boot — agrupar por tabela
7. `ExportarBancoUseCase/ImportarBancoUseCase` dependem de classe concreta
8. `SugerirSubstitutosUseCase` matching por `includes` frágil
9. Incremento fixo +2.5 kg em `SugerirProgressaoUseCase`
10. `DuplicateTreinoError` não tratado no hook (mensagem genérica)
11. N+1 de `listAlternativas` em `useTreinoDetailController`
12. Typo `'e obrigatorio'` (Treino.ts e Exercise.ts)
13. `TreinoExercicio.create` sem nenhuma validação de invariantes
14. `updateMedia` não atualiza `updated_at`
15. Inconsistência `expo-file-system/legacy` vs nova API
16. `deltaPositivo` naming contra-intuitivo — renomear para `pesoAumentou`
17. Parse de vírgula sem regex global em `usePesoController`
18. Split de SQL por `;` frágil nas migrations futuras
19. `MetodoExercicio` sem validação no domínio
20. `grupoId` sem verificação de existência

---

*Próximo passo sugerido: trabalhar os P0s na ordem do ranking acima, começando por `FinalizarSessaoUseCase` e `DeleteSerieUseCase` (1-2 linhas cada) e depois os use cases sem transação.*
