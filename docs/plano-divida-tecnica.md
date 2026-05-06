# Plano de Execução — Dívida Técnica

> Criado em `2026-05-06`. Baseado no estado atual do codebase após implementação de dark mode, gráficos, sugestão de progressão e detecção de plateau.

Cada item tem: escopo, arquivos afetados, critério de pronto e impacto se ignorado.

---

## Sessão 1 — Race conditions e proteção de formulários (risco imediato)

**Por que primeiro:** usuário pode submeter formulários múltiplas vezes, causando dados duplicados no SQLite. Baixo esforço, alto impacto de confiabilidade.

### D1. Proteger botões de delete contra clique duplo

**Problema:** `onDelete` em Peso, Exercícios e Treinos não tem estado de loading. Um clique duplo rápido executa o use case duas vezes.

**Arquivos:**
- `usePesoController.ts` — adicionar `deletingId: string | null` ao estado
- `useExerciseCatalogController.ts` — idem
- `useTreinoListController.ts` — idem
- `PesoScreen.tsx`, `ExerciseCatalogScreen.tsx`, `TreinoListScreen.tsx` — passar `deletingId` para os botões e desabilitar enquanto `deletingId === card.id`

**Pronto quando:** nenhum botão de exclusão aceita segundo clique enquanto o primeiro ainda executa.

---

### D2. Bloquear submit duplicado nos formulários de criação

**Problema:** `TreinoListScreen` e `ExerciseCatalogScreen` têm `isSubmitting` no controller mas a tela não sempre repassa o `disabled` para todos os campos de input.

**Arquivos:**
- `TreinoListScreen.tsx` — desabilitar campo de texto durante `isSubmitting`
- `ExerciseCatalogScreen.tsx` — idem

**Pronto quando:** campos de input ficam `editable={false}` durante submit.

---

## Sessão 2 — Testes unitários de novos casos de uso (cobertura)

**Por que segundo:** implementamos 3 use cases sem nenhum teste. Antes de acumular mais lógica, cobrir o que já existe.

### D3. Testes para `SugerirProgressaoUseCase`

**Arquivo a criar:** `application/sessoes/use-cases/SugerirProgressaoUseCase.test.ts`

**Casos a cobrir:**
1. Retorna `null` quando `execucoesRecomendadas` é `null`
2. Retorna `null` quando há menos de 2 execuções
3. Retorna `null` quando uma das 2 execuções não atingiu a meta
4. Retorna `null` quando exercício foi executado sem séries válidas
5. Retorna sugestão `cargaPadrao + 2.5` quando ambas execuções atingiram a meta
6. Usa carga máxima da última execução como referência quando `cargaPadrao` é `null`

---

### D4. Testes para `detectarPlateau` no presenter de histórico

**Arquivo:** `buildHistoricoExercicioViewModel.test.ts` — adicionar describe block

**Casos a cobrir:**
1. Retorna `null` com menos de 4 execuções com séries válidas
2. Retorna `null` quando há melhora ≥ 1 kg no 1RM entre a mais antiga e qualquer recente
3. Retorna `PlateauInfo` quando o 1RM máximo nas 4 sessões não supera a mais antiga em 1 kg
4. Ignora execuções sem séries válidas na contagem
5. Retorna `null` quando execuções têm apenas séries de aquecimento

---

### D5. Testes para `CancelarSessaoUseCase`

**Arquivo a criar:** `application/sessoes/use-cases/CancelarSessaoUseCase.test.ts`

**Casos a cobrir:**
1. Lança `SessaoNotFoundError` quando sessão não existe
2. Remove séries, exercícios e sessão em cascata
3. Repositórios ficam vazios após cancelamento

---

## Sessão 3 — Extrair componentes compartilhados (manutenibilidade)

**Por que terceiro:** dark mode revelou que cada tela redefine os mesmos padrões visuais (heroCard, listCard, sectionTitle, primaryButton). Centralizar elimina inconsistências e reduz o trabalho de futuras mudanças de design.

