# Mudanças perdidas no rebase (commit 28d5c51)

**Contexto:** Durante o `git pull --rebase` de 15/05/2026, o commit `28d5c51` ("Render exercise groups (bi-set, circuito, drop-set) in session and treino views") foi descartado com `git rebase --skip` após conflitos. A maioria da infraestrutura e UI do planejamento de treino foi re-implementada imediatamente depois, mas os itens abaixo ainda precisam atenção.

---

## ✅ Já re-implementado (sessão de trabalho pós-rebase)

Toda a camada de dados (domain → infra → application) foi reconstruída:

- `TreinoExercicio` e `SessaoExercicio` com `metodo` e `grupoId`
- DB migration v12 (`treino_exercicios.metodo`, `treino_exercicios.grupo_id`, idem em `sessao_exercicios`)
- `TreinoExercicioRepository.updateMetodoGrupo`
- `SQLiteTreinoExercicioRepository`, `InMemoryTreinoExercicioRepository` — save/queries atualizados
- `SQLiteSessaoExercicioRepository` — save/mapRow com metodo/grupoId
- `IniciarSessaoUseCase` — copia metodo/grupoId do treino para a sessao
- `AddExercicioASessaoUseCase`, `AddExercicioAoTreinoUseCase`, `DuplicarTreinoUseCase` — campos novos
- `useTreinoDetailController` — `onUpdateMetodoGrupo`
- `ExercicioCardTreino` — seletor de método + "Vincular com próximo/anterior" + renomeado para "Desvincular"
- `TreinoDetailScreen` — blocos visuais de grupo (bi-set/circuito/drop-set)
- Todos os arquivos de teste — campos `metodo: 'normal'` e `grupoId: null` adicionados

---

## ❌ Ainda pendente (perdido, não re-implementado)

### 1. `useAndroidBack.ts` — hook novo (crítico)
**Arquivo:** `apps/mobile/src/ui/shared/hooks/useAndroidBack.ts`

```ts
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useAndroidBack(onBack: () => void) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
}
```

**Impacto:** Sem este hook, o botão físico Back do Android não funciona em nenhuma tela que o utilizava.

**Telas que devem usar:**
- `ExercicioDetalheScreen.tsx` — import e `useAndroidBack(onBack)` na linha ~56
- `HistoricoExercicioScreen.tsx` — import e `useAndroidBack(onBack)` no início

---

### 2. `SessaoAtivaScreen.tsx` — renderização de grupos na sessão ativa (crítico)
**Arquivo:** `apps/mobile/src/ui/sessao/screens/SessaoAtivaScreen.tsx`

O commit adicionou a função `agruparExercicios` e a lógica de renderização de grupos visuais (bi-set/circuito) na sessão ativa. Sem isso, os exercícios agrupados não aparecem com a moldura colorida durante a sessão.

**Adicionar ao arquivo:**
```tsx
import type { SessaoExercicioComSeries } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { MetodoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';

const METODO_LABELS: Record<Exclude<MetodoExercicio, 'normal'>, string> = {
  drop_set: 'Drop-set',
  bi_set:   'Bi-set',
  circuito: 'Circuito',
};

const METODO_COLORS: Record<Exclude<MetodoExercicio, 'normal'>, string> = {
  drop_set: '#9333ea',
  bi_set:   '#16a34a',
  circuito: '#0891b2',
};

interface Grupo {
  grupoId: string | null;
  metodo: MetodoExercicio;
  itens: SessaoExercicioComSeries[];
}

function agruparExercicios(exercicios: SessaoExercicioComSeries[]): Grupo[] {
  const grupos: Grupo[] = [];
  const grupoMap = new Map<string, Grupo>();

  for (const item of exercicios) {
    const { grupoId, metodo } = item.sessaoExercicio;
    if (!grupoId) {
      grupos.push({ grupoId: null, metodo: 'normal', itens: [item] });
    } else if (grupoMap.has(grupoId)) {
      grupoMap.get(grupoId)!.itens.push(item);
    } else {
      const grupo: Grupo = { grupoId, metodo: metodo ?? 'normal', itens: [item] };
      grupoMap.set(grupoId, grupo);
      grupos.push(grupo);
    }
  }
  return grupos;
}
```

**Substituir o `.map` direto de exercícios por:**
```tsx
{agruparExercicios(detalhe.exercicios).map((grupo, gi) => {
  if (grupo.metodo === 'normal') {
    const { sessaoExercicio, series } = grupo.itens[0];
    return (
      <ExercicioCard
        key={sessaoExercicio.id}
        sessaoExercicio={sessaoExercicio}
        series={series}
        onPress={() => setSelectedExercicioId(sessaoExercicio.id)}
      />
    );
  }

  const m = grupo.metodo as Exclude<MetodoExercicio, 'normal'>;
  return (
    <View key={grupo.grupoId ?? gi} style={[styles.grupoCard, { borderColor: METODO_COLORS[m] }]}>
      <View style={[styles.grupoHeader, { backgroundColor: METODO_COLORS[m] }]}>
        <Text style={styles.grupoHeaderText}>{METODO_LABELS[m]}</Text>
      </View>
      {grupo.itens.map(({ sessaoExercicio, series }) => (
        <ExercicioCard
          key={sessaoExercicio.id}
          sessaoExercicio={sessaoExercicio}
          series={series}
          onPress={() => setSelectedExercicioId(sessaoExercicio.id)}
        />
      ))}
    </View>
  );
})}
```

