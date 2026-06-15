# Research — `mobilidade_superior_coluna` (Mobilidade de Membros Superiores / Coluna / Upper-Body & Spine Mobility)

Nova categoria **Mobility**, desbloqueada pelo modelo `tracking_type` (sub-projeto 5b).
SCOPE = drills de mobilidade articular ATIVA do tronco superior e coluna: coluna toracica
(rotacao/extensao/flexao segmentar), ombros/escapula, pescoco/cervical, punhos e fluxos espinhais.
EXCLUI mobilidade de quadril/joelho/tornozelo (-> `mobilidade_inferior`, completo), alongamento
passivo sustentado (-> `alongamento_estatico`, completo) e prep geral de aquecimento
(-> `aquecimento_dinamico`, completo).

`category: "Mobility"`, `group_muscles: ["Mobilidade"]` (intencional — o presenter do catalogo tem
CATEGORY_ORDER `Cardio, Mobilidade, Alongamento, Aquecimento, Reabilitacao`; estes renderizam numa
secao "Mobilidade" dedicada, como `mobilidade_inferior`). `group_muscles` NAO e anatomico.

`musculo_alvo` populado com os movers/segmentos REALMENTE mobilizados. Codigos reutilizados dos seeds
existentes: `deltoide`, `deltoide_anterior`, `deltoide_posterior`, `trapezio`, `peitoral`,
`grande_dorsal`, `eretores_espinha`, `lombar`, `core`, `obliquo`, `flexores_antebraco`.

### Codigos de musculo NOVOS introduzidos (padrao PT-minusculo, nenhum duplica codigo existente)
O validador NAO valida vocabulario de `musculo_alvo` (so exige array nao-vazio), mas seguimos o padrao:
- **`toracica`** — coluna toracica (segmento T-spine; rotacao/extensao/flexao). Nao existia codigo
  para o segmento toracico; `eretores_espinha` e o extensor, mas a coluna toracica como articulacao
  mobilizada e o alvo dos drills de T-spine. Usado em: cat-cow, sphinx-cobra, foam roller ext, open
  book, T-spine windmill, thread-the-needle, seated rotation, KB arm bar.
- **`pescoco`** — coluna cervical / pescoco. Nao existia (`trapezio` cobria so o alongamento lateral
  de pescoco no alongamento_estatico). Usado em: Neck CARs.
- **`manguito_rotador`** — manguito rotador (rotator cuff; supra/infra/redondo menor/subescapular).
  Estabilizador glenoumeral mobilizado nas CARs de ombro e arm bar. Usado em: Shoulder CARs (alvo),
  KB Arm Bar (alvo), Prone YTW / KB Halo (stabilizer).

REUTILIZADOS (codigos JA existentes no catalogo — NAO sao novos; normalizados para casar com o resto dos seeds):
- **`serratus_anterior`** — serratus anterior (protracao/upward rotation escapular); ja usado em peito/ombros/costas.
  Usado aqui em: scapular CARs, scapular push-up, wall slides, prone YTW. (Evitar o sinonimo 'serratil'.)
- **`romboides`** — romboides (retracao escapular); ja usado em costas/ombros. Usado aqui em: shoulder rolls,
  scapular CARs/push-up, wall slides, prone YTW (stabilizers).

`tracking_type` MISTO (decidido por registro):
- `"reps_only"` — drills de repeticao controlada (CARs de ombro/escapula/pescoco/punho, cat-cow,
  open book, thread-the-needle, T-spine windmill, seated rotation, sphinx-to-cobra, shoulder rolls,
  scapular push-up, wall slides, prone YTW, pass-through com bastao/faixa, KB Halo). **17 registros.**
- `"hold"` — holds sustentados de fim de amplitude: extensao toracica no rolo de espuma (seed-ex-241)
  e KB Arm Bar (seed-ex-257, sustentacao isometrica de ombro/T-spine em supino). **3 registros**
  (foam roller ext, KB arm bar). Correcao: 2 registros `hold`.

