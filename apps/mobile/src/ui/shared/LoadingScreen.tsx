import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from './theme';

export function LoadingScreen() {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={c.accent} />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
