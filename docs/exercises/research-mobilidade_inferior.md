# Research — `mobilidade_inferior` (Mobilidade de Membros Inferiores / Lower-Body Mobility)

Nova categoria **Mobility**, desbloqueada pelo modelo `tracking_type` (sub-projeto 5b).
SCOPE = drills de mobilidade articular ATIVA dos membros inferiores: quadril
(flexao/extensao/rotacao/abducao/aducao), joelho, tornozelo, e drills lombo-pelvicos hip-driven.

`category: "Mobility"`, `group_muscles: ["Mobilidade"]` (intencional — o presenter do catalogo tem
CATEGORY_ORDER `Cardio, Mobilidade, Alongamento, Aquecimento, Reabilitacao`, entao estes renderizam
numa secao "Mobilidade" dedicada, como cardio usou `["Cardio"]`, alongamento `["Alongamento"]` e
aquecimento `["Aquecimento"]`). `group_muscles` NAO e anatomico.

`musculo_alvo` populado com os movers articulares REALMENTE mobilizados (codigos PT minusculos ja
usados nos seeds: `flexores_quadril`, `gluteos`, `adutores`, `abdutores`, `isquiotibiais`,
`quadriceps`, `gastrocnemio`, `soleo`, `tibial_anterior`, `lombar`, `core`). Nenhum codigo novo
inventado.

`tracking_type` MISTO (decidido por registro):
- `"reps_only"` para drills de repeticao controlada (CARs, troca 90/90, hidrante, concha, balancos
  de sapo/adutor/tornozelo, pombo ativo, escorpiao, aviao de quadril, fluxo cossaco, leg swing com
  faixa, distracao com faixa, avancada de quadril ativa) — 17 registros.
- `"hold"` para drills que sao genuinamente um hold sustentado de fim de amplitude: agachamento
  profundo/prying squat (seed-ex-228) e couch stretch ativo (seed-ex-232) — 2 registros.

`movement_pattern`: valor do enum quando o drill claramente corresponde:
- `Rotation` — CARs de quadril (219), concha (221), 90/90 switch (222), lift-off (223), aviao (225),
  pombo ativo (230), escorpiao (231), CARs de tornozelo (234).
- `Abduction` — hidrante (220), frog rocks (226), adductor rocks (227).
- `Hip Flexion` — avancada de quadril ativa (224), leg swing com faixa (236).
- `Squat` — agachamento profundo de mobilidade (228).
- `Lunge` — agachamento cossaco de mobilidade (229).
- `null` — couch stretch (232), knee-to-wall (233), kneeling ankle rock (235), distracao com faixa
  (237) — nenhum valor do enum descreve o mecanismo. Validador permite null.

`primary_equipment`: `"Bodyweight"` na maioria; `"Resistance Band"` para drills com faixa (236, 237);
implementos fora do vocabulario (parede para couch stretch 232 e knee-to-wall 233) -> `primary_equipment`
null + nome no campo livre `equipment` ("Parede"), seguindo o precedente do alongamento_estatico.

Regra: **1 estimulo distinto = 1 registro**. Esquerda/direita do mesmo drill = 1 registro
(`execution_type: Unilateral`). Variantes de tempo/lado/amplitude dobradas em `name_variations` ou
logadas em `scope_exclusions`.

---

## Fronteira de escopo (roteamento)
- **Mobilidade toracica/ombro/cervical -> `mobilidade_superior_coluna`** (proxima sessao). Open book
  deitado, cat-cow, thoracic CARs, shoulder CARs, segmental cat-camel, neck CARs sao roteados la.
- **Alongamento estatico (hold passivo de musculo) ja vive em `alongamento_estatico`** (seed-ex-172..195).
  Runner's lunge hold, standing quad, butterfly, frog *stretch* passivo, pigeon *passivo*, figura-quatro
  -> roteados, nao recriados. O pombo ATIVO (230, com lift-off de gluteo) e o sapo BALANCADO (226,
  rockback ritmico) sao estimulos ativos distintos dos holds passivos -> ficam aqui.
