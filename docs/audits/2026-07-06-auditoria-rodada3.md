# Auditoria Rodada 3 — Corretude, bugs e integridade (Fase 1)

**Data:** 2026-07-06 · **Plano:** docs/superpowers/plans/2026-07-06-auditoria-rodada3-corretude.md
**Método:** 6 varreduras paralelas (A domínio, B integridade SQLite, C sync, D segurança, E UX, F testes).
B e F rodaram em worktrees isoladas com execução real (B: 20/20 testes de invariante/replay com
better-sqlite3; F: 11 mutações manuais). Relatórios completos por varredura em `docs/audits/rodada3/`
(o teste executável de B está em `rodada3/rodada3-B-integrity-audit.test.ts` — reaproveitar na Fase 3).

**Evidência:** ✅ = reproduzido com execução (teste/query rodou) ou confirmado por 2 varreduras
independentes; 📖 = confirmado por leitura de código (trace completo), pendente de verificação
adversarial (Fase 2) antes de corrigir.

**Estado da Fase 2/3:** NÃO executadas ainda. Próximo passo: verificar adversarialmente os 📖 de
P0/P1, corrigir P0→P1 com teste de regressão TDD cada, atualizar pendencias.md.

---

## P0 — corrompe/perde dados ou resultado errado silencioso

1. ✅ **Backup & Sync está quebrado por completo** — `getDirty`/`applyServerRows` referenciam coluna
   `created_at` que nenhuma migração criou em `sessao_treinos`, `sessao_exercicios` e
   `registros_peso` → todo `SyncEngine.run()` lança "no such column"; só o repo de séries foi
   corrigido. Achado independente por B e C.
   `SQLiteSessaoTreinoRepository.ts:62-63`, `SQLiteSessaoExercicioRepository.ts:113`,
   `SQLiteRegistroPesoRepository.ts:52` (+ applyServerRows correspondentes).
   *Fix:* remover/ajustar as colunas ao schema real (ou criar a coluna por migração) + teste de
   getDirty por repo. Os testes atuais passam porque `db-setup.ts` usa schema divergente (ver P3).

2. ✅ **`INSERT OR REPLACE INTO exercises` apaga alternativas via CASCADE** — cada edição de
   exercício (ou pull do sync) dispara ON DELETE CASCADE nas 3 tabelas de alternativas
   (comprovado: 0 linhas restantes). `SQLiteExerciseRepository.ts:41` (e `:321`).
   *Fix:* trocar por UPDATE/INSERT com ON CONFLICT DO UPDATE (sem REPLACE em pais com FK CASCADE).

3. 📖 **Echo-back do push apaga edição local feita durante o round-trip** — não existe `clearDirty`;
   o servidor devolve as linhas pushadas no mesmo pull e o mobile as regrava com
   `INSERT OR REPLACE ... dirty=0` **sem comparar `updated_at` local**. Edição na janela
   getDirty→apply é sobrescrita pela versão antiga E perde o flag → perda permanente.
   `SQLiteTreinoRepository.ts:71` (e equivalentes nos 7 repos); `sync.service.ts:23,443`.
   *Fix:* applyServerRows com guarda LWW no cliente (`WHERE updated_at <= excluded.updated_at AND dirty=0`
   ou skip de linhas com dirty=1 local).

4. 📖 **Logout não limpa cursor de sync nem flags dirty** — login de outra conta pusha os dados da
   conta anterior para ela; cursor stale esconde o histórico da conta nova. `AuthSession.ts:64-67`.
   *Fix:* no logout, limpar `@sync/cursor` e resetar dirty (ou fazer wipe/rebuild do banco local).

5. ✅ **Exercício some silenciosamente das sugestões de carga** — `getUltimasExecucoesValidas` cruza
   `MAX(data_hora_fim)` e `MAX(id)` independentes no JOIN; quando a sessão mais recente não tem o
   maior UUID lexicográfico, a query retorna 0 linhas (reproduzido). `SQLiteHistoricoRepository.ts:38-45`.
   *Fix:* subquery correlacionada/window function para pegar a sessão mais recente de verdade.

