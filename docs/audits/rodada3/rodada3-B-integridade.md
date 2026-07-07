# Rodada 3 — Agente B — Integridade de dados SQLite

Data: 2026-07-06 · Worktree: `.claude\worktrees\agent-a0b24f0b5095bbe53` (branch feat/i18n-ptbr-enus)
Evidência executável: `apps/mobile/src/test/rodada3-integrity-audit.test.ts` (cópia em `rodada3-B-integrity-audit.test.ts` neste scratchpad).
**20/20 testes passam** — cada "ACHADO" abaixo é reproduzido pelo teste com o SQL LITERAL do repositório/use case, contra o schema montado pelas **migrações reais** (extraídas de `ExpoSQLiteDatabaseClient.ts` em runtime) com `PRAGMA foreign_keys = ON` (como produção, linha 744).

Comando: `Set-Location apps\mobile; npx vitest run src/test/rodada3-integrity-audit.test.ts --reporter=verbose --silent=false`

---

## ACHADOS (por prioridade)

### P0-1 — `INSERT OR REPLACE INTO exercises` dispara ON DELETE CASCADE e apaga as 3 tabelas de alternativas
- **Arquivo:linha:** `apps/mobile/src/infrastructure/exercises/SQLiteExerciseRepository.ts:41` (save) e `:321` (applyServerRows).
- **Cenário:** usuário cria vínculos de alternativa (exercise_alternatives, exercise_equivalent_alternatives, exercise_muscle_group_alternatives — todas `REFERENCES exercises(id) ON DELETE CASCADE`, migrações v9/v20). Usuário **edita** o exercício (UpdateExerciseUseCase → save) OU o sync **puxa** qualquer exercício (applyServerRows). O REPLACE deleta a linha antiga de `exercises` → o CASCADE dispara → todos os vínculos somem silenciosamente. Evidência: `pós-REPLACE: exercise_alternatives=0, equivalent=0, muscle_group=0`.
- **Fix 1 linha:** trocar `INSERT OR REPLACE` por `INSERT ... ON CONFLICT(id) DO UPDATE SET ...` (upsert não deleta a linha, não dispara cascade).

### P0-2 — Sync inteiro quebrado: `getDirty`/`applyServerRows` referenciam coluna `created_at` que NÃO EXISTE em sessao_treinos, sessao_exercicios e registros_peso
- **Arquivo:linha:** `SQLiteSessaoTreinoRepository.ts:63` (getDirty) e `:79` (applyServerRows); `SQLiteSessaoExercicioRepository.ts:113` e `:138`; `SQLiteRegistroPesoRepository.ts:52` e `:66`.
- **Fato:** nenhuma migração adiciona `created_at` a essas 3 tabelas (v1 não tem; v19 só adiciona updated_at/deleted_at/dirty/server_rev; `ensureColumns` não cobre). O comentário/fix existente em `SQLiteSerieRegistradaRepository.ts:122-123` mostra que o problema foi percebido só para séries.
- **Cenário:** usuário habilita Backup & Sync (SyncEngine é ligado aos repos SQLite reais em `mobileDependencies.ts:191-202`) → `SyncEngine.run()` → `sessaoTreinoRepo.getDirty()` → `SqliteError: no such column: created_at` → **todo sync falha, sempre**; o usuário acredita ter backup e não tem (perda de dados na troca de aparelho). Evidência: os 3 SELECTs e o INSERT lançam no schema real; os testes `*.sub0.test.ts` passam porque **nunca chamam getDirty** e o `test/db-setup.ts` usa schema divergente.
- **Fix 1 linha:** remover `created_at` das queries e derivar `createdAt` de `updated_at` (padrão já usado em SQLiteSerieRegistradaRepository), ou migração v24 `ALTER TABLE ... ADD COLUMN created_at TEXT`.

