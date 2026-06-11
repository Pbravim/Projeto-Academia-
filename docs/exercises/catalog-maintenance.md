# Manutenção do Catálogo de Exercícios — Planos e Convenções

> Criado em 2026-06-10 a partir da avaliação do sub-projeto 5.
> Decisões registradas: escopo completo mantido (incl. sessões de expansão — dados importam para escalar o app);
> catálogo único (all-in-one) com discriminador de modalidade; GIFs serão recriados manualmente pelo Pedro
> (incl. os existentes, de baixa qualidade); JSONs de seed são temporários — virarão o seed default do app
> (fonte canônica = pesquisa atual, não as migrations).

---

## 1. Plano: corrigir o vocabulário de `primary_equipment` — ✅ CONCLUÍDO 2026-06-10

> **Status:** implementado nesta data. Vocabulário estendido no spec e no validador
> (`Selectorized Machine`, `Plate-Loaded Machine`, `Assisted Machine`); retag aplicado:
> gif-ex-018/019 + seed-ex-049/050 → Selectorized Machine; seed-ex-065 + seed-ex-076 →
> Plate-Loaded Machine; seed-ex-063 + gif-ex-052 → Assisted Machine (secondary Bodyweight).
> `catalog_version` bumpado em peito_press (3) e costas_pull_vertical (3) para o loader
> re-aplicar nos devices. Conventions do `_manifest.json` atualizadas. Validador: OK, 0 erros.
> **Bônus:** corrigida a fiação ausente — `costas_pull_vertical.json` e `costas_pull_horizontal.json`
> não eram carregados em `mobileDependencies.ts` (só peito); agora os 4 seeds são carregados.
> A convenção para lacunas futuras (abaixo) permanece válida. → Seguimos para o §3 (review_flags).

### Problema
O vocabulário controlado (spec `2026-06-05-subproject-5-exercise-intelligence.md`) não tem valores para
máquinas genéricas, então as sessões de pesquisa acumularam mapeamentos-gambiarra documentados no
`_manifest.json`:

| Exercício | Mapeado para | Problema |
|---|---|---|
| Chest press machine (gif-ex-018, seed-ex-051/052, seed-ex-065) | `Pec Deck` | Pec Deck é máquina de FLY; o algoritmo de substituição pode tratar press e fly como equipamento-equivalentes |
| Graviton / assisted pull-up & dip (gif-ex-052, seed-ex-063) | `Bodyweight` (+ secondary "Maquina Assistida") | Máquina assistida não é peso corporal puro; filtro por equipamento mente |
| Puxada na máquina articulada (seed-ex-076) | `Cable` | Lever machine não usa cabo |
| Remada na máquina (gif-ex-044) | `Chest Supported Row` | Aceitável (valor existe), mas é o único uso — verificar consistência |

### Correção (fazer ANTES das próximas sessões de pesquisa)

**Passo 1 — Estender o vocabulário.** Adicionar ao spec e a qualquer enum futuro:
- `Selectorized Machine` — máquinas de placas com pino (chest press, lat pulldown machine, leg extension…)
- `Plate-Loaded Machine` — máquinas articuladas de anilhas (Hammer Strength, lever row/press, T-bar com apoio)
- `Assisted Machine` — Graviton e similares (pull-up/dip assistido)

**Passo 2 — Retag dos registros existentes** (buscar nos seeds + migration por estes IDs):
- `Pec Deck` → `Selectorized Machine` onde o movimento é press/pulldown (manter `Pec Deck` só para fly/voador real)
- seed-ex-063, gif-ex-052 → `Assisted Machine` (manter Bodyweight em secondary, ou inverter)
- seed-ex-076 → `Plate-Loaded Machine` ou `Selectorized Machine` conforme o tipo
- Revisar os `conventions` de cada sessão no `_manifest.json` e atualizar as notas

**Passo 3 — Atualizar o validador.** `scripts/validate_exercise_seeds.py` tem o vocabulário hardcoded
no set `PRIMARY_EQUIPMENT` — adicionar os valores novos lá no mesmo commit (o validador falha de
propósito se um seed usar valor fora do set).

**Passo 4 — Re-rodar** `python scripts/validate_exercise_seeds.py` e marcar nos `conventions` das
sessões do manifest que o retag foi feito.

### Convenção para lacunas futuras de vocabulário
Quando uma sessão de pesquisa encontrar equipamento sem valor no vocabulário:
1. **NÃO** mapear para um valor "parecido" — isso distorce a substituição silenciosamente.
2. Registrar a lacuna na seção `conventions` da sessão no `_manifest.json` (como hoje).
3. Decidir na hora: ou o equipamento merece valor novo (adicionar ao spec + validador no mesmo PR),
   ou o exercício é roteado para uma sessão de expansão futura (`routed_to_other_sessions`).
