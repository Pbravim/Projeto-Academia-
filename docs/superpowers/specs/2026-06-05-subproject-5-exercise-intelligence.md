# Sub-projeto 5: Exercise Intelligence

> Criado em `2026-06-05`. Sem dependência de backend — pode ser desenvolvido em paralelo com o Sub-projeto 1.

---

## Objetivo

Enriquecer o modelo de dados de exercícios com informações biomecânicas estruturadas e melhorar o engine de sugestão de substitutos com camadas de similaridade graduadas.

Funcionalidades habilitadas pelo sub-projeto:
- Substituição por equivalência biomecânica (quase igual → similar → mesmo grupo)
- Busca por variações de nome
- Filtro por equipamento com vocabulário controlado
- Análise de músculos-alvo com granularidade real

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
// 'Horizontal Push' | 'Vertical Push' | 'Horizontal Pull' | 'Vertical Pull'
// | 'Squat' | 'Hinge' | 'Lunge' | 'Rotation' | 'Anti-Rotation'
// | 'Carry' | 'Gait' | 'Jump' | 'Sprint'

musculo_alvo: string[]          // era string | null — agora array de primários
stabilizers: string[]           // músculos estabilizadores (informativo)
execution_type: ExecutionType   // 'Unilateral' | 'Bilateral' | 'Can Be Both'
name_variations: string[]       // nomes alternativos para busca
primary_equipment: string | null   // vocabulário controlado (ver abaixo)
secondary_equipment: string | null // ex: banco, rack, cabo
```

### Vocabulário controlado para equipment

`Barbell` · `Dumbbell` · `Cable` · `Smith Machine` · `Hack Squat Machine` · `Leg Press` · `Pec Deck` · `Chest Supported Row` · `Bodyweight` · `Resistance Band` · `Kettlebell` · `Landmine` · `Suspension Trainer`

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

## Pesquisa de Dados

Usar a skill `exercise-intelligence-research` para pesquisar e gerar os registros JSON de cada exercício, depois popular nos seeds do catálogo e nos dados existentes.

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

## Ordem de Implementação Sugerida

1. Adicionar campos à entidade `Exercise` e migration v17
2. Atualizar `ExerciseRepository` + implementação SQLite
3. Pesquisar e popular dados dos exercícios do catálogo (skill `exercise-intelligence-research`)
4. Atualizar `SugerirSubstitutosUseCase` com as 3 camadas
5. Atualizar `SubstituirExercicioModal` para exibir os novos labels
6. Expandir busca para incluir `name_variations`