- **Aquecimento dinamico / locomocao geral ja vive em `aquecimento_dinamico`** (seed-ex-196..218).
  Leg swing frontal (196) / lateral (197), hip circle / abre-portao (203), walking lunge, WGS (201),
  spiderman (202), dynamic side lunge / cossack dinamico (218), high knees, butt kick, A-skip etc.
  sao prep dinamica de aquecimento -> roteados. Drills de mobilidade DEDICADA (nao prep geral) ficam aqui.

### Movimentos parqueados por sessoes anteriores (cross-check do ledger)
Grep `mobilidade_inferior` em `_manifest.json` scope_exclusions confirma o ledger roteado para ca:
- **posterior_gluteos** -> "Side-Lying Clam" (ABSORVIDO = seed-ex-221), "Hip Flexion Machine (flexor
  de quadril)" (ABSORVIDO como mobilidade de flexao de quadril ativa, dobrado em seed-ex-224).
- **forca_kettlebell** -> "Standing Hip Flexor Raise" (ABSORVIDO = seed-ex-224, name_variation).
- **alongamento_estatico** -> "Downward Dog" (transicao dinamica — alongamento de panturrilha/isquio
  ja coberto por seed-ex-187/193; o knee-to-wall 233 e CARs de tornozelo 234 cobrem a mobilidade
  ATIVA de tornozelo distinta. Down-dog como estimulo de mobilidade e dobrado — ver exclusoes),
  "Lunge com rotacao / World's Greatest Stretch (mobilidade dinamica)" -> **RE-ROTEADO**: WGS ja e um
  registro completo em aquecimento_dinamico (seed-ex-201) e o afundo com rotacao tambem (seed-ex-199).
  Recriar aqui duplicaria o estimulo -> mantido em aquecimento, logado em exclusoes.
- **aquecimento_dinamico** -> "Scorpion" (ABSORVIDO = seed-ex-231), "Fire Hydrant" (ABSORVIDO =
  seed-ex-220), "90/90 Hip Switch" (ABSORVIDO = seed-ex-222), "Hip CARs" (ABSORVIDO = seed-ex-219),
  "Deep/Prying Squat hold de mobilidade" (ABSORVIDO = seed-ex-228).

Todo o ledger roteado para `mobilidade_inferior` foi absorvido, exceto WGS/lunge-com-rotacao
(re-roteados de volta a aquecimento como ja-cobertos) e Downward Dog (dobrado — estimulo de
panturrilha/isquio ja coberto; a mobilidade ATIVA de tornozelo e coberta por 233/234).

---

## Fontes consultadas (>=10 bases independentes)

### Fonte 1 — Functional Range Conditioning (FRC) / CARs (Dr. Andreo Spina, FRC system)
URL: https://functionalanatomyseminars.com/ ; material FRC/Kinstretch sobre Controlled Articular
Rotations e PAILs/RAILs.
Lista nuclear de mobilidade de quadril/tornozelo: Hip CARs, Ankle CARs, 90/90 (internal/external
rotation), hip airplane, prying squat.
NOVO (set base): **Hip CARs (+1)**, **Ankle CARs (+1)**, **90/90 hip switch (+1)**, **90/90
lift-off (+1)** (FRC distingue a troca da elevacao isometrica/lift-off — recrutamento ativo de
rotacao interna na amplitude final), **hip airplane (+1)**, **prying/deep squat hold (+1)**.
**~6 estimulos base.**

