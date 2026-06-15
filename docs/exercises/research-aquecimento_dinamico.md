# Research — `aquecimento_dinamico` (Aquecimento Dinamico / Dynamic Warm-Up)

Nova categoria **Warm-Up**, desbloqueada pelo modelo `tracking_type` (sub-projeto 5b).
Quase todo registro: `tracking_type: "reps_only"` (drill contado por repeticoes/passadas; o modelo
exige `repeticoes >= 1`, sem kg). `category: "Warm-Up"`, `group_muscles: ["Aquecimento"]`
(intencional — o presenter do catalogo tem CATEGORY_ORDER `Cardio, Mobilidade, Alongamento,
Aquecimento, Reabilitacao`, entao estes renderizam numa secao "Aquecimento" dedicada, exatamente
como o cardio usou `["Cardio"]` e o alongamento `["Alongamento"]`).

`musculo_alvo` populado com o(s) musculo(s) REALMENTE aquecido(s)/mobilizado(s) (codigos PT
minusculos ja usados nos seeds) para manter targeting/substituicao funcionando.

`movement_pattern`: valor do enum quando o drill claramente corresponde (walking lunge -> `Lunge`;
leg swing frontal / toy soldier / high knees / knee hug -> `Hip Flexion`; butt kick / heel-to-glute
-> `Knee Flexion`; torso/thoracic rotation -> `Rotation`; A-skip / lateral shuffle -> `Gait`).
`null` quando nenhum valor do enum descreve (arm circles, leg swing lateral, inchworm, cat-cow,
band pass-through, ankle bounce). O validador permite null.

`primary_equipment`: a esmagadora maioria e peso corporal -> `"Bodyweight"` (no vocabulario
controlado). Warm-up com faixa (band pass-through) -> `"Resistance Band"` (no vocabulario). Campo
livre `equipment` em PT ("Peso Corporal", "Faixa Elastica").

Regra: **1 registro = 1 estimulo distinto**. Esquerda/direita do mesmo drill = 1 registro
(`execution_type: Unilateral`). Variantes de tempo/lado/amplitude que nao mudam o musculo-alvo nem o
mecanismo sao dobradas em `name_variations` ou logadas como exclusoes.

### Fronteira de escopo (roteamento)
- **Plio/condicionamento continuo ja vive em cardio:** polichinelo (jumping jacks, cardio-ex-023),
  mountain climber (cardio-ex-057), elevacao de joelhos como corrida de condicionamento
  (cardio-ex-040), pular corda continuo (cardio steady seed-ex-152), burpee, agachamento com salto,
  skater, etc. NAO recriados aqui. Onde um drill de aquecimento e o mesmo estimulo de um seed de
  cardio, e roteado (ver scope_exclusions).
- **Alongamento estatico (hold passivo) ja vive em alongamento_estatico** (seed-ex-172..195).
  Roteado, nao recriado.
- **Mobilidade articular dedicada (nao prep geral de aquecimento)** — ex. thoracic mobility profunda
  (open book deitado), 90/90 hip, CARs articulares — pertence as sessoes `mobilidade_*` futuras.
  Drills de mobilidade ATIVA que sao genuinamente parte do aquecimento dinamico padrao (cat-cow,
  thoracic rotation em pe, hip circles) ficam aqui; trabalho de mobilidade dedicado e roteado.

---

## Fontes consultadas (>=10 bases independentes)

### Fonte 1 — ACE Fitness (Dynamic Warm-Up)
URL: https://www.acefitness.org/resources/everyone/exercise-library/ (dynamic warmup) ;
https://www.acefitness.org/resources/pros/expert-articles/ (dynamic warm-up to improve mobility)
Lista nuclear: leg swings (frontal e lateral), walking lunges, inchworm/walkout, hip circles,
arm circles, torso twists, knee hugs, walking quad pull (heel-to-glute), high knees, butt kicks.
NOVO (set base): leg swing frontal, leg swing lateral, walking lunge, inchworm, hip circle (gate),
arm circle, torso rotation, knee hug, walking quad pull, high knees (drill), butt kicks.
**~11 estimulos base.**

### Fonte 2 — NASM (Dynamic Warm-Up / RAMP & SMR-mobility-activation)
URL: https://blog.nasm.org/ (dynamic-warm-up-exercises ; how-to-warm-up) ; NASM OPT warm-up phase.
Lista: world's greatest stretch, walking lunge with rotation, inchworm, hip openers (gate
open/close), leg swings, arm circles, spinal/thoracic rotation, prisoner squat (mob), high knees,
butt kicks.
NOVO: **world's greatest stretch (+1)**, **walking lunge with twist (+1)**, **thoracic rotation
em pe (+1)** (distinto da torso twist generica de quadril/tronco — rotacao toracica especifica).
Confirma hip openers (gate) = open vs close (dobrados num registro de hip circle).

