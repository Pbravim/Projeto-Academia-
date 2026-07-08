# Auth sem Passport (guards puros com @nestjs/jwt) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover `passport`, `passport-jwt`, `passport-local` e `@nestjs/passport` (4 deps + 2 @types), substituindo as strategies por dois guards puros que usam `JwtService` e `AuthService`/`UsersService` diretamente.

**Architecture:** Hoje o Passport registra strategies globais, por isso `sync`/`treinos`/`exercises` usam `JwtAuthGuard` sem importar o AuthModule. Guards puros são instanciados no contexto do módulo consumidor, então o AuthModule passa a EXPORTAR `JwtModule` e `UsersModule`, e cada módulo consumidor importa `AuthModule`. O contrato externo não muda: `request.user` continua sendo o usuário Prisma completo (o `@CurrentUser()` e os controllers dependem de `user.id`), login sem credenciais continua 401.

**Tech Stack:** NestJS 10, @nestjs/jwt (já instalado), jest.

## Global Constraints

- `request.user` = usuário Prisma completo em rotas JWT (comportamento do `JwtStrategy.validate` atual); em login = retorno de `AuthService.validateUser`.
- Falhas de auth SEMPRE 401 `UnauthorizedException` (corpo ausente/malformado no login inclusive — não vazar diferença entre "sem body" e "senha errada").
- O boot check do secret (`JWT_ACCESS_SECRET` ≥ 32 chars, hoje no construtor do JwtStrategy) NÃO pode se perder: passa para `assertJwtSecret()` chamada no `main.ts` antes do listen.
- `auth.throttle.spec.ts` faz `overrideGuard(LocalAuthGuard)` e o teste de wiring lê `Reflect.getMetadata('imports', AuthModule)` — ambos precisam continuar passando.
- Ordem de guards no login preservada: ThrottlerGuard (classe) roda antes do guard de credenciais (método).
- Cada task termina com `npm test` (apps/api) verde e `tsc --noEmit` limpo.

---

### Task 1: Boot check do secret em módulo próprio

**Files:**
- Create: `apps/api/src/auth/jwt.config.ts`
- Create: `apps/api/src/auth/jwt.config.spec.ts`
- Modify: `apps/api/src/main.ts` (chamar no bootstrap)

**Interfaces:**
- Produces: `assertJwtSecret(): string` — retorna o secret validado; lança `Error('JWT_ACCESS_SECRET must be set and at least 32 chars')` se ausente/curto. Tasks 2 e 4 consomem.

- [ ] **Step 1: Teste que falha**

```ts
// apps/api/src/auth/jwt.config.spec.ts
import { assertJwtSecret } from './jwt.config';

describe('assertJwtSecret', () => {
  const original = process.env.JWT_ACCESS_SECRET;
  afterEach(() => { process.env.JWT_ACCESS_SECRET = original; });

  it('devolve o secret quando válido (>= 32 chars)', () => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
    expect(assertJwtSecret()).toBe('a'.repeat(32));
  });

  it('lança quando ausente ou curto', () => {
    delete process.env.JWT_ACCESS_SECRET;
    expect(() => assertJwtSecret()).toThrow('JWT_ACCESS_SECRET');
    process.env.JWT_ACCESS_SECRET = 'curto';
    expect(() => assertJwtSecret()).toThrow('JWT_ACCESS_SECRET');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `cd apps/api; npm test -- src/auth/jwt.config` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementação**

```ts
// apps/api/src/auth/jwt.config.ts
/** Boot check que vivia no construtor do JwtStrategy — não pode se perder na remoção do Passport. */
export function assertJwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set and at least 32 chars');
  }
  return secret;
}
```

Em `apps/api/src/main.ts`, primeira linha do `bootstrap()`:

```ts
import { assertJwtSecret } from './auth/jwt.config';
// dentro de bootstrap(), antes do NestFactory.create:
assertJwtSecret();
```

- [ ] **Step 4: Rodar e ver passar** — `npm test -- src/auth/jwt.config` → PASS.
- [ ] **Step 5: Commit** — `git add apps/api/src/auth/jwt.config* apps/api/src/main.ts && git commit -m "refactor(auth): boot check do JWT secret em assertJwtSecret()"`

### Task 2: JwtAuthGuard puro

**Files:**
- Modify: `apps/api/src/auth/guards/jwt-auth.guard.ts` (reescrever)
- Create: `apps/api/src/auth/guards/jwt-auth.guard.spec.ts`

**Interfaces:**
- Consumes: `JwtService.verifyAsync(token, { secret })` (@nestjs/jwt); `UsersService.findById(id)`; `assertJwtSecret()` da Task 1.
- Produces: `JwtAuthGuard implements CanActivate` com construtor `(jwtService: JwtService, usersService: UsersService)` — Task 4 registra nos módulos consumidores.

- [ ] **Step 1: Teste que falha**

```ts
// apps/api/src/auth/guards/jwt-auth.guard.spec.ts
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

