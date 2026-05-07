import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ReactNode, ComponentProps } from 'react';

import { useTheme } from '../theme';

interface Props {
  children: ReactNode;
  gap?: number;
  style?: ComponentProps<typeof View>['style'];
}

export function ContentCard({ children, gap = 14, style }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c, gap), [c, gap]);

  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>, gap: number) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
  });
}
