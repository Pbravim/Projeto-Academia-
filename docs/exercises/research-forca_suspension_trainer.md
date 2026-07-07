# Pesquisa: forca_suspension_trainer (TRX / fitas de suspensão)

Sessão de expansão — 2026-07-06. Escopo: exercícios cujo estímulo é definido pela **instabilidade da suspensão** (primary_equipment `Suspension Trainer`). Núcleo do escopo = movimentos roteados pelas sessões completas no `_manifest.json`: Suspended Fly / TRX Chest Fly (peito_fly), Suspension/TRX Pull-Up (costas_pull_vertical), TRX Row (costas_pull_horizontal), TRX Biceps Curl (biceps), TRX Triceps Extension (triceps_push_down), Suspended Jack-Knife + TRX Pike/TRX Crunch (abdome).

Régua de inclusão (precedente kettlebell/landmine): registro novo SÓ quando a suspensão muda o estímulo vs registro existente. Variante de implemento com estímulo ≈ idêntico → `excluded_as_non_distinct` citando o id existente. Combos/híbridos atléticos → excluídos.

## Fontes consultadas (11 bases independentes)

| # | Base | URL | Achados relevantes |
|---|------|-----|--------------------|
| 1 | ExRx.net (enumeração via busca; páginas individuais retornam 403 ao fetch direto) | exrx.net/WeightExercises/... (STRow, STInvertedRow, STPullup, STSelfAssistedPullup, STFly, STChestPress, STHipBridge, STHipAbduction, STTricepsExtension, STHangingLegCurl, STStraightHipLegCurl, STArmCurl) + exrx.net/Workouts/Workout1ST | Canon biomecânico: Suspended Row/Inverted Row, Fly, Chest Press, Pull-up (+ self-assisted), Hip Bridge, Hip Abduction, Triceps Extension, Hanging Leg Curl (+ straight-hip variante), Arm Curl |
| 2 | TRX Training (oficial) | trxtraining.com/blogs/news/trx-exercises | 20+: rows (single-arm), pull-ups, push-ups, chest press, chest fly, clock press, curls, triceps press/kickback, squat, split/pistol/lateral lunge, hamstring curl, pike, mountain climber, standing rollout, atomic push-up, combos (squat row, Y fly combo) |
| 3 | SET FOR SET | setforset.com/blogs/news/trx-exercises-and-workouts | 16: chin-up, pull-up, inverted row, reverse fly, suspended push-up, decline push-up (pés nas fitas), dip, chest fly, squat, RFESS, glute bridge, pistol, rollout, knee tuck, jump squat, mountain climber |
| 4 | BarBend | barbend.com/best-trx-exercises/ | 15: IYT, inverted row, hamstring curl, jump squat, body saw, hip extension, side plank, single-arm chest press, suspended lunge, kneeling rollout unilateral, pistol, plank, power pull, atomic push-up, hip drop |
| 5 | Fitbod | fitbod.me/exercises/trx | 61 nomes: row, curl, triceps ext, chest press/fly, Y/T/W deltoid fly, pike, push-up, glute bridge/hip thrust, hamstring pull-in, pistol/single-leg squat, fallout, ab rollout, plank/side/reverse plank, leg raise, calf raise, cossack/curtsy/lateral/balance lunges, sprinter start, body saw, resisted rotations, combos |
| 6 | Fitness Freedom Athletes | fitnessfreedomathletes.com/...35-suspension-training-exercises/ | 35: chest press, dips, flys, low/high/reverse-grip row, reverse/hammer/drag curls, skull crusher + hammer-grip ext, close press, side/front raise, Ys & Ts, face pulls, shoulder press, knee-to-chest, superman, jack knife, plank, side bends, pistol, front/reverse lunge, quad/hamstring squats, hamstring curls, calf raises |
| 7 | Greatist | greatist.com/fitness/effective-trx-exercises | 44: push-up, chest press/fly, inverted/low/single-arm/three-way row, triceps ext, biceps curl, Y fly, T deltoid fly, clock press, fallout, pike, hamstring pull-in (+ single-leg), lunges (curtsy/lateral), pliés, planks, glute bridge, sprinter start, combos/cardio |
| 8 | ISPO | ispo.com/en/know-how/trx-exercises-top-11-suspension-trainer | 11: pushup, row, squat, pullup, pistol, RFSS, hamstring curl, knee tuck, L-sit, biceps curl, triceps extension |
| 9 | SF HealthTech | sfhealthtech.com/blogs/post/best-trx-exercises | 11: pull-up, chin, row, feet-elevated press-up, fly, RFESS, squat-to-Y (combo), hamstring runner, curl, triceps press, pike |
| 10 | Muscle & Strength | muscleandstrength.com/articles/complete-guide-to-trx-suspension-training | inverted row, push-up, body saw, pike, single-leg burpee (combo) |
| 11 | ACE Fitness | acefitness.org/resources/pros/expert-articles/8773/quick-hit-workout-suspension-trainer/ | suspended lunge, back row, hamstring curl, chest press, atomic push-up, single-arm row, biceps curl, side lunge c/ arm raise, hip press, spider walks |

Bloqueadas (403/404, não contam): sandandsteelfitness.com (106 lista), stack52.com (infográfico sem texto), puregym.com (404).

## Curva de fechamento (retornos decrescentes)

