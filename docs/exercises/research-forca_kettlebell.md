# Pesquisa — Força Kettlebell (sessão de expansão `forca_kettlebell`)

> Notas brutas da auditoria (2026-06-13). Informativo — NÃO lido pelo app.
> Sessão de EXPANSÃO: cria registros NOVOS (gif_path null) com `primary_equipment: "Kettlebell"`.
> Regra-chave: cria só os estímulos KB-DISTINTOS. Movimentos que são apenas a versão-KB de um
> exercício já existente (goblet squat, RDL, remada, rosca, press, afundo…) NÃO viram registro novo
> — são variantes de implemento; o sistema de equipamento/substituição cobre o KB como alternativa.

## Estímulos KB-distintos (o que entra)
- **Balísticos de quadril** (não existe nenhum balístico no catálogo — terra/stiff são "grind"):
  swing (2 mãos), snatch (balístico ao overhead).
- **Complexos de estabilidade/offset** (a massa deslocada do KB é o estímulo): Turkish get-up,
  windmill, bottoms-up press (pegada de fundo p/ cima — demanda de estabilização única).
- **Carries** (NÃO existe `Carry` no catálogo): farmer's carry (bilateral, grip/trapézio/core),
  suitcase carry (unilateral, anti-flexão-lateral / core).

## O que NÃO entra (variante de implemento de registro existente)
goblet/front squat (≈ seed-ex-115), terra/RDL/single-leg/sumo DL (≈ seed-ex-014/039/gif-ex-133),
remada KB/gorilla row/renegade row (≈ remadas existentes), rosca KB (≈ rosca DB), floor/bench/strict/
one-arm/Z press/push press/thruster (≈ presses existentes seed-ex-016/084/088), clean & clean-and-press/
jerk (≈ Clean gif-ex-137 + press), high pull (≈ swing + remada alta gif-ex-078), step-up/reverse/walking
lunge/split squat (≈ seed-ex-036/114/116), push-up, lateral raise (≈ seed-ex-017), dead bug/plank
pull-through (≈ gif-ex-123/seed-ex-123). Waiter's walk = variante de carry overhead (dobrado em carry).

## Roteado (sessões bloqueadas / outras)
Halo, arm bar, standing hip flexor raise → mobilidade (bloqueada §13); Kettlebell Tibialis Raise →
reabilitacao_quadril_joelho (bloqueada §13). Estes aguardam o desbloqueio das `new_categories`.

## Fontes consultadas (>10 bases)
1. **Muscle & Strength — Kettlebell** (`/exercises/kettlebell`) — ~40 nomes (swing/clean/snatch/press/
   squat/row/carry/get-up/windmill/lunge/halo/arm-bar/SDL high pull).
2. **BarBend — Best Kettlebell Exercises** — separa explicitamente KB-único (get-up, swing, snatch,
   clean) de variantes-DB (RDL, suitcase DL, ballistic row, goblet, thruster, strict press).
3. **StrengthLog — 27 Best Kettlebell Exercises** — 10 KB-únicos (swing 1/2-braço, snatch, clean,
   clean&jerk, clean&press, get-up, windmill, halo, gorilla row) + 17 equivalentes-DB.
4. **rdellatraining — Top 21 Kettlebell** — deadlift, swing (single/double), goblet, get-up, press,
   clean, snatch, push press, jerk, windmill, bent press, bottoms-up press, renegade row.
5–10. **Agregador (busca):** Men's Fitness, VIVO 50, kettlebellsworkouts 52, Fitbod 42, Lifemaxx 7,
   completestrength — confirmam o cluster sem distintos novos.

## Curva de retornos decrescentes
- **Rodada 1** (M&S + BarBend + agregador): **+7** distintos (swing, snatch, get-up, windmill,
  bottoms-up press, farmer's carry, suitcase carry).
- **Rodada 2** (StrengthLog 27, rdellatraining 21): **+0** distintos (resto = variantes/combos/duplos
  ou implemento-variante). **Fechamento confirmado.**

## Registros novos (seed-ex-131..137)
| ID | Nome | Pattern | musculo_alvo | Exec. |
|----|------|---------|--------------|-------|
| seed-ex-131 | Kettlebell Swing | Hinge | gluteos, isquiotibiais | Bilateral |
| seed-ex-132 | Kettlebell Snatch | Hinge (review_flag: balístico/olímpico) | gluteos, isquiotibiais | Unilateral |
| seed-ex-133 | Turkish Get-Up | null (complexo full-body) | core, deltoide_anterior | Unilateral |
| seed-ex-134 | Kettlebell Windmill | Lateral Flexion | obliquo | Unilateral |
| seed-ex-135 | Bottoms-Up Press | Vertical Push | deltoide_anterior, deltoide_lateral | Unilateral |
| seed-ex-136 | Farmer's Carry | Carry | trapezio, core | Bilateral |
| seed-ex-137 | Suitcase Carry | Carry | obliquo, core | Unilateral |

## Convenções
- `primary_equipment: "Kettlebell"` em todos. Swing/snatch seguem o precedente do Clean (gif-ex-137):
  Composto + Hinge; snatch ganha `review_flag` (sem category Power/olímpica no enum).
- Get-up: `movement_pattern: null` (complexo ground-to-stand, sem padrão único — agrupa por musculo_alvo).
- `Carry` (já no enum, sem uso até aqui) ativado por farmer's/suitcase carry — 1º uso. Suitcase =
  anti-flexão-lateral (core/obliquo); farmer's = grip/trapézio bilateral.
