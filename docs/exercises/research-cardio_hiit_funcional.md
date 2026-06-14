# Research — `cardio_hiit_funcional` (T8)

Sessão de condicionamento HIIT / funcional. Irmã da T7 (`cardio_steady_state`). A diferença-chave:
**`tracking_type` MISTO** — diferente do steady-state (tudo `cardio`), aqui os movimentos se dividem em:
- `reps_only` — saltos pliométricos e calistenia contados por repetição (burpee, jumping jack, agachamento
  com salto, box jump, broad jump, tuck jump, skater, ball slam, slam de medicine ball, plank-to-pushup,
  bear crawl por reps).
- `cardio` — esforço cronometrado (`duracaoSegundos` obrigatório; `intensidade`/`distanciaMetros` opcionais):
  battle ropes, sprint intervals (`movement_pattern: "Sprint"`), air bike/rower em intervalo, shuttle run
  (distância), mountain climber (convenção dominante = por tempo).
- `hold` — isometria cronometrada distinta. **Verificado:** a prancha já está coberta pela sessão `abdome`
  (gif-ex isométrico) — NÃO duplicar. Nenhum `hold` distinto exclusivo de HIIT sobrou → 0 registros `hold`
  (documentado abaixo).

Regras de campo herdadas da T7: `category: "Cardio"`, `group_muscles: ["Cardio"]`,
`primary_equipment` = `"Bodyweight"` para pliometria de peso corporal (está no vocabulário controlado);
`null` + free-text `equipment` para implementos fora do vocabulário (battle rope, medicine ball, plyo box,
air bike, rower). `movement_pattern`: `"Jump"` para saltos pliométricos; `"Sprint"` para tiros; `null` para
movimentos sem padrão de marcha/salto aplicável (burpee combina padrões → `null`, documentado).

Regra de fechamento: 1 registro = 1 estímulo distinto. Microvariantes de tempo/altura/carga = exclusões.

---

## Fontes consultadas (curva de fechamento)

### Fonte 1 — ACE Fitness (HIIT / bodyweight conditioning library)
URL: https://www.acefitness.org/resources/everyone/exercise-library/ (filtro cardio/plyometric)
Lista: burpee, jumping jack, high knees, butt kicks, mountain climber, squat jump, box jump, skater,
plank, jump rope. NOVO (set base): burpee, jumping jack, high knees, mountain climber, squat jump,
box jump, skater. **+7 candidatos.** (plank → já em abdome; jump rope → já em T7 seed-ex-152; butt kicks →
microvariante de corrida no lugar / high knees.)

### Fonte 2 — NASM (HIIT workout / metabolic conditioning)
URL: https://blog.nasm.org/high-intensity-interval-training
Lista: sprint intervals, burpee, jump squat, mountain climber, battle ropes, kettlebell swing,
box jump, jumping jack, high knees. NOVO: **sprint intervals, battle ropes.** (+2). Kettlebell swing →
roteado para `forca_kettlebell` (já coberto lá). Jump squat/burpee/etc. já no set base.

### Fonte 3 — CrossFit movement library / WOD canon (monostructural + gymnastics conditioning)
URL: https://www.crossfit.com/essentials/movements
Lista: burpee, box jump, double-under (corda dupla), wall ball (ball-to-target), medicine ball slam/ball
slam, air bike (Echo/Assault) intervalo, rower intervalo, ski erg intervalo, shuttle run, broad jump,
bear crawl, sprint. NOVO: **ball slam / medicine ball slam, air bike intervalo, rower intervalo,
shuttle run, broad jump, bear crawl.** (+6). Double-under = microvariante de pular corda (T7 152) →
excluído. Wall ball = híbrido agachamento+arremesso, predomínio de pernas → roteado/excluído (nota).
Ski erg intervalo = forma intervalada do seed-ex-146 (T7) → dobrado em name_variation/excluído.

### Fonte 4 — Muscle & Strength (Best HIIT / bodyweight cardio exercises)
URL: https://www.muscleandstrength.com/exercises (bodyweight/plyometric/cardio)
Lista: burpee, jump squat, jumping jack, high knees, mountain climber, tuck jump, box jump,
broad jump, skater, plank jacks, jump lunge. NOVO: **tuck jump, jump lunge (lunge pliométrico
alternado).** (+2). Plank jacks = variante de prancha (abdome) + jumping jack → excluído.

### Fonte 5 — BarBend (plyometrics / explosive conditioning guide)
URL: https://barbend.com/plyometric-exercises/
Lista: box jump, broad/long jump, tuck jump, squat jump, depth jump, lateral bound/skater,
single-leg bound, clap push-up, medicine ball slam, plyo push-up. NOVO: **0 distintos.** Depth jump =
variante de box jump (altura/queda → microvariante). Lateral bound = skater. Single-leg bound =
variante unilateral de broad jump. Clap/plyo push-up = pliometria de peito → roteado para `peito_press`
(já excluído lá como `Clapping/Plyo Push-Up`).

