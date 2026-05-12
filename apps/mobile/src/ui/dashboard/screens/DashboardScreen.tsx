import { useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type DashboardChartMode = 'orm' | 'volume';

import type { DashboardControllerState } from '../hooks/useDashboardController';
import type { EvolucaoPorTreino, SessaoComVolume } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { LineChart } from '../../shared/LineChart';
import { useTheme } from '../../shared/theme';

export function DashboardScreen({ stats, isLoading, isResetting, isExporting, errorMessage, onRefresh, onReset, onExportar, onVerEvolucao, onVerRecordes }: DashboardControllerState) {
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
          {stats.recordesPessoais.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.recordesHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Recordes pessoais</Text>
                  <Text style={styles.helperText}>Melhor 1RM — carga × (1 + reps / 30)</Text>
                </View>
                {stats.recordesPessoais.length > 3 ? (
                  <Pressable
                    onPress={onVerRecordes}
                    style={({ pressed }) => [styles.verTodosBtn, pressed ? { opacity: 0.7 } : null]}
                  >
                    <Text style={styles.verTodosBtnText}>Ver todos</Text>
                  </Pressable>
                ) : null}
              </View>
              {stats.recordesPessoais.slice(0, 3).map((r, i) => (
                <View key={r.exercicioNome} style={styles.recordeRow}>
                  <Text style={[styles.recordeRank, i === 0 ? styles.recordeRank1 : i === 1 ? styles.recordeRank2 : styles.recordeRank3]}>
                    {i + 1}
                  </Text>
                  <Text style={styles.recordeNome} numberOfLines={1}>{r.exercicioNome}</Text>
                  <Text style={styles.recordeValor}>{r.melhorOrmKg} kg</Text>
                </View>
              ))}
              {stats.recordesPessoais.length > 3 ? (
                <Pressable
                  onPress={onVerRecordes}
                  style={({ pressed }) => [styles.verTodosRow, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={styles.verTodosRowText}>+{stats.recordesPessoais.length - 3} exercícios →</Text>
                </Pressable>
              ) : null}
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

  const [expanded, setExpanded] = useState(false);
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
      {/* Header: tapping collapses/expands the session list */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.treinoHeader, pressed ? { opacity: 0.7 } : null]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.treinoNome}>{grupo.treinoNome}</Text>
          <Text style={styles.treinoMeta}>{sessoes.length} sessão{sessoes.length !== 1 ? 'ões' : ''}</Text>
        </View>
        <View style={styles.treinoHeaderRight}>
          {trend === 'up' ? <Text style={styles.trendUp}>↑</Text> : null}
          {trend === 'down' ? <Text style={styles.trendDown}>↓</Text> : null}
          {trend === 'equal' ? <Text style={styles.trendEqual}>→</Text> : null}
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {(ormChartPoints.length >= 2 || volumeChartPoints.length >= 2) ? (
        <View style={styles.chartSection}>
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
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.sessoesList}>
          {sessoes.map((s, i) => (
            <SessaoRow key={s.id} sessao={s} prev={sessoes[i + 1] ?? null} temVolume={temVolume} isFirst={i === 0} />
          ))}
        </View>
      ) : null}

      {/* Bottom CTA */}
      <Pressable
        onPress={onVerEvolucao}
        style={({ pressed }) => [styles.verEvolucaoBtn, pressed ? styles.verEvolucaoBtnPressed : null]}
      >
        <Text style={styles.verEvolucaoBtnText}>Ver evolução por exercício →</Text>
      </Pressable>
    </View>
  );
}

function SessaoRow({
  sessao,
  prev,
  temVolume,
  isFirst,
}: {
  sessao: SessaoComVolume;
  prev: SessaoComVolume | null;
  temVolume: boolean;
  isFirst: boolean;
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
    <View style={[styles.sessaoRow, isFirst ? styles.sessaoRowFirst : null]}>
      <Text style={[styles.sessaoDataText, { flex: 2 }]}>{dataStr}</Text>
      {temVolume ? (
        <View style={[styles.volCell, { flex: 2 }]}>
          <Text style={styles.sessaoVolText}>{sessao.volumeTotal > 0 ? `${sessao.volumeTotal.toLocaleString('pt-BR')}kg` : '—'}</Text>
          {volDiff != null ? (
            <Text style={[styles.volDiff, volDiff > 0 ? styles.volDiffUp : volDiff < 0 ? styles.volDiffDown : styles.volDiffEqual]}>
              {volDiff > 0 ? `+${volDiff}` : String(volDiff)}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Text style={[styles.sessaoDurText, { flex: 1, textAlign: 'right' }]}>{durStr}</Text>
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
    card: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    helperText: { color: c.textSecondary, fontSize: 12, lineHeight: 17 },
    emptyText: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    errorText: { color: c.error, fontSize: 14, fontWeight: '600' },
    refreshBtn: { backgroundColor: c.hero, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    refreshBtnText: { color: c.heroText, fontSize: 14, fontWeight: '700' },
    recordesHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    verTodosBtn: {
      backgroundColor: c.cardAlt,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
      alignSelf: 'flex-start',
      marginTop: 2,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    verTodosBtnText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    recordeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardAlt,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
    },
    recordeRank: { fontSize: 13, fontWeight: '800', minWidth: 18, textAlign: 'center' },
    recordeRank1: { color: '#d4a017' },
    recordeRank2: { color: c.textSecondary },
    recordeRank3: { color: '#a0522d' },
    recordeNome: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    recordeValor: { color: c.accent, fontSize: 15, fontWeight: '800' },
    verTodosRow: { alignItems: 'center', paddingVertical: 6 },
    verTodosRowText: { color: c.accent, fontSize: 13, fontWeight: '700' },
    groupLabel: { color: c.textLabel, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
    treinoHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    treinoNome: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
    treinoMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    treinoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
    trendUp: { color: c.success, fontSize: 16, fontWeight: '800' },
    trendDown: { color: c.error, fontSize: 16, fontWeight: '800' },
    trendEqual: { color: c.textSecondary, fontSize: 16, fontWeight: '800' },
    chevron: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    chartSection: { gap: 10 },
    chartToggleRow: { flexDirection: 'row', gap: 8 },
    chartToggleBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chartToggleBtnActive: { backgroundColor: c.hero, borderColor: c.hero },
    chartToggleBtnActiveVolume: { backgroundColor: c.successBg, borderColor: c.success },
    chartToggleBtnText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
    chartToggleBtnTextActive: { color: c.heroText },
    sessoesList: { gap: 6 },
    sessaoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardAlt,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    sessaoRowFirst: { borderWidth: 1.5, borderColor: c.accent },
    sessaoDataText: { color: c.textPrimary, fontWeight: '700', fontSize: 13 },
    volCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sessaoVolText: { color: c.textPrimary, fontWeight: '700', fontSize: 13 },
    volDiff: { fontSize: 11, fontWeight: '700' },
    volDiffUp: { color: c.success },
    volDiffDown: { color: c.error },
    volDiffEqual: { color: c.textSecondary },
    sessaoDurText: { color: c.textSecondary, fontSize: 12 },
    verEvolucaoBtn: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: c.accent,
    },
    verEvolucaoBtnPressed: { opacity: 0.7 },
    verEvolucaoBtnText: { color: c.accent, fontSize: 14, fontWeight: '700' },
  });
}
