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
