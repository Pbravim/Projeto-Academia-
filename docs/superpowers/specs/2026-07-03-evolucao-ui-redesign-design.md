# Evolução UI Redesign — Design

**Date:** 2026-07-03
**Status:** Approved
**Scope:** `apps/mobile` UI layer only (no domain/application/infrastructure changes)

## Problem

The evolution screens are hard to use:

- `TreinoEvolucaoScreen` (Dashboard → evolution by workout) hides everything behind
  collapsed cards; the collapsed state gives almost no signal, so scanning progress
  requires expanding each exercise one by one. It also renders a plural bug
  ("sessãooes").
- `HistoricoExercicioScreen` (per-exercise history) uses the same
  collapse-to-see-anything pattern for each past execution.
- Series are displayed as wrapping chips grouped as "3× 80×10", which users find
  confusing and impossible to compare across sessions.
- The shared `LineChart` is hand-rolled from rotated `View`s: no per-point values,
  no touch interaction, Y axis labels only at min/max, and it renders **nothing**
  when there are fewer than 2 points (known issue: historico looks broken with a
  single session).
- General visual hierarchy/spacing on both screens is weak.

User-confirmed priorities: better charts, at-a-glance scannability, clearer series
display, visual polish. Progress indicators (PRs/trends) are wanted only in subtle,
non-cluttering forms.

## Approach (chosen)

Add `react-native-svg` (via `npx expo install react-native-svg` so the version
matches Expo SDK 54) and rewrite `LineChart` on SVG; redesign both evolution
screens for scannability; replace series chips with an aligned session table;
add exactly two subtle progress cues (PR marker on the chart's max point, one
trend delta per exercise card).

Rejected alternatives: polishing the hand-rolled chart (visual ceiling too low);
a full "progress hub" redesign with overview sections and records timeline
(clutter risk, larger scope than needed).

## A. `LineChart` rewrite (SVG)

File: `apps/mobile/src/ui/shared/LineChart.tsx` (same path, same component name).

**API — backward compatible.** Existing props keep working unchanged so
`PesoScreen`, `HistoricoExercicioScreen`, and `TreinoEvolucaoScreen` compile
without call-site changes:

```ts
interface LineChartProps {
  points: { value: number; label: string }[];
  color?: string;          // defaults to theme accent
  height?: number;         // default 130
  formatValue?: (v: number) => string;
  // new, optional:
  markMax?: boolean;       // default false — "PR" badge on the all-time max point
  showArea?: boolean;      // default true — gradient area fill under the line
}
```

**Rendering:**

- Gently smoothed line (Catmull-Rom → cubic bezier with low tension; must not
  overshoot min/max visually) drawn as an SVG `Path`, 2.5–3px stroke.
- Optional gradient area fill under the line (`color` at ~18% opacity fading to
  transparent).
- Three dashed horizontal grid lines with Y labels at min / mid / max, formatted
  via `formatValue`.
- A dot on every point; the last point is larger with a ring (current behavior,
  restyled).
- X labels: all labels when `points.length <= 5`, otherwise first / middle / last.
- `markMax`: the maximum-value point gets a small "PR" pill next to it. If several
  points tie for max, mark only the most recent one.

**Interaction (tap-to-inspect):** a transparent overlay captures taps; the nearest
point by x-coordinate becomes "selected" and shows a small bubble with
`formatValue(value)` and the point's label. Tapping the same point again (or a
second tap anywhere after selection of the same index) clears it. Selection is
per-chart local state.

**Single point:** with exactly 1 point, render the dot centered with its value
above and label below (no line, no grid). Never return `null` for 1 point; still
return `null` for 0 points. This fixes the single-session case.

**Theming:** all colors come from `useTheme()` tokens or the `color` prop; must
look right in dark and light themes.

**Testability:** geometry (scales, path construction, label selection, nearest-
point hit testing) is extracted into a pure helper module
`apps/mobile/src/ui/shared/lineChartGeometry.ts` unit-tested with vitest. The
component itself stays a thin SVG renderer.

## B. `TreinoEvolucaoScreen` redesign

File: `apps/mobile/src/ui/dashboard/screens/TreinoEvolucaoScreen.tsx`.

**Collapsed card (default state) — scannable:**

- Left: exercise name + muscle group (as today).
- Right: a mini sparkline (~64×28, axis-less SVG line of `melhorOrm` across the
  session window, same smoothing as the main chart, no dots except last) plus a
  single trend delta below it: last session's 1RM vs the first session in the
  window, e.g. "↑ +4 kg" (green), "↓ −2 kg" (red), "→ estável" (muted).
