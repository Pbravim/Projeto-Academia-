# Rodada 3 — Agente C: Sync & Conflitos mobile↔API

Escopo: SyncEngine, SyncApiClient, 7 repositórios syncáveis (mobile SQLite), sync.service/controller (NestJS+Prisma), contratos (`packages/contracts/src/sync.dto.ts`), AuthSession/SecureTokenStore.
Modo read-only. Todos os caminhos absolutos.

---

## SUSPEITA 1 — janela do dirty-clear: **CONFIRMADA** (P0)

### Como o clear funciona (linha a linha)

Não existe `clearDirty()` em lugar nenhum. O flag `dirty` é limpo por **echo-back**:

1. `SyncEngine.run()` (`apps/mobile/src/infrastructure/sync/SyncEngine.ts:85-91`) chama `getDirty()` dos 7 repos (snapshot em memória das linhas com `dirty = 1`).
2. Push para `POST /sync`. O servidor aplica com `serverUpdatedAt = now` (`apps/api/src/sync/sync.service.ts:88,103` etc.) e, **na mesma transação**, faz o pull com `serverUpdatedAt > since` onde `since` é o cursor ANTIGO (`sync.service.ts:23,443-445`). As linhas recém-pushadas têm `serverUpdatedAt = now > since`, logo **voltam ecoadas** em `serverChanges`.
3. No mobile, `applyServerRows` grava cada linha ecoada com `INSERT OR REPLACE ... dirty = 0`:
   - `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts:70-71` → `VALUES (?, ?, ?, ?, ?, ?, 0, 1)` ← **linha exata do clear**
   - idem: `SQLiteExerciseRepository.ts:321-327`, `SQLiteTreinoExercicioRepository.ts:144-148`, `SQLiteSessaoTreinoRepository.ts:77-80`, `SQLiteSessaoExercicioRepository.ts:136-143`, `SQLiteSerieRegistradaRepository.ts:142-146`, `SQLiteRegistroPesoRepository.ts:65-67`.

O "clear" identifica a linha **apenas pelo id** (REPLACE da linha inteira) — não compara `updated_at`, não checa se `dirty` mudou desde o `getDirty()`, e substitui **todas as colunas** pelo valor ecoado.

### Timeline do bug (dado perdido permanentemente)

```
10:00:00.000  usuário renomeia treino T → save(): dirty=1, updated_at=10:00:00, name="Peito v2"
10:00:01.000  sync run(): getDirty() captura T{name="Peito v2", updated_at=10:00:00}
10:00:01.100  request em voo (com retry/backoff pode durar 1s+2s+4s + timeouts)
10:00:03.000  usuário renomeia de novo → save(): dirty=1, updated_at=10:00:03, name="Peito v3"
10:00:04.000  resposta chega; serverChanges ecoa T{name="Peito v2", updated_at=10:00:00}
10:00:04.010  applyServerRows: INSERT OR REPLACE treinos ... dirty=0
              → "Peito v3" É SOBRESCRITO por "Peito v2" E dirty=0
10:00:04.020  cursor avança. "Peito v3" nunca existiu para o sync. Perda permanente.
```

A transação `withTransaction` do apply (`SyncEngine.ts:134-135`) não protege: a escrita do usuário às 10:00:03 já comitou antes do apply começar. O mesmo vale para escritas feitas *durante* o apply da resposta (a transação do apply engole a última escrita do usuário se intercalar... na prática a escrita do usuário enfileira antes/depois, e o REPLACE vence).

Pior cenário real: **sessão de treino ativa** durante o auto-sync de foreground (`useBackupSync.ts:63-68` dispara `sync()` ao voltar para `active`) — exatamente o momento em que o usuário está registrando séries/editando cargas.

**Fix (1 linha por repo):** trocar `INSERT OR REPLACE` por upsert guardado — `ON CONFLICT(id) DO UPDATE SET ... , dirty=0 WHERE treinos.dirty = 0 OR excluded.updated_at >= treinos.updated_at` (não sobrescrever linha local dirty mais nova).

---

## Achados

