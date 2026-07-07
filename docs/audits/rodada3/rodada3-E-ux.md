# Rodada 3 — Agente E: UX mistakes & estados (pós keep-alive)

Repo: `C:\Users\Usuario\Documents\Github\projeto-academia-` (apps/mobile). Modo read-only.
Contexto: keep-alive de abas em `apps/mobile/src/app/MobileApp.tsx:105-113` — abas visitadas ficam montadas e escondidas com `display:none`; nenhum sinal de "aba ativa" é propagado às features (nenhuma prop `isActive`, nenhum evento de foco). Logo, **todo controller que carrega em `useEffect([])` nunca mais recarrega por navegação**.

Caminhos abaixo relativos a `apps/mobile/src/`.

---

## 1. SUSPEITA FORTE — dados stale pós keep-alive (por módulo)

### Dashboard/Evolução — CONFIRMADA (P1)
- Load: `ui/dashboard/hooks/useDashboardController.ts:62-64` (`useEffect([load])`, `load` só muda com `locale`). Nenhum refresh por foco; só botão manual ↺ (`ui/dashboard/screens/DashboardScreen.tsx:43-49`).
- Cenário canônico: finalizar sessão na aba Sessão → tocar na aba Evolução (já visitada) → totais, gráfico e recordes mostram o estado ANTERIOR à sessão até o usuário apertar ↺.
- Agravante: apagar histórico ou restaurar backup no Perfil (`ui/perfil/PerfilFeature.tsx:60-69, 83-99`) não invalida nada — Evolução continua exibindo sessões que não existem mais.
- Fix 1 linha: MobileApp passar `isActive`/contador de foco por aba e o controller recarregar quando a aba reativa (ou um event bus simples "dados-mudaram").

### Sessão (início) — CONFIRMADA (P1)
- Load: `ui/sessao/hooks/useSessaoFeatureController.ts:55-57` (`checkSessaoAtiva` só no mount); único refresh é ao fechar o resumo (`:121-125`).
- Cenário: Sessão mostra "nenhum treino" → usuário vai a Treinos, cria treino + adiciona exercícios → volta à Sessão → treino não aparece (ou aparece com "sem exercícios" e botão Começar desabilitado via `treinosComExercicios` stale). Só destrava reiniciando o app ou finalizando uma sessão.
- Fix: recarregar `checkSessaoAtiva()` quando a aba sessão volta a ficar ativa (sinal de foco do MobileApp).

### Treinos/Planos — PARCIALMENTE REFUTADA (P2 residual)
- `TreinoFeature.tsx:33-37` recarrega lista+plano ao fechar o detalhe; `useTreinoListController.ts:102,126-127,144-145` recarrega após criar/deletar/duplicar. Fluxos internos OK.
- Residual: `useTreinoListController.ts:81-83` e `usePlanoController.ts:47` são mount-only para mudanças EXTERNAS — reset de histórico/importar backup no Perfil não refletem; ainda P2 porque treinos não são apagados pelo reset (só sessões), mas import de banco troca tudo (mitigado pelo dialog "feche e reabra o app").

### Exercícios/Catálogo — CONFIRMADA (P1)
- Load: `ui/exercises/hooks/useExerciseCatalogController.ts:129-131` (mount-only).
- Cenário A (mídia): `MobileApp.tsx:66-69` dispara `baixarTodasMidias` 3,5s após o boot, em background. Instalação nova → usuário abre a aba Exercícios cedo → catálogo lê `mediaLocal` nulos → thumbs ficam placeholder PARA SEMPRE nesta execução (nada re-lê o banco quando os downloads terminam).
- Cenário B (últimos pesos): badge "último peso" vem de `getUltimasExecucoesValidas` no mesmo load; finalizar sessão com cargas novas → catálogo continua mostrando os pesos antigos.
- Fix: recarregar `loadExercises()` no sinal de aba ativa; para mídia, invalidar/reler ao término de `baixarTodasMidias`.

### Perfil (estatísticas) — CONFIRMADA (P1)
- Load: `ui/perfil/hooks/useStatsController.ts:15-19` — `useEffect([])`, sem QUALQUER caminho de reload. Com keep-alive o Perfil nunca desmonta ⇒ "Sessões / Este mês / treino favorito / melhor recorde" congelam no valor da 1ª abertura do Perfil pelo resto da execução do app.
- Cenário: abrir Perfil (10 sessões) → treinar → reabrir Perfil → continua "10". Antes do keep-alive o remount ao reabrir corrigia; agora não.
- Fix: expor `reload` no useStatsController e chamá-lo quando o Perfil ganha foco.