### D6. Componentes primitivos em `ui/shared/components/`

**Arquivos a criar:**

```
ui/shared/components/
  HeroCard.tsx       — card escuro com eyebrow + title + children
  ContentCard.tsx    — card branco com borderRadius e border padrão
  PrimaryButton.tsx  — botão laranja com estados pressed/disabled/loading
  SecondaryButton.tsx — botão outline com borda
  DangerButton.tsx   — botão vermelho para ações destrutivas
  SectionTitle.tsx   — texto de título de seção padronizado
```

**Cada componente:** aceita `children` e props específicas, chama `useTheme()` internamente.

**Refatoração:** atualizar `SessaoInicioScreen`, `PesoScreen`, `HistoricoExercicioScreen` e `DashboardScreen` (as mais simples) para usar os novos primitivos. Deixar `SessaoAtivaScreen`, `TreinoDetailScreen` e `ExerciseCatalogScreen` para a Sessão 4.

**Pronto quando:** os 4 arquivos menores usam os primitivos e não redefinem os estilos base.

---

## Sessão 4 — Quebrar telas grandes (legibilidade e testabilidade)

**Contexto atual:** as 3 telas mais longas cresceram com as features recentes.

| Tela | Linhas atuais | Meta |
|---|---|---|
| `ExerciseCatalogScreen.tsx` | 629 | ≤ 250 (arquivo principal) |
| `TreinoDetailScreen.tsx` | 519 | ≤ 250 |
| `SessaoAtivaScreen.tsx` | 566 | ≤ 250 |

### D7. Extrair subcomponentes de `ExerciseCatalogScreen`

**Arquivos a criar em `ui/exercises/components/`:**
- `ExerciseCard.tsx` — card individual de exercício com edição inline
- `ExerciseForm.tsx` — formulário de criação/edição
- `ExerciseGroupSection.tsx` — seção agrupada por músculo
- `ExerciseCatalogFilters.tsx` — chips de filtro por grupo/categoria

---

### D8. Extrair subcomponentes de `TreinoDetailScreen`

**Arquivos a criar em `ui/treinos/components/`:**
- `ExercicioCardTreino.tsx` — card com recomendações editáveis (já existe inline, extrair)
- `AddExercicioPanel.tsx` — seção de busca e seleção de exercícios
- `TreinoNomeEditor.tsx` — hero card com edição inline de nome

---

### D9. Extrair subcomponentes de `SessaoAtivaScreen`

**Arquivos a criar em `ui/sessao/components/`:**
- `ExercicioCard.tsx` — card de exercício com formulário de série (já existe inline, extrair)
- `RestTimerBanner.tsx` — banner de descanso (já existe inline, extrair)
- `AddExercicioSection.tsx` — lista de exercícios disponíveis (já existe inline, extrair)

---

## Sessão 5 — Abstração do Dashboard e paginação (escalabilidade)

### D10. Criar `DashboardRepository`

**Problema:** `GetDashboardStatsUseCase` faz queries diretas ao `database`, violando a separação de camadas. Dificulta testes e futura migração de banco.

**Arquivos a criar:**
- `domain/dashboard/repositories/DashboardRepository.ts` — interface com métodos:
  - `countSessoesFinalizadas(): Promise<number>`
  - `countSessoesFinalizadasDesde(data: string): Promise<number>`
  - `getRecordesPessoais(limit: number): Promise<RecordeItem[]>`
  - `getEvolucaoPorTreino(limitSessoes: number): Promise<EvolucaoPorTreino[]>`
- `infrastructure/dashboard/SQLiteDashboardRepository.ts` — move as 4 queries do use case
- Atualizar `GetDashboardStatsUseCase` para depender da interface
- Atualizar `mobileDependencies.ts`

