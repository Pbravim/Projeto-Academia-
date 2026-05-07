import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '../theme';

interface Props {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}

export function HeroCard({ eyebrow, title, children }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 28, fontWeight: '800' },
  });
}
