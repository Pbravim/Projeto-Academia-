# Estado Atual do App — Academia

> Atualizado em `2026-05-06`. MVP entregue e em fase de iteração pós-MVP.

---

## Visão Geral

App mobile de acompanhamento de treino de musculação. Foco em registro rápido durante o treino e consulta confiável do histórico. Uso pessoal, sem backend, dados 100% locais.

---

## Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.81.5 + React 19.1 |
| Plataforma | Expo 54 |
| Linguagem | TypeScript 5.9 (strict) |
| Banco local | SQLite via expo-sqlite 16 |
| Testes | Vitest 4.1 |
| Estado | React Hooks (sem Redux/Context global) |

---

## Arquitetura

Clean Architecture em 4 camadas. Dependências apontam sempre para dentro.

```
src/
├── domain/          # Entities, value objects, interfaces de repositório, erros de domínio
├── application/     # Use cases (classes com execute())
├── infrastructure/  # Repositórios SQLite, InMemory, logger, cliente SQLite
├── ui/              # Screens, hooks controllers, presenters, componentes
├── bootstrap/       # Wiring de dependências (mobileDependencies.ts)
└── shared/          # generateId, utils
```

**Padrões em uso:**
- Use Cases como classes com `execute()` e JSDoc (`@throws`, `@returns`)
- Entities com factory methods `create()` e `restore()`
- Repository interfaces no domain, implementações na infrastructure
- Feature modules autocontidos (cada módulo tem sua pasta em `ui/`)
- Hook controllers (`useXxxController`) isolam lógica de state da renderização
- Presenters transformam primitives em view models para a UI
- Snapshots imutáveis nas sessões (dados congelados no momento do início)
- Migrations versionadas com `PRAGMA user_version` (v1→v4, nunca editar step passado)

---

## Módulos Implementados

### Exercícios

Catálogo de exercícios cadastrados pelo usuário.

**Use cases:** `CreateExercise`, `ListExercises`, `UpdateExercise`, `DeleteExercise`

**Funcionalidades:**
- Cadastro com nome, grupo muscular (multi-select), categoria e equipamento
- Edição com prevenção de nome duplicado (via `normalized_name`)
- Exclusão
- Filtro por nome ou grupo muscular (busca com `LIKE` no SQLite)
- Exibe último peso válido no card (via `GetUltimaExecucaoValida`)
- Navegação para histórico individual do exercício

**Validações:** nome obrigatório, mínimo 2 chars, ao menos 1 grupo muscular

---

### Treinos

Templates de treino que servem de base para iniciar sessões.

**Use cases:** `CreateTreino`, `ListTreinos`, `DeleteTreino`, `UpdateTreino`, `AddExercicioAoTreino`, `RemoveExercicioDoTreino`, `ReordenarExercicios`, `ListTreinoExercicios`

**Funcionalidades:**
- Criação com nome e objetivo opcional
- Listagem e exclusão (com cascata nos exercícios do treino)
- Adição de exercícios com multiselect e busca por nome/grupo
- Remoção e reordenação de exercícios
- Prevenção de exercício duplicado no mesmo treino (`UNIQUE(treino_id, exercicio_id)`)
- Recomendações por exercício: séries × reps × carga padrão (usadas na sessão)
- Edição inline do nome do treino

---

### Sessões de Treino

Execução de um treino template. Coração do app.

**Use cases:** `IniciarSessao`, `GetSessaoAtiva`, `GetSessaoDetalhe`, `RegistrarSerie`, `DeleteSerie`, `ToggleExercicioRealizado`, `AddExercicioASessao`, `FinalizarSessao`, `CancelarSessao`

**Funcionalidades:**
- Início a partir de um treino template (snapshot completo dos exercícios)
- Apenas uma sessão ativa por vez; sessão persiste entre fechamentos do app
- Registro de séries com tipo (aquecimento / válida), carga (decimal), reps e observação
- Campos pré-preenchidos com recomendações do treino
- Badge "Meta: N × N @ Nkg" por exercício
- Exclusão de série, toggle de realizado, adição de exercício extra
- Cancelar sessão com confirmação (apaga todos os dados da sessão)
- Finalizar sessão com tela de resumo: duração, volume total, melhor série por 1RM
- Exercícios sem séries válidas **não contam** como realizados no resumo

