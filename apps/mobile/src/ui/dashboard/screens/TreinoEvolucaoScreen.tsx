import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ExercicioEvolucao } from '../../../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';
import type { SessaoExercicioEvolucao } from '../../../domain/dashboard/repositories/DashboardRepository';
import { LineChart } from '../../shared/LineChart';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useTheme } from '../../shared/theme';

interface Props {
  treinoNome: string;
  exercicios: ExercicioEvolucao[];
  isLoading: boolean;
  errorMessage: string | null;
  onBack: () => void;
}

export function TreinoEvolucaoScreen({ treinoNome, exercicios, isLoading, errorMessage, onBack }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
        >
          <Text style={styles.backButtonText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Evolucao por exercicio</Text>
        <Text style={styles.title}>{treinoNome}</Text>
        <Text style={styles.description}>
          Ultimas 10 sessoes por exercicio — séries, cargas e 1RM estimado.
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator size="large" color={c.accent} style={styles.loader} />
      ) : exercicios.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Nenhuma sessao finalizada encontrada para este treino.
          </Text>
        </View>
      ) : (
        exercicios.map((ex) => (
          <ExercicioEvolucaoCard key={ex.exercicioId} exercicio={ex} />
        ))
      )}
    </ScrollView>
  );
}

function ExercicioEvolucaoCard({ exercicio }: { exercicio: ExercicioEvolucao }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [expanded, setExpanded] = useState(false);

  const sessoes = exercicio.sessoes;
  const temDados = sessoes.some((s) => s.melhorOrm > 0);

  const sessoesAsc = [...sessoes].reverse();

  const ormChartPoints = temDados
    ? sessoesAsc.map((s) => ({
        value: s.melhorOrm,
        label: new Date(s.dataHoraInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      })).filter((p) => p.value > 0)
    : [];

  const volumeChartPoints = sessoesAsc
    .map((s) => ({
      value: s.series.reduce((sum, sr) => sum + sr.cargaKg * sr.repeticoes, 0),
      label: new Date(s.dataHoraInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    }))
    .filter((p) => p.value > 0);

  const ultima = sessoes[0];
  const penultima = sessoes[1] ?? null;

  const ormDiff =
    ultima && penultima && penultima.melhorOrm > 0
      ? Math.round((ultima.melhorOrm - penultima.melhorOrm) * 10) / 10
      : null;

  const trend =
    ormDiff === null ? null : ormDiff > 0 ? 'up' : ormDiff < 0 ? 'down' : 'equal';

  return (
    <View style={styles.card}>
      {/* Cabeçalho — sempre visível, toque para expandir */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.cardHeader, pressed ? { opacity: 0.7 } : null]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.exercicioNome}>{exercicio.exercicioNome}</Text>
          <Text style={styles.exercicioMeta}>{exercicio.groupMuscle}</Text>
          {!expanded && ultima && temDados ? (
            <Text style={styles.collapsedHint}>
              1RM: {ultima.melhorOrm} kg
              {ormDiff !== null ? (ormDiff > 0 ? ` ↑ +${ormDiff}` : ormDiff < 0 ? ` ↓ ${ormDiff}` : '') : ''}
              {' · '}{sessoes.length} sessão{sessoes.length !== 1 ? 'oes' : ''}
            </Text>
          ) : null}
          {!expanded && !(ultima && temDados) ? (
            <Text style={styles.collapsedHint}>{sessoes.length} sessão{sessoes.length !== 1 ? 'oes' : ''}</Text>
          ) : null}
        </View>
        <View style={styles.cardHeaderRight}>
          {trend === 'up' ? <Text style={styles.trendUp}>↑</Text> : null}
          {trend === 'down' ? <Text style={styles.trendDown}>↓</Text> : null}
          {trend === 'equal' ? <Text style={styles.trendEqual}>→</Text> : null}
          <Text style={styles.cardChevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <>
          {/* Pills de resumo */}
          {ultima && temDados ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Melhor 1RM</Text>
                <Text style={styles.summaryValue}>{ultima.melhorOrm} kg</Text>
              </View>
              {ormDiff !== null ? (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>vs anterior</Text>
                  <Text style={[
                    styles.summaryDiff,
                    ormDiff > 0 ? styles.diffUp : ormDiff < 0 ? styles.diffDown : styles.diffEqual,
                  ]}>
                    {ormDiff > 0 ? `+${ormDiff}` : String(ormDiff)} kg
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Series (ult.)</Text>
                <Text style={styles.summaryValue}>{ultima.series.length}</Text>
              </View>
            </View>
          ) : null}

          {/* Gráfico com toggle */}
          <ChartToggle
            ormPoints={ormChartPoints}
            volumePoints={volumeChartPoints}
          />

          {/* Lista de sessões com séries reais */}
          {sessoes.length > 0 ? (
            <View style={styles.sessoesList}>
              {sessoes.map((s, i) => (
                <SessaoSeriesRow key={s.sessaoId} sessao={s} isFirst={i === 0} />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function SessaoSeriesRow({ sessao, isFirst }: { sessao: SessaoExercicioEvolucao; isFirst: boolean }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const dataStr = new Date(sessao.dataHoraInicio).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });

  // Agrupa séries com mesma carga+reps para exibição compacta: "80×10 (×3)"
  const seriesAgrupadas: { label: string; count: number }[] = [];
  for (const serie of sessao.series) {
    const label = `${serie.cargaKg}×${serie.repeticoes}`;
    const last = seriesAgrupadas[seriesAgrupadas.length - 1];
    if (last && last.label === label) {
      last.count += 1;
    } else {
      seriesAgrupadas.push({ label, count: 1 });
    }
  }

  return (
    <View style={[styles.sessaoRow, isFirst ? styles.sessaoRowFirst : null]}>
      <View style={styles.sessaoTopLine}>
        <Text style={styles.sessaoData}>{dataStr}</Text>
        {sessao.melhorOrm > 0 ? (
          <Text style={styles.sessaoOrm}>1RM ~{sessao.melhorOrm} kg</Text>
        ) : null}
      </View>
      {sessao.series.length > 0 ? (
        <View style={styles.seriesChips}>
          {seriesAgrupadas.map(({ label, count }, i) => (
            <View key={i} style={styles.serieChip}>
              <Text style={styles.serieChipText}>
                {count > 1 ? `${count}× ${label}` : label}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.semSeries}>Sem series validas</Text>
      )}
    </View>
  );
}

type ChartMode = 'orm' | 'volume';

interface ChartToggleProps {
  ormPoints: { value: number; label: string }[];
  volumePoints: { value: number; label: string }[];
}

function ChartToggle({ ormPoints, volumePoints }: ChartToggleProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<ChartMode>('orm');

  const hasOrm = ormPoints.length >= 2;
  const hasVolume = volumePoints.length >= 2;

  if (!hasOrm && !hasVolume) return null;

  const activePoints = mode === 'orm' ? ormPoints : volumePoints;
  const activeColor = mode === 'orm' ? undefined : c.success;
  const activeFormat = mode === 'orm'
    ? (v: number) => `${v} kg`
    : (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartToggleRow}>
        {hasOrm ? (
          <Pressable
            onPress={() => setMode('orm')}
            style={[styles.chartToggleBtn, mode === 'orm' ? styles.chartToggleBtnActive : null]}
          >
            <Text style={[styles.chartToggleBtnText, mode === 'orm' ? styles.chartToggleBtnTextActive : null]}>
              1RM estimado
            </Text>
          </Pressable>
        ) : null}
        {hasVolume ? (
          <Pressable
            onPress={() => setMode('volume')}
            style={[styles.chartToggleBtn, mode === 'volume' ? styles.chartToggleBtnActiveVolume : null]}
          >
            <Text style={[styles.chartToggleBtnText, mode === 'volume' ? styles.chartToggleBtnTextActive : null]}>
              Volume total
            </Text>
          </Pressable>
        ) : null}
      </View>
      <LineChart
        points={activePoints}
        color={activeColor}
        height={110}
        formatValue={activeFormat}
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center' },
    backButton: { paddingVertical: 8, paddingRight: 12 },
    backButtonPressed: { opacity: 0.6 },
    backButtonText: { color: c.accent, fontSize: 15, fontWeight: '700' },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 26, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 14, lineHeight: 20 },
    loader: { marginTop: 40 },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 18, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    errorText: { color: c.error, fontSize: 14, fontWeight: '600' },
    emptyText: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    // Card header
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
    cardChevron: { color: c.textSecondary, fontSize: 10, fontWeight: '700' },
    collapsedHint: { color: c.accent, fontSize: 12, fontWeight: '600', marginTop: 3 },
    exercicioNome: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    exercicioMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    sessaoCount: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    trendUp: { color: c.success, fontSize: 16, fontWeight: '800' },
    trendDown: { color: c.error, fontSize: 16, fontWeight: '800' },
    trendEqual: { color: c.textSecondary, fontSize: 16, fontWeight: '800' },
    // Summary pills
    summaryRow: { flexDirection: 'row', gap: 10 },
    summaryItem: { flex: 1, backgroundColor: c.cardAlt, borderRadius: 12, padding: 10, alignItems: 'center' },
    summaryLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { color: c.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 4 },
    summaryDiff: { fontSize: 15, fontWeight: '800', marginTop: 4 },
    diffUp: { color: c.success },
    diffDown: { color: c.error },
    diffEqual: { color: c.textSecondary },
    // Chart toggle
    chartContainer: { gap: 10 },
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
    // Sessions list
    sessoesList: { gap: 8 },
    sessaoRow: {
      backgroundColor: c.cardAlt,
      borderRadius: 14,
      padding: 12,
      gap: 8,
    },
    sessaoRowFirst: {
      borderWidth: 1.5,
      borderColor: c.accent,
    },
    sessaoTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sessaoData: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    sessaoOrm: { color: c.accent, fontSize: 12, fontWeight: '700' },
    seriesChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    serieChip: {
      backgroundColor: c.card,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    serieChipText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
    semSeries: { color: c.textSecondary, fontSize: 12 },
  });
}
