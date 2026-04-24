# Respostas Complementares - Arquitetura, Domínio e TDD

## Respostas Consolidadas

### Arquitetura

- web fora da primeira entrega;
- stack principal em `React Native`;
- bootstrap recomendado com `Expo`;
- banco local em `SQLite`;
- acesso ao banco por `expo-sqlite`;
- camada de repositório desde o começo;
- sincronização futura pensada como backup da base local;
- peso corporal entra no MVP;
- no MVP, progresso será mostrado por listas e histórico, sem gráficos.

### Domínio

- treinos são compostos por exercícios pré-cadastrados;
- sessões antigas devem preservar a estrutura existente no momento da execução;
- exercícios podem existir fora de um treino;
- carga registrada apenas em `kg`;
- carga com valor decimal;
- aquecimento separado de séries válidas;
- RIR, RPE e falha ficam para depois;
- ao apagar uma série no MVP, ela deve sumir totalmente;
- volume calculado como `carga x repetições`;
- desempenho será destacado pela melhor série válida usando `1RM estimado`;
- snapshot da sessão congela também nome e metadados relevantes do exercício.

### TDD

- domínio como centro da aplicação;
- sem meta fixa de cobertura;
- arquitetura orientada a testabilidade;
- `Vitest` para testes unitários;
- `React Native Testing Library` para UI;
- `Detox` pode esperar;
- adapters `in-memory` no início;
- cada funcionalidade nova deve fechar com testes de domínio, integração do repositório e UI mínima quando aplicável.

### Processo

- backlog orientado por módulos técnicos;
- documentação dos casos de uso com objetivo, regra de negócio e cenários de teste;
- fluxo inicial recomendado:
  1. cadastrar exercício;
  2. montar treino;
  3. registrar sessão;
  4. consultar progresso;
- roadmap posterior deve ser quebrado em ciclos de TDD.

## Assunções Adotadas a Partir das Respostas

Como algumas respostas vieram parcialmente abertas, o contexto do projeto passa a assumir:

- sessão tratada como snapshot histórico da execução;
- fluxo padrão de TDD em camadas:
  1. domínio;
  2. caso de uso;
  3. integração de repositório;
  4. UI;
- preferência por fakes e adapters simples no lugar de mocks pesados.

## Dúvidas Remanescentes

Não há dúvidas bloqueantes neste momento.

Definições assumidas para seguir:

1. `desempenho` será baseado em `1RM estimado`, com foco na melhor série válida.
2. o snapshot da sessão congela ordem, associação, nome e metadados relevantes.
3. a biblioteca inicial de acesso ao banco será `expo-sqlite`.
4. o monitoramento inicial será feito com logger local estruturado e tratamento global de exceções.

## Próximo Passo Sugerido

Com o contexto consolidado, a próxima etapa ideal é gerar:

- arquitetura proposta orientada a TDD;
- estrutura de pastas;
- modelo de domínio;
- estratégia de testes por camada;
- roadmap do MVP em ordem de implementação.