### Fonte 3 — ExRx.net / RAMP protocol (Raise-Activate-Mobilize-Potentiate)
URL: https://exrx.net/ (warm-up / flexibility dynamic) ; Jeffreys RAMP protocol (literatura S&C).
RAMP estrutura: Raise (locomocao leve), Activate & Mobilize (drills de ADM ativa), Potentiate.
Confirma como categorias distintas de "mobilize": leg swing (sagital e frontal), spiderman lunge,
world's greatest stretch, inchworm, hip mobility (gate), thoracic rotation, ankle mobility/bounce.
NOVO: **spiderman lunge (+1)** (lunge com mao no chao + abertura de quadril; distinto do walking
lunge e do WGS), **A-skip (+1)** (Raise/potentiate drill de coordenacao), **ankle bounce/pogo de
aquecimento (+1)** (baixa amplitude, prep de tornozelo/panturrilha — distinto do plio).

### Fonte 4 — Athletic/track warm-up (toy soldiers, A-skips, marching)
URL: track & field dynamic warm-up references (Frankenstein walk, straight-leg kick, A/B skips).
NOVO: **toy soldier / straight-leg kick (+1)** (Frankenstein walk — flexao de quadril com perna
estendida, isquio dinamico, distinto do high knee que flexiona joelho). A-skip ja contado (Fonte 3).
March/high knee em marcha = dobrado no high knees.

### Fonte 5 — Physio / mobility (cat-cow, arm swings, band pass-through)
URL: physio dynamic warm-up references (cat-camel, arm crossovers/hugs, shoulder band dislocates).
NOVO: **cat-cow dinamico (+1)** (flexao/extensao espinhal ritmica — mobilidade ativa de coluna,
parte padrao de aquecimento; o estatico foi roteado p/ alongamento), **arm swings / hugs
horizontais (+1)** (flexao/extensao horizontal de ombro dinamica, distinto dos arm circles que sao
circundacao), **band shoulder pass-through / dislocate (+1)** (mobilidade de ombro com faixa —
unico drill resistido; primary Resistance Band).

### Fonte 6 — Strength sites (lateral movement prep: shuffle / side-step)
URL: reputable strength/athletic prep refs (lateral shuffle, carioca, lateral leg swings).
NOVO: **lateral shuffle / side-step (+1)** (locomocao lateral de aquecimento — abdutores/adutores,
prep de plano frontal; Gait lateral). Carioca = variante de coordenacao -> dobrada no shuffle.

### Fonte 7 — Runner's warm-up (lunge with twist, walking knee-to-chest)
URL: running/race dynamic warm-up refs.
NOVO: **0 distintos novos** — lunge+twist (Fonte 2), knee hug walking (Fonte 1), butt kicks
(Fonte 1), high knees (Fonte 1) ja cobertos.

### Fonte 8 — CrossFit / functional warm-up (inchworm walkout, scorpion, fire hydrant)
URL: functional warm-up refs.
NOVO: **0 distintos roteaveis aqui** — scorpion (rotacao espinhal deitado) e fire hydrant
(abducao de quadril ajoelhado) sao mobilidade dedicada -> roteados p/ mobilidade_inferior; inchworm
ja coberto (Fonte 1).

### Fonte 9 — Yoga-flow / sun salutation dynamic (cat-cow, dynamic lunge)
URL: dynamic flexibility refs.
NOVO: **0 distintos** — cat-cow (Fonte 5), dynamic lunge/WGS ja cobertos; down-dog-to-cobra flow =
transicao de mobilidade -> roteada.

### Fonte 10 — General gym dynamic warm-up listicles (Healthline / Verywell / Men's Health)
URL: https://www.healthline.com/health/exercise-fitness/dynamic-warm-up ; Verywell Fit dynamic
warm-up ; Men's Health dynamic warm-up.
Lista: leg swings, walking lunges, hip circles, arm circles, torso twists, inchworm, high knees,
butt kicks, knee-to-chest (knee hug), lunge with twist, side lunge (dynamic).
NOVO: **dynamic side lunge / lateral lunge (+1)** (lunge no plano frontal com mudanca de peso,
adutores dinamicos — distinto do walking lunge sagital e do shuffle). Resto repetido.

### Fonte 11 — Verywell/Men's Health cluster (closeout)
Repete o set acima. NOVO: **0 distintos**.

---