### [P0] Echo-back do push sobrescreve edição local feita durante o round-trip e apaga o dirty
- Arquivo: `apps/mobile/src/infrastructure/treinos/SQLiteTreinoRepository.ts:70-71` (+ os 6 repos equivalentes, linhas acima); origem do echo: `apps/api/src/sync/sync.service.ts:23,443-445`.
- Cenário: timeline acima. Perde/corrompe dado do usuário sem erro.
- Fix: upsert com guarda `WHERE dirty = 0 OR excluded.updated_at >= updated_at` no `applyServerRows`.

### [P0] Logout não limpa cursor nem estado dirty → vazamento entre contas
- Arquivo: `apps/mobile/src/application/auth/AuthSession.ts:64-67` (`logout()` só faz `store.clear()`); cursor em `@sync/cursor` na tabela `settings` (`SyncEngine.ts:13`, `SettingsStorageAdapter.ts:10-16`); nenhum reset em `useBackupSync.ts:98-102`.
- Cenário: conta A sinca (cursor=2026-07-06T10:00). A edita 3 treinos offline (dirty=1) e faz logout. Conta B loga no mesmo device → `login()` chama `sync()` (`useBackupSync.ts:76`) → (1) os 3 treinos da conta A são **pushados para a conta B** (servidor cria com `userId=B`, `sync.service.ts:138`); (2) pull usa `since=cursor da conta A` → todo o histórico da conta B com `serverUpdatedAt <= cursor` **nunca é baixado**.
- Fix: no login com e-mail diferente do último, apagar `@sync/cursor` e zerar/limpar dados locais (ou escopar o banco por usuário).

### [P1] Sync está quebrado hoje: getDirty seleciona `created_at` que não existe em 3 tabelas
- Arquivos: `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoTreinoRepository.ts:62-63`, `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts:108-114`, `apps/mobile/src/infrastructure/peso/SQLiteRegistroPesoRepository.ts:52-53`.
- Evidência: no schema mobile, `created_at` só existe em `exercises` e `treinos` (`ExpoSQLiteDatabaseClient.ts:21,28`; grep de `created_at` no arquivo inteiro não acha ALTER para as demais; `ensureColumns` em 861-906 também não adiciona). `SQLiteSerieRegistradaRepository.ts:122-123` até documenta: "series_registradas has no created_at column" e deriva de `updated_at` — os outros 3 repos não receberam o mesmo fix. Os `applyServerRows` dessas tabelas também inserem `created_at` (`SQLiteSessaoTreinoRepository.ts:79`) → pull idem.
- Cenário: qualquer `syncNow()` → `getDirty()` prepara `SELECT ... created_at FROM sessao_treinos` → SQLite "no such column: created_at" → `Promise.all` rejeita (`SyncEngine.ts:84-92`) → resultado 'error' sempre. O teste de round-trip só cobre SerieRegistrada (`SQLiteSerieRegistradaRepository.sync.test.ts`); o schema de teste (`src/test/db-setup.ts`) espelha a ausência da coluna, mas não há teste de getDirty para os 3 repos quebrados.
- Fix: derivar `createdAt` de `updated_at` (como no repo de séries) ou migration adicionando a coluna.

### [P1] Apply do pull em Promise.all viola FKs (filho antes do pai) e aborta a transação
- Arquivo: `apps/mobile/src/infrastructure/sync/SyncEngine.ts:123-132` (Promise.all dos 7 `applyServerRows`); `PRAGMA foreign_keys = ON` em `ExpoSQLiteDatabaseClient.ts:744`; FKs: `treino_exercicios.treino_id/exercicio_id` (linhas 33-34), `sessao_exercicios.sessao_treino_id` (48), `series_registradas.sessao_exercicio_id` (596).
- Cenário: device novo, primeiro sync (since=null), servidor devolve 2 treinos + exercícios. Os 7 applys intercalam round-robin na fila única do SQLite: `treino_exercicios[0]` (do treino 2) é inserido quando só `treinos[0]` existe → `FOREIGN KEY constraint failed` → ROLLBACK da transação inteira (`ExpoSQLiteDatabaseClient.ts:709`) → device nunca consegue restaurar o backup. Também responde ao item 6: substituição custom→custom só sobrevive se esta ordem não explodir.
- Fix: aplicar sequencialmente em ordem topológica (exercises → treinos → treinoExercicios → sessaoTreinos → sessaoExercicios → series → peso) em vez de `Promise.all`.

