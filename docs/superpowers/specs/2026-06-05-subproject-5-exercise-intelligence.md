# Sub-projeto 5: Exercise Intelligence

> Criado em `2026-06-05`. Sem dependência de backend — pode ser desenvolvido em paralelo com o Sub-projeto 1.

---

## Objetivo

Conduzir uma pesquisa completa do catálogo de exercícios em duas frentes:

1. **Enriquecimento + completude** — adicionar informações biomecânicas estruturadas aos exercícios de força já existentes **e** completar cada grupo muscular com os exercícios que faltam. A pesquisa cobre o universo real do sub-grupo (todos os agachamentos, todas as puxadas verticais, etc.), não apenas os registros que hoje têm GIF/seed. Os que faltam são criados como registros novos (`gif_path: null`). Catálogo atual cobre só `category: 'Composto' | 'Isolado'`.
2. **Expansão** — pesquisar e criar novos registros para categorias hoje ausentes do catálogo: `Cardio`, `Warm-Up`, `Mobility`, `Flexibility`, `Rehabilitation`.

> **Mídia não limita escopo (regra global).** O catálogo de GIFs existente cobre só força e está sendo substituído por mídia custom feita à mão. Portanto a disponibilidade de GIF **nunca** define quais exercícios entram no catálogo — nem no enriquecimento, nem na expansão. Pesquise o universo real do sub-grupo; mídia é um passo separado e posterior.

Em paralelo, melhorar o engine de sugestão de substitutos com camadas de similaridade graduadas.

Funcionalidades habilitadas pelo sub-projeto:
- Substituição por equivalência biomecânica (quase igual → similar → mesmo grupo)
- Busca por variações de nome
- Filtro por equipamento com vocabulário controlado
- Análise de músculos-alvo com granularidade real
- Catálogo com cobertura de cardio, mobilidade, aquecimento, alongamento e reabilitação — hoje inexistente

---

## Contexto — Limitações Atuais

| Campo | Estado atual | Problema |
|-------|-------------|---------|
| `musculo_alvo` | `string \| null` — um único músculo | Exercícios com múltiplos primários perdem precisão na substituição |
| `movement_pattern` | Ausente | Não distingue horizontal push de vertical push |
| `equipment` | Texto livre | Não permite filtro ou substituição por equipamento disponível |
| `listAlternativas` | Lista plana | Modal já tenta exibir camadas mas os dados não as distinguem |
| Busca | Somente `normalized_name` | "chest press" não encontra "Supino Reto" |

---

## Mudanças na Entidade `Exercise`

Arquivo: `apps/mobile/src/domain/exercises/entities/Exercise.ts`

### Campos novos

