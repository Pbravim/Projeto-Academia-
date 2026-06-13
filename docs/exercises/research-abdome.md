# Pesquisa — Abdome / Core (sessão `abdome`)

> Notas brutas da auditoria de universo (2026-06-13). Informativo — NÃO lido pelo app.
> Escopo = musculatura do tronco treinada por flexão/rotação/estabilização: reto abdominal
> (abdomen), oblíquos (obliquo) e core profundo/estabilização (core). Lombar (extensão de
> coluna / superman) → reabilitação/posterior; carries pesados → kettlebell/landmine.

## Eixo de classificação (4 padrões novos + 2 já existentes)
- **`Trunk Flexion`** (NOVO) — flexão de coluna (costelas → pelve): crunch, sit-up, crunch no
  banco/declinado, crunch na máquina, crunch na polia (abdominal polia alta), crunch pernas
  elevadas, sit-up com peso. Reto abdominal (ênfase superior). musculo_alvo `abdomen`.
- **`Hip Flexion`** (NOVO) — flexão de quadril / "abdominal inferior" (pelve → costelas): elevação
  de pernas (deitado/suspenso), crunch reverso, V-up/jackknife (remador pernas estendidas),
  flexão de quadril no banco/bola, flutter/alternando pernas. Reto inferior + flexores de quadril.
  musculo_alvo `abdomen`.
- **`Lateral Flexion`** (NOVO) — flexão lateral de tronco (plano frontal): flexão lateral, abdominal
  lateral, flexão lateral com bola, prancha lateral (variante isométrica). Oblíquos + QL.
  musculo_alvo `obliquo`.
- **`Anti-Extension`** (NOVO) — bracing isométrico resistindo à extensão da coluna: prancha,
  dead bug, rollout na roda abdominal. Reto + core profundo. musculo_alvo `abdomen`/`core`.
- **`Rotation`** (já existe) — rotação dinâmica de tronco: abdominal oblíquo (twist), oblíquo na
  polia, Russian twist, lenhador no cabo (woodchopper), abdominal bicicleta. musculo_alvo `obliquo`.
- **`Anti-Rotation`** (já existe) — resistir à rotação: Pallof press. musculo_alvo `obliquo`/`core`.

> 4 padrões novos (Trunk Flexion, Hip Flexion, Lateral Flexion, Anti-Extension) estendidos em
> spec sub-5 + validador + skill no mesmo commit (catalog-maintenance.md §11). Rotation e
> Anti-Rotation já existiam (foram adicionados pensando no core). Sem os 4 novos, um crunch, um
> leg raise e uma prancha cairiam todos em `null` e o algoritmo os agruparia só por musculo_alvo
> (`abdomen`) como "quase iguais" — biomecânica e estímulo distintos.

## Fontes consultadas (>10 bases)
1. **Muscle & Strength — Abs** (`/exercises/abs`) — 40 nomes: crunch (peso/cabo/banco/declinado/
   bola/em pé), sit-up (declinado), twisting/rotating crunch, leg raise (deitado/suspenso/roman
   chair/knee tuck/hip thrust), knee raise (suspenso/twist), plank (lateral/pés elevados/hip raise),
   Russian twist, air bike (bicicleta), mountain climber, Pallof (rotação/half-kneeling/wide/bridge),
   barbell rollout, dead bug, seated knee tuck, toe touch, stomach vacuum, Turkish get-up, shoulder taps.
2. **BarBend — Best Ab Exercises** — ab rollout, weighted/hollow plank, cable crunch, sit-up,
   hanging knee raise, farmer's/suitcase carry, side plank, plank, dead bug, mountain climber, bird
   dog, Pallof, reverse crunch, V-up, jackknife.
3. **ExRx.net — Waist** (via busca: BWCrunch, WtCrunch, CBKneelingCrunch, CBSeatedCrunch,
   CBStandingTwistingCrunch, CBStandingCrunch iso-lateral, hanging leg-hip raise c/ straps,
   suspended jack-knife, front plank, lever twisting leg-raise crunch) — canon; separa reto vs
   oblíquos, e variantes iso-laterais de cabo.
4. **StrengthLog — Ab Exercises** — ab wheel, hanging leg/knee raise, lying leg raise, crunch,
   oblique crunch, cable/machine crunch, plank, side plank, high plank, dead bug, ball slam, wood chop.
5. **SetForSet — Cable Ab Exercises** — kneeling cable crunch, Pallof, cable hanging leg raise,
   cable woodchopper (3 ângulos), cable side bend, cable reverse crunch, cable explosive twist.
6. **PureGym — Abs** — ab/bicycle/reverse crunch, toe touch, swiss ball crunch, plank/side plank,
   V sit-up, hanging leg/knee raise, sit-up (butterfly/decline), Russian twist, Pallof, ab wheel,
   dead bug, swiss ball pike, superman.
7. **fitliferegime — Gym Abs** — cable/machine crunch, landmine twist, cable side bend, hanging
   knee/straight-leg raise, hanging windshield wiper, ab wheel/barbell rollout, Pallof, cable wood
   chop (+ down-up/twist), stability ball tuck, incline reverse crunch, twisting sit-up, weighted
   plank, side plank lateral raise, standing machine twist, dumbbell wood chop.
