import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HistoricoExercicioControllerState } from '../hooks/useHistoricoExercicioController';
import type { ExecucaoHistoricoViewModel } from '../presenters/buildHistoricoExercicioViewModel';
import { LineChart } from '../../shared/LineChart';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useTheme } from '../../shared/theme';

export function HistoricoExercicioScreen({
  viewModel,
  isLoading,
  onBack,
}: HistoricoExercicioControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [pressed ? styles.backPressed : null]}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Histórico</Text>
        <Text style={styles.title}>{viewModel.exercicioNome}</Text>
      </View>

      {!isLoading && viewModel.plateau ? (
        <View style={styles.plateauBanner}>
          <Text style={styles.plateauTitle}>⚠ Plateau detectado</Text>
          <Text style={styles.plateauText}>{viewModel.plateau.mensagem}</Text>
        </View>
      ) : null}

      {!isLoading && viewModel.rm1ChartPoints.length >= 1 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Evolução do 1RM estimado</Text>
          {viewModel.rm1ChartPoints.length >= 2 ? (
            <LineChart
              points={viewModel.rm1ChartPoints}
              formatValue={(v) => `${v} kg`}
            />
          ) : (
            <Text style={styles.chartEmpty}>
              Faça mais sessões para visualizar a evolução em gráfico.
            </Text>
          )}
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator size="large" color={c.accent} style={styles.loading} />
      ) : viewModel.emptyStateMessage ? (
        <View style={styles.card}>
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        </View>
      ) : (
        viewModel.execucoes.map((execucao, index) => (
          <ExecucaoCard key={index} execucao={execucao} isFirst={index === 0} />
        ))
      )}
    </ScrollView>
  );
}

function ExecucaoCard({ execucao, isFirst }: { execucao: ExecucaoHistoricoViewModel; isFirst: boolean }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [expanded, setExpanded] = useState(isFirst);

  const seriesValidas = execucao.series.filter((s) => s.tipo === 'valida');
  const seriesAquec = execucao.series.filter((s) => s.tipo === 'aquecimento');

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.cardHeader, pressed ? { opacity: 0.7 } : null]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.execucaoData}>{execucao.data}</Text>
          {execucao.substituiuLabel ? (
            <Text style={styles.substituiuLabel}>{execucao.substituiuLabel}</Text>
          ) : null}
          <Text style={styles.execucaoVolume}>{execucao.volumeTotal}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.execucaoRm1}>{execucao.melhorRm1}</Text>
          <Text style={styles.cardChevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <>
          {/* Summary pills */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Volume</Text>
              <Text style={styles.summaryValue}>{execucao.volumeTotal}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Melhor 1RM</Text>
              <Text style={[styles.summaryValue, styles.summaryAccent]}>{execucao.melhorRm1}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Séries</Text>
              <Text style={styles.summaryValue}>{seriesValidas.length}</Text>
            </View>
          </View>

          {/* Warming-up chips */}
          {seriesAquec.length > 0 ? (
            <View style={styles.seriesGroup}>
              <Text style={styles.seriesGroupLabel}>Aquecimento</Text>
              <View style={styles.seriesChips}>
                {seriesAquec.map((serie) => (
                  <View key={serie.id} style={[styles.serieChip, styles.serieChipAquec]}>
                    <Text style={styles.serieChipTextAquec}>{serie.descricao}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Working set chips */}
          {seriesValidas.length > 0 ? (
            <View style={styles.seriesGroup}>
              <Text style={styles.seriesGroupLabel}>Séries</Text>
              <View style={styles.seriesChips}>
                {seriesValidas.map((serie) => (
                  <View key={serie.id} style={styles.serieChip}>
                    <Text style={styles.serieChipText}>{serie.descricao}</Text>
                    {serie.rm1Estimado ? (
                      <Text style={styles.serieRm1}>{serie.rm1Estimado}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {execucao.series.length === 0 ? (
            <Text style={styles.semSeries}>Sem séries registradas</Text>
          ) : null}
        </>
      ) : null}
    </View>
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
    loading: { marginTop: 40 },
    chartCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chartTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    chartEmpty: { color: c.textSecondary, fontSize: 13, lineHeight: 18 },
    plateauBanner: {
      backgroundColor: c.warningBg,
      borderRadius: 20,
      padding: 16,
      gap: 6,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    plateauTitle: { color: c.warning, fontSize: 14, fontWeight: '800' },
    plateauText: { color: c.warning, fontSize: 13, lineHeight: 18 },
    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 18,
      gap: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    emptyState: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    // Card header (same pattern as TreinoEvolucaoScreen)
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
    cardChevron: { color: c.textSecondary, fontSize: 10, fontWeight: '700' },
    execucaoData: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    substituiuLabel: { color: c.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
    execucaoVolume: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    execucaoRm1: { color: c.accent, fontSize: 13, fontWeight: '700' },
    // Summary pills (same as TreinoEvolucaoScreen)
    summaryRow: { flexDirection: 'row', gap: 10 },
    summaryItem: {
      flex: 1,
      backgroundColor: c.cardAlt,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
    },
    summaryLabel: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    summaryValue: { color: c.textPrimary, fontSize: 15, fontWeight: '800', marginTop: 4 },
    summaryAccent: { color: c.accent },
    // Series chips (same as TreinoEvolucaoScreen)
    seriesGroup: { gap: 8 },
    seriesGroupLabel: {
      color: c.textLabel,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    seriesChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    serieChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.cardAlt,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    serieChipAquec: {
      backgroundColor: c.background,
      borderColor: c.cardBorder,
    },
    serieChipText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
    serieChipTextAquec: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    serieRm1: { color: c.textLabel, fontSize: 11, fontWeight: '600' },
    semSeries: { color: c.textSecondary, fontSize: 12 },
  });
}
