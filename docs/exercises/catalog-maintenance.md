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

---

## 7. Extensão do vocabulário de `movement_pattern` (flexão de cotovelo / roscas) — 2026-06-13

> **Sessão:** `biceps`. O enum de `movement_pattern` não tinha padrão para as roscas single-joint
> (flexão de cotovelo). Sem ele, uma rosca rankearia como substituto "similar" de barra fixa /
> puxada supinada / remada supinada — compostos que recrutam o bíceps como sinergista.

- **`Elbow Flexion`** — rosca/curl single-joint (rosca direta com barra/EZ, martelo, inversa,
  Scott/preacher, concentrada, Zottman, drag, spider, Bayesian, no cabo, na máquina). Mantém as
  roscas com padrão próprio; chin-up (seed-ex-009), puxada supinada (seed-ex-073) e remadas
  ficam em `Vertical Pull` / `Horizontal Pull` (bíceps lá é estabilizador, não `musculo_alvo`),
  então a substituição não cruza os dois mundos.

Atualizado no mesmo commit: spec sub-5 (§ enum), `scripts/validate_exercise_seeds.py`
(`MOVEMENT_PATTERNS`), e a skill `exercise-intelligence-research` (lista de padrões + nota de uso).
Mesma disciplina das extensões §1 e §6. A futura sessão `triceps_*` deve adicionar `Elbow Extension`
de forma simétrica.

---

## 8. Extensão do vocabulário de `movement_pattern` (extensão de cotovelo / tríceps) — 2026-06-13

> **Sessões:** `triceps_push_down` + `triceps_overhead`. Simétrico ao §7 (`Elbow Flexion`).

- **`Elbow Extension`** — extensão de cotovelo single-joint: pushdown/pulley (bar/corda/invertido),
  coice/kickback, testa/skullcrusher, francês/overhead extension, na máquina, Tate press. Mantém as
  isolações de tríceps com padrão próprio.
- **Compostos de tríceps ficam em `Horizontal Push`** (multi-articular): supino fechado, mergulho/dips
  (peso corporal, paralelas, assistido, máquina, banco), flexão pegada fechada/diamante, JM press.
  Assim um pushdown (`Elbow Extension`, `triceps_lateral_medial`) só rankeia como "similar" (Layer 2)
  de um supino fechado (`Horizontal Push`, mesmo `musculo_alvo`), não como "quase igual".
- **Cabeça-alvo:** `triceps_cabeca_longa` para overhead/testa (braço acima da cabeça alonga a porção
  longa); `triceps_lateral_medial` para pushdown/kickback/dips/close-press/Tate.

Atualizado no mesmo commit: spec sub-5 (§ enum), `scripts/validate_exercise_seeds.py`
(`MOVEMENT_PATTERNS`), e a skill `exercise-intelligence-research` (lista de padrões + nota de uso).
Retag de máquina (§1): gif-ex-094/095/101/106 → Selectorized Machine; gif-ex-099 (Graviton) →
Assisted Machine + secondary Bodyweight. Notas brutas da pesquisa em `research-triceps.md`.

---

## 9. Extensão do vocabulário de `movement_pattern` (extensão de joelho / quadríceps) — 2026-06-13

> **Sessão:** `quadriceps`. Simétrico a §7/§8.

- **`Knee Extension`** — extensão de joelho single-joint: cadeira extensora (leg extension) e sissy squat
  (joelho-dominante, quadril fixo). Mantém a isolação de quadríceps com padrão próprio.
- **Compostos de quadríceps ficam em `Squat`/`Lunge`** (multi-articular quadril+joelho): agachamentos
  (livre/frontal/smith/máquina/hack/goblet/sumo/pistol), leg press, afundos/lunges/passadas/búlgaro/step-up.
  Assim a cadeira extensora (`Knee Extension`, `quadriceps`) só rankeia como "similar" (Layer 2 — overlap de
  `quadriceps`) de um agachamento (`Squat`), não como "quase igual".