### Fonte 2 — NASM (Mobility / CES — Corrective Exercise Specialist)
URL: https://blog.nasm.org/ (hip mobility, ankle mobility, corrective exercise).
Lista: fire hydrant, clamshell, hip flexion ativa, knee-to-wall (ankle dorsiflexion), 90/90.
NOVO: **fire hydrant / hidrante (+1)** (abducao de quadril ajoelhado), **clamshell / concha (+1)**
(rotacao externa deitado de lado), **avancada de quadril ativa / active hip flexion (+1)** (flexao de
quadril ativa em pe — absorve o "Standing Hip Flexor Raise" e o "Hip Flexion Machine" roteados),
**knee-to-wall ankle rock (+1)** (dorsiflexao de tornozelo carregada contra a parede). 90/90 ja
contado (Fonte 1).

### Fonte 3 — ExRx.net (Directory — flexibility/mobility dinamica de quadril e tornozelo)
URL: https://exrx.net/Lists/Directory ; entradas de mobilidade de quadril/tornozelo.
Confirma como distintos: frog rockback (mobilidade de adutor quadrupede), adductor rock unilateral,
cossack squat. NOVO: **frog rocks / balanco do sapo (+1)** (rockback quadrupede com joelhos abertos —
adutor, bilateral, ritmico — distinto do frog *stretch* passivo roteado p/ alongamento), **adductor
rocks ajoelhado (+1)** (balanco unilateral de virilha, lunge lateral ajoelhado), **cossack squat de
mobilidade (+1)** (agachamento lateral profundo, plano frontal — distinto do cossack DINAMICO de
aquecimento seed-ex-218: aqui e drill lento de fim de amplitude/mobilidade).

### Fonte 4 — Physiopedia / physio mobility (clamshell, hip distraction, ankle mobs)
URL: https://www.physio-pedia.com/ (hip mobility, ankle dorsiflexion, banded joint mobilization).
NOVO: **distracao de quadril com faixa / banded hip distraction (+1)** (mobilizacao articular do
quadril com tracao de faixa — unico drill com tracao articular, primary Resistance Band),
**kneeling ankle rock (+1)** (balanco de tornozelo ajoelhado carregado — distinto do knee-to-wall em
pe: posicao/base diferente, bilateral, carga via peso corporal no joelho a frente). Clamshell ja
contado (Fonte 2).

### Fonte 5 — Coaches de mobilidade atletica (active pigeon, scorpion, couch stretch ativo)
URL: refs de mobilidade atletica/Kinstretch/GMB (pigeon lift, prone scorpion, active couch stretch).
NOVO: **pombo ativo / active pigeon (+1)** (postura do pombo com lift-off ativo de gluteo — rotacao
externa carregada ativa, distinto do pigeon *passivo* hold roteado p/ alongamento), **escorpiao /
scorpion (+1)** (rotacao de quadril+coluna em decubito ventral, hip-driven — absorvido do ledger de
aquecimento; a componente lombar e secundaria, hip-driven domina -> fica aqui, nao em
mobilidade_superior_coluna), **couch stretch ativo (+1)** (flexor de quadril/quadriceps na parede COM
contracao de gluteo — hold ativo de fim de amplitude, tracking_type hold).

### Fonte 6 — Treinadores de forca/mobilidade (banded leg swing, controlled mobility)
URL: refs de prep de forca/mobilidade (banded dynamic leg swing, resisted hip mobility).
NOVO: **leg swing frontal com faixa / banded leg swing (+1)** (balanco de quadril RESISTIDO com faixa
— estimulo distinto do leg swing de aquecimento sem carga seed-ex-196: a faixa adiciona resistencia
ativa na amplitude, mobilidade carregada; primary Resistance Band). Resto repetido/roteado.

### Fonte 7 — GMB Fitness / movement (deep squat, hip mobility flows)
URL: https://gmb.io/ (hip/ankle mobility, deep squat).
NOVO: **0 distintos** — deep squat (Fonte 1), ankle work (Fontes 2/4), pigeon (Fonte 5) ja cobertos.
Confirma prying squat como hold.

