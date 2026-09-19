import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';

interface Props {
  isExporting: boolean;
  onPress: () => void;
}

export function ExportarTreinoButton({ isExporting, onPress }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('treinos.exportar.botao')}
      onPress={onPress}
      disabled={isExporting}
      style={({ pressed }) => [styles.button, isExporting ? styles.buttonDisabled : null, pressed && !isExporting ? styles.buttonPressed : null]}
    >
      <Text style={styles.buttonText}>{isExporting ? t('treinos.exportar.exportando') : t('treinos.exportar.botao')}</Text>
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    button: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    buttonPressed: { opacity: 0.8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.accent, fontSize: 13, fontWeight: '700' },
  });
}
