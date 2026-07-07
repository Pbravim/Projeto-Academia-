# Research — forca_elastico_funcional (elasticos / resistance bands)

Sessao de expansao de forca com `primary_equipment: "Resistance Band"`. Executada em 2026-07-06.
Seeds: `apps/mobile/src/infrastructure/exercises/seeds/forca_elastico_funcional.json` (seed-ex-371..384, 14 registros).

## Regua da sessao

Precedente kettlebell/landmine, adaptado: o elastico tem **curva de resistencia ascendente**
(tensao cresce com o alongamento), um estimulo genuinamente distinto de peso livre/cabo — e as
sessoes-mae (peito_press, peito_fly, ombros_lateral, biceps, triceps_*, quadriceps) ja julgaram os
movimentos que rotearam para ca como dignos de registro. Portanto:

- **ROTEADOS entram**, salvo duplicata direta de registro existente (reabilitacao ja tem o grosso
  do trabalho de mini band; gif-ex-037 band row e gif-ex-068 band overhead press ja existem).
- **Achados extras da auditoria**: regua estrita — so entra o que e um padrao de movimento inteiro
  ainda sem registro de elastico (agachamento, hinge, puxada vertical); variantes de
  posicao/pegada/ancoragem/execucao sao ledger.
- **Banda na barra (resistencia acomodativa) e metodo de carga, nao exercicio** — precedente do
  peito_press ("Press com Correntes/Bandas" excluido) confirmado pela T-Nation, que trata
  band-resisted/reverse-band como metodos. Por isso o "Band-Resisted Landmine Press" (roteado por
  forca_landmine) foi EXCLUIDO, nao registrado.

## Nucleo roteado pelas sessoes completas (ledger do manifest)

| Roteado por | Movimento | Decisao |
|---|---|---|
| peito_press | Standing Band Chest Press | seed-ex-371 |
| peito_press | Standing Incline/Decline Band Press | dobrado em seed-ex-371 (altura de ancoragem = variante) |
| peito_press | Banded Push-Up | seed-ex-372 |
| peito_fly | Band Fly | seed-ex-373 |
| peito_fly | Resistance Band Chest Crossover | seed-ex-374 |
| ombros_press | Banded Overhead Press "novo" | duplicata — gif-ex-068 ja cobre |
| ombros_lateral | Band Pull-Apart | seed-ex-376 |
| ombros_lateral | Banded Lateral Raise | seed-ex-377 |
| biceps | Resistance Band Curl | seed-ex-378 |
| biceps | Banded Hammer Curl | seed-ex-379 |
| triceps_push_down | Band Triceps Pushdown | seed-ex-380 |
| triceps_push_down + triceps_overhead | Band Overhead (Triceps) Extension | seed-ex-381 (roteado 2x, 1 registro) |
| quadriceps | Spanish Squat | duplicata — seed-ex-307 (reabilitacao) ja cobre |
| quadriceps | Banded Sissy Squat | seed-ex-384 (+ review_flag de proximidade com seed-ex-117) |
| posterior_gluteos | Lateral Band Walk | duplicata — seed-ex-287 (reabilitacao) |
| posterior_gluteos | Diagonal Band Walk | duplicata — seed-ex-288 Monster Walk (reabilitacao) |
| posterior_gluteos | Banded Glute Bridge | duplicata — seed-ex-296 (reabilitacao) |
| forca_landmine | Band-Resisted Landmine Press | excluido — resistencia acomodativa e metodo de carga |

As rotas de posterior_gluteos/quadriceps datam de 2026-06-13; as sessoes de reabilitacao
(2026-06-14+) preencheram esses movimentos antes desta sessao — por isso viraram duplicatas.

Extras da auditoria (padroes inteiros sem elastico no catalogo, confirmados como staples em >=6
bases): **Banded Squat** (seed-ex-382), **Banded Deadlift/RDL** (seed-ex-383), **Banded Lat
Pulldown** (seed-ex-375).

## Bases consultadas (por fonte)

### 1. BarBend — "The 15 Best Resistance Band Exercises" (https://barbend.com/best-resistance-band-exercises/)
Chaos Push-Up, Bent-Over Rear Delt Flye, Spanish Squat, Half-Kneeling Band Row, Band Thruster,
Band-Assisted Broad Jump, Band Biceps Curl, Overhead Triceps Extension, Band-Resisted Push-Up,
Band X Crossover Lateral Walk, Band-Assisted Chin-Up, Mini Band Hip Flexion Iso Hold, Banded
Passive Leg Lower, Tall-Kneeling Pull-Apart, Banded Hamstring Curl.
→ Confirma: curl, overhead extension, push-up resistido, pull-apart. Spanish squat/chin-up
assistido/lateral walk ja existem; thruster/broad jump/chaos push-up = combos/instabilidade (ledger).

### 2. Living.Fit — "Top 20 Resistance Band Exercises" (https://www.living.fit/blogs/news/20-resistance-band-exercises-for-full-body-workouts)
Banded Push-Up, Chest Press, Chest Fly, Row, Lat Pulldown, Overhead Press, Lateral Raise, Bicep
Curl, Tricep Pushdown, Pallof Press, Woodchop, Dead Bug, Squat, RDL, Glute Bridge, Lateral Walk,
Leg Press, Deadlift, Thruster, Good Morning.
→ Confirma o nucleo inteiro + squat/deadlift/pulldown como staples. Pallof/woodchop/dead bug =
variantes de implemento de seed-ex-124/126/gif-ex-123 (ledger).