### Fonte 8 — Squat University / Aaron Horschig (ankle & hip mobility clinico)
URL: https://squatuniversity.com/ (ankle dorsiflexion, hip mobility, banded distraction).
NOVO: **0 distintos** — knee-to-wall (Fonte 2), banded hip distraction (Fonte 4), 90/90 (Fonte 1) ja
cobertos. Confirma knee-to-wall e banded distraction.

### Fonte 9 — Yoga-derived mobility (malasana / deep squat, active pigeon)
URL: refs de yoga aplicada a mobilidade (malasana, eka pada).
NOVO: **0 distintos** — malasana = deep squat (Fonte 1, dobrado em name_variations); active pigeon
(Fonte 5) ja contado.

### Fonte 10 — Healthline / Verywell mobility listicles (hip openers, ankle mobility)
URL: https://www.healthline.com/health/fitness/hip-mobility-exercises ; Verywell Fit hip/ankle
mobility.
Lista: fire hydrant, clamshell, 90/90, hip circles, knee-to-wall, deep squat, frog stretch.
NOVO: **0 distintos** — tudo ja coberto (hip circles = aquecimento roteado; frog *stretch* passivo =
alongamento roteado, o frog *rocks* ativo ja e 226).

### Fonte 11 — Movement coaches cluster (closeout)
Repete o set acima. NOVO: **0 distintos**.

---

## Curva de retornos decrescentes
- Rodada 1 (FRC/CARs): Hip CARs, Ankle CARs, 90/90 switch, 90/90 lift-off, hip airplane, prying
  squat. **+6.**
- Rodada 2 (NASM/CES): fire hydrant, clamshell, active hip flexion, knee-to-wall. **+4.**
- Rodada 3 (ExRx): frog rocks, adductor rocks, cossack squat mobility. **+3.**
- Rodada 4 (Physiopedia): banded hip distraction, kneeling ankle rock. **+2.**
- Rodada 5 (coaches atleticos): active pigeon, scorpion, couch stretch ativo. **+3.**
- Rodada 6 (banded mobility): banded leg swing frontal. **+1.**
- Fontes 7, 8, 9, 10, 11 (GMB, Squat University, yoga, listicles, cluster): **+0 distintos cada**.

**Fechamento:** 5 fontes consecutivas (7-11) retornaram 0 novos distintos roteaveis a mobilidade
inferior; o restante e mobilidade toracica/ombro (roteada p/ mobilidade_superior_coluna), hold
passivo (roteado p/ alongamento) ou prep de aquecimento (roteada p/ aquecimento). 11 bases
independentes + sistema FRC. Universo fechado em **19 registros distintos** (seed-ex-219..237).

---

## Registros criados (19) — seed-ex-219..237

| ID | Nome | musculo_alvo | movement_pattern | tracking | exec |
|----|------|--------------|------------------|----------|------|
| 219 | CARs de Quadril | flexores_quadril, gluteos | Rotation | reps_only | Unilateral |
| 220 | Hidrante (Fire Hydrant) | gluteos, abdutores | Abduction | reps_only | Unilateral |
| 221 | Concha (Clam) | gluteos | Rotation | reps_only | Unilateral |
| 222 | Troca 90/90 | gluteos, flexores_quadril | Rotation | reps_only | Bilateral |
| 223 | Lift-Off no 90/90 | gluteos, flexores_quadril | Rotation | reps_only | Unilateral |
| 224 | Avancada de Quadril Ativa | flexores_quadril | Hip Flexion | reps_only | Unilateral |
| 225 | Aviao de Quadril | gluteos, flexores_quadril | Rotation | reps_only | Unilateral |
| 226 | Balanco do Sapo (Frog Rocks) | adutores | Abduction | reps_only | Bilateral |
| 227 | Balanco de Adutores Ajoelhado | adutores | Abduction | reps_only | Unilateral |
| 228 | Agachamento Profundo (Prying Squat) | adutores, flexores_quadril | Squat | hold | Bilateral |
| 229 | Agachamento Cossaco de Mobilidade | adutores, gluteos | Lunge | reps_only | Unilateral |
| 230 | Pombo Ativo | gluteos | Rotation | reps_only | Unilateral |
| 231 | Escorpiao (Scorpion) | flexores_quadril, gluteos | Rotation | reps_only | Unilateral |
| 232 | Couch Stretch Ativo | flexores_quadril, quadriceps | null | hold | Unilateral |
| 233 | Balanco Joelho a Parede | soleo, tibial_anterior | null | reps_only | Unilateral |
| 234 | CARs de Tornozelo | tibial_anterior, soleo | Rotation | reps_only | Unilateral |
| 235 | Balanco de Tornozelo Ajoelhado | tibial_anterior, soleo | null | reps_only | Bilateral |
| 236 | Balanco de Perna Frontal com Faixa | flexores_quadril, isquiotibiais | Hip Flexion | reps_only | Unilateral |
| 237 | Distracao de Quadril com Faixa | flexores_quadril, adutores | null | reps_only | Unilateral |