### Fonte 6 — ACSM / Verywell Fit (HIIT cardio bodyweight moves)
URL: https://www.verywellfit.com/hiit-high-intensity-interval-training-1231243
Lista: burpee, mountain climber, jumping jack, high knees, squat jump, skater, plank-to-push-up
(walkout), jumping lunge, sprint. NOVO: **plank-to-push-up (up-down / walkout / commando).** (+1).

### Fonte 7 — ISSA (functional conditioning / MetCon)
URL: https://www.issaonline.com/blog/post/hiit-workouts
Lista: burpee, battle ropes, box jump, ball slam, mountain climber, jump squat, sprint, sled push.
NOVO: **0 distintos.** Sled push → carry/empurrar com trenó (Prowler) — implemento fora do vocabulário;
roteado/excluído (nota: `Sled Push / Prowler` → sessão funcional/carry futura; padrão `Carry` existe mas
o trenó não está no vocabulário de equipamento e é distinto o bastante de bear crawl).

### Fonte 8 — Men's Health (bodyweight HIIT finishers)
URL: https://www.menshealth.com/fitness/ (HIIT bodyweight)
Lista: burpee, mountain climber, jumping jack, high knees, squat jump, tuck jump, skater,
bear crawl, broad jump, jump lunge, sprint. NOVO: **0 distintos.**

### Fonte 9 — Hevy / Anabolic Aliens (plyometric & HIIT exercise lists)
URL: https://www.hevyapp.com/ (plyometric/cardio) + anabolicaliens plyometric list
Lista: squat jump, box jump, broad jump, tuck jump, skater, jump lunge, burpee, mountain climber,
high knees, jumping jack, sprint, battle ropes, ball slam, bear crawl, plank-to-pushup. NOVO: **0 distintos.**

### Fonte 10 — Garage Gym Reviews / Torokhtiy (functional fitness conditioning, CrossFit-style)
URL: https://www.garagegymreviews.com/ + https://torokhtiy.com/ (conditioning/MetCon)
Lista: burpee, box jump, broad jump, ball slam, wall ball, air bike, rower, ski erg, shuttle run,
battle ropes, bear crawl, double-under, sprint, devil press (burpee+KB), thruster. NOVO: **0 distintos.**
Devil press / man-maker → híbrido burpee+kettlebell → `forca_kettlebell`/excluído. Thruster → predomínio
de pernas → `ombros_press` já excluiu (thruster). Wall ball → roteado/excluído (predomínio agachamento).

### Fonte 11 — ExRx.net (plyometrics / explosive — cânone biomecânico)
URL: https://exrx.net/Lists/Directory (Plyometrics / Olympic-style explosive)
Confirma como movimentos distintos: squat jump, box jump, broad (standing long) jump, tuck jump,
lateral skater/bound, depth jump. Confirma musculatura (cadeia extensora: quadríceps/glúteo/panturrilha;
core estabiliza). NOVO: **0 distintos** (depth jump = microvariante de box jump). Solidifica padrão `Jump`
para todos os saltos pliométricos.

---

## Curva de retornos decrescentes
- Rodada 1 (Fontes 1–2, ACE+NASM): +9 (burpee, jumping jack, high knees, mountain climber, squat jump,
  box jump, skater, sprint intervals, battle ropes).
- Rodada 2 (Fontes 3–4, CrossFit+M&S): +8 (ball slam, air bike intervalo, rower intervalo, shuttle run,
  broad jump, bear crawl, tuck jump, jump lunge).
- Rodada 3 (Fontes 6, CrossFit/Verywell): +1 (plank-to-push-up).
- Fontes 5, 7, 8, 9, 10, 11: **+0 distintos cada** — só repetição, microvariantes (depth jump, double-under,
  lateral bound, plank jacks, single-leg bound) ou movimentos roteados (kettlebell swing, sled push, wall
  ball, devil press, thruster, plyo push-up).

**Fechamento:** ≥2 fontes consecutivas com 0 novos distintos (de fato 6: fontes 5,7,8,9,10,11).
11 bases independentes. Universo fechado. **18 registros distintos** por estímulo.

---

## Registros criados (18) — seed-ex-154..171

| ID | Nome | tracking_type | movement_pattern | equipment | primary_equipment |
|----|------|---------------|------------------|-----------|-------------------|
| 154 | Burpee | reps_only | null (combina patterns) | Peso corporal | Bodyweight |
| 155 | Polichinelo (Jumping Jack) | reps_only | Jump | Peso corporal | Bodyweight |
| 156 | Elevação de Joelhos (High Knees) | reps_only | Gait | Peso corporal | Bodyweight |
| 157 | Mountain Climber | cardio | null | Peso corporal | Bodyweight |
| 158 | Agachamento com Salto (Jump Squat) | reps_only | Jump | Peso corporal | Bodyweight |
| 159 | Salto na Caixa (Box Jump) | reps_only | Jump | Caixa pliométrica | null |
| 160 | Salto Horizontal (Broad Jump) | reps_only | Jump | Peso corporal | Bodyweight |
| 161 | Tuck Jump (Salto Agrupado) | reps_only | Jump | Peso corporal | Bodyweight |
| 162 | Skater (Salto Lateral) | reps_only | Jump | Peso corporal | Bodyweight |
| 163 | Afundo com Salto (Jump Lunge) | reps_only | Jump | Peso corporal | Bodyweight |
| 164 | Slam de Bola (Ball Slam) | reps_only | Rotation | Medicine Ball / Slam Ball | null |
| 165 | Plank-to-Push-Up (Up-Down) | reps_only | Anti-Extension | Peso corporal | Bodyweight |
| 166 | Bear Crawl (Urso) | reps_only | Gait | Peso corporal | Bodyweight |
| 167 | Battle Ropes (Cordas Navais) | cardio | null | Battle Rope | null |
| 168 | Sprint Intervals (Tiros) | cardio | Sprint | Nenhum / pista | null |
| 169 | Air Bike Intervalado | cardio | null | Air Bike | null |
| 170 | Remo Ergômetro Intervalado | cardio | null | Remo Ergometro | null |
| 171 | Shuttle Run (Corrida Vai-e-Vem) | cardio | Sprint | Nenhum / cones | null |

