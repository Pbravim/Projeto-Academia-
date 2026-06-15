# Research — reabilitacao_quadril_joelho (hip + knee rehabilitation / prehab)

Session: new-category Rehabilitation. group_muscles `["Reabilitacao"]`, category `Rehabilitation`.
IDs assigned sequentially from `seed-ex-287` (highest existing was seed-ex-286).
Schema matches `seeds/reabilitacao_ombro_cotovelo.json` exactly.

## Scope

Clinical STRENGTHENING / STABILITY / ACTIVATION for hip + knee that is NOT already in the catalog:
banded lateral/monster walks, side-lying hip abduction, glute-med activation, glute-bridge activation,
terminal knee extension (TKE), quad sets / short-arc quad, step-downs, wall sit, Spanish squat,
single-leg balance/stability, straight-leg raise (SLR), Copenhagen adductor, banded hip
abduction/adduction strengthening, tibialis raises (pre-routed here), short-foot / ankle stability.

NOT in scope (routed out, see manifest scope_exclusions):
- hip MOBILITY drills (CARs, 90/90, fire-hydrant mobility, clamshell/concha mobility, frog/adductor
  rocks, cossack, active pigeon) -> already in `mobilidade_inferior` (seed-ex-219..237).
- loaded hip thrust / loaded glute bridge / kickback / leg curl / nordic / RDL -> `posterior_gluteos`.
- squats / leg press / lunges / leg extension / hack / Bulgarian / step-UP -> `quadriceps`.
- passive figure-4/pigeon/couch/butterfly/calf/hamstring stretches -> `alongamento_estatico`.
- calf raises (gastroc/soleo plantar flexion) -> `panturrilha`.

## musculo_alvo codes

REUSED (verified present in posterior_gluteos / quadriceps / panturrilha / mobilidade_inferior):
`gluteos`, `abdutores`, `adutores`, `quadriceps`, `isquiotibiais`, `flexores_quadril`,
`tibial_anterior`, `gastrocnemio`, `soleo`, `core`, `eretores_espinha`, `lombar`.

NOTE: the existing catalog has NO separate `gluteo_medio` / `gluteo_maximo` / `vasto_medial` codes
— glute-medius work is expressed as `gluteos` + `abdutores`, quad work as `quadriceps`. To stay
consistent with the established vocabulary I REUSE `gluteos`+`abdutores` and `quadriceps` rather than
introduce gluteo_medio / VMO codes (avoids fragmenting substitution grouping).

NEW codes introduced (PT lowercase, none duplicate an existing code):
- `estabilizadores_tornozelo` — intrinsic foot + ankle stabilizers for balance/short-foot drills
  (no existing code captures proprioceptive ankle stability; tibial_anterior/gastroc/soleo are prime
  movers, not the stability target). Documented in manifest conventions.

## movement_pattern decisions

- `Abduction` — frontal-plane hip abduction strengthening (banded lateral/monster walk, side-lying
  abduction, banded clamshell strengthening, fire-hydrant-with-band, standing banded abduction,
  side-plank-with-abduction). Mirrors the ombros_lateral precedent of using Abduction for single-joint
  frontal-plane elevation; hip abduction is the lower-body analogue and there is no `Hip Abduction`
  enum value.
- `Hip Extension` — glute-dominant bridged extension (glute bridge activation, single-leg bridge,
  banded bridge, quadruped donkey kick). Same pattern posterior_gluteos uses for bridges/kickbacks;
  here the stimulus is bodyweight ACTIVATION (distinct rehab context, no clinical kg -> reps_only).
- `Hip Flexion` — straight-leg raise (SLR): hip flexion lifting the extended leg (quad + iliopsoas).
- `Knee Extension` — quad-isolation knee extension rehab (TKE, quad set isometric, short-arc quad).
  Same pattern quadriceps uses for leg extension / sissy (single-joint quad).
- `Squat` — closed-chain knee-flexion-under-load rehab (wall sit, Spanish squat, step-down). Step-DOWN
  is eccentric knee control, distinct from the catalog's step-UP (quadriceps); wall sit / Spanish squat
  are isometric squat holds.
- `null` (vocab gap, documented):
  - HIP ADDUCTION isolation (Copenhagen reps/plank, side-lying adduction, banded adduction) — there is
    NO `Adduction` / `Hip Adduction` enum value (only `Horizontal Adduction` for transverse-plane shoulder
    work, which is wrong here). Per grounding + posterior_gluteos precedent, adductor isolation -> `null`,
    grouped by musculo_alvo `adutores`.
  - DORSIFLEXION (tibialis raise / banded tibialis raise) — no `Dorsiflexion` enum value (only
    `Plantar Flexion` for calves). tibialis anterior dorsiflexion is the anterior antagonist -> `null`,
    grouped by `tibial_anterior`.
  - BALANCE / PROPRIOCEPTION (single-leg balance, short-foot) — no enum describes a static stability
    drill -> `null` (precedent: many clinical drills in reabilitacao_ombro_cotovelo used null).

## tracking_type decisions (reps_load PROHIBITED — clinical, no gym kg)

`hold` (sustained isometric / sustained position):
- seed-ex-300 Wall Sit, seed-ex-301 Spanish Squat (hold), seed-ex-296 Copenhagen Plank (hold),
  seed-ex-293 Side Plank with Hip Abduction (hold), seed-ex-304 Isometric Quad Set,
  seed-ex-307 Single-Leg Balance Hold.

