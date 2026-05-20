import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DiaAderencia } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { useTheme } from '../theme';

type AderenciaMode = 'semanal' | 'mensal' | 'anual';

const CAL_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

function CalendarMonthView({
  dias,
  c,
  styles,
}: {
  dias: DiaAderencia[];
  c: ReturnType<typeof useTheme>;
  styles: ReturnType<typeof makeStyles>;
}) {
  const now = new Date();
  const firstWeekday = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const totalCells = Math.ceil((startOffset + dias.length) / 7) * 7;
  const cells: (DiaAderencia | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...dias,
    ...Array<null>(totalCells - startOffset - dias.length).fill(null),
  ];
  const rows: (DiaAderencia | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={styles.calendarGrid}>
      <View style={styles.calendarRow}>
        {CAL_HEADERS.map((h) => (
          <View key={h} style={styles.calendarCell}>
            <Text style={styles.calendarHeaderText}>{h}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calendarRow}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={[styles.calendarCell, styles.calendarCellGhost]} />;
            const active = day.totalSessoes > 0;
            return (
              <View
                key={ci}
                style={[
                  styles.calendarCell,
                  styles.calendarCellDay,
                  active ? styles.calendarCellActive : null,
                  day.isToday ? styles.calendarCellToday : null,
                ]}
              >
                <Text style={[styles.calendarDayNum, active ? styles.calendarDayNumActive : null]}>
                  {String(parseInt(day.label, 10))}
                </Text>
                {active ? <Text style={styles.calendarCount}>{day.totalSessoes}</Text> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface AderenciaCardProps {
  semanal: DiaAderencia[];
  mensal: DiaAderencia[];
  anual: DiaAderencia[];
}

export function AderenciaCard({ semanal, mensal, anual }: AderenciaCardProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<AderenciaMode>('semanal');

  const dados = mode === 'semanal' ? semanal : mode === 'mensal' ? mensal : anual;
  const maxSessoes = Math.max(...dados.map((d) => d.totalSessoes), 1);
  const totalAtivas = dados.filter((d) => d.totalSessoes > 0).length;
  const totalSessoes = dados.reduce((sum, d) => sum + d.totalSessoes, 0);

  const MAX_BAR_H = 56;
  const MIN_BAR_H = 3;
  const subtitle = mode === 'semanal' ? 'Semana atual' : mode === 'mensal' ? 'Mes atual' : 'Ano atual';
  const footerUnit = mode === 'anual' ? 'meses ativos' : 'dias ativos';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Aderencia</Text>
        <View style={styles.modeToggle}>
          {(['semanal', 'mensal', 'anual'] as AderenciaMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeBtn, mode === m ? styles.modeBtnActive : null]}
            >
              <Text style={[styles.modeBtnText, mode === m ? styles.modeBtnTextActive : null]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.subtitle}>{subtitle}</Text>

      {mode === 'mensal' ? (
        <CalendarMonthView dias={mensal} c={c} styles={styles} />
      ) : (
        <View style={styles.barChart}>
          <View style={styles.barRow}>
            {dados.map((d) => {
              const barH =
                d.totalSessoes === 0
                  ? MIN_BAR_H
                  : Math.max(MIN_BAR_H + 6, Math.round((d.totalSessoes / maxSessoes) * MAX_BAR_H));
              return (
                <View key={d.label} style={styles.barCol}>
                  <Text style={styles.barCount}>
                    {d.totalSessoes > 0 ? String(d.totalSessoes) : ''}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      { height: barH },
                      d.totalSessoes === 0 ? styles.barEmpty : null,
                      d.isToday ? styles.barToday : null,
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.labelRow}>
            {dados.map((d) => (
              <View key={d.label} style={styles.labelCol}>
                <Text style={styles.label} numberOfLines={1}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>{totalSessoes} treinos</Text>
        <Text style={styles.footerDot}>·</Text>
        <Text style={styles.footerText}>{totalAtivas} {footerUnit}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    subtitle: { color: c.textSecondary, fontSize: 12, lineHeight: 17 },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: c.cardAlt,
      borderRadius: 10,
      padding: 2,
      gap: 2,
    },
    modeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    modeBtnActive: {
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    modeBtnText: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    modeBtnTextActive: { color: c.textPrimary },

    // bar chart
    barChart: { gap: 0 },
    barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 72 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
    barCount: { color: c.accent, fontSize: 9, fontWeight: '800', height: 12, textAlign: 'center' },
    bar: { width: '100%', borderRadius: 3, backgroundColor: c.accent, opacity: 0.6 },
    barEmpty: { backgroundColor: c.cardBorder, opacity: 1 },
    barToday: { opacity: 1 },
    labelRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
    labelCol: { flex: 1, alignItems: 'center' },
    label: { color: c.textSecondary, fontSize: 9, fontWeight: '600', textAlign: 'center' },

    // calendar
    calendarGrid: { gap: 3 },
    calendarRow: { flexDirection: 'row', gap: 3 },
    calendarCell: { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    calendarCellGhost: { backgroundColor: 'transparent' },
    calendarCellDay: { backgroundColor: c.cardAlt },
    calendarCellActive: { backgroundColor: c.accent },
    calendarCellToday: { borderWidth: 2, borderColor: c.accent },
    calendarHeaderText: { color: c.textSecondary, fontSize: 9, fontWeight: '700', textAlign: 'center' },
    calendarDayNum: { color: c.textSecondary, fontSize: 10, fontWeight: '600' },
    calendarDayNumActive: { color: c.accentText, fontSize: 9 },
    calendarCount: { color: c.accentText, fontSize: 13, fontWeight: '800', lineHeight: 14 },

    // footer
    footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    footerText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    footerDot: { color: c.cardBorder, fontSize: 14, fontWeight: '800' },
  });
}