`movement_pattern`: valor do enum apenas quando o drill claramente corresponde:
- `Rotation` — open book deitado (242), T-spine windmill (243), thread-the-needle (244), seated
  thoracic rotation (245), Shoulder CARs (246), Wrist CARs (255). CARs = circunducao articular ativa.
- `null` — cat-cow (238/239: flexao-extensao espinhal, sem enum), sphinx-cobra (240) e foam roller
  ext (241: extensao espinhal, sem enum), shoulder rolls (247), scapular CARs (248), scapular push-up
  (249), wall slides (250), prone YTW (251), pass-through bastao/faixa (252/253), Neck CARs (254),
  KB Halo (256), KB Arm Bar (257). O skill spec MOVEMENT_PATTERNS nao tem valor para
  flexao/extensao espinhal, protracao/retracao escapular, pass-through nem halo -> `null` (validador
  permite). NAO forcado para um enum errado.

`primary_equipment`:
- `"Bodyweight"` na maioria (peso corporal).
- `"Kettlebell"` — KB Halo (256), KB Arm Bar (257) — Kettlebell ESTA no vocabulario controlado.
- `"Resistance Band"` — band pass-through de mobilidade (253).
- Implementos FORA do vocabulario -> `primary_equipment` null + nome no campo livre `equipment`:
  - **Rolo de Espuma** — foam roller thoracic extension (241).
  - **Bastao** — stick/dowel pass-through (252).
  - **Parede** — wall slides (250) (precedente do alongamento_estatico, que mapeou parede para campo
    livre).
  NUNCA mapear implemento desconhecido para valor parecido (regra §4 do skill).

Regra: **1 estimulo distinto = 1 registro**. Esquerda/direita = 1 registro (`Unilateral`).

---

## Fronteira de escopo (roteamento) — cross-check do ledger

Grep `mobilidade_superior_coluna` em `_manifest.json` scope_exclusions confirma TODO o ledger roteado
para ca (de alongamento_estatico, aquecimento_dinamico, mobilidade_inferior e forca_kettlebell):

### Movimentos parqueados ABSORVIDOS nesta sessao
- **Kettlebell Halo** (forca_kettlebell) -> seed-ex-256 (`hold` nao — `reps_only`; circulo controlado
  da KB ao redor da cabeca; primary_equipment Kettlebell).
- **Kettlebell Arm Bar** (forca_kettlebell) -> seed-ex-257 (`hold`; sustentacao de ombro/T-spine em
  supino; primary_equipment Kettlebell).
- **Cat-Cow / Gato-Camelo** (alongamento / mobilidade_inferior) -> seed-ex-238; **Segmental
  Cat-Camel** -> seed-ex-239 (estimulo segmentar distinto: articulacao vertebra-a-vertebra).
- **Cobra / Sphinx (extensao espinhal ativa)** (alongamento) -> seed-ex-240 (sphinx-to-cobra flow).
- **Shoulder Rolls (circulos dinamicos de ombro)** (alongamento) -> seed-ex-247.
- **Open Book deitado / Thoracic rotation deitado** (aquecimento / mobilidade_inferior) -> seed-ex-242
  (a versao EM PE seed-ex-208 NAO e duplicada — ver cross-reference abaixo).
- **Shoulder CARs** -> seed-ex-246; **Thoracic CARs** -> dobrado (ver abaixo); **Neck CARs** ->
  seed-ex-254 (aquecimento / mobilidade_inferior).
- **Down-Dog-to-Cobra flow** (aquecimento) -> a componente de extensao toracica/coluna e coberta por
  sphinx-to-cobra (240); a componente de panturrilha/isquio ja vive em alongamento (187/193) e a
  dorsiflexao ATIVA em mobilidade_inferior (233/234). Dobrado — ver exclusoes.
- **Quadruped Thoracic Rotation (T-spine windmill)** (mobilidade_inferior) -> seed-ex-243.

