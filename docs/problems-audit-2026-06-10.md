# Auditoria de Problemas — 2026-06-10

> Gerada por varredura completa do monorepo (typecheck, testes, grafo de código, docs).
> Classificação: **P0** = quebrado agora · **P1** = risco real / dívida que vai morder · **P2** = qualidade/manutenção · **DOC** = documentação desatualizada

---

## P0 — Quebrado agora

### 1. ✅ RESOLVIDO (2026-06-20) — Suite inteira de testes morta: `useExerciseCatalogController.test.tsx` (0 testes executados)

> **Fix:** o teste mockava `expo-file-system/legacy`, mas o controller importa `expo-file-system`
> (API nova `File`/`Paths`). Trocado o `vi.mock` para `'expo-file-system'` expondo `File` (com
> `.move()`/`.uri`) e `Paths.document`. Suite voltou (8 testes); total **357 em 87 arquivos, todos verdes**.



`npm --prefix apps/mobile run test` reporta **"1 failed | 81 passed"** — o arquivo
`src/ui/exercises/hooks/useExerciseCatalogController.test.tsx` falha no *parse*, antes de rodar qualquer teste:

```
RolldownError: Parse failure: Flow is not supported
At file: node_modules/react-native/index.js:1:0
```

**Causa:** `useExerciseCatalogController.ts` agora importa `{ File, Paths } from 'expo-file-system'`
(adicionado no trabalho de mídia/GIF), que por sua vez importa `react-native` (código Flow,
que o Vitest/Rolldown não parseia). O `vitest.config.ts` não tem alias nem mock para
`expo-file-system`/`react-native`, e `src/test/setup.ts` não registra mocks de módulos.

**Impacto:** todos os testes do controller do catálogo de exercícios estão silenciosamente
desativados — os "311 passed" não incluem nenhum deles.

**Fix sugerido:** adicionar `vi.mock('expo-file-system', ...)` (ou um alias em
`vitest.config.ts` apontando para um stub em `src/test/`), igual ao padrão que o projeto
já deveria adotar para qualquer módulo Expo importado por código testado.

---

## P1 — Risco real

### 2. Backend quase sem testes
`apps/api` tem **2 arquivos de teste** no total (incl. `sync.service.spec.ts`) contra 82 no mobile.
O módulo `sync` (`sync.service.ts`, 506 linhas) faz merge de dados do usuário — bug ali é
corrupção de dados sincronizados. Antes de avançar os sub-projetos 2–4 (sync/trainer),
cobrir: `sync.service`, `auth.service`, e os controllers com e2e.

### 3. Dois lockfiles na raiz (`yarn.lock` + `package-lock.json`)
Instalações podem resolver versões diferentes dependendo da ferramenta usada.
Escolher um gerenciador (os scripts do root usam `npm`) e deletar o outro lockfile.

### 4. Migração `musculo_alvo: string → string[]` (sub-5) sem plano de paridade com a API
O mobile já migrou a entidade (schema SQLite v16+), mas o Prisma schema da API e o pacote
`@academia/contracts` precisam refletir o mesmo shape antes do sync (sub-projeto 2) ligar.
Hoje `@academia/contracts` é mínimo; qualquer divergência de shape vira bug de sync difícil
de detectar. Documentar/validar o contrato (zod ou class-validator compartilhado).

### 5. Pasta `GIFS/` versionada na raiz
Binários grandes em git incham o repositório permanentemente (cada GIF fica no histórico
para sempre). Avaliar Git LFS ou mover para asset bundle/CDN antes que o repo cresça mais.

---

## P2 — Qualidade / manutenção

### 6. Telas-deus na UI do mobile
Maiores arquivos de código:
- `ui/sessao/screens/ExercicioDetalheScreen.tsx` — **1009 linhas**
- `ui/perfil/screens/PerfilScreen.tsx` — 791
- `ui/sessao/screens/BiSetDetalheScreen.tsx` — 740
- `ui/treinos/screens/TreinoDetailScreen.tsx` — 738
- `ui/dashboard/screens/DashboardScreen.tsx` — 737

O padrão hook-controller + presenter existe, mas as telas acumulam JSX + estilos + lógica
de apresentação. Extrair componentes/seções quando forem tocadas de novo.

### 7. Acoplamento alto `infrastructure/sessoes` ↔ `shared/utils`
O grafo de código aponta 29 arestas entre a comunidade `sessoes-id` e `utils-estimativa1rm`.
Não é violação de camada (shared é permitido), mas indica que `estimativa1rm`/utils viraram
um hub — se mudarem, muita coisa quebra. Considerar testes de contrato nos utils.

### 8. `METODO_LABELS`/`METODO_COLORS`/`METODO_CONFIG` duplicados
O mesmo mapeamento método→label/cor existe em `SessaoAtivaScreen.tsx`, `ExercicioCard.tsx`
e os `VALID_METODO` sets em 2 repositórios SQLite. Centralizar em `shared/` (ou domain)
para não divergirem quando um método novo for adicionado.