4. Nunca deixar a decisão implícita: a entrada no manifest é obrigatória.

---

## 2. Plano: normalizar `group_muscle` (comma-string → array) — ✅ CONCLUÍDO 2026-06-10 (design revisado)

> **Status:** implementado com um design mais simples que o plano original abaixo.
> **Desvio do plano e por quê:** os passos 2–3 (migration v17+ com coluna JSON `group_muscles`
> + escrita paralela) foram DESCARTADOS. Motivo descoberto na implementação: o contrato de sync
> (`ExerciseSyncRow.groupMuscle: string` em `@academia/contracts`, usado por `getDirty`/`applyServerRows`)
> e o catálogo embutido nas migrations consomem a coluna `group_muscle` como string — uma coluna nova
> forçaria mudanças na API/contracts agora (que o passo 7 adiava para o sub-2) e uma migration com backfill.
> **Design final:** a coluna SQL `group_muscle TEXT` (comma-joined) permanece como serialização;
> o domínio enxerga só `groupMuscles: string[]` (`ExercisePrimitives`); join/split confinados a
> `serializeGroupMuscles`/`parseGroupMuscles` no `SQLiteExerciseRepository`. Objetivo do plano
> (eliminar `split(',')` espalhado por application/UI) atingido sem migration e sem risco a dados.
> **O que mudou:** entity + validação `requireGroups` (Exercise.ts); Create/Update use cases recebem
> `groupMuscles: string[]`; `SugerirSubstitutosUseCase` usa o array (snapshot da sessão continua string,
> é dado congelado); 3 use cases de sessão gravam `groupMuscles.join(', ')` no snapshot; seeds JSON
> convertidos para `group_muscles` array (105 registros); `SeedExerciseEntry` atualizado; validador
> exige array e rejeita o campo legado; UI (9 arquivos) usa o array — agrupamento por `groupMuscles[0]`,
> display via `join(', ')`. Form multi-select mantém draft como string com vírgulas (formato do
> `MultiChipPicker`), convertido no submit do controller.
> **Contracts/API (passo 7):** inalterados de propósito — decisão de shape (`string[]` no wire) fica
> para o sub-projeto 2, como o plano já previa.
> → Plano §2 encerrado; plano original mantido abaixo para referência histórica.

### Problema
`group_muscle` é string com vírgulas (`"Peito, Triceps, Ombros"`) enquanto `musculo_alvo` já é array.
Split por vírgula é frágil (espaços, acentos, ordem) e a UI agrupa o catálogo por esse campo.

### Plano (ordem de execução)
1. **Domínio:** `Exercise.ts` — `groupMuscle: string` → `groupMuscles: string[]` em
   `ExercisePrimitives`/`create()`/`restore()`/`update()`. Manter validação "não-vazio".
2. **Migration SQLite (v17+):** nova coluna `group_muscles TEXT` (JSON array, padrão das outras:
   `musculo_alvo_list`, `stabilizers`); backfill com
   `json_array(...)` a partir do split da coluna antiga (trim de espaços). NÃO editar migrations passadas.
3. **Repositórios:** `SQLiteExerciseRepository` + InMemory — ler/escrever o JSON array;
   manter a coluna antiga escrita em paralelo por 1 versão (rollback barato), remover na migration seguinte.
4. **Seeds:** converter `"group_muscle": "Peito, Triceps, Ombros"` → `"group_muscles": ["Peito","Triceps","Ombros"]`
   nos 4 JSONs (script de uma linha) + atualizar o validador para exigir array não-vazio.
5. **UI/Presenters:** `buildExerciseCatalogViewModel` agrupa pelo PRIMEIRO elemento (comportamento atual
   de fato, já que hoje o agrupamento usa a string inteira — decidir: seção única pelo primário, ou o
   exercício aparece em múltiplas seções; recomendado: primário só, com os demais como chips).
6. **Use cases:** `CreateExercise`/`UpdateExercise` aceitam array; multi-select da UI já existe
   (o form já trata grupo como multi-select — verificar o formato que ele envia hoje).
7. **Sync/contracts (sub-2):** definir o campo já como `string[]` no `@academia/contracts` — não
   propagar a comma-string para a API.

Esforço estimado: 1 sessão. Risco: baixo (padrão de migration + backfill já usado no sub-0).

---

## 3. Convenção: `review_flags` estruturado nos seeds — ✅ CONCLUÍDO 2026-06-10

> **Status:** implementado. Flag do Pullover (gif-ex-029) migrado da prosa do manifest para
> `review_flags` estruturado em `costas_pull_vertical.json`; validador ganhou `--list-flags`
> (1 flag aberto). O app ignora o campo. → Seguimos para o §2 (normalização de group_muscle).

