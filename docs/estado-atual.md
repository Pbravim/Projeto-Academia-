# Estado Atual — App Academia

> Atualizado em `2026-06-22`.

---

## Visão Geral

App mobile de acompanhamento de treino de musculação. Registro rápido durante o treino, histórico confiável, análise de evolução. Uso pessoal, dados primariamente locais (SQLite).

> **Backend (em construção):** já existe `apps/api` (NestJS + Prisma + Postgres) com módulos `auth`, `users`, `treinos`, `exercises` e `sync` — base para sincronização/backup em nuvem (sub-projeto 2). Ainda **não está ligado** no app mobile por padrão; o sync depende de itens de prontidão (ver `docs/pendencias.md`). Catálogo global (seeds/GIFs) não sincroniza.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.81.5 + React 19.1 |
| Plataforma | Expo SDK 54 |
| Linguagem | TypeScript 5.9 (strict) |
| Banco local | SQLite via expo-sqlite 16 (schema v22) |
| Backend | NestJS + Prisma + Postgres (`apps/api`) — auth/sync/users/treinos/exercises |
| Testes | Vitest 4.1 (mobile, ~360) · Jest (api, 36 unit + 4 e2e) |

---

## Arquitetura

Clean Architecture em 4 camadas. Dependências sempre apontam para dentro.

```
apps/mobile/src/
├── domain/          # Entidades, interfaces de repositório, erros de domínio
├── application/     # Use cases (classes com execute())
├── infrastructure/  # Repos SQLite + InMemory, logger, cliente SQLite
├── ui/              # Screens, hook controllers, presenters, componentes
├── bootstrap/       # mobileDependencies.ts — wiring de DI
└── shared/          # generateId, normalizeText, utils
```

**Convenções:**
- Use cases como classes com `execute()` e JSDoc `@throws`
- Entities com `create()` e `restore()`
- Hook controllers (`useXxxController`) isolam state da renderização
- Presenters transformam primitives em view models
- Snapshots imutáveis nas sessões (dados congelados no início)
- Migrations versionadas: array em `ExpoSQLiteDatabaseClient`, nunca editar step passado

---

## Módulos

### Exercícios

**Use cases:** `CreateExercise`, `UpdateExercise`, `DeleteExercise`, `ListExercises`

- Cadastro com nome (obrigatório), grupo muscular (obrigatório, multi-select), categoria (opcional) e equipamento (opcional)
- Prevenção de nome duplicado via `normalized_name` (`UNIQUE`)
- **Busca por texto** no catálogo (filtra seções e exibe exercícios com matches)
- **Filtro por categoria e equipamento** via chips derivados dos valores reais do catálogo
- **Ordenação**: A–Z (padrão) ou por último uso (`dataExecucao` decrescente, nunca usados ao final)
- Sugestões ao criar: exercícios com nome similar aparecem em tempo real; match exato mostra aviso "já existe"
- Último peso válido exibido no card (via `GetUltimaExecucaoValida`)
- Navegação para histórico individual do exercício
- **Mídia custom:** campo para URL online (YouTube, GIF, MP4) e upload de arquivo local (imagem/vídeo) via `expo-image-picker`; arquivos copiados para `documentDirectory/exercises/` e limpos ao remover/deletar

**Exercise Intelligence (Sub-projeto 5 — em grande parte implementado):**
- `musculo_alvo` agora é `string[]` (domínio); campos biomecânicos estruturados adicionados no schema v20:
  `movement_pattern`, `stabilizers[]`, `execution_type`, `name_variations[]`, `primary_equipment`/
  `secondary_equipment` (vocabulário controlado), `catalog_version` e `tracking_type`.
- Engine de substituição em camadas no `SugerirSubstitutosUseCase` (equivalente × mesmo grupo) já em uso.
- `tracking_type` (`reps_load`/`cardio`/`hold`/`reps_only`) + métricas `duracaoSegundos`/`distanciaMetros`
  (schema v21/v22) permitem registrar cardio, sustentações e exercícios sem carga.
- _Restante do sub-5:_ auditoria de ~7 grupos musculares e a 9ª categoria de expansão
  (`reabilitacao_lombar_core`) ainda pendentes — ver `docs/pendencias.md` e `docs/exercises/catalog-maintenance.md`.

### Treinos

