import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

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
}

const CHART_PAD_V = 18;
const SCREEN_WIDTH = Dimensions.get('window').width;

export function LineChart({
  points,
  color,
  height = 130,
  formatValue,
}: LineChartProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (points.length < 2) return null;

  const lineColor = color ?? c.accent;

  const plotHeight = height - CHART_PAD_V * 2;
  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal === minVal ? 1 : maxVal - minVal;

  // Subtrai padding padrão da tela (20) + card (20) em cada lado
  const chartWidth = SCREEN_WIDTH - 80;

  const getX = (i: number) => (i / (points.length - 1)) * chartWidth;
  const getY = (v: number) => CHART_PAD_V + (1 - (v - minVal) / range) * plotHeight;

  const segments: { cx: number; cy: number; len: number; angle: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const x1 = getX(i);     const y1 = getY(values[i]);
    const x2 = getX(i + 1); const y2 = getY(values[i + 1]);
    const dx = x2 - x1;     const dy = y2 - y1;
    segments.push({
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      len: Math.sqrt(dx * dx + dy * dy),
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
    });
  }

  const fmtMin = formatValue ? formatValue(minVal) : String(minVal % 1 === 0 ? minVal : minVal.toFixed(1));
  const fmtMax = formatValue ? formatValue(maxVal) : String(maxVal % 1 === 0 ? maxVal : maxVal.toFixed(1));
  const midIndex = Math.floor((points.length - 1) / 2);

  return (
    <View style={{ width: chartWidth }}>
      <View style={{ height, position: 'relative' }}>
        {/* Linhas de grade */}
        {[0, 0.5, 1].map((t) => (
          <View
            key={t}
            style={[styles.gridLine, { top: CHART_PAD_V + (1 - t) * plotHeight }]}
          />
        ))}

        {/* Segmentos */}
        {segments.map((seg, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              height: 3,
              borderRadius: 2,
              backgroundColor: lineColor,
              left: seg.cx - seg.len / 2,
              top: seg.cy - 1.5,
              width: seg.len,
              transform: [{ rotate: `${seg.angle}deg` }],
            }}
          />
        ))}

        {/* Pontos */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          const size = isLast ? 12 : 8;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                backgroundColor: lineColor,
                width: size,
                height: size,
                borderRadius: size / 2,
                left: getX(i) - size / 2,
                top: getY(p.value) - size / 2,
                ...(isLast ? { borderWidth: 2.5, borderColor: c.card } : {}),
              }}
            />
          );
        })}

        {/* Labels Y */}
        <View style={[styles.yLabel, { top: CHART_PAD_V - 8 }]}>
          <Text style={styles.yLabelText}>{fmtMax}</Text>
        </View>
        {minVal !== maxVal ? (
          <View style={[styles.yLabel, { top: CHART_PAD_V + plotHeight - 8 }]}>
            <Text style={styles.yLabelText}>{fmtMin}</Text>
          </View>
        ) : null}
      </View>

      {/* Labels X */}
      <View style={styles.xAxis}>
        <Text style={styles.axisLabel}>{points[0].label}</Text>
        {points.length > 2 ? (
          <Text style={styles.axisLabel}>{points[midIndex].label}</Text>
        ) : null}
        <Text style={styles.axisLabel}>{points[points.length - 1].label}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: c.cardBorder },
    xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    axisLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '600' },
    yLabel: { position: 'absolute', right: 0 },
    yLabelText: { color: c.textSecondary, fontSize: 10, fontWeight: '600', backgroundColor: c.card, paddingHorizontal: 2 },
  });
}
