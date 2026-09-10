import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SessionSeriesTable } from '../../shared/components/SessionSeriesTable';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useT } from '../../shared/i18n';
import { LineChart } from '../../shared/LineChart';
import { useTheme } from '../../shared/theme';
import type { HistoricoExercicioControllerState } from '../hooks/useHistoricoExercicioController';

export function HistoricoExercicioScreen({
  viewModel,
  isLoading,
  errorMessage,
  onRetry,
  onBack,
}: HistoricoExercicioControllerState) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [pressed ? styles.backPressed : null]}>
          <Text style={styles.backText}>{t('common.backArrow')}</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('historico.exercicio.eyebrow')}</Text>
        <Text style={styles.title}>{viewModel.exercicioNome}</Text>
      </View>

      {!isLoading && viewModel.plateau ? (
        <View style={styles.plateauBanner}>
          <Text style={styles.plateauTitle}>{t('historico.exercicio.plateauTitle')}</Text>
          <Text style={styles.plateauText}>{viewModel.plateau.mensagem}</Text>
        </View>
      ) : null}

      {!isLoading && viewModel.rm1ChartPoints.length >= 1 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('historico.exercicio.chartTitle')}</Text>
          <LineChart
            points={viewModel.rm1ChartPoints}
            formatValue={(v) => `${v} kg`}
            markMax
          />
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator size="large" color={c.accent} style={styles.loading} />
      ) : errorMessage ? (
        // Erro NÃO pode cair no empty state: "sem histórico" para um exercício
        // que tem histórico induzia o usuário ao erro, sem como tentar de novo.
        <View style={styles.card}>
          <Text style={styles.emptyState}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => { void onRetry(); }}
            style={({ pressed }) => [styles.retryButton, pressed ? { opacity: 0.8 } : null]}
          >
            <Text style={styles.retryButtonText}>{t('historico.errors.retry')}</Text>
          </Pressable>
        </View>
      ) : viewModel.emptyStateMessage ? (
        <View style={styles.card}>
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.execucoesTitle}>{t('historico.exercicio.execucoesTitle')}</Text>
          <SessionSeriesTable rows={viewModel.sessionRows} showVolume />
        </View>
      )}
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
    plateauBanner: {
      backgroundColor: c.warningBg,
      borderRadius: 24,
      padding: 18,
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
    retryButton: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
    retryButtonText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
    execucoesTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
  });
}
