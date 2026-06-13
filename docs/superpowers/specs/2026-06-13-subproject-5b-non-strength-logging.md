# Sub-projeto 5b: Registro de exercícios não-força (cardio / mobilidade / alongamento / aquecimento / reabilitação)

> Criado em `2026-06-13`. Desbloqueia as sessões `new_categories` do manifest de exercícios
> (ver `docs/exercises/catalog-maintenance.md` §13). **Plano para implementação por subagentes
> de baixo nível** — cada tarefa abaixo é um briefing autocontido.

## Decisões (travadas com o usuário)
1. **Métrica de intensidade** = um único campo numérico livre (`intensidade`), rotulado por
   aparelho na UI (esteira km/h, bike nível, elíptico nível). Não criar campos por-aparelho.
2. **Armazenamento** = colunas tipadas anuláveis em `SerieRegistrada` (não JSON genérico).
3. **Catálogo/UX** = seções por categoria (Cardio/Mobilidade/Alongamento) ao lado dos grupos
   musculares no mesmo picker/treino.
4. **Escopo Fase 1 (AGORA)** = modelo genérico + migration + UI + **recomendações para não-força**
   + seed de **`cardio_steady_state` E `cardio_hiit_funcional`**. (As demais categorias —
   mobilidade/alongamento/aquecimento/reabilitação — vêm em fases posteriores reaproveitando o
   mesmo modelo.)

## `tracking_type` (a espinha do modelo)
Campo novo no `Exercise`, default `'reps_load'` (todos os 293 registros atuais ficam intactos).

| tracking_type | métrica(s) obrigatória(s) | métrica(s) opcional(is) | usado por |
|---|---|---|---|
| `reps_load` *(default)* | `repeticoes` (int ≥1) + `cargaKg` (≥0) | — | toda a força existente |
| `cardio` | `duracaoSegundos` (int ≥1) | `intensidade` (≥0), `distanciaMetros` (≥0) | esteira, bike, elíptico, corrida |
| `hold` | `duracaoSegundos` (int ≥1) | — | prancha, alongamento estático, isometria |
| `reps_only` | `repeticoes` (int ≥1) | — | mobilidade, aquecimento, parte da reabilitação |

- **Uma só coluna `duracaoSegundos`** serve cardio e hold (distinguidos por `tracking_type`) — não
  criar `tempoSustentacaoSegundos` separado.
- `SerieRegistrada.create` recebe `trackingType` para validar (a série NÃO precisa persistir o tipo;
  ele vem do `SessaoExercicio.trackingTypeSnapshot` pai).

## Métricas de registro (todas anuláveis em `SerieRegistrada`)
`cargaKg?`, `repeticoes?`, `duracaoSegundos?`, `distanciaMetros?`, `intensidade?`.

## Recomendações para não-força (AGORA, não adiado)
`TreinoExercicio` (template) e `SessaoExercicio` (snapshot) ganham campos recomendados não-força:
`duracaoRecomendadaSegundos?`, `distanciaRecomendadaMetros?`, `intensidadeRecomendada?`
(além dos existentes `seriesRecomendadas`/`execucoesRecomendadas`/`cargaPadrao`/`tempoDescansoSegundos`).

## Invariantes que TODO subagente deve respeitar
- **Não quebrar os 293 registros `reps_load` existentes** — default em entidade, migration (backfill),
  loader e seed-schema é sempre `reps_load`; comportamento de força inalterado.
- **Clean architecture**: domínio sem dependência de infra/UI; use-cases orquestram; repos serializam.
- **Antes de concluir a tarefa**: rodar testes do app (`npm test` em `apps/mobile` — verificar no
  `package.json`), `tsc --noEmit`, e (se tocou seeds/validador) `python scripts/validate_exercise_seeds.py`.
  Zero erros. Não marcar tarefa como concluída com teste vermelho.
- **Migration**: descobrir a versão atual MÁXIMA em
  `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts` e usar a PRÓXIMA
  (o comentário em `Exercise.ts` cita v17/v20 — confirmar no arquivo, não chutar).

---

## DAG de tarefas para subagentes

### T1 — Domínio: tracking_type + métricas + recomendações  *(fundação; sem deps)*
**Arquivos:** `domain/exercises/entities/Exercise.ts`, `domain/sessoes/entities/SerieRegistrada.ts`,
`domain/sessoes/entities/SessaoExercicio.ts`, `domain/treinos/entities/TreinoExercicio.ts` (+ os `.test.ts`).
- `Exercise`: + `trackingType: TrackingType` em `ExercisePrimitives`/`CreateExerciseProps`/`UpdateExerciseProps`,
  default `'reps_load'`. Definir `type TrackingType = 'reps_load'|'cardio'|'hold'|'reps_only'`.
- `SerieRegistrada`: tornar `cargaKg`/`repeticoes` anuláveis; + `duracaoSegundos`/`distanciaMetros`/
  `intensidade` anuláveis; `create` recebe `trackingType` (default `'reps_load'`) e valida por tipo
  (tabela acima). Manter mensagens de erro no padrão atual.
- `SessaoExercicio`: + `trackingTypeSnapshot: string` (default `'reps_load'`) + recomendados não-força;
  `withSubstituicao` propaga o trackingType do novo exercício e zera recomendados.
- `TreinoExercicio`: + recomendados não-força.
- **Aceite:** novos testes cobrindo validação por tipo (cardio sem duração falha; reps_only sem reps
  falha; reps_load inalterado); suíte verde; `tsc` limpo.

