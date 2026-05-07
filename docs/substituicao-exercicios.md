# Substituição de Exercícios — Design e Considerações

> Rascunho de design. Não implementado. Atualizado em `2026-05-07`.

---

## Objetivo

Durante uma sessão ativa, o usuário está prestes a fazer um exercício mas não consegue — equipamento ocupado, dor, falta de material. Ele quer uma sugestão rápida de **qual exercício trabalha o mesmo músculo e pode ser feito agora**, sem alterar o treino template.

**Exemplo concreto:**  
Supino inclinado com barra → todos os bancos ocupados  
→ app sugere: Crucifixo Inclinado, Crossover Polia Baixa, Supino Inclinado com Halteres  
→ usuário escolhe um → sessão continua com o substituto registrado

---

## O que NÃO está no escopo

- Timer de fila / notificação de espera (dispensado — o usuário resolve isso com o relógio)
- Substituição permanente do treino template
- Integração com sistemas da academia

---

## Modelo de Dados

### Novas colunas em `sessao_exercicios` (migration v9)

```sql
ALTER TABLE sessao_exercicios ADD COLUMN substituido_por_exercicio_id TEXT;
ALTER TABLE sessao_exercicios ADD COLUMN substituicao_motivo TEXT;
-- motivo: 'equipamento_indisponivel' | 'variacao' | null
```

- `substituido_por_exercicio_id NULL` → exercício feito como planejado
- Preenchido → o card exibe e registra séries no substituto; o original fica gravado para análise ("Supino inclinado foi substituído 4 vezes este mês")

As `series_registradas` continuam ligadas a `sessao_exercicio_id` normalmente — as séries vão para o substituto.

### Alternativas explícitas por exercício (opcional, curadoria manual)

```sql
CREATE TABLE exercise_alternatives (
  exercicio_id   TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternativa_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  PRIMARY KEY (exercicio_id, alternativa_id)
);
```

Relação M:N simétrica definida pelo usuário. Quando vazia, o app auto-sugere por grupo muscular. As alternativas explícitas aparecem primeiro na lista.

---

## Por que grupo muscular sozinho é insuficiente

Supino reto e supino inclinado pertencem ao mesmo grupo muscular (Peito), mas **não são substitutos válidos** — o supino reto enfatiza peitoral médio, o inclinado enfatiza peitoral superior e ombros. Sugerir supino reto quando o inclinado está ocupado troca o estímulo pretendido pelo usuário.

O mesmo problema aparece em:
- Rosca direta vs. rosca martelo (bíceps longa vs. curta)
- Leg press vs. agachamento livre (quadríceps com cargas e recrutamento diferentes)
- Remada curvada vs. puxada (costas, mas padrões de movimento opostos)

**Conclusão:** grupo muscular é condição necessária mas não suficiente para uma substituição válida. É preciso um nível de granularidade a mais.

---

## Solução: Padrão de Movimento (`padrao_movimento`)

Adicionar um campo `padrao_movimento` aos exercícios. Exercícios do mesmo padrão são substitutos naturais porque recrutam as mesmas fibras com o mesmo ângulo de força.

### Exemplos de padrões

| Padrão | Exercícios |
|---|---|
| `press_inclinado` | Supino inclinado barra, Supino inclinado halteres, Crossover polia baixa, Crucifixo inclinado |
| `press_plano` | Supino reto barra, Supino reto halteres, Crossover polia média, Crucifixo plano |
| `press_declinado` | Supino declinado, Crossover polia alta, Mergulho entre barras |
| `remada_horizontal` | Remada curvada, Remada sentado cabo, Remada haltere |
| `puxada_vertical` | Puxada frente, Puxada atrás, Barra fixa |
| `agachamento` | Agachamento livre, Leg press, Hack squat, Agachamento goblet |
| `hip_hinge` | Levantamento terra, Stiff, Cadeira flexora |
| `press_ombro` | Desenvolvimento barra, Desenvolvimento halteres, Arnold press |
| `elevacao_lateral` | Elevação lateral haltere, Elevação lateral cabo |

### Schema

```sql
ALTER TABLE exercises ADD COLUMN padrao_movimento TEXT;
```

Valor null = não classificado (exercícios customizados sem padrão definido).

Os 43 exercícios seed do app devem ter `padrao_movimento` preenchido. Exercícios customizados criados pelo usuário podem deixar em branco ou escolher de uma lista.

---

## Como as Sugestões São Ordenadas (revisado)

```
1. Alternativas explícitas em exercise_alternatives
       ↓
2. Mesmo padrao_movimento (substituto real — mesmo músculo, mesmo ângulo)
       ↓
3. Mesmo grupo muscular primário, padrao_movimento diferente
       → exibidos com aviso: "⚠ Ênfase diferente"
       ↓
4. Busca livre no catálogo
```

