# Evolução UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the evolution screens (`TreinoEvolucaoScreen`, `HistoricoExercicioScreen`) around a new SVG `LineChart`, a shared scannable session-series table, and light polish of the active-session series list.

**Architecture:** Pure geometry/view-model logic lives in unit-tested TS modules (`lineChartGeometry.ts`, `sessionSeriesTableModel.ts`); components (`LineChart`, `Sparkline`, `SessionSeriesTable`) are thin renderers over them. Screens only adapt their existing data to those modules — no domain/application/infrastructure changes.

**Tech Stack:** React Native (Expo SDK 54), `react-native-svg` (new dep), TypeScript, vitest.

**Spec:** `docs/superpowers/specs/2026-07-03-evolucao-ui-redesign-design.md`

## Global Constraints

- No changes to domain/application/infrastructure layers, except zero-behavior reuse of `calcularEstimativa1rm` (already exists in `apps/mobile/src/shared/utils/estimativa1rm.ts`; formula `cargaKg * (1 + repeticoes / 30)`).
- `LineChart` public API stays backward compatible: `points: {value: number; label: string}[]`, `color?`, `height? = 130`, `formatValue?`. New optional props only: `markMax?: boolean` (default false), `showArea?: boolean` (default true). Consumers that must keep compiling unchanged: `PesoScreen.tsx`, `PerfilScreen.tsx`, `DashboardScreen.tsx`.
- All colors from `useTheme()` tokens (`apps/mobile/src/ui/shared/theme.ts`, interface `Colors`) or the `color` prop. No hard-coded hex except existing patterns like `#fff` on solid accent backgrounds.
- New user-facing copy in pt-BR **with accents** ("séries", "sessões", "Execuções").
- Numbers displayed with pt-BR decimal comma in new code (`82,5`), tabular figures (`fontVariant: ['tabular-nums']`) wherever sets/dates/loads align.
- Install `react-native-svg` only via `npx expo install react-native-svg` (never hand-pick a version).
- All commands run from `apps/mobile` unless stated otherwise. Test: `npx vitest run <file>`; full suite: `npm run test`; types: `npm run typecheck`.
- Commit messages in Portuguese, conventional-commit style, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- The repo has unrelated uncommitted changes — `git add` only the files each task names, never `git add -A`.

---

### Task 1: Chart geometry module (pure, TDD)

**Files:**
- Create: `apps/mobile/src/ui/shared/lineChartGeometry.ts`
- Test: `apps/mobile/src/ui/shared/lineChartGeometry.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (used by Tasks 2):
  - `CHART_PAD_V: number` (= 18)
  - `interface ChartPoint { value: number; label: string }`
  - `interface DotGeometry { x: number; y: number }`
  - `interface ChartGeometry { linePath: string; areaPath: string; dots: DotGeometry[]; gridYs: number[]; yLabels: { text: string; y: number }[]; xLabels: { text: string; x: number }[]; maxIndex: number }`
  - `buildChartGeometry(points: ChartPoint[], width: number, height: number, formatValue: (v: number) => string): ChartGeometry | null` — returns `null` when `points.length < 2`.
  - `buildSmoothPath(dots: DotGeometry[]): string`
  - `selectXLabelIndexes(points: ChartPoint[]): number[]`
  - `lastMaxIndex(vals: number[]): number`
  - `nearestDotIndex(dots: { x: number }[], x: number): number`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/ui/shared/lineChartGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  CHART_PAD_V,
  buildChartGeometry,
  buildSmoothPath,
  lastMaxIndex,
  nearestDotIndex,
  selectXLabelIndexes,
} from './lineChartGeometry';

const fmt = (v: number) => `${v} kg`;

describe('buildChartGeometry', () => {
  it('retorna null com menos de 2 pontos', () => {
    expect(buildChartGeometry([], 300, 130, fmt)).toBeNull();
    expect(buildChartGeometry([{ value: 80, label: '01/06' }], 300, 130, fmt)).toBeNull();
  });

  it('posiciona pontos: menor valor embaixo, maior em cima, x distribuido', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 100, label: 'b' }],
      300, 130, fmt,
    )!;
    const plotH = 130 - CHART_PAD_V * 2;
    expect(geo.dots).toHaveLength(2);
    expect(geo.dots[0].x).toBe(0);
    expect(geo.dots[1].x).toBe(300);
    expect(geo.dots[0].y).toBeCloseTo(CHART_PAD_V + plotH); // min -> bottom
    expect(geo.dots[1].y).toBeCloseTo(CHART_PAD_V);          // max -> top
  });

  it('gera labels Y min/mid/max formatados', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 100, label: 'b' }],
      300, 130, fmt,
    )!;
    expect(geo.yLabels.map((l) => l.text)).toEqual(['100 kg', '90 kg', '80 kg']);
  });

  it('gera um unico label Y quando todos os valores sao iguais', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 80, label: 'b' }],
      300, 130, fmt,
    )!;
    expect(geo.yLabels).toHaveLength(1);
    expect(geo.yLabels[0].text).toBe('80 kg');
  });

  it('areaPath fecha o caminho ate a base (termina em Z)', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 100, label: 'b' }],
      300, 130, fmt,
    )!;
    expect(geo.areaPath.startsWith('M')).toBe(true);
    expect(geo.areaPath.trim().endsWith('Z')).toBe(true);
  });

  it('gridYs tem 3 linhas dentro da area de plot', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 100, label: 'b' }],
      300, 130, fmt,
    )!;
    expect(geo.gridYs).toHaveLength(3);
    for (const y of geo.gridYs) {
      expect(y).toBeGreaterThanOrEqual(CHART_PAD_V);
      expect(y).toBeLessThanOrEqual(130 - CHART_PAD_V);
    }
  });

  it('maxIndex aponta para o ponto de maior valor (mais recente em empate)', () => {
    const geo = buildChartGeometry(
      [{ value: 100, label: 'a' }, { value: 90, label: 'b' }, { value: 100, label: 'c' }],
      300, 130, fmt,
    )!;
    expect(geo.maxIndex).toBe(2);
  });
});

describe('selectXLabelIndexes', () => {
  const pts = (n: number) => Array.from({ length: n }, (_, i) => ({ value: i, label: `p${i}` }));

  it('ate 5 pontos: todos os indices', () => {
    expect(selectXLabelIndexes(pts(3))).toEqual([0, 1, 2]);
    expect(selectXLabelIndexes(pts(5))).toEqual([0, 1, 2, 3, 4]);
  });

  it('mais de 5 pontos: primeiro, meio e ultimo', () => {
    expect(selectXLabelIndexes(pts(6))).toEqual([0, 2, 5]);
    expect(selectXLabelIndexes(pts(10))).toEqual([0, 4, 9]);
  });
});

describe('lastMaxIndex', () => {
  it('retorna o indice do maior valor', () => {
    expect(lastMaxIndex([1, 5, 3])).toBe(1);
  });
  it('em empate retorna o mais recente (maior indice)', () => {
    expect(lastMaxIndex([5, 3, 5])).toBe(2);
  });
});

describe('nearestDotIndex', () => {
  const dots = [{ x: 0 }, { x: 100 }, { x: 200 }];
  it('retorna o ponto mais proximo do x informado', () => {
    expect(nearestDotIndex(dots, 10)).toBe(0);
    expect(nearestDotIndex(dots, 140)).toBe(1);
    expect(nearestDotIndex(dots, 199)).toBe(2);
  });
});

describe('buildSmoothPath', () => {
  it('comeca com M no primeiro ponto e tem um comando C por segmento', () => {
    const d = buildSmoothPath([{ x: 0, y: 100 }, { x: 100, y: 50 }, { x: 200, y: 80 }]);
    expect(d.startsWith('M 0 100')).toBe(true);
    expect(d.match(/C /g)).toHaveLength(2);
  });

  it('termina exatamente no ultimo ponto', () => {
    const d = buildSmoothPath([{ x: 0, y: 100 }, { x: 100, y: 50 }]);
    expect(d.trim().endsWith('100 50')).toBe(true);
  });

  it('nao ultrapassa os limites Y de cada segmento (sem overshoot)', () => {
    // dados estritamente decrescentes em y (subida no grafico)
    const d = buildSmoothPath([{ x: 0, y: 90 }, { x: 100, y: 60 }, { x: 200, y: 30 }]);
    // extrai todos os numeros dos comandos C: [c1x, c1y, c2x, c2y, x, y] por segmento
    const nums = d
      .split('C ')
      .slice(1)
      .map((seg) => seg.replace(/,/g, '').trim().split(/\s+/).map(Number));
    // segmento 1: y entre 60 e 90; segmento 2: y entre 30 e 60
    const [s1, s2] = nums;
    expect(s1[1]).toBeGreaterThanOrEqual(60);
    expect(s1[1]).toBeLessThanOrEqual(90);
    expect(s1[3]).toBeGreaterThanOrEqual(60);
    expect(s1[3]).toBeLessThanOrEqual(90);
    expect(s2[1]).toBeGreaterThanOrEqual(30);
    expect(s2[1]).toBeLessThanOrEqual(60);
    expect(s2[3]).toBeGreaterThanOrEqual(30);
    expect(s2[3]).toBeLessThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/mobile`): `npx vitest run src/ui/shared/lineChartGeometry.test.ts`