Vocabulário usado: `Leg Press` (seed-ex-035, gif-ex-159) e `Hack Squat Machine` (seed-ex-113) — valores
do vocabulário controlado que estavam sem uso até aqui. Retag: gif-ex-154 (agachamento na máquina) →
Selectorized Machine. Atualizado no mesmo commit: spec sub-5, validador (`MOVEMENT_PATTERNS`), skill.
A futura sessão `posterior_gluteos` deve adicionar `Knee Flexion` (mesa flexora/leg curl/nordic) de forma
simétrica. Notas brutas em `research-quadriceps.md`.

---

## 10. Extensão do vocabulário de `movement_pattern` (cadeia posterior / glúteos) — 2026-06-13

> **Sessão:** `posterior_gluteos`. Dois padrões novos + uma lacuna documentada.

- **`Knee Flexion`** — flexão de joelho single-joint, isquiotibial: mesa flexora (lying), cadeira flexora
  (seated), flexora em pé, flexora no cabo, nordic. Distinto de `Hinge` (stiff/terra/bom dia = quadril-
  dominante, mesmo músculo isquiotibial) — sem isso, um leg curl rankearia como "similar" a um stiff.
- **`Hip Extension`** — extensão de quadril glúteo-dominante em ponte/coice: hip thrust, glute bridge,
  elevação pélvica, kickback/coice (cabo/banda/4-apoios), frog pump, glúteo na máquina. Distinto de `Hinge`
  para o hip thrust não rankear como "quase igual" a um stiff/terra.
- **Lacuna de vocabulário (documentada, não estendida):** adução/abdução de quadril (cadeira adutora
  gif-ex-136, adutora no cabo gif-ex-152, cadeira abdutora seed-ex-119) não têm valor no enum — usam
  `movement_pattern: null` e agrupam por `musculo_alvo` (`adutores` / `gluteos`). NÃO reusei `Abduction`
  (reservado para raises de deltoide — reusar faria a abdutora rankear como "similar" de elevação lateral).
  Se uma sessão futura precisar, criar `Hip Adduction`/`Hip Abduction` dedicados (spec + validador + skill).

Vocabulário de equipamento ativado pela 1ª vez: `Kettlebell` (gif-ex-164, stiff unilateral com kettlebell).
Retag de máquina (§1): seed-ex-038/gif-ex-144 (flexora) + gif-ex-136 (adutora) + seed-ex-118/119/121 →
Selectorized Machine. `Clean` (gif-ex-137) ganhou um `review_flag` (category Power/olímpico ausente do enum).
Atualizado no mesmo commit: spec sub-5, validador (`MOVEMENT_PATTERNS`), skill. Notas em
`research-posterior_gluteos.md`.

---

## 11. Extensão do vocabulário de `movement_pattern` (core / abdome) — 2026-06-13

> **Sessão:** `abdome`. Quatro padrões novos de tronco; `Rotation`/`Anti-Rotation` já existiam.

- **`Trunk Flexion`** — flexão de coluna (costelas → pelve): crunch, sit-up, crunch no banco/declinado,
  crunch na máquina (gif-ex-117), crunch na polia (gif-ex-118/119), crunch pernas elevadas, sit-up com peso.
  Reto abdominal (ênfase superior). musculo_alvo `abdomen`.
- **`Hip Flexion`** — flexão de quadril (pelve → costelas) / "abdominal inferior": elevação de pernas
  (deitado seed-ex-032 / suspenso seed-ex-122), crunch reverso, V-up/jackknife (gif-ex-120), flexão de
  quadril no banco/bola, flutter/alternando pernas. Reto inferior + flexores de quadril. musculo_alvo `abdomen`.
- **`Lateral Flexion`** — flexão lateral de tronco (plano frontal): flexão lateral, abdominal lateral, flexão
  lateral com bola, e a **prancha lateral** (seed-ex-127) como variante isométrica (anti-flexão-lateral
  dobrada aqui para não fragmentar o enum num padrão de uso único). Oblíquos + QL. musculo_alvo `obliquo`.
