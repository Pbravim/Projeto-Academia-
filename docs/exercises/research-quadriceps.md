# Pesquisa — Quadríceps (sessão `quadriceps`)

> Notas brutas da auditoria de universo (2026-06-13). Informativo — NÃO lido pelo app.
> Escopo = quadríceps-dominante (agachamentos, leg press, afundos/lunges, isolação de joelho).
> Hip-hinge / glúteo / posterior / adutor / panturrilha → sessões irmãs (posterior_gluteos, panturrilha).

## Eixo de classificação
- **Squat (`Squat`):** back/front/smith/máquina/hack/goblet/sumo/pés-juntos/afastados/pistol + leg press.
- **Lunge (`Lunge`):** afundo/avanço/passada/recuo/cruzado/lateral, búlgaro, step-up.
- **Isolação de joelho (`Knee Extension`):** cadeira extensora, sissy squat (joelho-dominante, quadril fixo).
- **musculo_alvo:** `quadriceps` (todos); `adutores` somando em sumo/afastado/lateral.

## Fontes consultadas (>10 bases)
1. **Muscle & Strength** (`/exercises/quads`) — lista completa: back/front/DB/goblet(DB+KB)/hack(máquina+barra)/
   smith/box/frog/plie/prisoner squat; afundo (DB/barra/peso, reverse/walking/lateral/smith/KB/landmine);
   split squat (DB/búlgaro/FFE/peso); step-up (DB/peso); leg extension; leg press (+smith); wall squat; hang clean.
2. **BarBend** (`/best-quad-exercises/`) — front, heel-elevated back, goblet, búlgaro, FFE split, cyclist,
   Spanish (band), hack (máquina+barra), leg press, low-cable split, step-up, walking lunge, leg extension,
   sissy (+banded), jump squat.
3. **ExRx.net** (busca: `BBHackSquat`, `SLHackSquat`, `SL45LegPress`, `LV45LegPress`, `BWSingleLegSquat`,
   `SMSquat`, `BWSquat`) — canon; hack (barra/sled), leg press (sled/lever), pistol, smith, single-leg box.
4. **StrengthLog** (`/quad-exercises/`) — squat/front/DB/goblet/lunge/búlgaro/step-up/hack/leg press/
   leg extension/smith/belt squat.
5. **PureGym** (`/exercises/legs/quad-exercises/`) — squat, leg press, lunge, leg extension, wall sit.
6. **BarBend/Jeff Nippard** (ranking 20) — hack (top), sissy (S-tier isolação), pendulum (≈hack arco),
   búlgaro (S), goblet (B, ≈front squat), step-up, bosu (F).
7. **Generation Iron** — espelha o ranking Nippard.
8. **LiftVault** / **IronBull** / **BarbellMedicine** / **XcelerateGyms** — hack squat alternatives
   (confirmam búlgaro, leg press, goblet, pendulum, belt squat, sissy como o cluster).
9. **madscientistofmuscle** — lista enciclopédica de quad (sem distintos novos).
10. **Sportskeeda** — variações de búlgaro (FFE etc. = variantes).

## Curva de retornos decrescentes
- **Rodada 1** (M&S + BarBend + ExRx): **+6** distintos (cadeira extensora, hack squat, búlgaro, goblet,
  step-up, sissy squat).
- **Rodada 2** (StrengthLog, PureGym, Nippard/GenIron): **+0** — confirmam os 6; belt squat/pendulum/
  Spanish/jump roteados ou vocab-gap; cyclist/box/plie/FFE/split estático dobrados.
- **Rodada 3** (hack alternatives, madscientist, sportskeeda): **+0**. **Fechamento confirmado.**

## Roteado / excluído
- **Belt Squat, Pendulum Squat → `forca_maquinas_especializadas`** (sem valor no vocabulário de equipamento;
  pendulum ≈ arco do hack mas máquina distinta).
- **Spanish Squat (band) → `forca_elastico_funcional`**; **Landmine squat/lunge → `forca_landmine`**;
  **KB goblet/lunge → `forca_kettlebell`** (DB goblet já cobre o estímulo nesta sessão).
- **Jump Squat / plyo → `cardio_hiit_funcional`** (category Power/plyo, ausente do catálogo atual).
- **Clean / Hang Clean (gif-ex-137) → `posterior_gluteos`** (tripla-extensão olímpica, cadeia posterior/power).
- **Cadeira Adutora (gif-ex-136) + Adutora no Cabo (gif-ex-152) → `posterior_gluteos`** (isolação de adutor
  de quadril; nenhuma é quadríceps).
- **Não-distinto (variante de posição/ROM/carga):** Box Squat, Cyclist/Heel-Elevated Squat (calço — posição
  do agachamento), Plie/Frog Squat (stance largo — coberto por afastado/sumo), Front-Foot-Elevated &
  Static Split Squat (≈ afundo/búlgaro), Wall Sit (isométrico), Prisoner Squat (peso corporal = agachamento),
  Pendulum (arco do hack), Unilateral Leg Extension (execução da cadeira extensora).

## Registros novos (seed-ex-112..117)
| ID | Nome | Pattern | musculo_alvo | Equip. |
|----|------|---------|--------------|--------|
| seed-ex-112 | Cadeira Extensora | Knee Extension | quadriceps | Selectorized Machine |
| seed-ex-113 | Hack Squat | Squat | quadriceps | Hack Squat Machine |
| seed-ex-114 | Agachamento Búlgaro | Lunge | quadriceps | Dumbbell |
| seed-ex-115 | Agachamento Goblet | Squat | quadriceps | Dumbbell |
| seed-ex-116 | Step-Up no Banco | Lunge | quadriceps | Dumbbell |
| seed-ex-117 | Sissy Squat | Knee Extension | quadriceps | Bodyweight |
