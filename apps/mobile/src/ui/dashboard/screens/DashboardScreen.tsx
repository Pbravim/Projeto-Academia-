import { useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type DashboardChartMode = 'orm' | 'volume';

import type { DashboardControllerState } from '../hooks/useDashboardController';
import type { DiaAderencia, EvolucaoPorTreino, SessaoComVolume } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { LineChart } from '../../shared/LineChart';
import { useTheme } from '../../shared/theme';

export function DashboardScreen({ stats, isLoading, isResetting, isExporting, errorMessage, onRefresh, onReset, onExportar, onVerEvolucao }: DashboardControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const handleReset = () => {
    Alert.alert(
      'Resetar historico',
      'Isso vai apagar todas as sessoes, series e registros de progresso. Os treinos e exercicios serao mantidos. Essa acao nao pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Resetar', style: 'destructive', onPress: () => { void onReset(); } },
      ]
    );
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.eyebrow}>Evolucao</Text>
          <Pressable
            onPress={onRefresh}
            disabled={isLoading || isResetting}
            style={({ pressed }) => [styles.refreshIconBtn, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={[styles.refreshIconText, (isLoading || isResetting) ? styles.refreshIconLoading : null]}>↺</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.description}>Progresso real por treino, ultimas 10 sessoes de cada.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => { void onExportar(); }}
          disabled={isExporting || isLoading || isResetting}
          style={({ pressed }) => [styles.exportBtn, pressed ? { opacity: 0.8 } : null, (isExporting || isLoading || isResetting) ? styles.exportBtnDisabled : null]}
        >
          <Text style={styles.exportBtnText}>{isExporting ? 'Exportando...' : 'Exportar CSV'}</Text>
        </Pressable>
        <Pressable
          onPress={handleReset}
          disabled={isResetting || isLoading || isExporting}
          style={({ pressed }) => [styles.resetBtn, pressed ? { opacity: 0.8 } : null, (isResetting || isLoading || isExporting) ? styles.resetBtnDisabled : null]}
        >
          <Text style={styles.resetBtnText}>{isResetting ? 'Resetando...' : 'Resetar historico'}</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={onRefresh} style={({ pressed }) => [styles.refreshBtn, pressed ? { opacity: 0.8 } : null]}>
            <Text style={styles.refreshBtnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <ActivityIndicator size="large" color={c.accent} style={styles.loader} />
      ) : stats ? (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Total de sessoes" value={String(stats.totalSessoes)} />
            <StatCard label="Ultimo mes" value={String(stats.sessoesUltimoMes)} />
          </View>

          <AderenciaCard
            semanal={stats.aderenciaSemanal}
            mensal={stats.aderenciaMensal}
            anual={stats.aderenciaAnual}
          />

          {stats.recordesPessoais.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recordes pessoais</Text>
              <Text style={styles.helperText}>Melhor 1RM estimado — carga × (1 + reps / 30)</Text>
              {stats.recordesPessoais.map((r) => (
                <View key={r.exercicioNome} style={styles.recordeRow}>
                  <Text style={styles.recordeNome} numberOfLines={1}>{r.exercicioNome}</Text>
                  <Text style={styles.recordeValor}>{r.melhorOrmKg} kg</Text>
                </View>
              ))}
            </View>
          ) : null}

          {stats.evolucaoPorTreino.length > 0 ? (
            <>
              <Text style={styles.groupLabel}>Evolucao por treino</Text>
              {stats.evolucaoPorTreino.map((grupo) => (
                <TreinoEvolucaoCard
                  key={grupo.treinoNome}
                  grupo={grupo}
                  onVerEvolucao={() => onVerEvolucao(grupo.treinoId, grupo.treinoNome)}
                />
              ))}
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Evolucao por treino</Text>
              <Text style={styles.emptyText}>
                Nenhum treino finalizado ainda. Inicie e finalize uma sessao para ver a evolucao aqui.
              </Text>
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function TreinoEvolucaoCard({ grupo, onVerEvolucao }: { grupo: EvolucaoPorTreino; onVerEvolucao: () => void }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [expanded, setExpanded] = useState(true);
  const [chartMode, setChartMode] = useState<DashboardChartMode>('orm');

  const sessoes = grupo.sessoes;
  const temOrm = sessoes.some((s) => s.melhorOrm > 0);
  const temVolume = sessoes.some((s) => s.volumeTotal > 0);

  const sessaoesAsc = [...sessoes].reverse();

  const ormChartPoints = temOrm
    ? sessaoesAsc
        .map((s) => ({
          value: s.melhorOrm,
          label: new Date(s.dataHoraInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        }))
        .filter((p) => p.value > 0)
    : [];

  const volumeChartPoints = temVolume
    ? sessaoesAsc.map((s) => ({
        value: s.volumeTotal,
        label: new Date(s.dataHoraInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      }))
    : [];

  const trend =
    sessoes.length >= 2 && temOrm
      ? sessoes[0].melhorOrm > sessoes[1].melhorOrm
        ? 'up'
        : sessoes[0].melhorOrm < sessoes[1].melhorOrm
          ? 'down'
          : 'equal'
      : null;

  const activePoints = chartMode === 'orm' ? ormChartPoints : volumeChartPoints;
  const activeColor = chartMode === 'orm' ? undefined : c.success;
  const activeFormat = chartMode === 'orm'
    ? (v: number) => `${v} kg`
    : (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`;

  return (
    <View style={styles.card}>
      <View style={styles.treinoHeaderRow}>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={[styles.treinoHeader, { flex: 1 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.treinoNome}>{grupo.treinoNome}</Text>
            <Text style={styles.treinoMeta}>{sessoes.length} sessao{sessoes.length !== 1 ? 'es' : ''}</Text>
          </View>
          <View style={styles.treinoHeaderRight}>
            {trend === 'up' ? <Text style={styles.trendUp}>↑</Text> : null}
            {trend === 'down' ? <Text style={styles.trendDown}>↓</Text> : null}
            {trend === 'equal' ? <Text style={styles.trendEqual}>→</Text> : null}
            <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={onVerEvolucao}
          style={({ pressed }) => [styles.verEvolucaoBtn, pressed ? styles.verEvolucaoBtnPressed : null]}
        >
          <Text style={styles.verEvolucaoBtnText}>Por exercicio →</Text>
        </Pressable>
      </View>

      {(ormChartPoints.length >= 2 || volumeChartPoints.length >= 2) ? (
        <>
          <View style={styles.chartToggleRow}>
            {ormChartPoints.length >= 2 ? (
              <Pressable
                onPress={() => setChartMode('orm')}
                style={[styles.chartToggleBtn, chartMode === 'orm' ? styles.chartToggleBtnActive : null]}
              >
                <Text style={[styles.chartToggleBtnText, chartMode === 'orm' ? styles.chartToggleBtnTextActive : null]}>
                  1RM estimado
                </Text>
              </Pressable>
            ) : null}
            {volumeChartPoints.length >= 2 ? (
              <Pressable
                onPress={() => setChartMode('volume')}
                style={[styles.chartToggleBtn, chartMode === 'volume' ? styles.chartToggleBtnActiveVolume : null]}
              >
                <Text style={[styles.chartToggleBtnText, chartMode === 'volume' ? styles.chartToggleBtnTextActive : null]}>
                  Volume
                </Text>
              </Pressable>
            ) : null}
          </View>
          {activePoints.length >= 2 ? (
            <LineChart
              points={activePoints}
              color={activeColor}
              height={110}
              formatValue={activeFormat}
            />
          ) : null}
        </>
      ) : null}

      {expanded ? (
        <View style={styles.sessoesList}>
          <View style={styles.sessaoTableHeader}>
            <Text style={[styles.sessaoTableCell, styles.sessaoTableDate]}>Data</Text>
            {temVolume ? <Text style={[styles.sessaoTableCell, styles.sessaoTableVol]}>Volume</Text> : null}
            <Text style={[styles.sessaoTableCell, styles.sessaoTableDur]}>Duracao</Text>
          </View>
          {sessoes.map((s, i) => (
            <SessaoRow key={s.id} sessao={s} prev={sessoes[i + 1] ?? null} temVolume={temVolume} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SessaoRow({
  sessao,
  prev,
  temVolume,
}: {
  sessao: SessaoComVolume;
  prev: SessaoComVolume | null;
  temVolume: boolean;
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const data = new Date(sessao.dataHoraInicio);
  const dataStr = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const durStr =
    sessao.duracaoMin != null
      ? sessao.duracaoMin >= 60
        ? `${Math.floor(sessao.duracaoMin / 60)}h${sessao.duracaoMin % 60 > 0 ? `${sessao.duracaoMin % 60}m` : ''}`
        : `${sessao.duracaoMin}m`
      : '—';

  const volDiff = prev && temVolume && prev.volumeTotal > 0
    ? sessao.volumeTotal - prev.volumeTotal
    : null;

  return (
    <View style={styles.sessaoRow}>
      <Text style={[styles.sessaoTableCell, styles.sessaoTableDate, styles.sessaoDataText]}>{dataStr}</Text>
      {temVolume ? (
        <View style={[styles.sessaoTableVolContainer, styles.volCell]}>
          <Text style={styles.sessaoVolText}>{sessao.volumeTotal > 0 ? `${sessao.volumeTotal.toLocaleString('pt-BR')}kg` : '—'}</Text>
          {volDiff != null ? (
            <Text style={[styles.volDiff, volDiff > 0 ? styles.volDiffUp : volDiff < 0 ? styles.volDiffDown : styles.volDiffEqual]}>
              {volDiff > 0 ? `+${volDiff}` : String(volDiff)}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Text style={[styles.sessaoTableCell, styles.sessaoTableDur, styles.sessaoDurText]}>{durStr}</Text>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type AderenciaMode = 'semanal' | 'mensal' | 'anual';

const CAL_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

function CalendarMonthView({ dias, c, styles }: {
  dias: DiaAderencia[];
  c: ReturnType<typeof useTheme>;
  styles: ReturnType<typeof makeStyles>;
}) {
  const now = new Date();
  const firstWeekday = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  // Convert Sunday=0 to Monday-first offset
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
      {/* Weekday header */}
      <View style={styles.calendarRow}>
        {CAL_HEADERS.map((h) => (
          <View key={h} style={styles.calendarCell}>
            <Text style={styles.calendarHeaderText}>{h}</Text>
          </View>
        ))}
      </View>
      {/* Day rows */}
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
                {active ? (
                  <Text style={styles.calendarCount}>{day.totalSessoes}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function AderenciaCard({
  semanal,
  mensal,
  anual,
}: {
  semanal: DiaAderencia[];
  mensal: DiaAderencia[];
  anual: DiaAderencia[];
}) {
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
      <View style={styles.adherenceHeader}>
        <Text style={styles.sectionTitle}>Aderencia</Text>
        <View style={styles.adherenceModeToggle}>
          {(['semanal', 'mensal', 'anual'] as AderenciaMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.adherenceModeBtn, mode === m ? styles.adherenceModeBtnActive : null]}
            >
              <Text style={[styles.adherenceModeBtnText, mode === m ? styles.adherenceModeBtnTextActive : null]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text style={styles.helperText}>{subtitle}</Text>

      {mode === 'mensal' ? (
        <CalendarMonthView dias={mensal} c={c} styles={styles} />
      ) : (
        <View style={styles.adherenceChart}>
          <View style={styles.adherenceBarRow}>
            {dados.map((d, i) => {
              const barH = d.totalSessoes === 0
                ? MIN_BAR_H
                : Math.max(MIN_BAR_H + 6, Math.round((d.totalSessoes / maxSessoes) * MAX_BAR_H));
              return (
                <View key={i} style={styles.adherenceBarCol}>
                  <Text style={styles.adherenceCount}>
                    {d.totalSessoes > 0 ? String(d.totalSessoes) : ''}
                  </Text>
                  <View
                    style={[
                      styles.adherenceBar,
                      { height: barH },
                      d.totalSessoes === 0 ? styles.adherenceBarEmpty : null,
                      d.isToday ? styles.adherenceBarToday : null,
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.adherenceLabelRow}>
            {dados.map((d, i) => (
              <View key={i} style={styles.adherenceLabelCol}>
                <Text style={styles.adherenceLabel} numberOfLines={1}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.adherenceFooter}>
        <Text style={styles.adherenceFooterText}>{totalSessoes} treinos</Text>
        <Text style={styles.adherenceFooterDot}>·</Text>
        <Text style={styles.adherenceFooterText}>{totalAtivas} {footerUnit}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    refreshIconBtn: { padding: 4 },
    refreshIconText: { color: c.heroSubtext, fontSize: 20, fontWeight: '700' },
    refreshIconLoading: { opacity: 0.4 },
    actionRow: { flexDirection: 'row', gap: 10 },
    exportBtn: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.accent },
    exportBtnDisabled: { opacity: 0.5 },
    exportBtnText: { color: c.accent, fontSize: 14, fontWeight: '700' },
    resetBtn: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.error },
    resetBtnDisabled: { opacity: 0.5 },
    resetBtnText: { color: c.error, fontSize: 14, fontWeight: '700' },
    title: { color: c.heroText, fontSize: 30, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 15, lineHeight: 22 },
    loader: { marginTop: 40 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: 20, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: c.cardBorder },
    statValue: { color: c.textPrimary, fontSize: 32, fontWeight: '800' },
    statLabel: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    helperText: { color: c.textSecondary, fontSize: 12, lineHeight: 17 },
    emptyText: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    errorText: { color: c.error, fontSize: 14, fontWeight: '600' },
    refreshBtn: { backgroundColor: c.hero, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    refreshBtnText: { color: c.heroText, fontSize: 14, fontWeight: '700' },
    recordeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.cardAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    recordeNome: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    recordeValor: { color: c.accent, fontSize: 15, fontWeight: '800', marginLeft: 8 },
    groupLabel: { color: c.textLabel, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
    treinoHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    treinoHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    verEvolucaoBtn: { backgroundColor: c.cardAlt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'flex-start', marginTop: 2 },
    verEvolucaoBtnPressed: { opacity: 0.7 },
    verEvolucaoBtnText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    chartToggleRow: { flexDirection: 'row', gap: 8 },
    chartToggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.cardBorder },
    chartToggleBtnActive: { backgroundColor: c.hero, borderColor: c.hero },
    chartToggleBtnActiveVolume: { backgroundColor: c.successBg, borderColor: c.success },
    chartToggleBtnText: { color: c.textSecondary, fontSize: 12, fontWeight: '700' },
    chartToggleBtnTextActive: { color: c.heroText },
    treinoNome: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
    treinoMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    treinoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
    trendUp: { color: c.success, fontSize: 16, fontWeight: '800' },
    trendDown: { color: c.error, fontSize: 16, fontWeight: '800' },
    trendEqual: { color: c.textSecondary, fontSize: 16, fontWeight: '800' },
    chevron: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    sessoesList: { gap: 4 },
    sessaoTableHeader: { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    sessaoTableCell: { fontSize: 12 },
    sessaoTableDate: { flex: 2, color: c.textLabel, fontWeight: '700' },
    sessaoTableVol: { flex: 2, color: c.textLabel, fontWeight: '700' },
    sessaoTableVolContainer: { flex: 2 },
    sessaoTableDur: { flex: 1, color: c.textLabel, fontWeight: '700', textAlign: 'right' },
    sessaoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: c.background },
    sessaoDataText: { color: c.textPrimary, fontWeight: '600', fontSize: 13 },
    volCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sessaoVolText: { color: c.textPrimary, fontWeight: '700', fontSize: 13 },
    volDiff: { fontSize: 11, fontWeight: '700' },
    volDiffUp: { color: c.success },
    volDiffDown: { color: c.error },
    volDiffEqual: { color: c.textSecondary },
    sessaoDurText: { color: c.textSecondary, fontSize: 12 },
    adherenceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    adherenceModeToggle: { flexDirection: 'row', backgroundColor: c.cardAlt, borderRadius: 10, padding: 2, gap: 2 },
    adherenceModeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    adherenceModeBtnActive: { backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    adherenceModeBtnText: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    adherenceModeBtnTextActive: { color: c.textPrimary },
    // bar chart (semanal / anual)
    adherenceChart: { gap: 0 },
    adherenceBarRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 72 },
    adherenceBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
    adherenceCount: { color: c.accent, fontSize: 9, fontWeight: '800', height: 12, textAlign: 'center' },
    adherenceBar: { width: '100%', borderRadius: 3, backgroundColor: c.accent, opacity: 0.6 },
    adherenceBarEmpty: { backgroundColor: c.cardBorder, opacity: 1 },
    adherenceBarToday: { opacity: 1 },
    adherenceLabelRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
    adherenceLabelCol: { flex: 1, alignItems: 'center' },
    adherenceLabel: { color: c.textSecondary, fontSize: 9, fontWeight: '600', textAlign: 'center' },
    // calendar (mensal)
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
    adherenceFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    adherenceFooterText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    adherenceFooterDot: { color: c.cardBorder, fontSize: 14, fontWeight: '800' },
  });
}
