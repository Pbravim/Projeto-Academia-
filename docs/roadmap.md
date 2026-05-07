# Roadmap — Features Futuras e Necessidades de Atualização

> Atualizado em `2026-05-07`. MVP entregue, dívida técnica zerada. Prioridades baseadas em uso real.

---

## Prioridade Alta — Próximas iterações

Melhorias que resolvem problemas concretos de uso diário.

### 1. Gráfico de 1RM por exercício

**Onde:** tela de histórico do exercício  
**O que:** linha temporal mostrando a evolução do melhor 1RM estimado por execução  
**Por que:** o histórico em lista já existe mas é difícil enxergar tendência de progressão  
**Dado:** já disponível em `GetHistoricoExercicio` — só falta visualização

### 2. Gráfico de peso corporal

**Onde:** tela de peso  
**O que:** linha simples com os últimos N registros de peso  
**Por que:** delta entre entradas existe mas não dá visão de tendência  
**Sugestão de lib:** `react-native-svg` + lógica manual, ou `victory-native`

### 3. Cronômetro de descanso entre séries

**Onde:** tela de sessão ativa  
**O que:** timer que inicia automaticamente após registrar uma série; alerta por vibração ao terminar  
**Por que:** controle de descanso é parte crítica do treino  
**Depende de:** `expo-haptics` para vibração, `expo-notifications` se quiser alarme mesmo com app em background

### 4. Seleção de data no registro de peso

**Onde:** tela de peso  
**O que:** date picker nativo para registrar peso em data retroativa  
**Por que:** o campo atual é só texto; usuário pode esquecer de registrar no dia e precisar corrigir depois  
**Depende de:** `@react-native-community/datetimepicker` ou equivalente Expo

### 5. Edição de série registrada

**Onde:** tela de sessão ativa, dentro do card de exercício  
**O que:** ao tocar em uma série, abrir modal/inline para editar carga, reps e observação  
**Por que:** hoje só é possível deletar e redigitar; erros de digitação são comuns durante o treino

---

## Prioridade Média — Próximo trimestre

Features que aumentam valor mas não bloqueiam uso diário.

### 6. Exportar histórico

**O que:** gerar arquivo CSV ou texto compartilhável com o histórico de sessões  
**Por que:** backup manual, envio para personal trainer, ou análise em planilha  
**Formato sugerido:** CSV com `data, treino, exercicio, serie, tipo, carga, reps`  
**Depende de:** `expo-sharing` + `expo-file-system`

### 7. Objetivo do treino editável

**Onde:** detalhe do treino  
**O que:** campo de objetivo (texto livre) editável assim como o nome já é  
**Por que:** o objetivo já existe no modelo mas não tem edição inline implementada

### 8. RIR / RPE por série

**O que:** campo opcional de esforço percebido (RIR 0–4 ou RPE 1–10) por série  
**Por que:** métrica relevante para periodização; decidida como fora do MVP, mas sem dependência técnica difícil  
**Impacto no schema:** nova coluna `rir` ou `rpe` em `series_registradas`

### 9. Aderência semanal

**Onde:** dashboard  
**O que:** quantas sessões foram feitas por semana nas últimas N semanas (heatmap simples ou barra por semana)  
**Por que:** frequência de treino é um indicador central de aderência ao plano

### 10. Ordenação e filtro no histórico de exercícios

**Onde:** lista de exercícios  
**O que:** filtrar por categoria (Barbell, Machine, etc.) além do grupo muscular; ordenar por último uso  
**Por que:** catálogo cresce com o tempo; a busca por texto já existe mas falta navegação por categoria

### 11. Duplicar treino

**Onde:** lista de treinos  
**O que:** criar cópia de um treino existente com novo nome  
**Por que:** usuário que quer criar variações (ex: Treino A → Treino A2) precisa reconstruir do zero hoje

---

## Prioridade Baixa — Longo prazo / V2

Features mais complexas ou que dependem de infraestrutura nova.

### 12. Sincronização / Backup na nuvem

**O que:** backup do banco local em conta do usuário (iCloud / Google Drive / backend próprio)  
**Por que:** proteção contra perda de dados por troca de celular  
**Estratégia recomendada:** backup do arquivo SQLite completo (não sync incremental) como primeiro passo  
**Depende de:** expo-file-system + autenticação (Supabase ou Firebase Auth)

### 13. Planejamento semanal

**O que:** definir quais treinos serão feitos em quais dias da semana; marcar dias de descanso  
**Por que:** ajuda a planejar frequência e visualizar desequilíbrios de grupos musculares  
**Novo modelo:** `PlanoSemanal` + `DiaTreino`

### 14. Sugestão de progressão de carga

**O que:** baseado no histórico recente, sugerir aumento de carga ou reps para o próximo treino  
**Por que:** principal dificuldade de quem treina sem personal trainer  
**Lógica inicial:** se nos últimos 2 registros a execução atingiu todas as reps recomendadas, sugerir +2,5kg

### 15. Detecção de plateau

**O que:** avisar quando o 1RM de um exercício está estagnado por N semanas  
**Por que:** ajuda o usuário a perceber que precisa mudar estímulo

### 16. Múltiplos perfis / multiusuário local

**O que:** suporte a mais de uma pessoa usando o mesmo dispositivo com dados separados  
**Depende de:** `PerfilLocal` (já previsto no modelo de domínio original)

### 17. Dark mode

**O que:** tema escuro seguindo preferência do sistema  
**Por que:** uso durante treino em ambiente escuro; preferência crescente de usuários  
**Impacto:** refatoração dos StyleSheet de todas as telas

### 18. Integração com HealthKit / Google Fit

**O que:** registrar treino concluído na saúde do dispositivo  
**Por que:** integração com apps de saúde do ecossistema  
**Depende de:** `expo-health` ou biblioteca nativa

---

## Dívida Técnica — Resolvida

Todas as dívidas técnicas identificadas foram resolvidas. Resumo do que foi feito:

- **Subcomponentes extraídos** das 3 telas grandes (`ExerciseCatalog`, `TreinoDetail`, `SessaoAtiva`) para pastas `components/` por feature
- **DashboardRepository** criado na camada de domínio; `GetDashboardStatsUseCase` não importa mais `SQLiteDatabaseClient` diretamente
- **Primitivos de UI** em `ui/shared/components/` (`PrimaryButton`, `SecondaryButton`, `DangerButton`, `HeroCard`, `ContentCard`, `SectionTitle`)
- **Paginação** em `ExerciseRepository.list()` e `ListExercisesUseCase.execute()` via `{ limit?, offset? }`
- **Race condition** no registro de série resolvida com `isSubmittingSerie` em `ExercicioCard`
- **Testes** adicionados para `SugerirProgressaoUseCase`, `CancelarSessaoUseCase` e `detectarPlateau`
- **`useWindowDimensions`** substituindo `Dimensions.get()` estático em `LineChart` e `PesoScreen`
- **`PesoLineChart`** consolidado como wrapper do `LineChart` compartilhado
- **Proteção de formulários** (`deletingId`, `isSubmitting`) já estavam OK nos controllers existentes
- **Bug de grupos musculares** corrigido: exercícios com múltiplos grupos agora aparecem em todas as seções do catálogo

---

## Fora do Escopo (por enquanto)

Itens deliberadamente deixados de fora, revisáveis no futuro:

- Login e autenticação
- Backend próprio
- Versão web
- Recursos sociais (compartilhar treino, seguir amigos)
- Integração com wearables (smartwatch, sensor de frequência cardíaca)
- Monetização
- Analytics de produto (Mixpanel, Amplitude)
- Fotos/vídeos de execução