### Cross-referenciado (NAO duplicado — ja e registro completo)
- **Open Book / Rotacao Toracica EM PE = seed-ex-208** (aquecimento_dinamico). A versao DEITADA
  (242) e o estimulo de mobilidade dedicada (decubito lateral, ombro no chao, ADM toracica maxima
  isolada do quadril); a versao em pe e prep de aquecimento. Distintos -> 242 fica aqui, 208 fica la,
  cross-referenciado, NAO recriado.
- **Circulos de Braco = seed-ex-204** e **Passagem de Ombro com Faixa = seed-ex-206**
  (aquecimento_dinamico). Sao prep DINAMICA de aquecimento. As versoes de MOBILIDADE DEDICADA aqui
  sao distintas: Shoulder CARs (246, circunducao controlada de volume maximo, nao circulo balistico),
  Shoulder Rolls (247, rolamento escapular lento), e o pass-through aqui e feito com BASTAO (252,
  ADM controlada) e com FAIXA de mobilidade (253). O 206 de aquecimento e o mesmo gesto em ritmo de
  prep -> cross-referenciado, nao recriado.

### Thoracic CARs -> dobrado
"Thoracic CARs" como nome isolado nao e um estimulo distinto separado: a circunducao toracica ativa e
coberta pelo T-spine windmill quadrupede (243) e pela rotacao toracica sentada (245). Dobrado em
name_variations/escopo — nao gera registro proprio (evita padding por nome).

---

## Fontes consultadas (>=10 bases independentes)

### Fonte 1 — Functional Range Conditioning (FRC) / CARs / Kinstretch (Dr. Andreo Spina)
URL: https://functionalanatomyseminars.com/ ; https://www.kinstretch.com/
Lista nuclear: Shoulder CARs, Scapular CARs, Neck/Cervical CARs, Wrist CARs, T-spine rotation
controlada.
NOVO (set base): **Shoulder CARs (+1)**, **Scapular CARs (+1)**, **Neck CARs (+1)**, **Wrist CARs
(+1)**, **rotacao toracica controlada (+1, instanciada como seated/quadruped)**. **~5 base.**

### Fonte 2 — NASM (Mobility / CES — Corrective Exercise Specialist)
URL: https://blog.nasm.org/ (thoracic mobility, shoulder mobility, corrective exercise).
Lista: cat-cow, thoracic extension over foam roller, wall slides/wall angels, open book, quadruped
thoracic rotation.
NOVO: **cat-cow (+1)**, **foam roller thoracic extension (+1)** (hold de fim de amplitude),
**wall slides / wall angels (+1)**, **open book deitado (+1)**, **quadruped thoracic rotation /
T-spine windmill (+1)**.

### Fonte 3 — ExRx.net (Directory — flexibility/mobility dinamica de ombro/coluna)
URL: https://exrx.net/Lists/Directory
Confirma como distintos: shoulder pass-through (dislocate) com bastao, scapular push-up, prone
raises (Y-T-W).
NOVO: **shoulder pass-through com bastao (+1)** (dislocate, ADM controlada com dowel), **scapular
push-up (+1)** (protracao/retracao escapular em prancha), **prone Y-T-W (+1)** (elevacoes escapulares
em decubito ventral — controle de trapezio inferior/medio e manguito).

### Fonte 4 — Physiopedia / physio mobility (thoracic, scapular, cervical)
URL: https://www.physio-pedia.com/ (thoracic spine mobility, scapular dyskinesis, cervical mobility).
NOVO: **segmental cat-camel (+1)** (articulacao segmentar vertebra-a-vertebra — estimulo de controle
distinto do cat-cow global), **sphinx-to-cobra / active spinal extension (+1)** (extensao toracica
ativa progressiva). Wall slides / scapular work ja contados (Fonte 2/3).

### Fonte 5 — Coaches de mobilidade de ombro/atletica (Tom Morrison, GMB, Precision Movement)
URL: refs de mobilidade de ombro/T-spine (CARs, band pass-through, thread-the-needle, shoulder rolls).
NOVO: **band shoulder pass-through de mobilidade (+1)** (faixa elastica — resistencia/feedback na
amplitude, distinto do bastao rigido e do pass-through de aquecimento seed-ex-206), **thread-the-needle
(+1)** (rotacao toracica quadrupede com braco cruzando por baixo — alongamento ativo de fim de
amplitude distinto do windmill que abre para cima), **shoulder rolls (+1)** (rolamento escapular
lento). Confirma Shoulder CARs (Fonte 1).

