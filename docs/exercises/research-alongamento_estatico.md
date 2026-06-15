# Research — `alongamento_estatico` (Alongamento Estatico / Static Stretching)

Nova categoria **Flexibility**, desbloqueada pelo modelo `tracking_type` (sub-projeto 5b).
Todo registro: `tracking_type: "hold"` (sustentacao isometrica; `duracaoSegundos` = tempo de
sustentacao, exigido `>=1` pelo modelo; sem kg/reps). `category: "Flexibility"`,
`group_muscles: ["Alongamento"]` (intencional — o presenter do catalogo tem CATEGORY_ORDER
`Cardio, Mobilidade, Alongamento, Aquecimento, Reabilitacao`, entao estes renderizam numa secao
"Alongamento" dedicada apos os grupos musculares, exatamente como o cardio usou `["Cardio"]`).

`musculo_alvo` populado com o(s) musculo(s) REALMENTE alongado(s) (codigos PT minusculos ja usados
nos seeds) para manter targeting/substituicao funcionando. `movement_pattern: null` em todos —
nenhum valor do enum descreve um hold passivo de alongamento (o validador permite null).

`primary_equipment`: precedente do cardio. Alongamento sem implemento -> `"Bodyweight"` (esta no
vocabulario controlado). Implementos fora do vocabulario (parede, batente, barra, faixa/strap) ->
`primary_equipment: null` + nome PT no campo livre `equipment`. NUNCA mapear implemento desconhecido
para um valor "parecido" do vocabulario.

Regra: **1 registro = 1 estimulo distinto**. Esquerda/direita do mesmo alongamento = 1 registro
(`execution_type: Unilateral`). Variantes de tempo/postura que nao mudam o musculo-alvo nem o
mecanismo sao dobradas em `name_variations` ou logadas como exclusoes.

---

## Fontes consultadas (curva de fechamento)

### Fonte 1 — ASFA (Top 20 Stretching Exercises for Ultimate Flexibility)
URL: https://www.americansportandfitness.com/blogs/fitness-blog/top-20-stretching-exercises-for-ultimate-flexibility
Lista: forward fold (isquio), wall calf (gastrocnemio), standing quad, lunging hip flexor, figure-four
(piriforme/gluteo), overhead triceps, crossbody shoulder (delt posterior), seated neck release,
cat-cow, frog (adutor), seated twist (gluteo/coluna), lying pectoral, standing IT band, knee-to-chest
(lombar), butterfly (adutor), reclined spinal twist, kneeling side bend (obliquo), downward dog,
extended puppy (ombro/peito), runner's lunge (hip flexor).
NOVO (set base): pescoco lateral, ombro cruzado, triceps overhead, peito (porta), torcao espinhal,
flexor de quadril, quadriceps, gluteo (figura-quatro), joelho-ao-peito, isquiotibiais, adutor
(borboleta/sapo), banda iliotibial, panturrilha. **~13 regioes/estimulos base.**

### Fonte 2 — Olaben (Static Stretching: 12 Best Stretches)
URL: https://olaben.com/blogs/olaben-blog/static-stretching
Lista: triceps, cross-body shoulder, chest doorway, neck side, standing quad, seated hamstring,
wall calf, figure-four glute, butterfly, kneeling hip flexor, child's pose, seated spinal twist.
NOVO: **child's pose (dorsais/coluna ajoelhado, +1)**, confirma neck/triceps/shoulder/chest como
estimulos separados. (Os demais ja no set base.)

### Fonte 3 — ExRx.net (Stretches directory + paginas indexadas)
URL: https://exrx.net/Lists/Directory ; https://exrx.net/Stretches/LatissimusDorsi/Overhead ;
https://exrx.net/Stretches/HipAdductors/SeatedGroinFloor ; https://exrx.net/ExInfo/Stretching
Canone biomecanico. Confirma como categorias distintas: pescoco, ombro, triceps, peito, **dorsais
(overhead lat stretch, +1)**, antebraco/punho, hip adductors (seated groin), quadriceps/hip flexor,
isquiotibiais, panturrilha. Distingue **overhead lat stretch** do child's pose (em pe/barra vs
ajoelhado). Separa flexor vs extensor de punho.
NOVO: **overhead lat stretch (+1)**, **flexor de punho (+1)**, **extensor de punho (+1)**.

