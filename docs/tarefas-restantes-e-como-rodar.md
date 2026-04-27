# Tarefas Restantes e Como Rodar o Projeto

Estado deste documento em `2026-04-27`.

## Objetivo

Este arquivo existe para qualquer pessoa entender rapidamente:

- o que ja foi entregue;
- o que ainda falta para o MVP;
- como rodar o app mobile;
- como acompanhar a evolucao do projeto sem depender de contexto previo.

## Estado Atual

Hoje o projeto entrega uma base inicial do app mobile com:

- cadastro de exercicios;
- listagem de exercicios;
- persistencia local em `SQLite`;
- validacoes de dominio para exercicios;
- prevencao de exercicios duplicados por nome normalizado;
- testes unitarios e de repositorio para o modulo de exercicios.

Em outras palavras: a fundacao tecnica existe, mas o produto ainda nao cobre o fluxo principal de treino do MVP.

## O Que Falta Desenvolver

### Prioridade 1 - Fechar o modulo de exercicios

- [ ] editar exercicio existente;
- [ ] excluir exercicio existente;
- [ ] melhorar feedback de erro e estado de carregamento na UI;
- [ ] adicionar testes de interface para o fluxo de cadastro.

### Prioridade 2 - Criar o modulo de treinos

- [ ] criar treino template com nome e objetivo;
- [ ] listar treinos cadastrados;
- [ ] adicionar exercicios pre-cadastrados ao treino;
- [ ] remover exercicios do treino;
- [ ] reordenar exercicios dentro do treino;
- [ ] persistir `Treino` e `TreinoExercicio` no banco;
- [ ] criar testes de dominio, caso de uso e repositorio para treinos.

### Prioridade 3 - Criar o fluxo de sessao de treino

- [ ] iniciar sessao a partir de um treino;
- [ ] congelar snapshot dos exercicios no inicio da sessao;
- [ ] registrar series em tempo real;
- [ ] separar series de aquecimento e series validas;
- [ ] registrar carga em `kg` com decimal;
- [ ] registrar repeticoes;
- [ ] registrar observacao opcional;
- [ ] finalizar sessao;
- [ ] persistir `SessaoTreino`, `SessaoExercicio` e `SerieRegistrada`;
- [ ] criar testes de dominio, caso de uso e repositorio para sessoes.

### Prioridade 4 - Entregar historico e progresso

- [ ] mostrar ultima execucao valida por exercicio;
- [ ] mostrar historico por exercicio;
- [ ] calcular volume por exercicio;
- [ ] calcular volume por sessao;
- [ ] destacar melhor serie valida por `1RM estimado`;
- [ ] criar telas simples de consulta sem depender de graficos avancados.

### Prioridade 5 - Registro de peso corporal

- [ ] criar cadastro de peso corporal;
- [ ] listar historico de peso corporal;
- [ ] persistir `RegistroPeso` no banco;
- [ ] criar testes para o fluxo de peso corporal.

### Prioridade 6 - Estrutura de app e navegacao

- [ ] adicionar navegacao entre catalogo de exercicios, treinos, sessao e historico;
- [ ] definir tela inicial do app;
- [ ] organizar fluxo principal para uso rapido durante o treino;
- [ ] revisar estados vazios, mensagens e carregamento;
- [ ] criar testes minimos de UI para as telas criticas.

### Prioridade 7 - Robustez tecnica

- [ ] criar migracoes para todas as tabelas do MVP;
- [ ] revisar estrategia de tratamento de erros por caso de uso;
- [ ] revisar logs estruturados por modulo;
- [ ] garantir isolamento de repositorios para facilitar sincronizacao futura;
- [ ] documentar contratos de cada caso de uso;
- [ ] manter o fluxo TDD por camada em cada modulo novo.

## Ordem Recomendada de Implementacao

Se a ideia for seguir com menor risco e maior retorno, a sequencia recomendada e:

1. fechar exercicios com editar e excluir;
2. criar treinos template;
3. criar sessoes de treino;
4. registrar series;
5. entregar historico e progresso;
6. adicionar peso corporal;
7. refinar navegacao e UX.

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

- `apps/mobile/src/app/MobileApp.tsx`
- `apps/mobile/src/bootstrap/mobileDependencies.ts`
- `apps/mobile/src/ui/exercises`
- `apps/mobile/src/application/exercises`
- `apps/mobile/src/domain/exercises`
- `apps/mobile/src/infrastructure/exercises`

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

## Proximo Marco Sugerido

O melhor proximo marco e entregar o fluxo:

1. editar e excluir exercicio;
2. criar treino;
3. adicionar exercicios ao treino;
4. iniciar uma sessao de treino.

Quando esse marco estiver pronto, o app deixa de ser apenas cadastro e passa a validar o fluxo central do produto.
