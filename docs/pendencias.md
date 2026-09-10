# Pendências — O que falta implementar

> Documento-índice consolidado, gerado em `2026-06-20`.
> Reúne tudo que está **aberto** em `AUDIT.md`, `problems-audit-2026-06-10.md`,
> `MISSING_FOR_MVP.md` e `roadmap.md` num só lugar, em ordem de prioridade.
>
> Como usar: trabalhe de cima para baixo. Marque `[x]` ao concluir e cole o hash do commit.
> Quando uma seção zerar, remova-a daqui (a fonte de verdade continua nos docs originais).

---

## 🟠 P1 — Risco real (antes de ligar sync / avançar backend)

- [x] **Backend quase sem testes** ✅ `2026-06-20`
  **Unit:** de **2 → 9 specs (19 → 36 testes)** — cobertura para `exercises`/`treinos`/`users` services
  e `auth`/`exercises`/`treinos`/`sync` controllers (Prisma/serviços mockados).
  **Bug achado e corrigido:** `sync.controller` usava `user.userId` (undefined — JwtStrategy retorna o
  user Prisma com `.id`), rodando o sync com userId indefinido; agora `user.id` + regressão.
  **E2e:** adicionados `supertest` + `test/jest-e2e.json` + `test/app.e2e-spec.ts` — fluxo real
  register→login→sync contra o Postgres do docker (4 testes; valida guards JWT, 401 sem token, e o
  round-trip dos 8 campos biomecânicos sobre HTTP). Rodar com `npm --prefix apps/api run test:e2e`
  (precisa `docker compose up -d postgres` + `prisma migrate deploy`). Unit 36 + e2e 4 verdes, typecheck OK.
- [x] **Dois lockfiles na raiz** ✅ `2026-06-20`
  `yarn.lock` já não existia (nem no disco nem no HEAD) — só `package-lock.json` (npm workspaces).
  Travado o gerenciador: `"packageManager": "npm@11.12.1"` + `engines.npm >=10` no root.
  Corrigido o comentário enganoso do `.gitignore` ("this is a yarn workspace" → npm) e adicionada
  guarda contra `yarn.lock` / lockfiles aninhados. Doc `estado-atual` "yarn mobile:start" → `npm run`.
- [x] **Paridade de schema mobile ↔ API** ✅ `2026-06-20`
  Correção do diagnóstico: `musculo_alvo`/`group_muscle` **já** eram consistentes — o shape
  `string[]` só existe na camada de domínio do mobile; storage/wire/Prisma carregam strings
  opacas (musculo_alvo = JSON string, group_muscle = TEXT com vírgulas). Não havia divergência ali.
  **O bug real (perda de dados):** 8 campos biomecânicos existiam no SQLite + domínio do mobile
  mas eram totalmente ignorados pelo sync (`movement_pattern`, `stabilizers`, `execution_type`,
  `name_variations`, `primary_equipment`, `secondary_equipment`, `catalog_version`, `tracking_type`).
  Não eram enviados (`getDirty`), não estavam no contrato nem no Prisma, e o `applyServerRows`
  (`INSERT OR REPLACE`) **zerava** essas colunas no round-trip de exercícios custom — incluindo
  `tracking_type`, que define cardio/hold/reps.
  **Fix aplicado (5 lugares):** `ExerciseSyncRow` (contracts), `Exercise` (Prisma) + migration
  `20260620120000_exercise_biomechanical_fields`, `sync.service` (create/update/mapExercise),
  e `SQLiteExerciseRepository` (getDirty + applyServerRows). Testes: novo round-trip no
  `sync.service.spec` (api 19 verdes), mobile 357 verdes, ambos typechecks OK.
  **Validado no Docker (2026-06-20):** Postgres 16 no compose, as 3 migrations aplicaram limpo
  (incl. `20260620..._exercise_biomechanical_fields`), as 8 colunas existem com os tipos certos,
  e um round-trip push→pull pelo `SyncService` real preservou os 8 campos (o bug do wipe está
  comprovadamente corrigido).
  ⚠️ **Ainda pesado:** `apps/mobile/assets/gifs/` (~118M, GIFs que o app USA) segue no histórico
  — candidato a **Git LFS** num passo futuro (não removível, o app depende deles).

---

## 🐞 Bugs confirmados em uso real (abertos)

- [x] **CSV duplica coluna `Serie`** ✅ `2026-06-20`
  `RegistrarSerieUseCase` usava `COUNT(ativas)+1`; deletar (soft-delete) uma série do meio
  deixa um gap e o `count+1` reutilizava um `ordem` já existente → linhas duplicadas no CSV.
  **Fix:** novo método `maxOrdemBySessaoExercicioId` (interface + SQLite + InMemory) usando
  `MAX(ordem)` **incluindo soft-deletadas** (ordem nunca reutilizada); use case passou a usar
  `maxOrdem+1`. Testes: regressão no use case + 2 no repo SQLite (cobrindo o soft-delete).
  Mobile **360 verdes**, typecheck OK. _Ref: problems-audit item 12._