### Notas de julgamento
- **tracking_type MISTO:** 17 `reps_only` (drills de repeticao controlada) + 2 `hold` (prying squat
  228 e couch stretch ativo 232 — genuinos holds sustentados de fim de amplitude). CARs e balancos
  sao contados por repeticoes lentas -> reps_only. Documentado como uso misto no manifest.
- **219 (Hip CARs) -> Rotation:** CARs sao circunducao articular ativa = rotacao em volume maximo. O
  validador permite Rotation; e o melhor encaixe do enum.
- **222 (90/90 switch) vs 223 (90/90 lift-off):** a troca (222, bilateral, alterna rotacao
  interna/externa pivotando os dois quadris) vs o lift-off (223, unilateral, isometrico de rotacao
  interna que ELEVA o joelho da frente). FRC trata como progressoes distintas (passiva-ritmica vs
  ativa-isometrica). 2 estimulos.
- **221 (concha/clam) vs 230 (pombo ativo):** ambos rotacao externa de quadril, mas concha e deitado
  de lado com quadril flexionado a ~45 graus (gluteo medio/maximo, isolado); pombo ativo e na postura
  do pombo (quadril flexionado + rotacao externa profunda) com lift-off ativo — amplitude e posicao
  articular distintas. Marcados equivalent entre si.
- **226 (frog rocks) vs 227 (adductor rocks):** frog rocks = quadrupede joelhos abertos simetricos,
  rockback bilateral (adutor + capsula medial); adductor rocks = unilateral, uma perna estendida para
  o lado (lunge lateral ajoelhado), foco em uma virilha por vez. Mecanica/base distinta.
- **228 (prying squat) vs 229 (cossack mobility):** prying squat e hold/balanco em agachamento
  profundo bilateral (Squat, hold); cossack e agachamento lateral profundo unilateral no plano
  frontal (Lunge, reps_only). Distinto tambem do **cossack DINAMICO de aquecimento (seed-ex-218)**:
  aquele e prep dinamica rapida; este e drill lento de fim de amplitude/mobilidade.
- **231 (escorpiao):** rotacao de quadril+coluna em decubito ventral. Embora envolva a coluna lombar,
  e HIP-DRIVEN (a perna cruza puxada pela rotacao do quadril) -> fica em mobilidade_inferior, nao em
  mobilidade_superior_coluna. lombar fica em stabilizers, nao em musculo_alvo.
- **233 (knee-to-wall) vs 234 (ankle CARs) vs 235 (kneeling ankle rock):** 3 estimulos de tornozelo
  distintos — 233 dorsiflexao carregada em pe contra a parede (teste/drill de ADM, soleo dominante);
  234 circunducao articular completa do tornozelo (Rotation, todas as direcoes); 235 balanco de
  dorsiflexao ajoelhado (carga via peso corporal, base diferente). Nenhum e o calf *stretch* passivo
  (alongamento seed-ex-193/194) nem o ankle bounce/pogo de aquecimento (seed-ex-216).
