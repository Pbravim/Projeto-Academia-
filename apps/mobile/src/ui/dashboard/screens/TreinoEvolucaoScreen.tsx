import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ExercicioEvolucao } from '../../../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';
import { LineChart } from '../../shared/LineChart';
import { Sparkline } from '../../shared/Sparkline';
import { SessionSeriesTable } from '../../shared/components/SessionSeriesTable';
import {
  buildSessionTableRows,
  formatCarga,
  formatKgDelta,
} from '../../shared/components/sessionSeriesTableModel';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useTheme } from '../../shared/theme';

interface Props {
  treinoNome: string;
  exercicios: ExercicioEvolucao[];
  isLoading: boolean;
  errorMessage: string | null;
  onBack: () => void;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
        <Text style={styles.eyebrow}>Evolução por exercício</Text>
        <Text style={styles.title}>{treinoNome}</Text>
        <Text style={styles.description}>
          Toque em um exercício para ver gráficos e séries das últimas 10 sessões.
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
            Nenhuma sessão finalizada encontrada para este treino.
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

  const sessoes = exercicio.sessoes; // mais recente primeiro
  const sessoesAsc = useMemo(() => [...sessoes].reverse(), [sessoes]);

  const ormValues = sessoesAsc.map((s) => s.melhorOrm).filter((v) => v > 0);
  const temDados = ormValues.length > 0;

  const ormChartPoints = sessoesAsc
    .filter((s) => s.melhorOrm > 0)
    .map((s) => ({ value: s.melhorOrm, label: formatShortDate(s.dataHoraInicio) }));

  const volumeChartPoints = sessoesAsc
    .map((s) => ({
      value: s.series.reduce((sum, sr) => sum + (sr.cargaKg ?? 0) * (sr.repeticoes ?? 0), 0),
      label: formatShortDate(s.dataHoraInicio),
    }))
    .filter((p) => p.value > 0);

  const delta = ormValues.length >= 2
    ? formatKgDelta(ormValues[0], ormValues[ormValues.length - 1])
    : null;

  const ultima = sessoes[0];
  const penultima = sessoes[1] ?? null;
  const ormDiff =
    ultima && penultima && penultima.melhorOrm > 0 && ultima.melhorOrm > 0
      ? Math.round((ultima.melhorOrm - penultima.melhorOrm) * 10) / 10
      : null;

  const windowBest = Math.max(0, ...sessoes.map((s) => s.melhorOrm));
  const priorBest = Math.max(0, ...sessoes.slice(1).map((s) => s.melhorOrm));
  const isPr = sessoes.length >= 2 && ultima != null && ultima.melhorOrm > 0 && ultima.melhorOrm > priorBest;

  const tableRows = useMemo(
    () =>
      buildSessionTableRows(
        sessoes.map((s) => ({
          id: s.sessaoId,
          dateLabel: formatShortDate(s.dataHoraInicio),
          sets: s.series.map((sr) => ({ cargaKg: sr.cargaKg, repeticoes: sr.repeticoes })),
        })),
      ),
    [sessoes],
  );