const ctxFor = (headers: Record<string, string>) => {
  const request: any = { headers };
  return {
    ctx: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext,
    request,
  };
};

describe('JwtAuthGuard (puro, sem passport)', () => {
  const users = { findById: jest.fn() };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 's'.repeat(32);
    guard = new JwtAuthGuard(new JwtService({}), users as never);
  });

  it('401 sem Authorization ou sem Bearer', async () => {
    await expect(guard.canActivate(ctxFor({}).ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctxFor({ authorization: 'Basic abc' }).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('401 com token inválido/expirado', async () => {
    await expect(guard.canActivate(ctxFor({ authorization: 'Bearer nao-e-jwt' }).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('401 quando o usuário do token não existe mais', async () => {
    const token = new JwtService({}).sign({ sub: 'u1', email: 'a@b.com' }, { secret: 's'.repeat(32) });
    users.findById.mockResolvedValue(null);
    await expect(guard.canActivate(ctxFor({ authorization: `Bearer ${token}` }).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('token válido popula request.user com o usuário do banco e retorna true', async () => {
    const token = new JwtService({}).sign({ sub: 'u1', email: 'a@b.com' }, { secret: 's'.repeat(32) });
    users.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const { ctx, request } = ctxFor({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'a@b.com' }); // @CurrentUser() depende disso
    expect(users.findById).toHaveBeenCalledWith('u1');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- src/auth/guards/jwt-auth.guard` → FAIL (guard ainda é `AuthGuard('jwt')`, construtor incompatível).

- [ ] **Step 3: Implementação**

```ts
// apps/api/src/auth/guards/jwt-auth.guard.ts (arquivo completo)
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { assertJwtSecret } from '../jwt.config';

/**
 * Guard JWT puro (substitui passport-jwt): extrai o Bearer, verifica assinatura
 * e expiração e carrega o usuário do banco — request.user é o usuário Prisma
 * completo, como o JwtStrategy.validate devolvia.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [scheme, token] = String(request.headers['authorization'] ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(token, { secret: assertJwtSecret() });
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    request.user = user;
    return true;
  }
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test -- src/auth/guards/jwt-auth.guard` → PASS (4 testes). A suite completa ainda NÃO passa (wiring na Task 4) — rodar só este spec.
- [ ] **Step 5: Commit** — `git add apps/api/src/auth/guards/jwt-auth.guard* && git commit -m "refactor(auth): JwtAuthGuard puro com @nestjs/jwt"`

### Task 3: Guard de credenciais puro no login

**Files:**
- Modify: `apps/api/src/auth/guards/local-auth.guard.ts` (reescrever)
- Create: `apps/api/src/auth/guards/local-auth.guard.spec.ts`
- Delete (na Task 4): strategies.

**Interfaces:**
- Consumes: `AuthService.validateUser(email, password)` (retorna user ou null).
- Produces: `LocalAuthGuard implements CanActivate`, construtor `(authService: AuthService)`. O nome da classe NÃO muda (o `auth.throttle.spec.ts` faz overrideGuard por ela).

- [ ] **Step 1: Teste que falha**

```ts
// apps/api/src/auth/guards/local-auth.guard.spec.ts
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';

const ctxFor = (body: unknown) => {
  const request: any = { body };
  return { ctx: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext, request };
};

describe('LocalAuthGuard (puro, sem passport-local)', () => {
  const auth = { validateUser: jest.fn() };
  const guard = new LocalAuthGuard(auth as never);
  beforeEach(() => jest.clearAllMocks());

  it('401 com body sem email/password (mesmo status de credencial errada — não vazar diferença)', async () => {
    await expect(guard.canActivate(ctxFor({}).ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctxFor({ email: 'a@b.com' }).ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctxFor({ email: 1, password: 2 }).ctx)).rejects.toThrow(UnauthorizedException);
    expect(auth.validateUser).not.toHaveBeenCalled();
  });

  it('401 quando validateUser devolve null', async () => {
    auth.validateUser.mockResolvedValue(null);
    await expect(guard.canActivate(ctxFor({ email: 'a@b.com', password: 'errada' }).ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('credenciais válidas populam request.user e retornam true', async () => {
    auth.validateUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const { ctx, request } = ctxFor({ email: 'a@b.com', password: 'certa' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'a@b.com' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- src/auth/guards/local-auth.guard` → FAIL.

- [ ] **Step 3: Implementação**

```ts
// apps/api/src/auth/guards/local-auth.guard.ts (arquivo completo)
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * Valida email/senha do body no POST /auth/login (substitui passport-local).
 * Sempre 401 — body malformado e senha errada são indistinguíveis de fora.
 */
@Injectable()
export class LocalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email, password } = (request.body ?? {}) as { email?: unknown; password?: unknown };
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    request.user = user;
    return true;
  }
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test -- src/auth/guards/local-auth.guard` → PASS.
- [ ] **Step 5: Commit** — `git add apps/api/src/auth/guards/local-auth.guard* && git commit -m "refactor(auth): guard de credenciais puro no login"`

### Task 4: Wiring dos módulos e remoção das strategies

**Files:**
- Modify: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/sync/sync.module.ts`, `apps/api/src/treinos/treinos.module.ts`, `apps/api/src/exercises/exercises.module.ts` (adicionar `AuthModule` aos imports)
- Delete: `apps/api/src/auth/strategies/jwt.strategy.ts`, `apps/api/src/auth/strategies/local.strategy.ts`

**Interfaces:**
- Consumes: guards das Tasks 2-3.
- Produces: `AuthModule` exporta `JwtModule` e `UsersModule` (deps dos guards resolvem em qualquer módulo que importe AuthModule).

- [ ] **Step 1: Reescrever o AuthModule**

```ts
// apps/api/src/auth/auth.module.ts (arquivo completo)
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    JwtModule.register({}),
    UsersModule,
    // Storage/options for the ThrottlerGuard applied on AuthController (brute-force guard).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  // Guards puros são instanciados no módulo CONSUMIDOR: exportar JwtModule e
  // UsersModule é o que permite `@UseGuards(JwtAuthGuard)` em sync/treinos/exercises.
  exports: [AuthService, JwtModule, UsersModule],
})
export class AuthModule {}
```

(PassportModule e as strategies saem dos imports/providers; `assertJwtSecret` no main.ts cobre o boot check que o construtor da JwtStrategy fazia.)

- [ ] **Step 2: Importar AuthModule nos consumidores**

Em cada um de `sync.module.ts`, `treinos.module.ts`, `exercises.module.ts`, adicionar aos imports:

```ts
import { AuthModule } from '../auth/auth.module';
// ...
imports: [PrismaModule, AuthModule],
```

- [ ] **Step 3: Deletar as strategies**

```bash
git rm apps/api/src/auth/strategies/jwt.strategy.ts apps/api/src/auth/strategies/local.strategy.ts
```

- [ ] **Step 4: Suite completa + tsc**

Run: `cd apps/api; node ..\..\node_modules\typescript\bin\tsc --noEmit; npm test`
Expected: tsc limpo; TODOS os specs verdes — atenção especial a `auth.throttle.spec.ts` (overrideGuard(LocalAuthGuard) e o teste de imports do ThrottlerModule) e `auth.controller.spec.ts`.

- [ ] **Step 5: Commit** — `git add -A apps/api/src && git commit -m "refactor(auth): remove strategies do passport; AuthModule exporta deps dos guards"`

### Task 5: Remover as dependências

**Files:**
- Modify: `apps/api/package.json`, `package-lock.json`

- [ ] **Step 1: Desinstalar**

Run: `cd apps/api; npm uninstall passport passport-jwt passport-local @nestjs/passport @types/passport-jwt @types/passport-local`

- [ ] **Step 2: Validar** — `node ..\..\node_modules\typescript\bin\tsc --noEmit; npm test` → tsc limpo, suite verde. Grep final: `passport` não aparece em `apps/api/src`.

- [ ] **Step 3: Smoke manual (recomendado antes do merge)**

Com Postgres de dev rodando: `npm run start:dev` e, em outro terminal:
1. `POST /api/v1/auth/register` (email novo) → 201 com tokens.
2. `POST /api/v1/auth/login` body vazio → 401; com credenciais → 200.
3. `POST /api/v1/sync` sem Bearer → 401; com Bearer do login → 200.

- [ ] **Step 4: Commit** — `git add apps/api/package.json package-lock.json && git commit -m "chore(deps): remove passport e adaptadores (auth com guards puros)"`