Expected: FAIL — cannot resolve `./lineChartGeometry`.

- [ ] **Step 3: Write the implementation**

Create `apps/mobile/src/ui/shared/lineChartGeometry.ts`:

```ts
/** Pure geometry for LineChart/Sparkline — no React, unit-testable. */

export const CHART_PAD_V = 18;

export interface ChartPoint {
  value: number;
  label: string;
}

export interface DotGeometry {
  x: number;
  y: number;
}

export interface ChartGeometry {
  linePath: string;
  areaPath: string;
  dots: DotGeometry[];
  gridYs: number[];
  yLabels: { text: string; y: number }[];
  xLabels: { text: string; x: number }[];
  maxIndex: number;
}

export function buildChartGeometry(
  points: ChartPoint[],
  width: number,
  height: number,
  formatValue: (v: number) => string,
): ChartGeometry | null {
  if (points.length < 2) return null;

  const plotH = height - CHART_PAD_V * 2;
  const vals = points.map((p) => p.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV === minV ? 1 : maxV - minV;

  const getX = (i: number) => (i / (points.length - 1)) * width;
  const getY = (v: number) => CHART_PAD_V + (1 - (v - minV) / range) * plotH;

  const dots = points.map((p, i) => ({ x: getX(i), y: getY(p.value) }));

  const linePath = buildSmoothPath(dots);
  const last = dots[dots.length - 1];
  const areaPath = `${linePath} L ${round(last.x)} ${height} L ${round(dots[0].x)} ${height} Z`;

  const gridYs = [0, 0.5, 1].map((t) => CHART_PAD_V + (1 - t) * plotH);

  const yLabels = minV === maxV
    ? [{ text: formatValue(maxV), y: getY(maxV) }]
    : [
        { text: formatValue(maxV), y: CHART_PAD_V },
        { text: formatValue((minV + maxV) / 2), y: CHART_PAD_V + plotH / 2 },
        { text: formatValue(minV), y: CHART_PAD_V + plotH },
      ];

  const xLabels = selectXLabelIndexes(points).map((i) => ({ text: points[i].label, x: getX(i) }));

  return { linePath, areaPath, dots, gridYs, yLabels, xLabels, maxIndex: lastMaxIndex(vals) };
}

export function selectXLabelIndexes(points: ChartPoint[]): number[] {
  if (points.length <= 5) return points.map((_, i) => i);
  return [0, Math.floor((points.length - 1) / 2), points.length - 1];
}

export function lastMaxIndex(vals: number[]): number {
  let idx = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] >= vals[idx]) idx = i;
  }
  return idx;
}

export function nearestDotIndex(dots: { x: number }[], x: number): number {
  let best = 0;
  for (let i = 1; i < dots.length; i++) {
    if (Math.abs(dots[i].x - x) < Math.abs(dots[best].x - x)) best = i;
  }
  return best;
}

/**
 * Catmull-Rom → cubic bezier com clamp vertical dos pontos de controle ao
 * intervalo de cada segmento, evitando overshoot em dados monotônicos.
 */
export function buildSmoothPath(dots: DotGeometry[]): string {
  if (dots.length === 0) return '';
  if (dots.length === 1) return `M ${round(dots[0].x)} ${round(dots[0].y)}`;

  let d = `M ${round(dots[0].x)} ${round(dots[0].y)}`;
  for (let i = 0; i < dots.length - 1; i++) {
    const p0 = dots[i - 1] ?? dots[i];
    const p1 = dots[i];
    const p2 = dots[i + 1];
    const p3 = dots[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const yMin = Math.min(p1.y, p2.y);
    const yMax = Math.max(p1.y, p2.y);
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6, yMin, yMax);
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6, yMin, yMax);

    d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(v, hi));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `apps/mobile`): `npx vitest run src/ui/shared/lineChartGeometry.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Typecheck and commit**

Run (from `apps/mobile`): `npm run typecheck` — expected: no errors.

