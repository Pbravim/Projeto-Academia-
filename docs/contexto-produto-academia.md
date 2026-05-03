# Contexto do Sistema - App de Progressão de Carga na Academia

## Visão Geral

Este projeto tem como objetivo criar um aplicativo para acompanhar a progressão de carga em treinos de musculação, com foco em registro rápido durante o treino e consulta confiável do histórico depois.

O sistema deve ajudar o usuário a:

- lembrar a última carga utilizada;
- registrar séries com baixo atrito;
- acompanhar evolução por exercício;
- preservar histórico real de execução;
- analisar volume e desempenho ao longo do tempo.

## Objetivo do Produto

Construir um MVP simples, local e confiável para uso pessoal, com foco em velocidade de entrega e base técnica organizada para evolução futura.

## Direcionamento Confirmado

Com base nas respostas registradas até `2026-04-24`, este projeto seguirá inicialmente estas decisões:

- MVP simples;
- uso pessoal no início;
- foco exclusivo em musculação;
- mobile-first;
- versão web fora do MVP;
- stack principal em `React Native`;
- bootstrap recomendado com `Expo`;
- preferência por `TypeScript`;
- sem login no MVP;
- funcionamento offline durante o treino;
- persistência local no dispositivo;
- banco local em `SQLite`;
- acesso ao banco local via `expo-sqlite`;
- futura sincronização apenas como backup da base local;
- documentação alta;
- desenvolvimento orientado a `TDD`.

## Problema que o Sistema Resolve

Muitas pessoas treinam sem controle estruturado da própria evolução. Isso gera problemas como:

- dificuldade para lembrar a última carga;
- ausência de histórico confiável por exercício;
- progressão inconsistente;
- pouca clareza sobre evolução real em semanas e meses;
- perda de dados quando o registro fica em notas soltas ou papel.

## Escopo do MVP

### Funcionalidades principais

- cadastro de exercícios;
- exercícios podem existir fora de um treino;
- criação de treinos a partir de exercícios pré-cadastrados;
- organização e ordenação de exercícios dentro do treino;
- criação de sessão de treino;
- registro de séries de aquecimento separadas das séries válidas;
- registro de carga em `kg`, com valor decimal;
- registro de repetições e observações;
- consulta da última execução de cada exercício;
- histórico por exercício;
- visualização simples de progresso com listas e histórico;
- cálculo de volume por `carga x repetições`;
- edição e exclusão de registros;
- registro de peso corporal no MVP.

### Fora do MVP inicial

- login e autenticação;
- backend;
- sincronização entre dispositivos;
- gráficos avançados;
- RIR, RPE e falha;
- notificações;
- integrações com HealthKit, Google Fit ou wearables;
- recursos sociais;
- versão web.

## Proposta de Valor

O aplicativo deve ser rápido para usar durante o treino e claro para analisar fora dele.

Isso significa:

- poucos toques para registrar uma série;
- consulta rápida da última carga;
- histórico limpo e compreensível;
- foco em utilidade real, não em excesso de features.

## Público-Alvo Inicial

### Persona principal

Pessoa que treina musculação com frequência e quer acompanhar a própria evolução sem depender de planilhas ou anotações soltas.

## Modelo de Produto Inicial

- app local no dispositivo;
- sem conta de usuário no MVP;
- sem multiusuário no início;
- sem monetização no recorte atual;
- sem analytics de produto como prioridade inicial.

## Requisitos Funcionais

### Perfil local

- o usuário deve conseguir usar o app sem criar conta;
- os dados devem ficar vinculados ao dispositivo no MVP;
- o sistema pode ter configurações locais simples.

### Exercícios

- o usuário deve conseguir cadastrar exercícios personalizados;
- um exercício pode existir sem estar vinculado a um treino;
- cada exercício deve ter nome e metadados básicos suficientes para organização;
- no MVP, a carga será tratada apenas em `kg`.

### Treinos

- um treino é um template composto por exercícios pré-cadastrados;
- o usuário deve conseguir montar treinos como A, B, C ou por objetivo;
- o usuário deve conseguir adicionar, remover e reordenar exercícios.

### Sessões de treino

- o usuário deve conseguir iniciar uma sessão a partir de um treino;
- a sessão deve preservar o histórico de execução mesmo se o treino for alterado depois;
- o usuário deve conseguir registrar séries em tempo real;
- as séries devem diferenciar aquecimento e série válida;
- o usuário deve conseguir finalizar a sessão.

### Evolução

- o sistema deve mostrar a última carga válida usada em cada exercício;
- o sistema deve mostrar histórico por exercício;
- o sistema deve mostrar evolução em formato simples, sem gráficos no MVP;
- o sistema deve calcular volume por exercício e por sessão.

### Peso corporal

- o usuário deve conseguir registrar peso corporal;
- o histórico de peso corporal deve ficar disponível para consulta posterior.

## Requisitos Não Funcionais

- interface rápida durante o treino;
- baixo atrito para registrar séries;
- boa experiência mobile;
- persistência confiável no dispositivo;
- estrutura preparada para futura sincronização;
- privacidade dos dados locais;
- arquitetura que favoreça testes e refatoração.

