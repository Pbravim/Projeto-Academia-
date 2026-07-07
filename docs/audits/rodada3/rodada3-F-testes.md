# Rodada 3 — Agente F: Qualidade real dos testes + CI

Data: 2026-07-06 · Worktree: `.claude\worktrees\agent-a51bff4564f29d041` · Suíte: 101 arquivos de teste, 446 blocos it/test (vitest 4.1.5)

## 1. Teste de mutação manual (5 alvos)

Baseline dos 5 alvos: 7 arquivos / 39 testes, todos verdes antes de cada mutação. Cada mutação foi revertida antes da seguinte; `git status` limpo ao final.

| # | Arquivo:linha | Mutação (diff) | Resultado |
|---|---|---|---|
| 1a | `apps/mobile/src/application/sessoes/use-cases/RegistrarSerieUseCase.ts:65` | `ordem: maxOrdem + 1` → `maxOrdem - 1` | MORTA (3 testes falham) |
| 1b | `RegistrarSerieUseCase.ts:97` | `input.cargaKg <= se.cargaPadrao` → `input.cargaKg < se.cargaPadrao` | **SOBREVIVEU** (12/12 verdes) |
| 1c | `RegistrarSerieUseCase.ts:96` | `input.repeticoes < se.execucoesRecomendadas` → `<=` | MORTA (p1 test falha) |
| 2a | `apps/mobile/src/application/sessoes/use-cases/SugerirProgressaoUseCase.ts:58` | `s.repeticoes >= meta` → `> meta` | MORTA (3 testes falham) |
| 2b | `SugerirProgressaoUseCase.ts:53` | `ultimas2.length < 2` → `< 1` | MORTA (1 teste falha) |
| 3a | `apps/mobile/src/application/sessoes/use-cases/FinalizarSessaoUseCase.ts:19` | `if (!sessao.isAtiva())` → `if (sessao.isAtiva())` | MORTA (2 testes falham) |
| 3b | `FinalizarSessaoUseCase.ts:22` | removida a linha `await this.dependencies.sessaoTreinoRepository.save(finalizada);` | **SOBREVIVEU** (5/5 verdes) |
| 4a | `apps/mobile/src/application/sessoes/use-cases/SubstituirExercicioSessaoUseCase.ts:69` | removida a linha `deleteBySessaoExercicioId(...)` | MORTA (1 teste falha) |
| 4b | `SubstituirExercicioSessaoUseCase.ts:52` | `if (existing) throw ...` → `if (existing && false) throw ...` | MORTA (1 teste falha) |
| 5a | `apps/mobile/src/infrastructure/exercises/ExerciseSeedLoader.ts:56` | guard de exercício custom desativado (`&& false`) | MORTA (1 teste falha) |
| 5b | `ExerciseSeedLoader.ts:121` | `if (target && target !== sourceId)` → `if (target)` (equivalent_alternatives) | **SOBREVIVEU** (12/12 verdes, incl. integração) |

Placar: 8 mortas / 3 sobreviventes (~73% mutation score nos pontos amostrados).

### Achados (mutações sobreviventes)

**[P1] FinalizarSessaoUseCase.ts:22 — persistência da finalização nunca é verificada (mutação 3b).**
`FinalizarSessaoUseCase.test.ts:30-38` só asserta os primitives retornados (`result.status`, `result.dataHoraFim`); nunca relê o repositório. Regressão que remove/quebra o `save` passa 5/5 — na prática a sessão continuaria "ativa" no banco para sempre (bloqueando nova sessão) com suíte verde.
Fix (1 linha no teste): `expect((await repo.findById('sessao-1'))!.toPrimitives().status).toBe('finalizada');`

**[P1] RegistrarSerieUseCase.ts:97 — fronteira `cargaKg == cargaPadrao` sem teste (mutação 1b).**
Trocar `<=` por `<` deixa 12/12 verdes: nenhum teste registra série com carga igual à cargaPadrao e verifica que NÃO há atualização de snapshot/template (`RegistrarSerieUseCase.p1.test.ts` usa `cargaPadrao: 50` só com carga acima/abaixo). Regressão silenciosa: writes desnecessários no template a cada série na mesma carga (e updatedAt/sync churn no modo backup).
Fix: adicionar caso com `cargaKg === cargaPadrao` + reps na meta assertando que `updateRecomendacoes` não é chamado.

