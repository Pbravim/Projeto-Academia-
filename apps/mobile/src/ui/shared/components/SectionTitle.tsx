import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme';

interface Props {
  children: string;
}

export function SectionTitle({ children }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return <Text style={styles.title}>{children}</Text>;
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    title: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
  });
}