- **236 (banded leg swing) vs aquecimento leg swing (196):** a faixa adiciona resistencia ativa na
  amplitude (mobilidade carregada) — estimulo distinto do balanco livre de aquecimento. primary
  Resistance Band.
- **237 (banded hip distraction):** unico drill de TRACAO articular (faixa ancorada tracionando a
  cabeca femoral) — mobilizacao capsular, nao muscular. movement_pattern null (nenhum enum descreve
  distracao articular).
- **primary_equipment:** Bodyweight na maioria; Resistance Band para 236/237; Parede (fora do
  vocabulario) -> primary null + equipment livre "Parede" para couch stretch 232 e knee-to-wall 233
  (precedente do alongamento_estatico, que mapeou parede/barra/faixa para campo livre).
- **musculo_alvo (codigos):** reutilizados dos seeds existentes (flexores_quadril, gluteos, adutores,
  abdutores, isquiotibiais, quadriceps, gastrocnemio, soleo, tibial_anterior, lombar, core). Nenhum
  codigo novo. Validador nao valida vocabulario de musculo (so exige array nao-vazio).

## Exclusoes (roteadas / nao-distintas)

### Roteadas para mobilidade_superior_coluna (mobilidade toracica/ombro/cervical — proxima sessao)
- Open book deitado, Cat-Cow / segmental cat-camel, Thoracic CARs, Thoracic rotation deitado,
  Shoulder CARs, Neck CARs, Quadruped thoracic rotation (T-spine windmill). Nao sao lower-body.

### Roteadas de volta para aquecimento_dinamico (ja sao registros completos — nao recriar)
- World's Greatest Stretch (seed-ex-201), Afundo com Rotacao / Lunge com rotacao (seed-ex-199),
  Spiderman Lunge (seed-ex-202), Cossack DINAMICO / Dynamic Side Lunge (seed-ex-218), Leg Swing
  frontal/lateral livre (seed-ex-196/197), Hip Circle / Abre-Portao (seed-ex-203). Sao prep dinamica
  de aquecimento; o ledger do alongamento parqueou "Lunge com rotacao/WGS" aqui, mas ja existem.

### Roteadas para alongamento_estatico (hold passivo de musculo — ja completo)
- Runner's lunge hold (seed-ex-183), Standing quad stretch (184), Figura-quatro / pigeon PASSIVO
  (185), Butterfly (189), Frog *stretch* passivo (190), Cossack *stretch* estatico (191), Calf
  stretch gastroc/soleo (193/194), Hamstring stretch (187/188). O pombo ATIVO (230) e o sapo
  BALANCADO (226) sao versoes ATIVAS distintas e ficam aqui.

### Microvariantes nao-distintas (dobradas em name_variations) / dobradas
- "Hip Flexion Machine (flexor de quadril)" e "Standing Hip Flexor Raise" -> dobrados em
  avancada de quadril ativa (224, name_variations).
- "Downward Dog" como estimulo de mobilidade -> dobrado: a panturrilha/isquio ja sao cobertos por
  alongamento (187/193); a dorsiflexao ATIVA de tornozelo e coberta por 233/234. Down-dog flow
  toracico -> mobilidade_superior_coluna.
- "Malasana" -> dobrado no prying squat (228, name_variations).
- "Quadruped/Standing hip circles" -> aquecimento (seed-ex-203, abre-portao) cobre; CARs de quadril
  (219) e a versao de mobilidade dedicada (volume maximo controlado).
- "Cossack dinamico" -> aquecimento (seed-ex-218); o cossack de MOBILIDADE lento (229) fica aqui.
- "Ankle bounce / pogo" -> aquecimento (seed-ex-216, plio de tornozelo); a mobilidade ATIVA de
  tornozelo (233/234/235) e distinta.
- "Cradle walk / abraco de joelho caminhando" -> aquecimento (seed-ex-213).