**[P2] ExerciseSeedLoader.ts:121 — guard de auto-referência de alternativas sem cobertura (mutação 5b).**
Remover `target !== sourceId` passa 12/12 (incl. `ExerciseSeedLoader.integration.test.ts`). Cenário real: entry remapeada por `normalized_name` (id legado) cujo `equivalent_alternatives` referencia o próprio id efetivo → grava alternativa A→A, poluindo SugerirSubstitutos. Mesmo guard duplicado na linha 127 (muscle_group) igualmente descoberto.
Fix: teste de seed em que um exercício lista a si mesmo (direta ou via remap por nome) assertando 0 chamadas a `addEquivalentAlternativa`.

## 2. Buracos conhecidos da rodada 2 — confirmados (sem teste em 2026-07-06)

| Arquivo | Linhas | Teste? | Risco |
|---|---|---|---|
| `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts` | 865 | NENHUM | **ALTO** — 24 migrações rotuladas (v1→v23+, PRAGMA user_version em runtime, linhas 746-751); replay v0→atual nunca executado em teste; uma migração quebrada = perda de dados em todo upgrade de instalação antiga, invisível até chegar em produção. Nota interna na linha 503 já admite desalinhamento de rótulos ("19th migration → user_version 19, an earlier entry is labelled v16"). |
| `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts` | 306 | NENHUM | **ALTO** — todo o cálculo de aderência semanal/mensal/anual (linhas 160-187), chaves de data e `isToday` feitos à mão; bug de timezone/borda de mês mostraria aderência errada sem nenhum teste falhar. O `GetDashboardStatsUseCase.test.ts` só testa o passthrough. |
| `apps/mobile/src/infrastructure/sync/SyncApiClient.ts` | 26 | NENHUM | BAIXO — wrapper fino de fetch; risco maior é contrato de erro (status != 2xx) não coberto. |
| `apps/mobile/src/ui/perfil/hooks/useBackupSync.ts` | 92 | NENHUM | MÉDIO — orquestra login/push/pull do backup opt-in; falha silenciosa aqui corrompe a percepção de "dados salvos". (Arquivo atualmente com mudanças i18n em andamento no repo principal.) |

## 3. CI (.github/workflows/)

| Pergunta | Resposta | Evidência |
|---|---|---|
| Roda tsc + vitest do mobile? | **NÃO** | Nenhum workflow executa `npm run mobile:test`/`mobile:typecheck`; scripts existem no `package.json` raiz mas nada os chama. |
| Só validate-exercise-seeds? | Sim (único check de código) | `validate-exercise-seeds.yml` roda script Python, e apenas quando paths de seeds mudam. `claude.yml`/`claude-code-review.yml` são ações de review por LLM, não gates determinísticos. |
| API tem teste no CI? | **NÃO** | 9 arquivos `*.spec.ts` em `apps/api/src/**` + script `jest`, nunca executados em workflow. |
| Node pinado? | **NÃO** | Nenhum `actions/setup-node` em workflow algum; sem `.nvmrc`; `engines` do root só pina `npm >= 10` (packageManager npm@11.12.1 sem corepack no CI). |
| Lockfile usado (npm ci)? | **N/A — nunca instala** | `package-lock.json` existe na raiz, mas nenhum workflow roda `npm ci` ou `npm install`. |
| PRs obrigam check? | Efetivamente não | Único check determinístico é o de seeds, condicionado a paths; PRs que só tocam TS passam sem nenhum teste rodar. (Branch protection não é verificável do repo, mas não há check para exigir.) |

**[P1] Fix:** criar `.github/workflows/ci.yml` com `setup-node@v4` (node 20 pinado) + `npm ci` + `npm run mobile:typecheck` + `npm run mobile:test` + `npm --prefix apps/api test`, disparado em todo PR.

## 4. Higiene de teste

- `.only` / `.skip`: **zero** ocorrências em `apps/mobile/src` (grep `\.(only|skip)\(`).
- Testes sem `expect`: **zero** dos 101 arquivos.
- Mocks do próprio sujeito: **nenhum** — todos os 32 `vi.mock` apontam para módulos nativos externos (expo-sqlite, expo-file-system, expo-localization, react-native etc.).
- **[P3]** `apps/mobile/src/application/sessoes/use-cases/FinalizarSessaoUseCase.test.ts:70-77` — teste chamado "throws when trying to finalize a canceled session" **não asserta throw nenhum**: só checa `cancelada.isAtiva() === false` (duplicando o teste anterior). Fix: `expect(() => cancelada.finalizar(new Date())).toThrow(...)` ou renomear.

## 5. Verificação final

- Todas as 11 mutações revertidas manualmente; `git status --porcelain` na worktree: **vazio (limpo)**.
- Re-execução final dos 5 alvos: 7 arquivos / 39 testes **verdes**.