```typescript
movement_pattern: MovementPattern | null
// 'Horizontal Push' | 'Vertical Push' | 'Horizontal Pull' | 'Vertical Pull' | 'Horizontal Adduction'
// | 'Abduction' | 'Horizontal Abduction' | 'Elbow Flexion' | 'Elbow Extension' | 'Knee Extension'
// | 'Knee Flexion' | 'Hip Extension'
// | 'Trunk Flexion' | 'Hip Flexion' | 'Lateral Flexion' | 'Anti-Extension'
// | 'Squat' | 'Hinge' | 'Lunge' | 'Rotation' | 'Anti-Rotation'
// | 'Carry' | 'Gait' | 'Jump' | 'Sprint'
// 'Horizontal Adduction' = single-joint fly/crossover/pec-deck movements (no elbow extension);
// kept distinct from 'Horizontal Push' so the substitution algorithm doesn't rank flys as
// near-identical to compound presses
// 'Abduction' (added 2026-06-10, sessão ombros_lateral) = single-joint frontal/sagittal deltoid
// raise (lateral raise, front raise, upright row); kept distinct from 'Vertical Push' so a lateral
// raise não rankeia como substituto "similar" de um desenvolvimento (overlap parcial de deltoide).
// 'Horizontal Abduction' = rear-delt / reverse fly / face pull (espelho de 'Horizontal Adduction').
// 'Elbow Flexion' (added 2026-06-13, sessão biceps) = rosca/curl single-joint (flexão de cotovelo:
// rosca direta, martelo, inversa, Scott, concentrada, Zottman, drag, spider, Bayesian). Mantém as
// roscas com padrão próprio; chin-up/puxada supinada/remada supinada (compostos que recrutam bíceps)
// ficam em Vertical/Horizontal Pull, então a substituição não rankeia uma rosca como "quase igual"
// a uma barra fixa.
// 'Elbow Extension' (added 2026-06-13, sessões triceps) = extensão de cotovelo single-joint (pushdown/
// pulley, coice/kickback, testa/skullcrusher, francês/overhead extension, na máquina). Os COMPOSTOS de
// tríceps (supino fechado, mergulho/dips, flexão fechada) ficam em 'Horizontal Push' (pressing multi-
// articular), então um pushdown não rankeia como "quase igual" a um supino fechado — só "similar".
// 'Knee Extension' (added 2026-06-13, sessão quadriceps) = extensão de joelho single-joint (cadeira
// extensora, sissy squat). Os COMPOSTOS de quadríceps (agachamentos, leg press, afundos/lunges, hack,
// búlgaro, step-up) ficam em 'Squat'/'Lunge' (multi-articular quadril+joelho), então a cadeira extensora
// não rankeia como "quase igual" a um agachamento — só "similar" pelo overlap de quadriceps.
// 'Knee Flexion' (added 2026-06-13, sessão posterior_gluteos) = flexão de joelho single-joint, isquiotibial
// (mesa/cadeira/flexora em pé/no cabo, nordic). Distinto de 'Hinge' (stiff/terra/bom dia = quadril-dominante
// isquiotibial), para a substituição não cruzar leg curl com stiff (mesmo músculo, mecânica diferente).
// 'Hip Extension' (added 2026-06-13, sessão posterior_gluteos) = extensão de quadril glúteo-dominante em
// posição de ponte/coice (hip thrust, glute bridge, kickback/coice, donkey, frog pump, glúteo na máquina).
// Distinto de 'Hinge' (dobradiça de quadril em pé) para o hip thrust não rankear como "quase igual" a um
// stiff/terra. Adução/abdução de quadril (cadeira adutora/abdutora, adutor no cabo) ficam com pattern null
// (lacuna de vocabulário documentada) — agrupam por musculo_alvo (adutores / gluteos).
// 'Trunk Flexion' / 'Hip Flexion' / 'Lateral Flexion' / 'Anti-Extension' (added 2026-06-13, sessão abdome) =
// padrões de core/tronco. 'Trunk Flexion' = flexão de coluna costelas→pelve (crunch, sit-up, crunch na polia/
// máquina). 'Hip Flexion' = flexão de quadril pelve→costelas / abdominal inferior (leg raise deitado/suspenso,
// crunch reverso, V-up). 'Lateral Flexion' = flexão lateral de tronco (side bend, prancha lateral isométrica).
// 'Anti-Extension' = bracing isométrico resistindo à extensão (prancha, dead bug, rollout na roda). Sem esses 4,
// crunch + leg raise + prancha cairiam todos em null e o algoritmo os agruparia só por musculo_alvo (abdomen)
// como "quase iguais", apesar de estímulos distintos. Rotation (twist/woodchopper/bicicleta) e Anti-Rotation
// (Pallof) já existiam e cobrem o core rotacional. Ver catalog-maintenance.md §11.

musculo_alvo: string[]          // era string | null — agora array de primários
stabilizers: string[]           // músculos estabilizadores (informativo)
execution_type: ExecutionType   // 'Unilateral' | 'Bilateral' | 'Can Be Both'
name_variations: string[]       // nomes alternativos para busca
primary_equipment: string | null   // vocabulário controlado (ver abaixo)
secondary_equipment: string | null // ex: banco, rack, cabo
```

### Vocabulário controlado para equipment

`Barbell` · `Dumbbell` · `Cable` · `Smith Machine` · `Hack Squat Machine` · `Leg Press` · `Pec Deck` · `Chest Supported Row` · `Bodyweight` · `Resistance Band` · `Kettlebell` · `Landmine` · `Suspension Trainer` · `Selectorized Machine` · `Plate-Loaded Machine` · `Assisted Machine`

> Estendido em 2026-06-10 (ver `docs/exercises/catalog-maintenance.md` §1):
> - `Selectorized Machine` — máquinas de placas com pino (chest press, leg extension…)
> - `Plate-Loaded Machine` — máquinas articuladas/iso-laterais de anilhas (Hammer Strength, lever row/pulldown)
> - `Assisted Machine` — Graviton e similares (pull-up/dip assistido); `Bodyweight` fica como secondary
>
> Lacuna nova de vocabulário? NÃO mapear para valor "parecido" — registrar em `conventions` no
> `_manifest.json` e decidir o valor novo no mesmo PR, atualizando este spec e o set
> `PRIMARY_EQUIPMENT` em `scripts/validate_exercise_seeds.py`.

