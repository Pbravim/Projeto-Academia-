# Auditoria de conformidade — planos 2026-07-07 + padrões @inovatecjp

**Data:** 2026-08-16 · **Operação:** `conformidade-especificacoes` (Fatia 1, docs-only)
**Commit auditado:** `770fa57` (= `origin/development`; working tree limpa)
**Escopo:** (A) drift do código atual vs. os 3 planos em `docs/superpowers/plans/`;
(B) conformidade com os padrões da org (lint API/mobile, deps, CI, baseline de vulnerabilidades npm).
Fora de escopo desta auditoria: LGPD, curadoria de mídia, sub-3/4 do roadmap.

**Método / evidência:** todos os números abaixo vieram de execução real, não de leitura.
As suítes, lint e `npm audit` rodaram no checkout `D:\Github\projeto-academia-`, que está no
**mesmo commit `770fa57` com working tree limpa** — o worktree desta fatia não tem `node_modules`
instalado e a auditoria é docs-only (nenhum `npm ci` foi disparado aqui). Assinaturas de SDK foram
conferidas contra os `.d.ts` realmente instalados, não contra a documentação.

- ✅ = medido por execução de comando (saída transcrita no apêndice)
- 📖 = confirmado por leitura de código com `file:line`

**Severidade:** 5 = bloqueia a fatia · 4 = regressão silenciosa provável · 3 = retrabalho garantido
se não tratado · 2 = ajuste pontual no plano · 1 = nit.

---

## 1. Sumário executivo

O repo mudou **muito pouco** desde os planos: entre 2026-07-07 e hoje existem apenas 2 commits
(`88da8d2` bootstrap do harness Orca e `770fa57` `lint:fix` da org), e o segundo mexeu só em
ordenação de imports da API. Nenhum arquivo, classe ou assinatura citada pelos 3 planos deixou de
existir. **Os 3 planos continuam executáveis como escritos** — o drift é de detalhe, não de
arquitetura.

Veredito por fatia:

| Fatia | Situação | Bloqueio? | Achados a tratar antes de codar |
|---|---|---|---|
| 2 — thumbs-expo-video | Pronta. Assinaturas do SDK 54 **confirmadas nos `.d.ts` instalados** (Step 0 já cumprido por esta auditoria) | Não | D1 (arquivo faltando na lista), D2 |
| 3 — auth-sem-passport | Pronta. Todos os 4 arquivos-alvo e os 2 specs-âncora intactos | Não | D4 (wiring dos módulos consumidores) |
| 4 — dto-zod | Pronta, com 3 correções de plano | Não | D5, D6, D7, D8 |
| 5 — mobile-lint | Executável, mas o plano subestima o custo e tem **risco de regressão semântica** | Não, mas D10 é sev 4 | D10, D11, D14 |
| Todas | Lockfile único é ponto de contenção entre fatias em voo | — | D19 |

Baseline de qualidade hoje: **tudo verde** (API 62 testes, mobile 515 testes, tsc limpo nos dois,
`lint:api` zerado). Os dois buracos reais de conformidade com a org são **de enforcement, não de
código**: o CI não roda lint nenhum (D12) e não dispara em `development` (D13).

---

## 2. Baseline verificado (estado atual, 2026-08-16)

| Métrica | Resultado | Evidência |
|---|---|---|
| API — jest | ✅ 12 suítes / **62 testes**, 0 falhas | `npm --prefix apps/api test` |
| API — `tsc --noEmit` | ✅ exit 0 | `npm run api:typecheck` |
| Mobile — vitest | ✅ 119 arquivos / **515 testes**, 0 falhas | `npm run mobile:test` |
| Mobile — `tsc --noEmit` | ✅ exit 0 | `npm run mobile:typecheck` |
| Lint API (`--stack=node`) | ✅ **0 erros, 0 warnings**, exit 0, saída vazia | `npm run lint:api` |
| Lint mobile (`--stack=node`) | ✅ **444 problemas — 418 erros, 26 warnings**; 295 erros auto-fixáveis | bin local, `--stack=node` |
| Lint mobile (`--stack=react-native` / `react`) | ✅ **crash** `TypeError: context.getSource is not a function` | idem |
| `npm audit` (raiz) | ✅ **46 vulnerabilidades** — 1 critical, 20 high, 21 moderate, 4 low | `npm audit --json` |
| Lint no CI | 📖 **nenhum job de lint** em nenhum dos 4 workflows | `.github/workflows/` |