### Fonte 6 — Kettlebell mobility (StrongFirst / KB coaches)
URL: refs de KB (Turkish-get-up regressions, halo, arm bar como mobilidade de ombro/T-spine).
NOVO: **KB Halo (+1)** (circulo da KB ao redor da cabeca — mobilidade escapuloumeral carregada),
**KB Arm Bar (+1)** (hold em supino com KB no alto, T-spine + manguito — mobilidade/estabilidade de
fim de amplitude). Absorvidos do ledger de forca_kettlebell.

### Fonte 7 — Seated thoracic rotation / dowel drills (strength & conditioning)
URL: refs de S&C (seated thoracic rotation com bastao nas costas).
NOVO: **seated thoracic rotation (+1)** (rotacao toracica sentado — base travada pelos quadris
flexionados, isola o T-spine; estimulo distinto do windmill quadrupede e do open book deitado pela
posicao/base). Resto repetido.

### Fonte 8 — MoveU / postura & escapula (scapular control)
URL: refs de controle escapular/postura.
NOVO: **0 distintos** — scapular CARs (Fonte 1), scapular push-up / wall slides / prone YTW (Fontes
2/3) ja cobrem o controle escapular. Confirma scapular push-up e wall angels.

### Fonte 9 — Squat University / GMB (overhead mobility, T-spine)
URL: https://squatuniversity.com/ ; https://gmb.io/
NOVO: **0 distintos** — thoracic extension (Fonte 2), pass-through (Fonte 3), open book (Fonte 2) ja
cobertos. Confirma foam roller T-spine extension e dowel pass-through.

### Fonte 10 — Yoga-derived (thread-the-needle, sphinx/cobra, cat-cow)
URL: refs de yoga aplicada a mobilidade.
NOVO: **0 distintos** — thread-the-needle (Fonte 5), sphinx/cobra (Fonte 4), cat-cow (Fonte 2) ja
contados.

### Fonte 11 — Healthline / Verywell mobility listicles (shoulder/upper-back/neck mobility)
URL: https://www.healthline.com/ ; Verywell Fit upper-body/neck mobility.
Lista: cat-cow, thread-the-needle, shoulder rolls, neck rolls/CARs, wall angels, thoracic rotation.
NOVO: **0 distintos** — tudo ja coberto. Neck "rolls" = dobrado em Neck CARs (254).

### Fonte 12 — Movement coaches cluster (closeout)
Repete o set acima. NOVO: **0 distintos**.

---

## Curva de retornos decrescentes
- Rodada 1 (FRC/CARs/Kinstretch): Shoulder CARs, Scapular CARs, Neck CARs, Wrist CARs, T-spine
  rotation controlada. **+5.**
- Rodada 2 (NASM/CES): cat-cow, foam roller thoracic extension, wall slides, open book deitado,
  T-spine windmill. **+5.**
- Rodada 3 (ExRx): shoulder pass-through (bastao), scapular push-up, prone Y-T-W. **+3.**
- Rodada 4 (Physiopedia): segmental cat-camel, sphinx-to-cobra. **+2.**
- Rodada 5 (coaches de ombro/atleticos): band pass-through, thread-the-needle, shoulder rolls. **+3.**
- Rodada 6 (KB mobility): KB Halo, KB Arm Bar. **+2.**
- Rodada 7 (S&C dowel): seated thoracic rotation. **+1.**
- Fontes 8, 9, 10, 11, 12 (MoveU, Squat University/GMB, yoga, listicles, cluster): **+0 distintos cada.**

**Fechamento:** 5 fontes consecutivas (8-12) retornaram 0 novos distintos roteaveis a esta sessao; o
restante e mobilidade de membros inferiores (roteada p/ mobilidade_inferior), hold passivo de musculo
(roteado p/ alongamento) ou prep de aquecimento (roteada p/ aquecimento, ja registros completos).
12 bases independentes + sistema FRC. Universo fechado em **20 registros distintos**
(seed-ex-238..257).

