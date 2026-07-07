import { useEffect, useId, useMemo, useState } from 'react';
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
  useEffect(() => {
    setSelected(null);
  }, [points]);
  const rawId = useId();
  const gradId = useMemo(() => `lcgrad${rawId.replace(/[^a-zA-Z0-9]/g, '')}`, [rawId]);

  const chartWidth = width - 80;
  const lineColor = color ?? c.accent;
  const fmt = formatValue ?? defaultFormat;

  // Antes dos early-returns (regra dos hooks). Sem memo, cada toque no
  // tooltip recomputava min/max + path Catmull-Rom inteiro.
  const geo = useMemo(
    () => (points.length > 1 ? buildChartGeometry(points, chartWidth, height, fmt) : null),
    [points, chartWidth, height, fmt]
  );

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
