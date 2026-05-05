# Estado do Projeto e Como Rodar

Estado deste documento em `2026-05-05`.

## Resumo

O MVP foi entregue completo. O projeto agora esta em fase de iteracao pos-MVP, com melhorias de UX e novas funcionalidades baseadas em uso real.

## O Que Foi Entregue (MVP Completo)

Todos os modulos abaixo estao funcionais, testados e persistidos em SQLite:

- **Exercicios**: cadastro, edicao, exclusao, prevencao de duplicatas, historico individual, ultimo peso valido no card
- **Treinos**: criacao, listagem, exclusao, adicao/remocao/reordenacao de exercicios, recomendacao de series × reps × carga
- **Sessoes**: inicio com snapshot, registro de series (aquecimento e validas), finalizacao com resumo de volume e 1RM
- **Historico**: por exercicio com melhor 1RM estimado por sessao
- **Peso corporal**: registro, historico e delta entre entradas
- **Migracao versionada**: PRAGMA user_version (v1 a v4), segura para atualizacoes

## Iteracao Pos-MVP — Entregue em 2026-05-05

Baseado em feedback de uso real, os seguintes itens foram implementados:

### UX da Sessao

- **Series recomendadas pre-abertas**: ao iniciar uma sessao, exercicios que tem recomendacoes no treino (series × reps × carga) exibem badge "Meta: 3 × 10 @ 80kg" e pre-preenchem os campos de carga e reps automaticamente.
- **Nome da tela de inicio renomeado**: "Iniciar sessao" virou "Comecar treino" (mais direto ao ponto).

### UX de Treinos

- **Campo de carga padrao**: cada exercicio no treino agora tem um campo "Carga kg" alem de series e reps. O valor e carregado automaticamente ao iniciar a sessao.
- **Edicao de nome do treino**: botao de edicao (✎) no card do nome permite renomear o treino diretamente na tela de detalhe.
- **Multiselect de exercicios**: toque longo (ou toque quando outro ja esta selecionado) ativa modo de selecao multipla. Botao "Adicionar selecionados (N)" confirma. Toque simples quando nenhum esta selecionado ainda adiciona diretamente (sem mudanca de comportamento para quem prefere o fluxo antigo).
- **Busca de exercicios**: campo de texto filtra exercicios por nome ou grupo muscular dentro da secao "Adicionar exercicios".
- **Scroll sem pulo**: ao selecionar um exercicio para o treino, o estado e atualizado de forma otimista (sem reload completo), evitando que a tela volte ao topo.

### Dashboard de Evolucao

- **Nova aba "Evolucao"**: exibe total de sessoes realizadas, sessoes no ultimo mes, recordes pessoais (top 10 por 1RM estimado) e historico das ultimas 10 sessoes finalizadas.

## Como Rodar o Projeto

### Requisitos

- `Node.js` instalado
- `npm` instalado
- `Expo Go` no celular ou simulador iOS/Android

### Instalar dependencias

```bash
npm install
```

### Iniciar o app mobile

```bash
npm run mobile:start
```

Depois escaneie o QR code com o `Expo Go`, pressione `a` para Android, ou `i` para iOS.

### Rodar testes

```bash
npm run mobile:test
```

### Validar tipos

```bash
npm run mobile:typecheck
```

## Arquitetura e Convencoes

- **Camadas**: `domain` → `application` → `infrastructure` → `ui`. Dependencias sempre apontam para dentro.
- **Persistencia**: cada modulo tem seu proprio repositorio SQLite. Queries cross-modulo usam JOIN no repositorio de leitura.
- **Migracao**: array `migrations[]` em `ExpoSQLiteDatabaseClient`. Nunca editar step passado. Versao gravada com `PRAGMA user_version` (atual: v4).
- **1RM estimado**: `cargaKg * (1 + repeticoes / 30)` — formula consistente em todos os presenters.
- **Testes**: InMemory para testes de unidade, SQLite real para testes de integracao. Total: 111 testes.

## Proximos Passos Sugeridos

1. **Graficos de progresso**: curva de 1RM ao longo do tempo por exercicio; curva de peso corporal em linha.
2. **Notificacoes de descanso**: cronometro entre series com vibration/alarme.
3. **Exportacao de dados**: resumo em CSV ou texto compartilhavel.
4. **Edicao de objetivo do treino**: complemento ao rename do treino.
5. **Sincronizacao remota**: backend + autenticacao para backup na nuvem.

## O Que Nao e Objetivo do MVP (nem do pos-MVP imediato)

- Login e autenticacao
- Backend e sincronizacao entre dispositivos
- Versao web
- Integracoes com HealthKit / Google Fit
- Recursos sociais
