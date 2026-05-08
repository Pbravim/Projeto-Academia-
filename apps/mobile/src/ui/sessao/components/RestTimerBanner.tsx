import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../shared/theme';

interface Props {
  nome: string;
  restante: number;
  total: number;
  minimized: boolean;
  onToggleMinimized: () => void;
  onSkip: () => void;
}

export function RestTimerBanner({ nome, restante, total, minimized, onToggleMinimized, onSkip }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const mins = Math.floor(restante / 60);
  const secs = restante % 60;
  const label = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
  const progress = restante / total;

  if (minimized) {
    return (
      <Pressable onPress={onToggleMinimized} style={styles.pill}>
        <Text style={styles.pillText}>⏱ {label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.eyebrow}>Descanso</Text>
          <Text style={styles.exercicioLabel} numberOfLines={1}>{nome}</Text>
        </View>
        <Pressable onPress={onToggleMinimized} style={({ pressed }) => [styles.iconBtn, pressed ? { opacity: 0.6 } : null]}>
          <Text style={styles.iconBtnText}>−</Text>
        </Pressable>
      </View>

      <Text style={styles.countdown}>{label}</Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      <Pressable onPress={onSkip} style={({ pressed }) => [styles.skipBtn, pressed ? { opacity: 0.8 } : null]}>
        <Text style={styles.skipBtnText}>Pular descanso</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // Minimised pill — bottom-right corner
    pill: {
      position: 'absolute',
      bottom: 32,
      right: 20,
      backgroundColor: c.accent,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    pillText: { color: c.accentText, fontSize: 15, fontWeight: '800' },

    // Expanded card — bottom of screen
    card: {
      position: 'absolute',
      bottom: 24,
      left: 16,
      right: 16,
      backgroundColor: c.accent,
      borderRadius: 20,
      padding: 18,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    eyebrow: { color: c.accentText, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.75 },
    exercicioLabel: { color: c.accentText, fontSize: 14, fontWeight: '700', marginTop: 2, maxWidth: 220 },
    iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
    iconBtnText: { color: c.accentText, fontSize: 20, fontWeight: '300', lineHeight: 22 },
    countdown: { color: c.accentText, fontSize: 42, fontWeight: '800', letterSpacing: -1 },
    barTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
    barFill: { height: 5, borderRadius: 3, backgroundColor: c.accentText },
    skipBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    skipBtnText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
  });
}