### P1-1 — `removeAlternativa` é inócuo: `listAlternativas` não filtra `ea.deleted_at`
- **Arquivo:linha:** `SQLiteExerciseRepository.ts:156` (query de listAlternativas; remoção soft em `:172`).
- **Cenário:** usuário remove alternativa → linha ganha deleted_at → listAlternativas continua retornando (evidência: `[{"id":"seed-ex-004"}]` após remoção).
- **Fix 1 linha:** adicionar `AND ea.deleted_at IS NULL` ao WHERE de `listAlternativas`.

### P1-2 — ResetHistorico faz DELETE físico (sem tombstone) e não limpa sessões canceladas
- **Arquivo:linha:** `apps/mobile/src/application/dashboard/use-cases/ResetHistoricoUseCase.ts:14-30`.
- **Cenário:** usuário com sync ativo reseta histórico → linhas já sincronizadas (server_rev) são apagadas fisicamente, **zero tombstones para push** → no próximo pull o servidor devolve todo o histórico ("reset não pega"). Além disso, só `status='finalizada'` é apagado: sessões `cancelada` + seus sessao_exercicios/séries ficam para sempre (evidência: `canceladas restantes=1, tombstones p/ push=0`). Não há tabela de sugestões cacheadas para limpar (sugestões são computadas on-the-fly; verificado por grep em application/ — nada persiste em settings).
- **Fix 1 linha:** trocar os DELETEs por `UPDATE ... SET deleted_at = ?, updated_at = ?, dirty = 1` e usar `status IN ('finalizada','cancelada')`.

### P1-3 — plano_semanal aponta para treino deletado; bootstrap omite `planoSemanalRepository` e `database` no DeleteTreinoUseCase
- **Arquivo:linha:** `apps/mobile/src/bootstrap/mobileDependencies.ts:280` (só 3 deps injetadas); `SQLitePlanoSemanalRepository.ts:10-21` (getPlano não filtra treino morto); FK `ON DELETE SET NULL` (migração v16, `ExpoSQLiteDatabaseClient.ts:489`) nunca dispara porque a deleção de treino é soft.
- **Cenário:** treino no plano de segunda → usuário deleta o treino → `clearTreino` nunca roda (dep opcional ausente) e o SET NULL não dispara → `getPlano()` devolve id de treino tombstoned (evidência: `[{"dia_semana":"seg","treino_id":"t-1"}]`). Bônus: sem `database`, a deleção multi-tabela roda fora de transação.
- **Fix 1 linha:** em mobileDependencies.ts:280 passar `planoSemanalRepository` e `database: databaseClient`.

### P1-4 — DeleteTreinoUseCase tombstona sessões mas deixa sessao_exercicios/séries VIVOS (tombstone com filhos vivos)
- **Arquivo:linha:** `apps/mobile/src/application/treinos/use-cases/DeleteTreinoUseCase.ts:27` (chama só `sessaoTreinoRepository.deleteByTreinoId`; `SQLiteSessaoTreinoRepository.ts:51` só toca sessao_treinos).
- **Cenário:** deletar treino com histórico → sessões ganham deleted_at, filhos ficam `deleted_at IS NULL` → invariantes `tombstoneSessaoComFilhosVivos` e `sessaoExerciciosSemSessao` violadas (evidência: `[{"id":"st-1"}]` / `[{"id":"se-1"}]`). Localmente os JOINs escondem; no sync, o grafo enviado fica inconsistente (sessão morta, filhos vivos para sempre, dirty pendente eterno neles se nunca reeditados).
- **Fix 1 linha:** no use case, após deleteByTreinoId, cascatear: `sessaoExercicioRepository.deleteBySessaoId(...)` + `serieRegistradaRepository.deleteBySessaoExercicioIds(...)` para as sessões do treino (ou um UPDATE com subselect por treino_id).

