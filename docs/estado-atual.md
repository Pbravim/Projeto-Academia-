# Estado Atual — App Academia

> Atualizado em `2026-05-19`.

---

## Visão Geral

App mobile de acompanhamento de treino de musculação. Registro rápido durante o treino, histórico confiável, análise de evolução. Uso pessoal, sem backend, dados 100% locais.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.81.5 + React 19.1 |
| Plataforma | Expo SDK 54 |
| Linguagem | TypeScript 5.9 (strict) |
| Banco local | SQLite via expo-sqlite 16 (schema v15) |
| Testes | Vitest 4.1 — 126 testes passando |

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

### Treinos

**Use cases:** `CreateTreino`, `UpdateTreino`, `DeleteTreino`, `ListTreinos`, `AddExercicioAoTreino`, `RemoveExercicioDoTreino`, `ReordenarExercicios`, `ListTreinoExercicios`, `DuplicarTreino`

- Criação com nome + objetivo (selecionável via bottom sheet, opcional)
- Edição inline do nome no detalhe do treino
- **Objetivo editável** inline no detalhe do treino via bottom sheet (mesmos valores do formulário de criação)
- **Duplicar treino**: cópia com nome "Copia de {nome}", preserva todos os exercícios e recomendações; navega direto para o detalhe da cópia
- Adição de exercícios com multiselect e busca por nome/grupo
- Recomendações por exercício: séries × reps × carga × tempo de descanso
- Exclusão em cascata (exercícios do treino removidos junto)

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

---

## Schema SQLite (v15)

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

Migrações versionadas de v1 a v15 em `ExpoSQLiteDatabaseClient.ts`. GIFs embutidos como assets estáticos — ver `GIF_MAPPING.md`.

---

## Testes

- **126 testes** passando (Vitest, ambiente node)
- **Estratégia:** InMemory repos para use cases, SQLite real para integração
- **Cobertos:** entities, use cases, repositórios, presenters
- **Sem cobertura:** hook controllers, screens, E2E

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
yarn mobile:start
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