**Use cases:** `CreateTreino`, `UpdateTreino`, `DeleteTreino`, `ListTreinos`, `AddExercicioAoTreino`, `RemoveExercicioDoTreino`, `ReordenarExercicios`, `ListTreinoExercicios`, `DuplicarTreino`

- Criação com nome + objetivo (selecionável via bottom sheet, opcional)
- Edição inline do nome no detalhe do treino
- **Objetivo editável** inline no detalhe do treino via bottom sheet (mesmos valores do formulário de criação)
- **Duplicar treino**: cópia com nome "Copia de {nome}", preserva todos os exercícios e recomendações; navega direto para o detalhe da cópia
- Adição de exercícios com multiselect e busca por nome/grupo
- Recomendações por exercício: séries × reps × carga × tempo de descanso
- Exclusão em cascata (exercícios do treino removidos junto)
- **Edição inline de série registrada:** long-press na série durante a sessão abre campos de edição (carga, reps) com Save/Cancel

### Sessões de Treino

**Use cases:** `IniciarSessao`, `GetSessaoAtiva`, `GetSessaoDetalhe`, `RegistrarSerie`, `DeleteSerie`, `ToggleExercicioRealizado`, `AddExercicioASessao`, `FinalizarSessao`, `CancelarSessao`

- Início a partir de um treino template (snapshot completo e imutável)
- Apenas uma sessão ativa por vez; persiste entre fechamentos do app
- Registro de séries: tipo (aquecimento / válida), carga decimal, reps, observação
- Campos pré-preenchidos com recomendações do treino
- Cronômetro de descanso automático com vibração ao terminar
- Sugestão de progressão de carga (+2,5 kg quando meta atingida nas 2 últimas sessões)
- Cancelar com confirmação; finalizar com tela de resumo
- `realizado` só é verdadeiro com ≥ 1 série válida

### Histórico

**Use cases:** `GetHistoricoExercicio`, `GetUltimaExecucaoValida`, `GetUltimasExecucoesValidas` (bulk)

- Lista de execuções por exercício: data, 1RM estimado, volume, séries
- Gráfico de linha do 1RM ao longo das sessões
- Detecção de plateau (1RM estagnado em 4 sessões consecutivas)
- `GetUltimasExecucoesValidas` usa uma única query bulk (evita crash Android)
- **Bug conhecido (UI):** com apenas uma sessão registrada para o exercício, a visualização do histórico (gráfico + tabela) fica estranha — precisa tratar o caso `n = 1` explicitamente — ver item 13 em `docs/problems-audit-2026-06-10.md`

### Perfil

Tab que substituiu **Peso** na navegação inferior. Exibe:
- Avatar circular com iniciais e nome editável (persistido em `AsyncStorage`)
- Badge com último peso registrado
- Toda a funcionalidade de Peso Corporal embutida abaixo
- Stats de treino (sessões totais, frequência semanal)

### Peso Corporal

**Use cases:** `RegistrarPeso`, `ListRegistrosPeso`, `DeleteRegistroPeso`

- Registro com valor, observação opcional e **data/hora retroativa**
- **Date picker nativo** (`@react-native-community/datetimepicker`): no Android dois passos (data → hora), no iOS spinner datetime único; `maximumDate` bloqueia datas futuras
- Label do campo mostra "Hoje, HH:MM" ou "DD/MM/AAAA, HH:MM" quando retroativo (em destaque accent)
- Histórico decrescente com delta (+/- kg) entre entradas
- Gráfico de linha com evolução ao longo do tempo
- **Navegação:** atualmente tab "Peso" própria → será movido para dentro do tab **Perfil**

### Dashboard

**Use cases:** `GetDashboardStats`, `GetTreinoEvolucao`, `ResetHistorico`, `ExportarHistorico`

- Total de sessões e sessões no último mês
- Top 10 recordes pessoais por 1RM estimado
- Cards por treino com gráfico de 1RM ou volume (toggle) — padrão: 1RM
- **Tela de evolução por treino:** gráfico de 1RM + volume (toggle), séries reais com chips `"3× 80×10"` por sessão
- **Aderência** (card com 3 modos):
  - **Semanal**: barras dos 7 dias da semana atual (Seg–Dom), dia atual destacado
  - **Mensal**: calendário real com dias 1–31 alinhados por dia da semana; células com sessão em accent com contagem; hoje com borda
  - **Anual**: barras dos 12 meses do ano atual, mês atual destacado
