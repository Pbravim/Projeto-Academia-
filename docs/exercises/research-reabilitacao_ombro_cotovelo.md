# Research — reabilitacao_ombro_cotovelo (Shoulder + Elbow Rehab/Prehab)

Session date: 2026-06-15. New category section "Reabilitacao" (group_muscles `["Reabilitacao"]`,
category `Rehabilitation`). IDs from seed-ex-258. tracking_type ∈ {reps_only, hold} only.

## Scope
Rotator-cuff isolation, scapular stabilization, shoulder mobility-rehab (pendulum, sleeper stretch),
and elbow rehab (epicondylitis eccentrics, FlexBar/Tyler twist, pronation/supination, wrist curls/AROM).

## New musculo_alvo codes introduced (lowercase PT; validator only requires non-empty array)
- `rotador_externo` — REUSED (already 52 occurrences; infraspinatus + teres minor / external rotators).
- `rotador_interno` — NEW (subscapularis + internal rotators; no prior code; never map to rotador_externo).
- `manguito_rotador` — REUSED (rotator cuff as a whole; used for scaption/full-can/empty-can/pendulum).
- `supraespinhal` — NEW (supraspinatus; the empty/full-can target; no prior code).
- `serratus_anterior` — REUSED (serratus anterior; wall slides, scapular push-up, protraction).
- `trapezio` / `romboides` / `deltoide_posterior` — REUSED (scapular retraction, Y-T-W-I raises).
- `extensores_antebraco` — NEW (wrist/finger extensors; lateral epicondylitis eccentrics, Tyler twist).
- `flexores_antebraco` — REUSED (wrist flexors; medial epicondylitis eccentrics, wrist curls).
- `braquiorradial` — REUSED (forearm; pronation/supination, elbow AROM secondary).
- `biceps_braquial` — REUSED (elbow flexion AROM, supination).

## tracking_type decisions (per record)
- `reps_only` for controlled-rep drills: banded/cable ER & IR, full/empty can, Y-T-W raises,
  scapular retraction, serratus wall slide, scapular push-up, wall angel, pendulum (circles counted),
  side-lying DB ER, prone ER 90°, eccentric wrist ext/flex, Tyler twist, pronation/supination,
  wrist curl/extension, elbow flexion-extension AROM. No load tracked clinically (reps_load forbidden).
- `hold` for sustained isometrics / static end-range holds: isometric ER wall hold,
  scapular wall hold, prone I hold, sleeper stretch (sustained IR stretch).

## movement_pattern decisions
- `Rotation` for shoulder ER/IR (banded/cable 0° & 90°, side-lying DB ER, prone ER 90°, isometric ER hold).
- `Abduction` for scaption / full-can / empty-can (frontal/scapular-plane elevation, single-joint).
- `Horizontal Abduction` for prone T raise (transverse-plane abduction of the arm).
- `Elbow Flexion` for elbow flexion AROM; `Elbow Extension` not used (AROM folded into one flex-ext record).
- `null` for everything with no matching enum: prone Y/W/I raises (scapular elevation, not a clean enum),
  scapular retraction/setting, serratus wall slide, scapular push-up (protraction), wall angel,
  scapular wall hold, pendulum (passive circumduction), sleeper stretch (IR stretch),
  eccentric wrist ext/flex, Tyler twist, pronation/supination, wrist curl/extension.
  Validator permits null; never force a wrong pattern.

## Equipment-vocab gaps
- FlexBar / Theraband bar (Tyler twist): NOT in controlled vocab → `primary_equipment: null`,
  free-text `equipment: "FlexBar/Barra de Resistencia"` (precedent: alongamento_estatico used null +
  free equipment for wall/strap; mobilidade used null for Bastao/Parede/Rolo).
- Wall (isometric ER hold, scapular wall hold, wall angel, serratus wall slide): `primary_equipment: null`,
  free `equipment: "Parede"`.
- Resistance band IS in vocab → `Resistance Band` (banded ER/IR, pull-apart-style retraction option).
- Dumbbell IS in vocab → `Dumbbell` (side-lying ER, prone raises, full/empty can, wrist curls).
- Cable IS in vocab → `Cable` (cable ER/IR).
- Bodyweight for pendulum (or light DB held — kept Bodyweight, light DB is a load microvariant).

## Source-by-source audit (≥10 independent databases; clinical/physio heavy)

### Round 1 — clinical canon
1. **physio-pedia.com (Rotator Cuff / Scapular Dyskinesis / Shoulder Rehab)** — base set:
   side-lying ER, banded ER/IR at 0°, ER/IR at 90° abduction, full-can, empty-can/scaption,
   prone Y-T-W-I, scapular retraction/setting, serratus wall slide, pendulum (Codman), sleeper stretch.
   → big base set (~16 distinct).