### Fonte 4 — Biomecanica panturrilha (gastrocnemio vs soleo)
URL: https://www.setforset.com/blogs/news/soleus-exercises-stretches ;
https://equilibriumpt.com/how-to-perform-a-calf-stretch-gastrocnemius-and-solues-stretching-with-strap/ ;
https://themovementfix.com/basic-anatomy-of-stretching-the-calves/
O **soleo nao cruza o joelho** -> alongado com joelho FLEXIONADO; o **gastrocnemio cruza joelho +
tornozelo** -> alongado com joelho ESTENDIDO (gastroc fica slack com joelho dobrado). Dois estimulos
biomecanicamente distintos no mesmo grupo.
NOVO: **gastrocnemio (joelho reto) e soleo (joelho dobrado) como 2 registros (+1 vs "panturrilha"
generico).**

### Fonte 5 — NASM (lista de musculos hiperativos para alongamento estatico)
Via cert materials (PTPioneer / Brainscape NASM Cap.7): gastrocnemio, soleo, adutores, complexo
isquiotibial, psoas, TFL, reto femoral, piriforme, quadrado lombar, eretores da espinha, peitoral
maior/menor, grande dorsal, redondo maior, trapezio superior, levantador da escapula,
esternocleidomastoideo, escalenos.
NOVO: 0 estimulos novos roteaveis — todos ja cobertos por um alongamento existente do set
(psoas=flexor quadril 183; TFL=banda IT 192; quadrado lombar/eretores=torcao/joelho-ao-peito 182/186;
peitoral=178; dorsal/redondo=175/176; trap sup/levantador/SCM/escalenos=pescoco 172/173).
Confirma o **tibial anterior / canela** como musculo a alongar (NASM trata tibialis na cadeia).

### Fonte 6 — 10 Fitness (Essential Full Body Stretching Routine)
URL: https://10fitness.com/essential-full-body-stretching-routine/
Lista: neck, shoulder rolls, behind-head arm reach, doorframe chest, child's pose, hip flexor,
quad, standing hamstring, calf, seated glute.
NOVO: **0 distintos** (shoulder rolls = dinamico, excluido; o resto ja coberto).

### Fonte 7 — Newcastle Sports Injury (Ten Static Stretching Exercises)
URL: https://www.newcastlesportsinjury.co.uk/ten-static-stretching-exercises/
Lista: upper back, shoulder, hamstring, standing hamstring, calf, hip and thigh, adductor,
**standing iliotibial band**, quadriceps, **standing shin stretch**.
NOVO: confirma **standing shin stretch (tibial anterior)** ja sinalizado pela Fonte 5 -> entra como
registro (+1 vs o set; cobre a canela). IT band ja no set. **+1 (canela formalizado).**

### Fonte 8 — ASFA/Olaben cluster de membro superior + wrist/forearm
URL: https://www.hingehealth.com/resources/articles/wrist-flexor-stretch/ ;
https://www.teachpe.com/training-fitness/stretching/wrist-and-arm-stretching-exercises
Confirma **flexor de punho (palma p/ cima)** e **extensor de punho (palma p/ baixo)** como dois
alongamentos distintos do antebraco; e **biceps stretch na parede** (extensao de cotovelo+ombro,
distinto do triceps overhead).
NOVO: **biceps na parede (+1)** (a Fonte 3/ExRx lista biceps brachii junto do flexor, mas o
alongamento dedicado de biceps em pe na parede e um estimulo proprio). Flexor/extensor de punho ja
contados na Fonte 3.