### Histórico/Peso — REFUTADA
- Peso: `ui/peso/hooks/usePesoController.ts:91,113` recarrega após cada mutação própria; peso só é exibido/editado dentro do Perfil. "Editar peso → dashboard" REFUTADA: o dashboard não exibe peso.
- Histórico de exercício: remonta a cada abertura (view local no ExerciseCatalogFeature) e recarrega por `exercicioId` (`useHistoricoExercicioController.ts:33-35`). OK.

---

## 2. Double-submit

Bem guardados (verificado `disabled` + flag): criar treino (`TreinoListScreen.tsx:130`), duplicar/deletar treino (`:179,197` + guard no hook), iniciar sessão (`SessaoInicioScreen.tsx:56,105`), finalizar/cancelar sessão (`SessaoAtivaScreen.tsx:388,402`), registrar série (isSubmittingSerie em `ExercicioDetalheScreen.tsx:1050`, `BiSetDetalheScreen.tsx:525`), peso (`PerfilScreen.tsx:578`), exercício criar/editar (`ExerciseCatalogScreen.tsx:431`), Backup&Sync (`BackupSyncSection.tsx:38,83`), ações do Perfil (flag `busy` agregada).

Vulneráveis:
- **[P2] `ui/sessao/screens/SessaoAtivaScreen.tsx:99-114` (`handleConcluirExercicio`) e `:116-138` (`handleConcluirGrupo`)** — sem guard de in-flight. Passos: tocar no checkbox → confirmar → tocar de novo no checkbox (ainda não marcado, pois o patch é assíncrono) → confirmar de novo ⇒ `onRegistrarSeriesEmLote` roda 2× com o MESMO `missing` ⇒ séries auto-preenchidas duplicadas gravadas no banco, e o toggle duplo desmarca o exercício. Fix: flag `concluindoId` que desabilita o checkbox enquanto pendente.
- **[P2] `ui/treinos/screens/TreinoDetailScreen.tsx:370-379` (↑/↓ de bloco)** — sem guard; dois taps rápidos disparam `reorder` concorrentes calculados sobre `treinoExercicios` stale (`useTreinoDetailController.ts:208-226`), a segunda gravação usa a ordem antiga ⇒ ordem final errada/imprevisível. Fix: desabilitar setas enquanto `reorder` pendente.
- **[P3] `useTreinoDetailController.ts:106-124` (`onAddExercicio`)** — double-tap não duplica (domínio lança `ExercicioJaNoTreinoError`) mas exibe erro espúrio "já está no treino" para o usuário. Fix: guard de in-flight por exercício.

"Criar sessão 2×": impossível duplicar — botão desabilitado por `isIniciando` e o domínio tem `SessaoJaAtivaError`. "Finalizar 2×": botão trava em `isFinalizing` e permanece desabilitado até navegar (não é resetado no sucesso — correto).

Relacionado (destrutivo sem confirmação, 1 toque = perda de dados):
- **[P2] `ui/treinos/screens/TreinoListScreen.tsx:192-207`** — "Excluir" treino deleta imediatamente, sem ConfirmDialog (reset/import/deletar sessão TÊM confirm; aqui não). Passos: toque acidental em Excluir no card → treino e sua configuração de exercícios somem.
- **[P2] `ui/exercises/components/ExerciseSection.tsx:107-119`** — excluir exercício do catálogo sem confirmação.
- **[P3] `ui/perfil/screens/PerfilScreen.tsx:605-618`** — excluir registro de peso sem confirmação (perda menor).

---

## 3. Estados vazios / erro

