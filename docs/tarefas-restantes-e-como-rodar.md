# Tarefas Restantes e Como Rodar o Projeto

Estado deste documento em `2026-05-03`.

## Objetivo

Este arquivo existe para qualquer pessoa entender rapidamente:

- o que ja foi entregue;
- o que ainda falta para o MVP;
- como rodar o app mobile;
- como acompanhar a evolucao do projeto sem depender de contexto previo.

## Estado Atual

Hoje o projeto entrega cinco modulos completos (exercicios, treinos, sessoes de treino, historico e peso corporal):

- cadastro, edicao e exclusao de exercicios com prevencao de duplicatas;
- criacao, listagem e exclusao de treinos template;
- adicao, remocao e reordenacao de exercicios dentro de um treino;
- inicio de sessao a partir de um treino (snapshot completo dos exercicios);
- registro de series de aquecimento e series validas (carga, repeticoes, observacao);
- marcacao de exercicio como nao realizado;
- adicao de exercicios extras a uma sessao especifica;
- correcao de series registradas (exclusao);
- finalizacao de sessao com tela de resumo (duracao, volume, melhor serie por 1RM);
- persistencia completa em `SQLite` com 7 tabelas;
- sessao persiste entre fechamentos do app;
- tab bar com quatro abas: Sessao (inicial), Treinos, Exercicios, Peso;
- historico de execucoes por exercicio com melhor 1RM estimado por sessao;
- ultimo peso valido exibido em cada card do catalogo de exercicios;
- registro e historico de peso corporal com delta entre entradas;
- migracoes versionadas com PRAGMA user_version (seguras para atualizacoes futuras);
- loading spinner em todas as listas; LoadingScreen na sessao;
- 104 testes automatizados cobrindo dominio, casos de uso, repositorios, presenters e invariantes de negocio;
- typecheck limpo com TypeScript strict.

Em outras palavras: o usuario ja consegue realizar um treino completo do inicio ao fim, consultar o historico de cada exercicio, acompanhar a evolucao do peso corporal e ter tudo persistido localmente com migracao versionada. O MVP esta funcionalmente completo.

## O Que Falta Desenvolver

### Prioridade 1 - Fechar o modulo de exercicios ✅ CONCLUIDO

- [x] editar exercicio existente;
- [x] excluir exercicio existente;
- [x] melhorar feedback de erro e estado de carregamento na UI;
- [x] adicionar testes de interface para o fluxo de cadastro (buildExerciseCatalogViewModel.test.ts).

### Prioridade 2 - Criar o modulo de treinos ✅ CONCLUIDO

- [x] criar treino template com nome e objetivo;
- [x] listar treinos cadastrados;
- [x] adicionar exercicios pre-cadastrados ao treino;
- [x] remover exercicios do treino;
- [x] reordenar exercicios dentro do treino;
- [x] persistir `Treino` e `TreinoExercicio` no banco;
- [x] criar testes de dominio, caso de uso e repositorio para treinos.

### Prioridade 3 - Criar o fluxo de sessao de treino ✅ CONCLUIDO

- [x] iniciar sessao a partir de um treino;
- [x] congelar snapshot dos exercicios no inicio da sessao;
- [x] registrar series em tempo real;
- [x] separar series de aquecimento e series validas;
- [x] registrar carga em `kg` com decimal;
- [x] registrar repeticoes;
- [x] registrar observacao opcional;
- [x] finalizar sessao com tela de resumo;
- [x] persistir `SessaoTreino`, `SessaoExercicio` e `SerieRegistrada`;
- [x] marcar exercicio como nao realizado;
- [x] adicionar exercicio extra a uma sessao especifica;
- [x] corrigir serie registrada (exclusao);
- [x] criar testes de dominio, caso de uso e repositorio para sessoes.

### Prioridade 4 - Entregar historico e progresso ✅ CONCLUIDO