  const plural = sessoes.length === 1 ? 'sessão' : 'sessões';

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.cardHeader, pressed ? { opacity: 0.7 } : null]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.exercicioNome}>{exercicio.exercicioNome}</Text>
          <Text style={styles.exercicioMeta}>{exercicio.groupMuscle}</Text>
          {!expanded && !(temDados && ormValues.length >= 2) ? (
            <Text style={styles.collapsedHint}>
              {temDados && ultima
                ? `1RM: ${formatCarga(ultima.melhorOrm)} kg · ${sessoes.length} ${plural}`
                : `${sessoes.length} ${plural}`}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardHeaderRight}>
          {!expanded && ormValues.length >= 2 ? (
            <View style={styles.sparkCol}>
              <Sparkline values={ormValues} />
              {delta ? (
                <Text
                  style={[
                    styles.deltaText,
                    delta.direction === 'up'
                      ? styles.deltaUp
                      : delta.direction === 'down'
                        ? styles.deltaDown
                        : styles.deltaFlat,
                  ]}
                >
                  {delta.label}
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.cardChevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <>
          {ultima && temDados ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryLabelRow}>
                  <Text style={styles.summaryLabel}>Melhor 1RM</Text>
                  {isPr ? (
                    <View style={styles.prTag}>
                      <Text style={styles.prTagText}>PR</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.summaryValue}>{formatCarga(windowBest)} kg</Text>
              </View>
              {ormDiff !== null ? (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>vs anterior</Text>
                  <Text
                    style={[
                      styles.summaryDiff,
                      ormDiff > 0 ? styles.diffUp : ormDiff < 0 ? styles.diffDown : styles.diffEqual,
                    ]}
                  >
                    {ormDiff > 0 ? `+${formatCarga(ormDiff)}` : ormDiff < 0 ? `−${formatCarga(Math.abs(ormDiff))}` : formatCarga(0)} kg
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Séries (últ.)</Text>
                <Text style={styles.summaryValue}>{ultima.series.length}</Text>
              </View>
            </View>
          ) : null}

          <ChartToggle ormPoints={ormChartPoints} volumePoints={volumeChartPoints} />

          {tableRows.length > 0 ? <SessionSeriesTable rows={tableRows} /> : null}
        </>
      ) : null}
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

  const hasOrm = ormPoints.length >= 1;
  const hasVolume = volumePoints.length >= 1;
  const [mode, setMode] = useState<ChartMode>(hasOrm ? 'orm' : 'volume');

  if (!hasOrm && !hasVolume) return null;

  const activePoints = mode === 'orm' ? ormPoints : volumePoints;
  const activeColor = mode === 'orm' ? undefined : c.success;
  const activeFormat = mode === 'orm'
    ? (v: number) => `${v} kg`
    : (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`);

  return (
    <View style={styles.chartContainer}>
      {hasOrm && hasVolume ? (
        <View style={styles.segmented}>
          <Pressable
            onPress={() => setMode('orm')}
            style={[styles.segment, mode === 'orm' ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, mode === 'orm' ? styles.segmentTextActive : null]}>
              1RM estimado
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('volume')}
            style={[styles.segment, mode === 'volume' ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, mode === 'volume' ? styles.segmentTextActive : null]}>
              Volume total
            </Text>
          </Pressable>
        </View>
      ) : null}
      <LineChart
        points={activePoints}
        color={activeColor}
        height={110}
        formatValue={activeFormat}
        markMax={mode === 'orm'}
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
    // Cabecalho do card
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardChevron: { color: c.textSecondary, fontSize: 10, fontWeight: '700' },
    collapsedHint: { color: c.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 3, fontVariant: ['tabular-nums'] },
    exercicioNome: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    exercicioMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    sparkCol: { alignItems: 'flex-end', gap: 2 },
    deltaText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
    deltaUp: { color: c.success },
    deltaDown: { color: c.error },
    deltaFlat: { color: c.textSecondary },
    // Pills de resumo
    summaryRow: { flexDirection: 'row', gap: 10 },
    summaryItem: { flex: 1, backgroundColor: c.cardAlt, borderRadius: 12, padding: 10, alignItems: 'center' },
    summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    summaryLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { color: c.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
    summaryDiff: { fontSize: 15, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
    diffUp: { color: c.success },
    diffDown: { color: c.error },
    diffEqual: { color: c.textSecondary },
    prTag: { backgroundColor: c.success, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
    prTagText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    // Grafico + controle segmentado
    chartContainer: { gap: 10 },
    segmented: { flexDirection: 'row', backgroundColor: c.cardAlt, borderRadius: 10, padding: 3, alignSelf: 'flex-start' },
    segment: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    segmentActive: { backgroundColor: c.hero },
    segmentText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
    segmentTextActive: { color: c.heroText },
  });
}
