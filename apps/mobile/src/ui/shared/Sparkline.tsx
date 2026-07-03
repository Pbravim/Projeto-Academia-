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