> **Nota (2026-06-22):** o item "Histórico estranho com uma única sessão" foi reclassificado —
> **não é bug** (o gráfico já tem guarda para 1 ponto), é **UI/UX mal feita**. Movido para a
> seção de UX no Roadmap (item "Melhorar UI/UX da visualização de sessões/exercícios já realizados").
> Não trabalhar isoladamente; resolver junto com o retrabalho de UX.

---

## 🟡 P2 — Qualidade / manutenção

- [x] **Cobertura de testes** ✅ `2026-06-23` — todos os **48/48 use cases** agora têm teste.
  Adicionados 6 arquivos (14 testes): `GetPlanoSemanal`, `GetUltimasExecucoesValidas`, `SugerirTreino`,
  `AddExercicioASessao`, `ResetHistorico`, `BaixarTodasMidias`. (O "~30 sem testes" estava muito velho;
  os nomeados Finalizar/GetDetalhe/RegistrarSerie/dashboard já tinham cobertura.) Suíte: 379 verdes.
- [x] **N+1 de séries** em `GetSessaoDetalheUseCase` ✅ `2026-06-23` — **já estava corrigido**: usa
  `Promise.all([findByIds, listBySessaoExercicioIds])` com Maps; `listBySessaoExercicioIds` é uma única
  query `IN (...)`. Pendência obsoleta; nenhuma mudança necessária.
- [x] **`InMemoryHistoricoRepository.getUltimasExecucoesValidas`** ✅ `2026-09-09` — **pendência
  obsoleta, nenhuma mudança necessária.** Verificado no código
  (`apps/mobile/src/infrastructure/historico/InMemoryHistoricoRepository.ts:35-57`): o método
  é uma **passada única** sobre `this.records` alimentando um `Map` por `exercicioId` —
  O(N), não O(N²). O `reduce` interno percorre só as séries válidas da execução corrente.
  O diagnóstico do loop quadrático já não correspondia ao código quando foi escrito.
- [x] **Violações de DIP** ✅ `2026-06-23` — os 3 nomeados (`AddExercicioAoTreino`, `RegistrarSerie`,
  `IniciarSessao`) **já dependiam de `TransactionPort`** (`domain/shared/ports`). Estendido por
  consistência a mais **6 use cases** que só usavam `withTransaction` (`DeleteExercise`, `AddExercicioASessao`,
  `DeleteTreino`, `DuplicarTreino`, `RemoveExercicioDoTreino`, `ReordenarExercicios`).
  _Ref: plano `2026-06-04-p2-clean-architecture-dip.md`._
- [x] **Parse de vírgula** ✅ `2026-06-23` — o bug single-replace já não existia (telas usavam `/,/g`).
  Deduplicado em `shared/utils/parseDecimalInput.ts` (com teste); 14 chamadas migradas em
  `usePesoController`, `BiSetDetalheScreen`, `ExercicioDetalheScreen`, `TreinoDetailScreen`.
- [x] **Fórmula 1RM duplicada em SQL** ✅ `2026-06-23` — novo helper `estimativa1rmSql()` em
  `estimativa1rm.ts`; 4 expressões SQL + 1 cálculo JS consolidados em `SqliteDashboardRepository`
  e `SQLiteHistoricoRepository`.
- [x] **`METODO_*` duplicados** ✅ `2026-06-23` — lista canônica `METODOS_EXERCICIO` no domínio
  (`TreinoExercicio.ts`, deriva o tipo); `VALID_METODO` dos 2 repos SQLite usa ela; labels/cores
  centralizados em `ui/shared/metodoPresentation.ts` (`SessaoAtivaScreen` + `ExercicioCard`).
- [ ] **Telas-deus** — `ExercicioDetalheScreen` (~1009 linhas), `PerfilScreen` (~791),
  `BiSetDetalheScreen` (~740), `TreinoDetailScreen` (~738), `DashboardScreen` (~737).
  Extrair seções quando forem tocadas. _(refactor incremental, deixado em aberto de propósito)_
- [x] **Arquivos `NUL`** na raiz e em `apps/api` ✅ `2026-06-22`
  Causa: hooks em `.claude/settings.json` (PostToolUse + SessionStart) usavam `git rev-parse --git-dir > NUL 2>&1`
  (sintaxe cmd.exe) mas rodam no git-bash, onde `NUL` vira arquivo. Trocado para `> /dev/null 2>&1`;
  7 arquivos `NUL` removidos (raiz, `apps/api`, `apps/mobile`, `src`, `infrastructure/exercises`, `seeds`, `docs/exercises`).
  `.claude/settings.json` é gitignored, então o fix é local (a correção não vai no histórico).