- **`Anti-Extension`** — bracing isométrico resistindo à extensão da coluna: prancha (seed-ex-031), dead bug
  (gif-ex-123), rollout na roda abdominal (seed-ex-123). Reto + core profundo. musculo_alvo `abdomen`/`core`.
- **`Rotation` (já existia)** — rotação dinâmica de tronco: abdominal oblíquo (seed-ex-033), oblíquo na polia
  (gif-ex-126), Russian twist (seed-ex-125), lenhador no cabo/woodchopper (seed-ex-126), bicicleta (seed-ex-128).
- **`Anti-Rotation` (já existia)** — resistir à rotação: Pallof press (seed-ex-124), 1º anti-rotação do catálogo.

Sem os 4 padrões novos, crunch + leg raise + prancha cairiam todos em `null` e o algoritmo os agruparia só
por `musculo_alvo` (`abdomen`) como "quase iguais", apesar de estímulos biomecânicos distintos.

**Lacuna de equipamento (documentada, NÃO estendida):** a **roda abdominal** (ab wheel) não tem valor no
vocabulário controlado. Mapeada para `primary_equipment: "Bodyweight"` + `secondary_equipment: "Roda Abdominal"`
(precedente do banco romano gif-ex-053 / apparatus: movimento de peso corporal sobre uma ferramenta). Mesma
regra para a bola suíça (`Bodyweight` + `Bola Suica`). Evita estender `PRIMARY_EQUIPMENT` para ferramentas
de uso único. Retag de máquina (§1): gif-ex-117 (crunch na máquina) → Selectorized Machine.

Roteados (sessões de expansão): Landmine Twist → `forca_landmine`; suspended jack-knife/TRX →
`forca_suspension_trainer`; Turkish get-up + farmer's/suitcase carry → `forca_kettlebell`; ball slam +
mountain climber → `cardio_hiit_funcional`; bird dog + superman → `reabilitacao_lombar_core` (extensão/
estabilização lombar, não flexão abdominal). Atualizado no mesmo commit: spec sub-5, validador
(`MOVEMENT_PATTERNS`), skill. Notas brutas em `research-abdome.md`.

---

## 12. Extensão do vocabulário de `movement_pattern` (flexão plantar / panturrilha) — 2026-06-13

> **Sessão:** `panturrilha` (última sessão de força do manifest). Um padrão novo + granularidade de músculo.

- **`Plantar Flexion`** — flexão plantar single-joint do tornozelo: elevação de panturrilha em pé
  (seed-ex-042, gif-ex-158), sentada (seed-ex-043, gif-ex-175), no leg press (seed-ex-129), donkey
  (seed-ex-130). É o ÚNICO padrão da sessão — sem ele, todas as elevações cairiam em `null`.
- **Gastrocnêmio × sóleo via `musculo_alvo` (códigos novos `gastrocnemio` / `soleo`):** como tudo
  compartilha um único padrão, a separação dos dois estímulos reais é feita pelo músculo, não por um
  segundo pattern. **Joelho ESTENDIDO (em pé)** = `gastrocnemio` (o gastroc cruza o joelho e só contribui
  com o joelho reto). **Joelho FLETIDO ~90° (sentado)** = `soleo` (gastroc em insuficiência ativa; sóleo
  domina). O músculo não-dominante vai para `stabilizers` (ExRx: em pé recruta os dois; sentado isola o
  sóleo). Resultado: em pé↔em pé e sentado↔sentado = Layer 1 ("quase igual"); em pé↔sentado = Layer 2
  ("similar", mesmo pattern). group_muscles continua `Panturrilha` (display).