## Entidades de Negócio

### PerfilLocal

- id
- nome, opcional
- configuracoes
- identificador local, se necessário

### Exercicio

- id
- nome
- grupo_muscular
- categoria
- equipamento
- criado_localmente

### Treino

- id
- perfil_local_id
- nome
- objetivo

### TreinoExercicio

- id
- treino_id
- exercicio_id
- ordem

### SessaoTreino

- id
- perfil_local_id
- treino_id
- data_hora_inicio
- data_hora_fim
- status

### SessaoExercicio

- id
- sessao_treino_id
- exercicio_id
- ordem
- nome_snapshot
- grupo_muscular_snapshot
- categoria_snapshot
- equipamento_snapshot

### SerieRegistrada

- id
- sessao_exercicio_id
- tipo_serie
- ordem
- carga_kg
- repeticoes
- observacao

### RegistroPeso

- id
- perfil_local_id
- peso_kg
- data_hora
- observacao, opcional

## Regras de Negócio Iniciais

- um treino é uma junção de exercícios pré-cadastrados;
- uma sessão pertence a um único perfil local;
- uma sessão deve preservar o histórico mesmo que o treino seja alterado no futuro;
- sessões antigas não devem perder a estrutura da execução original;
- o snapshot da sessão deve congelar ordem, associação, nome e metadados relevantes do exercício;
- exercícios podem existir sem pertencer a um treino;
- a carga será registrada somente em `kg`;
- a carga aceita valores decimais;
- aquecimento deve ser registrado separado de séries válidas;
- RIR, RPE e falha ficam para depois;
- o volume será calculado como `carga x repetições`;
- o desempenho será destacado pela melhor série válida do exercício;
- a métrica inicial de desempenho será `1RM estimado`, calculado por `carga_kg * (1 + repeticoes / 30)`;
- séries de aquecimento não entram no cálculo de desempenho;
- a última carga de referência deve considerar a execução válida mais recente;
- se uma série for apagada no MVP, ela deve sumir totalmente;
- métricas derivadas devem ser recalculadas a partir dos registros salvos.

## Fluxos Principais

### Fluxo 1: montar treino

1. Usuário cadastra exercícios.
2. Usuário cria um treino.
3. Usuário adiciona exercícios ao treino.
4. Usuário define a ordem dos exercícios.
5. Usuário salva o treino.

### Fluxo 2: registrar treino

1. Usuário seleciona um treino existente.
2. Usuário inicia a sessão.
3. Usuário consulta a última carga do exercício.
4. Usuário registra aquecimentos e séries válidas.
5. Usuário finaliza a sessão.
6. O sistema salva o histórico.

### Fluxo 3: consultar progresso

1. Usuário abre o histórico.
2. Seleciona um exercício.
3. Visualiza últimas execuções e volume.
4. Consulta evolução em formato de lista.

### Fluxo 4: registrar peso corporal

1. Usuário informa o peso.
2. O sistema salva o registro.
3. O histórico pode ser consultado depois.

## Indicadores Úteis para o Produto

- frequência semanal de treinos;
- evolução de carga por exercício;
- volume total por sessão;
- desempenho por exercício;
- aderência ao plano semanal;
- histórico de peso corporal.

## Estratégia Técnica Inicial

- `React Native` como stack principal;
- `Expo` como camada de bootstrap para acelerar setup e entrega;
- `TypeScript` como linguagem principal;
- `SQLite` como fonte de verdade local;
- `expo-sqlite` como biblioteca inicial de acesso ao banco local;
- camada de repositório desde o início;
- arquitetura em camadas para isolar domínio, aplicação, infraestrutura e UI;
- futura sincronização pensada como backup, não como colaboração em tempo real;
- monitoramento inicial de erros com logger local estruturado e tratamento global de exceções;
- observabilidade externa, como `Sentry`, fica para etapa posterior se necessário.

## Estratégia de Desenvolvimento

O desenvolvimento deve seguir TDD como diretriz principal.

Isso implica:

- domínio como centro da aplicação;
- regras importantes fora da UI;
- testes escritos antes da implementação da regra ou caso de uso;
- refatoração contínua após cada ciclo pequeno;
- uso de componentes de UI mais finos, com menos lógica embutida.

## Estratégia de Testes

### Ferramentas preferidas

- `Vitest` para testes unitários e de caso de uso;
- `React Native Testing Library` para testes de UI;
- `Detox` pode entrar depois;
- fakes e adapters `in-memory` no início;
- lint e format básicos como gate local.

### Critérios de pronto

Uma funcionalidade nova deve ser considerada pronta com:

- testes de domínio;
- testes de integração do repositório;
- teste mínimo de UI quando aplicável.

### Prioridades de teste no MVP

- criação e edição de exercícios;
- montagem de treinos;
- abertura e finalização de sessão;
- registro de aquecimento e séries válidas;
- recuperação da última carga válida;
- cálculo de volume;
- preservação de histórico após edição de treinos;
- persistência local;
- registro de peso corporal.

## Backlog Inicial Recomendado