---

## Mudanças no Schema SQLite

Nova migration (v17):

```sql
ALTER TABLE exercises ADD COLUMN movement_pattern TEXT;
ALTER TABLE exercises ADD COLUMN musculo_alvo_list TEXT; -- JSON array, substitui musculo_alvo
ALTER TABLE exercises ADD COLUMN stabilizers TEXT;       -- JSON array
ALTER TABLE exercises ADD COLUMN execution_type TEXT;
ALTER TABLE exercises ADD COLUMN name_variations TEXT;   -- JSON array
ALTER TABLE exercises ADD COLUMN primary_equipment TEXT;
ALTER TABLE exercises ADD COLUMN secondary_equipment TEXT;

-- Split da tabela exercise_alternatives
CREATE TABLE exercise_equivalent_alternatives (
  exercicio_id TEXT NOT NULL,
  alternativa_id TEXT NOT NULL,
  PRIMARY KEY (exercicio_id, alternativa_id)
);

CREATE TABLE exercise_muscle_group_alternatives (
  exercicio_id TEXT NOT NULL,
  alternativa_id TEXT NOT NULL,
  PRIMARY KEY (exercicio_id, alternativa_id)
);
```

---

## Mudanças no `ExerciseRepository`

Arquivo: `apps/mobile/src/domain/exercises/repositories/ExerciseRepository.ts`

```typescript
// Substitui listAlternativas(id)
listEquivalentAlternativas(exercicioId: string): Promise<Exercise[]>
listMuscleGroupAlternativas(exercicioId: string): Promise<Exercise[]>

// Busca expandida
findByNameOrVariation(query: string): Promise<Exercise[]>
```

---

## Mudanças no `SugerirSubstitutosUseCase`

Arquivo: `apps/mobile/src/application/sessoes/use-cases/SugerirSubstitutosUseCase.ts`

### Novo esquema de camadas

| Camada | Label no modal | Critério |
|--------|---------------|---------|
| 0 | ⭐ Substitutos predefinidos | `listEquivalentAlternativas` manual |
| 1 | Quase igual | Mesmo `movement_pattern` **E** interseção de `musculo_alvo[]` |
| 2 | Similar | Mesmo `movement_pattern` **OU** alta sobreposição de `musculo_alvo[]` (≥ 50%) |
| 3 | Mesmo grupo | Mesmo `groupMuscle` — comportamento atual de camada 2 |

### Novo campo `CandidatoSubstituto`

```typescript
export interface CandidatoSubstituto {
  exercicio: ExercisePrimitives;
  predefinido: boolean;
  similaridade: 'equivalente' | 'similar' | 'mesmo_grupo'; // substitui enfaseDiferente: boolean
  ultimaExecucao: UltimaExecucaoValida | null;
}
```

---

## Pesquisa de Dados — Enriquecimento + Completude (por grupo muscular)

Usar a skill `exercise-intelligence-research` para pesquisar o **universo real de cada sub-grupo** (ex: `peito_press` = todos os supinos/presses de peito relevantes, não só os 18 que já têm GIF/seed). Cada sessão produz duas coisas:

1. **Enriquece** os registros já presentes no catálogo (entradas `seed-ex-XXX` / `gif-ex-XXX`), preenchendo os campos biomecânicos.
2. **Cria registros novos** para os exercícios do sub-grupo que ainda não existem no catálogo — `gif_path: null`, pelo pipeline normal de seeds, com os mesmos campos preenchidos na criação.

Uma sessão = cobertura completa do sub-grupo. A presença de GIF **não** limita o que entra (ver regra global no topo).

**Convenção de ID para registros novos:** continuar a sequência `seed-ex-NNN` a partir de `seed-ex-044` (último usado: `seed-ex-043`). Não renomear IDs existentes — eles são referenciados em `equivalent_alternatives` / `muscle_group_alternatives` e nas sessões de treino.

No manifest, cada sessão registra em `covers` tanto os IDs enriquecidos quanto os IDs novos criados; usar `research_notes` para listar quais foram criados e por quê.

Campos obrigatórios por exercício pesquisado:
- `movement_pattern`
- `detailed_muscles` (→ `musculo_alvo[]`)
- `stabilizers`
- `primary_equipment` / `secondary_equipment`
- `execution_type`
- `name_variations`
- `equivalent_alternatives`
- `muscle_group_alternatives`
- `confidence` + `sources_confirmed` (para validação interna, não persistido no app)

---

## Pesquisa de Dados — Expansão (novas categorias)