**Estilos a adicionar no `makeStyles`:**
```ts
grupoCard: { borderRadius: 16, borderWidth: 2, overflow: 'hidden', gap: 0 },
grupoHeader: { paddingHorizontal: 14, paddingVertical: 6 },
grupoHeaderText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
```

---

### 3. `ExercicioDetalheScreen.tsx` — `useAndroidBack` e remoção de estilos duplicados
**Arquivo:** `apps/mobile/src/ui/sessao/screens/ExercicioDetalheScreen.tsx`

- Adicionar import: `import { useAndroidBack } from '../../shared/hooks/useAndroidBack';`
- Adicionar logo após `const styles = useMemo(...)`: `useAndroidBack(onBack);`
- Remover o `onBack` do handler duplicado que estava em `handleAdd` (era redundante após o hook)

---

### 4. `HistoricoExercicioScreen.tsx` — `useAndroidBack`
**Arquivo:** `apps/mobile/src/ui/historico/screens/HistoricoExercicioScreen.tsx`

- Adicionar import: `import { useAndroidBack } from '../../shared/hooks/useAndroidBack';`
- Adicionar após `const styles = useMemo(...)`: `useAndroidBack(onBack);`

---

### 5. `buildHistoricoExercicioViewModel.ts` — campo `tipo` nas series e `substituiuLabel`
**Arquivo:** `apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.ts`

O `ExecucaoCard` em `HistoricoExercicioScreen` filtra `s.tipo === 'valida'` e `s.tipo === 'aquecimento'`, mas o `SerieHistoricoViewModel` atual não tem campo `tipo`. Adicionar ao interface:

```ts
export interface SerieHistoricoViewModel {
  descricao: string;
  rm1Estimado: string | null;
  tipo: 'valida' | 'aquecimento';   // ← adicionar
}

export interface ExecucaoHistoricoViewModel {
  data: string;
  melhorRm1: string;
  volumeTotal: string;
  series: SerieHistoricoViewModel[];
  substituiuLabel: string | null;   // ← adicionar (ex: "↔ Substituiu Supino Reto")
}
```

---

### 6. `HistoricoExercicioScreen.tsx` — ExecucaoCard precisa de `tipo`
A tela foi mantida com o `ExecucaoCard` expandível (✅ preservado no conflito), mas o `ExecucaoCard` faz:
```ts
const seriesValidas = execucao.series.filter((s) => s.tipo === 'valida');
const seriesAquec  = execucao.series.filter((s) => s.tipo === 'aquecimento');
```
Só funcionará corretamente quando item 5 acima for implementado.

---

### 7. `SerieRegistrada.ts` — export de `TipoSerie` (menor)
**Arquivo:** `apps/mobile/src/domain/sessoes/entities/SerieRegistrada.ts`

O commit exportava `TipoSerie` para uso no `HistoricoRepository`. Verificar se o export está presente e, caso não esteja, adicionar:
```ts
export type TipoSerie = 'aquecimento' | 'valida';
```

---

### 8. `RegistrarSerieUseCase.ts` — remoção do campo `tipoSerie` do input (menor)
**Arquivo:** `apps/mobile/src/application/sessoes/use-cases/RegistrarSerieUseCase.ts`

O commit removeu `tipoSerie` de `RegistrarSerieInput` (a série sempre nasce como `'valida'`, o `tipoSerie` é determinado pela entidade). Verificar se o input atual ainda exige o campo e removê-lo caso positivo.

---

### 9. `SugerirProgressaoUseCase.ts` — filtro de séries válidas (menor)
**Arquivo:** `apps/mobile/src/application/sessoes/use-cases/SugerirProgressaoUseCase.ts`

4 linhas mudadas — provavelmente para usar `s.tipoSerie !== 'aquecimento'` em vez de `s.tipoSerie === 'valida'`. Revisar o filtro atual.

---

### 10. `buildSessaoResumoViewModel.ts` — mesmo filtro (menor)
**Arquivo:** `apps/mobile/src/ui/sessao/presenters/buildSessaoResumoViewModel.ts`

20 linhas mudadas — mesmo padrão de filtro. Confirmar que `validas = series.filter(s => s.tipoSerie !== 'aquecimento')`.

---

## Prioridade de implementação

| # | Item | Prioridade | Impacto |
|---|------|-----------|---------|
| 1 | `useAndroidBack.ts` (criar arquivo) | 🔴 Alta | Back button quebrado no Android |
| 2 | `ExercicioDetalheScreen` + `HistoricoExercicioScreen` — usar o hook | 🔴 Alta | Depende do #1 |
| 3 | `SessaoAtivaScreen` — grupos visuais na sessão | 🟡 Média | Bi-set/circuito invisíveis na sessão |
| 4 | `buildHistoricoExercicioViewModel` — campo `tipo` + `substituiuLabel` | 🟡 Média | ExecucaoCard filtra errado |
| 5 | `RegistrarSerieUseCase` / `SugerirProgressaoUseCase` — filtro tipoSerie | 🟢 Baixa | Comportamento já funcional |