- **[P2] `ui/historico/hooks/useHistoricoExercicioController.ts:42-46`** — erro de load é apenas logado; a tela cai no empty state "nenhuma execução" (`HistoricoExercicioScreen.tsx:54-57`). Passos: falha de leitura → usuário vê "sem histórico" para um exercício que TEM histórico; sem retry. Fix: estado `errorMessage` + botão tentar novamente.
- **[P2] `ui/perfil/hooks/useStatsController.ts:15-19`** — sem `.catch`; em erro o card de estatísticas simplesmente não renderiza (`PerfilScreen.tsx:402`) e a promise rejeita sem tratamento. Fix: catch + estado de erro.
- **[P2] `ui/sessao/hooks/useSessaoFeatureController.ts:83-86`** — erro em `checkSessaoAtiva` faz `setView('inicio')` sem mensagem: uma sessão ATIVA existente "some" silenciosamente da UI (o domínio depois lança SessaoJaAtivaError ao tentar iniciar outra, com mensagem confusa). Fix: setErrorMessage no catch.
- OK: Dashboard tem erro+retry (`DashboardScreen.tsx:72-78`), Treinos tem empty state e erro inline, Catálogo tem empty state, Sessão início tem empty state com CTA. Nenhum spinner eterno encontrado (todos os `finally` resetam isLoading).

## 4. Feedback de erro

- Padrão dominante: erro inline persistente (bom) que limpa ao digitar. Feedback de sucesso do catálogo some em 2s (`useExerciseCatalogController.ts:99-103`) — ok.
- **[P2] `ui/perfil/PerfilFeature.tsx:60-69` (`onReset`)** — falha ao apagar histórico é só logada (todos os outros handlers do Perfil mostram `infoDialog`). Passos: reset falha → usuário acredita que apagou tudo. Fix: setInfoDialog no catch como nos vizinhos.
- **[P2] `ui/dashboard/hooks/useDashboardController.ts:94-141`** — arquivar/desarquivar/deletar sessão: erro só logado, nenhum feedback; a linha simplesmente não some e o usuário toca de novo. Fix: setErrorMessage nos catches.
- **[P2] `ui/perfil/hooks/useBackupSync.ts:44-53` + `:63-68`** — `sync()` não tem catch; no auto-sync de foreground (`void sync()`) uma falha vira unhandled rejection e o usuário não vê status nenhum. Fix: catch com `setStatus(errorMessage(...))`.
- **[P3] `ui/treinos/hooks/usePlanoController.ts:41,60`** — `errorMessage` do plano nunca é limpo em operação bem-sucedida; uma falha antiga fica na tela indefinidamente (`TreinoListScreen.tsx:59-61`). Fix: `setErrorMessage(null)` no início de `reload`/`onSetTreino`.

## 5. Gestos / hardware / teclado

- **[P1] BackHandler × keep-alive — botão voltar morre após trocar de aba.** `MobileApp.tsx:71-84` remove e re-registra seu listener a CADA mudança de `activeModule`, indo para o topo da pilha LIFO do BackHandler e retornando `true` incondicionalmente (`:81`). Os listeners das telas internas (`TreinoDetailScreen.tsx:95` — que além de fechar SALVA via `handleSaveAll`; `ExercicioDetalheScreen.tsx:119`; `BiSetDetalheScreen.tsx:77`; `DashboardFeature.tsx:33-40`; `GerenciarSessoesScreen.tsx:59`; `RecordesPessoaisScreen.tsx:20`; `TreinoEvolucaoScreen.tsx:30`; `HistoricoExercicioScreen.tsx:19`) foram registrados ANTES e ficam abaixo — e com keep-alive essas telas continuam montadas. Passos: Treinos → abrir detalhe do treino → ir à aba Sessão → voltar à aba Treinos → apertar back físico → NADA acontece (deveria salvar e fechar o detalhe). Vale para qualquer subtela de qualquer aba. Antes do keep-alive o cenário não existia (a subtela desmontava na troca). Fix: no handler raiz do MobileApp, retornar `false` quando nenhuma condição própria se aplica (deixar o evento descer), ou registrar o listener raiz uma única vez no mount.
- **[P2] `MobileApp.tsx:77-81`** — no tab root o back é sempre consumido (`return true`): em build standalone o usuário não consegue minimizar o app com o botão voltar (comentário admite que é workaround p/ Expo Go). Fix: condicionar o `return true` a `__DEV__`.
- Modais: todos os 9 `<Modal>` têm `onRequestClose` correto (ObjetivoPicker, TreinoDetail sheet, ExerciseFormFields ×2, ExerciseMediaViewer, PlanoPickerModal, SubstitutosPickerModal, ConfirmDialog, LanguagePickerModal, SubstituirExercicioModal). OK.
- Teclado:
  - **[P2] `ui/perfil/screens/PerfilScreen.tsx:204,500-583`** — formulário de peso (2 inputs + botão) dentro de ScrollView SEM `KeyboardAvoidingView` e sem `keyboardShouldPersistTaps`: no Android/iOS o teclado cobre o botão "Registrar" e o 1º toque no botão só fecha o teclado. Fix: envolver em KAV como TreinoDetailScreen:253 e adicionar `keyboardShouldPersistTaps="handled"`.
  - **[P3] `ui/exercises/screens/ExerciseCatalogScreen.tsx` e `ui/treinos/screens/TreinoListScreen.tsx:52`** — formulários sem KAV/persistTaps (formulários no topo, impacto menor).