```bash
git add apps/mobile/src/ui/shared/lineChartGeometry.ts apps/mobile/src/ui/shared/lineChartGeometry.test.ts
git commit -m "feat(mobile): adiciona geometria pura do grafico (lineChartGeometry)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Install react-native-svg; rewrite LineChart; add Sparkline

**Files:**
- Modify: `apps/mobile/package.json` (via `npx expo install`)
- Rewrite: `apps/mobile/src/ui/shared/LineChart.tsx`
- Create: `apps/mobile/src/ui/shared/Sparkline.tsx`

**Interfaces:**
- Consumes (Task 1): `buildChartGeometry`, `buildSmoothPath`, `nearestDotIndex`, `clamp` from `./lineChartGeometry`.
- Produces:
  - `LineChart` (same import path/name) with props `{ points: LineChartPoint[]; color?: string; height?: number; formatValue?: (v: number) => string; markMax?: boolean; showArea?: boolean }`; renders `null` for 0 points; renders a centered single-dot state for 1 point; tap shows/clears a value bubble.
  - `export interface LineChartPoint { value: number; label: string }` (unchanged — imported elsewhere).
  - `Sparkline` from `apps/mobile/src/ui/shared/Sparkline.tsx`: `{ values: number[]; width?: number /*64*/; height?: number /*28*/; color?: string }`; renders `null` when `values.length < 2`.

- [ ] **Step 1: Install the dependency**

Run (from `apps/mobile`): `npx expo install react-native-svg`
Expected: `package.json` gains a `react-native-svg` entry with the SDK 54-compatible version (chosen by expo — do not edit by hand).

- [ ] **Step 2: Rewrite `LineChart.tsx`**

Replace the entire content of `apps/mobile/src/ui/shared/LineChart.tsx` with:

```tsx
import { useId, useMemo, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { buildChartGeometry, clamp, nearestDotIndex } from './lineChartGeometry';
import { useTheme } from './theme';

export interface LineChartPoint {
  value: number;
  label: string;
}

interface LineChartProps {
  points: LineChartPoint[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
  markMax?: boolean;
  showArea?: boolean;
}

const X_AXIS_H = 18;
const X_LABEL_W = 48;
const TOOLTIP_W = 128;

const defaultFormat = (v: number) => (v % 1 === 0 ? String(v) : v.toFixed(1));

export function LineChart({
  points,
  color,
  height = 130,
  formatValue,
  markMax = false,
  showArea = true,
}: LineChartProps) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<number | null>(null);
  const rawId = useId();
  const gradId = useMemo(() => `lcgrad${rawId.replace(/[^a-zA-Z0-9]/g, '')}`, [rawId]);

  const chartWidth = width - 80;
  const lineColor = color ?? c.accent;
  const fmt = formatValue ?? defaultFormat;

  if (points.length === 0) return null;

  // Estado de ponto único: mostra o valor em destaque em vez de esconder o grafico.
  if (points.length === 1) {
    return (
      <View style={[styles.singleWrap, { width: chartWidth, height: height + X_AXIS_H }]}>
        <Text style={[styles.singleValue, { color: c.textPrimary }]}>{fmt(points[0].value)}</Text>
        <View style={[styles.singleDot, { backgroundColor: lineColor, borderColor: c.card }]} />
        <Text style={[styles.singleLabel, { color: c.textSecondary }]}>{points[0].label}</Text>
      </View>
    );
  }

  const geo = buildChartGeometry(points, chartWidth, height, fmt);
  if (!geo) return null;

  const handlePress = (e: GestureResponderEvent) => {
    const idx = nearestDotIndex(geo.dots, e.nativeEvent.locationX);
    setSelected((cur) => (cur === idx ? null : idx));
  };

  const maxDot = geo.dots[geo.maxIndex];
  const selectedDot = selected != null ? geo.dots[selected] : null;

  return (
    <View style={{ width: chartWidth }}>
      <Pressable onPress={handlePress}>
        <Svg width={chartWidth} height={height}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity={0.22} />
              <Stop offset="1" stopColor={lineColor} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {geo.gridYs.map((y) => (
            <Path
              key={y}
              d={`M 0 ${y} L ${chartWidth} ${y}`}
              stroke={c.cardBorder}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {showArea ? <Path d={geo.areaPath} fill={`url(#${gradId})`} /> : null}
          <Path d={geo.linePath} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />

          {geo.dots.map((d, i) => {
            const isLast = i === geo.dots.length - 1;
            return (
              <Circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={isLast ? 5.5 : 3.5}
                fill={lineColor}
                stroke={c.card}
                strokeWidth={isLast ? 2 : 0}
              />
            );
          })}

          {selectedDot ? (
            <Circle cx={selectedDot.x} cy={selectedDot.y} r={7.5} fill="none" stroke={lineColor} strokeWidth={2} />
          ) : null}
        </Svg>

        {geo.yLabels.map((l) => (
          <View key={`${l.text}-${l.y}`} pointerEvents="none" style={[styles.yLabel, { top: l.y - 7 }]}>
            <Text style={[styles.yLabelText, { color: c.textSecondary, backgroundColor: c.card }]}>{l.text}</Text>
          </View>
        ))}

        {markMax ? (
          <View
            pointerEvents="none"
            style={[
              styles.prBadge,
              {
                backgroundColor: c.success,
                left: clamp(maxDot.x - 13, 0, chartWidth - 26),
                top: Math.max(0, maxDot.y - 26),
              },
            ]}
          >
            <Text style={styles.prBadgeText}>PR</Text>
          </View>
        ) : null}

        {selectedDot && selected != null ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                backgroundColor: c.hero,
                left: clamp(selectedDot.x - TOOLTIP_W / 2, 0, chartWidth - TOOLTIP_W),
                top: Math.max(0, selectedDot.y - 42),
              },
            ]}
          >
            <Text style={[styles.tooltipText, { color: c.heroText }]} numberOfLines={1}>
              {fmt(points[selected].value)} · {points[selected].label}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <View style={{ height: X_AXIS_H }}>
        {geo.xLabels.map((l) => (
          <Text
            key={`${l.text}-${l.x}`}
            numberOfLines={1}
            style={[
              styles.xLabelText,
              { color: c.textSecondary, left: clamp(l.x - X_LABEL_W / 2, 0, chartWidth - X_LABEL_W) },
            ]}
          >
            {l.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yLabel: { position: 'absolute', right: 0 },
  yLabelText: { fontSize: 10, fontWeight: '600', paddingHorizontal: 2, fontVariant: ['tabular-nums'] },
  xLabelText: {
    position: 'absolute',
    top: 2,
    width: X_LABEL_W,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  prBadge: { position: 'absolute', width: 26, borderRadius: 7, paddingVertical: 1, alignItems: 'center' },
  prBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_W,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tooltipText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  singleWrap: { alignItems: 'center', justifyContent: 'center' },
  singleValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  singleDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, marginVertical: 8 },
  singleLabel: { fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 3: Create `Sparkline.tsx`**

Create `apps/mobile/src/ui/shared/Sparkline.tsx`:

```tsx
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { buildSmoothPath } from './lineChartGeometry';
import { useTheme } from './theme';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

const PAD = 4;

/** Mini-grafico sem eixos para o estado colapsado dos cards de evolucao. */
export function Sparkline({ values, width = 64, height = 28, color }: SparklineProps) {
  const c = useTheme();
  if (values.length < 2) return null;

  const lineColor = color ?? c.accent;
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV === minV ? 1 : maxV - minV;

  const dots = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (width - PAD * 2),
    y: PAD + (1 - (v - minV) / range) * (height - PAD * 2),
  }));
  const last = dots[dots.length - 1];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path d={buildSmoothPath(dots)} stroke={lineColor} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Circle cx={last.x} cy={last.y} r={3} fill={lineColor} />
      </Svg>
    </View>
  );
}
```

- [ ] **Step 4: Verify types and tests**

Run (from `apps/mobile`): `npm run typecheck` — expected: no errors (all 5 LineChart consumers still compile).
Run (from `apps/mobile`): `npm run test` — expected: PASS (no existing test renders LineChart; suite must stay green).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/src/ui/shared/LineChart.tsx apps/mobile/src/ui/shared/Sparkline.tsx
git commit -m "feat(mobile): reescreve LineChart em SVG (tooltip, PR, ponto unico) e adiciona Sparkline

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Note: `npx expo install` may also touch the root lockfile (`package-lock.json`); if `git status` shows it changed, include it in the `git add`.

---

### Task 3: Session table view-model (TDD) + SessionSeriesTable component

**Files:**
- Create: `apps/mobile/src/ui/shared/components/sessionSeriesTableModel.ts`
- Create: `apps/mobile/src/ui/shared/components/SessionSeriesTable.tsx`
- Test: `apps/mobile/src/ui/shared/components/sessionSeriesTableModel.test.ts`

**Interfaces:**
- Consumes: `calcularEstimativa1rm(cargaKg, repeticoes)` from `apps/mobile/src/shared/utils/estimativa1rm.ts` (import path from this folder: `../../../shared/utils/estimativa1rm`).
- Produces (used by Tasks 4, 5, 6):
  - `formatCarga(kg: number): string` — `80 → "80"`, `82.5 → "82,5"`.
  - `formatVolume(kg: number): string` — `960 → "960 kg"`, `2400 → "2,4 t"`.
  - `formatKgDelta(first: number, last: number): { direction: 'up' | 'down' | 'flat'; label: string }` — `"↑ +4 kg"` / `"↓ −2,5 kg"` / `"→ estável"`.
  - `interface SessionTableInputSet { cargaKg: number; repeticoes: number; muted?: boolean }`
  - `interface SessionTableInputSession { id: string; dateLabel: string; subLabel?: string | null; sets: SessionTableInputSet[] }`
  - `interface SessionTableSetVM { label: string; isBest: boolean; muted: boolean }`
  - `interface SessionTableRowVM { id: string; dateLabel: string; subLabel: string | null; sets: SessionTableSetVM[]; ormLabel: string | null; volumeLabel: string | null; trend: 'up' | 'down' | null; isLatest: boolean }`
  - `buildSessionTableRows(sessions: SessionTableInputSession[]): SessionTableRowVM[]` — input **newest first**.
  - Component `SessionSeriesTable({ rows, showVolume = false }: { rows: SessionTableRowVM[]; showVolume?: boolean })`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/ui/shared/components/sessionSeriesTableModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  buildSessionTableRows,
  formatCarga,
  formatKgDelta,
  formatVolume,
} from './sessionSeriesTableModel';

const sessao = (id: string, sets: { cargaKg: number; repeticoes: number; muted?: boolean }[]) => ({
  id,
  dateLabel: '28/06',
  sets,
});

describe('formatCarga', () => {
  it('inteiro sem casas decimais', () => {
    expect(formatCarga(80)).toBe('80');
  });
  it('decimal com virgula pt-BR', () => {
    expect(formatCarga(82.5)).toBe('82,5');
  });
});

describe('formatVolume', () => {
  it('abaixo de 1000 kg mostra em kg', () => {
    expect(formatVolume(960)).toBe('960 kg');
  });
  it('a partir de 1000 kg mostra em toneladas com virgula', () => {
    expect(formatVolume(2400)).toBe('2,4 t');
  });
});

describe('formatKgDelta', () => {
  it('melhora: seta para cima com +', () => {
    expect(formatKgDelta(96, 100)).toEqual({ direction: 'up', label: '↑ +4 kg' });
  });
  it('piora: seta para baixo', () => {
    expect(formatKgDelta(100, 97.5)).toEqual({ direction: 'down', label: '↓ −2,5 kg' });
  });
  it('estavel: sem variacao', () => {
    expect(formatKgDelta(100, 100)).toEqual({ direction: 'flat', label: '→ estável' });
  });
});

describe('buildSessionTableRows', () => {
  it('formata cada set individualmente como carga×reps', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }, { cargaKg: 82.5, repeticoes: 8 }]),
    ]);
    expect(rows[0].sets.map((s) => s.label)).toEqual(['80×10', '82,5×8']);
  });

  it('marca como melhor apenas o set de maior 1RM estimado (uma unica marcacao)', () => {
    // 80×10 -> 1RM 106.7 ; 82.5×8 -> 1RM 104.5
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }, { cargaKg: 82.5, repeticoes: 8 }]),
    ]);
    expect(rows[0].sets.map((s) => s.isBest)).toEqual([true, false]);
  });

  it('em empate de 1RM marca apenas o primeiro', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }, { cargaKg: 80, repeticoes: 10 }]),
    ]);
    expect(rows[0].sets.map((s) => s.isBest)).toEqual([true, false]);
  });

  it('nao marca melhor set quando ha apenas um set valido', () => {
    const rows = buildSessionTableRows([sessao('s1', [{ cargaKg: 80, repeticoes: 10 }])]);
    expect(rows[0].sets[0].isBest).toBe(false);
  });

  it('calcula ormLabel a partir do melhor set valido', () => {
    // 80×10 -> 80 * (1 + 10/30) = 106.666... -> 106,7
    const rows = buildSessionTableRows([sessao('s1', [{ cargaKg: 80, repeticoes: 10 }])]);
    expect(rows[0].ormLabel).toBe('1RM ~106,7');
  });

  it('sets muted (aquecimento) nao contam para melhor/1RM/volume e mantem a flag', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [
        { cargaKg: 100, repeticoes: 15, muted: true }, // 1RM maior, mas aquecimento
        { cargaKg: 80, repeticoes: 10 },
      ]),
    ]);
    expect(rows[0].sets[0].muted).toBe(true);
    expect(rows[0].sets[0].isBest).toBe(false);
    expect(rows[0].ormLabel).toBe('1RM ~106,7');
    expect(rows[0].volumeLabel).toBe('800 kg');
  });

  it('ormLabel/volumeLabel nulos quando nao ha sets validos', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 40, repeticoes: 15, muted: true }]),
      sessao('s2', []),
    ]);
    expect(rows[0].ormLabel).toBeNull();
    expect(rows[0].volumeLabel).toBeNull();
    expect(rows[1].ormLabel).toBeNull();
  });

  it('trend compara com a sessao anterior (mais antiga, proxima na lista)', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 85, repeticoes: 10 }]), // mais recente, melhorou
      sessao('s2', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s3', [{ cargaKg: 82.5, repeticoes: 10 }]), // s2 piorou vs s3
    ]);
    expect(rows[0].trend).toBe('up');
    expect(rows[1].trend).toBe('down');
    expect(rows[2].trend).toBeNull(); // sem anterior
  });

  it('trend nulo quando igual ou sem dados', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s2', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s3', []),
    ]);
    expect(rows[0].trend).toBeNull(); // igual
    expect(rows[1].trend).toBeNull(); // anterior sem dados
  });

  it('marca apenas a primeira sessao como isLatest', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s2', [{ cargaKg: 80, repeticoes: 10 }]),
    ]);
    expect(rows.map((r) => r.isLatest)).toEqual([true, false]);
  });

  it('propaga subLabel quando presente', () => {
    const rows = buildSessionTableRows([
      { id: 's1', dateLabel: '28/06', subLabel: 'Substituiu: Supino reto', sets: [] },
    ]);
    expect(rows[0].subLabel).toBe('Substituiu: Supino reto');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/mobile`): `npx vitest run src/ui/shared/components/sessionSeriesTableModel.test.ts`
Expected: FAIL — cannot resolve `./sessionSeriesTableModel`.

- [ ] **Step 3: Write the model implementation**

Create `apps/mobile/src/ui/shared/components/sessionSeriesTableModel.ts`:

```ts
import { calcularEstimativa1rm } from '../../../shared/utils/estimativa1rm';

export interface SessionTableInputSet {
  cargaKg: number;
  repeticoes: number;
  /** Ex.: aquecimento — exibido esmaecido e fora de melhor set/1RM/volume. */
  muted?: boolean;
}

export interface SessionTableInputSession {
  id: string;
  dateLabel: string;
  subLabel?: string | null;
  sets: SessionTableInputSet[];
}

export interface SessionTableSetVM {
  label: string;
  isBest: boolean;
  muted: boolean;
}

export interface SessionTableRowVM {
  id: string;
  dateLabel: string;
  subLabel: string | null;
  sets: SessionTableSetVM[];
  ormLabel: string | null;
  volumeLabel: string | null;
  trend: 'up' | 'down' | null;
  isLatest: boolean;
}

export function formatCarga(kg: number): string {
  return (kg % 1 === 0 ? String(kg) : kg.toFixed(1)).replace('.', ',');
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace('.', ',')} t`;
  return `${formatCarga(kg)} kg`;
}

export function formatKgDelta(
  first: number,
  last: number,
): { direction: 'up' | 'down' | 'flat'; label: string } {
  const diff = Math.round((last - first) * 10) / 10;
  if (diff > 0) return { direction: 'up', label: `↑ +${formatCarga(diff)} kg` };
  if (diff < 0) return { direction: 'down', label: `↓ −${formatCarga(Math.abs(diff))} kg` };
  return { direction: 'flat', label: '→ estável' };
}

/** Sessoes em ordem: mais recente primeiro. `trend` compara com a proxima da lista (mais antiga). */
export function buildSessionTableRows(sessions: SessionTableInputSession[]): SessionTableRowVM[] {
  const bestOrms = sessions.map((s) =>
    s.sets
      .filter((x) => !x.muted)
      .reduce((max, x) => Math.max(max, calcularEstimativa1rm(x.cargaKg, x.repeticoes)), 0),
  );

  return sessions.map((s, i) => {
    const valid = s.sets.filter((x) => !x.muted);
    const best = bestOrms[i];

    let bestMarked = false;
    const sets = s.sets.map((x) => {
      const isBest =
        !x.muted &&
        valid.length > 1 &&
        !bestMarked &&
        calcularEstimativa1rm(x.cargaKg, x.repeticoes) === best;
      if (isBest) bestMarked = true;
      return {
        label: `${formatCarga(x.cargaKg)}×${x.repeticoes}`,
        isBest,
        muted: x.muted ?? false,
      };
    });

    const volume = valid.reduce((acc, x) => acc + x.cargaKg * x.repeticoes, 0);
    const prevBest = bestOrms[i + 1];
    const trend =
      prevBest == null || prevBest === 0 || best === 0
        ? null
        : best > prevBest ? 'up' : best < prevBest ? 'down' : null;

    return {
      id: s.id,
      dateLabel: s.dateLabel,
      subLabel: s.subLabel ?? null,
      sets,
      ormLabel: best > 0 ? `1RM ~${formatCarga(Math.round(best * 10) / 10)}` : null,
      volumeLabel: valid.length > 0 ? formatVolume(volume) : null,
      trend,
      isLatest: i === 0,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `apps/mobile`): `npx vitest run src/ui/shared/components/sessionSeriesTableModel.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the component**

Create `apps/mobile/src/ui/shared/components/SessionSeriesTable.tsx`:

```tsx
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SessionTableRowVM } from './sessionSeriesTableModel';
import { useTheme } from '../theme';

interface Props {
  rows: SessionTableRowVM[];
  showVolume?: boolean;
}

/** Tabela compacta de sessoes: data, sets individuais, volume/1RM com tendencia. */
export function SessionSeriesTable({ rows, showVolume = false }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.id} style={[styles.row, row.isLatest ? styles.rowLatest : null]}>
          <View style={styles.topLine}>
            <Text style={styles.date}>{row.dateLabel}</Text>
            <View style={styles.rightCol}>
              {showVolume && row.volumeLabel ? <Text style={styles.volume}>{row.volumeLabel}</Text> : null}
              {row.ormLabel ? (
                <Text style={styles.orm}>
                  {row.ormLabel}
                  {row.trend === 'up' ? <Text style={styles.trendUp}> ↑</Text> : null}
                  {row.trend === 'down' ? <Text style={styles.trendDown}> ↓</Text> : null}
                </Text>
              ) : null}
            </View>
          </View>
          {row.subLabel ? <Text style={styles.subLabel}>{row.subLabel}</Text> : null}
          {row.sets.length > 0 ? (
            <View style={styles.setsRow}>
              {row.sets.map((s, i) => (
                <Text
                  key={i}
                  style={[styles.set, s.muted ? styles.setMuted : null, s.isBest ? styles.setBest : null]}
                >
                  {s.label}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.semSeries}>Sem séries válidas</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    list: { gap: 8 },
    row: { backgroundColor: c.cardAlt, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 6 },
    rowLatest: { borderLeftWidth: 3, borderLeftColor: c.accent },
    topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    date: { color: c.textLabel, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
    rightCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    volume: { color: c.textSecondary, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
    orm: { color: c.accent, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
    trendUp: { color: c.success, fontSize: 12, fontWeight: '800' },
    trendDown: { color: c.error, fontSize: 12, fontWeight: '800' },
    subLabel: { color: c.accent, fontSize: 11, fontWeight: '600' },
    setsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, rowGap: 4 },
    set: { color: c.textPrimary, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'], minWidth: 52 },
    setMuted: { color: c.textSecondary, fontWeight: '500' },
    setBest: { color: c.accent, fontWeight: '800' },
    semSeries: { color: c.textSecondary, fontSize: 12 },
  });
}
```

- [ ] **Step 6: Typecheck and commit**

Run (from `apps/mobile`): `npm run typecheck` — expected: no errors.

```bash
git add apps/mobile/src/ui/shared/components/sessionSeriesTableModel.ts apps/mobile/src/ui/shared/components/sessionSeriesTableModel.test.ts apps/mobile/src/ui/shared/components/SessionSeriesTable.tsx
git commit -m "feat(mobile): adiciona SessionSeriesTable compartilhada com view-model testado

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: TreinoEvolucaoScreen redesign

**Files:**
- Rewrite: `apps/mobile/src/ui/dashboard/screens/TreinoEvolucaoScreen.tsx`

**Interfaces:**
- Consumes: `LineChart` (`markMax` prop, Task 2), `Sparkline` (Task 2), `SessionSeriesTable` + `buildSessionTableRows` + `formatCarga` + `formatKgDelta` (Task 3), types `ExercicioEvolucao`/`SessaoExercicioEvolucao` (existing; `sessoes` is **newest first**, each with `melhorOrm: number` and `series: { cargaKg: number; repeticoes: number }[]`).
- Produces: same exported component `TreinoEvolucaoScreen` with unchanged `Props` (screen-only change).

- [ ] **Step 1: Replace the file content**

Replace the entire content of `apps/mobile/src/ui/dashboard/screens/TreinoEvolucaoScreen.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ExercicioEvolucao } from '../../../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';
import { LineChart } from '../../shared/LineChart';
import { Sparkline } from '../../shared/Sparkline';
import { SessionSeriesTable } from '../../shared/components/SessionSeriesTable';
import {
  buildSessionTableRows,
  formatCarga,
  formatKgDelta,
} from '../../shared/components/sessionSeriesTableModel';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useTheme } from '../../shared/theme';

