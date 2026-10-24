import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { LineChart } from '../../shared/LineChart';
import { useTheme } from '../../shared/theme';
import type { HistoricoProgressaoViewModel, MetricaProgressao } from '../presenters/buildHistoricoProgressaoViewModel';

const METRICAS: MetricaProgressao[] = ['carga', 'volume', 'e1rm'];

export function HistoricoProgressaoPanel({ progressao }: { progressao: HistoricoProgressaoViewModel }) {
  const c = useTheme();
  const t = useT();
  const [metrica, setMetrica] = useState<MetricaProgressao>('carga');
  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 24, padding: 18, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    title: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    selectors: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    selector: { minHeight: 48, padding: 12, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder },
    selected: { borderColor: c.accentInk, backgroundColor: c.cardAlt },
    pressed: { opacity: 0.7 },
    text: { color: c.textPrimary, fontSize: 14 },
    row: { gap: 4 },
    label: { color: c.textSecondary, fontSize: 14 },
  }), [c]);
  const points = progressao.charts[metrica];
  if (!progressao.records.length) return null;
  return (
    <>
      <View style={styles.card}>
        <View style={styles.selectors}>
          {METRICAS.map((metric) => (
            <Pressable key={metric} accessibilityRole="button" accessibilityLabel={t(`progressao.${metric}`)}
              accessibilityState={{ selected: metric === metrica }} onPress={() => setMetrica(metric)}
              style={({ pressed }) => [styles.selector, metric === metrica ? styles.selected : null, pressed ? styles.pressed : null]}>
              <Text style={styles.text}>{t(`progressao.${metric}`)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.title}>{t(points.length === 1 ? 'progressao.firstExecution' : 'progressao.chart', { metrica: t(`progressao.${metrica}`) })}</Text>
        <LineChart key={metrica} points={points} formatValue={(v) => `${metrica === 'e1rm' && points.some((p) => p.value === v && p.aproximado) ? '~' : ''}${v} kg`} markMax />
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>{t('progressao.records')}</Text>
        {progressao.records.map((record, i) => <View key={i} style={styles.row}>
          <Text style={styles.label}>{record.label}</Text><Text style={styles.text}>{record.value}</Text>
        </View>)}
      </View>
    </>
  );
}
