import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SessionTableRowVM } from './sessionSeriesTableModel';
import { useTheme } from '../theme';

interface Props {
  rows: SessionTableRowVM[];
  showVolume?: boolean;
}

/** Tabela compacta de sessoes: data, sets individuais, volume/1RM com tendencia. */
export function SessionSeriesTable({ rows, showVolume = false }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.id} style={[styles.row, row.isLatest ? styles.rowLatest : null]}>
          <View style={styles.topLine}>
            <Text style={styles.date}>{row.dateLabel}</Text>
            <View style={styles.rightCol}>
              {showVolume && row.volumeLabel ? <Text style={styles.volume}>{row.volumeLabel}</Text> : null}
              {row.ormLabel ? (
                <Text style={styles.orm}>
                  {row.ormLabel}
                  {row.trend === 'up' ? <Text style={styles.trendUp}> ↑</Text> : null}
                  {row.trend === 'down' ? <Text style={styles.trendDown}> ↓</Text> : null}
                </Text>
              ) : null}
            </View>
          </View>
          {row.subLabel ? <Text style={styles.subLabel}>{row.subLabel}</Text> : null}
          {row.sets.length > 0 ? (
            <View style={styles.setsRow}>
              {row.sets.map((s, i) => (
                <Text
                  key={i}
                  style={[styles.set, s.muted ? styles.setMuted : null, s.isBest ? styles.setBest : null]}
                >
                  {s.label}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.semSeries}>Sem séries válidas</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    list: { gap: 8 },
    row: { backgroundColor: c.cardAlt, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 6 },
    rowLatest: { borderLeftWidth: 3, borderLeftColor: c.accent },
    topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    date: { color: c.textLabel, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
    rightCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    volume: { color: c.textSecondary, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
    orm: { color: c.accent, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
    trendUp: { color: c.success, fontSize: 12, fontWeight: '800' },
    trendDown: { color: c.error, fontSize: 12, fontWeight: '800' },
    subLabel: { color: c.accent, fontSize: 11, fontWeight: '600' },
    setsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, rowGap: 4 },
    set: { color: c.textPrimary, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'], minWidth: 52 },
    setMuted: { color: c.textSecondary, fontWeight: '500' },
    setBest: { color: c.accent, fontWeight: '800' },
    semSeries: { color: c.textSecondary, fontSize: 12 },
  });
}