## Curva de retornos decrescentes
- Rodada 1 (Fonte 1 ACE): set base. **+11.**
- Rodada 2 (Fonte 2 NASM): WGS, lunge+twist, thoracic rotation. **+3.**
- Rodada 3 (Fonte 3 ExRx/RAMP): spiderman lunge, A-skip, ankle bounce. **+3.**
- Rodada 4 (Fonte 4 atletico): toy soldier. **+1.**
- Rodada 5 (Fonte 5 physio): cat-cow, arm swings, band pass-through. **+3.**
- Rodada 6 (Fonte 6 lateral): lateral shuffle. **+1.**
- Rodada 7 (Fonte 10 listicles): dynamic side lunge. **+1.**
- Fontes 7, 8, 9, 11: **+0 distintos cada** (so repeticao ou movimentos roteados p/ mobilidade).

**Fechamento:** Fontes 7-9 e 11 retornaram 0 novos distintos roteaveis ao aquecimento; o restante e
mobilidade dedicada (roteada) ou plio/cardio (roteado). 11 bases independentes + protocolo RAMP.
Universo fechado em **23 registros distintos** (seed-ex-196..218).

---

## Registros criados (23) — seed-ex-196..218

| ID | Nome | musculo_alvo | movement_pattern | tracking | exec |
|----|------|--------------|------------------|----------|------|
| 196 | Balanco de Perna Frontal | isquiotibiais, flexores_quadril | Hip Flexion | reps_only | Unilateral |
| 197 | Balanco de Perna Lateral | adutores, abdutores | null | reps_only | Unilateral |
| 198 | Afundo Caminhando | quadriceps, gluteos | Lunge | reps_only | Bilateral |
| 199 | Afundo com Rotacao | quadriceps, gluteos, core | Lunge | reps_only | Bilateral |
| 200 | Inchworm (Caminhada das Maos) | isquiotibiais, core | null | reps_only | Bilateral |
| 201 | World's Greatest Stretch | flexores_quadril, adutores, core | Lunge | reps_only | Unilateral |
| 202 | Afundo Spiderman | flexores_quadril, adutores | Lunge | reps_only | Unilateral |
| 203 | Circulo de Quadril (Abre-Portao) | flexores_quadril, abdutores | Hip Flexion | reps_only | Unilateral |
| 204 | Circulos de Braco | deltoide, trapezio | null | reps_only | Bilateral |
| 205 | Balanco de Bracos (Abraco) | peitoral, deltoide | null | reps_only | Bilateral |
| 206 | Passagem de Ombro com Faixa | deltoide, peitoral | null | reps_only | Bilateral |
| 207 | Rotacao de Tronco em Pe | core, eretores_espinha | Rotation | reps_only | Bilateral |
| 208 | Rotacao Toracica em Pe | core, eretores_espinha | Rotation | reps_only | Unilateral |
| 209 | Soldadinho (Chute Perna Estendida) | isquiotibiais, flexores_quadril | Hip Flexion | reps_only | Bilateral |
| 210 | Chute no Gluteo (Butt Kick) | quadriceps, isquiotibiais | Knee Flexion | reps_only | Bilateral |
| 211 | Joelho Alto (Drill) | flexores_quadril, gluteos | Hip Flexion | reps_only | Bilateral |
| 212 | A-Skip | flexores_quadril, gastrocnemio | Gait | reps_only | Bilateral |
| 213 | Abraco de Joelho Caminhando | gluteos, lombar | Hip Flexion | reps_only | Unilateral |
| 214 | Puxada de Calcanhar Caminhando | quadriceps, flexores_quadril | Knee Flexion | reps_only | Unilateral |
| 215 | Gato-Camelo Dinamico | eretores_espinha, core | null | reps_only | Bilateral |
| 216 | Saltito de Tornozelo (Pogo) | gastrocnemio, soleo | null | reps_only | Bilateral |
| 217 | Deslocamento Lateral | adutores, abdutores | Gait | reps_only | Bilateral |
| 218 | Afundo Lateral Dinamico | adutores, quadriceps | Lunge | reps_only | Unilateral |

Notas de julgamento:
- **tracking_type:** TODOS `reps_only`. Nenhum aquecimento aqui e um hold sustentado (esses sao
  alongamento estatico, roteado) nem um continuo puro tempo-sem-rep (esses sao cardio, roteado).
  Drills locomotores (A-skip, shuffle, pogo) sao contados por passadas/saltos -> reps_only. Nao usei
  `cardio` nem `hold`. Documentado: nenhum caso de cardio/hold neste arquivo.
- **execution_type:** drills de um lado por vez (balanco de perna, circulo de quadril, WGS,
  spiderman, rotacao toracica, knee hug, heel pull) = Unilateral. Drills alternados/simetricos
  (afundo caminhando, inchworm, soldadinho, butt kick, high knees, A-skip, pogo, shuffle, side lunge,
  circulos de braco, gato-camelo, rotacao de tronco) = Bilateral. (Afundo caminhando alterna pernas
  como locomocao continua -> Bilateral, precedente da esteira/gait.)
