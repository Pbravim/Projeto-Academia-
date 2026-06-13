# Pesquisa — Tríceps (sessões `triceps_push_down` + `triceps_overhead`)

> Notas brutas da auditoria de universo (2026-06-13). Informativo — NÃO lido pelo app.
> As duas sessões compartilham uma única auditoria (o universo de tríceps é um só; a divisão
> push-down × overhead/testa é organizacional). Vocabulário de `movement_pattern` estendido com
> `Elbow Extension` (ver catalog-maintenance.md §8).

## Eixo de classificação
- **Isolação (single-joint, `Elbow Extension`):** pushdown/pulley, coice/kickback, testa/skullcrusher,
  francês/overhead, na máquina, Tate press.
- **Composto (multi-joint, `Horizontal Push`):** supino fechado, mergulho/dips, flexão fechada, JM press.
- **Cabeça-alvo:** `triceps_cabeca_longa` (overhead/testa — braço acima da cabeça alonga a porção longa);
  `triceps_lateral_medial` (pushdown/kickback/dips/close-press).

## Fontes consultadas (>10 bases independentes)
1. **Muscle & Strength** (`/exercises/triceps`) — lista completa por tipo/implemento (pushdown bar/rope/reverse,
   overhead DB seated/lying/incline/standing/1-arm, skull EZ/barbell/45°/incline, dips bar/bench/single,
   close-grip bench, kickback DB/cable, machine, Tate press, Rolling DB extension).
2. **BarBend** (`/best-triceps-exercises/`) — close-grip bench, dip, pushdown, skull crusher, floor press,
   overhead ext, landmine press, diamond push-up, push press, cross-body cable ext, cable kickback.
3. **ExRx.net** (via busca: `CBPushdown`, `CBPushdownVBar`, `CBPushdownSupport`, `BBLyingTriExtSC`,
   `LVTriExt`, `DBOneArmTriExtBench`) — canon; distingue pushdown bar/V-bar/com-apoio, lever (máquina),
   skull, overhead 1-braço.
4. **StrengthLog** (`/long-head-triceps-exercises/`) — incline barbell ext, standing barbell ext,
   close-grip bench, bar dip, standing DB ext, lying ext, machine overhead ext, overhead cable ext,
   bodyweight ext, kickback.
5. **soletreadmills** — overhead extension vs skull crusher (long head).
6. **AthleanX** — melhor variação de pushdown; skullcrushers.
7. **BOXROX** — ranking por ciência.
8. **REP Fitness** (13 best) — pushdown, dips, CGBP, skull, overhead.
9. **dr-muscle** (20 best) — inclui JM press, Tate press, dip machine, reverse-grip pressdown.
10. **Fitbod** — cable triceps pushdown variations.
11. **Fitness Volt** (Jeff Nippard ranks 20) — rope pressdown, reverse-grip bar pressdown, overhead
    skullcrusher, JM press, Tate press, cable kickback, dip machine, CGBP.
12. **kathrynalexander** — 11 pushdown alternatives.

## Curva de retornos decrescentes
- **Rodada 1** (M&S lista completa + BarBend + ExRx): set base; lacunas distintas → **+6**
  (rope pushdown, reverse-grip pushdown, mergulho livre nas paralelas peso-corporal, JM press,
  Tate press, extensão de tríceps peso-corporal overhead).
- **Rodada 2** (StrengthLog, soletreadmills, AthleanX, Fitbod): **+0** distintos — confirmam os 6 acima;
  resto = variantes de ângulo/posição/implemento já cobertas.
- **Rodada 3** (BOXROX, REP, dr-muscle, Fitness Volt/Nippard, kathrynalexander): **+0** distintos —
  JM/Tate confirmados (já adicionados); resto roteado ou variante. **Fechamento confirmado.**

## Roteado para outras sessões / excluído
- **Landmine Press → `forca_landmine`**; **Band pushdown/overhead → `forca_elastico_funcional`**;
  **Kettlebell floor press → `forca_kettlebell`**; **TRX triceps extension → `forca_suspension_trainer`**.
- **Não-distinto (variante de ângulo/posição/implemento/grip/ROM):** V-bar pushdown & pushdown com apoio
  (attachment/postura do pushdown bar 026); 45°/incline/decline skullcrusher (ângulo do skull); EZ vs
  barbell skull (implemento); standing vs seated vs 1-arm DB overhead (posição/execução do francês);
  Rolling DB extension (tempo do lying ext); DB/barbell floor press close-grip & push press (ROM/variante
  do supino fechado); weighted dip (carga); sphinx push-up (variante de flexão fechada); cross-body cable
  overhead (execução do overhead cabo gif-098); machine overhead extension (variante da máquina 094/095).

## Registros novos (seed-ex-106..111)
| ID | Nome | Sessão | Pattern | musculo_alvo | Equip. |
|----|------|--------|---------|--------------|--------|
| seed-ex-106 | Tríceps Pushdown na Corda | push_down | Elbow Extension | triceps_lateral_medial | Cable |
| seed-ex-107 | Tríceps Pushdown Pegada Invertida | push_down | Elbow Extension | triceps_lateral_medial | Cable |
| seed-ex-108 | Mergulho nas Paralelas | push_down | Horizontal Push | triceps_lateral_medial | Bodyweight |
| seed-ex-109 | JM Press | push_down | Horizontal Push | triceps_lateral_medial | Barbell |
| seed-ex-110 | Tate Press | overhead | Elbow Extension | triceps_lateral_medial | Dumbbell |
| seed-ex-111 | Extensão de Tríceps Peso Corporal | overhead | Elbow Extension | triceps_cabeca_longa | Bodyweight |