### Fonte 9 — Yoga Journal / PT references (hamstrings/hip + strap)
URL: https://www.yogajournal.com/practice/stretches-for-tight-hamstrings-and-hip-flexors/ ;
https://equilibriumpt.com (faixa/strap)
Confirma **isquiotibiais deitado com faixa/strap** como variante distinta (decubito + faixa permite
ROM passivo controlado, comum em PT) vs isquio sentado/em pe (dobrados num so registro).
NOVO: **isquio deitado com faixa (+1).** (Standing vs seated hamstring = mesmo estimulo -> dobrados
em name_variations do 187.)

### Fonte 10 — WebMD (12 Stretches to Improve Flexibility) + Peloton (lat/hamstring)
URL: https://www.webmd.com/fitness-exercise/ss/slideshow-stretches-to-get-loose ;
https://www.onepeloton.com/blog/lat-stretches ; https://www.onepeloton.com/blog/hamstring-stretches
NOVO: **0 distintos** — repete neck/shoulder/chest/quad/hamstring/calf/glute/lat/spine; lat doorway
= variante do overhead lat 175; cobra/sphinx = extensao de coluna (mobilidade, nao alongamento
estatico passivo — roteado).

---

## Curva de retornos decrescentes
- Rodada 1 (Fontes 1–2): ~13 regioes base + child's pose. **+14.**
- Rodada 2 (Fonte 3 ExRx): overhead lat + flexor punho + extensor punho. **+3.**
- Rodada 3 (Fontes 4–5 biomecanica/NASM): gastroc vs soleo separados + tibial anterior. **+2.**
- Rodada 4 (Fontes 7–9): canela formalizada, biceps na parede, isquio deitado com faixa. **+3.**
- Fontes 6, 10: **+0 distintos cada** — so repeticao ou variantes ja dobradas/roteadas.

**Fechamento:** Fontes 6 e 10 retornaram 0 novos distintos; a Fonte 5 (NASM) nao acrescentou nenhum
alongamento alem dos ja mapeados (so confirmou cobertura muscular). 10 bases independentes + literatura
biomecanica de panturrilha. Universo fechado em **24 registros distintos** (seed-ex-172..195).

---

## Registros criados (24) — seed-ex-172..195

| ID | Nome | musculo_alvo | equip (livre) | primary_equip | exec |
|----|------|--------------|---------------|---------------|------|
| 172 | Alongamento Lateral do Pescoco | trapezio | Peso Corporal | Bodyweight | Unilateral |
| 173 | Alongamento Posterior do Pescoco | trapezio | Peso Corporal | Bodyweight | Bilateral |
| 174 | Alongamento do Ombro Cruzado | deltoide_posterior | Peso Corporal | Bodyweight | Unilateral |
| 175 | Alongamento de Dorsais Acima da Cabeca | grande_dorsal | Parede/Barra | null | Unilateral |
| 176 | Postura da Crianca | grande_dorsal, lombar | Peso Corporal | Bodyweight | Bilateral |
| 177 | Alongamento de Triceps Acima da Cabeca | triceps | Peso Corporal | Bodyweight | Unilateral |
| 178 | Alongamento de Peito na Porta | peitoral_esternal | Parede/Batente | null | Bilateral |
| 179 | Alongamento de Biceps na Parede | biceps_braquial | Parede | null | Unilateral |
| 180 | Alongamento de Flexores do Punho | flexores_antebraco | Peso Corporal | Bodyweight | Unilateral |
| 181 | Alongamento de Extensores do Punho | flexores_antebraco | Peso Corporal | Bodyweight | Unilateral |
| 182 | Torcao Espinhal Sentado | eretores_espinha, gluteos | Peso Corporal | Bodyweight | Unilateral |
| 183 | Alongamento de Flexores do Quadril Ajoelhado | flexores_quadril | Peso Corporal | Bodyweight | Unilateral |
| 184 | Alongamento de Quadriceps em Pe | quadriceps | Peso Corporal | Bodyweight | Unilateral |
| 185 | Alongamento de Gluteos Figura Quatro | gluteos | Peso Corporal | Bodyweight | Unilateral |
| 186 | Alongamento Joelho ao Peito | lombar, gluteos | Peso Corporal | Bodyweight | Can Be Both |
| 187 | Alongamento de Isquiotibiais Sentado | isquiotibiais | Peso Corporal | Bodyweight | Can Be Both |
| 188 | Alongamento de Isquiotibiais Deitado com Faixa | isquiotibiais | Faixa/Strap | null | Unilateral |
| 189 | Alongamento Borboleta | adutores | Peso Corporal | Bodyweight | Bilateral |
| 190 | Alongamento do Sapo | adutores | Peso Corporal | Bodyweight | Bilateral |
| 191 | Alongamento Lateral de Adutores em Pe | adutores | Peso Corporal | Bodyweight | Unilateral |
| 192 | Alongamento da Banda Iliotibial em Pe | abdutores | Peso Corporal | Bodyweight | Unilateral |
| 193 | Alongamento de Gastrocnemio na Parede | gastrocnemio | Parede | null | Unilateral |
| 194 | Alongamento de Soleo Joelho Flexionado | soleo | Parede | null | Unilateral |
| 195 | Alongamento de Canela em Pe | tibial_anterior | Peso Corporal | Bodyweight | Unilateral |

