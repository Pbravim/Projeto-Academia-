# Sub-projeto 5b: Exercise Research Sessions

> **This plan is ongoing.** Each session adds one JSON seed file for a new muscle sub-group. Execute one session at a time using the `exercise-intelligence-research` skill. No code changes — only JSON files are produced.

**Prerequisite:** Sub-projeto 5a (infrastructure plan `2026-06-05-subproject-5-exercise-intelligence.md`) must be fully merged before any session here has effect, because the seed loader and schema columns don't exist until then.

**How to run a session:**

1. Check the manifest to see which sub-groups are still pending:
   `apps/mobile/src/infrastructure/exercises/seeds/_manifest.json`
2. Pick the next pending session from the table below.
3. Invoke the `exercise-intelligence-research` skill.
4. Save results to the corresponding JSON file.
5. Update `_manifest.json` with `"status": "complete"`.
6. Commit the two files (`seed file + manifest`).

---

## Session Tracker

| # | Session | Target file | Status |
|---|---------|-------------|--------|
| 1 | Peito — Press horizontal | `seeds/peito_press.json` | ✅ complete (2026-06-05, 18 exercises) |
| 2 | Peito — Fly / isolação | `seeds/peito_fly.json` | ✅ complete (2026-06-05, 15 exercises) |
| 3 | Costas — Pull vertical (lat pulldown, pullup) | `seeds/costas_pull_vertical.json` | ⏳ pending |
| 4 | Costas — Pull horizontal (row) | `seeds/costas_pull_horizontal.json` | ⏳ pending |
| 5 | Ombros — Press (military, arnold, etc.) | `seeds/ombros_press.json` | ⏳ pending |
| 6 | Ombros — Lateral / posterior (raises) | `seeds/ombros_lateral.json` | ⏳ pending |
| 7 | Bíceps | `seeds/biceps.json` | ⏳ pending |
| 8 | Tríceps — Push down / extension | `seeds/triceps_push_down.json` | ⏳ pending |
| 9 | Tríceps — Overhead / testa | `seeds/triceps_overhead.json` | ⏳ pending |
| 10 | Quadríceps (squat, leg press, leg extension) | `seeds/quadriceps.json` | ⏳ pending |
| 11 | Posterior / glúteos (deadlift, hip thrust, leg curl) | `seeds/posterior_gluteos.json` | ⏳ pending |
| 12 | Abdome | `seeds/abdome.json` | ⏳ pending |
| 13 | Panturrilha | `seeds/panturrilha.json` | ⏳ pending |

---

## Seed File Format

Each file must follow this structure exactly (so the `ExerciseSeedLoader` can parse it):

```json
{
  "catalog_version": 1,
  "exercises": [
    {
      "id": "gif-ex-NNN",
      "name": "Nome em Português",
      "name_variations": ["Variation PT", "English Name", "Apelido"],
      "group_muscle": "Grupo Principal, Secundário",
      "category": "Composto | Isolado",
      "equipment": "Nome do equipamento (usado na UI)",
      "primary_equipment": "Barbell | Dumbbell | Cable | Machine | Smith Machine | Bodyweight | ...",
      "secondary_equipment": "Flat Bench | Incline Bench | null",
      "movement_pattern": "Horizontal Push | Horizontal Pull | Vertical Push | Vertical Pull | Hip Hinge | Squat | Carry | Isolation",
      "musculo_alvo": ["musculo_id_1", "musculo_id_2"],
      "stabilizers": ["musculo_id_3"],
      "execution_type": "Unilateral | Bilateral | Can Be Both",
      "equivalent_alternatives": ["gif-ex-NNN"],
      "muscle_group_alternatives": ["gif-ex-NNN"]
    }
  ]
}
```

---

## ID Conventions

- `seed-ex-001` to `seed-ex-006` — exercises researched without GIF reference
- `gif-ex-001` onwards — exercises with GIF media reference

**Current highest ID:** `gif-ex-035` (from peito_fly session)

Next new exercise starts at: `gif-ex-036`

**Never reuse or rename existing IDs** — they are foreign keys in user workout data.

---

## Commit Convention

```bash
git add apps/mobile/src/infrastructure/exercises/seeds/<sub-group>.json \
        apps/mobile/src/infrastructure/exercises/seeds/_manifest.json
git commit -m "feat(seeds): add <sub-group> exercise catalog (N exercises)"
```
