# Pendências — O que falta implementar

> Documento-índice consolidado, gerado em `2026-06-20`.
> Reúne tudo que está **aberto** em `AUDIT.md`, `problems-audit-2026-06-10.md`,
> `MISSING_FOR_MVP.md` e `roadmap.md` num só lugar, em ordem de prioridade.
>
> Como usar: trabalhe de cima para baixo. Marque `[x]` ao concluir e cole o hash do commit.
> Quando uma seção zerar, remova-a daqui (a fonte de verdade continua nos docs originais).

---

## 🔴 P0 — Quebrado agora

- [x] **Suite de testes morta: `useExerciseCatalogController.test.tsx`** (0 testes rodam) ✅ `2026-06-20`
  Causa: o teste mockava `expo-file-system/legacy`, mas o controller importa `expo-file-system`
  (API nova `File`/`Paths`) — o mock não interceptava e o `react-native` (Flow) quebrava o parser.
  **Fix aplicado:** trocar o `vi.mock` para `'expo-file-system'` expondo `File` (com `.move()`/`.uri`)
  e `Paths.document`. Suite voltou a rodar (8 testes); total agora **357 testes em 87 arquivos, todos verdes**.

---

## 🟠 P1 — Risco real (antes de ligar sync / avançar backend)

- [ ] **Backend quase sem testes** — `apps/api` tem 2 arquivos de teste vs 82 no mobile.
  Cobrir `sync.service` (506 linhas, faz merge de dados), `auth.service` e controllers (e2e)
  antes dos sub-projetos 2–4. _Ref: problems-audit item 2._
- [ ] **Dois lockfiles na raiz** (`yarn.lock` + `package-lock.json`) → instalação não determinística.
  Manter npm (scripts do root usam npm), deletar o outro. _Ref: item 3._
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
  ⚠️ **Pendente de você:** rodar a migration no Postgres (`npm --prefix apps/api run prisma:migrate:dev`)
  — não há banco neste ambiente; o SQL já está hand-authored e pronto.
- [ ] **`GIFS/` versionada na raiz** — binários grandes incham o git para sempre.
  Avaliar Git LFS ou mover para asset bundle/CDN. _Ref: item 5._

---

## 🐞 Bugs confirmados em uso real (abertos)

- [ ] **CSV duplica coluna `Serie`** — `RegistrarSerieUseCase` calcula `ordem` com
  `COUNT(ativas)+1`; após deletar+recriar uma série há colisão de `ordem`.
  **Fix:** `MAX(ordem)+1` em `SQLiteSerieRegistradaRepository`. (P1)
  _Ref: problems-audit item 12 · `RegistrarSerieUseCase.ts:63`._
- [ ] **Histórico estranho com uma única sessão** — gráfico/tabela quebram com `n = 1`.
  **Fix:** tratar `n = 1` explicitamente (texto "Primeira execução registrada" ou
  gráfico que renderize bem com um ponto). (P2)
  _Ref: item 13 · `HistoricoExercicioScreen.tsx`._

---

## 🟡 P2 — Qualidade / manutenção

- [ ] **Cobertura de testes** — ~30 use cases sem testes (Finalizar, GetDetalhe,
  RegistrarSerie, Substituir, todos os de dashboard, etc.).
  _Ref: AUDIT.md + plano `2026-06-02-p2-test-coverage.md`._
- [ ] **N+1 de séries** em `GetSessaoDetalheUseCase`.
- [ ] **`InMemoryHistoricoRepository.getUltimasExecucoesValidas`** usa loop O(N²).
- [ ] **3 violações de DIP** — `AddExercicioAoTreino`, `RegistrarSerie`, `IniciarSessao`
  importam `SQLiteDatabaseClient` (infra) direto.
  _Ref: plano `2026-06-04-p2-clean-architecture-dip.md`._
- [ ] **Parse de vírgula** — 9 ocorrências de `replace(',', '.')` (single-replace) em telas
  (`TreinoDetailScreen`, `BiSetDetalheScreen`, `ExercicioDetalheScreen`).
  _Ref: plano `2026-06-04-p2-comma-parse-screens.md`._
- [ ] **Fórmula 1RM duplicada em SQL** (`SqliteDashboardRepository`, `SQLiteHistoricoRepository`).
  TS já consolidado em `estimativa1rm.ts`. (baixa prioridade)
- [ ] **`METODO_LABELS`/`METODO_COLORS`/`METODO_CONFIG` duplicados** em
  `SessaoAtivaScreen`, `ExercicioCard` e os `VALID_METODO` de 2 repos SQLite. Centralizar em `shared/`.
- [ ] **Telas-deus** — `ExercicioDetalheScreen` (1009 linhas), `PerfilScreen` (791),
  `BiSetDetalheScreen` (740), `TreinoDetailScreen` (738), `DashboardScreen` (737).
  Extrair seções quando forem tocadas.
- [ ] **Arquivos `NUL`** na raiz e em `apps/api` — corrigir o script que os cria.
- [ ] **`docker-compose.yml` com credenciais hardcoded** (`academia/academia`) → mover para `.env`.
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

---

## 📄 DOC — Documentação desatualizada (corrigir)

- [ ] `docs/estado-atual.md` (2026-06-02) — diz "sem backend, 100% local, 299 testes";
  `apps/api` (NestJS+Prisma: auth/sync/users/treinos/exercises) já existe.
- [ ] `docs/roadmap.md` (2026-05-07) — sub-5 listado como pendente mas está em execução;
  não menciona estado dos sub-projetos 1–4 vs. backend já criado.
- [ ] `MISSING_FOR_MVP.md` — contagem "218 testes" envelhecida; considerar remover números absolutos.

---

## Notas

- Há **mudanças não commitadas** na branch `chore/exercise-catalog-maintenance` que já
  endereçam parte disto: reload da lista ao fechar o detalhe (`TreinoFeature`), `memo` +
  lookup por `Map` em `ExerciseSection` (perf), e os write-ups dos bugs 12/13 no audit.
- Fontes de verdade originais: `AUDIT.md`, `docs/problems-audit-2026-06-10.md`,
  `MISSING_FOR_MVP.md`, `docs/roadmap.md`.