- [x] exibir ultimo peso valido em cada card de exercicio no catalogo;
- [x] tela de historico por exercicio (todas as execucoes passadas);
- [x] calcular volume por sessao de exercicio (carga x repeticoes, series validas);
- [x] destacar melhor serie valida por `1RM estimado` no historico;
- [x] criar `HistoricoRepository` com queries de JOIN entre sessoes, exercicios e series;
- [x] criar testes de dominio para os casos de uso de historico.

### Prioridade 5 - Registro de peso corporal ✅ CONCLUIDO

- [x] criar cadastro de peso corporal;
- [x] listar historico de peso corporal;
- [x] persistir `RegistroPeso` no banco;
- [x] criar testes para o fluxo de peso corporal.

### Prioridade 6 - Estrutura de app e navegacao

- [x] adicionar navegacao entre catalogo de exercicios, treinos, sessao e historico (historico acessivel a partir do catalogo; abas cobrem o resto);
- [x] definir tela inicial do app (aba Sessao);
- [x] organizar fluxo principal para uso rapido durante o treino (sessao ativa persiste entre abas);
- [x] revisar estados vazios, mensagens e carregamento (loading spinner em todas as listas; LoadingScreen na sessao);
- [x] criar testes minimos de UI para as telas criticas (testes dos presenters: buildPesoViewModel, buildHistoricoExercicioViewModel, buildExerciseCatalogViewModel).

### Prioridade 7 - Robustez tecnica

- [x] criar migracoes versionadas para todas as tabelas do MVP (PRAGMA user_version, array de steps, nunca editar step passado);
- [x] revisar estrategia de tratamento de erros por caso de uso (erros tipados propagados ate a UI; fallback generico em todos os controllers);
- [x] revisar logs estruturados por modulo (padrao `modulo.evento` com contexto em todos os catch);
- [x] garantir isolamento de repositorios para facilitar sincronizacao futura (cada modulo tem seu proprio repositorio sem dependencia cruzada);
- [x] documentar contratos de cada caso de uso (JSDoc em todos os 20 use cases: descricao, @throws, @returns);
- [x] manter o fluxo TDD por camada em cada modulo novo.

## Ordem Recomendada de Implementacao

Se a ideia for seguir com menor risco e maior retorno, a sequencia recomendada e:

1. ~~fechar exercicios com editar e excluir~~ ✅;
2. ~~criar treinos template~~ ✅;
3. ~~criar sessoes de treino~~ ✅;
4. ~~registrar series~~ ✅;
5. ~~entregar historico e progresso~~ ✅;
6. ~~adicionar peso corporal~~ ✅;
7. ~~refinar navegacao e UX~~ ✅.

## Como Rodar o Projeto

### Requisitos

- `Node.js` instalado;
- `npm` instalado;
- `Expo Go` no celular ou simulador de iOS/Android.

### Instalar dependencias

Na raiz do repositorio:

```bash
npm install
```

Se preferir instalar apenas o app mobile:

```bash
cd apps/mobile
npm install
```

### Iniciar o app mobile

Na raiz do repositorio:

```bash
npm run mobile:start
```

Isso sobe o `Expo` para o app em `apps/mobile`.

Depois disso:

- escaneie o QR code com o `Expo Go`; ou
- pressione `a` para abrir no Android; ou
- pressione `i` para abrir no iOS, se houver simulador disponivel.

## Como Ver a Evolucao do Projeto

### Rodar testes

Na raiz do repositorio:

```bash
npm run mobile:test
```

### Validar tipos

Na raiz do repositorio:

```bash
npm run mobile:typecheck
```

### Onde olhar no codigo

Os pontos principais hoje sao:

- `apps/mobile/src/app/MobileApp.tsx` — tab bar com Sessao, Treinos, Exercicios, Peso
- `apps/mobile/src/bootstrap/mobileDependencies.ts` — injecao de dependencias de todos os modulos
- `apps/mobile/src/ui/shared/LoadingScreen.tsx` — spinner de carregamento compartilhado
- `apps/mobile/src/ui/exercises` — catalogo com criar, editar, excluir e navegacao para historico
- `apps/mobile/src/application/exercises` — Create, Update, Delete, List
- `apps/mobile/src/domain/exercises` — entidade Exercise com validacao e normalizacao
- `apps/mobile/src/infrastructure/exercises` — SQLiteExerciseRepository
- `apps/mobile/src/ui/treinos` — lista e detalhe de treinos
- `apps/mobile/src/application/treinos` — Create, Delete, List, Add/Remove/Reorder exercicios
- `apps/mobile/src/domain/treinos` — entidades Treino e TreinoExercicio
- `apps/mobile/src/infrastructure/treinos` — SQLiteTreinoRepository, SQLiteTreinoExercicioRepository
- `apps/mobile/src/ui/sessao` — telas Inicio, Ativa e Resumo da sessao de treino
- `apps/mobile/src/application/sessoes` — Iniciar, Finalizar, RegistrarSerie, Delete, Toggle, AddExercicio, GetDetalhe
- `apps/mobile/src/domain/sessoes` — entidades SessaoTreino, SessaoExercicio, SerieRegistrada
- `apps/mobile/src/infrastructure/sessoes` — SQLite e InMemory para os tres repositorios de sessao
- `apps/mobile/src/ui/historico` — tela de historico por exercicio com 1RM estimado
- `apps/mobile/src/application/historico` — GetUltimaExecucaoValida, GetHistoricoExercicio
- `apps/mobile/src/domain/historico` — interface HistoricoRepository e tipos de leitura
- `apps/mobile/src/infrastructure/historico` — SQLiteHistoricoRepository (queries JOIN triplo)
- `apps/mobile/src/ui/peso` — tela de registro e historico de peso corporal
- `apps/mobile/src/application/peso` — Registrar, List, Delete
- `apps/mobile/src/domain/peso` — entidade RegistroPeso com validacao
- `apps/mobile/src/infrastructure/peso` — SQLiteRegistroPesoRepository
- `apps/mobile/src/infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient.ts` — migracao versionada (PRAGMA user_version)

### Sinal de progresso real

Considere que houve evolucao relevante quando:

- uma nova entidade de negocio entrar no dominio;
- existir caso de uso testado para essa entidade;
- existir repositorio persistindo em `SQLite`;
- existir tela ou fluxo acessivel no app;
- os comandos de teste e typecheck continuarem passando.

## O Que Ainda Nao E Objetivo do MVP

Os itens abaixo continuam fora do escopo inicial:

- login;
- backend;
- sincronizacao entre dispositivos;
- versao web;
- graficos avancados;
- notificacoes;
- integracoes com plataformas externas;
- recursos sociais.

## Proximos Passos Sugeridos (pos-MVP)

O MVP esta completo. As extensoes com maior retorno para uma proxima iteracao sao:

1. **Graficos de progresso** — curva de carga por exercicio ao longo do tempo e evolucao do peso corporal em grafico de linha.
2. **Edicao de treino ativo** — reordenar ou remover exercicios de uma sessao em andamento, nao apenas adicionar.
3. **Exportacao de dados** — gerar um resumo em texto ou CSV do historico para compartilhar.
4. **Notificacoes de descanso** — cronometro entre series com alarme configuravel.
5. **Sincronizacao remota** — backend + autenticacao para backup na nuvem (fora do escopo do MVP offline).

## Notas de Arquitetura

### Convencoes do projeto

- **Camadas**: `domain` → `application` → `infrastructure` → `ui`. Dependencias sempre apontam para dentro.
- **Persistencia**: cada modulo tem seu proprio repositorio SQLite. Queries cross-modulo usam JOIN no repositorio de leitura (`HistoricoRepository`), nao nos repositorios de escrita.
- **Testes**: InMemory para testes de unidade, SQLite real para testes de integracao (quando necessarios). Nunca mockar o banco em testes de repositorio.
- **Migracao**: array `migrations[]` em `ExpoSQLiteDatabaseClient`. Nunca editar um step ja publicado — apenas adicionar ao final. A versao e gravada com `PRAGMA user_version`.
- **1RM estimado**: formula `cargaKg * (1 + repeticoes / 30)` usada consistentemente nos presenters de resumo e historico.
