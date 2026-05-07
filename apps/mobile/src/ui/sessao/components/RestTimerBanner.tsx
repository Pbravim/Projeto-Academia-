import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../shared/theme';

interface Props {
  nome: string;
  restante: number;
  total: number;
  onSkip: () => void;
}

export function RestTimerBanner({ nome, restante, total, onSkip }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const mins = Math.floor(restante / 60);
  const secs = restante % 60;
  const label = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
  const progress = restante / total;

  return (
    <View style={styles.timerBanner}>
      <View style={styles.timerBannerTop}>
        <View>
          <Text style={styles.timerLabel}>Descanso — {nome}</Text>
          <Text style={styles.timerCountdown}>{label}</Text>
        </View>
        <Pressable onPress={onSkip} style={({ pressed }) => [styles.timerSkipBtn, pressed ? { opacity: 0.7 } : null]}>
          <Text style={styles.timerSkipText}>Pular</Text>
        </Pressable>
      </View>
      <View style={styles.timerBarTrack}>
        <View style={[styles.timerBarFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    timerBanner: { backgroundColor: c.hero, borderRadius: 20, padding: 16, gap: 10 },
    timerBannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    timerLabel: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    timerCountdown: { color: c.heroText, fontSize: 32, fontWeight: '800', marginTop: 2 },
    timerSkipBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: c.inputBorder },
    timerSkipText: { color: c.heroSubtext, fontSize: 13, fontWeight: '700' },
    timerBarTrack: { height: 6, borderRadius: 3, backgroundColor: c.cardBorder, overflow: 'hidden' },
    timerBarFill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
  });
}