- OK: TreinoDetail/ExercicioDetalhe/BiSet têm KAV + persistTaps.

## 6. A11y (amostragem)

- **[P3] Pressables só-ícone sem `accessibilityLabel`:** `DashboardScreen.tsx:43-49` (↺ refresh), `ui/sessao/components/ExercicioCard.tsx:53` (play da thumb) e `:116-134` (checkbox concluir — ícone "✓"/vazio), `SessaoAtivaScreen.tsx:299-307` (play) e `:342-354` (checkbox de grupo), `TreinoDetailScreen.tsx:370-379` (↑/↓). Fix: accessibilityLabel + role="button".
- **[P3] Contraste dark (`ui/shared/theme.ts:87-118`):** `textMeta #867f79` sobre `cardAlt #242220` ≈ 4.0:1 e `inputPlaceholder #757069` sobre `inputBg #1c1a18` ≈ 3.5:1 — abaixo de 4.5:1 (WCAG AA texto pequeno). `textSecondary #a19a94` ≈ 6:1, ok. Fix: clarear textMeta/placeholder ~15%.

## 7. Race de navegação durante submit

- **[P3] `ui/treinos/hooks/useTreinoListController.ts:103` + `TreinoFeature.tsx:29`** — criar treino chama `onSelectTreino(created)` após o await; se o usuário trocou de aba durante o submit, a aba Treinos escondida navega sozinha para o detalhe; ao voltar, ele cai no editor sem ter pedido. Sem corrupção de dados. Fix: só navegar se a aba estiver ativa (sinal de foco).
- `useBackupSync` (AppState foreground) e `baixarTodasMidias` só têm 1 instância cada — sem efeitos duplicados por keep-alive. setStates em abas escondidas são inofensivos (componentes continuam montados). OK.

---

## Priorização

| P | Onde | Resumo |
|---|------|--------|
| P1 | MobileApp.tsx:71-84 | Back físico vira no-op em subtelas após trocar de aba (keep-alive + LIFO) |
| P1 | useDashboardController.ts:62 | Dashboard stale após finalizar sessão / reset |
| P1 | useSessaoFeatureController.ts:55 | Sessão não vê treino criado na aba Treinos |
| P1 | useStatsController.ts:15 | Stats do Perfil congelam para sempre |
| P1 | useExerciseCatalogController.ts:129 | Catálogo: thumbs nunca aparecem pós-download; últimos pesos stale |
| P2 | SessaoAtivaScreen.tsx:99-138 | Concluir 2× duplica séries auto-preenchidas |
| P2 | TreinoDetailScreen.tsx:370-379 | Reorder concorrente com base stale |
| P2 | PerfilScreen.tsx:500-583 | Teclado cobre form de peso |
| P2 | MobileApp.tsx:81 | Back nunca minimiza o app em produção |
| P2 | useHistoricoExercicioController.ts:42 | Erro vira "sem histórico" |
| P2 | PerfilFeature.tsx:60-69 / useDashboardController.ts:94-141 / useBackupSync.ts:44-68 | Falhas silenciosas |
| P2 | useSessaoFeatureController.ts:83-86 | Sessão ativa some silenciosamente em erro |
| P3 | usePlanoController.ts:41 | errorMessage nunca limpo |
| P3 | a11y/contraste/KAV menores | ver seções 5-6 |

Verificado e OK: double-submit guardado em criar/duplicar/deletar treino, iniciar/finalizar/cancelar sessão, registrar série, peso, exercício, backup; todos os modais com onRequestClose; empty states de Dashboard/Treinos/Catálogo/Sessão; KAV em TreinoDetail/ExercicioDetalhe/BiSet; delete de sessões com ConfirmDialog; timers/notificações de descanso preservados pelo keep-alive (objetivo do keep-alive atendido); sem spinners eternos; sem efeitos colaterais duplicados por abas escondidas.