### [P1] LWW assimétrico com tombstone: delete velho mata edição nova; ordem de sync decide, não o timestamp
- Arquivo: `apps/api/src/sync/sync.service.ts:34` (`if (incoming.deletedAt !== null) return incoming;`) vs :37 (`incomingTime >= existingTime`).
- Cenário 1 (delete stale vence): device A deleta treino às 09:00 (offline). Device B edita às 10:00 e sinca às 10:05. A sinca às 11:00 → linha 34 faz o tombstone de 09:00 vencer a edição de 10:00 → edição de B perdida em todos os devices.
- Cenário 2 (ressurreição): ordem inversa — A sinca o delete primeiro; B edita às 10:00 sem saber e sinca → linha 37: `10:00 >= 09:00` → `deletedAt=null` sobrescreve o tombstone → linha deletada **ressuscita**. Resultado final depende de quem sinca por último, com os mesmos dados → devices podem divergir do esperado nas duas direções.
- Empate exato de `updatedAt`: `>=` faz o incoming (último a sincar) vencer — determinístico por ordem de chegada, não por device.
- Fix: remover o short-circuit da linha 34 e decidir tombstone vs edição pelo mesmo `updatedAt` (delete vira só mais uma escrita LWW).

### [P1] Cursor do servidor tem corrida: mudança comitada durante a transação é pulada para sempre
- Arquivo: `apps/api/src/sync/sync.service.ts:11` (`const now = new Date()` antes da transação), `:26` (`newCursor: now`), `:444` (pull `gt: since`).
- Cenário: 12:00:00.000 device B inicia sync (nowB=.000, transação longa). 12:00:00.500 device A inicia (nowA=.500); o pull de A roda às .600 e não vê as linhas de B (ainda não comitadas). 12:00:00.700 B comita com `serverUpdatedAt=.000`. A recebe `newCursor=.500`. Próximo pull de A: `gt .500` → as linhas de B (.000) **nunca chegam ao device A** (até serem editadas de novo).
- Fix: newCursor = `MAX(serverUpdatedAt)` efetivamente retornado no pull (ou sequência monotônica alocada dentro da transação).

### [P2] Alternativas de exercício nunca sincam (dirty marcado, mas sem repo/contrato/modelo)
- Arquivo: `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts:163-175` (`addAlternativa`/`removeAlternativa` marcam `dirty = 1` em `exercise_alternatives`); migration v19 até criou colunas de sync (`ExpoSQLiteDatabaseClient.ts:530-533`); mas não há `SyncableRepo`, nem row no contrato (`sync.dto.ts`), nem modelo no Prisma (`schema.prisma`).
- Cenário: usuário liga alternativa custom→catalog (ou custom→custom) no device 1; device 2 restaura → exercício custom chega (sinca via `exercises`), mas o **link** de alternativa não existe → recurso some silenciosamente. (custom→catalog: o id de catálogo existe no outro device via seed local, então só o link falta; custom→custom idem.)
- Fix: adicionar `exercise_alternatives` ao pipeline (contrato + Prisma + repo) ou parar de marcar dirty.

### [P2] `INSERT OR REPLACE` + `UNIQUE(normalized_name)` pode apagar exercício custom local no pull
- Arquivo: `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts:321-327`; UNIQUE em `ExpoSQLiteDatabaseClient.ts:15`.
- Cenário: devices A e B criam, cada um, "Remada Especial" (ids uuidv7 distintos, mesmo `normalized_name`). A sinca; B faz pull → REPLACE resolve o conflito de UNIQUE **deletando a linha local de B** (perda silenciosa); se a linha de B estiver referenciada por `treino_exercicios` (FK), o REPLACE falha e aborta o sync inteiro (poison).
- Fix: em `applyServerRows`, tratar conflito de `normalized_name` explicitamente (renomear/merge) em vez de REPLACE cego.