## P1 — quebra visível com caminho de reprodução

### Domínio/datas (A)
- ✅ **Aderência do dashboard bucketa por dia UTC com rótulos locais** — treino 21:30 BRT cai no dia
  seguinte; 31/07 21:30 some de julho; `todayKey` UTC marca "hoje" errado a partir das 21h.
  `SqliteDashboardRepository.ts:28,99-118`. *Fix:* aplicar offset local antes do `date()`/`strftime`
  (ou agregar em JS com datas locais).
- 📖 "Hoje/Ontem" por `floor(horas/24)` — treinou ontem 22h, hoje 8h mostra "Hoje".
  `SessaoInicioScreen.tsx:21-23`. *Fix:* comparar datas-calendário locais.
- 📖 Histórico SQL não filtra `tipo_serie='valida'` (InMemory de referência filtra) — aquecimento
  pode virar "última execução"/1RM. `SQLiteHistoricoRepository.ts:34-76`. *Fix:* adicionar o filtro.
- 📖 Recordes pessoais sem `status='finalizada'` — série de sessão cancelada vira PR eterno.
  `SqliteDashboardRepository.ts:81-93`. *Fix:* filtrar status.

### Integridade (B) — todos ✅ (comprovados com teste)
- `listAlternativas` não filtra `ea.deleted_at` → remover alternativa é inócuo.
  `SQLiteExerciseRepository.ts:156`.
- ✅ `ResetHistoricoUseCase` faz DELETE físico sem tombstones (servidor ressuscita no pull) e não
  apaga sessões `cancelada` nem filhos. `ResetHistoricoUseCase.ts:14-30`. *Corrigido:* tombstones
  (deleted_at + dirty) para finalizadas E canceladas com filhos, em transação; em_andamento intacta.
- ✅ `DeleteTreinoUseCase` instanciado sem `planoSemanalRepository` e sem `database` →
  plano_semanal aponta para treino tombstoned; deleção multi-tabela sem transação.
  `mobileDependencies.ts:280`. *Corrigido:* deps obrigatórias (tsc trava wiring incompleto) e
  instância de produção com plano + transação.
- ✅ `DeleteTreinoUseCase` tombstona sessões mas deixa sessao_exercicios/séries vivos.
  `DeleteTreinoUseCase.ts:27`. *Corrigido:* `deleteByTreinoId` em cascata (séries →
  sessao_exercicios → sessões) com teste SQLite real.

### Sync (C)
- ✅ Apply do pull em `Promise.all` sem ordem parent-first com FK ON → violação de FK no primeiro
  sync de device novo; restore nunca completa (FK error reproduzido por B). `SyncEngine.ts:123-132`.
- ✅ Tombstone incoming sempre vence, independente de timestamp — delete velho mata edição nova; na
  ordem inversa, a edição ressuscita o delete. `sync.service.ts:34`. *Corrigido:* LWW por
  `max(updatedAt, deletedAt)` em `lwwUpdate`/`lwwTime` (inclui userSettings), com testes.
- ✅ `newCursor = now` calculado pré-transação — commit concorrente de outro device com
  `serverUpdatedAt < now` é pulado para sempre. `sync.service.ts:11,26`. *Corrigido:* cursor com
  margem de segurança de 10s (janela do tx timeout + skew), monotônico com `since`; redelivery é
  inócua porque o apply do cliente é LWW idempotente.

### Segurança (D)
- ✅ Sem rate limit em login/register (throttler ausente). `auth.controller.ts:14-33`. *Corrigido:*
  `@nestjs/throttler` no AuthController — 5/min login e register, 10/min refresh (teste com 429).
- ✅ Body do `/sync` é interface TS sem class-validator — ValidationPipe não valida nada; JSON
  arbitrário chega ao Prisma. `sync.controller.ts:13`. *Corrigido:* `SyncRequestDto` + row DTOs com
  class-validator; whitelist derruba `userId`/`serverUpdatedAt`/`dirty` enviados pelo cliente.
