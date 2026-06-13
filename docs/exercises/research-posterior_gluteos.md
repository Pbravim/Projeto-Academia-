# Pesquisa — Posterior / Glúteos (sessão `posterior_gluteos`)

> Notas brutas da auditoria de universo (2026-06-13). Informativo — NÃO lido pelo app.
> Escopo = cadeia posterior (isquiotibiais), glúteos, e isolação de quadril (adutor/abdutor) +
> levantamentos olímpicos roteados do quad. Quadríceps → sessão `quadriceps`; panturrilha → `panturrilha`.

## Eixo de classificação (3 padrões novos)
- **`Hinge`** — dobradiça de quadril EM PÉ, isquiotibial+glúteo: terra, stiff/RDL, bom dia, aviao
  (single-leg RDL), hiperextensão/back extension, pull-through no cabo, clean.
- **`Knee Flexion`** (NOVO) — flexão de joelho single-joint, isquiotibial: mesa flexora (lying), cadeira
  flexora (seated), flexora em pé, flexora no cabo, nordic.
- **`Hip Extension`** (NOVO) — extensão de quadril glúteo-dominante em ponte/coice: hip thrust, glute
  bridge, elevação pélvica, kickback/coice (cabo/banda/4-apoios), frog pump, glúteo na máquina.
- **`null`** — adução/abdução de quadril (cadeira adutora/abdutora, adutor no cabo): sem valor no enum
  (lacuna de vocabulário documentada); agrupam por `musculo_alvo` (adutores / gluteos).

## Fontes consultadas (>10 bases)
1. **Muscle & Strength — Hamstrings** (`/exercises/hamstrings`) — terra/stiff/RDL/sumo/trap-bar/déficit/
   snatch-grip/single-leg; leg curl (lying/seated/single/standing-cable/lying-cable/DB); nordic (+band/
   partner); GHR (+plate); ball curl (SHELC); razor curl; reverse hack squat.
2. **Muscle & Strength — Glutes** (`/exercises/glutes`) — hip thrust (barra/peso/unilateral/band); glute
   bridge (peso/barra/unilateral/band/marching); hyperextension (+weighted/reverse/GHD); good morning
   (+banded/seated/pins/single-leg); standing glute kickback machine; glute kickback; lateral/diagonal band
   walk; side-lying clam; curtsy lunge; hip flexion machine.
3. **ExRx.net** (busca: `LVLyingLegCurlPL`, `BWHamstringRaise` (nordic/inverse), `BWLyingHipExtension`,
   `STHipBridge`, ThighWt/HipsWt) — canon; lying leg curl (lever/PL), inverse leg curl, single-leg hip
   bridge; confirma 3 tipos de leg curl (seated/lying/standing).
4. **GymQuip** — circuito ham/glúteo (hip thrust, RDL, cable pull-through, lying leg curl, glute bridge,
   seated leg curl).
5–12. (compartilhadas com a auditoria de quadríceps / cluster posterior): BarBend, StrengthLog, PureGym,
   Nippard/GenerationIron, LiftVault, BarbellMedicine — confirmam o cluster sem distintos novos.

## Curva de retornos decrescentes
- **Rodada 1** (M&S hamstrings + M&S glutes + ExRx): **+4** distintos (cadeira flexora/seated leg curl;
  pull-through no cabo; cadeira abdutora/hip abductor; glúteo na máquina/glute kickback machine).
- **Rodada 2/3** (GymQuip, BarBend, StrengthLog, PureGym, Nippard, LiftVault, BarbellMedicine): **+0**.
  **Fechamento confirmado.**

## Roteado / excluído
- **Routed:** Kettlebell swing/RDL/sumo → `forca_kettlebell`; Landmine RDL → `forca_landmine`;
  Reverse Hyperextension + Reverse Hack Squat → `forca_maquinas_especializadas` (máquina dedicada,
  vocab gap; back extension gif-ex-053 cobre a hiperextensão); Lateral/Diagonal Band Walk → `forca_elastico_funcional`;
  Hip Flexion Machine + Side-Lying Clam → flexor de quadril / mobilidade (fora de glúteo/posterior puro);
  Trap-Bar / Hex-Bar Deadlift → vocab gap (sem 'Trap Bar') → `forca_maquinas_especializadas`.
- **Não-distinto (variante de carga/ROM/stance/estabilidade/execução):** RDL ≈ Stiff (seed-ex-039 + gif-ex-151/163/164);
  Sumo/Déficit/Snatch-Grip/Reverse-Band Deadlift (variantes do terra seed-ex-014); Seated/Banded/Pins/Single-leg
  Good Morning (variantes do bom dia gif-ex-135/148); Marching/Banded Glute Bridge (variantes da ponte gif-ex-147);
  GHR / Razor Curl / SHELC ball curl (variantes do nordic gif-ex-143 / leg curl); Single Leg Curl (execução
  da flexora); Weighted/GHD Back Extension (carga/aparelho da hiperextensão gif-ex-053).

## Registros novos (seed-ex-118..121)
| ID | Nome | Pattern | musculo_alvo | Equip. |
|----|------|---------|--------------|--------|
| seed-ex-118 | Cadeira Flexora (Seated Leg Curl) | Knee Flexion | isquiotibiais | Selectorized Machine |
| seed-ex-119 | Cadeira Abdutora (Hip Abductor) | null (vocab gap) | gluteos | Selectorized Machine |
| seed-ex-120 | Pull-Through no Cabo | Hinge | gluteos, isquiotibiais | Cable |
| seed-ex-121 | Gluteo na Maquina (Glute Kickback Machine) | Hip Extension | gluteos | Selectorized Machine |