interface Props {
  treinoNome: string;
  exercicios: ExercicioEvolucao[];
  isLoading: boolean;
  errorMessage: string | null;
  onBack: () => void;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function TreinoEvolucaoScreen({ treinoNome, exercicios, isLoading, errorMessage, onBack }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
        >
          <Text style={styles.backButtonText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Evolução por exercício</Text>
        <Text style={styles.title}>{treinoNome}</Text>
        <Text style={styles.description}>
          Toque em um exercício para ver gráficos e séries das últimas 10 sessões.
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator size="large" color={c.accent} style={styles.loader} />
      ) : exercicios.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Nenhuma sessão finalizada encontrada para este treino.
          </Text>
        </View>
      ) : (
        exercicios.map((ex) => (
          <ExercicioEvolucaoCard key={ex.exercicioId} exercicio={ex} />
        ))
      )}
    </ScrollView>
  );
}

function ExercicioEvolucaoCard({ exercicio }: { exercicio: ExercicioEvolucao }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [expanded, setExpanded] = useState(false);

  const sessoes = exercicio.sessoes; // mais recente primeiro
  const sessoesAsc = useMemo(() => [...sessoes].reverse(), [sessoes]);

  const ormValues = sessoesAsc.map((s) => s.melhorOrm).filter((v) => v > 0);
  const temDados = ormValues.length > 0;

  const ormChartPoints = sessoesAsc
    .filter((s) => s.melhorOrm > 0)
    .map((s) => ({ value: s.melhorOrm, label: formatShortDate(s.dataHoraInicio) }));

  const volumeChartPoints = sessoesAsc
    .map((s) => ({
      value: s.series.reduce((sum, sr) => sum + (sr.cargaKg ?? 0) * (sr.repeticoes ?? 0), 0),
      label: formatShortDate(s.dataHoraInicio),
    }))
    .filter((p) => p.value > 0);

  const delta = ormValues.length >= 2
    ? formatKgDelta(ormValues[0], ormValues[ormValues.length - 1])
    : null;

  const ultima = sessoes[0];
  const penultima = sessoes[1] ?? null;
  const ormDiff =
    ultima && penultima && penultima.melhorOrm > 0 && ultima.melhorOrm > 0
      ? Math.round((ultima.melhorOrm - penultima.melhorOrm) * 10) / 10
      : null;

  const windowBest = Math.max(0, ...sessoes.map((s) => s.melhorOrm));
  const isPr = sessoes.length >= 2 && ultima != null && ultima.melhorOrm > 0 && ultima.melhorOrm >= windowBest;

  const tableRows = useMemo(
    () =>
      buildSessionTableRows(
        sessoes.map((s) => ({
          id: s.sessaoId,
          dateLabel: formatShortDate(s.dataHoraInicio),
          sets: s.series.map((sr) => ({ cargaKg: sr.cargaKg, repeticoes: sr.repeticoes })),
        })),
      ),
    [sessoes],
  );

  const plural = sessoes.length === 1 ? 'sessão' : 'sessões';

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.cardHeader, pressed ? { opacity: 0.7 } : null]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.exercicioNome}>{exercicio.exercicioNome}</Text>
          <Text style={styles.exercicioMeta}>{exercicio.groupMuscle}</Text>
          {!expanded && !(temDados && ormValues.length >= 2) ? (
            <Text style={styles.collapsedHint}>
              {temDados && ultima
                ? `1RM: ${formatCarga(ultima.melhorOrm)} kg · ${sessoes.length} ${plural}`
                : `${sessoes.length} ${plural}`}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardHeaderRight}>
          {!expanded && ormValues.length >= 2 ? (
            <View style={styles.sparkCol}>
              <Sparkline values={ormValues} />
              {delta ? (
                <Text
                  style={[
                    styles.deltaText,
                    delta.direction === 'up'
                      ? styles.deltaUp
                      : delta.direction === 'down'
                        ? styles.deltaDown
                        : styles.deltaFlat,
                  ]}
                >
                  {delta.label}
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.cardChevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <>
          {ultima && temDados ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryLabelRow}>
                  <Text style={styles.summaryLabel}>Melhor 1RM</Text>
                  {isPr ? (
                    <View style={styles.prTag}>
                      <Text style={styles.prTagText}>PR</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.summaryValue}>{formatCarga(windowBest)} kg</Text>
              </View>
              {ormDiff !== null ? (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>vs anterior</Text>
                  <Text
                    style={[
                      styles.summaryDiff,
                      ormDiff > 0 ? styles.diffUp : ormDiff < 0 ? styles.diffDown : styles.diffEqual,
                    ]}
                  >
                    {ormDiff > 0 ? `+${formatCarga(ormDiff)}` : formatCarga(ormDiff)} kg
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Séries (últ.)</Text>
                <Text style={styles.summaryValue}>{ultima.series.length}</Text>
              </View>
            </View>
          ) : null}

          <ChartToggle ormPoints={ormChartPoints} volumePoints={volumeChartPoints} />

          {tableRows.length > 0 ? <SessionSeriesTable rows={tableRows} /> : null}
        </>
      ) : null}
    </View>
  );
}

type ChartMode = 'orm' | 'volume';

interface ChartToggleProps {
  ormPoints: { value: number; label: string }[];
  volumePoints: { value: number; label: string }[];
}

function ChartToggle({ ormPoints, volumePoints }: ChartToggleProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const hasOrm = ormPoints.length >= 1;
  const hasVolume = volumePoints.length >= 1;
  const [mode, setMode] = useState<ChartMode>(hasOrm ? 'orm' : 'volume');

  if (!hasOrm && !hasVolume) return null;

  const activePoints = mode === 'orm' ? ormPoints : volumePoints;
  const activeColor = mode === 'orm' ? undefined : c.success;
  const activeFormat = mode === 'orm'
    ? (v: number) => `${v} kg`
    : (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`);

  return (
    <View style={styles.chartContainer}>
      {hasOrm && hasVolume ? (
        <View style={styles.segmented}>
          <Pressable
            onPress={() => setMode('orm')}
            style={[styles.segment, mode === 'orm' ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, mode === 'orm' ? styles.segmentTextActive : null]}>
              1RM estimado
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('volume')}
            style={[styles.segment, mode === 'volume' ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, mode === 'volume' ? styles.segmentTextActive : null]}>
              Volume total
            </Text>
          </Pressable>
        </View>
      ) : null}
      <LineChart
        points={activePoints}
        color={activeColor}
        height={110}
        formatValue={activeFormat}
        markMax={mode === 'orm'}
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center' },
    backButton: { paddingVertical: 8, paddingRight: 12 },
    backButtonPressed: { opacity: 0.6 },
    backButtonText: { color: c.accent, fontSize: 15, fontWeight: '700' },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 26, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 14, lineHeight: 20 },
    loader: { marginTop: 40 },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 18, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    errorText: { color: c.error, fontSize: 14, fontWeight: '600' },
    emptyText: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    // Cabecalho do card
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardChevron: { color: c.textSecondary, fontSize: 10, fontWeight: '700' },
    collapsedHint: { color: c.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 3, fontVariant: ['tabular-nums'] },
    exercicioNome: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    exercicioMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    sparkCol: { alignItems: 'flex-end', gap: 2 },
    deltaText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
    deltaUp: { color: c.success },
    deltaDown: { color: c.error },
    deltaFlat: { color: c.textSecondary },
    // Pills de resumo
    summaryRow: { flexDirection: 'row', gap: 10 },
    summaryItem: { flex: 1, backgroundColor: c.cardAlt, borderRadius: 12, padding: 10, alignItems: 'center' },
    summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    summaryLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { color: c.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
    summaryDiff: { fontSize: 15, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
    diffUp: { color: c.success },
    diffDown: { color: c.error },
    diffEqual: { color: c.textSecondary },
    prTag: { backgroundColor: c.success, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
    prTagText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    // Grafico + controle segmentado
    chartContainer: { gap: 10 },
    segmented: { flexDirection: 'row', backgroundColor: c.cardAlt, borderRadius: 10, padding: 3, alignSelf: 'flex-start' },
    segment: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    segmentActive: { backgroundColor: c.hero },
    segmentText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
    segmentTextActive: { color: c.heroText },
  });
}
```

- [ ] **Step 2: Verify types and tests**

Run (from `apps/mobile`): `npm run typecheck` — expected: no errors.
Run (from `apps/mobile`): `npx vitest run src/ui/dashboard` — expected: PASS (controller tests untouched).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/ui/dashboard/screens/TreinoEvolucaoScreen.tsx
git commit -m "refactor(mobile): redesenha TreinoEvolucaoScreen com sparkline e tabela de series

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Historico presenter (TDD) + HistoricoExercicioScreen redesign

**Files:**
- Modify: `apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.ts`
- Modify: `apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.test.ts`
- Rewrite: `apps/mobile/src/ui/historico/screens/HistoricoExercicioScreen.tsx`

**Interfaces:**
- Consumes: `buildSessionTableRows`, `SessionTableRowVM` (Task 3); `SessionSeriesTable` (Task 3); `LineChart` `markMax` (Task 2); `calcularEstimativa1rm` (existing); domain type `ExecucaoExercicio` (`sessaoTreinoId`, `dataExecucao`, `series: { id; tipoSerie: 'valida' | 'aquecimento'; cargaKg; repeticoes; ordem }[]`, `substituiuExercicio?: { nomeOriginal; motivo } | null`) — **newest first**.
- Produces: `HistoricoExercicioViewModel` becomes `{ exercicioNome: string; sessionRows: SessionTableRowVM[]; emptyStateMessage: string | null; rm1ChartPoints: LineChartPoint[]; plateau: PlateauInfo | null }`. The `execucoes` field and the `ExecucaoHistoricoViewModel`/`SerieHistoricoViewModel` types are **removed** (only `HistoricoExercicioScreen` consumed them; controller passes the VM through opaquely).

- [ ] **Step 1: Rewrite the presenter test**

Replace the entire content of `apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import { buildHistoricoExercicioViewModel } from './buildHistoricoExercicioViewModel';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';

const serie = (
  id: string,
  tipo: 'aquecimento' | 'valida',
  cargaKg: number,
  repeticoes: number,
  ordem = 1
) => ({ id, tipoSerie: tipo, cargaKg, repeticoes, observacao: null, ordem });

const execucao = (
  sessaoId: string,
  series: ReturnType<typeof serie>[],
  date = '2026-05-03T10:00:00.000Z'
): ExecucaoExercicio => ({
  sessaoTreinoId: sessaoId,
  dataExecucao: date,
  nomeSnapshot: 'Supino reto',
  series,
});

describe('buildHistoricoExercicioViewModel', () => {
  describe('estado vazio', () => {
    it('retorna mensagem de estado vazio quando nao ha execucoes', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', []);
      expect(vm.emptyStateMessage).not.toBeNull();
      expect(vm.sessionRows).toHaveLength(0);
      expect(vm.exercicioNome).toBe('Supino reto');
    });
  });

  describe('sessionRows', () => {
    it('formata cada set como carga×reps', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 80, 8)]),
      ]);
      expect(vm.sessionRows[0].sets[0].label).toBe('80×8');
    });

    it('calcula ormLabel do melhor set valido (Epley)', () => {
      // 80×8 -> 80 * (1 + 8/30) = 101.33 -> 101,3
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 80, 8)]),
      ]);
      expect(vm.sessionRows[0].ormLabel).toBe('1RM ~101,3');
    });

    it('series de aquecimento ficam muted e fora do 1RM/volume', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [
          serie('sr1', 'aquecimento', 40, 15, 1),
          serie('sr2', 'valida', 80, 8, 2),
        ]),
      ]);
      expect(vm.sessionRows[0].sets[0].muted).toBe(true);
      expect(vm.sessionRows[0].sets[1].muted).toBe(false);
      expect(vm.sessionRows[0].ormLabel).toBe('1RM ~101,3');
      expect(vm.sessionRows[0].volumeLabel).toBe('640 kg');
    });

    it('ordena sets pela ordem registrada', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [
          serie('sr2', 'valida', 85, 6, 2),
          serie('sr1', 'valida', 80, 8, 1),
        ]),
      ]);
      expect(vm.sessionRows[0].sets.map((s) => s.label)).toEqual(['80×8', '85×6']);
    });

    it('ormLabel nulo quando so ha aquecimento', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'aquecimento', 40, 15)]),
      ]);
      expect(vm.sessionRows[0].ormLabel).toBeNull();
    });

    it('gera uma linha por execucao, mais recente primeiro com isLatest', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 85, 8)], '2026-05-04T10:00:00Z'),
        execucao('s2', [serie('sr2', 'valida', 80, 8)], '2026-05-03T10:00:00Z'),
      ]);
      expect(vm.sessionRows).toHaveLength(2);
      expect(vm.sessionRows[0].isLatest).toBe(true);
      expect(vm.sessionRows[1].isLatest).toBe(false);
      expect(vm.sessionRows[0].trend).toBe('up');
    });

    it('propaga label de substituicao', () => {
      const vm = buildHistoricoExercicioViewModel('Supino inclinado', [
        {
          ...execucao('s1', [serie('sr1', 'valida', 80, 8)]),
          substituiuExercicio: { nomeOriginal: 'Supino reto', motivo: 'variacao' },
        },
      ]);
      expect(vm.sessionRows[0].subLabel).toBe('Substituiu: Supino reto · variação');
    });
  });

  describe('rm1ChartPoints', () => {
    it('gera pontos em ordem cronologica com o 1RM da melhor serie valida', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 85, 8)], '2026-05-04T10:00:00Z'),
        execucao('s2', [serie('sr2', 'valida', 80, 8)], '2026-05-03T10:00:00Z'),
      ]);
      // ordem ascendente: s2 (03/05) depois s1 (04/05)
      expect(vm.rm1ChartPoints).toHaveLength(2);
      expect(vm.rm1ChartPoints[0].value).toBeCloseTo(101.3, 1);
      expect(vm.rm1ChartPoints[1].value).toBeCloseTo(107.7, 1);
    });

    it('ignora execucoes sem series validas', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'aquecimento', 40, 15)]),
      ]);
      expect(vm.rm1ChartPoints).toHaveLength(0);
    });
  });

  describe('detectarPlateau', () => {
    function makeEx(sessaoId: string, date: string, series: ReturnType<typeof serie>[]): ExecucaoExercicio {
      return { sessaoTreinoId: sessaoId, dataExecucao: date, nomeSnapshot: 'Supino', series };
    }

    it('retorna null com menos de 4 execucoes com series validas', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'valida', 80, 10)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'valida', 80, 10)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'valida', 80, 10)]),
      ];
      expect(buildHistoricoExercicioViewModel('Supino', execucoes).plateau).toBeNull();
    });

    it('retorna null quando ha melhora >= 1 kg no 1RM entre a mais antiga e qualquer recente', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'valida', 110, 10)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'valida', 90, 10)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'valida', 85, 10)]),
        makeEx('s4', '2026-05-01T10:00:00Z', [serie('sr4', 'valida', 80, 10)]),
      ];
      expect(buildHistoricoExercicioViewModel('Supino', execucoes).plateau).toBeNull();
    });

    it('retorna PlateauInfo quando 1RM maximo nao supera o mais antigo em 1 kg', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'valida', 80, 10)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'valida', 80, 10)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'valida', 80, 10)]),
        makeEx('s4', '2026-05-01T10:00:00Z', [serie('sr4', 'valida', 80, 10)]),
      ];
      const vm = buildHistoricoExercicioViewModel('Supino', execucoes);
      expect(vm.plateau).not.toBeNull();
      expect(vm.plateau!.sessoes).toBe(4);
    });

    it('ignora execucoes sem series validas na contagem', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'valida', 80, 10)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'aquecimento', 40, 15)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'valida', 80, 10)]),
        makeEx('s4', '2026-05-01T10:00:00Z', [serie('sr4', 'valida', 80, 10)]),
      ];
      expect(buildHistoricoExercicioViewModel('Supino', execucoes).plateau).toBeNull();
    });

    it('retorna null quando execucoes tem apenas series de aquecimento', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'aquecimento', 40, 15)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'aquecimento', 40, 15)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'aquecimento', 40, 15)]),
        makeEx('s4', '2026-05-01T10:00:00Z', [serie('sr4', 'aquecimento', 40, 15)]),
      ];
      expect(buildHistoricoExercicioViewModel('Supino', execucoes).plateau).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/mobile`): `npx vitest run src/ui/historico/presenters/buildHistoricoExercicioViewModel.test.ts`
Expected: FAIL — `vm.sessionRows` is undefined (presenter not yet updated).

- [ ] **Step 3: Rewrite the presenter**

Replace the entire content of `apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.ts` with:

```ts
import type { LineChartPoint } from '../../shared/LineChart';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';
import { calcularEstimativa1rm } from '../../../shared/utils/estimativa1rm';
import {
  buildSessionTableRows,
  type SessionTableRowVM,
} from '../../shared/components/sessionSeriesTableModel';

export interface PlateauInfo {
  sessoes: number;
  mensagem: string;
}

export interface HistoricoExercicioViewModel {
  exercicioNome: string;
  sessionRows: SessionTableRowVM[];
  emptyStateMessage: string | null;
  rm1ChartPoints: LineChartPoint[];
  plateau: PlateauInfo | null;
}

const CHART_MAX = 14;
const SESSOES_PLATEAU = 4;
const MELHORA_MINIMA_KG = 1.0;

export function buildHistoricoExercicioViewModel(
  exercicioNome: string,
  execucoes: ExecucaoExercicio[]
): HistoricoExercicioViewModel {
  if (execucoes.length === 0) {
    return {
      exercicioNome,
      sessionRows: [],
      emptyStateMessage: 'Nenhuma execução registrada ainda.',
      rm1ChartPoints: [],
      plateau: null,
    };
  }

  const rm1ChartPoints: LineChartPoint[] = execucoes
    .slice(0, CHART_MAX)
    .reverse()
    .map((ex) => ({
      value: parseFloat(melhorRm1Valido(ex).toFixed(1)),
      label: formatShortDate(ex.dataExecucao),
    }))
    .filter((p) => p.value > 0);

  const sessionRows = buildSessionTableRows(
    execucoes.map((ex, i) => ({
      id: `${ex.sessaoTreinoId}-${i}`,
      dateLabel: formatDate(ex.dataExecucao),
      subLabel: buildSubstituiuLabel(ex),
      sets: [...ex.series]
        .sort((a, b) => a.ordem - b.ordem)
        .map((s) => ({
          cargaKg: s.cargaKg,
          repeticoes: s.repeticoes,
          muted: s.tipoSerie !== 'valida',
        })),
    })),
  );

  return {
    exercicioNome,
    sessionRows,
    emptyStateMessage: null,
    rm1ChartPoints,
    plateau: detectarPlateau(execucoes),
  };
}

function melhorRm1Valido(ex: ExecucaoExercicio): number {
  return ex.series
    .filter((s) => s.tipoSerie === 'valida')
    .reduce((max, s) => Math.max(max, calcularEstimativa1rm(s.cargaKg, s.repeticoes)), 0);
}

function detectarPlateau(execucoes: ExecucaoExercicio[]): PlateauInfo | null {
  const comValidas = execucoes.filter((ex) =>
    ex.series.some((s) => s.tipoSerie === 'valida')
  );

  if (comValidas.length < SESSOES_PLATEAU) return null;

  const ultimas = comValidas.slice(0, SESSOES_PLATEAU);
  const rm1s = ultimas.map(melhorRm1Valido);

  const maxNaJanela = Math.max(...rm1s);
  const rm1MaisAntigo = rm1s[SESSOES_PLATEAU - 1];

  if (maxNaJanela - rm1MaisAntigo < MELHORA_MINIMA_KG) {
    return {
      sessoes: SESSOES_PLATEAU,
      mensagem: `Sem melhora no 1RM estimado nas ultimas ${SESSOES_PLATEAU} sessoes. Considere aumentar volume, mudar a ordem dos exercicios ou trocar o estimulo.`,
    };
  }

  return null;
}

const MOTIVO_LABEL: Record<string, string> = {
  equipamento_indisponivel: 'equipamento indisponível',
  variacao: 'variação',
};

function buildSubstituiuLabel(execucao: ExecucaoExercicio): string | null {
  if (!execucao.substituiuExercicio) return null;
  const { nomeOriginal, motivo } = execucao.substituiuExercicio;
  const motivoTexto = motivo ? ` · ${MOTIVO_LABEL[motivo] ?? motivo}` : '';
  return `Substituiu: ${nomeOriginal}${motivoTexto}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `apps/mobile`): `npx vitest run src/ui/historico/presenters/buildHistoricoExercicioViewModel.test.ts`
Expected: PASS. (Typecheck will still fail until the screen is updated in the next step — that's expected; the screen references the removed `execucoes` field.)

- [ ] **Step 5: Rewrite the screen**

Replace the entire content of `apps/mobile/src/ui/historico/screens/HistoricoExercicioScreen.tsx` with:

```tsx
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HistoricoExercicioControllerState } from '../hooks/useHistoricoExercicioController';
import { LineChart } from '../../shared/LineChart';
import { SessionSeriesTable } from '../../shared/components/SessionSeriesTable';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useTheme } from '../../shared/theme';

export function HistoricoExercicioScreen({
  viewModel,
  isLoading,
  onBack,
}: HistoricoExercicioControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [pressed ? styles.backPressed : null]}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Histórico</Text>
        <Text style={styles.title}>{viewModel.exercicioNome}</Text>
      </View>

      {!isLoading && viewModel.plateau ? (
        <View style={styles.plateauBanner}>
          <Text style={styles.plateauTitle}>⚠ Plateau detectado</Text>
          <Text style={styles.plateauText}>{viewModel.plateau.mensagem}</Text>
        </View>
      ) : null}

      {!isLoading && viewModel.rm1ChartPoints.length >= 1 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Evolução do 1RM estimado</Text>
          <LineChart
            points={viewModel.rm1ChartPoints}
            formatValue={(v) => `${v} kg`}
            markMax
          />
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator size="large" color={c.accent} style={styles.loading} />
      ) : viewModel.emptyStateMessage ? (
        <View style={styles.card}>
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.execucoesTitle}>Execuções</Text>
          <SessionSeriesTable rows={viewModel.sessionRows} showVolume />
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
    header: { paddingVertical: 4 },
    backText: { color: c.accent, fontSize: 15, fontWeight: '700' },
    backPressed: { opacity: 0.6 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: {
      color: c.heroSubtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: { color: c.heroText, fontSize: 26, fontWeight: '800' },
    loading: { marginTop: 40 },
    chartCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chartTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    plateauBanner: {
      backgroundColor: c.warningBg,
      borderRadius: 24,
      padding: 18,
      gap: 6,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    plateauTitle: { color: c.warning, fontSize: 14, fontWeight: '800' },
    plateauText: { color: c.warning, fontSize: 13, lineHeight: 18 },
    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 18,
      gap: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    emptyState: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    execucoesTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
  });
}
```

- [ ] **Step 6: Verify types and tests**

Run (from `apps/mobile`): `npm run typecheck` — expected: no errors.
Run (from `apps/mobile`): `npm run test` — expected: PASS (full suite).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.ts apps/mobile/src/ui/historico/presenters/buildHistoricoExercicioViewModel.test.ts apps/mobile/src/ui/historico/screens/HistoricoExercicioScreen.tsx
git commit -m "refactor(mobile): redesenha HistoricoExercicioScreen com tabela de execucoes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Registered-series list polish (active session)

**Files:**
- Modify: `apps/mobile/src/ui/sessao/screens/ExercicioDetalheScreen.tsx`

**Interfaces:**
- Consumes: `calcularEstimativa1rm` (existing; import path `../../../shared/utils/parseDecimalInput` is a sibling — use `../../../shared/utils/estimativa1rm`), `formatCarga` (Task 3, path `../../shared/components/sessionSeriesTableModel`).
- Produces: no API change — visual-only change to the "Series registradas" card.

- [ ] **Step 1: Add imports**

In `apps/mobile/src/ui/sessao/screens/ExercicioDetalheScreen.tsx`, next to the existing `parseDecimalInput` import, add:

```ts
import { calcularEstimativa1rm } from '../../../shared/utils/estimativa1rm';
import { formatCarga } from '../../shared/components/sessionSeriesTableModel';
```

- [ ] **Step 2: Update `formatSerieMetric` default branch**

In the same file, in `formatSerieMetric`, replace the `default:` branch:

```ts
    default:
      return serie.cargaKg != null && serie.repeticoes != null
        ? `${serie.cargaKg}kg × ${serie.repeticoes}`
        : '-';
```

with:

```ts
    default:
      return serie.cargaKg != null && serie.repeticoes != null
        ? `${formatCarga(serie.cargaKg)} kg × ${serie.repeticoes}`
        : '-';
```

- [ ] **Step 3: Compute the best set**

Inside the `ExercicioDetalheScreen` component, right after the `deletingSerieIds`/`editingSerieId` state declarations, add:

```ts
  // Melhor serie (maior 1RM estimado) — so destaca com 2+ series comparaveis.
  const bestSerieId = useMemo(() => {
    if (trackingType !== 'reps_load') return null;
    const comparaveis = series.filter((s) => s.cargaKg != null && s.repeticoes != null);
    if (comparaveis.length < 2) return null;
    let best = comparaveis[0];
    for (const s of comparaveis) {
      if (calcularEstimativa1rm(s.cargaKg!, s.repeticoes!) > calcularEstimativa1rm(best.cargaKg!, best.repeticoes!)) {
        best = s;
      }
    }
    return best.id;
  }, [series, trackingType]);
```

- [ ] **Step 4: Update the series-list rows**

In the "Series list" JSX (`{series.map((serie) => {`), change the map callback to receive the index — `{series.map((serie, i) => {` — and replace the non-editing row return:

```tsx
              return (
                <View key={serie.id} style={styles.serieRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    onLongPress={() => {
```

with:

```tsx
              const isBest = serie.id === bestSerieId;
              return (
                <View key={serie.id} style={[styles.serieRow, isBest ? styles.serieRowBest : null]}>
                  <Text style={styles.serieIndex}>S{i + 1}</Text>
                  <Pressable
                    style={{ flex: 1 }}
                    onLongPress={() => {
```

and inside that Pressable replace:

```tsx
                    <Text style={styles.serieLabel}>{formatSerieMetric(serie, trackingType)}</Text>
```

with:

```tsx
                    <Text style={[styles.serieLabel, isBest ? styles.serieLabelBest : null]}>
                      {formatSerieMetric(serie, trackingType)}
                    </Text>
```

- [ ] **Step 5: Add/adjust styles**

In `makeStyles`, replace:

```ts
    serieLabel: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '600' },
```

with:

```ts
    serieLabel: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
    serieLabelBest: { color: c.accent, fontWeight: '800' },
    serieRowBest: { borderWidth: 1, borderColor: c.accent },
    serieIndex: { color: c.textSecondary, fontSize: 11, fontWeight: '800', width: 24 },
```

- [ ] **Step 6: Verify types and tests**

Run (from `apps/mobile`): `npm run typecheck` — expected: no errors.
Run (from `apps/mobile`): `npx vitest run src/ui/sessao` — expected: PASS (controller tests untouched).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/ui/sessao/screens/ExercicioDetalheScreen.tsx
git commit -m "feat(mobile): numera e destaca melhor serie na lista de series registradas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full static + unit verification**

Run (from `apps/mobile`):
- `npm run typecheck` — expected: no errors.
- `npm run test` — expected: full suite PASS.

- [ ] **Step 2: Manual verification in the running app**

Start the app (`npm run start` from `apps/mobile`, then open on device/emulator) and verify against the spec:

1. Dashboard → a treino's evolution: collapsed cards show sparkline + delta (with ≥2 sessions with 1RM data) or the text hint; no "sessãooes" anywhere.
2. Expand a card: segmented 1RM/Volume control, SVG chart with gradient + dashed grid; tap a point → value bubble appears and clears on second tap; "PR" badge on the max point in 1RM mode only.
3. Session table: each set individual ("80×10"), best set highlighted, latest session accent-bordered, ↑/↓ next to 1RM.
4. Histórico de exercício: chart shows single-dot state with exactly 1 session (not the old apology text); "Execuções" card lists all sessions without needing taps; warm-up sets (if any legacy data) render dimmed.
5. Active session → exercise detail: registered series numbered S1/S2…, best set highlighted with 2+ series, long-press edit and delete still work.
6. Peso screen and Perfil/Dashboard charts still render correctly (regression).
7. Toggle dark/light theme in Perfil and re-check both evolution screens.

- [ ] **Step 3: Report results**

Report any deviation before claiming completion (superpowers:verification-before-completion).