- [x] **`docker-compose.yml` com credenciais hardcoded** ✅ `2026-06-23` — parametrizado com
  `${POSTGRES_USER:-academia}` etc. + `.env.example` na raiz + `.env` no `.gitignore`; removido o
  `version` obsoleto.
- [ ] **TODO** em `SugerirTreinoUseCase.ts:26` — avaliar `SugestaoRepository` dedicado.

---

## 🚀 Roadmap — features não construídas

- [ ] **Sub-5 · Exercise Intelligence** (maior item)
  - Entidade `Exercise`: faltam `movement_pattern`, `stabilizers[]`, `execution_type`,
    `name_variations[]`, vocabulário controlado de equipamento. (`musculo_alvo[]` parcial.)
  - Engine de substituição em 3 camadas no `SugerirSubstitutosUseCase`.
  - ~7 grupos musculares ainda sem auditoria: ombros, biceps, triceps, membros_inferiores,
    panturrilha, abdomen, trapezio (padrão "≥10 databases por universo").
  - Definir critério de "bom o suficiente" para universos pequenos (panturrilha, trapézio).
  _Ref: roadmap "Sub-projeto 5" + spec `2026-06-05-subproject-5-exercise-intelligence.md`._
- [ ] **Sub-6 · i18n / Language Switcher** — i18next + expo-localization, seletor no Perfil,
  extração de ~176 strings PT-BR hardcoded em 38 arquivos.
  _Ref: spec `2026-06-07-i18n-language-switcher-design.md`._
- [ ] **Sync / Backup em nuvem (sub-2)** — bloqueado pela paridade de schema (P1) e pela
  cobertura de teste do `sync.service` (P1). _Ref: roadmap._
- [ ] **Exportar CSV por treino específico** — hoje `ExportarHistoricoUseCase` só exporta
  *todas* as sessões finalizadas (`historico_treinos.csv`, botão no Dashboard e no Perfil).
  Falta poder exportar apenas as sessões de um treino escolhido (ex.: filtro `treino_id`
  + entrada na `TreinoEvolucaoScreen`/detalhe do treino). _Solicitado pelo usuário em 2026-06-22._
- [ ] **Melhorar UI/UX da visualização de sessões/exercícios já realizados** — o usuário relata
  que rever um treino passado hoje é confuso. Hoje só há `SessaoResumoScreen` (logo após finalizar),
  `TreinoEvolucaoScreen` (gráfico + chips por sessão) e `HistoricoExercicioScreen` (por exercício);
  não há uma lista navegável de "sessões passadas" para abrir uma sessão específica e ver o que foi
  feito naquele dia de forma legível. Avaliar: lista de sessões finalizadas, tela read-only de
  detalhe da sessão, e comparação sessão-a-sessão.
  - Inclui o caso `n = 1` em `HistoricoExercicioScreen` (antes listado como bug): com uma única
    sessão a tela mostra um card "Evolução do 1RM estimado" com mensagem genérica — título sem
    sentido. Tratar explicitamente (ex.: "Primeira execução registrada"). _Ref antigo: problems-audit item 13._
  _Solicitado pelo usuário em 2026-06-22; requer brainstorming/spec antes de implementar._

---

## 📄 DOC — Documentação desatualizada (corrigir)

- [x] `docs/estado-atual.md` ✅ `2026-06-22` — atualizado: backend (`apps/api`) documentado, schema
  v16→v22, contagens de teste (~360 mobile + 36/4 api), Sub-5 marcado como em grande parte implementado.
- [x] `docs/roadmap.md` ✅ `2026-06-22` — banner de status + notas ⚠️ por item: Sub-5 implementado,
  backend criado, planejamento semanal e edição de série marcados como feitos, "Fora do Escopo" revisado.
- [x] `docs/exercises/catalog-maintenance.md` §13 ✅ `2026-06-22` — nota de atualização: bloqueio de
  `new_categories` resolvido, 8/9 seeds criados (falta `reabilitacao_lombar_core`).
- [x] `MISSING_FOR_MVP.md` ✅ `2026-06-22` — contagem "218 testes" → suíte mobile ~360 + api 36/4.

---

## Notas

- Há **mudanças não commitadas** na branch `chore/exercise-catalog-maintenance` que já
  endereçam parte disto: reload da lista ao fechar o detalhe (`TreinoFeature`), `memo` +
  lookup por `Map` em `ExerciseSection` (perf), e os write-ups dos bugs 12/13 no audit.
- Fontes de verdade originais: `AUDIT.md`, `docs/problems-audit-2026-06-10.md`,
  `MISSING_FOR_MVP.md`, `docs/roadmap.md`.