**Pronto quando:** `GetDashboardStatsUseCase` não importa `SQLiteDatabaseClient` diretamente.

---

### D11. Paginação na listagem de exercícios

**Problema:** `ListExercisesUseCase` carrega todos os exercícios de uma vez. Com o catálogo seed de 43 exercícios + customizados, isso já é perceptível em dispositivos lentos.

**Arquivos:**
- `application/exercises/use-cases/ListExercisesUseCase.ts` — aceitar `{ limit, offset, search }` opcional
- `infrastructure/exercises/SQLiteExerciseRepository.ts` — adicionar query com `LIMIT/OFFSET`
- `domain/exercises/repositories/ExerciseRepository.ts` — atualizar interface
- `useExerciseCatalogController.ts` — carregar mais ao rolar (infinite scroll simples)
- `ExerciseCatalogScreen.tsx` — botão "Carregar mais" ou scroll trigger

---

## Sessão 6 — Correção do gráfico e dimensões dinâmicas (bug latente)

### D12. Substituir `Dimensions.get('window').width` por `useWindowDimensions`

**Problema:** `LineChart.tsx` e `PesoScreen.tsx` calculam `chartWidth` com `Dimensions.get('window').width - 80` no momento do carregamento do módulo. Em dispositivos que permitem rotação de tela, ou com mudança de janela (iPad split-screen), o gráfico fica com largura errada.

**Arquivos:**
- `ui/shared/LineChart.tsx` — substituir constante por `useWindowDimensions().width - 80` dentro do componente
- `ui/peso/screens/PesoScreen.tsx` — idem no `PesoLineChart`
- Remover a constante `SCREEN_WIDTH` / `PESO_CHART_WIDTH` no topo dos arquivos

**Pronto quando:** girar o dispositivo recalcula corretamente a largura dos gráficos.

---

### D13. Consolidar `PesoLineChart` no componente `LineChart`

**Problema:** `PesoScreen.tsx` tem um `PesoLineChart` que duplica 90% da lógica do `LineChart` compartilhado. Qualquer bug ou melhoria precisa ser feita em dois lugares.

**Solução:** `PesoLineChart` passa a ser um wrapper fino de `LineChart`:
```typescript
function PesoLineChart({ points }: { points: PesoChartPoint[] }) {
  return (
    <LineChart
      points={points.map(p => ({ value: p.pesoKg, label: p.label }))}
      formatValue={(v) => `${v} kg`}
    />
  );
}
```

**Arquivos:** apenas `PesoScreen.tsx`

---

## Ordem recomendada de execução

| Prioridade | Item | Esforço | Risco se ignorado |
|---|---|---|---|
| 🔴 Alta | D1 — Delete duplicado | Pequeno | Dados corrompidos |
| 🔴 Alta | D2 — Submit duplicado | Pequeno | Dados duplicados |
| 🟠 Média | D3 — Testes SugerirProgressao | Pequeno | Regressão silenciosa |
| 🟠 Média | D4 — Testes detectarPlateau | Pequeno | Regressão silenciosa |
| 🟠 Média | D5 — Testes CancelarSessao | Pequeno | Regressão silenciosa |
| 🟠 Média | D13 — Consolidar PesoLineChart | Pequeno | Bug em 2 lugares |
| 🟡 Normal | D12 — useWindowDimensions | Pequeno | Bug em iPad/rotação |
| 🟡 Normal | D6 — Componentes primitivos | Médio | Inconsistência visual |
| 🟡 Normal | D10 — DashboardRepository | Médio | Difícil testar |
| 🟡 Normal | D7 — Extrair ExerciseCatalog | Médio | Difícil manter |
| 🟡 Normal | D8 — Extrair TreinoDetail | Médio | Difícil manter |
| 🟡 Normal | D9 — Extrair SessaoAtiva | Médio | Difícil manter |
| 🟢 Baixa | D11 — Paginação exercícios | Grande | Lento com >150 itens |
