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
  via `lint:fix`. Use SEMPRE `npm run lint:api` (ou o bin local) — `npx
  inovatecjp` é bloqueado pelo hook de pacotes porque o nome sem escopo não
  existe no registry.
  O **mobile linta com config flat própria** em `apps/mobile/eslint.config.mjs`
  (`npm run lint:mobile`, `--max-warnings=0`, portão desde a fatia 5 —
  2026-09-11). Causa raiz do crash do CLI da org nos stacks `react-native`/
  `react`: **não** são os stacks em si, é **um único plugin**,
  `eslint-plugin-react-hooks@4.6.2`, que chama `context.getSource()` — API
  removida no eslint 9 (`context.getSource is not a function`). A config
  própria reusa `@inovatecjp/eslint-config/base` e reimplementa só a camada
  react-native com `eslint-plugin-react-hooks@^5.2` (API antiga de flat
  config, compatível com eslint 9; `^7` renomeia regras — não usar). Três
  desvios de regra da base da org, documentados também no arquivo de config:
  1. `react-native/no-unused-styles` → `'off'`: 1183 falsos positivos
     medidos (`Unused style detected: undefined.<chave>`) — o plugin não
     rastrea `StyleSheet.create` dentro da fábrica de tema `makeStyles(theme)`
     usada em 42 arquivos do app.
  2. `eqeqeq` → `['error','always',{null:'ignore'}]`: 99/99 achados eram o
     idioma `x == null` (null OU undefined); trocar por `===` mudaria
     comportamento.
  3. `no-duplicate-imports` → `'off'` + `import/no-duplicates: 'error'`: a
     regra core não entende `import type`; 20/20 achados eram
     `import {X}` + `import type {Y}` do mesmo módulo — a do plugin `import`
     resolve com 0 achados.
  **Dívida diferida** (decisão do supervisor em 2026-08-16, Opção A do
  `plan-mobile-lint.md`): `react-native/no-color-literals` (62 achados / 24
  arquivos — exige tokens de tema novos) e
  `react-native-a11y/has-accessibility-hint` (15 / 7 — exige copy nova em
  pt-BR e en-US) ficam `'off'` com `TODO(mobile-lint-debt)` na config; nenhum
  dos dois tem cobertura de teste (pixels e copy). Entram numa operação
  própria de follow-up.
  **Telas-deus** (decisão do usuário em 2026-09-11): o portão `loc`
  (`module_loc_block: 800`) bloqueia qualquer commit que toque um módulo
  acima do teto, mesmo que a mudança seja só reordenar imports ou mover
  estilo inline para `makeStyles` — por isso os achados de lint nas telas
  maiores que 800 LOC usam override de regra **por caminho** no
  `eslint.config.mjs`, em vez de editar o arquivo.
  **Alvo futuro**: quando a org publicar uma versão do preset
  `react-native.js` compatível com `eslint-plugin-react-hooks@^5`/`^7`, esta
  config vira um `extends` fino (só os 3 desvios) ou é apagada — ver
  `docs/pipeline/conformidade-especificacoes/plan-mobile-lint.md`.
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

## Sessão de correção de bugs (2026-09-09/10)

- **O typecheck da API não cobria `test/`** — `apps/api/tsconfig.json` tem
  `"exclude": [..., "test"]`, e o CI não roda e2e (precisa de Postgres). Resultado:
  a suíte e2e ficou **quebrada em compilação** por tempo indeterminado, sem nenhum
  sinal. Corrigido com `apps/api/tsconfig.spec.json` (`src` + `test`, `noEmit`), que o
  script `typecheck` agora usa; `nest build` segue em `tsconfig.json`, então nada de
  `test/` vaza para o `dist`. **Armadilha:** `exclude` VENCE `include`, e é herdado
  por `extends` — a primeira versão da correção só acrescentou `test/**/*` ao
  `include` e ficou **inerte**. Ao mexer em config de guarda, prove nos dois sentidos
  (quebre de propósito e veja falhar).
- **`||=` não substitui valor curto porém truthy.** O e2e faz
  `process.env.JWT_ACCESS_SECRET ||= <valor de 39 chars>`, mas o **Prisma Client
  carrega `apps/api/.env` ao ser importado**. Com um `.env` de secret curto, o valor
  ruim vence e o erro é `"must be set and at least 32 chars"` — mensagem que sugere
  variável AUSENTE quando o caso é o oposto. Se vir esse erro, cheque o TAMANHO do
  valor no `.env`, não a presença.
- **Template de ambiente não deve trazer valor com cara de credencial.** Ao corrigir
  secrets curtos no `.env.example`, valores longos foram escolhidos para satisfazer o
  boot check — e o **GitGuardian reprovou o PR** ("1 secret uncovered"), corretamente:
  string longa em variável `JWT_*_SECRET` é indistinguível de credencial vazada. O
  certo é **valor vazio + instrução de geração**. E o scanner varre TODOS os commits
  do PR: corrigir no commit seguinte não limpa o histórico.