Os números batem com o que o `LEARNINGS.md` registrou em 2026-08-15 (418 erros no mobile; baseline
de 46 vulnerabilidades com 1 critical) — **nenhuma regressão nem melhora** desde o bootstrap.
Única divergência numérica: o plano de thumbs fala em "517+ testes" no mobile e hoje são 515 — nit,
o Step 5 da Task 1 não deve tratar isso como falha.

---

## 3. Parte A — drift dos 3 planos

### 3.1 `2026-07-07-thumbs-expo-video.md`

**Estado:** `apps/mobile/src/infrastructure/exercises/gerarThumbMidia.ts` intacto, ainda importando
`* as VideoThumbnails from 'expo-video-thumbnails'` (linha 3) e usando `getThumbnailAsync(mediaUri,
{ time: 0 })` (linha 22) + a API legada `ImageManipulator.manipulateAsync` (linha 26). A dependência
`expo-video-thumbnails: ~10.0.8` continua em `apps/mobile/package.json:31`. Assinatura pública
`gerarThumbMidia(exercicioId, mediaUri): Promise<string | null>` inalterada.

**Step 0 do plano (validação de assinaturas do SDK 54) — CUMPRIDO por esta auditoria.** ✅
Conferido nos `.d.ts` instalados, não na doc:

| O que o plano assume | Realidade instalada | OK? |
|---|---|---|
| `createVideoPlayer(source)` | `VideoPlayer.d.ts:8` — e o TSDoc diz *"Creates a direct instance of `VideoPlayer` that doesn't release automatically"* | ✅ (confirma que o `release()` é obrigatório) |
| `generateThumbnailsAsync(times: number \| number[])` | `VideoPlayer.types.d.ts:252` → `Promise<VideoThumbnail[]>` | ✅ |
| retorno é SharedRef de imagem | `VideoThumbnail.d.ts:8` — `class VideoThumbnail extends SharedRef<'image'>` | ✅ |
| `player.release()` existe | `VideoPlayer.types.d.ts:7` — `VideoPlayer extends SharedObject`; `release(): void` em `expo-modules-core/.../SharedObject.d.ts:18` | ✅ |
| `ImageManipulator.manipulate()` aceita SharedRef | `ImageManipulator.types.d.ts:118` — `manipulate(source: string \| SharedRef<'image'>): ImageManipulatorContext` | ✅ **type-compatível com `VideoThumbnail`** |
| encadeamento `.resize().renderAsync().saveAsync()` | `ImageManipulatorContext.resize()` devolve o próprio contexto; `ImageRef.saveAsync(options)` em `ImageRef.d.ts:19` | ✅ |
| `manipulateAsync` é o caminho legado | `ImageManipulator.d.ts:15` — `@deprecated ... Use ImageManipulator.manipulate` | ✅ (reforça a troca) |

Ou seja: o código do Step 3 do plano compila contra o SDK realmente instalado. **Zero drift de API.**

**Achados:**