### T2 — Migration + repositórios  *(dep: T1)*
**Arquivos:** `infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts` (migration vNEXT),
`infrastructure/exercises/SQLiteExerciseRepository.ts`,
`infrastructure/sessoes/SQLiteSerieRegistradaRepository.ts`,
`infrastructure/sessoes/SQLiteSessaoExercicioRepository.ts`,
`infrastructure/treinos/SQLiteTreinoExercicioRepository.ts` (+ os `.test.ts` / InMemory equivalentes).
- Migration vNEXT: `ALTER TABLE exercises ADD COLUMN tracking_type TEXT;` (backfill `'reps_load'`),
  `serie_registrada` + `duracao_segundos`/`distancia_metros`/`intensidade`,
  `sessao_exercicio` + `tracking_type_snapshot` (+ recomendados não-força),
  `treino_exercicio` + recomendados não-força. Backfill defaults.
- Serializar/ler as colunas novas nos repos (SELECTs, INSERT/UPSERT, mappers row→primitives).
- **Aceite:** testes de repositório (incl. `.sub0`/pagination) verdes; round-trip das colunas novas;
  `tsc` limpo.

### T3 — Seed schema + loader + validador  *(dep: T1)*
**Arquivos:** `infrastructure/exercises/ExerciseSeedLoader.ts`, `scripts/validate_exercise_seeds.py`
(+ `ExerciseSeedLoader.test.ts`).
- `SeedExerciseEntry`: + `tracking_type?: string` (default `'reps_load'` no loader → `Exercise.restore`).
- Validador: `TRACKING_TYPES = {reps_load, cardio, hold, reps_only}`; checar quando presente.
  NÃO exigir o campo nos seeds existentes (ausente ⇒ `reps_load`).
- **Aceite:** `python scripts/validate_exercise_seeds.py` 0/0 com os 14 seeds atuais; loader test verde.

### T4 — UI: linha de série adaptativa por tracking_type  *(dep: T1, T2)*
**Arquivos:** componentes de registro de série em `ui/sessao/` (`ExercicioCard.tsx`,
`SessaoAtivaScreen.tsx`, e o controller/hook que cria `SerieRegistrada`).
- Renderizar inputs conforme `trackingTypeSnapshot`: `reps_load`→kg+reps; `cardio`→min+intensidade(+dist);
  `hold`→segundos; `reps_only`→reps. Exibir recomendados não-força quando houver.
- **Aceite:** logar uma série de cardio (tempo+intensidade) e uma de hold (tempo) ponta-a-ponta;
  testes de hook/controller verdes; `tsc` limpo.

### T5 — UI: seções por categoria no catálogo/picker + edição de recomendados não-força  *(dep: T1, T2)*
**Arquivos:** `ui/exercises/presenters/buildExerciseCatalogViewModel.ts` (+ test),
`ui/treinos/components/ExercisePickerGroup.tsx`, tela de edição de recomendação do treino.
- Exercícios não-força (cardio etc.) usam `group_muscles` de categoria (ex.: `["Cardio"]`); ordenar
  as seções de categoria DEPOIS dos grupos musculares (estender `GROUP_ORDER`/divisor visual).
- Edição de recomendação do template exibe campos por tipo (duração/intensidade/distância vs séries/reps/carga).
- **Aceite:** catálogo mostra seção "Cardio" ordenada ao fim; presenter test verde; `tsc` limpo.

### T6 — Dashboard/histórico: proteger tonelagem  *(dep: T2)*
**Arquivos:** `infrastructure/dashboard/SqliteDashboardRepository.ts` e agregações de volume/recordes
que multiplicam `cargaKg`×`repeticoes`.
- Excluir séries não-`reps_load` (ou com `cargaKg`/`repeticoes` nulos) da tonelagem/recordes de força.
  Cardio/hold não devem poluir o volume. (Totais de cardio próprios podem ficar para fase posterior —
  mínimo aqui é NÃO contaminar a força.)
- **Aceite:** testes de dashboard verdes; uma série de cardio não altera tonelagem.

### T7 — Seed `cardio_steady_state`  *(dep: T3 + modelo no lugar)*
**Skill:** `exercise-intelligence-research`. Auditar ≥10 bases (curva de fechamento), criar
`seeds/cardio_steady_state.json` (`category: "Cardio"`, `tracking_type: "cardio"`, `gif_path: null`,
IDs novos a partir do próximo `seed-ex-NNN`), `group_muscles: ["Cardio"]`, wire em
`bootstrap/mobileDependencies.ts`, entrada no manifest (mover de `new_categories` p/ `sessions`),
`research-cardio_steady_state.md`. Validador 0/0.
- Esteira (caminhada/corrida/inclinada), bike (ergométrica/spinning), elíptico, remo ergômetro,
  escada/stairmaster, etc. movement_pattern `Gait`/`Sprint`/`null` conforme couber.

### T8 — Seed `cardio_hiit_funcional`  *(dep: T3 + modelo no lugar)*
**Skill:** `exercise-intelligence-research`. Mesmo fluxo. Tipos mistos: burpee/jumping jack/high
knees (`reps_only`), battle ropes/mountain climber por tempo (`cardio`/`hold`), sprint intervals
(`cardio`), ball slam/box jump (`reps_only`/`Jump`). category `Cardio`. Recebe movimentos roteados
das sessões de força (ball slam, mountain climber, jump rope, sprint).

---

## Ordem de execução
T1 primeiro (fundação, bloqueia o resto). Depois, em paralelo: T2 e T3. Depois T4/T5/T6 (dep T2).
Por fim T7/T8 (dep T3 + modelo). Commit por tarefa coerente. Não tocar `docs/roadmap.md` nem
`docs/muscle-highlight-app.md` (mudanças pré-existentes não relacionadas).