- ✅ Import de backup valida só o magic header SQLite (não schema/user_version) e o backup de
  segurança fica em `Paths.cache` (purgável) → perda total possível. `ImportarBancoUseCase.ts:30-71`.
  *Corrigido:* valida `user_version` do header (0 ou acima do suportado → rejeita) e backup de
  segurança em `Paths.document` (`academia-pre-import.db`), com testes de comportamento.

### UX (E)
- 📖 **Keep-alive quebrou o BackHandler**: ao voltar para uma aba, o listener raiz re-registrado
  (LIFO, `return true` incondicional) engole o back físico de todas as subtelas montadas — incluindo
  TreinoDetail, que salvava ao voltar. `MobileApp.tsx:71-84` (afeta TreinoDetailScreen.tsx:95,
  ExercicioDetalheScreen.tsx:119, BiSetDetalheScreen.tsx:77, DashboardFeature.tsx:33).
  *Fix:* registrar o handler raiz só quando não há subtela, ou usar handler único com dispatch por
  aba ativa.
- 📖 **Stale pós-keep-alive CONFIRMADA em 4 módulos** (dados carregam 1× no mount e nunca mais):
  Dashboard (`useDashboardController.ts:62` — finalizar sessão não atualiza Evolução), Sessão
  (`useSessaoFeatureController.ts:55` — treino criado não aparece), Stats do Perfil
  (`useStatsController.ts:15` — congelam para sempre), Catálogo (`useExerciseCatalogController.ts:129`).
  *Fix:* sinal de "aba ativou" vindo do MobileApp (contexto/prop activeModule) disparando refresh.

### Testes/CI (F)
- ✅ **CI não roda nenhum teste nem tsc** (mobile nem API) — único check é o validador Python de
  seeds, condicionado a paths. `.github/workflows/`. *Fix:* workflow com setup-node + npm ci +
  tsc + vitest.
- ✅ Mutação sobrevivente: remover o `save()` do `FinalizarSessaoUseCase` passa 5/5 (teste nunca
  relê o repo). `FinalizarSessaoUseCase.ts:22`.
- ✅ Mutação sobrevivente: fronteira `cargaKg <= cargaPadrao` → `<` passa 12/12.
  `RegistrarSerieUseCase.ts:97`.

## P2 (resumo — detalhes nos apêndices) — ✅ TODOS CORRIGIDOS 2026-07-07 (frentes 1-8)

- ✅ Rebuild v22 não transacional (`ExpoSQLiteDatabaseClient.ts`). *Corrigido:* cada step de
  migração + bump do user_version rodam em UMA transação (rollback em crash); replay v0→vN das
  migrações reais roda no CI (`migrations.replay.test.ts`).
- ✅ `ordem` duplicada (MAX(ordem)+1 incl. soft-deletadas); re-adicionar exercício reativa o
  tombstone (mesmo id) em vez de REPLACE; `deletarSessao` tombstona e arquivar/desarquivar
  marcam dirty/updated_at.
- ✅ `exercise_alternatives` no pipeline (contrato+Prisma+servidor+mobile); colisão de
  `normalized_name` no pull com rename explícito; clamp do relógio do cliente no ingest;
  linha rejeitada é pulada com log (não aborta o push); `movement_pattern_snapshot` no wire.
- ✅ Dashboard exclui aquecimento (volume/1RM/recordes/evolução); `formatCarga`/`formatVolume`
  por locale; editor de série em modo texto para carga fora da grade de 2.5; "0 kg" neutro.
- ✅ Guards de double-submit (concluir exercício/grupo, reorder); confirmação em excluir
  treino/exercício; KAV no form de peso; back no root minimiza em produção (`__DEV__`);
  histórico com erro+retry; falhas de reset/arquivar/auto-sync visíveis. Buracos de teste
  fechados: replay de migrações, useBackupSync, SyncApiClient.
- ✅ Register com resposta genérica (anti-enumeração); `forbidNonWhitelisted` no pipe global.

