# GIF Mapping Status

Last updated: 2026-05-19

## Summary

| Total seed exercises | With GIF | Missing GIF |
|---|---|---|
| 43 | 40 | 3 |

All `gif-ex-*` exercises (migration v13) were created with GIFs already embedded in the INSERT statement.

---

## Seed exercises WITH GIFs

| ID | Name | GIF |
|---|---|---|
| seed-ex-001 | Supino Reto com Barra | `PEITORAL (1)/Supino barra.gif` |
| seed-ex-002 | Supino Inclinado com Barra | `PEITORAL (1)/Supino inclinado.gif` |
| seed-ex-003 | Supino Declinado com Barra | `PEITORAL (1)/barbell-decline-bench-press.gif` |
| seed-ex-004 | Supino Reto com Haltere | `PEITORAL (1)/dumbbell-chest-press.gif` |
| seed-ex-005 | Crucifixo com Haltere | `PEITORAL (1)/Crucifico com halteres.gif` |
| seed-ex-006 | Crossover no Cabo | `PEITORAL (1)/cable-cross-over.gif` |
| seed-ex-007 | Flexao de Braco | `PEITORAL (1)/push-up-bars.gif` *(added v14)* |
| seed-ex-009 | Barra Fixa | `COSTAS E TRAPÉZIO (1)/band-assisted-pull-up.gif` *(added v14)* |
| seed-ex-010 | Puxada Frontal | `COSTAS E TRAPÉZIO (1)/Pulldown1.gif` |
| seed-ex-011 | Remada Curvada com Barra | `COSTAS E TRAPÉZIO (1)/Remada inclinada.gif` |
| seed-ex-012 | Remada Unilateral com Haltere | `COSTAS E TRAPÉZIO (1)/Remada unilateral.gif` |
| seed-ex-013 | Remada Baixa no Cabo | `COSTAS E TRAPÉZIO (1)/Remada cabo.gif` |
| seed-ex-014 | Levantamento Terra | `Gifs - Bonus/Membros Inferiores/levantamento terra com barra.gif` |
| seed-ex-015 | Desenvolvimento com Barra | `Gifs - Bonus/Ombro/Desenvolvimento com Barra.gif` |
| seed-ex-016 | Desenvolvimento com Haltere | `Gifs - Bonus/Ombro/Desenvolvimento com Halteres.gif` |
| seed-ex-017 | Elevacao Lateral com Haltere | `Gifs - Bonus/Ombro/elevacao lateral inclinado sentado.gif` *(added v14)* |
| seed-ex-018 | Elevacao Frontal com Haltere | `Gifs - Bonus/Ombro/elevacao unilateral frontal.gif` |
| seed-ex-019 | Elevacao Posterior com Haltere | `Gifs - Bonus/Costas/voador invertido.gif` *(added v14)* |
| seed-ex-020 | Encolhimento com Haltere | `Gifs - Bonus/Trapezio/encolhimento livre com halteres.gif` |
| seed-ex-021 | Rosca Direta com Barra | `Gifs - Bonus/Biceps/rosca direta barra W.gif` |
| seed-ex-022 | Rosca Alternada com Haltere | `Gifs - Bonus/Biceps/rosca alternada pegada neutra sentado no banco.gif` |
| seed-ex-023 | Rosca Concentrada com Haltere | `Gifs - Bonus/Biceps/Rosca Concentrada 2.gif` |
| seed-ex-024 | Rosca no Cabo | `Gifs - Bonus/Biceps/biceps concentrado unilateral no cross.gif` *(added v14)* |
| seed-ex-025 | Triceps Testa com Barra | `TRÍCEPS (1)/Triceps testa 01.gif` |
| seed-ex-026 | Triceps Pulley | `TRÍCEPS (1)/Triceps pulley.gif` |
| seed-ex-027 | Triceps Coice com Haltere | `TRÍCEPS (1)/cable-tricep-kickback.gif` |
| seed-ex-028 | Triceps Frances com Haltere | `TRÍCEPS (1)/Triceps frances.gif` |
| seed-ex-029 | Mergulho entre Bancos | `TRÍCEPS (1)/bench-tricep-dips.gif` |
| seed-ex-030 | Abdominal Crunch | `ABDOMEN CORE (1)/Crunch 4.gif` |
| seed-ex-031 | Prancha Abdominal | `ABDOMEN CORE (1)/Prancha frente tras.gif` |
| seed-ex-032 | Elevacao de Pernas | `ABDOMEN CORE (1)/Crunch reverso.gif` |
| seed-ex-033 | Abdominal Obliquo | `ABDOMEN CORE (1)/ABS obliquo.gif` |
| seed-ex-034 | Agachamento Livre | `Gifs - Bonus/Membros Inferiores/agachamento livre pes juntos.gif` *(added v14)* |
| seed-ex-035 | Leg Press 45 | `MEMBROS INFERIORES E GLÚTEOS (1)/Leg press 45.gif` |
| seed-ex-036 | Afundo com Haltere | `MEMBROS INFERIORES E GLÚTEOS (1)/Passadas com halteres.gif` |
| seed-ex-038 | Leg Curl | `MEMBROS INFERIORES E GLÚTEOS (1)/Mesa flexora.gif` |
| seed-ex-039 | Stiff com Barra | `MEMBROS INFERIORES E GLÚTEOS (1)/barbell-romanian-deadlift-movement.gif` |
| seed-ex-040 | Hip Thrust com Barra | `MEMBROS INFERIORES E GLÚTEOS (1)/barbell-hip-thrust.gif` |
| seed-ex-042 | Panturrilha em Pe | `Gifs - Bonus/Membros Inferiores/Flexao Plantar com peso corporal.gif` *(added v14)* |
| seed-ex-043 | Panturrilha Sentado | `PANTURRILHA (1)/seated-calf-raise-dumbbell.gif` |

---

## Seed exercises MISSING GIFs

These 3 exercises have no suitable GIF in the current asset collection. New GIF files need to be sourced and added to `apps/mobile/assets/gifs/`.

| ID | Name | Group | Equipment | Notes |
|---|---|---|---|---|
| seed-ex-008 | Pullover com Haltere | Costas, Peito | Haltere | No pullover GIF exists in any folder |
| seed-ex-037 | Extensao de Joelhos | Quadriceps | Maquina | No leg extension machine GIF exists |
| seed-ex-041 | Abducao de Quadril | Gluteos | Maquina | No hip abduction machine GIF exists |

### Steps to add a missing GIF

1. Place the `.gif` file in the appropriate subfolder under `apps/mobile/assets/gifs/`
2. Run `scripts/copy_gifs.py` to regenerate `gifAssets.ts`
3. Add a migration step in `ExpoSQLiteDatabaseClient.ts` (next version after v14):
   ```sql
   UPDATE exercises SET media_local = 'FOLDER/filename.gif' WHERE id = 'seed-ex-XXX' AND media_local IS NULL;
   ```

---

## Thumbnail feature

As of this session, `ExercicioCard` (active session list) shows a **52×52 static thumbnail** (first frame of the GIF) on the left side of each card when `mediaLocal` is set. This lets users identify exercises at a glance without opening the card.

- Component: `apps/mobile/src/ui/sessao/components/ExercicioCard.tsx`
- Data source: `SessaoExercicioComSeries.mediaLocal` passed from `SessaoAtivaScreen`
- Rendering: `expo-image` with `autoplay={false}`