---

## Registros criados (20) — seed-ex-238..257

| ID | Nome | musculo_alvo | movement_pattern | tracking | exec |
|----|------|--------------|------------------|----------|------|
| 238 | Gato-Camelo (Cat-Cow) | toracica, eretores_espinha | null | reps_only | Bilateral |
| 239 | Gato-Camelo Segmentar | toracica, eretores_espinha | null | reps_only | Bilateral |
| 240 | Esfinge para Cobra | toracica, eretores_espinha | null | reps_only | Bilateral |
| 241 | Extensao Toracica no Rolo de Espuma | toracica, eretores_espinha | null | hold | Bilateral |
| 242 | Open Book Deitado | toracica, peitoral | Rotation | reps_only | Unilateral |
| 243 | Rotacao Toracica Quadrupede (T-spine windmill) | toracica, eretores_espinha | Rotation | reps_only | Unilateral |
| 244 | Thread the Needle | toracica, deltoide_posterior | Rotation | reps_only | Unilateral |
| 245 | Rotacao Toracica Sentado | toracica, eretores_espinha | Rotation | reps_only | Unilateral |
| 246 | CARs de Ombro | deltoide, manguito_rotador | Rotation | reps_only | Unilateral |
| 247 | Rotacao de Ombros (Shoulder Rolls) | trapezio, deltoide | null | reps_only | Bilateral |
| 248 | CARs de Escapula | trapezio, serratus_anterior | null | reps_only | Can Be Both |
| 249 | Flexoes Escapulares (Scapular Push-Up) | serratus_anterior, trapezio | null | reps_only | Bilateral |
| 250 | Deslizamento na Parede (Wall Slides) | trapezio, serratus_anterior | null | reps_only | Bilateral |
| 251 | Prone Y-T-W | trapezio, deltoide_posterior | null | reps_only | Bilateral |
| 252 | Passagem de Ombro com Bastao | deltoide, peitoral | null | reps_only | Bilateral |
| 253 | Passagem de Ombro com Faixa (Mobilidade) | deltoide, peitoral | null | reps_only | Bilateral |
| 254 | CARs de Pescoco | pescoco | null | reps_only | Bilateral |
| 255 | CARs de Punho | flexores_antebraco | Rotation | reps_only | Can Be Both |
| 256 | Halo com Kettlebell | deltoide, trapezio | null | reps_only | Bilateral |
| 257 | Arm Bar com Kettlebell | manguito_rotador, toracica | null | hold | Unilateral |

### Notas de julgamento
- **tracking_type MISTO:** 18 `reps_only` + 2 `hold` (foam roller thoracic extension 241 e KB arm bar
  257 — genuinos holds sustentados de fim de amplitude). CARs e drills articulares sao contados por
  repeticoes lentas -> reps_only. Documentado como uso misto no manifest.
- **238 (cat-cow) vs 239 (segmental cat-camel):** global ritmico (238) vs articulacao segmentar
  vertebra-a-vertebra (239, controle motor distinto). FRC/physio tratam como progressoes distintas.
  Marcados equivalent entre si.
- **242 (open book deitado) vs 208 (open book EM PE, aquecimento):** decubito lateral isola o T-spine
  do quadril, ADM maxima de mobilidade dedicada; a versao em pe e prep de aquecimento. Cross-ref, NAO
  duplicado.
- **243 (T-spine windmill) vs 244 (thread-the-needle) vs 245 (seated rotation):** 3 rotacoes toracicas
  distintas — windmill quadrupede abre o braco para cima (rotacao + extensao), thread-the-needle cruza
  o braco por baixo (rotacao + protracao/alongamento), seated trava a base nos quadris (rotacao pura
  isolada). Estimulos/posicoes distintos.
