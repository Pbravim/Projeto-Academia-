# Rodada 3 — Agente D: Segurança & Robustez de Entrada

Repo: projeto-academia- · MODO READ-ONLY · Foco: SQLi, API multi-user, mídia/backup, logs, secrets.

Contexto: app pessoal single-user hoje, mas API NestJS multi-user por design. Ownership = P0/P1.

---

## 1. SQL Injection / malformação — mobile SQLite

**Verificado e OK.** Todo chunking `IN (...)` gera placeholders com `.map(() => '?').join(',')` e passa os
valores como parâmetros bind — nunca interpola valores:
- `SQLiteExerciseRepository.ts:93-97` (findByIds)
- `historico/SQLiteHistoricoRepository.ts:101-109`
- `sessoes/SQLiteSerieRegistradaRepository.ts:49-51, 91-93`
- `dashboard/SqliteDashboardRepository.ts:282-285`

Os únicos `${}` dentro de strings SQL interpolam **constantes de código**, não input:
- `EXERCISE_COLUMNS` (lista de colunas fixa, `SQLiteExerciseRepository.ts:66,83,95,104,115`).
- `sp${depth}` / `PRAGMA user_version = ${i+1}` — inteiros internos (`ExpoSQLiteDatabaseClient.ts:703,711,751`).
- `OrphanCleanupService.ts:24-37` — queries são **literais hardcoded**; `tableName` só aparece em mensagem de log (`:61`), nunca na query.

Sem identificador de tabela/coluna vindo de input. Nenhum achado.

---

## 2. API NestJS (apps/api)

### [P1] Sem rate limit em login/register — `apps/api/src/auth/auth.controller.ts:14-33`
`@nestjs/throttler` não está nas deps (`apps/api/package.json`) e nenhum guard de throttling é aplicado.
Cenário: brute-force de senha em `/auth/login` e enumeração/spam de contas em `/auth/register` sem qualquer
limite de tentativas. Fix: adicionar `ThrottlerModule` global + `@Throttle` nas rotas de auth.

### [P1] Endpoint `/sync` sem DTO validado — `apps/api/src/sync/sync.controller.ts:13` + `packages/contracts/src/sync.dto.ts:127`
`@Body() body: SyncRequest` é apenas uma **interface TS** (sem decorators class-validator), então o
`ValidationPipe` global não tem metadata para validar — aceita JSON arbitrário. Cenário: cliente autenticado
manda tipos errados/estruturas inesperadas direto para o Prisma dentro de uma `$transaction`, causando 500 /
possível DoS por payload gigante. Os checks de ownership seguram IDOR, mas não malformação. Fix: transformar
`SyncRequest` em DTO com `class-validator` (`@ValidateNested`, `@IsArray`, tipos por campo).

### [P2] Register vaza existência de e-mail — `apps/api/src/auth/auth.service.ts:26`
`throw new ConflictException('Email already in use')` (409) distingue e-mail cadastrado de novo. Combinado com
a ausência de rate limit (acima), permite enumeração de contas. Fix: responder genérico/uniforme ou exigir
verificação por e-mail antes de confirmar.

### [P2] `ValidationPipe` sem `forbidNonWhitelisted` — `apps/api/src/main.ts:8`
`{ whitelist: true, transform: true }` remove props extras silenciosamente em vez de rejeitar. Cenário: cliente
manda campos a mais que são apenas descartados sem erro (defesa em profundidade mais fraca; mascara bugs de
contrato). Fix: adicionar `forbidNonWhitelisted: true`.

### [P3] Refresh token com expiry hardcoded ignora env — `apps/api/src/auth/auth.service.ts:58-59`
`expiresAt.setDate(getDate()+30)` fixa 30 dias e ignora `JWT_REFRESH_EXPIRES_IN`. Inconsistência de config
(não explorável). Fix: derivar `expiresAt` da env.

### [P3] bcrypt cost 10 — `apps/api/src/users/users.service.ts:18`
`bcrypt.hash(data.password, 10)`. Aceitável, porém 12 é o recomendado atual. Fix: subir para 12.

**Verificado e OK (API):**
- `ValidationPipe` global **existe** com whitelist+transform (`main.ts:8`).
- Ownership por rota **correta**: `treinos`/`exercises` filtram por `userId` do token via `findFirst`/`findMany`
  com `where.userId` (`treinos.service.ts:8-21`, `exercises.service.ts:8-26`), nunca confiam em id do body.
- `SyncService` faz **guarda IDOR robusta**: para cada tabela verifica se algum id incoming existe no DB sob
  outro dono e lança `ForbiddenException` (`sync.service.ts:65-67,126-128,157-159,166-168,225-227,260-262,269-271,328-330,337-339,391-393`);
  força `userId` do token no create e `isCustom:true` fixo; bloqueia escrita em catálogo global (`:60-71`).
- JWT: expiry configurado (`15m` access, `jwt.strategy.ts:15` `ignoreExpiration:false`); secret vem de env e
  **exige ≥32 chars** no boot (`jwt.strategy.ts:9-12`); refresh token é **rotacionado** (delete + create novo,
  `auth.service.ts:44-45,56-62`) e armazenado como **sha256 hash**, nunca em claro.
- Sem vazamento de stack trace: nenhum `ExceptionFilter` custom, e o handler default do Nest não devolve stack
  no corpo HTTP (só loga no servidor).