- **Exportar CSV**: botão no Dashboard; gera `historico_treinos.csv` com todas as séries finalizadas (`Data, Treino, Exercicio, Serie, Tipo, Carga, Repeticoes, Observacao`) e abre diálogo de compartilhamento nativo via `expo-sharing`
- **Bug conhecido (CSV):** se o usuário deletou uma série e criou outra no lugar durante a sessão, a coluna `Serie` pode ter valores duplicados no CSV. Causa: `RegistrarSerieUseCase` usa `COUNT(ativas)+1` para calcular `ordem`, mas séries remanescentes mantêm suas ordens originais. Fix: usar `MAX(ordem)+1` — ver item 12 em `docs/problems-audit-2026-06-10.md`

---

## Schema SQLite (v22)

v19 adiciona colunas de sincronização (`updated_at` ISO, `deleted_at` tombstone, `dirty`, `server_rev`) em todas as tabelas de dados do usuário; deletes passam a ser soft-deletes. Catálogo global (seeds/GIFs) não sincroniza.

Migrações posteriores: **v20** campos biomecânicos do Exercise Intelligence (`movement_pattern`, `stabilizers`, `execution_type`, `name_variations`, `primary_equipment`, `secondary_equipment`, `catalog_version`, `musculo_alvo` estruturado); **v21** `tracking_type` + métricas não-força (`duracao_segundos`, `distancia_metros`) para cardio/hold/reps_only; **v22** torna `carga_kg`/`repeticoes` NULLABLE para persistir séries sem carga/reps.

```sql
exercises         (id, name, normalized_name, group_muscle, category, equipment,
                   load_unit, is_custom, media_online, media_local, musculo_alvo, ...)
treinos           (id, nome, objetivo, ...)
treino_exercicios (id, treino_id, exercicio_id, ordem,
                   series_recomendadas, execucoes_recomendadas,
                   carga_padrao, tempo_descanso_segundos,
                   metodo, grupo_id)
sessao_treinos    (id, treino_id, treino_nome_snapshot,
                   data_hora_inicio, data_hora_fim, status, arquivado)
sessao_exercicios (id, sessao_treino_id, exercicio_id, ordem,
                   nome_snapshot, grupo_muscular_snapshot,
                   categoria_snapshot, equipamento_snapshot,
                   realizado, series_recomendadas,
                   execucoes_recomendadas, carga_padrao,
                   tempo_descanso_segundos, metodo, grupo_id,
                   nome_original_snapshot, motivo_substituicao)
series_registradas (id, sessao_exercicio_id, tipo_serie,
                    ordem, carga_kg, repeticoes, observacao)
registros_peso    (id, peso_kg, data_hora, observacao)
exercise_alternatives (exercicio_id, alternativa_id)
settings          (key TEXT PRIMARY KEY, value TEXT)
```

Migrações versionadas de v1 a v22 em `ExpoSQLiteDatabaseClient.ts`. GIFs embutidos como assets estáticos — ver `GIF_MAPPING.md`.

---

## Testes

- **Mobile:** ~360 testes passando (Vitest, ambiente node)
- **Backend (`apps/api`):** 36 testes unit + 4 e2e (Jest + supertest; e2e roda contra Postgres do docker)
- **Estratégia:** InMemory repos para use cases, SQLite real para integração
- **Cobertos:** entities, use cases, repositórios, presenters, hook controllers (8 controllers)
- **Sem cobertura:** screens, E2E mobile

---

## Fórmulas

- **1RM estimado:** `carga_kg * (1 + repeticoes / 30)` — consistente em todos os presenters e queries SQL
- **Volume:** `SUM(carga_kg * repeticoes)` para séries válidas

---

## Como Rodar

```bash
# Instalar dependências (raiz do repositório)
npm install

# Iniciar servidor Expo
npm run mobile:start
# → escaneie QR code com Expo Go, pressione 'a' para Android, 'i' para iOS

# Testes
npm --prefix apps/mobile test

# Verificar tipos
npm --prefix apps/mobile run typecheck
```

## Exportar como APK / IPA

```bash
# Instalar EAS CLI (uma vez)
npm install -g eas-cli && eas login

# Entrar na pasta do app
cd apps/mobile

# Android APK (instalável direto no device)
eas build --platform android --profile preview

# Android AAB (Play Store)
eas build --platform android --profile production

# iOS (requer Apple Developer Program)
eas build --platform ios --profile production
```