### 3. Muscle & Strength — diretorio de bands (https://www.muscleandstrength.com/exercises/bands) + Band Only Workout (https://www.muscleandstrength.com/workouts/band-only-muscle-building-workout)
Diretorio: lateral raise, standing shoulder press, upright row, face pull (2 var.), Y's,
pull-apart (2 var.), 5x pull-up/chin-up assistido/resistido, reverse fly, glute bridge, lateral
walk, nordic assistido, tibialis raise, clam, diagonal walk, tricep extension (2 var.), dip
assistido, hip flexion drills, dead bug, bird dog RNT, good morning, rotacoes ER/IR (6 var.).
Workout: Standing Band Shoulder Press, Band Push Ups, Single Arm Standing Flys, Lateral Raise,
Triceps Pushdown, Pallof Press, Kneeling Lat Pulldowns, Seated Rows, Moto Rows, Upright Rows,
Hammer Curls, Pull-Aparts, Bulgarian Split Squats, Nordic assistido, Band Squats, Lying Leg
Curls, TKE, Goodmornings.
→ Confirma: pulldown ajoelhado, hammer curl, squat, pushdown, pull-apart, lateral raise.
Rotacoes/TKE/nordic/tibialis/clam/walks ja existem em reabilitacao. Upright row/face pull/leg
curl/pallof = variantes de implemento (ledger).

### 4. SET FOR SET — "Top 24 Resistance Band Exercises" (https://www.setforset.com/blogs/news/24-best-resistance-band-exercises)
Thrusters, Hinge|Row|Squat, Lateral Lunge Upright Row, Power/Split/Sumo Squats, Good Mornings,
Lateral Walk, Hip Bridge, Upright Row, Kneeling Overhead Press, Lateral Raise, Chest Press, Chest
Fly, Banded Push Up, Pull Aparts, Pulldown|Shrug, Single Arm Bent Over Row, Biceps Curl, Kneeling
Triceps Extension, Reverse Curl|Press, Crossbody Chop, Hollow Hold, Resisted Plank Lift Offs.
→ +0 registros novos: tudo ou ja no nucleo ou combo atletico/variante (ledger).

### 5. Gymshark Central (https://www.gymshark.com/blog/article/how-to-use-resistance-bands)
Pull Aparts, Bicep Curls, Tricep Press Down, Good Mornings, Squats, Assisted Pull Ups, Push Ups,
Banded Bench Press (acomodativa). → +0 novos; confirma nucleo.

### 6. Healthline (https://www.healthline.com/health/exercise-fitness/resistance-band-exercises)
High-to-low rows, lawn mower pull. → +0 novos (variantes de remada; gif-ex-037 cobre).

### 7. Hevy Exercise Library (https://www.hevyapp.com/equipment/resistance-band/)
Hammer Curl (Band), Deadlift (Band). → +0 novos; confirma seed-ex-379 e seed-ex-383 como
registros canonicos de app de treino.

### 8. ACE Fitness — Exercise Library bands/cables (https://www.acefitness.org/resources/everyone/exercise-library/equipment/resistance-bands-cables/)
Ankle Flexion, Anti-rotation Reverse Lunge, High Row, Kneeling Lat Pulldown, Kneeling Reverse
Fly, Kneeling Wood Chop, Hay Baler, Lunge to Row, partner drills.
→ Confirma pulldown ajoelhado (seed-ex-375); resto combos/variantes/parceiro (ledger). +0 novos.

### 9. FitLifeRegime — band chest (https://fitliferegime.com/resistance-band-chest-exercises/)
Standing Band Chest Press, Standing Incline Press, Standing Decline Press, Chest Fly, Low-to-High
Fly, High-to-Low Fly, Push-Up, Band Pullovers, Band Floor Press, Band Punches, Single Arm Press,
Squeeze Press, Band Hug, Single-Arm Crossover, Close Grip Push-Up, Band-Assisted Dip.
→ +0 registros novos: incline/decline/low-high sao altura de ancoragem (dobrados em 371/373/374);
pullover/floor press/punches/squeeze = variantes (ledger).

### 10. Sweat (https://sweat.com/blogs/fitness/resistance-band-exercises)
Donkey kick, sumo squat pulsado, clam, glute bridge c/ abducao, crab walk, lateral plank walk,
pull-aparts, seated row, bent-over row, alternating lat pull-down. → +0 novos (gluteo/mini band ja
em reabilitacao; rows em gif-ex-037; pulldown ja incluido).

### 11. T-Nation — band training methods (https://archive.t-nation.com/training/resistance-band-exercises-workouts/)
RNT, Reverse Band, Band Resisted (acomodativa), Assisted Plyometrics — metodos de carga, nao
exercicios. → +0 novos; fundamenta a exclusao do Band-Resisted Landmine Press e das variantes
"barbell + band".

## Curva de fechamento (retornos decrescentes)

- Rodada 1 (BarBend + Living.Fit + M&S): nucleo roteado confirmado + 3 extras distintos
  (Banded Squat, Banded Deadlift, Banded Lat Pulldown) → **+3 alem do roteado**
- Rodada 2 (SET FOR SET + Gymshark): **+0** (upright row, good morning, thruster, reverse curl → ledger)
- Rodada 3 (Healthline + Hevy + ACE + FitLifeRegime): **+0** (pullover, floor press, punches, combos → ledger)
- Rodada 4 (Sweat + T-Nation): **+0** → universo fechado.

11 bases independentes consultadas (M&S contada uma vez com 2 URLs).

## Registros existentes com elastico NAO recriados

gif-ex-036 (barra fixa assistida), gif-ex-037 (remada), gif-ex-068 (desenvolvimento),
gif-ex-134 (extensao de quadril/kickback), seed-ex-206/253 (pass-through), seed-ex-236/237
(mobilidade), seed-ex-259..262 (rotacoes de manguito), seed-ex-287/288/290/291/292/296/301/303/307/312
(reabilitacao quadril/joelho).
