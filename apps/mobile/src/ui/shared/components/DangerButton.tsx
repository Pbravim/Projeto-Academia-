import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function DangerButton({ label, onPress, disabled = false }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    button: {
      minHeight: 48,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: c.error,
    },
    pressed: { opacity: 0.7 },
    disabled: { opacity: 0.4 },
    label: { color: c.error, fontSize: 14, fontWeight: '700' },
  });
}
