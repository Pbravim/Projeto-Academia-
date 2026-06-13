# Pesquisa — Panturrilha (sessão `panturrilha`)

> Notas brutas da auditoria de universo (2026-06-13). Informativo — NÃO lido pelo app.
> Escopo = flexão plantar do tornozelo (panturrilha posterior): gastrocnêmio (joelho estendido) e
> sóleo (joelho fletido). Tibial anterior (dorsiflexão / tibialis raise) é músculo ANTERIOR diferente
> — fora de escopo (roteado). É a última sessão de força do manifest.

## Eixo de classificação (1 padrão novo + granularidade de músculo)
- **`Plantar Flexion`** (NOVO) — flexão plantar single-joint do tornozelo. Único padrão da sessão;
  todas as elevações de panturrilha são flexão plantar. Sem ele, todas cairiam em `null`.
- **Diferenciação gastrocnêmio × sóleo via `musculo_alvo`** (códigos novos `gastrocnemio` / `soleo`):
  - **`gastrocnemio`** — joelho ESTENDIDO (em pé): o gastrocnêmio cruza o joelho, então só contribui
    com o joelho reto. Em pé na máquina, peso corporal, leg press, donkey.
  - **`soleo`** — joelho FLETIDO ~90° (sentado): o gastrocnêmio entra em insuficiência ativa e o sóleo
    domina. Panturrilha sentada (máquina / haltere).
  - O músculo NÃO-dominante vai para `stabilizers` (ExRx: em pé recruta os dois; sentado isola o sóleo).
  - group_muscles continua `Panturrilha` (display), como os registros existentes.

> `Plantar Flexion` estendido em spec sub-5 + validador + skill no mesmo commit (catalog-maintenance.md §12).
> Como tudo compartilha um único padrão, a separação em pé/sentado é feita pelo musculo_alvo: em pé↔em pé
> e sentado↔sentado = Layer 1 ("quase igual"); em pé↔sentado = Layer 2 ("similar", mesmo pattern).

## Fontes consultadas (>10 bases)
1. **Muscle & Strength — Calves** (`/exercises/calves`) — 24 nomes: em pé (barra/máquina/peso corporal/
   1-perna haltere/no chão/toes-out/toes-in), sentado (máquina/haltere/1-perna/barra/toes-in), 45° leg
   press, Smith (toes-in/1-perna), donkey (+1-perna), hack squat (+1-perna), cable, banded tibialis raise.
2. **BarBend — Best Calf Exercises** — donkey, seated, single-leg (haltere), farmer's walk on toes,
   sled drag, jump rope, Captain Morgan, clean pull.
3. **StrengthLog — Calf Exercises** — standing, barbell standing, donkey, leg press, Smith, hack squat,
   heel raise, seated, eccentric heel drop, cardio.
4. **ExRx.net — Calf Exercise Analyses + Gastrocnemius/Soleus** (via busca: BWStandingCalfRaise,
   LVStandingCalfRaise, SMStandingCalfRaise, LVSeatedCalfRaise/Extension/H plate-loaded, LVSeatedCalfPress,
   SLSeatedCalfPress) — canon: joelho reto = gastroc+sóleo; sentado = sóleo (gastroc em insuficiência ativa).
5. **PureGym — Calves** — standing, single-leg, seated, leg press calf raise.
6. **dr-muscle — Best Calf Exercises** — standing, seated, leg press, donkey, Smith, single-leg, jump
   rope, tibialis raise; 70–80% volume em pé (gastroc), 10–20% sentado (sóleo).
7. **Arsenal Strength — Calf Raises / Variations** — leg press & donkey calf machine.
8. **LoadMuscle — Best Calf Exercises** — size/strength.
9. **gmwdfitness — Leg Press Calf Raise guide**.
10. **Wikipedia — Calf raises** — anatomia gastroc/sóleo.

## Curva de retornos decrescentes
- **Rodada 1** (M&S exaustivo + BarBend + StrengthLog + ExRx): **+2** distintos
  (panturrilha no leg press; panturrilha donkey).
- **Rodada 2** (PureGym, dr-muscle, Arsenal, LoadMuscle, gmwdfitness, Wikipedia): **+0**.
  **Fechamento confirmado.** Universo de panturrilha é pequeno: 2 estímulos reais (gastroc em pé /
  sóleo sentado), o resto são variantes de implemento/posição/carga.

## Roteado / excluído
- **Routed:** Banded Tibialis Raise / Tibialis Raise → músculo ANTERIOR (tibial anterior, dorsiflexão) —
  não é panturrilha; futura sessão de tibial / `reabilitacao_quadril_joelho` ou lower-leg anterior;
  Farmer's Walk on Toes / Captain Morgan → `forca_kettlebell` (carry na ponta dos pés); Sled Drag →
  `forca_maquinas_especializadas`; Jump Rope / Cardio (corrida/escada/bike) → `cardio_steady_state` /
  `cardio_hiit_funcional`; Clean Pull → levantamento olímpico (já roteado em posterior); Hack Squat Calf
  Raise → `forca_maquinas_especializadas` (variante de máquina dedicada; estímulo gastroc = em pé).
- **Não-distinto (variante de implemento/posição/carga/estabilidade/execução):**
  - *Gastroc em pé (≈ seed-ex-042 / gif-ex-158):* standing barbell / dumbbell / Smith / cable calf raise
    (implemento), standing no chão vs no step (ROM), single-leg standing (execução unilateral),
    eccentric heel drop (tempo), toes-in / toes-out (rotação do pé — ênfase medial/lateral, mesmo músculo).
  - *Sóleo sentado (≈ seed-ex-043 / gif-ex-175):* seated barbell / plate-loaded / Smith seated
    (implemento), single-leg seated (execução), toes-in seated (rotação do pé).
  - *Leg press (≈ seed-ex-129):* 45° vs horizontal leg press calf raise (ângulo da máquina).

## Registros novos (seed-ex-129..130)
| ID | Nome | Pattern | musculo_alvo | Equip. |
|----|------|---------|--------------|--------|
| seed-ex-129 | Panturrilha no Leg Press | Plantar Flexion | gastrocnemio | Leg Press |
| seed-ex-130 | Panturrilha Donkey | Plantar Flexion | gastrocnemio | Bodyweight |

## Convenções
- **Máquina (§1):** panturrilha sentada (seed-ex-043) = lever/anilha → `Plate-Loaded Machine` (ExRx
  LVSeatedCalfRaise plate-loaded); panturrilha em pé (seed-ex-042) = stack/pino com ombreiras →
  `Selectorized Machine`. Leg press calf raise (seed-ex-129) → `Leg Press`.
- **Donkey (seed-ex-130):** `Bodyweight` (forma clássica com parceiro/cinto); máquina donkey é name_variation.
- **gastrocnemio / soleo:** códigos de músculo novos (granularidade real, como biceps_braquial/braquial).
  Sem padrão de equipamento ou validação de vocabulário de músculo afetada (validador só exige array não-vazio).