Retag de máquina (§1): panturrilha sentada (seed-ex-043) = lever/anilha → `Plate-Loaded Machine`
(ExRx LVSeatedCalfRaise plate-loaded); panturrilha em pé (seed-ex-042) = stack/pino com ombreiras →
`Selectorized Machine`. Leg press calf raise (seed-ex-129) → `Leg Press` (vocabulário controlado).
Tibialis raise (dorsiflexão / tibial anterior) é músculo ANTERIOR diferente — roteado (fora de panturrilha).
Universo pequeno: 2 estímulos reais (gastroc em pé / sóleo sentado), curva +2 → +0 em 10+ bases.
Atualizado no mesmo commit: spec sub-5, validador (`MOVEMENT_PATTERNS`), skill. Notas em
`research-panturrilha.md`. **Conclui as 13 sessões de força do manifest** (`pending_sessions` vazio;
restam só as sessões de expansão — cardio/mobilidade/alongamento/reabilitação/força-por-equipamento).

---

## 13. Portão de prontidão das sessões de expansão (UI/backend) — 2026-06-13

> Verificação pedida antes de criar os seeds de expansão: "garantir que o resto do código (UI e
> backend) aceita estes updates; se não estiver pronto, só atualizar a documentação."

Resultado: as 14 sessões de expansão se dividem em **2 grupos** por prontidão do app.

### `new_strength` (5 sessões) — PRONTO, criar seeds normalmente
`forca_kettlebell`, `forca_landmine`, `forca_suspension_trainer`, `forca_maquinas_especializadas`,
`forca_elastico_funcional`. São exercícios de **força** com semântica idêntica aos já existentes
(séries × reps × carga), group_muscles musculares e `primary_equipment` já no vocabulário controlado.
O catálogo (`buildExerciseCatalogViewModel`) e o picker (`ExercisePickerGroup`) os agrupam corretamente;
`SerieRegistrada` (kg × reps) os registra. Sem mudança de código necessária. movement_pattern reusa
padrões existentes (Hinge/Squat/Vertical Push/Horizontal Pull/Carry…); olímpicos seguem o precedente
do clean (Hinge + review_flag).

### `new_categories` (9 sessões) — BLOQUEADO, só documentar
`cardio_steady_state`, `cardio_hiit_funcional`, `mobilidade_inferior`, `mobilidade_superior_coluna`,
`alongamento_estatico`, `aquecimento_dinamico`, `reabilitacao_ombro_cotovelo`,
`reabilitacao_quadril_joelho`, `reabilitacao_lombar_core`. O app **não modela** estes tipos:

- **`SerieRegistrada`** (`domain/sessoes/entities/SerieRegistrada.ts`) só tem `cargaKg` + `repeticoes`
  e **exige `repeticoes >= 1`** (inteiro). Um cardio por tempo/distância ou um alongamento por segundos
  de sustentação **não é registrável** (nem passa na validação).
- **`SessaoExercicio` / `TreinoExercicio`** só têm `seriesRecomendadas` / `execucoesRecomendadas` /
  `cargaPadrao` / `tempoDescansoSegundos` — **sem** duração, distância ou tempo de sustentação por exercício.
- **Catálogo e picker** agrupam **só por `group_muscles`**; `category` é apenas subtítulo de display.
  Nenhuma UI ramifica por `category`. Um exercício Cardio/Corpo-inteiro viraria uma seção solta e, ao ser
  escolhido para um treino, só permitiria logar séries×reps×kg — UX quebrada.

**Necessário para desbloquear** (sub-projetos 1–4 / futuro): dimensões de registro não-força em
`SerieRegistrada`/`SessaoExercicio` (`duracaoSegundos`, `distanciaMetros`, `tempoSustentacaoSegundos`),
relaxar `repeticoes>=1` para tipos sem reps, migration + serialização no SQLite, card de série que
renderiza campos por tipo (reps/kg vs tempo vs distância vs sustentação) guiado por `category`, e
tratamento de catálogo/picker para exercícios sem grupo muscular. Só então rodar estas sessões pela skill.

O plano/escopo de cada sessão bloqueada está registrado no manifest (`pending_expansion_sessions`
→ `new_categories.readiness_review` + `sessions`). Os movimentos já roteados das sessões de força
(jump rope, mountain climber, ball slam, bird dog, superman, tibialis raise, carries, alongamentos)
aguardam ali. **Nenhum seed de `new_categories` foi criado.**