### O problema que resolve
Hoje, dúvidas de classificação ficam só em prosa no manifest. Exemplo real (`costas_pull_vertical.research_notes`):
o Pullover (gif-ex-029) foi classificado `Vertical Pull` por mecânica (arco overhead→tronco), mas a literatura
de EMG mostra o peitoral esternal como motor dominante (~50%) vs grande dorsal (~22%). Se o ranking de
substituição sugerir pullover como "quase igual" a uma puxada alta, o resultado parecerá errado ao usuário —
e a única pista está enterrada num parágrafo do manifest.

### Convenção
Adicionar campo opcional no REGISTRO do seed (não no manifest):

```json
"review_flags": [
  {
    "field": "movement_pattern",
    "concern": "Vertical Pull por mecânica, mas EMG mostra peitoral dominante (~50%) vs dorsal (~22%)",
    "revisit_when": "se o ranking de substituição vs puxadas parecer errado",
    "flagged_at": "2026-06-07"
  }
]
```

- O app IGNORA o campo (como `_comment`); é metadado de curadoria.
- O validador pode listar todos os flags (`--list-flags`) para revisão periódica.
- Quando o flag for resolvido, remover do registro e anotar na sessão do manifest.
- Migrar os flags em prosa existentes (pullover é o único conhecido) na próxima sessão de pesquisa de costas/ombros.

---

## 4. Validador de seeds (CI) — ✅ CONCLUÍDO 2026-06-10

`scripts/validate_exercise_seeds.py` — roda em <1s, exit 1 em erro.

Checa: IDs únicos; alternativas resolvem (contra seeds + catálogo da migration); `movement_pattern`,
`primary_equipment`, `execution_type` dentro dos enums; `musculo_alvo` array não-vazio; manifest
`covers[]` resolvem, sem overlap entre sessões, `exercise_count == len(covers)`; sem auto-referência.

**Rodar após cada sessão de pesquisa** (e antes de commitar seeds):
```
python scripts/validate_exercise_seeds.py
```
**CI:** `.github/workflows/validate-exercise-seeds.yml` roda o validador em push/PR que toque
seeds, validador ou `ExpoSQLiteDatabaseClient.ts` (o repo já tinha workflows — claude.yml/claude-code-review.yml).
O validador também checa `group_muscles` (array obrigatório; campo legado `group_muscle` string é erro)
e tem `--list-flags` para os review_flags (§3). → Todos os planos deste doc executados; §2 documentado abaixo.

---

## 5. Fonte da verdade do catálogo (decisão 2026-06-10)

- A pesquisa atual (sessões do `_manifest.json` + seeds JSON) é a fonte canônica dos DADOS.
- Os JSONs em `seeds/` são temporários como mecanismo: no futuro viram o seed default do app,
  substituindo os inserts embutidos nas migrations do `ExpoSQLiteDatabaseClient.ts`.
- Até lá, enriquecimentos de IDs existentes (gif-ex-*, seed-ex-001..043) acontecem via seeds JSON,
  nunca editando migrations passadas.
- GIFs: serão recriados manualmente (incl. os 175 existentes, qualidade baixa). `gif_path: null` nos
  seeds novos NÃO é dívida de pesquisa — mídia é um projeto separado.

---

## 6. Extensão do vocabulário de `movement_pattern` (raises de deltoide) — 2026-06-10

> **Sessão:** `ombros_lateral`. O enum de `movement_pattern` não tinha padrão para os raises
> single-joint de deltoide (elevação lateral/frontal, crucifixo invertido, remada alta).

- **`Abduction`** — raise single-joint de deltoide no plano frontal/sagital (elevação lateral,
  elevação frontal, remada alta). Mantém os raises fora do match com `Vertical Push` (desenvolvimentos):
  sem ele, uma elevação lateral (`deltoide_lateral`) rankearia como substituto "similar" de um
  desenvolvimento (`deltoide_anterior`+`deltoide_lateral`, ~50% de overlap de músculo) — errado.
- **`Horizontal Abduction`** — crucifixo invertido / reverse fly / face pull (abdução no plano
  transverso; espelho de `Horizontal Adduction` que já existia para os flys de peito).

Atualizado no mesmo commit: spec sub-5 (§ enum), `scripts/validate_exercise_seeds.py`
(`MOVEMENT_PATTERNS`), e a skill `exercise-intelligence-research` (lista de padrões). Mesma
disciplina da extensão de equipamento (§1): nunca usar um padrão "parecido" — estender o vocabulário
nos 3 lugares no mesmo PR.