**Regras:**
- Snapshot congela nome, grupo muscular, categoria e equipamento no momento do início
- Edições futuras no treino não afetam sessões passadas
- `realizado` só é verdadeiro se o exercício tem ao menos 1 série válida

---

### Histórico

Consulta de execuções passadas por exercício.

**Use cases:** `GetHistoricoExercicio`, `GetUltimaExecucaoValida`

**Funcionalidades:**
- Lista todas as execuções de um exercício em sessões finalizadas, ordem decrescente
- Por execução: data, volume total, melhor 1RM estimado, séries com tipo e carga
- `GetUltimaExecucaoValida` alimenta o card de exercício com a última carga usada

**Implementação:** `SQLiteHistoricoRepository` com query JOIN triplo entre `sessao_treinos`, `sessao_exercicios` e `series_registradas`

---

### Peso Corporal

Tracking de peso ao longo do tempo.

**Use cases:** `RegistrarPeso`, `ListRegistrosPeso`, `DeleteRegistroPeso`

**Funcionalidades:**
- Registro com valor e observação opcional
- Histórico em ordem decrescente com delta (+/- kg) entre entradas
- Exclusão de registros

**Validações:** peso > 0

---

### Dashboard / Evolução

Visão analítica do histórico de treinos.

**Use case:** `GetDashboardStats`, `ResetHistorico`

**Funcionalidades:**
- Total de sessões finalizadas
- Sessões no último mês
- Top 10 recordes pessoais (melhor 1RM estimado por exercício)
- Histórico das últimas 10 sessões finalizadas por treino
- Reset completo do histórico com confirmação (preserva treinos e exercícios)

---

## Schema do Banco de Dados (v4)

```sql
exercises (
  id, name, normalized_name, group_muscle, category, equipment, created_at
)

treinos (
  id, nome, objetivo, created_at
)

treino_exercicios (
  id, treino_id, exercicio_id, ordem,
  series_recomendadas, execucoes_recomendadas, carga_padrao
  -- UNIQUE(treino_id, exercicio_id)
)

sessao_treinos (
  id, treino_id, treino_nome_snapshot,
  data_hora_inicio, data_hora_fim, status  -- 'em_andamento' | 'finalizada'
)

sessao_exercicios (
  id, sessao_treino_id, exercicio_id, ordem,
  nome_snapshot, grupo_muscular_snapshot, categoria_snapshot, equipamento_snapshot,
  realizado, series_recomendadas, execucoes_recomendadas, carga_padrao
)

series_registradas (
  id, sessao_exercicio_id, tipo_serie,  -- 'aquecimento' | 'valida'
  ordem, carga_kg, repeticoes, observacao
)

registros_peso (
  id, peso_kg, data_hora, observacao
)
```

---

## Cobertura de Testes

- **111 testes** passando (Vitest)
- **Estratégia:** InMemory repos para testes de unidade; SQLite real para integração
- **Cobertura:** entities, use cases, repositórios, presenters
- **Fórmula de 1RM:** `carga * (1 + repeticoes / 30)` — consistente em todos os presenters
- **Sem cobertura:** hook controllers, screens, fluxos E2E

---

## Erros de Domínio Mapeados

| Erro | Quando |
|---|---|
| `TreinoValidationError` | Nome inválido ao criar/editar treino |
| `ExerciseNotFoundError` | Exercício não encontrado |
| `ExerciseDuplicateError` | Nome já existe no catálogo |
| `SessaoJaAtivaError` | Tentar iniciar sessão com outra ativa |
| `SessaoNotFoundError` | Sessão não encontrada |
| `SessaoEncerradaError` | Tentar modificar sessão já finalizada |
| `SessaoValidationError` | Carga ou reps inválidos na série |
| `ExercicioJaNaSessaoError` | Exercício já presente na sessão ativa |
| `SerieNotFoundError` | Série não encontrada |

---

## Navegação

Tab bar com 4 abas fixas:

1. **Sessão** — tela inicial (escolher treino → sessão ativa → resumo)
2. **Treinos** — lista de treinos + detalhe com exercícios
3. **Exercícios** — catálogo com busca e histórico por exercício
4. **Evolução** — dashboard com stats e recordes
5. **Peso** — registro e histórico de peso corporal (5ª aba)

---

## Como Rodar

```bash
# Instalar dependências
npm install

# Iniciar app (Expo Go no celular ou simulador)
npm run mobile:start

# Testes
npm run mobile:test

# Validar tipos
npm run mobile:typecheck
```