### P2-1 — Migração v22 não é idempotente nem transacional: crash entre DROP e RENAME brica o app para sempre
- **Arquivo:linha:** `ExpoSQLiteDatabaseClient.ts:594-614` (rebuild), runner `:764-779` (executa statement a statement, sem transação, só engole `duplicate column name`; user_version só sobe após o step inteiro em `:751`).
- **Cenário:** app morre (kill/OOM) entre `DROP TABLE series_registradas` e o `RENAME` → user_version=21 → próximo boot re-executa v22 → `CREATE TABLE series_registradas_new` falha com "already exists" → migração lança → **banco nunca abre mais** (evidência: `expect(() => migrate(db, 23)).toThrow(/already exists/)`).
- **Fix 1 linha:** prefixar o step com `DROP TABLE IF EXISTS series_registradas_new;` (torna o replay idempotente) — idealmente também envolver cada step em transação no runner.

### P2-2 — AddExercicioAoTreino usa COUNT+1 → `ordem` duplicada viva após remover exercício do meio
- **Arquivo:linha:** `apps/mobile/src/application/treinos/use-cases/AddExercicioAoTreinoUseCase.ts:48-53` (countByTreinoId conta só vivos).
- **Cenário:** treino com ordens 1,2,3 → remove o 1 (soft) → count=2 → novo exercício ganha ordem 3 → colide com o existente (evidência: `[{"treino_id":"t-1","ordem":3,"n":2}]`) → ordenação da lista fica não determinística.
- **Fix 1 linha:** usar `MAX(ordem)+1` incluindo soft-deletadas (mesmo padrão já adotado em `SQLiteSerieRegistradaRepository.maxOrdemBySessaoExercicioId:65-73`).

### P2-3 — Re-adicionar exercício removido destrói o tombstone via UNIQUE(treino_id, exercicio_id) + REPLACE → deleção nunca chega ao servidor
- **Arquivo:linha:** `SQLiteTreinoExercicioRepository.ts:29` (INSERT OR REPLACE) + UNIQUE em v1 (`ExpoSQLiteDatabaseClient.ts:36`).
- **Cenário:** exercício removido do treino (tombstone dirty=1, ainda não pushado) → usuário re-adiciona → save() com id novo conflita no UNIQUE → REPLACE **apaga fisicamente o tombstone** (evidência: `tombstone te-old sobreviveu? 0`) → servidor mantém a linha antiga viva → pull ressuscita/duplica.
- **Fix 1 linha:** em AddExercicioAoTreino, procurar linha tombstoned (treino_id+exercicio_id) e reativá-la (`UPDATE ... SET deleted_at = NULL, dirty = 1`) em vez de inserir id novo.

### P2-4 — `deletarSessao` (dashboard) apaga fisicamente sessão sincronizada → ressurreição no pull
- **Arquivo:linha:** `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts:275-292`.
- **Cenário:** sessão com server_rev → usuário deleta pelo histórico → DELETE físico das 3 tabelas, sem tombstone → próximo pull devolve a sessão. (Evidência no teste.)
- **Fix 1 linha:** trocar os 3 DELETEs por UPDATEs de soft-delete (`deleted_at/updated_at/dirty=1`), como os repos já fazem.

### P2-5 — arquivar/desarquivar sessão não seta `dirty`/`updated_at` → nunca sincroniza
- **Arquivo:linha:** `SqliteDashboardRepository.ts:268` e `:272`.
- **Cenário:** sessão sincronizada (dirty=0) → arquivar → dirty continua 0 (evidência no teste) → outro aparelho nunca vê o arquivamento; LWW por updated_at também fica errado.
- **Fix 1 linha:** `UPDATE sessao_treinos SET arquivado = ?, updated_at = ?, dirty = 1 WHERE id = ?`.

### P2-6 — Pull do sync aplica tabelas em Promise.all → filho pode ser inserido antes do pai e a FK imediata aborta a transação inteira
- **Arquivo:linha:** `apps/mobile/src/infrastructure/sync/SyncEngine.ts:123-132` (applyAll com Promise.all das 7 tabelas).
- **Cenário:** pull com sessão nova + séries: os loops de applyServerRows intercalam por microtask; se um INSERT de series_registradas executa antes do INSERT do sessao_exercicio pai → `FOREIGN KEY constraint failed` (evidência: erro reproduzido com FK ON) → rollback do pull inteiro, cursor não avança, sync trava em loop.
- **Fix 1 linha:** aplicar sequencialmente na ordem pais→filhos (exercises → treinos → treino_exercicios → sessao_treinos → sessao_exercicios → series → peso), i.e. `for (...) await`.

