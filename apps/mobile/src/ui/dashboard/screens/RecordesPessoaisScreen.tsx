import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RecordeItem } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useTheme } from '../../shared/theme';

interface Props {
  recordes: RecordeItem[];
  onBack: () => void;
}

const MEDAL_COLORS = ['#d4a017', '#9e9e9e', '#a0522d'];

export function RecordesPessoaisScreen({ recordes, onBack }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  const sorted = [...recordes].sort((a, b) => b.melhorOrmKg - a.melhorOrmKg);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [pressed ? styles.backPressed : null]}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Dashboard</Text>
        <Text style={styles.title}>Recordes pessoais</Text>
        <Text style={styles.description}>
          Melhor 1RM estimado por exercício — carga × (1 + reps / 30).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.count}>{sorted.length} exercício{sorted.length !== 1 ? 's' : ''}</Text>
        {sorted.map((r, i) => (
          <View key={r.exercicioNome} style={styles.recordeRow}>
            <Text style={[styles.rank, { color: i < 3 ? MEDAL_COLORS[i] : c.textSecondary }]}>
              {i + 1}
            </Text>
            <Text style={styles.nome} numberOfLines={1}>{r.exercicioNome}</Text>
            <Text style={styles.valor}>{r.melhorOrmKg} kg</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
    header: { paddingVertical: 4 },
    backText: { color: c.accent, fontSize: 15, fontWeight: '700' },
    backPressed: { opacity: 0.6 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: {
      color: c.heroSubtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: { color: c.heroText, fontSize: 26, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 14, lineHeight: 20 },
    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 18,
      gap: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    count: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    recordeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardAlt,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
    },
    rank: { fontSize: 13, fontWeight: '800', minWidth: 22, textAlign: 'center' },
    nome: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    valor: { color: c.accent, fontSize: 15, fontWeight: '800' },
  });
}