- Exercises without 1RM data (`melhorOrm === 0` everywhere): no sparkline, show
  the session count only, muted.
- Plural bug fixed: "N sessão"/"N sessões".
- Chevron kept; tap anywhere on the header toggles expansion (unchanged).

**Expanded card:**

- Summary pills kept but restyled (tighter padding, consistent typography):
  Melhor 1RM (window best; small "PR" tag when the latest session set it),
  Δ vs anterior, Séries (últ.).
- Chart toggle becomes a proper segmented control (two segments: "1RM estimado",
  "Volume total") above the new `LineChart`. `markMax` enabled for the 1RM mode.
- **Session table replaces series chips.** One row per session, newest first:

  ```
  28/06   80×10   80×10   82,5×8      1RM ~103
  25/06   80×10   80×10   80×10       1RM ~100  ↓
  ```

  - Each set rendered individually as `carga×reps` — no "3× 80×10" grouping.
  - Best set (highest estimated 1RM) of each session highlighted (accent color,
    bolder weight).
  - Latest session row marked with an accent left border (replaces today's full
    border highlight).
  - Small ↑/↓ next to a session's 1RM comparing against the previous (older)
    session; nothing shown when equal or no previous data.
  - All numbers use tabular figures (`fontVariant: ['tabular-nums']`) so columns
    align.
  - Sets wrap to a second line within the row when they don't fit (long drop-sets).
  - Sessions with no valid series keep the "Sem séries válidas" muted row.

- Hero card kept; description copy tightened.

## C. `HistoricoExercicioScreen` redesign

File: `apps/mobile/src/ui/historico/screens/HistoricoExercicioScreen.tsx`.

- New SVG `LineChart` at the top with `markMax` enabled. With a single session the
  chart card now shows the single-point rendering instead of the "Faça mais
  sessões" apology text.
- Plateau banner kept, restyled to match the new visual language (same radius/
  typography scale as other cards).
- The per-execution collapsible cards are replaced by **one "Execuções" card**
  containing the same session table as section B (date, individual sets with
  best-set highlight, volume + 1RM per row, ↑/↓ vs previous, newest first with
  accent border). No expand/collapse — everything scannable; the screen's
  ScrollView handles long histories.
- The `substituiuLabel` ("substituted exercise") annotation is kept, shown as a
  small muted line under the row's date.
- Dead code removed: `seriesAquec` is always an empty array — delete it and the
  warm-up chip block.

**Shared component:** the session table is implemented once as
`apps/mobile/src/ui/shared/components/SessionSeriesTable.tsx` and used by both
screens. Its input is a plain view-model array (date label, sets as
`{ cargaKg, repeticoes }`, volume, orm, flags), so each screen adapts its own
data shape to it; presenter-level mapping functions are pure and unit-testable.

## D. Registered-series list polish (active session)

File: `apps/mobile/src/ui/sessao/screens/ExercicioDetalheScreen.tsx`, series list
only ("Series registradas" card):

- Rows numbered: "S1", "S2", … prefix, muted, fixed width.
- Metric formatted as "80 kg × 10" with tabular figures.
- Best set (highest estimated 1RM among reps_load series) gets a subtle highlight.
- Edit (long-press) and delete behaviors unchanged. Non-reps_load metrics keep
  the existing `formatSerieMetric` output, just aligned in the new row layout.

## Edge cases

- **1 session:** main chart renders single-point state; sparkline and trend delta
  hidden (need ≥2 sessions); session table renders normally.
- **0 sessions / no data:** existing empty states kept.
- **Non-strength series (cardio/hold/reps_only):** unchanged behavior — they are
  excluded from 1RM/volume computations exactly as today, with `?? 0` null guards
  preserved where `cargaKg`/`repeticoes` can be null.
- **Ties for max on `markMax`:** most recent point wins.
- **Volume mode:** sessions with zero computed volume are filtered from chart
  points (current behavior preserved).
- **Themes:** verified in dark and light.

## Testing

- New pure modules unit-tested with vitest: `lineChartGeometry.ts` (scales, path,
  label selection, nearest-point hit) and the session-table view-model mappers.
- Existing controller/hook tests must stay green (no controller changes expected).
- `npm run typecheck` clean.
- Manual verification in the running app: both evolution screens, weight screen
  (chart regression), active-session series list, dark + light themes, 1-session
  and many-session datasets.

## Dependencies

- `react-native-svg`, installed with `npx expo install react-native-svg`
  (Expo SDK 54-compatible version). No other new dependencies.

## Non-goals

- No changes to use cases, repositories, or SQL.
- No overview/"progress hub" sections, records timeline, or per-set history
  drill-downs.
- No changes to the série registration form (carousels etc.).