---

## 3. Mobile — mídia & backup

### [P1] Import de backup .db valida só magic header, não schema/user_version — `apps/mobile/src/application/dashboard/use-cases/ImportarBancoUseCase.ts:30-71`
Valida apenas os 16 bytes `SQLite format 3\0` (`:33-36`) e então **sobrescreve o banco** (`:63`). Um `.db`
SQLite válido mas com schema incompatível (ou `user_version` alto) passa: na próxima abertura,
`runMigrations` (`ExpoSQLiteDatabaseClient.ts:749`) pula migrações se `user_version >= migrations.length`,
`ensureColumns` só adiciona colunas faltantes (não cria tabelas), e as queries do app quebram. O backup de
segurança é gravado em `Paths.cache` (`:51`) — que o SO pode limpar a qualquer momento → cenário "perda total".
Fix: após validar magic, abrir o arquivo com um handle temporário e checar `PRAGMA user_version` compatível +
existência das tabelas-chave antes de substituir (e mover o pre-import backup para `Paths.document`).

### [P3] `mediaLocal`/`mediaOnline` de exercício sincronizado são confiados sem validar esquema — `ExerciseMediaViewer.tsx:54-88` + `sync.service.ts:477-487` (mapExercise ecoa `mediaLocal`)
Em cenário multi-user, `mediaOnline`/`mediaLocal` de um exercício custom trafegam pelo sync e são renderizados:
`activeUri` cai para `mediaOnline` ou usa `mediaLocal` como `file://`. Um par malicioso poderia setar
`mediaLocal='file:///...'` arbitrário — o viewer tenta carregar via expo-image/video. Impacto real baixo
(sandbox do app; `fileExists` faz fallback, `:54`), mas é input remoto tratado como caminho local confiável.
Fix: só aceitar `file://` sob o diretório de documentos do app; validar `http(s)://` para online.

**Verificado e OK (mídia):**
- Download de mídia exige `startsWith('http')` e barra YouTube (`BaixarMidiaExercicioUseCase.ts:9-11,33`); nome
  final do arquivo é `<exercicioId>.<ext>` com `exercicioId` = UUID do DB e `ext` validado (`len<=5`, `:50-53`)
  → sem path traversal a partir da URL.
- `gerarThumbMidia` grava sob `exercises/thumbs/<id>.jpg` com id do DB (`gerarThumbMidia.ts:33`).

---

## 4. Logs com dados sensíveis

**Verificado e OK.** `ConsoleAppLogger` (`AppLogger.ts:6-14`) faz `console.log/error` com message+context+error.
Varredura de `console.*`/`logger.*` por token/senha/email/session não achou nada logando credenciais:
- `mobileDependencies.ts:206` loga só a mensagem "AuthSession.restore failed" + Error (sem tokens).
- `AuthApiError.message` é `Auth request failed: <status>` (`AuthApiClient.ts:44`) — sem corpo/token.
- `getAccessToken`/`persist` (`AuthSession.ts`) não logam tokens.

`SecureTokenStore` (`SecureTokenStore.ts`) usa `expo-secure-store` corretamente (keychain/keystore); a única
gravação em `settings` é para **zerar** a sessão legada durante a migração única (`:28-29`), e o wiring usa
`SecureTokenStore` (não `SettingsTokenStore`) em produção (`mobileDependencies.ts:189`).

---

## 5. Secrets no repo

### [P3] `.env` da API foi commitado com secrets placeholder no histórico — commits `5a6d307`/`e3333af`
`apps/api/.env` está atualmente **untracked** (removido em `e3333af`, agora em `.gitignore:18`), mas o histórico
(`git show 5a6d307:apps/api/.env`) contém `JWT_ACCESS_SECRET="change-me-access-secret"` etc. Como são apenas
placeholders `change-me-*` (não secrets reais), risco é de higiene/precedente. Fix: garantir que qualquer secret
real futuro nunca seja commitado; se um real vazar, rotacionar + `git filter-repo`.

### [P3] Secret default fraco em `.env`/`.env.example` — `apps/api/.env:2-3`
`JWT_ACCESS_SECRET="change-me-access-secret"` (23 chars) é **menor que o mínimo de 32** exigido em
`jwt.strategy.ts:10` → a API nem sobe com esse default (falha segura), mas o `.env.example` propaga um valor
inválido. Fix: colocar no example um placeholder de ≥32 chars com instrução de gerar aleatório.

**Verificado e OK (secrets):** nenhuma API key / senha / secret hardcoded em `apps/mobile/src`, `apps/api/src`
ou `packages` (grep por `(api_key|secret|passw|token)=<literal>` sem hits reais). `API_BASE_URL` default é
`http://localhost:3000/api/v1`, override via `EXPO_PUBLIC_API_URL` (`apps/mobile/src/config/apiConfig.ts`) — sem
URL de produção hardcoded.

---

## Resumo por severidade
- P0: nenhum.
- P1: 3 — sem rate limit auth; `/sync` sem DTO validado; import .db valida só magic header.
- P2: 2 — enumeração de e-mail no register; `ValidationPipe` sem `forbidNonWhitelisted`.
- P3: 5 — mediaLocal/Online confiado do sync; refresh expiry hardcoded; bcrypt cost 10; .env no histórico; secret default <32.