- **D1 — sev 3 — a lista de arquivos do plano está incompleta: falta um mock.** 📖
  O plano afirma na Architecture que *"Só um arquivo consome o pacote"*, mas há **3** referências a
  `expo-video-thumbnails` fora do `node_modules`:
  `apps/mobile/package.json:31`, `gerarThumbMidia.ts:3` e
  `apps/mobile/src/ui/exercises/hooks/useExerciseCatalogController.test.tsx:28`
  (`vi.mock('expo-video-thumbnails', () => ({ getThumbnailAsync: vi.fn() }))`).
  Consequência prática: o **Step 1 da Task 2** (`grep -r "expo-video-thumbnails" src` → "nenhum
  match") **falha** se esse mock não for trocado, e a suíte do controller passa a mockar um módulo
  que ninguém importa mais.
  *Fix:* incluir `useExerciseCatalogController.test.tsx` nos Files da Task 1 e trocar o
  `vi.mock('expo-video-thumbnails', ...)` por `vi.mock('expo-video', () => ({ createVideoPlayer: ... }))`
  no mesmo commit da Task 1.

- **D2 — sev 1 — lista de callers incompleta.** 📖 O plano cita "callers: `BaixarMidiaExercicioUseCase`,
  bootstrap". Há um terceiro: `useExerciseCatalogController.ts:238` e `:259` chamam
  `gerarThumbMidia` diretamente (`void gerarThumbMidia(...).then(...)`). Sem impacto — a assinatura
  não muda — mas é o que explica o mock do D1.

- **D3 — sev 1 — `gerarThumbMidia.ts` não tem teste dedicado hoje.** 📖 A cobertura atual vem só do
  mock transitivo em `useExerciseCatalogController.test.tsx`. O teste novo da Task 1 é, portanto, o
  que vai satisfazer o gate de cobertura de diff ≥80% do `.orca-quality.json` — não há teste antigo
  competindo. Nada a corrigir; registrar como facilitador.

- Nota de risco residual: `VideoThumbnail` é marcado `@platform android`/`@platform ios`. O caminho
  web (`expo start --web`) tem `generateThumbnailsAsync` declarado em `VideoPlayer.web.d.ts:68`, mas
  o app não é validado em web hoje. Como a validação em device foi **dispensada por decisão do
  usuário (2026-08-16)**, o risco aceito é: mocks cobrem a lógica, não o SDK nativo.

### 3.2 `2026-07-07-auth-sem-passport.md`

**Estado:** tudo intacto e exatamente como o plano descreve.

- `apps/api/src/auth/guards/jwt-auth.guard.ts` — 5 linhas, `extends AuthGuard('jwt')` 📖
- `apps/api/src/auth/guards/local-auth.guard.ts` — 5 linhas, `extends AuthGuard('local')` 📖
- `apps/api/src/auth/strategies/jwt.strategy.ts:10-13` — o boot check do secret (`< 32 chars`) ainda
  vive no construtor, como o plano diz; `validate()` devolve o usuário Prisma completo (`:21-25`) 📖
- `auth.module.ts` — `PassportModule` nos imports, `JwtStrategy`/`LocalStrategy` nos providers,
  `exports: [AuthService]` (sem `JwtModule`/`UsersModule`) 📖
- `main.ts` — não chama `assertJwtSecret` (não existe ainda); `bootstrap()` tem 3 linhas antes do
  `listen` 📖
- Âncoras dos specs preservadas: `auth.throttle.spec.ts:25` `overrideGuard(LocalAuthGuard)` e
  `:68` `Reflect.getMetadata('imports', AuthModule)` 📖
- Dependências: as 6 continuam em `apps/api/package.json` — `passport@^0.6.0`, `passport-jwt@^4.0.1`,
  `passport-local@^1.0.0`, `@nestjs/passport@^10.0.0`, `@types/passport-jwt@^3.0.0`,
  `@types/passport-local@^1.0.0`. `@nestjs/jwt@^10.0.0` já presente ✅
- Assinaturas consumidas pelos guards novos existem: `UsersService.findById(id)`
  (`users.service.ts:10`) e `AuthService.validateUser(email, password)` (`auth.service.ts:18`) 📖

**Achados:**

- **D4 — sev 2 — o Step 2 da Task 4 não se aplica literalmente a 2 dos 3 módulos consumidores.** 📖
  O plano manda "adicionar aos imports: `imports: [PrismaModule, AuthModule]`" em
  `sync.module.ts`, `treinos.module.ts` e `exercises.module.ts`. Só o `sync.module.ts:9` tem
  `imports: [PrismaModule]`. **`treinos.module.ts` e `exercises.module.ts` não têm chave `imports`
  nenhuma** e **não importam `PrismaModule`** — o `PrismaModule` é `@Global()`
  (`prisma/prisma.module.ts:5`), por isso funcionam sem ele.
  Consequência: copiar o snippet do plano nesses dois arquivos adiciona um `PrismaModule` sem
  `import` correspondente → erro de compilação, ou um import redundante de um módulo global.
  *Fix:* nesses dois módulos, criar a chave nova como `imports: [AuthModule]` apenas.

- Observação de arquitetura (não é achado): `UsersModule` já faz `exports: [UsersService]`, então o
  `exports: [AuthService, JwtModule, UsersModule]` proposto pelo plano resolve as deps dos guards
  puros nos módulos consumidores como descrito. 📖

### 3.3 `2026-07-07-dto-zod.md`

**Estado:** nada executado. `validation.ts` ainda devolve o `ValidationPipe` do Nest com
`{ whitelist, forbidNonWhitelisted, transform }` (linha 7). `class-validator`/`class-transformer`
continuam nas deps da API e são usados em exatamente **3 arquivos**: `auth/dto/register.dto.ts`,
`auth/dto/refresh.dto.ts`, `sync/dto/sync-request.dto.ts`. Este último tem **397 LOC, 11 classes
exportadas e 120 decorators** — é o grosso do trabalho da fatia. `zod` **não existe** em nenhum
`package.json` do monorepo. ✅📖

**Achados:**

- **D5 — sev 2 — o plano aponta o spec errado para o teste de `design:paramtypes`.** 📖
  As Global Constraints citam "`sync.controller.spec.ts` (metatype no `design:paramtypes`)". Uma
  varredura em `apps/api/src` encontra **uma única** ocorrência de `design:paramtypes`, e é em
  `apps/api/src/sync/dto/sync-request.dto.spec.ts:105` — dentro dos 10 casos que a Task 3 promete
  não reescrever. O `sync.controller.spec.ts` não menciona metatype nem ValidationPipe.
  *Fix:* trocar a referência; o cuidado real é não mexer no caso 105 do `sync-request.dto.spec.ts`.

- **D6 — sev 2 — o esqueleto de schemas ignora a interface base `SyncRow`.** 📖
  `packages/contracts/src/sync.dto.ts:1` define `export interface SyncRow` e **7 dos 9 row types a
  estendem** (`ExerciseSyncRow`, `TreinoSyncRow`, `TreinoExercicioSyncRow`, `SessaoTreinoSyncRow`,
  `SessaoExercicioSyncRow`, `SerieRegistradaSyncRow`, `RegistroPesoSyncRow`); `UserSettingSyncRow` e
  `ExerciseAlternativeSyncRow` não. O skeleton da Task 2 escreve cada schema achatado, então os
  `z.infer` resultantes perdem a relação `extends SyncRow`.
  Risco contido: um grep por `SyncRow` isolado (excluindo os 9 nomes derivados) encontra **apenas a
  própria declaração** — nenhum consumidor tipa nada como `SyncRow` puro. Mas a decisão precisa ser
  explícita.
  *Fix:* ou inlinar `id`/`updatedAt`/`deletedAt` nos 7 schemas (e aceitar que `SyncRow` some), ou
  manter `const syncRowSchema = z.object({...})` e usar `syncRowSchema.extend({...}).strict()` — a
  segunda preserva a documentação da forma comum sem custo.

- **D7 — sev 2 — a reescrita do `validation.spec.ts` derruba a única cobertura de DTO real no pipe.** 📖
  O spec atual (2 casos) usa `RegisterDto` **de verdade** como metatype
  (`validation.spec.ts:12`), provando ponta a ponta que o pipe global rejeita chave desconhecida num
  DTO do produto. A versão proposta na Task 1 troca tudo por um `FakeDto` local: ganha 4 casos de
  mecanismo, perde o único caso de integração.
  *Fix:* manter um caso com `RegisterDto` real além dos 4 do `FakeDto`.

- **D8 — sev 3 — risco de zod entrar no bundle do mobile por uma aresta de runtime.** 📖
  `packages/contracts/package.json` tem `"main": "src/index.ts"` — TypeScript cru, consumido
  direto pelo Metro — e `index.ts` faz `export * from './sync.dto'`. Se a Task 2 acrescentar
  `export * from './sync.schema'`, o índice passa a ter uma aresta de valor para `zod`.
  Hoje isso é seguro: **todas as 21 referências do mobile a `@academia/contracts` são
  `import type`** (verificado; inclusive as inline `import('@academia/contracts').XSyncRow` nos
  repositórios SQLite, que também somem na compilação), então a elisão de tipos garante que o Metro
  nunca resolve o índice. Mas a garantia é uma convenção não verificada: **um único `import { algo }`
  de valor no futuro puxa `sync.schema.ts` → `zod` para dentro do APK**, silenciosamente.
  *Fix (escolher um):* (a) exportar os schemas por um entrypoint separado
  (`@academia/contracts/schemas`) e deixar o `index.ts` só com tipos; ou (b) adicionar um teste/regra
  que falhe se `apps/mobile/src` tiver import de valor de `@academia/contracts`. A (a) é mais barata
  e resolve por construção.

- **D9 — sev 1 — `packages/contracts` não tem bloco `dependencies`.** 📖 Só `devDependencies:
  { typescript }`. A Task 2 precisa criar o bloco para o `zod`; como o lockfile é único e os
  workspaces içam a dep, a API a enxerga sem declará-la — mas **declarar em `apps/api` também** é o
  certo, senão o `apps/api` fica com dependência implícita de um hoist.

- **D15 — sev 1 — nit de formatação sobrevivente do `lint:fix`.** 📖
  `apps/api/src/auth/dto/register.dto.ts:1` — `import { IsEmail, IsOptional,IsString, ... }` (sem
  espaço depois da vírgula), resíduo do commit `770fa57`. O lint da org passa (não há regra de
  formatação ativa). O arquivo é reescrito inteiro pela Task 3, então morre sozinho na Fatia 4.

---

## 4. Parte B — conformidade com os padrões @inovatecjp

### 4.1 Lint da API — ✅ conforme

`npm run lint:api` (`inovatecjp lint --stack=node` em `apps/api`) sai com **exit 0 e saída vazia**:
zero erros, zero warnings. O estado zerado em 2026-08-15 se manteve.

### 4.2 Lint do mobile — ❌ não conforme (e o plano da Fatia 5 subestima o custo)

`--stack=node` em `apps/mobile`: **444 problemas (418 erros, 26 warnings)**, dos quais
**295 erros auto-fixáveis**. Histograma completo:

| Regra | Erros | `--fix` resolve? |
|---|---:|---|
| `simple-import-sort/imports` | 219 | sim |
| `eqeqeq` | **99** | **não** |
| `import/first` | 75 | sim |
| `no-duplicate-imports` | 20 | não |
| `consistent-return` | 3 | não |
| `simple-import-sort/exports` | 1 | sim |
| `react-hooks/exhaustive-deps` | 1 | não |
| **Total erros** | **418** | 295 auto / **123 manuais** |

(Warnings: 12 `no-shadow`, 5 `no-console`, 3 `@typescript-eslint/consistent-type-definitions`,
4 diretivas `eslint-disable` inúteis, 1 `no-useless-return`, 1 `no-else-return`.)

- **D10 — sev 4 — os 99 `eqeqeq` são majoritariamente o idioma nullish intencional; "zerar" cegamente
  é regressão silenciosa.** ✅📖
  Uma varredura por `!= null` / `== null` (excluindo `!==`/`===`) em `apps/mobile/src` retorna
  **91 ocorrências** — praticamente todos os 99 erros. Exemplos em
  `apps/mobile/src/ui/treinos/screens/TreinoDetailScreen.tsx:120-123`:
  `te.seriesRecomendadas != null ? String(te.seriesRecomendadas) : ''`.
  `x != null` casa com `null` **e** `undefined`; `x !== null` só com `null`. Reescrever em massa faz
  campos `undefined` (opcionais de DTO, colunas ausentes, drafts parciais) passarem a renderizar
  `"undefined"` em vez de `''` — sem nenhum teste necessariamente falhando.
  *Fix:* na config flat nova do mobile, usar `eqeqeq: ['error', 'always', { null: 'ignore' }]`
  (a exceção padrão e recomendada para exatamente este idioma). Isso derruba ~91 dos 418 erros por
  configuração correta, não por edição de risco. Se a org exigir `eqeqeq` estrito, cada um dos 91
  sítios vira `!== undefined && !== null` ou `?? ''` — aí o custo da fatia multiplica e precisa de
  decisão explícita do usuário.

- **D11 — sev 3 — o diagnóstico do crash no `LEARNINGS` está certo na conclusão, mas impreciso na
  causa; a config nova precisa da versão certa do plugin.** ✅📖
  O erro reproduzido é `TypeError: context.getSource is not a function`, `Rule:
  "react-hooks/exhaustive-deps"`, ao lintar `src/ui/dashboard/hooks/useDashboardController.ts:49`.
  A causa exata: o CLI da org roda um **eslint 9.39.5 aninhado**
  (`node_modules/@inovatecjp/eslint-config/node_modules/eslint`), enquanto o
  `eslint-plugin-react-hooks` resolvido é o **4.6.2**, da era eslint 8 (o `context.getSource` foi
  removido no eslint 9). Na raiz ainda existe um `eslint@8.57.1` içado para satisfazer os peers dos
  demais plugins — árvore com duas majors de eslint convivendo.
  *Fix para a Fatia 5:* a config flat própria do mobile deve fixar `eslint@^9` +
  `eslint-plugin-react-hooks@^5` (primeira major com suporte a eslint 9) e **validar
  `eslint-plugin-react-native@^5.0.0` antes de incluí-lo** — é um plugin de 2022 e é o próximo
  candidato ao mesmo crash. Sem essa validação, a fatia repete o problema que ela existe para
  contornar.

- **D14 — sev 1 — não existe `lint:mobile`.** 📖 `package.json` da raiz tem `lint:api` e
  `lint:fix:api` e nada de mobile; `apps/mobile/package.json` tem `"lint": "tsc --noEmit"` — o
  stand-in documentado. Confirma o entregável da Fatia 5 e que o gate de lint do mobile hoje é
  tipagem, não estilo.

### 4.3 CI — ❌ dois buracos de enforcement

`.github/workflows/`: `ci.yml`, `claude.yml`, `claude-code-review.yml`, `validate-exercise-seeds.yml`.

- **D12 — sev 3 — nenhum job de lint no CI.** 📖 Um grep por `lint` em `.github/workflows/` não
  retorna nada. O `ci.yml` roda typecheck + testes dos dois apps e só. O `lint:api` zerado é
  disciplina local: **nada impede um PR de reintroduzir erros de lint na API**. O
  `.orca-quality.json` referencia `npm run lint:api` no comando `lint`, mas isso é o portão do
  pipeline Orca (local, por tarefa), não o do GitHub.
  *Fix:* adicionar um step `npm run lint:api` ao job `api` do `ci.yml` já na Fatia 3 ou 4 (custo
  ~zero, o lint já está zerado), e `npm run lint:mobile` ao job `mobile` na Fatia 5 — que é
  exatamente o que a spec da Fatia 5 pede, mas hoje não há nem o precedente da API para copiar.

- **D13 — sev 3 — o gatilho de push do CI ainda é `main`, mas a base virou `development`.** 📖
  `ci.yml:9-10` → `on: push: branches: [main]`. O modelo de branches decidido em 2026-08-15
  (`LEARNINGS.md`) tornou `development` a base default; `main` é produção. Resultado: **push direto
  em `development` não roda CI nenhum**. PRs continuam cobertos (`pull_request:` sem filtro de
  branch), então o fluxo normal do pipeline está protegido — o buraco é para push direto, que é
  justamente o cenário em que `main` não tem branch protection (repo privado em plano free, também
  registrado no LEARNINGS). O mesmo vale para `validate-exercise-seeds.yml:4-5`.
  *Fix:* `branches: [main, development]` nos dois workflows. Uma linha.

- Pendência conhecida reconfirmada (fora do escopo declarado da spec): o CI **não roda `nest build`**
  nem validação de contrato OpenAPI. Recomendação para operação própria.

### 4.4 Dependências e vulnerabilidades — baseline mantido

`npm audit` na raiz: **46 vulnerabilidades — 1 critical, 20 high, 21 moderate, 4 low.** Idêntico ao
baseline registrado em 2026-08-15. ✅

- A **única critical** é `tar` (path traversal / hardlink escape, família de CVEs) alcançada por
  `@mapbox/node-pre-gyp` ← `bcrypt@^5.1.0`. Continua sendo o candidato número 1 (subir `bcrypt`).
- As 20 high estão quase todas na árvore do Expo/Metro (`@expo/cli`, `@expo/metro*`, `metro*`,
  `image-size`, `postcss`, `js-yaml`, `picomatch`, `react-native`) e na árvore de build do Nest
  (`@nestjs/cli` ← `@angular-devkit/*`, `multer` ← `@nestjs/platform-express`, `lodash`, `glob`,
  `tmp`). São dependências de **build/dev**, não de runtime de produção do app.
- **D16 — sev 2:** nenhuma das fatias 2–5 mexe nesse baseline. As remoções previstas (passport +5,
  class-validator/transformer, expo-video-thumbnails) não estão em nenhuma cadeia vulnerável, e a
  adição do `zod` não introduz nada (zod não tem deps). **A auditoria não recomenda tentar reduzir o
  baseline dentro desta operação** — os upgrades exigidos (`expo@57`, `@nestjs/*@11`, `bcrypt`) são
  majors e a própria spec já os declara fora de escopo. Manter como operação própria.
- Higiene de deps: nada órfão encontrado na API. No mobile, `expo-video-thumbnails` é a única dep
  que a operação remove; `expo-video@~3.0.16` já está instalado e em uso real
  (`ExerciseMediaViewer.tsx:4`), então a Fatia 2 não adiciona dependência nova.

---

## 5. Achado transversal de sequenciamento

- **D19 — sev 3 — lockfile único é ponto de contenção entre as fatias 2 e 3, que a spec manda rodar
  em paralelo.** 📖
  O monorepo tem **um único `package-lock.json` na raiz** (lockfiles aninhados são proibidos —
  `LEARNINGS.md`). A Fatia 2 termina com `npm uninstall expo-video-thumbnails` e a Fatia 3 com
  `npm uninstall passport passport-jwt passport-local @nestjs/passport @types/passport-jwt
  @types/passport-local`; a Fatia 4 acrescenta `zod`. Rodando em paralelo contra `development`, o
  **segundo PR a mergear vai conflitar no lockfile** — e conflito de `package-lock.json` não se
  resolve à mão sem risco.
  *Fix:* manter o paralelismo do código (as fatias 2 e 3 tocam árvores disjuntas: `apps/mobile` vs.
  `apps/api`) e tratar só o lockfile na fila de merge: quem mergear por último **regenera** o
  lockfile (`npm install` sem argumentos após o rebase, commit à parte) em vez de resolver o
  conflito. Alternativa mais conservadora: serializar apenas os commits de remoção de dependência
  (última task de cada fatia).

---

## 6. Recomendações — o que mudar nos planos antes de executar

**Fatia 2 (thumbs-expo-video)**
1. Marcar o **Step 0 da Task 1 como já cumprido** por esta auditoria (tabela da §3.1) — as 6
   assinaturas foram verificadas contra os `.d.ts` instalados e o código do Step 3 é válido.
2. Acrescentar `apps/mobile/src/ui/exercises/hooks/useExerciseCatalogController.test.tsx` aos Files
   da Task 1 e trocar o `vi.mock('expo-video-thumbnails')` por `vi.mock('expo-video')` (D1).
3. Task 3 (validação em device) — **dispensada por decisão do usuário de 2026-08-16**; registrar o
   risco aceito no próprio plano em vez de remover a task.

**Fatia 3 (auth-sem-passport)**
4. Corrigir o Step 2 da Task 4: em `treinos.module.ts` e `exercises.module.ts` criar a chave nova
   como `imports: [AuthModule]` (sem `PrismaModule`, que é `@Global`) (D4).

**Fatia 4 (dto-zod)**
5. Trocar a referência `sync.controller.spec.ts` por `sync-request.dto.spec.ts:105` nas Global
   Constraints (D5).
6. Decidir explicitamente o destino da interface base `SyncRow`; preferir
   `syncRowSchema.extend({...}).strict()` (D6).
7. Manter um caso com `RegisterDto` real no `validation.spec.ts` reescrito (D7).
8. Exportar os schemas por entrypoint separado (`@academia/contracts/schemas`), deixando o
   `index.ts` só com tipos — fecha por construção o risco de zod no bundle mobile (D8).
9. Declarar `zod` em `packages/contracts` **e** em `apps/api` (D9).

**Fatia 5 (mobile-lint)**
10. Configurar `eqeqeq: ['error', 'always', { null: 'ignore' }]` — **antes** de qualquer `--fix` em
    massa. Sem isso, a fatia reescreve 91 comparações nullish e introduz regressão silenciosa (D10).
    Se a org exigir estrito, escalar para decisão do usuário: o custo passa de ~123 para ~214
    correções manuais, com risco.
11. Fixar `eslint@^9` + `eslint-plugin-react-hooks@^5` na config nova e validar
    `eslint-plugin-react-native@5` contra eslint 9 antes de habilitá-lo (D11).
12. Orçamento realista da fatia: 295 erros por `--fix` + **123 manuais** (99 `eqeqeq` → ~8 se o item
    10 for aceito, + 20 `no-duplicate-imports` + 3 `consistent-return` + 1 `react-hooks`), mais os
    26 warnings se a meta incluir warnings.

**Transversal (recomendo puxar para a Fatia 3 ou 4, custo ~zero)**
13. Adicionar `npm run lint:api` ao job `api` do `ci.yml` (D12).
14. `on: push: branches: [main, development]` em `ci.yml` e `validate-exercise-seeds.yml` (D13).
15. Fila de merge: última fatia a mergear regenera o `package-lock.json` em vez de resolver conflito
    (D19).

**Fora desta operação (registrar, não executar)**
16. Baseline de 46 vulnerabilidades: operação própria para `bcrypt` (mata a única critical),
    `expo@57` e `@nestjs/*@11` (D16).
17. `nest build` + validação de contrato OpenAPI no CI — pendência já registrada no LEARNINGS.

---

## 7. Apêndice — comandos executados

Todos em `D:\Github\projeto-academia-` (commit `770fa57`, working tree limpa), 2026-08-16:

```
npm --prefix apps/api test            → 12 suites / 62 tests passed (232.6 s)
npm run mobile:test                   → 119 files / 515 tests passed (36.4 s)
npm run api:typecheck                 → exit 0
npm run mobile:typecheck              → exit 0
npm run lint:api                      → exit 0, saída vazia
(apps/mobile) inovatecjp lint --stack=node
                                      → 444 problems (418 errors, 26 warnings), 295 fixable
(apps/mobile) inovatecjp lint --stack=react-native
                                      → TypeError: context.getSource is not a function
                                         Rule: "react-hooks/exhaustive-deps"
                                         em src/ui/dashboard/hooks/useDashboardController.ts:49
(apps/mobile) inovatecjp lint --stack=react
                                      → mesmo crash
npm audit --json                      → {low:4, moderate:21, high:20, critical:1, total:46}
```

Versões relevantes resolvidas na árvore: `eslint@8.57.1` (içado, raiz) e `eslint@9.39.5`
(aninhado em `@inovatecjp/eslint-config@1.3.1`); `eslint-plugin-react-hooks@4.6.2`;
`expo@~54.0.35`, `expo-video@~3.0.16`, `expo-image-manipulator@~14.0.8`,
`expo-video-thumbnails@~10.0.8`.