### P3-1 — OrphanCleanupService consulta tabela inexistente `exercicios` e nem está registrado
- **Arquivo:linha:** `apps/mobile/src/infrastructure/persistence/sqlite/OrphanCleanupService.ts:24` (`SELECT id FROM exercicios` — tabela é `exercises`); serviço não é referenciado em nenhum bootstrap (grep: só a própria definição). O erro é engolido pelo catch interno (`:60-63`), então mesmo se fosse ligado, a 1ª limpeza seria um no-op silencioso.
- **Fix 1 linha:** corrigir para `exercises` e instanciar no bootstrap (ou deletar o arquivo morto).

### P3-2 — DeleteExerciseUseCase não tombstona exercise_alternatives → vínculos vivos apontando para exercício tombstoned
- **Arquivo:linha:** `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.ts:36-41` (cascata cobre treino_exercicios/séries/sessao_exercicios, não cobre ea).
- **Cenário:** deletar exercício que é alternativa de outro → linha de ea fica viva apontando para tombstone (evidência: `[{"exercicio_id":"seed-ex-002","alternativa_id":"seed-ex-001"}]`). Leituras escondem (filtram e.deleted_at), mas o sync propaga vínculo para exercício morto.
- **Fix 1 linha:** no use case, `UPDATE exercise_alternatives SET deleted_at=?, dirty=1 WHERE exercicio_id=? OR alternativa_id=?`.

### P3-3 — `test/db-setup.ts` diverge do schema real e roda com FK OFF → mascarou P0-1 e P0-2
- **Arquivo:linha:** `apps/mobile/src/test/db-setup.ts:12` (`foreign_keys = OFF`), `:110-114` (exercise_alternatives SEM `REFERENCES ... ON DELETE CASCADE`), `:67-68` (carga_kg já nullable na "v1"), nenhum created_at extra — mas os testes não exercitam getDirty dessas tabelas.
- **Fix 1 linha:** gerar o schema de teste executando o array real de migrações (técnica do teste desta auditoria) com `foreign_keys = ON`.

---

## Verificado e OK (evidência de execução)

- **Replay v0→v23**: banco vazio migra até user_version=23, `PRAGMA foreign_key_check` vazio, `integrity_check=ok`, 7 índices parciais `idx_*_dirty` criados.
- **Rebuild v22 preserva dados**: linhas inseridas em v18 (pré-sync, carga NOT NULL, tipo_serie default) e em v21 sobrevivem com valores intactos (`carga_kg=80.5, observacao='pr!', tipo_serie='valida', dirty=1`); pós-v22 séries sem carga (cardio) inserem; FK check limpo.
- **REPLACE de pai com filho FK sem cascade NÃO quebra**: `INSERT OR REPLACE INTO sessao_exercicios` com séries filhas vivas e FK ON completa sem erro e sem órfãos (SQLite checa FK imediata no fim do statement) → ToggleExercicioRealizado, atualizarCargaSeNecessario, Finalizar/CancelarSessao (save de sessao_treinos) são seguros.
- **normalized_name**: todos os exercícios semeados pelas migrações (v4/v10/v13) têm `normalized_name === normalizeText(name)` (0 divergências); Exercise.create/update recalculam via normalizeText; ExerciseSeedLoader usa normalizeText (linha 79).
- **RegistrarSerie**: `MAX(ordem)+1` incluindo soft-deletadas → sem `ordem` duplicada em series_registradas após deletar do meio e recriar.
- **Baseline**: banco recém-migrado satisfaz todas as queries de invariante.
- **Sugestões**: não há cache persistido de sugestões (SugerirTreino/SugerirProgressao computam on-the-fly) — nada para o ResetHistorico limpar além das 3 tabelas de sessão.

---

## Queries de invariante (reutilizar na Fase 3)

