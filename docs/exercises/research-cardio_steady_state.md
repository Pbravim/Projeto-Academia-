# Research — `cardio_steady_state` (T7)

Sessão de cardio contínuo / estado estável. Modelo desbloqueado por `tracking_type: "cardio"`
(`duracaoSegundos`/`distanciaMetros`/`intensidade` anuláveis). `category: "Cardio"`,
`group_muscles: ["Cardio"]`, `primary_equipment: null` (máquinas de cardio — Esteira/Bike/Elíptico
— NÃO estão no vocabulário controlado PRIMARY_EQUIPMENT; nome da máquina vai no campo livre `equipment`).
`movement_pattern`: `Gait` (esteira/elíptico/escada — passada), `Sprint` (pace de tiro), ou `null`
(bike/remo/ski erg — sem padrão de marcha aplicável).

Auditoria por modalidade biomecanicamente distinta — NÃO dividir microvariantes triviais de
velocidade/inclinação/nível (logadas como exclusões). Regra: 1 registro = 1 estímulo distinto.

---

## Fontes consultadas (curva de fechamento)

### Fonte 1 — Gymdesk (15 Cardio Machines Every Gym Should Have)
URL: https://gymdesk.com/blog/cardio-equipment-machines-gyms-need
Lista: treadmill, elliptical, stair climber/stepmill, stationary bike, recumbent bike, spin bike,
airdyne/air bike, rowing machine, VersaClimber, Jacob's Ladder, ski ergometer, stepper, arm ergometer,
curve (manual) treadmill.
NOVO (set base): esteira, elíptico, escada/stepmill, bike vertical, bike reclinada, spin, air bike,
remo, VersaClimber, Jacob's Ladder, ski erg, ergômetro de braço. **+12 candidatos.**

### Fonte 2 — IronCompany (Ultimate Guide to Cardio Equipment) — via busca
URL: https://www.ironcompany.com/blog/cardio-equipment-guide-home-commercial-rehab  (403 no fetch direto; conteúdo via snippet de busca)
Lista: treadmill, elliptical, stair climber/stepmill, stationary/recumbent/spin/air bike, rower,
VersaClimber, Jacob's Ladder, ski erg, stepper, arm ergometer, curve treadmill.
NOVO: 0 distintos vs Fonte 1.

### Fonte 3 — BestUsedGymEquipment (Types of Cardio Machines)
URL: https://www.bestusedgymequipment.com/types-cardio-machines/
Lista: treadmill, elliptical, upright/spin/recumbent/air bike, rower, stair climber, ski erg,
VersaClimber, Jacob's Ladder, arm ergometer, **arc trainer**, cross-trainer/recumbent elliptical.
NOVO: **arc trainer (+1).** (recumbent/cross elliptical = variante do elíptico.)

### Fonte 4 — GymQuip (Top 10 Cardio Machines)
URL: https://gymquipfitness.com/blogs/news/top-10-cardio-machines-every-gym-needs
Lista: treadmill, manual/curved treadmill, spin/recumbent/air/upright bike, rower, elliptical cross
trainer, stepper/stair climber, ski ergometer.
NOVO: 0 distintos.

### Fonte 5 — ExRx.net : Cardio & Conditioning Exercises (cânone biomecânico)
URL: https://exrx.net/Lists/CardioExercises  (403 no fetch; corroborado via páginas indexadas:
RecumbentCycle, EllipticalTrainer, LVStairClimber e a busca ExRx)
Confirma como exercícios distintos: treadmill walk, treadmill run, elliptical, recumbent cycle,
upright cycle, rowing, stair climber, ski. Distingue **caminhada vs corrida** e **bike reclinada vs
vertical** como entradas separadas (granularidade ExRx).
NOVO: solidifica esteira-corrida vs esteira-caminhada como estímulos separados (passada de corrida
≠ passada de caminhada — impacto, ROM de joelho/quadril e custo metabólico diferentes, PMC6704526).

