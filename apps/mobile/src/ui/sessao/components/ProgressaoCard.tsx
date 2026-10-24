import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';
import type { ProgressaoExercicioViewModel } from '../presenters/buildProgressaoExercicioViewModel';

export function ProgressaoCard({ progressao }: { progressao: ProgressaoExercicioViewModel }) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: c.cardAlt, borderRadius: 12, padding: 12, gap: 8 },
    title: { color: c.accentInk, fontSize: 15, fontWeight: '800' },
    text: { color: c.textPrimary, fontSize: 14 },
  }), [c]);
  if (!progressao.prs.length && !progressao.topSets.length) return null;
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      {progressao.topSets.map((s, i) => <Text key={i} style={styles.text}>{t(i === 0 ? 'progressao.last' : 'progressao.previous', { serie: s })}</Text>)}
      {progressao.prs.length > 0 ? <Text style={styles.title}>{t('progressao.newPR')}</Text> : null}
      {progressao.prs.map((pr) => <Text key={`${pr.serieId}-${pr.tipo}`} style={styles.text}>{pr.label}: {pr.value}</Text>)}
    </View>
  );
}