```sql
-- 1. séries vivas órfãs (sem sessao_exercicio vivo)
SELECT sr.id FROM series_registradas sr
WHERE sr.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sessao_exercicios se WHERE se.id = sr.sessao_exercicio_id AND se.deleted_at IS NULL);

-- 2. sessao_exercicios vivos sem sessão viva
SELECT se.id FROM sessao_exercicios se
WHERE se.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM sessao_treinos st WHERE st.id = se.sessao_treino_id AND st.deleted_at IS NULL);

-- 3. ordem duplicada viva em treino_exercicios
SELECT treino_id, ordem, COUNT(*) n FROM treino_exercicios
WHERE deleted_at IS NULL GROUP BY treino_id, ordem HAVING n > 1;

-- 4. ordem duplicada viva em series_registradas
SELECT sessao_exercicio_id, ordem, COUNT(*) n FROM series_registradas
WHERE deleted_at IS NULL GROUP BY sessao_exercicio_id, ordem HAVING n > 1;

-- 5. tombstone de sessão com filhos vivos
SELECT st.id FROM sessao_treinos st
WHERE st.deleted_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM sessao_exercicios se WHERE se.sessao_treino_id = st.id AND se.deleted_at IS NULL);

-- 6. tombstone de treino com treino_exercicios vivos
SELECT t.id FROM treinos t
WHERE t.deleted_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM treino_exercicios te WHERE te.treino_id = t.id AND te.deleted_at IS NULL);

-- 7. normalized_name divergente (comparar em JS com normalizeText(name))
SELECT id, name, normalized_name FROM exercises WHERE deleted_at IS NULL;

-- 8. alternativas vivas apontando para exercício tombstoned
SELECT ea.exercicio_id, ea.alternativa_id FROM exercise_alternatives ea
WHERE ea.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM exercises e WHERE e.id IN (ea.exercicio_id, ea.alternativa_id) AND e.deleted_at IS NOT NULL);

-- 9. plano_semanal apontando para treino inexistente/tombstoned
SELECT p.dia_semana, p.treino_id FROM plano_semanal p
WHERE p.treino_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM treinos t WHERE t.id = p.treino_id AND t.deleted_at IS NULL);

-- 10. dirty=1 preso em tombstone antigo (candidatos a nunca serem confirmados pelo servidor)
SELECT 'sessao_exercicios' tbl, id FROM sessao_exercicios WHERE dirty = 1 AND deleted_at IS NOT NULL
UNION ALL SELECT 'series_registradas', id FROM series_registradas WHERE dirty = 1 AND deleted_at IS NOT NULL
UNION ALL SELECT 'treino_exercicios', id FROM treino_exercicios WHERE dirty = 1 AND deleted_at IS NOT NULL;
```

## Replay de migrações — núcleo do harness (código completo no .test.ts ao lado)

```ts
// Extrai o array real de migrações do source de produção (sem duplicar SQL):
const src = readFileSync('.../ExpoSQLiteDatabaseClient.ts', 'utf-8');
const marker = 'const migrations: string[] = [';
const start = src.indexOf(marker);
const end = src.indexOf('\n];', start);
const MIGRATIONS: string[] = new Function(`return ${src.slice(start + marker.length - 1, end + 2)};`)();

// Replica o runner de produção: FK ON, statement a statement, engole só "duplicate column name",
// user_version = i+1 após cada step. migrate(db, 18) / insere dados / migrate(db, 21) / ... / migrate(db, 23).
function migrate(db, upTo) {
  const current = db.pragma('user_version', { simple: true });
  for (let i = current; i < upTo; i++) {
    for (const stmt of splitSql(MIGRATIONS[i])) {
      try { db.exec(stmt + ';'); }
      catch (err) { if (!/duplicate column name/i.test(err.message)) throw err; }
    }
    db.pragma(`user_version = ${i + 1}`);
  }
}
```

Observação de segurança: o `new Function` avalia exclusivamente source first-party do repositório num teste descartável; não usar esse padrão com entrada externa.