- **246 (Shoulder CARs) -> Rotation:** circunducao articular ativa = rotacao em volume maximo (melhor
  encaixe do enum, como Hip/Ankle CARs em mobilidade_inferior). 247/248/254 (shoulder rolls, scapular
  CARs, neck CARs) -> null: rolamento/protracao escapular e circunducao cervical nao tem enum limpo.
  255 (wrist CARs) -> Rotation (circunducao do punho).
- **248 (scapular CARs) vs 249 (scapular push-up) vs 250 (wall slides) vs 251 (prone YTW):** 4 drills
  escapulares distintos — CARs (circunducao livre das 4 acoes), scapular push-up (protracao/retracao
  carregada em prancha), wall slides (upward rotation contra a parede, feedback tatil), prone YTW
  (controle de trapezio inferior/medio + manguito em decubito ventral). musculo_alvo serratus_anterior/trapezio
  com enfases diferentes.
- **252 (pass-through bastao) vs 253 (pass-through faixa) vs 206 (aquecimento, faixa):** bastao rigido
  (252, ADM travada controlada) vs faixa de mobilidade (253, resistencia/feedback elastico). O 206 e o
  MESMO gesto em ritmo de PREP de aquecimento -> cross-ref. Marcados equivalent entre 252/253.
- **256 (KB Halo) vs 257 (KB Arm Bar):** halo = circulo dinamico carregado ao redor da cabeca
  (reps_only, bilateral); arm bar = hold isometrico em supino com KB no alto, T-spine + manguito
  (hold, unilateral). 2 estimulos. Kettlebell ESTA no vocabulario -> primary_equipment Kettlebell.
- **primary_equipment:** Bodyweight na maioria; Kettlebell (256/257); Resistance Band (253); fora do
  vocabulario -> primary null + equipment livre: Rolo de Espuma (241), Bastao (252), Parede (250).
- **musculo_alvo (codigos NOVOS):** `toracica`, `pescoco`, `manguito_rotador` — seguem o padrao
  PT-minusculo, nenhum duplica codigo existente. `serratus_anterior` e `romboides` sao REUTILIZADOS
  (ja existiam no catalogo). Validador nao valida vocabulario de musculo (so exige array nao-vazio).

## Exclusoes (roteadas / nao-distintas)

### Roteadas de volta para aquecimento_dinamico (ja sao registros completos — cross-ref, nao recriar)
- Rotacao Toracica EM PE / Open Book em pe (seed-ex-208), Circulos de Braco (seed-ex-204), Balanco de
  Bracos / Abraco (seed-ex-205), Passagem de Ombro com Faixa de aquecimento (seed-ex-206), Rotacao de
  Tronco em Pe (seed-ex-207). Sao prep dinamica; as versoes de mobilidade dedicada aqui sao distintas.

### Roteadas para alongamento_estatico (hold passivo de musculo — ja completo)
- Alongamento lateral/posterior de pescoco (172/173), ombro cruzado (174), dorsais acima da cabeca
  (175), postura da crianca (176), triceps overhead (177), peito na porta (178), biceps na parede
  (179), flexores/extensores de punho (180/181), torcao espinhal sentada (182). Sao holds PASSIVOS de
  musculo, nao mobilizacao articular ATIVA.

### Microvariantes nao-distintas (dobradas) / dobradas
- "Thoracic CARs" -> dobrado: a circunducao toracica ativa e coberta pelo T-spine windmill (243) e
  seated rotation (245). Nao gera registro proprio (evita padding por nome).
- "Down-Dog-to-Cobra flow" -> dobrado: extensao toracica/coluna coberta por sphinx-to-cobra (240);
  panturrilha/isquio ja em alongamento (187/193); dorsiflexao ATIVA em mobilidade_inferior (233/234).
- "Neck rolls" -> dobrado em Neck CARs (254).
- "Arm circles" (lento, de mobilidade) -> dobrado em Shoulder Rolls (247) / Shoulder CARs (246); a
  versao balistica de prep ja e aquecimento (204).
- "Up-dog / cobra isolada" -> dobrado no sphinx-to-cobra flow (240, name_variations).