- **Rodada 1** (ExRx, TRX oficial, SET FOR SET, BarBend, Fitbod): **+13 distintos** in-scope (row, chest press/push-up, fly, T fly, Y fly, curl, triceps ext, pistol/single-leg squat, afundo suspenso/RFESS, hamstring curl, pike, knee tuck/jack-knife, fallout/rollout).
- **Rodada 2** (Fitness Freedom Athletes, Greatist): **+0 distintos** (face pull, side/front raise, shoulder press, superman, hammer/reverse/drag curls, high/low row → todos excluídos como não-distintos ou dobrados em registros; ver ledger).
- **Rodada 3** (ISPO, SF HealthTech, 2ª enumeração ExRx): **+0 distintos** (L-sit nicho de 1 base; straight-hip leg curl dobra no hamstring curl).
- **Rodada 4** (Muscle & Strength, ACE): **+0 distintos** (hip press → ledger; resto já visto). **Fechamento confirmado.**

## Decisões principais

1. **13 registros, seed-ex-321..333.** `equipment` legado = `"Fitas de suspensao (TRX)"`; `primary_equipment` = `"Suspension Trainer"`; `secondary_equipment` = null (carga é o peso corporal, implícito — precedente landmine/kettlebell de secondary null).
2. **Anéis (gymnastic rings) dobram como variação**, não como registro/equipamento próprio: ExRx trata "suspension trainer ou rings" como o mesmo implemento em todas as páginas ST; name_variations levam "Ring Row", "Ring Push-Up" etc. Movimentos exclusivos de anéis (muscle-up, iron cross) ficam FORA (ginástica, não musculação de academia).
3. **TRX Pull-Up excluído** apesar de roteado por costas_pull_vertical: pendurado nas fitas o corpo balança livre — o estímulo ≈ barra fixa pegada neutra/rotante (seed-ex-009/072), mesmo precedente do Ring Dip excluído em peito_press. Nenhuma das 11 bases o descreve com recrutamento distinto da barra fixa; ExRx o lista, mas como equivalente direto ao pull-up.
4. **TRX Chest Press e TRX Push-Up = um registro** (seed-ex-322): mesmo movimento com mãos nas alças, o ângulo do corpo é só progressão de carga. Push-up com PÉS nas fitas = variante de estabilidade da flexão declinada (seed-ex-046) → excluído. Atomic push-up = combo flexão+grupado → excluído.
5. **Remada TRX é registro novo** (≠ seed-ex-080 Remada Invertida em barra): alças independentes/instáveis, arco de pegada rotante e single-arm sem torção do punho — 11/11 bases a listam como o exercício nº 1 de TRX. High/low/reverse-grip/single-arm row dobram nela (`Can Be Both`).
6. **Y e T viram 2 registros** (padrões distintos: `Abduction` trap inferior vs `Horizontal Abduction` deltoide posterior — precedente das prone raises seed-ex-269/270 separadas). **W fly / TRX Face Pull excluídos** como não-distintos (rotação externa + abdução horizontal ≈ gif-ex-048 Face Pull no Cabo + seed-ex-324 novo + seed-ex-271 W prona; face pull explícito em só 1 de 11 bases).
7. **Afundo Suspenso (RFESS nas fitas) incluído com review_flag**: 6 de 11 bases o listam como exercício próprio; o pé traseiro oscilante muda a demanda de estabilização vs banco fixo (seed-ex-114), mas a sobreposição é alta — flag documenta a dúvida.
8. **Pike vs Knee Tuck/Jack-Knife = 2 registros** (roteados em linhas separadas pela sessão abdome): pike = flexão de quadril de pernas estendidas com pico de flexão + anti-extensão de ombro carregado; tuck = condução de joelhos. Ambos `Hip Flexion`, `musculo_alvo` ["abdomen"] (espelho de gif-ex-114).
9. **Fallout ≠ Body Saw**: fallout/standing rollout (mãos nas alças, braços caem à frente) = análogo em pé do rollout na roda (seed-ex-123) — registro. Body saw (pés nas fitas, serra no antebraço) = variante de prancha/anti-extensão → excluído citando seed-ex-031 + seed-ex-333.
10. **Excluídos por serem assistência de equilíbrio, não estímulo novo**: TRX squat (assiste seed-ex-034), calf raise (gif-ex-158), jump squat (seed-ex-158), lateral/cossack/curtsy/balance lunges (seed-ex-036/gif-ex-131/132, seed-ex-229), side bend (gif-ex-115/116).
11. **Excluídos como variantes de implemento/posição**: hip press/glute bridge/hip thrust/hip extension nas fitas (≈ gif-ex-140 pés elevados + gif-ex-147; o estímulo suspenso do posterior já está no hamstring curl seed-ex-330), leg raise nas fitas (seed-ex-032/122), plank/side plank/reverse plank (seed-ex-031/127), L-sit (nicho 1 base), superman (gif-ex-053), scapular push-up/push-up plus (seed-ex-249/277 rehab), triceps kickback (seed-ex-027), hammer/reverse/drag curls (seed-ex-098/100/102), side/front raise + shoulder press nas fitas (seed-ex-017/018 + presses; nicho), hip abduction ExRx (seed-ex-119/289), straight-hip leg curl (dobra em seed-ex-330), single-leg hamstring curl (execução, `Can Be Both`), single-arm row/chest press/three-way row/alligator (execução/ângulo).
12. **Combos/híbridos atléticos excluídos**: atomic push-up, power pull, squat row, squat-to-Y-fly, reverse-lunge-knee-drive, sprinter start, hip throw, resisted rotations, burpees, mountain climber (cardio — seed-ex-157), spider walks, side-straddle golf swing, crunch-and-curl, pêndulos.

## Review flags abertos

- seed-ex-325 (Elevacao Y TRX): `Abduction` vs arco overhead (scaption alta).
- seed-ex-329 (Afundo Suspenso TRX): proximidade de estímulo com seed-ex-114.

## Validação

`python scripts/validate_exercise_seeds.py` — 0 erros (warning esperado de covers[] até o orquestrador integrar a entrada no `_manifest.json`).