### 9. Arquivos `NUL` na raiz e em `apps/api`
Artefatos de redirecionamento Windows (`> NUL`). Estão no `.gitignore`, mas poluem o
diretório. Deletar e corrigir o script que os cria.

### 10. TODO conhecido em `SugerirTreinoUseCase.ts:26`
"Considerar criar um SugestaoRepository dedicado" — registrado aqui para não se perder.

### 11. `docker-compose.yml` com credenciais hardcoded
`academia/academia` — aceitável para dev local, mas mover para `.env` quando o compose
ganhar mais serviços (API, etc.) para não normalizar o padrão.

---

---

## Bugs reportados em uso real (2026-06-17)

### 12. CSV exportado duplica `Serie` ao deletar e recriar uma série

**Arquivo:** `apps/mobile/src/application/sessoes/use-cases/RegistrarSerieUseCase.ts:63`

A `ordem` de uma nova série é calculada como `countBySessaoExercicioId() + 1`, onde o count considera apenas registros não deletados (`deleted_at IS NULL`). Se o usuário tinha 3 séries (ordens 1, 2, 3), deletou a série 2 (soft-delete) e criou outra no lugar, o count retorna 2 e a nova série recebe `ordem = 3` — colisão com a série 3 já existente. O CSV exportado (`historico_treinos.csv`) exibe dois registros com `Serie = 3` para o mesmo exercício na mesma sessão.

**Fix:** substituir `countBySessaoExercicioId` por uma query `MAX(ordem) + 1` em `SQLiteSerieRegistradaRepository`, e usar esse valor em `RegistrarSerieUseCase`.

**Severidade:** P1 — corrompe dados exportados silenciosamente; o usuário não tem aviso dentro do app.

---

### 13. Histórico de exercício: visualização estranha com apenas uma sessão

**Área:** `apps/mobile/src/ui/historico/screens/HistoricoExercicioScreen.tsx` (e presenter associado)

Quando um exercício tem apenas uma sessão registrada, o gráfico de linha e/ou a tabela de histórico exibem uma visualização ruim (ponto único, layout quebrado ou inconsistente).

**Fix:** tratar o caso de `n = 1` explicitamente na tela — mostrar texto descritivo ("Primeira execução registrada") em vez do gráfico, ou garantir que o gráfico renderize bem com um único ponto.

**Severidade:** P2 — UX degradada, não perde dados.

---

## DOC — Documentação desatualizada

| Doc | Problema |
|---|---|
| `docs/estado-atual.md` | Diz "sem backend, dados 100% locais" e "299 testes" — `apps/api` (NestJS+Prisma, auth/sync/users/treinos/exercises) já existe e os testes são 311 (com 1 suite morta, ver P0-1). Atualizado pela última vez 2026-06-02. |
| `docs/roadmap.md` | "Atualizado em 2026-05-07" — lista o sub-projeto 5 como pendente, mas ele está em execução ativa (commits de peito/costas universos). Não menciona o estado dos sub-projetos 1–4 vs. o backend já criado. |
| `MISSING_FOR_MVP.md` | Cita "218 testes verdes" (hoje 311) — números de teste em docs envelhecem rápido; considerar remover contagens absolutas. |
| Memória do Claude (`project_roadmap.md`) | Diz sub-projetos 1–4 pendentes; o backend (sub-1) está pelo menos parcialmente implementado. |

---

## Riscos nos próximos passos (sub-projetos)

1. **Sub-5 (exercise intelligence)** — restam ~7 grupos musculares para auditar
   (`ombros`, `biceps`, `triceps`, `membros_inferiores`, `panturrilha`, `abdomen`, `trapezio`)
   no padrão "≥10 databases por universo". É o maior consumo de tempo do roadmap atual;
   peito e costas levaram várias sessões. Definir critério de "bom o suficiente" para os
   grupos menores (panturrilha, trapézio) para não aplicar o mesmo custo a universos pequenos.
2. **Sub-2 (sync)** — depende de paridade de schema mobile↔API (item P1-4) e de cobertura
   de teste no `sync.service` (item P1-2). Ligar sync sem isso é o caminho mais provável
   para corrupção de dados do usuário.
3. **Sub-6 (i18n)** — as ~176 strings PT-BR hardcoded continuam crescendo a cada feature
   nova; quanto mais tarde, maior a extração. Se sub-5 demorar, considerar exigir strings
   novas já externalizadas desde já.
4. **Testes mobile** — o P0-1 mostra que importar módulos Expo em hook controllers quebra
   testes silenciosamente. Qualquer controller futuro que importe `expo-*` diretamente
   repetirá o problema; estabelecer convenção (injetar via DI, como o resto do projeto faz).