- **`npm audit fix` sem `--force` passou limpo** (2026-09-09), contrariando a nota de
  2026-08-15 deste arquivo. O `ERESOLVE` da árvore do Expo sumiu depois que o
  `bcrypt` subiu para 6 e levou embora o galho `@mapbox/node-pre-gyp` (27 pacotes).
  Baseline: **49 vulns / 1 crítica → 43 / 0 críticas / 17 high**. As restantes exigem
  major (`expo@57`, `@nestjs/platform-express@12`, `@nestjs/swagger@12`).
- **`eslint-plugin-react-native-a11y` não suporta eslint 9** — todas as versões
  publicadas (última: 3.5.1) declaram `peerDependencies.eslint` até `^8`. Instalar com
  `--legacy-peer-deps` seria fingir suporte que o autor não declara. A dívida de a11y
  precisa primeiro de um plugin compatível, não só de ligar a regra.
- **`npm exec` resolve o eslint 8 içado na raiz.** `npm --prefix apps/mobile exec --
  eslint` morre em flat config com `Unexpected top-level property`. Use
  `npm --prefix apps/mobile run lint -- --fix`, que passa pelo bin local do workspace.
- **Suíte verde não prova que a tela abre.** Ao mover estilos inline para a fábrica
  `makeStyles`, dois subcomponentes (`MobileApp.TabButton`,
  `ExerciseMediaViewer.VideoPlayer`) ficaram referenciando um `styles` fora de escopo.
  **Lint passou. Os 515 testes passaram.** Só `tsc --noEmit` acusou (`TS2304`). Telas
  não têm teste — o typecheck é a única rede delas.
- **Duplicata de use case sobrevive a suíte verde.** Existiam duas cópias do
  `SugerirTreinoUseCase` (`application/sessoes` e `application/sugestoes`), cada uma
  com o próprio teste — por isso nada denunciava. O app importava uma; o `TODO` do
  `pendencias.md` apontava para a **outra**, morta. Ao investigar um TODO, confirme
  primeiro qual arquivo o app realmente carrega.
- **Auditoria que lê índice herda o atraso do índice.** A auditoria de 2026-08-28
  listou 3 itens como abertos que já estavam fechados no código havia meses. Item de
  débito só entra em auditoria depois de conferido na fonte.

### Portões de qualidade — duas limitações medidas (incidentes registrados)

- **O ratchet de cobertura é chaveado por `base_ref`, não por branch.** Rodar `tier 2`
  numa branch que SOBE a cobertura grava aquele valor como baseline de
  `origin/development`, mesmo sem merge — e todas as branches irmãs passam a ser
  reprovadas contra um número que não existe na base delas. Na queda o baseline não
  abaixa, então nem rodar o portão na própria `development` corrige.
- **O ratchet pune remoção de código duplicado bem coberto.** Apagar um arquivo com
  ~100% de cobertura baixa a média global (77,6% → 77,5%), e o portão lê como
  "cobertura caiu". Não distingue "apagou código coberto" de "adicionou código
  descoberto".

## Sessão de entrega da fila (2026-09-10, noite)

- **O achado do GitGuardian só é legível no comentário do bot no PR.** O check-run
  devolve `details_url = dashboard.gitguardian.com` e nada mais; `GET
  /commits/<sha>/status` volta **vazio**. Quem carrega id do incidente, arquivo, linha
  e commit é o comentário que o bot posta na conversa do PR:
  `gh pr view <n> --json comments`. Ir direto lá economiza várias chamadas.
- **O GitGuardian varre TODOS os commits do PR, não a árvore final.** Corrigir o
  literal num commit posterior **não** limpa o PR. Aconteceu duas vezes na mesma noite
  (fatia auth e fatia do `.env.example`), com a árvore final já correta nas duas.
  Como reescrever histórico depende de force-push (negado neste ambiente), o padrão de
  saída é: **branch nova a partir de `development`, árvore final num commit só, PR novo,
  fechar o antigo explicando**. Confira a equivalência com
  `git diff <branch-nova> <branch-antiga> --stat` — saída vazia = idênticas — ANTES de
  fechar o antigo. O repo já usara esse padrão no #7→#8.
- **`git checkout <branch> -- .` não apaga arquivos deletados na origem.** Ao montar a
  branch limpa acima, as duas strategies do passport (removidas na fatia) reapareceram
  e o PR teria reintroduzido código morto. Sempre confirme com
  `git diff <branch-origem> --stat` e remova as sobras à mão.
- **Literal em chave `password` dentro de teste é marcado como "Generic Password".**
  `password: 'errada'` num fixture com `validateUser` mockado reprovou a CI. Nos testes,
  gere o valor (`const senhaFake = (n) => 'x'.repeat(n)`) em vez de escrevê-lo — custa
  uma linha e evita falso positivo recorrente.