**Filtros aplicados em todas as camadas:**
- Excluir exercícios já presentes na sessão
- Mostrar "Último: X kg × Y rep" no card da sugestão
- Badge "Alternativa definida" para as do tipo 1
- Badge "⚠ Ênfase diferente" para as do tipo 3

---

## Fluxo de UI

```
Sessão ativa → Card do exercício
  └── botão "↔ Substituir"
        → bottom sheet abre com lista de sugestões
        → três seções: Alternativas | Mesmo músculo | Buscar
        → usuário escolhe o exercício
        → confirma o motivo (opcional, tap rápido):
              "Equipamento ocupado" · "Variar estímulo"
        → card substitui nome + recomendações
        → badge discreto "↔ {nome original}" no card
        → séries registradas vão para o substituto
```

**Ao finalizar a sessão**, o resumo lista as substituições:
> Supino Inclinado Barra → Crossover Polia Baixa *(equipamento ocupado)*

---

## Impacto no Histórico

- `GetHistoricoExercicio(supino_inclinado_barra_id)` → não aparece a sessão (correto — ele não foi feito)
- `GetHistoricoExercicio(crossover_id)` → aparece a sessão normalmente
- `GetUltimasExecucoesValidas` e `SugerirProgressaoUseCase` → não são afetados, funcionam pelo exercício que de fato foi executado

---

## Use Cases Necessários

| Use case | O que faz |
|---|---|
| `SugerirSubstitutosUseCase` | Dado um `sessaoExercicioId`, retorna lista ordenada de candidatos usando `padrao_movimento` como critério primário |
| `SubstituirExercicioSessaoUseCase` | Atualiza `sessao_exercicios`: preenche `substituido_por_exercicio_id`, troca recomendações pelo histórico do substituto |
| `AddExerciseAlternativeUseCase` | Insere linha em `exercise_alternatives` |
| `RemoveExerciseAlternativeUseCase` | Remove linha |

`SugerirSubstitutosUseCase` prioriza `padrao_movimento` igual ao do exercício original (via `grupo_muscular_snapshot` + `padrao_movimento` snapshottado ou consultado ao vivo). Exercícios do mesmo grupo mas padrão diferente entram como segunda camada com flag `enfase_diferente: true`.

---

## Questões Abertas

**1. Alternativas simétricas ou direcionadas?**  
Supino Inclinado → Crucifixo Inclinado faz sentido.  
Crucifixo Inclinado → Supino Inclinado também faz sentido?  
Provavelmente sim na maioria dos casos — simetria simplifica a curadoria.

**2. As recomendações (séries/reps/carga) do substituto são as do treino ou do histórico do substituto?**  
Sugestão: usar o histórico mais recente do substituto (`GetUltimaExecucaoValida`) como pré-preenchimento, ignorando as recomendações do treino original (que são para outro exercício).

**3. O usuário pode desfazer a substituição durante a sessão?**  
Sim — "Voltar ao original" remove `substituido_por_exercicio_id` e apaga as séries registradas no substituto (com confirmação).

---

## Estimativa de Complexidade

| Componente | Complexidade |
|---|---|
| Migration v9 (`padrao_movimento` em exercises + 2 colunas em sessao_exercicios + nova tabela) | Baixa |
| Preencher `padrao_movimento` nos 43 seeds | Baixa — edição pontual das migrations |
| Picker de `padrao_movimento` no formulário de exercício | Baixa |
| `SugerirSubstitutosUseCase` com padrão de movimento | Média |
| `SubstituirExercicioSessaoUseCase` | Média |
| UI bottom sheet de sugestões com badges | Média |
| Badge + resumo da sessão | Baixa |
| Curadoria de `exercise_alternatives` (UI) | Alta — novo módulo de configuração |

**Caminho incremental recomendado:**

1. Migration + `padrao_movimento` nos seeds (base obrigatória para sugestões corretas)
2. `SugerirSubstitutosUseCase` + `SubstituirExercicioSessaoUseCase`
3. Bottom sheet na sessão ativa com as três camadas de sugestão
4. Badge no card e resumo da sessão
5. `exercise_alternatives` — somente se o usuário precisar de pares que `padrao_movimento` não cobre

---

## Dependências Novas

Nenhuma. Tudo usa infraestrutura existente (SQLite, use case pattern, bottom sheet com Modal).

---

## Snapshot de `padrao_movimento` na Sessão

Um detalhe importante: `sessao_exercicios` já guarda snapshots de nome, grupo muscular, etc. Deve também guardar `padrao_movimento_snapshot` para que `SugerirSubstitutosUseCase` saiba o padrão original mesmo que o exercício seja editado depois.

```sql
ALTER TABLE sessao_exercicios ADD COLUMN padrao_movimento_snapshot TEXT;
```

Isso evita que uma edição futura no catálogo quebre sugestões de sessões em andamento.