2. **theprehabguys / [P]rehab** — scapular push-up (protraction), wall angels, isometric ER holds,
   prone I hold, cable ER/IR (constant tension vs band). → +5.
3. **e3rehab / bobandbrad** — elbow: eccentric wrist extension (lateral epicondylitis, "tennis elbow"),
   eccentric wrist flexion (medial epicondylitis, "golfer's elbow"), Tyler twist (FlexBar reverse-twist),
   wrist curls / wrist extensions (rehab), forearm pronation/supination, elbow flexion-extension AROM. → +7.

### Round 2 — fitness DBs + APTA/sports
4. **ExRx.net (Directory / RotatorCuff / Forearm)** — confirms side-lying ER, cable ER/IR, wrist curl,
   wrist extension, pronation/supination, full-can. Distinguishes 0° vs 90° ER. → +0 new distinct
   (all already enumerated; ExRx confirms granularity rather than adding cells).
5. **choosept.com / APTA** — confirms pendulum, scapular retraction, sleeper stretch (post-op protocols).
   → +0 new distinct.
6. **NASM/CES (corrective-exercise)** — confirms wall slides, Y-T-W, scaption; adds nothing distinct
   beyond the band/DB cells already enumerated. → +0.
7. **sportsinjuryclinic.net** — confirms epicondylitis eccentrics + Tyler twist + ER/IR isometrics. → +0.

### Round 3 — closure confirmation
8. **verywellhealth.com (rotator-cuff / tennis-elbow exercises)** — confirms full list; no new cell. → +0.
9. **muscleandstrength.com / BarBend (rotator-cuff prehab)** — band ER/IR, face pull (already in catalog →
   excluded), scaption. → +0 new distinct.
10. **healthline.com (shoulder & elbow rehab)** — pendulum, wall walk (folded into wall slide / scapular),
    epicondylitis eccentrics. → +0 new distinct.
11. **squatuniversity / shoulder-care content** — sleeper stretch caveats, ER/IR, scapular control. → +0.

## Diminishing-returns closure curve
- Round 1 (physio-pedia + prehab guys + e3rehab/bobandbrad): +28 distinct (full enumeration).
- Round 2 (ExRx, APTA/choosept, NASM/CES, sportsinjuryclinic): +0 new distinct (confirmation only).
- Round 3 (verywellhealth, M&S/BarBend, healthline, squatuniversity): +0 new distinct.
→ Closure confirmed: two consecutive full rounds (4 + 4 = 8 sources past the base) returned ZERO new
distinct in-scope exercises. 11 databases total (clinical-heavy). Universe closed at 29 records.

## Enumeration axes (implement × position × angle × execution)
- Shoulder rotation: ER & IR × {band, cable, side-lying DB} × {0°, 90° abduction} + prone ER 90° DB
  + isometric ER wall hold. Side-lying covers DB-ER-0° (gravity); prone covers DB-ER-90°.
- Scaption family: full-can vs empty-can (distinct cuff stress: empty-can = supraspinatus impingement
  emphasis, full-can = safer supraspinatus+delt) → 2 records.
- Scapular: Y, T, W, I prone raises (4 distinct vectors) + retraction/setting + serratus wall slide
  + scapular push-up (protraction) + wall angel + scapular wall hold (isometric).
- Shoulder mobility-rehab: pendulum/Codman + sleeper stretch (IR-specific; cross-body posterior-delt
  already = seed-ex-174, excluded).
- Elbow: eccentric wrist ext + eccentric wrist flex + Tyler twist + pronation/supination + wrist curl
  + wrist extension + elbow flexion-extension AROM.

## scope_exclusions
- routed_to_other_sessions: face pull (gif-ex-048, ombros_lateral), reverse/rear-delt fly (ombros_lateral),
  cross-body shoulder stretch (seed-ex-174, alongamento_estatico), banded pull-apart (ombros_lateral /
  forca_elastico_funcional ledger), wrist flexor/extensor passive stretches (seed-ex-180/181 alongamento).
- excluded_as_non_distinct: prone I hold folded as `hold` variant alongside the reps prone I (kept the
  hold as the distinct stimulus); wall walks / finger ladder = ROM variant of wall slide; broomstick AROM
  flexion = folded into pendulum/AROM; "around-the-world" cuff warmups = scaption variant; weighted/cable
  full-can = load microvariant of DB full-can; ball-squeeze / putty grip = hand-rehab out of scope.