## P3 (resumo) — ✅ tratados 2026-07-07, exceto 2 diferidos por design

- ✅ `OrphanCleanupService` (código morto com bug) — DELETADO; cascatas de tombstone da rodada 3
  eliminaram a necessidade.
- ✅ `db-setup.ts` — corrigido na Fase 3 (migrações reais, FK ON, agora também transacional).
- ✅ Epley reps≤1 devolve a carga (JS e SQL); carga 0 aceita no TreinoDetail (peso corporal);
  peso/delta com separador do locale; meio-dia UTC+13/14 já resolvido pelo localDateKey do P1-A.
- ✅ Refresh rejeitado → status 'auth-expired' visível ("sessão expirada"); auto-sync de foreground
  no bootstrap (não depende mais do Perfil montado); bcrypt cost 12; expiry do refresh via
  `JWT_REFRESH_EXPIRES_IN_DAYS`; a11y (labels em refresh/play/checkboxes; contraste dark
  textMeta/placeholder ≥4.5:1); teste de "canceled session" asserta o throw do use case;
  confirmação ao excluir registro de peso; guard no onAddExercicio (sem erro espúrio);
  plano semanal limpa errorMessage antigo; criar treino não navega com a aba escondida.
- ⏸ DIFERIDOS (mudança de design, latentes): pull sem paginação (exige token de continuação no
  protocolo; risco só com base grande) e userSettings fora do sync (exige decidir QUAIS settings
  sincronizar — a tabela local também guarda tokens/cursor, que jamais devem subir).

## Verificado e OK (não re-auditar)

- **SQL 100% parametrizado** (IN(...) com placeholders gerados); ownership/IDOR correto em todas as
  rotas e nas 7 tabelas do sync; JWT com rotação + sha256 do refresh; sem secrets reais no repo;
  sem stack trace ao cliente; SecureTokenStore correto (D).
- **Replay de migrações v0→v23 preserva dados** (rebuild v22 intacto, foreign_key_check vazio,
  índices dirty criados); normalized_name dos seeds 0 divergências; MAX(ordem)+1 de séries inclui
  soft-deletadas (B).
- Retry/backoff só transitório; push idempotente (uuidv7, upsert por id); cursor do mobile salvo
  APÓS o apply; contrato↔Prisma alinhado coluna a coluna nas 7 tabelas; custom→catalog sobrevive
  entre devices (C).
- Epley JS≡SQL; slice(0,2) da progressão correto; plateau correto; semana inicia segunda sem
  off-by-one; parseDecimalInput seguro em todos os call-sites; validações UI↔entidade consistentes (A).
- Double-submit guardado nos fluxos principais; 9 modais com onRequestClose; empty states presentes;
  KAV nas telas de detalhe; sem efeitos duplicados por abas escondidas (E).
- 8 de 11 mutações mortas; zero .only/.skip; zero testes sem expect; nenhum mock do sujeito (F).

## Ordem de ataque sugerida (Fase 3)

1. **Sync intransitável** (P0.1) — sem isso nada de sync é testável em device.
2. **REPLACE→UPSERT em exercises** (P0.2) + varrer outros INSERT OR REPLACE em pais com CASCADE.
3. **LWW no cliente + janela dirty** (P0.3) e **logout limpa cursor/dirty** (P0.4) — mesma frente.
4. **MAX/MAX do histórico** (P0.5) + filtros `tipo_serie`/`status` (P1 A) — mesma frente SQL.
5. **BackHandler + stale keep-alive** (P1 E) — mesma frente de MobileApp.
6. **CI rodando tsc+vitest** (P1 F) — barato e trava regressão de tudo acima.
7. P1 restantes (parent-first no pull, tombstone LWW, cursor pós-transação, validação /sync,
   rate limit, import de backup), depois P2 com o usuário.

Cada fix P0/P1 com teste de regressão TDD; corrigir `db-setup.ts` (P3) junto do primeiro fix de
integridade para os testes novos valerem alguma coisa.
