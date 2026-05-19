# Plano — Sugestão de Treino & Planejamento Semanal

> Criado em `2026-05-19`.

---

## Fase 1 — Sugestão automática por rotação (zero configuração)

### Objetivo

Exibir um card "Treino sugerido" no topo da aba **Sessão** com o treino que foi feito **há mais tempo** (ou nunca feito). Zero setup — funciona a partir do histórico existente.

### UX

```
┌──────────────────────────────────────────────────────┐
│  Sugerido para hoje                                   │
│  Treino A — Peito                                     │
│  Último: há 4 dias · 19/05                [Começar]  │
└──────────────────────────────────────────────────────┘
```

- Aparece acima da lista de todos os treinos
- Não aparece se já há uma sessão ativa
- Se há apenas 1 treino: sugere sempre ele (sem "nunca repita")
- "Nunca feito" aparece antes de qualquer treino com histórico (prioridade máxima)

### Query

```sql
SELECT t.id, t.name, t.objetivo, s.ultima
FROM treinos t
LEFT JOIN (
  SELECT treino_id, MAX(data_hora_inicio) AS ultima
  FROM sessao_treinos
  WHERE status = 'finalizada'
  GROUP BY treino_id
) s ON t.id = s.treino_id
ORDER BY s.ultima ASC NULLS FIRST
LIMIT 1
```

Primeiro resultado = treino nunca feito ou feito há mais tempo.

### Arquivos a criar

**`src/application/sessoes/use-cases/SugerirTreinoUseCase.ts`**
```ts
interface SugestaoTreino {
  treino: TreinoPrimitives;
  ultimaSessao: string | null; // ISO date, null = nunca feito
}

class SugerirTreinoUseCase {
  execute(): Promise<SugestaoTreino | null>
  // retorna null se não há treinos cadastrados
}
```

Executa a query acima diretamente no `SQLiteDatabaseClient` — sem novo repositório.

### Arquivos a modificar

**`src/application/sessoes/use-cases/GetSessaoAtivaUseCase.ts`** — sem mudança; a sugestão é independente da sessão ativa.

**`src/bootstrap/mobileDependencies.ts`**
```ts
sessao: {
  // existentes...
  sugerirTreino: new SugerirTreinoUseCase(databaseClient),
}
```

**`src/ui/sessao/hooks/useSessaoController.ts` (ou equivalente)**
- Chama `sugerirTreino.execute()` na montagem
- Expõe `sugestao: SugestaoTreino | null`

**`src/ui/sessao/screens/SessaoInicioScreen.tsx`**
- Recebe `sugestao: SugestaoTreino | null` como prop
- Renderiza o card de sugestão acima da lista quando não-nulo e sem sessão ativa
- Botão "Começar" chama o `onIniciar` existente com `sugestao.treino.id`

### Label de tempo

```ts
function labelUltimaSessao(ultimaSessao: string | null): string {
  if (!ultimaSessao) return 'Nunca feito';
  const dias = Math.floor((Date.now() - new Date(ultimaSessao).getTime()) / 86_400_000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return `Há ${dias} dias`;
}
```

### Ordem de execução (Fase 1)

1. Criar `SugerirTreinoUseCase.ts`
2. Adicionar em `mobileDependencies.ts`
3. Atualizar controller de sessão para expor `sugestao`
4. Atualizar `SessaoInicioScreen.tsx` com o card

---

## Fase 2 — Planejamento semanal explícito (power users)

### Objetivo

Permitir ao usuário configurar qual treino fará em cada dia da semana. Aparece no topo da aba **Treinos**. Quando há plano para hoje, o card de sugestão na aba Sessão usa o plano em vez da rotação automática.

### UX

```
┌──────────────────────────────────────────────────────┐
│  Plano da Semana                                      │
│                                                       │
│  SEG    TER    QUA    QUI    SEX    SAB    DOM         │
│ ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐     │
│ │ A │  │ B │  │ A │  │DSC│  │ C │  │DSC│  │DSC│     │
│ └───┘  └───┘  └───┘  └───┘  └───┘  └───┘  └───┘     │
│  Peito Costas  Peito  —    Perna    —      —          │
│                                                       │
│  (célula do dia atual com borda accent;               │
│   tap abre picker de treino / descanso)               │
└──────────────────────────────────────────────────────┘
```

### Schema (migration v16)

```sql
CREATE TABLE IF NOT EXISTS plano_semanal (
  dia_semana TEXT PRIMARY KEY NOT NULL,  -- 'seg'|'ter'|'qua'|'qui'|'sex'|'sab'|'dom'
  treino_id  TEXT REFERENCES treinos(id) ON DELETE SET NULL
);
INSERT OR IGNORE INTO plano_semanal (dia_semana, treino_id) VALUES
  ('seg', NULL), ('ter', NULL), ('qua', NULL), ('qui', NULL),
  ('sex', NULL), ('sab', NULL), ('dom', NULL);
```

### Arquivos a criar (Fase 2)

| Arquivo | Responsabilidade |
|---|---|
| `src/domain/plano/entities/DiaSemana.ts` | Tipo `DiaSemana`, array `DIAS_SEMANA`, labels, `diaSemanaHoje()` |
| `src/domain/plano/repositories/PlanoSemanalRepository.ts` | Interface: `getPlano()`, `setDia()` |
| `src/infrastructure/plano/SQLitePlanoSemanalRepository.ts` | SELECT 7 linhas / UPDATE por dia |
| `src/application/plano/use-cases/GetPlanoSemanalUseCase.ts` | Retorna `Record<DiaSemana, string \| null>` |
| `src/application/plano/use-cases/SetDiaPlanoUseCase.ts` | `execute({ dia, treinoId: string \| null })` |
| `src/ui/treinos/hooks/usePlanoController.ts` | Carrega plano, expõe `onSelectDia`, `onSetTreino` |
| `src/ui/treinos/components/PlanoSemanalCard.tsx` | Grid 7 células, célula hoje destacada |
| `src/ui/treinos/components/PlanoPickerModal.tsx` | Bottom sheet: lista treinos + "Descanso" |

### Arquivos a modificar (Fase 2)

| Arquivo | O que muda |
|---|---|
| `ExpoSQLiteDatabaseClient.ts` | Migration v16 |
| `mobileDependencies.ts` | Adiciona `plano` section |
| `TreinoListScreen.tsx` | `<PlanoSemanalCard>` no topo |
| `MobileApp.tsx` | Passa `treinoHojeDoPlano` para `SessaoFeature` |
| `SessaoInicioScreen.tsx` | Card de sugestão usa plano quando disponível, senão rotação automática |

### Lógica de sugestão com plano ativo

```
Há treino configurado para hoje no plano?
  ├── SIM → sugere esse treino (ignora rotação automática)
  └── NÃO → cai para rotação automática (Fase 1)
```

### Ordem de execução (Fase 2)

1. Migration v16
2. `DiaSemana.ts` + `PlanoSemanalRepository.ts`
3. `SQLitePlanoSemanalRepository.ts`
4. Use cases `GetPlanoSemanal` + `SetDiaPlano`
5. `mobileDependencies.ts`
6. `usePlanoController.ts`
7. `PlanoSemanalCard.tsx` + `PlanoPickerModal.tsx`
8. `TreinoListScreen.tsx`
9. `SessaoInicioScreen.tsx` — lógica de prioridade plano > rotação
10. `MobileApp.tsx`
11. Typecheck + teste no device

---

## Fora de escopo

- Múltiplos planos (plano A / plano B para alternar semanas)
- Histórico de aderência ao plano
- Notificações push
- Sugestão baseada em recuperação muscular