### Fonte 6 — Crunch Fitness (Best Cardio Machine for Every Member)
URL: https://www.crunch.com/thehub/crunch-fitness-picks-the-best-cardio-machine-for-every-member/
Lista: treadmill, elliptical, rower, stationary/spin/recumbent bike, stair stepper, air bike.
NOVO: 0 distintos.

### Fonte 7 — Global Fitness (7 Types of Cardio Machines)
URL: https://www.globalfitness.com/blogs/news/get-that-heart-rate-up-7-types-of-used-cardio-machines-your-gym-needs
Lista: treadmill, recumbent bike, elliptical, stair climber, rower, spin/group cycling bike, arc trainer.
NOVO: 0 distintos.

### Fonte 8 — NASM (What is Steady-State Cardio?)
URL: https://blog.nasm.org/what-is-steady-state-cardio
Lista (atividades, não-máquina): walking, running, hiking, rucking, cycling, spinning, dance fitness,
swimming, trail running.
NOVO: **corrida/caminhada ao ar livre (outdoor)** e **natação** entram no radar. Outdoor run/walk =
mesma passada (Gait) da esteira → dobrado em name_variations (superfície é microvariante, PMC6704526
mostra diferença pequena). Natação = sem padrão no enum, sem máquina, equipamento "piscina" fora do
escopo de academia → roteado/excluído (ver exclusões).

### Fonte 9 — BarBend (Cardio Alternatives to Running)
URL: https://barbend.com/cardio-alternatives-to-running/  (403 no fetch; conteúdo via snippet)
Lista: elliptical, stair climber, rowing, stationary bike, incline walking, nature walks, treadmill.
NOVO: 0 distintos (incline walking = caminhada inclinada, dobrada na caminhada).

### Fonte 10 — Gymshark (What is LISS Cardio)
URL: https://www.gymshark.com/blog/article/what-is-liss-cardio
Lista: walking, hiking, cycling (outdoor + bike), swimming, rowing, treadmill walking.
NOVO: 0 distintos.

### Fonte 11 — MerachFit (10 Best Low-Impact Cardio Machines)
URL: https://merachfit.com/blogs/health-and-fitness/10-best-low-impact-cardio-machines-for-home-fitness
Lista: rower, exercise bike, elliptical, treadmill, stair stepper, ski erg, mini stepper, air bike,
arc trainer, under-desk bike, recumbent bike, walking pad, upright bike, indoor cycling bike.
NOVO: 0 distintos (mini stepper / under-desk / walking pad = microvariantes de tamanho/posição).

### Fonte extra — biomecânica (jump rope, gait, elíptico)
- Pular corda: panturrilha primária + glúteos, antebraços/ombros estabilizam (Elite Jumps, BODi).
  Pace contínuo = cardio steady-state; padrão saltitante repetitivo ≈ marcha vertical → `Gait`.
- Treadmill vs overground gait: diferenças pequenas (PMC6704526/PMC9458960) — superfície é microvariante.
- Elíptico: passada sem impacto + braços (cadeia superior/core via alças) — full-body de baixo impacto.

---

## Curva de retornos decrescentes
- Rodada 1 (Fontes 1–2): +12 candidatos de máquina (set base).
- Rodada 2 (Fontes 3–5): +arc trainer; ExRx fixa caminhada vs corrida e bike vertical vs reclinada.
- Rodada 3 (Fonte 8 NASM): +outdoor run/walk (dobrado na passada), +natação (roteada/excluída).
- Fontes 6, 7, 9, 10, 11: **+0 distintos cada** — só repetição ou microvariantes (mini/under-desk/
  walking pad, recumbent elliptical, curved treadmill, incline walking, group cycling).

**Fechamento:** ≥2 fontes consecutivas com 0 novos distintos (de fato 6: fontes 6,7,9,10,11 + extras).
11 bases independentes. Universo fechado.

---

## Registros criados (16) — seed-ex-138..153