### [P2] Clock skew do device inverte o LWW (edição nova perde para edição velha)
- Arquivo: `apps/api/src/sync/sync.service.ts:35-37` — compara `updatedAt` gerado pelo **relógio do cliente** (`nowIso()` = `new Date().toISOString()`, `apps/mobile/src/shared/utils/syncStamp.ts:2-4`) como string.
- Cenário: relógio do device A atrasado 2h. A edita a carga às 14:00 reais (stamp 12:00). Device B editou às 13:00 (stamp 13:00) e já sincou. A sinca → `12:00 < 13:00` → a edição mais recente (de A) perde. Latente e invisível.
- Fix: mínimo — clampar `updatedAt` do cliente ao relógio do servidor no ingest (`min(updatedAt, now)`) e documentar; ideal — HLC/versão por contador.

### [P2] Uma linha rejeitada envenena o sync inteiro da conta (sem isolamento por linha)
- Arquivo: `apps/api/src/sync/sync.service.ts:13-24` (transação única) + `ForbiddenException` em :66, :127, :158, :167, :226, :261, :270, :329, :338, :392.
- Cenário: qualquer linha dirty que o servidor rejeite (colisão de id com linha de outro usuário, FK Prisma, string inválida) → 403/500 → transação inteira aborta → dirty nunca limpa no mobile → **todo** sync futuro falha com o mesmo erro. Usuário fica permanentemente em "Falha ao sincronizar" sem remédio na UI.
- Fix: responder por-tabela/por-linha (partial accept) ou pelo menos pular a linha ofensora com log em vez de `throw`.

### [P2] `movement_pattern_snapshot` existe no mobile mas não no contrato/Prisma → perdido no roundtrip
- Arquivo: `apps/mobile/src/infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts:41` (save grava) vs `packages/contracts/src/sync.dto.ts:63-87` (SessaoExercicioSyncRow não tem o campo) e `schema.prisma:137-172` (idem); `applyServerRows` (linhas 136-143) nem o menciona → device restaurado fica com NULL.
- Cenário: device 2 restaura backup → snapshots de padrão de movimento das sessões viram NULL → features que dependem dele (sugestão de substituto) degradam silenciosamente.
- Fix: adicionar o campo ao contrato + Prisma + applyServerRows (mesmo tratamento opaco dos demais snapshots).

### [P3] Refresh token rejeitado durante sync em background = logout silencioso
- Arquivo: `apps/mobile/src/application/auth/AuthSession.ts:86-88` (auto-`logout()` no 401/403 do refresh); o resultado vira 'error' genérico (`BackupSyncService.ts:48-50`) e a UI só percebe se a tela Perfil estiver montada (`useBackupSync.ts:49`).
- Dado: fila dirty fica intacta (nada é perdido) — comportamento correto; só falta sinalização ao usuário.
- Fix: propagar um estado "sessão expirada" observável fora do Perfil.

### [P3] Pull sem paginação: primeiro sync devolve o dataset inteiro numa única resposta
- Arquivo: `apps/api/src/sync/sync.service.ts:443-463` (8 findMany sem take/skip); `SyncRequest` não tem page token (`sync.dto.ts:127-130`).
- Cenário: anos de histórico (milhares de séries) → resposta gigante → risco de timeout/OOM no device; não há perda entre "páginas" porque não há páginas. Latente até a base crescer.
- Fix: paginar por (`serverUpdatedAt`, `id`) com token de continuação.

### [P3] userSettings sempre `[]` no push e ignorado no apply do pull
- Arquivo: `apps/mobile/src/infrastructure/sync/SyncEngine.ts:106` (push `userSettings: []`) e :123-132 (apply ignora `serverChanges.userSettings`); plano semanal (`plano_semanal`) fora das 7 tabelas.
- Cenário: idioma/plano semanal não restauram no device novo. Sem perda de dado existente; funcionalidade incompleta.
- Fix: implementar o oitavo repo (settings) ou remover do contrato.

