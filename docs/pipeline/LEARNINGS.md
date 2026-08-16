# LEARNINGS — pipeline Orca (orca-config)

Lições acumuladas do pipeline supervisionado neste repo. Workers leem este
arquivo antes de qualquer tarefa. Versionado — todo o resto de `docs/pipeline/`
é local (gitignored).

## Bootstrap (2026-08-15)

- **Monorepo npm workspaces**: `apps/api` (NestJS + Prisma, jest) e
  `apps/mobile` (Expo/React Native, vitest). Lockfile único na raiz
  (`package-lock.json`); lockfiles aninhados são proibidos.
- **Testes da API dependem do Prisma Client gerado**: rode
  `npx prisma generate --schema apps/api/prisma/schema.prisma` após `npm ci`
  (o CI faz isso — ver `.github/workflows/ci.yml`).
- **Cobertura**: `node scripts/coverage-merge.mjs` roda as duas suítes e
  concatena os lcov em `coverage/lcov.info` com caminhos relativos à raiz.
  `@vitest/coverage-v8@4.1.5` instalado em `apps/mobile` (2026-08-15,
  vetting OK) — as duas suítes entram no relatório.
- **Auditoria npm (2026-08-15)**: baseline pré-existente de vulnerabilidades
  reduzida de 52 (2 critical) para 46 (1 critical) com `npm update`
  direcionado (shell-quote, ws, undici, nanoid, vite...). O restante exige
  upgrades major FORA do escopo de tarefas comuns: `expo@57`,
  `@nestjs/platform-express@11` + `@nestjs/swagger@11`, e o `tar@6` preso sob
  `bcrypt@5→node-pre-gyp` (candidato: subir bcrypt). `npm audit fix` cru dá
  ERESOLVE na árvore do Expo — nunca use `--force`. O hook de audit gate
  bloqueia installs com high/critical: esses achados são o baseline conhecido,
  não regressão nova.
- **Lint**: `@inovatecjp/eslint-config@1.3.1` instalado na raiz (vetting
  check-library OK; está no npm público, mas com ~83 downloads/mês o hook de
  supply-chain pede aprovação — registrada). A **API** linta com
  `npm run lint:api` (`inovatecjp lint --stack=node`), zerada em 2026-08-15
  via `lint:fix`. O **mobile NÃO linta ainda**: os stacks `react-native` e
  `react` do CLI crasham com eslint 9 (`context.getSource is not a function`
  — plugins react-native/hooks desatualizados no pacote; reportar à org) e o
  stack `node` acha 418 erros legados. Até resolver, o gate usa
  `tsc --noEmit` como stand-in do mobile. Use SEMPRE `npm run lint:api` (ou
  o bin local) — `npx inovatecjp` é bloqueado pelo hook de pacotes porque o
  nome sem escopo não existe no registry.
- **CI existente** (`ci.yml`): typecheck + testes dos dois apps. Não roda
  `nest build` nem validação de contrato OpenAPI — completar quando a API
  ganhar contrato (critério de conclusão de tarefas de API do pipeline).
- **Seeds do catálogo de exercícios**: dados em
  `apps/mobile/src/infrastructure/exercises/seeds/` com validador
  `scripts/validate_exercise_seeds.py` + workflow próprio no CI. Mudanças em
  seeds devem passar pelo validador.

## Modelo de branches (decidido 2026-08-15)

- **base = `development`** (default branch no GitHub); `main` = produção.
  Promoção via PR `development → main` é decisão do usuário (deploy);
  hotfix = PR direto para `main` + back-merge imediato `main → development`;
  promoção sempre por merge, nunca cherry-pick.
- Orca: `base-ref = origin/development` (worktrees filhos nascem dela).
- **`main` NÃO tem branch protection**: repo privado em plano GitHub free
  (recurso exige Pro ou repo público) — a proteção é disciplina de processo
  até lá. Se o repo virar público ou o plano subir, ativar a proteção.