### Distribuição de tracking_type
- `reps_only`: 11 (154, 155, 156, 158, 159, 160, 161, 162, 163, 164, 165, 166) — wait recount below.
- `cardio`: 5 (157, 167, 168, 169, 170, 171).
- `hold`: 0 (prancha já em abdome — não duplicar).

(Contagem exata: reps_only = 12 [154,155,156,158,159,160,161,162,163,164,165,166]; cardio = 6
[157,167,168,169,170,171]; hold = 0. Total = 18.)

## Notas de julgamento
- **Mountain Climber (157) = `cardio`:** a convenção de logging dominante em apps de HIIT é por TEMPO
  (segundos no protocolo Tabata/AMRAP), não por reps contadas. Escolhido `cardio` (duracaoSegundos), 1 só
  registro (não criar variante reps_only). `movement_pattern: null` (escalada horizontal — sem padrão de
  marcha/salto puro; combina flexão de quadril alternada + bracing). Roteado de `abdome`. ✓ coberto.
- **Ball Slam / Medicine Ball Slam (164) = `reps_only`:** contado por reps (arremesso explosivo overhead→chão).
  `movement_pattern: "Rotation"` é a melhor aproximação (extensão→flexão de tronco com componente explosivo;
  o enum não tem "Slam/Throw"). Implemento (medicine/slam ball) fora do vocabulário → `primary_equipment: null`
  + `equipment` free-text. Roteado de `abdome`. ✓ coberto.
- **Sprint Intervals (168) e Shuttle Run (171) = `cardio` + `Sprint`:** ambos cronometrados; shuttle usa
  `distanciaMetros` (vai-e-vem entre cones). Sprint roteado de T7 (cardio_steady_state). ✓ coberto.
- **Air Bike (169) / Rower (170) Intervalado = `cardio`:** a FORMA CONTÍNUA fica em T7 (seed-ex-147/144);
  aqui é o PROTOCOLO INTERVALADO (HIIT). Registros distintos por intenção de uso/logging; equipment idêntico
  ao de T7. Roteados de T7. ✓ ambos cobertos. (movement_pattern null, como em T7.)
- **Jump Squat (158) = `reps_only` + `Jump`:** roteado de quadriceps/squat. ✓ coberto. Pliométrico
  (cadeia extensora explosiva) — distinto do agachamento força (Squat).
- **Burpee (154) `movement_pattern: null`:** combina agachamento + flexão + salto; nenhum padrão único
  domina → null (documentado, conforme regra "burpee combines patterns — pick dominant or null").
- **High Knees (156) = `reps_only` + `Gait`:** contado por reps (toques de joelho); corrida estacionária
  explosiva → padrão de marcha (Gait). Poderia ser cardio por tempo, mas a convenção de contagem (reps por
  perna) é comum em HIIT; escolhido reps_only. Documentado.
- **Plank-to-Push-Up (165):** up-down / walkout / commando — reps contadas; `Anti-Extension` (mantém core
  rígido transicionando prancha↔apoio). NÃO é a prancha isométrica (essa fica em abdome como hold). Distinto.

## Exclusões (microvariantes / roteadas)
- **Microvariantes não-distintas (`excluded_as_non_distinct`):** depth jump (altura de queda do box jump),
  double-under / corda dupla (microvariante de pular corda T7 seed-ex-152), lateral bound (= skater 162),
  single-leg bound (unilateral do broad jump), plank jacks (prancha+jumping jack), butt kicks (microvariante
  de high knees / corrida no lugar), depth/drop variations, ski erg intervalo (forma intervalada do
  seed-ex-146 T7 — dobrado em name_variation), tempo/altura/carga (são intensidade, não exercícios).
- **Roteadas (`routed_to_other_sessions`):** kettlebell swing → `forca_kettlebell` (já coberto); clap/plyo
  push-up → `peito_press` (já excluído lá); wall ball / thruster → predomínio de pernas (quadriceps/ombros_press
  já excluiu thruster); devil press / man-maker → híbrido burpee+KB → forca_kettlebell; sled push / Prowler →
  trenó fora do vocabulário (sessão funcional/carry futura).