- **Balanco frontal (196) vs lateral (197):** plano sagital (isquio/flexor) vs frontal
  (adutor/abdutor) — 2 estimulos distintos, musculo_alvo distinto.
- **Walking lunge (198) vs lunge+twist (199) vs WGS (201) vs spiderman (202) vs side lunge (218):**
  cinco estimulos distintos — 198 sagital puro; 199 adiciona rotacao toracica (core); 201 WGS e um
  combo lunge+mao no chao+rotacao+alongamento de adutor (drill nomeado proprio); 202 spiderman e
  lunge com mao no chao + abertura de quadril sem a rotacao alta; 218 side lunge e plano frontal
  (adutor dominante). NASM/ExRx tratam WGS e spiderman como drills nomeados distintos.
- **Torso rotation (207) vs thoracic rotation (208):** 207 e rotacao de tronco em pe generica (gira
  quadril+tronco, bilateral alternado); 208 e rotacao toracica especifica (pe fixo, isola a coluna
  toracica, um lado por vez). NASM separa.
- **Arm circles (204) vs arm swings/hugs (205) vs band pass-through (206):** circundacao do ombro
  (204) vs flexao/extensao horizontal dinamica (205, abraco) vs mobilidade de ombro resistida com
  faixa (206, unico com Resistance Band). Tres mecanismos.
- **Butt kick (210) vs heel pull caminhando (214):** 210 e dinamico/ritmico no lugar ou em marcha
  (prep de joelho/quad-isquio, flexao de joelho rapida); 214 e puxada de calcanhar caminhando
  controlada (alongamento dinamico de quadriceps, um lado por vez). Mecanismo/ADM distintos.
- **High knees drill (211) vs A-skip (212):** 211 e marcha/corrida de joelho alto como drill de
  aquecimento (flexao de quadril) — distinto do high-knee de CONDICIONAMENTO continuo que ja virou
  cardio-ex-040 (elevacao de joelhos); 212 A-skip adiciona o componente de salto/ritmo (Gait,
  potentiate). Mantidos separados (RAMP os trata em fases diferentes).
- **musculo_alvo (codigos):** reutilizados de seeds existentes (isquiotibiais, flexores_quadril,
  adutores, abdutores, quadriceps, gluteos, core, deltoide, trapezio, peitoral, eretores_espinha,
  lombar, gastrocnemio, soleo). Nenhum codigo novo inventado. O validador nao valida vocabulario de
  musculo (so exige array nao-vazio); codigos seguem o padrao minusculo PT existente.

## Exclusoes (roteadas / nao-distintas)

### Roteadas para cardio (plio / condicionamento continuo — ja completos)
- **cardio_hiit_funcional:** Polichinelo/Jumping Jacks (cardio-ex-023), Mountain Climber
  (cardio-ex-057), Elevacao de Joelhos como corrida de condicionamento (cardio-ex-040), Burpee,
  Agachamento com Salto, Tuck Jump, Skater, Plank-to-Push-Up, Bear Crawl, Salto Horizontal/Caixa.
- **cardio_steady_state:** Pular Corda continuo (seed-ex-152), corrida/caminhada leve de "Raise".
  (O A-skip e drill de coordenacao curto, nao condicionamento continuo -> fica aqui.)

### Roteadas para mobilidade dedicada (mobilidade_inferior / mobilidade_superior_coluna)
- Scorpion (rotacao espinhal deitado em decubito), Fire Hydrant (abducao de quadril ajoelhado),
  90/90 hip switch, Hip CARs / Shoulder CARs (rotacoes articulares controladas), Open Book deitado
  (rotacao toracica em decubito lateral — a versao EM PE 208 fica aqui), Down-Dog-to-Cobra flow,
  Deep Squat / Prying Squat hold de mobilidade. Sao mobilidade articular dedicada, nao prep geral.

### Roteadas para alongamento estatico (hold passivo — ja completo)
- Qualquer "stretch" sustentado (runner's lunge hold, standing quad hold, etc.) -> seed-ex-172..195.

### Microvariantes nao-distintas (dobradas em name_variations)
- Open vs close the gate (dobrado no circulo de quadril 203); Frankenstein march = soldadinho (209);
  carioca = deslocamento lateral (217); marching high knees = high knees (211); knee-to-chest
  caminhando = abraco de joelho (213); inchworm com push-up = inchworm (200, push-up e add-on de
  forca); arm circles frente vs tras (dobrado no 204); reverse lunge dinamico (variante de direcao
  do afundo caminhando 198).