| ID | Nome | movement_pattern | musculo_alvo | equipment | exec |
|----|------|------------------|--------------|-----------|------|
| 138 | Corrida na Esteira | Gait | quadriceps, isquiotibiais, gluteos, gastrocnemio | Esteira | Bilateral |
| 139 | Caminhada na Esteira (inclinada) | Gait | gluteos, quadriceps, gastrocnemio, soleo | Esteira | Bilateral |
| 140 | Bicicleta Ergométrica (vertical) | null | quadriceps, gluteos | Bicicleta Ergometrica | Bilateral |
| 141 | Bicicleta Reclinada | null | quadriceps, gluteos | Bicicleta Reclinada | Bilateral |
| 142 | Spinning / Bike Indoor | null | quadriceps, gluteos, isquiotibiais | Bicicleta de Spinning | Bilateral |
| 143 | Elíptico | Gait | quadriceps, gluteos, isquiotibiais, gastrocnemio | Eliptico | Bilateral |
| 144 | Remo Ergômetro | null | grande_dorsal, quadriceps, gluteos, biceps_braquial | Remo Ergometro | Bilateral |
| 145 | Escada / Stairmaster | Gait | gluteos, quadriceps, gastrocnemio, soleo | Simulador de Escada | Bilateral |
| 146 | Ski Erg | null | grande_dorsal, triceps, core, gluteos | Ski Erg | Bilateral |
| 147 | Air Bike / Assault Bike | null | quadriceps, gluteos, deltoide, grande_dorsal | Air Bike | Bilateral |
| 148 | Arc Trainer | Gait | quadriceps, gluteos, isquiotibiais | Arc Trainer | Bilateral |
| 149 | VersaClimber | Gait | gluteos, quadriceps, grande_dorsal, gastrocnemio | VersaClimber | Bilateral |
| 150 | Jacob's Ladder | Gait | gluteos, quadriceps, grande_dorsal, core | Jacob's Ladder | Bilateral |
| 151 | Ergômetro de Braço | null | deltoide, grande_dorsal, biceps_braquial, triceps | Ergometro de Braco | Bilateral |
| 152 | Pular Corda (contínuo) | Gait | gastrocnemio, soleo, gluteos | Corda de Pular | Bilateral |
| 153 | Corrida ao Ar Livre | Gait | quadriceps, isquiotibiais, gluteos, gastrocnemio | Nenhum (ao ar livre) | Bilateral |

Notas de julgamento:
- **Corrida na Esteira (138) vs Corrida ao Ar Livre (153):** mantidos separados porque o usuário os
  escolhe/registra de forma diferente (esteira tem `intensidade` = velocidade/inclinação; outdoor é
  por distância/tempo). Biomecanicamente quase iguais → cada um lista o outro como
  `equivalent_alternatives`. Caminhada outdoor dobrada em name_variations da caminhada (139).
- **Bike vertical (140) vs reclinada (141) vs spinning (142):** três registros — postura e ênfase
  diferem (reclinada apoia lombar/menos glúteo; spinning em pé/forward-lean recruta mais posterior e
  é mais intenso). ExRx separa reclinada de vertical.
- **`movement_pattern`:** Esteira/elíptico/escada/arc/versaclimber/jacobs ladder/corda = `Gait`
  (passada/marcha). Bike/remo/ski erg/air bike/ergômetro de braço = `null` (sem padrão de marcha).
  `Sprint` NÃO usado — escopo é steady-state contínuo; tiros/intervalos ficam em `cardio_hiit_funcional` (T8).

## Exclusões (microvariantes / roteadas)
- **Microvariantes não-distintas:** mini stepper, under-desk bike, walking pad, recumbent/cross
  elliptical, curved/manual treadmill, group cycling, incline walking (dobrada na caminhada 139),
  velocidade/nível/inclinação (são `intensidade`, não exercícios).
- **Roteadas:** sprint/tiros e intervalos → `cardio_hiit_funcional` (T8). Natação, hiking, rucking,
  dança/Zumba → sem padrão/equipamento de academia no vocabulário; documentadas como fora de escopo
  (sessões de cardio outdoor/aulas futuras se necessário).
