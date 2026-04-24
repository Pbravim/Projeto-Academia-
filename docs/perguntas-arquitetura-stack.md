# Perguntas para Definir Arquitetura, Stack e Estratégia do Sistema

## Produto e Escopo

1. O objetivo inicial é validar a ideia com um MVP simples ou já construir uma base pronta para escalar? -> MVP simples para uso meu somente
2. O app será usado só por você no início ou por múltiplos usuários desde o começo? -> So eu e talvez minha irma, banco local no celular ja é suficiente
3. O foco inicial é apenas musculação ou você quer abrir espaço para outros tipos de treino? -> apenas musculacao
4. Você quer priorizar velocidade de entrega ou uma arquitetura mais robusta desde o início? -> velocidade de entrega
5. O MVP precisa ter login obrigatório ou pode começar local/offline? -> local

## Plataforma

1. O produto será:
   - somente mobile; 
   - mobile + painel web;
   - mobile + backend administrativo.
      Mobile + web
2. Você quer lançar primeiro em:
   - iOS;
   - Android;
   - ambos.
      ambos
3. Você prefere desenvolvimento cross-platform ou nativo? 
4. Se for cross-platform, você tem preferência entre React Native, Flutter ou outra stack? React Native 
5. Existe necessidade de versão web no curto prazo? Não

## Experiência Offline e Sincronização

1. O app precisa funcionar sem internet durante o treino? Sim
2. Se o usuário ficar offline, os dados devem sincronizar automaticamente depois? Sim
3. Você quer abordagem offline-first desde o MVP ou isso pode entrar depois? pode ser depois
4. Em caso de conflito de sincronização, qual deve ser a regra principal: última alteração vence ou outra política? ultima alteração

## Backend

1. O MVP realmente precisa de backend agora? Não
2. Você prefere backend gerenciado, como Supabase/Firebase, ou backend próprio? firebase a principio
3. Se for backend próprio, qual stack você prefere? express
4. Você quer API REST, GraphQL ou ainda não tem preferência? api rest
5. Você quer separar frontend e backend em projetos independentes? não

## Banco de Dados

1. Você prefere banco relacional ou NoSQL para este produto? sql
2. Há preferência por PostgreSQL, MySQL, SQLite, Firestore ou outro? 
3. Se o app for offline-first, você quer banco local no dispositivo? sim
4. Quais dados precisam de maior integridade histórica: sessões, séries, treinos, métricas?
5. Você quer guardar métricas derivadas prontas ou recalculá-las sob demanda? 

## Autenticação e Usuários

1. O login será por email e senha, Google, Apple ou múltiplos provedores? sem login a principio
2. Você quer suporte a recuperação de senha no MVP? nao 
3. Haverá somente usuários finais ou também perfis de treinador/admin? so usuarios finais
4. Você quer multiusuário desde o começo ou isso pode ficar para depois? depois 

## Modelo de Negócio

1. O app será pessoal, gratuito, assinatura, compra única ou freemium? pessoal
2. Haverá recursos premium no futuro? nao
3. O modelo de monetização afeta a arquitetura agora? nao

## Observabilidade e Analytics

1. Você quer medir uso do produto desde o MVP? nao
2. Quais eventos são importantes:
   - cadastro x
   - treino iniciado sim
   - treino concluído sim
   - exercício criado sim
   - uso da tela de progresso sim
3. Você quer usar alguma ferramenta específica de analytics? x
4. Você precisa de logs centralizados e monitoramento de erros desde o início? sim

## Notificações e Engajamento

1. O MVP precisa de notificações push? nao 
2. Você quer lembretes de treino, reengajamento ou ambos? nao
3. Isso será essencial agora ou pode entrar depois? depois 

## Integrações Futuras

1. Existe intenção real de integrar com Apple Health, Google Fit ou wearables? não
2. Você quer importar treinos ou dados de outras plataformas? não
3. O sistema deve ser desenhado agora já considerando essas integrações? não

## Segurança, Privacidade e Compliance

1. Você pretende armazenar apenas dados de treino ou também dados sensíveis de saúde? dados de treino e peso
2. Você quer política de exclusão de conta e exportação de dados desde o MVP? não
3. Há preocupação com LGPD já nesta fase? não
4. Você quer criptografia local ou em trânsito apenas? 

## Deploy e Operação

1. Você quer uma stack com custo quase zero no início? sim, custo 0
2. Você pretende hospedar backend em plataforma gerenciada ou infraestrutura própria? 
3. Você quer CI/CD desde o começo? não
4. Há preferência por Vercel, Railway, Render, Fly.io, Firebase, Supabase ou outra?

## Desenvolvimento

1. Você vai desenvolver sozinho ou com equipe? sozinho
2. Você quer monorepo ou repositórios separados? mono
3. Existe linguagem de preferência forte, como TypeScript, Dart, Kotlin ou Swift? se possivel typescript
4. Você quer testes automatizados já no MVP? sim
5. Qual nível de documentação você quer manter no projeto? alto

## UX e Produto

1. O uso principal será durante o treino, com pressa e poucas interações? durante treino com pressa e poucas
2. Você quer interface mais minimalista ou mais rica em gráficos? minimalista
3. O registro de série deve ser ultra-rápido, mesmo que a análise seja mais simples no início? sim
4. Você quer foco em execução manual ou sugestões automáticas de progressão? manual

## Perguntas de Decisão Rápida

Se quiser responder rápido, estas são as mais importantes primeiro:

1. O app precisa funcionar offline no treino? sim
2. Você quer lançar em iOS, Android ou ambos?  ambos
3. Você prefere React Native, Flutter ou outra stack? native ou flutter 
4. O MVP terá backend já no início? nao
5. Você quer usar Supabase/Firebase ou backend próprio? 
6. Haverá login de usuário no MVP? nao
7. Você quer só registrar treino e histórico no começo, ou já incluir gráficos e insights? ambos
8. Você quer desenvolver rápido com menor custo ou já preparar para escalar? rapido

## Próximo Passo Sugerido

Depois de responder estas perguntas, a próxima etapa ideal é gerar:

- uma proposta de arquitetura;
- uma sugestão de stack;
- um modelo inicial de dados;
- um roadmap de MVP por fases.