- **Escrita em arquivo de teste por linha de comando é bloqueada por desenho.** `sed
  -i`, heredoc, redirecionamento e `mv/cp` não passam pelo `check-test-integrity`, que
  só enxerga Edit/Write — por isso existe o `check-quality-bypass`. Use Edit/Write:
  **inserir teste novo continua livre**, e só a reescrita de teste consolidado pede
  aprovação do usuário.
- **A saída legítima do ratchet contaminado é a FILA DE MERGE, não o estado do
  portão.** Uma fatia sem uma única linha executável no diff foi reprovada por
  "cobertura caiu" porque o baseline tinha sido elevado por uma medição numa branch
  irmã não mergeada. Entregar a branch que produziu o número (fazendo o valor virar
  real na base) destrava as outras. Editar `.orca/quality-state.json` é gesto de
  fraude e o classificador barra — corretamente.
- **O portão `loc` mede o `package-lock.json` como se fosse um módulo.** Qualquer fatia
  que adicione dependência o faz crescer e reprova o portão, mesmo sem tocar um módulo
  de verdade. O `exempt` do `.orca-quality.json` já isenta `**/generated/**`, mas não
  lockfile. Enquanto não for decidido, fatia de dependência não passa no `loc`.

## Majors, portões e ambiente (2026-09-10, madrugada)

- **`npm ci` interrompido corrompe a árvore em SILÊNCIO.** Ele apaga `node_modules`
  antes de instalar; abortado no meio, deixa uma árvore parcial que o npm considera
  em dia — o `npm install` seguinte sai **exit 0 sem reparar nada** (aconteceu com
  `node_modules/@types/` inteiro ausente). O sintoma engana: `test`/`build`/`lint`
  falham por binário ou typings faltando, o que parece defeito de código. Só um
  `npm ci` COMPLETO conserta, e depois dele o `prisma generate` precisa ser refeito —
  senão o `$transaction(tx)` vira `any` e o build quebra com TS7006.
- **Aprovação `test-edit:` só casa com glob ABSOLUTO.** O matcher do harness removeu
  o fallback de caminho relativo (era um fail-open). Linha com glob relativo
  (`test-edit:*Foo.test.ts:...`) fica **inerte, sem aviso nenhum** — o hook segue
  bloqueando como se não houvesse concessão. Use o caminho absoluto completo, no
  mesmo formato que o próprio hook sugere quando bloqueia.
- **Teste não deve depender do `.env` da máquina.** O e2e fixava os secrets com
  `process.env.X ||= <valor longo>`, e `||=` não substitui valor curto porém truthy.
  Com jest 29 o default do spec rodava ANTES de o dotenv do Prisma carregar e
  mascarava um `.env` inválido; com jest 30 a ordem inverteu e o mesmo `.env` passou
  a derrubar o teste. O resultado dependia da ordem de carga — ou seja, da máquina.
  Fixe com `=`, não com `||=`.
- **O portão `loc` media o `package-lock.json` como se fosse um módulo** e reprovava
  qualquer fatia de dependência por construção; como `loc` é tier 1, o
  `check-quality-preflight` nem deixava abrir o PR. Corrigido acrescentando lockfiles
  ao `exempt` do `.orca-quality.json` — mesma razão pela qual `**/generated/**` já
  estava lá: o critério do portão é "módulo grande demais para revisar", e ninguém
  revisa um lock.
- **Worktree de agente nasce de um `development` congelado.** A fatia do Nest 12
  partiu de um HEAD anterior à entrega que removeu o `passport`; a correção mais séria
  do agente — restaurar o `@Optional()` que o Nest 12 deixou de herdar no `AuthGuard`
  do passport — ficou **sem objeto** na integração. Ao integrar trabalho de agente,
  confira se as premissas dele ainda valem, em vez de só resolver conflito de texto.
- **Nest 12 arrasta o jest junto.** Todos os `@nestjs/*` viraram ESM puro; o jest 29
  morre em "Must use import to load ES Module". O jest 30.5 faz `require(esm)` em
  Node ≥ 24.9, mas só com `--experimental-vm-modules` — flag de processo, que não
  cabe no `jest.config` e não é portável via `NODE_OPTIONS=` inline no Windows. Daí o
  lançador em `scripts/api-jest.mjs`.
- **`@nestjs/throttler` não tem release `^12`.** Sem `overrides`, o npm instala uma
  cópia ANINHADA do Nest 10 só para ele e a app roda com **duas instâncias do
  framework** — o `DynamicModule` do `ThrottlerModule` deixa de ser atribuível e nem
  compila. O override é dívida declarada: remover quando sair o `^12`.
- **O npm não aplica `overrides` novos sobre um lock existente.** Ele mantém a
  resolução antiga (e chega a dar ERESOLVE). Só regenerando o lockfile do zero.