- cadastro de exercícios;
- montagem de treinos;
- registro de sessão;
- histórico por exercício;
- progresso em lista;
- registro de peso corporal.

## Riscos e Pontos de Atenção

- complexidade excessiva no MVP;
- lógica de domínio vazando para a UI;
- modelagem insuficiente para preservar histórico;
- persistência local mal abstraída, dificultando sync futuro;
- tentar introduzir gráficos cedo demais.

## Dúvidas Remanescentes

No momento, não há dúvidas bloqueantes para avançar para a proposta de arquitetura.

As decisões atuais ainda podem ser refinadas depois, mas já estão fechadas o suficiente para seguir:

- desempenho baseado em `1RM estimado`;
- snapshot completo dos dados relevantes do exercício na sessão;
- `expo-sqlite` como biblioteca inicial de persistência;
- logger local + handler global como solução inicial de monitoramento de erros.

## Status de Implementacao Atual

Estado do projeto em `2026-05-03`. MVP completo.

### Modulo de Exercicios (completo)

- cadastro de exercicios com validacao de dominio e prevencao de duplicatas por nome normalizado;
- edicao de exercicio existente com verificacao de conflito de nome;
- exclusao de exercicio;
- listagem de exercicios ordenada por nome;
- ultimo peso valido exibido em cada card (via `GetUltimaExecucaoValidaUseCase`);
- navegacao para historico individual do exercicio;
- repositorio `SQLite` com `save`, `list`, `findById`, `findByNormalizedName`, `delete`;
- casos de uso: `CreateExerciseUseCase`, `UpdateExerciseUseCase`, `DeleteExerciseUseCase`, `ListExercisesUseCase`;
- testes de dominio, caso de uso, repositorio e presenter.

### Modulo de Treinos (completo)

- criacao de treinos template com nome e objetivo opcional;
- listagem e exclusao de treinos (exclusao em cascata com exercicios do treino);
- adicao, remocao e reordenacao de exercicios no treino;
- prevencao de exercicio duplicado no mesmo treino;
- tabelas `treinos` e `treino_exercicios` no banco com `UNIQUE(treino_id, exercicio_id)` e FK;
- casos de uso: `CreateTreinoUseCase`, `ListTreinosUseCase`, `DeleteTreinoUseCase`, `AddExercicioAoTreinoUseCase`, `RemoveExercicioDoTreinoUseCase`, `ReordenarExerciciosUseCase`, `ListTreinoExerciciosUseCase`;
- testes de dominio, caso de uso e repositorio.

### Modulo de Sessoes de Treino (completo)

- inicio de sessao com snapshot completo dos exercicios e metadados (imutavel para edicoes futuras);
- apenas uma sessao ativa por vez;
- sessao persiste entre fechamentos do app;
- registro de series com tipo (aquecimento / valida), carga decimal, repeticoes e observacao opcional;
- exclusao de serie, toggle de realizado, adicao de exercicio extra;
- finalizacao com tela de resumo: duracao, volume total, melhor serie por `1RM` por exercicio;
- tabelas `sessao_treinos`, `sessao_exercicios`, `series_registradas`;
- casos de uso: `IniciarSessaoUseCase`, `GetSessaoAtivaUseCase`, `GetSessaoDetalheUseCase`, `FinalizarSessaoUseCase`, `RegistrarSerieUseCase`, `DeleteSerieUseCase`, `ToggleExercicioRealizadoUseCase`, `AddExercicioASessaoUseCase`;
- testes incluem verificacao de preservacao de snapshot apos edicao de exercicio.

### Modulo de Historico (completo)

- `HistoricoRepository` com queries JOIN triplo entre as tres tabelas de sessao;
- `GetUltimaExecucaoValidaUseCase` — melhor serie valida por 1RM da sessao mais recente;
- `GetHistoricoExercicioUseCase` — lista de todas as execucoes passadas, desc por data;
- tela de historico por exercicio: data, volume total da sessao, melhor 1RM, series com descricao;
- testes de caso de uso e presenter.

### Modulo de Peso Corporal (completo)

- registro de peso com observacao opcional e validacao de dominio;
- listagem em ordem decrescente com delta entre entradas;
- tabela `registros_peso` no banco;
- casos de uso: `RegistrarPesoUseCase`, `ListRegistrosPesoUseCase`, `DeleteRegistroPesoUseCase`;
- testes de dominio, caso de uso e presenter.

### Infraestrutura Geral

- tab bar com quatro abas: `Sessao` (inicial), `Treinos`, `Exercicios`, `Peso`;
- migracao versionada com `PRAGMA user_version` (array de steps, nunca editar step passado);
- `LoadingScreen` compartilhado; loading spinner em todas as listas;
- JSDoc com contrato (`@throws`, `@returns`) em todos os 20 casos de uso;
- 104 testes automatizados passando;
- `tsc --noEmit` sem erros em modo strict.

## Como Usar Este Arquivo

Este arquivo deve servir como contexto-base para decisões futuras de:

- arquitetura;
- modelagem de domínio;
- backlog;
- estrutura de pastas;
- estratégia de testes;
- roadmap do MVP;
- priorização de implementação.