### [P3] Auto-sync de foreground só existe com a tela Perfil montada
- Arquivo: `apps/mobile/src/ui/perfil/hooks/useBackupSync.ts:63-68` (listener de AppState vive no hook da UI do Perfil).
- Cenário: usuário treina uma semana sem abrir Perfil → nada sinca nesse período; a "janela do dirty" (achado P0) cresce.
- Fix: mover o listener para o bootstrap (nível app).

---

## Respostas diretas às missões

1. **Janela do dirty-clear: CONFIRMADA.** Clear = echo-back com `INSERT OR REPLACE ... dirty=0` identificado **só por id**, sem comparação de `updated_at` — linha exata: `SQLiteTreinoRepository.ts:71` (e equivalentes nos 7 repos). Escrita local entre `getDirty` e o apply da resposta é sobrescrita pela versão antiga E perde o flag. P0.
2. **LWW:** empate → incoming (último a sincar) vence (`>=`, sync.service.ts:37). Clock skew do device inverte vencedor (P2). Tombstone: política assimétrica (delete incoming sempre vence; edit incoming mais novo ressuscita tombstone) → resultado depende da ordem de sync (P1). Ressurreição: sim, cenário 2 acima.
3. **Cursor:** não há paginação (P3). Cursor do mobile salvo DEPOIS do apply (`SyncEngine.ts:140`) → crash no meio = reprocesso idempotente, sem perda (OK). Porém o cursor do SERVIDOR é `now` pré-transação → corrida entre devices pula mudanças para sempre (P1).
4. **Retry:** push idempotente — upsert por id (uuidv7, `generateId.ts:8-10`), LWW `>=` reaplica valores idênticos; retry após timeout com servidor já aplicado não duplica (OK). 5xx re-lançado após 3 tentativas; TypeError final é engolido silenciosamente (`SyncEngine.ts:112` — aceitável, offline-first).
5. **Contrato:** coluna a coluna, `tracking_type`, `metodo`, `grupo_id`, métricas de cardio/hold e `arquivado` existem no contrato E no Prisma (schema.prisma:58,100-104,154-161,180-184) — OK. Exceções: `movement_pattern_snapshot` (P2, só mobile) e `exercise_alternatives` (P2, só mobile). `created_at` é exigido pelo contrato mas NÃO existe em 3 tabelas do mobile → sync quebra no getDirty (P1).
6. **Catálogo:** servidor dropa `isCustom=false` silenciosamente (sync.service.ts:43) e mobile filtra `is_custom = 1` no getDirty (SQLiteExerciseRepository.ts:303) — consistente. Substituição custom→catalog sobrevive (ids de catálogo estáveis, seedados localmente nos dois devices). custom→custom sobrevive em teoria (o exercício custom sinca antes na ordem do servidor), mas no device puller depende do apply FK-safe (P1 do Promise.all). Links de alternativas: perdidos (P2). Edição/tombstone de exercício de catálogo fica local para sempre com dirty=1 preso (higiene).
7. **Auth:** refresh transparente com skew de 30s (AuthSession.ts:74-91); refresh rejeitado → logout silencioso, fila dirty preservada (P3). Logout NÃO limpa cursor/dirty/dados → troca de conta vaza dados nas duas direções (P0).

## Verificado e OK
- Retry/backoff exponencial só para erros transitórios (TypeError/5xx), `SyncEngine.ts:41-45,62-71`.
- Apply do pull dentro de transação única no mobile (`SyncEngine.ts:134-135`, `ExpoSQLiteDatabaseClient.ts:689-714`) — sem estado parcial em falha.
- Cursor persistido só após apply bem-sucedido (`SyncEngine.ts:140`) — crash = reprocesso, não perda.
- Push idempotente no servidor: upsert por id + LWW; ids uuidv7 globais.
- Ownership/IDOR guards por tabela no servidor (checks de dono e de pai em todas as 7 apply*).
- `updatedAt` ISO-8601 UTC canônico (`syncStamp.ts`) — comparação lexicográfica válida entre stamps do mesmo formato.
- Coalescing de syncs concorrentes no client (`BackupSyncService.ts:33-39`).
- Servidor força `isCustom: true` no create e omite no update (anti-spoof de catálogo, sync.service.ts:81,95).