Notas de julgamento:
- **Gastrocnemio (193) vs Soleo (194):** mantidos separados — biomecanica clara (soleo nao cruza o
  joelho; gastroc fica slack com joelho dobrado). Fontes 4 e 5 confirmam. musculo_alvo distinto.
- **Isquio sentado/em pe (187) vs deitado com faixa (188):** sentado e em pe = mesmo estimulo
  (dobrados em name_variations do 187, execucao Can Be Both); deitado com faixa = registro proprio
  (decubito + faixa, ROM passivo controlado de PT, implemento fora do vocabulario -> equipment livre).
- **Borboleta (189) vs Sapo (190) vs Lateral em pe (191):** tres adutores distintos — borboleta
  (sentado, joelhos abertos), sapo (ajoelhado, quadril mais flexionado, ROM maior), lateral em pe
  (cossack estatico, ROM em pe carga unilateral). ExRx separa seated groin de outros.
- **execution_type:** alongamentos de um lado por vez = Unilateral (172,174,175,177,179,180,181,183,
  184,185,188,191,192,193,194,195); bilaterais simetricos = Bilateral (173,176,178,189,190);
  joelho-ao-peito e isquio sentado = Can Be Both (1 perna ou 2).
- **musculo_alvo (codigos):** reutilizados de seeds existentes onde havia (trapezio,
  deltoide_posterior, grande_dorsal, triceps, peitoral_esternal, biceps_braquial, flexores_antebraco,
  eretores_espinha, gluteos, lombar, quadriceps, isquiotibiais, adutores, gastrocnemio, soleo). Para
  musculos ainda nao representados no catalogo foram usados os codigos sancionados pelo prompt:
  `flexores_quadril`, `abdutores`, `tibial_anterior`. O validador nao valida vocabulario de musculo
  (so exige array nao-vazio); codigos seguem o padrao minusculo PT existente.

## Exclusoes (microvariantes / roteadas)
- **Roteadas para mobilidade (movimento dinamico/ativo, nao hold passivo):** Cat-Cow (gato-camelo),
  Cobra/Sphinx (extensao de coluna), Downward Dog (transicao dinamica), shoulder rolls (rotacao
  dinamica) -> sessoes `mobilidade_superior_coluna` / `mobilidade_inferior` (sao mobilidade ativa,
  nao alongamento estatico sustentado).
- **Microvariantes nao-distintas (dobradas):** standing vs seated hamstring (mesmo estimulo, 187);
  lat doorway stretch (variante do overhead lat 175); extended puppy / lying pectoral (variantes do
  peito na porta 178 / child's pose 176); seated vs supine spinal twist (dobrados no 182);
  kneeling side bend / oblique stretch (alongamento de obliquo — coberto pela torcao/lateral; nicho).
- **Roteadas para reabilitacao:** alongamentos de manguito rotador especificos (cross-body ja cobre o
  posterior; sleeper stretch e clinico) -> `reabilitacao_ombro_cotovelo` se necessario.
