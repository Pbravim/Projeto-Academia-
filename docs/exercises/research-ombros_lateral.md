# Research scratch — `ombros_lateral` (lateral / posterior deltoid)

> Working notes for the session. Findings appended per source to keep context lean.
> Final canonical data lives in `seeds/ombros_lateral.json` + `_manifest.json`.

## Scope
Deltoid **isolation** (não-press): elevação lateral, elevação frontal, elevação posterior /
crucifixo invertido / reverse fly, face pull, remada alta (upright row = lateral delt + trap).
**Fora:** presses (→ ombros_press), encolhimento/shrug puro (trapézio — sem sessão; rotear).

## Existing catalog IDs in scope (enrich)
- seed-ex-017 Elevacao Lateral com Haltere (deltoide_lateral)
- seed-ex-018 Elevacao Frontal com Haltere (deltoide_anterior)
- seed-ex-019 Elevacao Posterior com Haltere (rear delt, "Ombros, Trapezio")
- gif-ex-048 Face Pull no Cabo (deltoide_posterior)
- gif-ex-067 Voador Invertido / reverse pec deck (deltoide_posterior)
- gif-ex-074 Elevacao Bilateral na Maquina (lateral, Maquina)
- gif-ex-075 Elevacao Frontal no Crossover (anterior, Cabo)
- gif-ex-076 Elevacao Lateral Inclinado Sentado (lateral, Haltere)
- gif-ex-077 Elevacao Unilateral no Cross (lateral, Cabo)
- gif-ex-078 Remada Alta com Barra Ombro (upright row, Barbell)
- gif-ex-172 Remada Alta com Halteres (upright row, Dumbbell)
- gif-ex-173 Remada Alta com Barra (upright row, Barbell wide)
- gif-ex-174 Remada Alta (upright row, Barbell)

New IDs start at **seed-ex-091**.

## Databases consulted (log every source)
(appended below)

### 1. Muscle & Strength (muscleandstrength.com/exercises/shoulders)
- Lateral: DB lateral raise, seated DB lateral, one-arm DB lateral, cable lateral, single-arm cable lateral (crossbody), machine lateral, lateral raise partials
- Front: standing DB front raise, barbell front raise, plate front raise, cable front raise (bilateral), overhead plate front raise
- Rear: bent-over DB reverse fly, seated bent-over DB reverse fly, standing cable reverse fly, machine reverse fly, incline rear delt fly, bent-over low-pulley rear delt fly, head-on-bench rear delt fly
- Face pull: cable face pull, cable face pull w/ external rotation
- Other: cable external rotation (rotator, not delt), band pull-apart, scapular wall slide, DB "6 ways"

### 2. ExRx.net (DeltoidLateral / DeltoidPosterior lists)
- Lateral: Cable Isolateral Lateral Raise, DB Incline Lateral Raise, Cable Isolateral Y Raise (Y-raise)
- Posterior: Cable Isolateral Reverse Fly, Cable Isolateral Rear Lateral Raise, DB Rear Lateral Raise, DB Lying Rear Lateral Raise, Lever Isolateral Lying Rear Lateral Raise (machine), Cable Rear Lateral Raise
- ExRx separates iso-lateral cable/machine + lying variants as distinct.

### 3. Lateral cluster (Fitbod, BuiltWithScience, FitLifeRegime, AthleanX, Gymshark, Men's Journal)
- Behind-the-back cable lateral raise (lengthened position, constant tension) — DISTINCT
- Leaning/lean-away cable lateral raise (overload top ROM) — DISTINCT
- Side-lying cable lateral raise / lean-in DB lateral raise — stretch-position variant (fold into lateral)
- Bilateral simultaneous cable lateral raise — variant of cable lateral

### 4. Rear cluster (BarBend, PureGym, Gymshark, LiftVault, RP Strength, SetForSet)
- Cable face pull (rear delt + retraction) — exists gif-ex-048
- Reverse DB fly (bent-over) — DISTINCT
- Standing reverse cable fly (less low-back) — DISTINCT
- Incline bench rear delt fly — variant (head/chest-supported) of reverse fly
- Reverse pec deck fly — exists gif-ex-067
- Band pull-apart — DISTINCT (band; rear delt + retraction) → but band → route? It's a fundamental rear-delt move. Decide: route to forca_elastico_funcional (new band).
- T-Y-I / prone Y raise — rear/lower-trap raise → niche, exclude or 1 record (prone Y)

### Diminishing returns
Round 1 (M&S + ExRx) → big set. Round 2 (lateral + rear clusters, ~10 sources) → +behind-back, +leaning, +bent-over reverse fly, +standing cable reverse fly. Curve flattening; remaining are stretch/position/tempo variants.

### 5. Upright row cluster (FitLifeRegime, PureGym, Legion, weighttraining.guide, M&S)
- Cable upright row (rope/EZ, constant tension) — DISTINCT → seed-ex-095
- Wide vs narrow grip (delt vs trap emphasis) — grip variant, folded into existing barbell records
- EZ-bar / Smith upright row — implement microvariants → excluded

## CLOSURE
18 records total (13 existing enriched + 5 new seed-ex-091..095). ≥15 distinct databases. Curve: +base → +5 → +0.
New movement_pattern vocab: `Abduction`, `Horizontal Abduction` (spec + validator + skill + catalog-maintenance §6).
Validator: 0 erros, 0 warnings (141 registros).
