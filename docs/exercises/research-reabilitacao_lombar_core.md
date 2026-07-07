# Research — reabilitacao_lombar_core (2026-07-06)

Sessao de expansao `new_categories` (ULTIMA pendente). Escopo: reabilitacao/prehab de LOMBAR + CORE PROFUNDO
(estabilizacao lombopelvica, McGill big three, ativacao de transverso, extensao/rotacao lombar de baixa carga,
reeducacao do padrao de dobradica). Categoria `Rehabilitation`, `group_muscles ["Reabilitacao"]`,
`tracking_type` misto `reps_only|hold`, `gif_path` null. IDs: seed-ex-401..410.

## Inventario previo (anti-duplicata)

Verificado ANTES da pesquisa — ja existem no catalogo e NAO foram recriados:

| Movimento | Registro existente | Sessao |
|---|---|---|
| Prancha Lateral (McGill big three #2) | seed-ex-127 | abdome |
| Dead Bug | gif-ex-123 | abdome |
| Prancha | seed-ex-031 | abdome |
| Pallof Press (anti-rotacao) | seed-ex-124 | abdome |
| Cat-Camel / Gato-Camelo (+ segmentar, + dinamico) | seed-ex-238/239, seed-ex-215 | mobilidade_superior_coluna, aquecimento_dinamico |
| Esfinge para Cobra (≈ McKenzie prone press-up) | seed-ex-240 | mobilidade_superior_coluna |
| Ponte de gluteo ativacao / unilateral / mini band | seed-ex-294/295/296 | reabilitacao_quadril_joelho |
| Hiperextensao no banco (back extension com carga) | gif-ex-053 | posterior_gluteos |
| Joelho ao peito / Postura da crianca / Torcao espinhal sentado | seed-ex-186/176/182 | alongamento_estatico |
| Farmer/Suitcase Carry (QL) | roteados | forca_kettlebell |

Bird Dog e Superman estavam ROTEADOS para ca pelo ledger de `abdome` — criados nesta sessao (seed-ex-402, seed-ex-406).

## Fontes consultadas (por rodada)

### Rodada 1 — canon McGill + motor control clinico (+8 distintos)
1. **backfitpro.com** (McGill) — Mastering the McGill Big Three: curl-up modificado (maos sob a lombar, 8-10 s holds,
   piramide 5-3-1), side plank (regressao de joelhos -> pes empilhados -> leg raise), bird dog (so braco / so perna ->
   opostos -> quadrados no ar). Big three = curl-up + side plank + bird dog. Side plank ja existe; curl-up e bird dog novos.
2. **squatuniversity.com** — The McGill Big 3 for Core Stability: confirma os 3 + bracing abdominal como habilidade
   fundamental previa; cat-camel como preparo (ja existe).
3. **physio-pedia.com/Exercises_for_Lumbar_Instability** — progressao: drawing-in (transverso, 30-40% CVM) -> pelvic tilt ->
   bird dog -> bridge -> side plank. Pelvic tilt e drawing-in novos; bridge/side plank existem.
4. **physio-pedia.com/Lumbar_Motor_Control_Training** — motor control > intervencao minima (Cochrane); ativacao de
   TA/multifidos como base; bracing vs hollowing como estrategias distintas.
5. **physio-pedia.com/Core_Stability** — bracing abdominal (co-contracao em cinta) distinto do hollowing; superman/prone
   extension e extensao isometrica prona como enduro de eretores (Biering-Sorensen).
   -> Distintos novos da rodada: curl-up McGill, bird dog, pelvic tilt, bracing, drawing-in, superman, superman isometrico,
   quadruped rock back (McGill usa como padrao de quadril spine-sparing).

### Rodada 2 — protocolos de reabilitacao e listas clinicas (+2 distintos)
6. **e3rehab.com/low-back-pain-rehab/** — progressoes: hip hinge com bastao (dowel) como reeducacao do padrao;
   superman com bastao (variante); bird dog/superman com maior espessura de multifidos em ultrassom.
7. **spine-health.com** — 7 McKenzie Method Exercises: prone lying -> prone on elbows -> prone press-up (todos estagios
   ROM do mesmo estimulo de extensao prona ≈ seed-ex-240 Esfinge para Cobra — excluidos como nao-distintos).
8. **nhsinform.scot** (NHS) — exercicios para dor lombar: knee rolls / rotacao lombar deitado (novo — rotacao suave sem
   registro equivalente no catalogo; a torcao sentada seed-ex-182 e alongamento passivo), knee-to-chest (existe),
   glute bridge (existe), cat-camel (existe).
   -> Distintos novos da rodada: dobradica de quadril com bastao, rotacao lombar deitado.

### Rodada 3 — fechamento (+0 distintos)
9. **barbend.com/stu-mcgill-core-exercises/** — big three + carries (roteados a forca_kettlebell): +0.
10. **rehabhero.ca/exercise/quadruped-rock-back** — rock back ja capturado: +0.
11. **pmc.ncbi.nlm.nih.gov/articles/PMC6778169/** — TA no LBP (drawing-in ja capturado): +0.
12. **myrehabconnection.com/training-the-hip-hinge/** — hip hinge drill ja capturado: +0.

**Curva de retornos decrescentes: +8 -> +2 -> +0. Fechamento confirmado.**

## Registros criados (10)

| ID | Nome | tracking | pattern | musculo_alvo |
|---|---|---|---|---|
| seed-ex-401 | Curl-Up de McGill | reps_only | Trunk Flexion | abdomen, core |
| seed-ex-402 | Bird Dog | reps_only | Anti-Extension | core, lombar |
| seed-ex-403 | Inclinacao Pelvica Posterior (Pelvic Tilt) | reps_only | null | abdomen, core |
| seed-ex-404 | Bracing Abdominal (Contracao em Cinta) | hold | null | transverso_abdominal, core |
| seed-ex-405 | Ativacao do Transverso (Drawing-In) | hold | null | transverso_abdominal, core |
| seed-ex-406 | Superman no Solo | reps_only | null | lombar, eretores_espinha |
| seed-ex-407 | Superman Isometrico (Sustentacao) | hold | null | lombar, eretores_espinha |
| seed-ex-408 | Balanco Quadrupede (Rock Back) | reps_only | null | core, flexores_quadril |
| seed-ex-409 | Dobradica de Quadril com Bastao (Hip Hinge) | reps_only | Hinge | gluteos, isquiotibiais |
| seed-ex-410 | Rotacao Lombar Deitado (Knee Rolls) | reps_only | Rotation | lombar, obliquo |

## Decisoes de classificacao

- **Codigo musculo_alvo NOVO**: `transverso_abdominal` (core profundo — alvo especifico do bracing/drawing-in;
  `core` sozinho e generico demais e agruparia com prancha/Pallof como quase-identicos). Reutilizados: abdomen, core,
  lombar, eretores_espinha, obliquo, gluteos, isquiotibiais, flexores_quadril, deltoide, trapezio.
- **movement_pattern null (lacunas documentadas)**: extensao de tronco prona (superman 406/407 — NAO existe enum
  'Trunk Extension'; gif-ex-053 e Hinge por ser quadril-dominante no banco romano — review_flag no 406); inclinacao
  pelvica (403), bracing/drawing-in (404/405 — drills isometricos de ativacao sem momento externo; Anti-Extension
  reservado a familia prancha/dead bug conforme abdome), rock back (408 — motor control quadrupede). Padroes usados:
  Trunk Flexion (401), Anti-Extension (402, precedente dead bug), Hinge (409), Rotation (410).
- **tracking_type**: 7 reps_only + 3 hold (404, 405, 407). Curl-up McGill registrado como reps_only (repeticoes de
  holds curtos de 8-10 s, piramide 5-3-1 — a repeticao e a unidade contavel; precedente quad set = hold é isometria
  UNICA prolongada, o curl-up nao).
- **Equipamento**: tudo Bodyweight; 409 usa bastao como ferramenta de feedback -> primary Bodyweight + secondary
  'Bastao' (precedente roda abdominal/bola suica — NAO estende PRIMARY_EQUIPMENT).
- **Bracing vs Drawing-in**: mantidos como 2 registros (estrategias motoras distintas e concorrentes na literatura;
  review_flag no 405 documenta o debate McGill vs Richardson/NASM).

## Exclusoes (ledger completo na entrada de manifest)

- Nao-distintos: variantes de curl-up (braco elevado/pre-tensao), regressoes/progressoes do bird dog (so braco/so perna,
  quadrados), side plank de joelhos (regressao do seed-ex-127), superman com bastao / bracos ao lado (variantes 406),
  ponte segmentar (variante de tempo/controle da ponte 294), McKenzie prone lying / prone on elbows / press-up
  (estagios ROM ≈ seed-ex-240), marcha supina / heel taps (regressao do dead bug), pelvic tilt em pe/na parede
  (posicao do 403), teste de Sorensen no banco romano (aparelho do 407 ≈ gif-ex-053), stomach vacuum (ja excluido
  em abdome; ≈ 405).
- Cross-referencias a registros existentes: ver tabela de inventario acima.
