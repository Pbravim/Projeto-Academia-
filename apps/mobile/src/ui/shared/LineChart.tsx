import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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

export function LineChart({
  points,
  color,
  height = 130,
  formatValue,
}: LineChartProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();

  if (points.length < 2) return null;

  const lineColor = color ?? c.accent;
  const chartWidth = width - 80;

  const computed = useMemo(() => {
    const plotH = height - CHART_PAD_V * 2;
    const vals = points.map((p) => p.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV === minV ? 1 : maxV - minV;
    const getX = (i: number) => (i / (points.length - 1)) * chartWidth;
    const getY = (v: number) => CHART_PAD_V + (1 - (v - minV) / range) * plotH;

    const segmentStyles: object[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = getX(i);     const y1 = getY(vals[i]);
      const x2 = getX(i + 1); const y2 = getY(vals[i + 1]);
      const dx = x2 - x1;     const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      segmentStyles.push({
        position: 'absolute' as const,
        height: 3,
        borderRadius: 2,
        backgroundColor: lineColor,
        left: (x1 + x2) / 2 - len / 2,
        top: (y1 + y2) / 2 - 1.5,
        width: len,
        transform: [{ rotate: `${Math.atan2(dy, dx) * 180 / Math.PI}deg` }],
      });
    }

    const pointStyles: object[] = points.map((p, i) => {
      const isLast = i === points.length - 1;
      const size = isLast ? 12 : 8;
      return {
        position: 'absolute' as const,
        backgroundColor: lineColor,
        width: size,
        height: size,
        borderRadius: size / 2,
        left: getX(i) - size / 2,
        top: getY(p.value) - size / 2,
        ...(isLast ? { borderWidth: 2.5, borderColor: c.card } : {}),
      };
    });

    const gridStyles = ([0, 0.5, 1] as const).map((t) => [
      styles.gridLine,
      { top: CHART_PAD_V + (1 - t) * plotH },
    ]);

    const fmtMin = formatValue ? formatValue(minV) : String(minV % 1 === 0 ? minV : minV.toFixed(1));
    const fmtMax = formatValue ? formatValue(maxV) : String(maxV % 1 === 0 ? maxV : maxV.toFixed(1));
    const yMaxStyle = [styles.yLabel, { top: CHART_PAD_V - 8 }];
    const yMinStyle = [styles.yLabel, { top: CHART_PAD_V + plotH - 8 }];

    return {
      segmentStyles,
      pointStyles,
      gridStyles,
      fmtMin,
      fmtMax,
      showMin: minV !== maxV,
      yMaxStyle,
      yMinStyle,
      midIndex: Math.floor((points.length - 1) / 2),
    };
  }, [points, lineColor, chartWidth, height, c.card, formatValue, styles.gridLine, styles.yLabel]);

  return (
    <View style={useMemo(() => ({ width: chartWidth }), [chartWidth])}>
      <View style={useMemo(() => ({ height, position: 'relative' as const }), [height])}>
        {/* Linhas de grade */}
        {([0, 0.5, 1] as const).map((t, i) => (
          <View key={t} style={computed.gridStyles[i]} />
        ))}

        {/* Segmentos */}
        {computed.segmentStyles.map((s, i) => (
          <View key={i} style={s} />
        ))}

        {/* Pontos */}
        {computed.pointStyles.map((s, i) => (
          <View key={i} style={s} />
        ))}

        {/* Labels Y */}
        <View style={computed.yMaxStyle}>
          <Text style={styles.yLabelText}>{computed.fmtMax}</Text>
        </View>
        {computed.showMin ? (
          <View style={computed.yMinStyle}>
            <Text style={styles.yLabelText}>{computed.fmtMin}</Text>
          </View>
        ) : null}
      </View>

      {/* Labels X */}
      <View style={styles.xAxis}>
        <Text style={styles.axisLabel}>{points[0].label}</Text>
        {points.length > 2 ? (
          <Text style={styles.axisLabel}>{points[computed.midIndex].label}</Text>
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