`reps_only` (controlled-rep drill, no load tracking): everything else (banded walks, clamshell,
fire hydrant, side-lying abduction, standing abduction, glute bridges, donkey kick, Copenhagen reps,
side-lying/banded adduction, SLR, TKE, short-arc quad, step-down, tibialis raises, short foot).

## Exhaustive Universe Audit — sources & closure curve

Databases consulted (>=10 independent, clinical-heavy):
1. physio-pedia.com — Patellofemoral Pain Syndrome / Gluteus Medius rehab
2. physio-pedia.com — Knee Rehabilitation / ACL rehab progressions
3. theprehabguys.com / library.theprehab.com — hip & knee prehab
4. e3rehab.com — patellofemoral pain & knee rehab
5. bobandbrad.com — hip/knee strengthening exercises
6. ExRx.net — exercise directory (validates step-down, SLR, hip abduction granularity)
7. choosept.com (APTA) — PT guides for knee OA / patellofemoral pain
8. NASM blog (blog.nasm.org) — corrective exercise, lower-extremity / knee valgus
9. sportsinjuryclinic.net — hip & knee rehab exercises
10. verywellhealth.com — knee & hip rehab exercise guides
11. healthline.com — gluteus medius / knee strengthening
12. Copenhagen adductor protocol literature (Harøy et al. groin prevention) via squatuniversity / e3rehab

Closure curve:
- Round 1 (physio-pedia x2, prehab guys, e3rehab, bobandbrad) -> +22 distinct
  (banded lateral walk, monster walk, side-lying abduction, banded clamshell, fire hydrant w/band,
   standing banded abduction, side-plank w/abduction, glute bridge, single-leg bridge, banded bridge,
   donkey kick, Copenhagen reps, Copenhagen plank, side-lying adduction, banded adduction, SLR, TKE,
   quad set, short-arc quad, wall sit, Spanish squat, step-down).
- Round 2 (ExRx, APTA/choosept, NASM, sportsinjuryclinic) -> +3 distinct
  (single-leg balance hold, short-foot exercise, tibialis raise — tibialis pre-routed in, confirmed
   as the anterior dorsiflexor distinct from the calf catalog).
- Round 3 (verywellhealth, healthline, Copenhagen protocol lit) -> +1 distinct
  (banded tibialis raise — pre-routed; loaded band variant = distinct progression stimulus).
- Round 4 (re-sweep all) -> +0 distinct. Closure confirmed (3+ consecutive sources adding 0 new).

Total: 26 records (seed-ex-287 .. seed-ex-312).
ID map: 287 lateral walk, 288 monster walk, 289 side-lying abduction, 290 banded clamshell,
291 banded fire hydrant, 292 standing abduction, 293 side-plank w/abduction (hold), 294 glute bridge,
295 single-leg bridge, 296 banded bridge, 297 donkey kick, 298 Copenhagen reps, 299 Copenhagen plank
(hold), 300 side-lying adduction, 301 standing banded adduction, 302 SLR, 303 TKE, 304 quad set (hold),
305 short-arc quad, 306 wall sit (hold), 307 Spanish squat (hold), 308 step-down, 309 single-leg
balance (hold), 310 short foot, 311 tibialis raise, 312 banded tibialis raise.

tracking_type split: 20 reps_only + 6 hold (293, 299, 304, 306, 307, 309).

## Folded as non-distinct (logged in manifest)
- Lateral band walk vs monster walk: kept both (lateral = pure frontal; monster = diagonal forward/back
  with anti-internal-rotation) = distinct stimulus.
- Lateral step-down vs forward step-down -> folded into one Step-Down record (eccentric knee control;
  direction is an ROM variant, name_variations).
- Heel slides / knee ROM / prone knee hang -> ROM/mobility, routed out (not strengthening).
- Clamshell BODYWEIGHT mobility (concha) is in mobilidade_inferior (seed-ex-221); the BANDED clamshell
  STRENGTHENING is a distinct stimulus -> kept here, cross-referenced.
- Fire-hydrant mobility (mobilidade_inferior) vs banded fire-hydrant strengthening -> kept the banded
  strengthening variant; cross-referenced.
- Glute bridge LOADED (posterior_gluteos) vs bodyweight ACTIVATION bridge -> activation kept (rehab).
- Single-leg wall sit / weighted wall sit -> load/ROM variant of Wall Sit.
- Mini-band loop = "Resistance Band" in primary_equipment vocab.

## Equipment vocab handling
- `Resistance Band` (mini-band / loop band), `Cable`, `Dumbbell`, `Bodyweight` are in the vocab.
- Implements OUTSIDE the vocab -> primary_equipment `null` + free-text `equipment`:
  - "Parede" (Wall Sit, Spanish Squat — wall; Spanish squat also uses a band anchored to a post but the
    defining surface is the wall/anchor — null + free text, precedent: rehab_ombro wall holds).
  - "Step/Caixa" (Step-Down — box/step has no vocab value).
  - "Peso Corporal" with `Bodyweight` where bodyweight-only.
  - Spanish Squat uses a thick band around the knees against an anchor -> primary_equipment
    `Resistance Band` (the band defines the resisted isometric), secondary "Parede/Poste".