8. **Gymshark — Best Ab Exercises** — bicycle crunch, bird dog, leg raise, side plank, Russian
   twist, cable woodchopper, cable crunch, med ball V-up.
9. **AthleanX — cable crunches / ab rollout** — técnica do crunch na polia e do rollout.
10. **Promixx / Centr / ACE (agregador de busca)** — cable crunch + leg raise como subestimados;
    bicycle = topo para reto + oblíquos (estudo ACE); bird dog para função lombar.

## Curva de retornos decrescentes
- **Rodada 1** (M&S + BarBend + StrengthLog + SetForSet + ExRx): **+7** distintos
  (elevação de pernas suspensa; rollout na roda abdominal; Pallof press; Russian twist; lenhador
  no cabo/woodchopper; prancha lateral; abdominal bicicleta).
- **Rodada 2** (PureGym, fitliferegime, Gymshark, AthleanX, agregador): **+0**.
  **Fechamento confirmado.**

## Roteado / excluído
- **Routed:** Landmine Twist / Landmine 180 → `forca_landmine`; Suspended Jack-knife / TRX →
  `forca_suspension_trainer`; Turkish Get-Up + carries pesados (Farmer's / Suitcase Carry) →
  `forca_kettlebell` (carries com KB/DB); Ball Slam / Medicine Ball Slam + Mountain Climber →
  `cardio_hiit_funcional` (movimento balístico/condicionamento); Bird Dog + Superman →
  `reabilitacao_lombar_core` (estabilização/extensão lombar, não flexão abdominal).
- **Não-distinto (variante de carga/ROM/ângulo/equipamento/estabilidade):**
  - *Trunk Flexion:* butterfly/decline/twisting sit-up, toe touch, swiss-ball crunch, overhead
    cable crunch, seated cable crunch (variantes de posição/ângulo do crunch/sit-up 030/121/118).
  - *Hip Flexion:* hanging knee raise (ROM/joelho dobrado do leg raise suspenso seed-ex-122),
    incline reverse crunch, seated knee tuck, knee tuck (variantes do crunch reverso 032 / flexão
    de quadril 124), hanging windshield wiper (progressão avançada do leg raise suspenso + rotação).
  - *Lateral Flexion:* cable/dumbbell side bend (variante de carga da flexão lateral 115/116/125),
    side plank lateral raise (composto ombro+oblíquo).
  - *Rotation:* cable down-up/twist, dumbbell wood chop, standing machine twist / rotary torso
    (variantes de ângulo/implemento do lenhador no cabo seed-ex-126 e do oblíquo na polia gif-ex-126).
  - *Anti-Extension:* hollow hold, weighted/feet-elevated plank, plank to hip raise / knee-to-elbow,
    swiss-ball pike/tuck/circles, shoulder taps (variantes de carga/estabilidade da prancha 031 /
    dead bug 123 / rollout seed-ex-123).
  - *Anti-Rotation:* Pallof com rotação / half-kneeling / wide-stance / glute-bridge (variantes de
    base/execução do Pallof seed-ex-124).
  - *Niche:* stomach vacuum (isometria de TVA/respiração — sem progressão de carga, estético).

## Registros novos (seed-ex-122..128)
| ID | Nome | Pattern | musculo_alvo | Equip. |
|----|------|---------|--------------|--------|
| seed-ex-122 | Elevação de Pernas Suspensa (Hanging Leg Raise) | Hip Flexion | abdomen | Bodyweight (barra fixa) |
| seed-ex-123 | Rollout na Roda Abdominal (Ab Wheel Rollout) | Anti-Extension | abdomen, core | Bodyweight + Roda Abdominal |
| seed-ex-124 | Pallof Press | Anti-Rotation | obliquo, core | Cable |
| seed-ex-125 | Abdominal Russo (Russian Twist) | Rotation | obliquo | Bodyweight (Can Be Both) |
| seed-ex-126 | Lenhador no Cabo (Cable Woodchopper) | Rotation | obliquo | Cable |
| seed-ex-127 | Prancha Lateral (Side Plank) | Lateral Flexion | obliquo, core | Bodyweight |
| seed-ex-128 | Abdominal Bicicleta (Bicycle Crunch) | Rotation | obliquo, abdomen | Bodyweight |

## Convenções de equipamento
- **Roda abdominal (ab wheel):** sem valor no vocabulário controlado. NÃO estendido — mapeado para
  `primary_equipment: "Bodyweight"` + `secondary_equipment: "Roda Abdominal"` (precedente do banco
  romano gif-ex-053 e da cadeira/apparatus: movimento de peso corporal sobre uma ferramenta).
  Barbell rollout é name_variation. Evita estender PRIMARY_EQUIPMENT para uma única ferramenta.
- **Bola suíça / Swiss ball:** mesmo tratamento — `Bodyweight` + secondary `Bola Suica`.
- **Máquina de crunch (gif-ex-117):** pino/stack → `Selectorized Machine` (retag §1).
- **Russian twist:** `Bodyweight`, `execution_type: "Can Be Both"` (peso/anilha/medicine ball opcional).
