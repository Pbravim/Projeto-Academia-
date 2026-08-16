# Projeto Academia

Monorepo npm workspaces: `apps/api` (NestJS + Prisma) e `apps/mobile`
(Expo/React Native). Lockfile único na raiz.

## Pipeline Orca (orca-config)

Este repo roda no pipeline supervisionado do
[orca-config](https://github.com/Pbravim/orca-config): `/supervisor <tarefa>`
conduz grilling → plano → implementação (TDD) → revisão → PR.

- **Leia sempre** `docs/pipeline/LEARNINGS.md` antes de trabalhar — lições
  acumuladas e decisões do repo (é o único arquivo versionado de
  `docs/pipeline/`; spec/plan/state são locais).
- Portões de qualidade: `.orca-quality.json` (cobertura de diff ≥80%,
  complexidade, LOC). Cobertura via `node scripts/coverage-merge.mjs`.
- Grafo de código: `.code-review-graph/` (gitignored) — `code-review-graph
  build` na primeira vez num checkout novo; o setup script do Orca faz isso
  automaticamente em worktrees criados pelo app.

## Comandos

- API: `npm --prefix apps/api test` · `npm --prefix apps/api run typecheck` ·
  `npm --prefix apps/api run build` (antes dos testes num checkout limpo:
  `npx prisma generate --schema apps/api/prisma/schema.prisma`)
- Mobile: `npm run mobile:test` · `npm run mobile:typecheck`
- Lint: `npm run lint:api` / `npm run lint:fix:api` (`@inovatecjp/eslint-config`;
  nunca via `npx inovatecjp` — bloqueado pelo hook de pacotes). Mobile ainda
  sem eslint (ver LEARNINGS).
- Seeds de exercícios: `python scripts/validate_exercise_seeds.py`
