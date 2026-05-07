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

## Por que grupo muscular E padrão de movimento são insuficientes

**Grupo muscular sozinho é coarse demais:**  
Supino reto e supino inclinado são ambos "Peito", mas o reto enfatiza peitoral médio e o inclinado peitoral superior. Não são substitutos válidos.

**Padrão de movimento sozinho também falha:**  
Crossover polia baixa não é um movimento inclinado — o cabo vem de baixo em direção ao centro. Mas ele recruta **peitoral superior** da mesma forma que o supino inclinado. São substitutos válidos mesmo com padrões de movimento diferentes.

**O critério correto é a região muscular alvo (`musculo_alvo`):**

| Exercício | Musculo alvo | Substitutos válidos |
|---|---|---|
| Supino inclinado barra | Peitoral superior | Supino inclinado halteres, Crossover polia baixa, Crucifixo inclinado |
| Supino reto barra | Peitoral médio | Supino reto halteres, Crossover polia média, Crucifixo plano |
| Crossover polia baixa | Peitoral superior | Supino inclinado barra, Supino inclinado halteres, Crucifixo inclinado |
| Remada curvada | Dorsal + rombóides | Remada haltere, Remada cabo sentado |
| Puxada frente | Dorsal (comprimento) | Barra fixa, Puxada triângulo |

---

## Solução: Campo `musculo_alvo`

```sql
ALTER TABLE exercises ADD COLUMN musculo_alvo TEXT;
```

Granularidade maior que `group_muscle`, mas sem explodir em subclassificações infinitas.

### Valores propostos (subset relevante)

| `group_muscle` | `musculo_alvo` |
|---|---|
| Peito | `peitoral_superior` |
| Peito | `peitoral_medio` |
| Peito | `peitoral_inferior` |
| Costas | `dorsal` |
| Costas | `romboides_trapezio_medio` |
| Ombros | `deltóide_anterior` |
| Ombros | `deltóide_lateral` |
| Ombros | `deltóide_posterior` |
| Bíceps | `biceps_cabeca_longa` |
| Bíceps | `biceps_cabeca_curta` |
| Tríceps | `triceps_cabeca_longa` |
| Tríceps | `triceps_lateral_medial` |
| Quadríceps | `quadriceps_geral` |
| Posterior | `isquiotibiais` |
| Posterior | `gluteos` |
| Panturrilha | `panturrilha` |

Os 43 exercícios seed devem ter `musculo_alvo` preenchido. Exercícios customizados podem deixar em branco (cai na camada de fallback por grupo muscular).

`padrao_movimento` pode existir como metadata opcional (útil para exibição no detalhe do exercício), mas **não é usado como critério de substituição**.

---

## Como as Sugestões São Ordenadas

```
1. Alternativas explícitas em exercise_alternatives
       ↓
2. Mesmo musculo_alvo  ← critério principal
       (ex: peitoral_superior → pega supino inclinado E crossover polia baixa)
       ↓
3. Mesmo group_muscle, musculo_alvo diferente
       → exibidos com aviso "⚠ Ênfase diferente"
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
| Migration v9 (`musculo_alvo` em exercises + 2 colunas em sessao_exercicios + nova tabela) | Baixa |
| Preencher `musculo_alvo` nos 43 seeds | Média — requer classificação cuidadosa |
| Picker de `musculo_alvo` no formulário de exercício | Baixa |
| `SugerirSubstitutosUseCase` por musculo_alvo | Média |
| `SubstituirExercicioSessaoUseCase` | Média |
| UI bottom sheet de sugestões com badges | Média |
| Badge + resumo da sessão | Baixa |
| Curadoria de `exercise_alternatives` (UI) | Alta — novo módulo de configuração |

**Caminho incremental recomendado:**

1. Migration + `musculo_alvo` nos seeds (base obrigatória — sem isso as sugestões são inúteis)
2. `SugerirSubstitutosUseCase` + `SubstituirExercicioSessaoUseCase`
3. Bottom sheet na sessão ativa com as três camadas de sugestão
4. Badge no card e resumo da sessão
5. `exercise_alternatives` — somente se o usuário precisar de pares que `padrao_movimento` não cobre

---

## Dependências Novas

Nenhuma. Tudo usa infraestrutura existente (SQLite, use case pattern, bottom sheet com Modal).

---

## Snapshot de `musculo_alvo` na Sessão

`sessao_exercicios` já guarda snapshots de nome, grupo muscular, etc. Deve também guardar `musculo_alvo_snapshot` para que `SugerirSubstitutosUseCase` conheça o alvo original mesmo que o exercício seja editado depois.

```sql
ALTER TABLE sessao_exercicios ADD COLUMN musculo_alvo_snapshot TEXT;
```

Isso evita que uma edição futura no catálogo quebre sugestões de sessões em andamento.