> Diferente do enriquecimento acima, estas sessões **criam registros novos** — não há GIFs, IDs ou dados prévios para basear a pesquisa, e os GIFs **não devem ser usados como critério de escopo** (o catálogo de mídia existente cobre só força; isso não deve limitar quais exercícios de cardio/mobilidade/reabilitação entram no catálogo).

### Sessões planejadas

Pesquisa completa por sub-grupo, no mesmo padrão de profundidade das sessões de força (15-20 exercícios cada):

| Sessão | Escopo |
|--------|--------|
| `cardio_steady_state` | Cardio contínuo/constante: esteira, bike, elíptico, remo, escada, natação |
| `cardio_hiit_funcional` | Cardio intervalado e funcional: burpees, corda, kettlebell swings, battle ropes, box jumps, sprints |
| `mobilidade_inferior` | Mobilidade de quadril, joelho e tornozelo |
| `mobilidade_superior_coluna` | Mobilidade de ombro, coluna torácica, punho e pescoço |
| `alongamento_estatico` | Alongamentos estáticos para os principais grupos musculares |
| `aquecimento_dinamico` | Aquecimento dinâmico pré-treino (drills full-body) |
| `reabilitacao_ombro_cotovelo` | Reabilitação/prevenção de ombro e cotovelo (manguito rotador, escápula) |
| `reabilitacao_quadril_joelho` | Reabilitação/prevenção de quadril e joelho |
| `reabilitacao_lombar_core` | Reabilitação/prevenção lombar e estabilização de core |

### Sessões adicionais — força com equipamentos sub-representados

O vocabulário controlado de `primary_equipment` (ver seção acima) inclui equipamentos que o catálogo atual praticamente não usa: `Kettlebell`, `Landmine`, `Suspension Trainer`, `Hack Squat Machine`, `Leg Press`, `Pec Deck`, `Chest Supported Row`, `Resistance Band`. Estas sessões pesquisam e criam exercícios de força/hipertrofia novos para preencher essas lacunas — mesmo padrão de criação (não enriquecimento) das sessões de expansão acima:

| Sessão | Escopo |
|--------|--------|
| `forca_kettlebell` | Swings, snatches, cleans, goblet squats, Turkish get-ups, complexos |
| `forca_landmine` | Press, remadas, rotações e agachamentos com landmine |
| `forca_suspension_trainer` | Remadas, presses, flexões e core no TRX/suspension trainer |
| `forca_maquinas_especializadas` | Variações específicas de hack squat, leg press, peck deck e chest-supported row |
| `forca_elastico_funcional` | Força funcional com faixas elásticas (presses, remadas, extensões, ativações) |

### Regras específicas

- Os registros são criados pelo pipeline normal de seeds (`ExerciseSeedLoader` → `CreateExerciseUseCase`), com `gif_path: null`. Mídia, se vier a existir, é adicionada depois — fora do escopo desta pesquisa.
- Os campos de enriquecimento (`movement_pattern`, `musculo_alvo[]`, `stabilizers[]`, `execution_type`, `name_variations[]`, `primary_equipment` / `secondary_equipment`) são preenchidos **na criação** — não há uma segunda passada de enriquecimento para esses registros.
- `movement_pattern` pode ser `null` quando o vocabulário de padrões de movimento (focado em força) não se aplica (ex: cardio contínuo, alongamento estático passivo) — documentar o motivo nas `research_notes` da sessão no manifest.
- `category` passa a usar os valores ainda não exercitados no catálogo: `Cardio`, `Warm-Up`, `Mobility`, `Flexibility`, `Rehabilitation`.
- `equivalent_alternatives` / `muscle_group_alternatives` só fazem sentido quando há uma noção real de substituição (ex: variações de alongamento por ângulo/equipamento); registros isolados podem ficar com arrays vazios.

---

## Ordem de Implementação Sugerida

1. Adicionar campos à entidade `Exercise` e migration v17
2. Atualizar `ExerciseRepository` + implementação SQLite
3. Pesquisar e enriquecer os exercícios de força já existentes (skill `exercise-intelligence-research`, sessões de enriquecimento)
4. Pesquisar e criar os novos exercícios de cardio/mobilidade/aquecimento/alongamento/reabilitação (skill `exercise-intelligence-research`, sessões de expansão)
5. Atualizar `SugerirSubstitutosUseCase` com as 3 camadas
6. Atualizar `SubstituirExercicioModal` para exibir os novos labels
7. Expandir busca para incluir `name_variations`
