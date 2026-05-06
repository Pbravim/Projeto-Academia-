import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PesoControllerState } from '../hooks/usePesoController';
import type { PesoChartPoint } from '../presenters/buildPesoViewModel';
import { useTheme } from '../../shared/theme';

export function PesoScreen({
  viewModel,
  pesoKgInput,
  observacaoInput,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  deletingId,
  onChangePesoKg,
  onChangeObservacao,
  onSubmit,
  onDelete,
}: PesoControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Acompanhamento</Text>
        <Text style={styles.title}>Peso corporal</Text>
        {viewModel.pesoAtual ? (
          <Text style={styles.pesoAtual}>{viewModel.pesoAtual} agora</Text>
        ) : null}
      </View>

      {viewModel.chartPoints.length >= 2 ? (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Evolucao</Text>
          <PesoLineChart points={viewModel.chartPoints} />
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Registrar peso</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Peso (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 80.5"
            placeholderTextColor={c.inputPlaceholder}
            value={pesoKgInput}
            onChangeText={onChangePesoKg}
            keyboardType="decimal-pad"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Observacao (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Em jejum"
            placeholderTextColor={c.inputPlaceholder}
            value={observacaoInput}
            onChangeText={onChangeObservacao}
            editable={!isSubmitting}
          />
        </View>

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {feedbackMessage ? <Text style={styles.successMessage}>{feedbackMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => { void onSubmit(); }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            isSubmitting ? styles.primaryButtonDisabled : null,
          ]}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Salvando...' : 'Registrar'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Historico</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color={c.accent} style={styles.loading} />
        ) : viewModel.emptyStateMessage ? (
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        ) : (
          viewModel.cards.map((card) => (
            <View key={card.id} style={styles.registroCard}>
              <View style={styles.registroMain}>
                <View>
                  <Text style={styles.registroPeso}>{card.peso}</Text>
                  <Text style={styles.registroData}>{card.data}</Text>
                  {card.observacao ? (
                    <Text style={styles.registroObservacao}>{card.observacao}</Text>
                  ) : null}
                </View>

                <View style={styles.registroRight}>
                  {card.delta ? (
                    <Text style={[styles.registroDelta, card.deltaPositivo ? styles.deltaNegativo : styles.deltaPositivo]}>
                      {card.delta}
                    </Text>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => { void onDelete(card.id); }}
                    disabled={deletingId !== null}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed ? styles.deleteButtonPressed : null,
                      deletingId === card.id ? styles.deleteButtonLoading : null,
                    ]}
                  >
                    <Text style={styles.deleteButtonText}>
                      {deletingId === card.id ? 'Excluindo...' : 'Excluir'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Line Chart ──────────────────────────────────────────────────────────────

const CHART_HEIGHT = 130;
const CHART_PAD_V = 18;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PAD_V * 2;
const PESO_CHART_WIDTH = Dimensions.get('window').width - 80;

function PesoLineChart({ points }: { points: PesoChartPoint[] }) {
  const c = useTheme();
  const chartStyles = useMemo(() => makeChartStyles(c), [c]);

  if (points.length < 2) return null;

  const chartWidth = PESO_CHART_WIDTH;
  const values = points.map((p) => p.pesoKg);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal === minVal ? 1 : maxVal - minVal;

  const getX = (i: number) => (i / (points.length - 1)) * chartWidth;
  const getY = (v: number) => CHART_PAD_V + (1 - (v - minVal) / range) * PLOT_HEIGHT;

  const segments: { cx: number; cy: number; length: number; angle: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const x1 = getX(i);   const y1 = getY(values[i]);
    const x2 = getX(i+1); const y2 = getY(values[i+1]);
    const dx = x2 - x1;   const dy = y2 - y1;
    segments.push({
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      length: Math.sqrt(dx * dx + dy * dy),
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
    });
  }

  const minLabel = `${minVal % 1 === 0 ? minVal : minVal.toFixed(1)} kg`;
  const maxLabel = `${maxVal % 1 === 0 ? maxVal : maxVal.toFixed(1)} kg`;

  return (
    <View style={[chartStyles.container, { width: chartWidth }]}>
      <View style={{ height: CHART_HEIGHT }}>
          {/* Linhas de grade */}
          {[0, 0.5, 1].map((t) => (
            <View
              key={t}
              style={[chartStyles.gridLine, { top: CHART_PAD_V + (1 - t) * PLOT_HEIGHT }]}
            />
          ))}

          {/* Segmentos de linha */}
          {segments.map((seg, i) => (
            <View
              key={i}
              style={[
                chartStyles.segment,
                {
                  left: seg.cx - seg.length / 2,
                  top: seg.cy - 1.5,
                  width: seg.length,
                  transform: [{ rotate: `${seg.angle}deg` }],
                },
              ]}
            />
          ))}

          {/* Pontos */}
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            return (
              <View
                key={i}
                style={[
                  chartStyles.dot,
                  isLast ? chartStyles.dotHighlight : null,
                  { left: getX(i) - (isLast ? 6 : 4), top: getY(p.pesoKg) - (isLast ? 6 : 4) },
                ]}
              />
            );
          })}
        </View>

      {/* Labels eixo X */}
      <View style={chartStyles.xAxis}>
        <Text style={chartStyles.axisLabel}>{points[0].label}</Text>
        {points.length > 2 ? <Text style={chartStyles.axisLabel}>{points[Math.floor((points.length - 1) / 2)].label}</Text> : null}
        <Text style={chartStyles.axisLabel}>{points[points.length - 1].label}</Text>
      </View>

      {/* Labels Y min/max */}
      <View style={[chartStyles.yLabel, { top: CHART_PAD_V - 8 }]}>
        <Text style={chartStyles.yLabelText}>{maxLabel}</Text>
      </View>
      {minVal !== maxVal ? (
        <View style={[chartStyles.yLabel, { top: CHART_PAD_V + PLOT_HEIGHT - 8 }]}>
          <Text style={chartStyles.yLabelText}>{minLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function makeChartStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { paddingTop: 4 },
    gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: c.cardBorder },
    segment: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: c.accent },
    dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
    dotHighlight: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent, borderWidth: 2.5, borderColor: c.card },
    xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    axisLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '600' },
    yLabel: { position: 'absolute', right: 0 },
    yLabelText: { color: c.textSecondary, fontSize: 10, fontWeight: '600', backgroundColor: c.card, paddingHorizontal: 2 },
  });
}

// ─────────────────────────────────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
      gap: 18,
    },
    heroCard: {
      backgroundColor: c.hero,
      borderRadius: 24,
      padding: 22,
      gap: 8,
    },
    eyebrow: {
      color: c.heroSubtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      color: c.heroText,
      fontSize: 30,
      fontWeight: '800',
    },
    pesoAtual: {
      color: c.heroSubtext,
      fontSize: 16,
      fontWeight: '600',
      marginTop: 4,
    },
    chartCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    formCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    listCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    sectionTitle: {
      color: c.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    field: {
      gap: 6,
    },
    fieldLabel: {
      color: c.textLabel,
      fontSize: 13,
      fontWeight: '700',
    },
    input: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 14,
      color: c.inputText,
      fontSize: 15,
    },
    errorMessage: {
      color: c.error,
      fontSize: 14,
      fontWeight: '600',
    },
    successMessage: {
      color: c.success,
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
    },
    primaryButtonPressed: {
      opacity: 0.9,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: c.accentText,
      fontSize: 15,
      fontWeight: '800',
    },
    loading: {
      marginVertical: 12,
    },
    emptyState: {
      color: c.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    registroCard: {
      backgroundColor: c.cardAlt,
      borderRadius: 16,
      padding: 14,
    },
    registroMain: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    registroPeso: {
      color: c.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    registroData: {
      color: c.textLabel,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    registroObservacao: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    registroRight: {
      alignItems: 'flex-end',
      gap: 8,
    },
    registroDelta: {
      fontSize: 14,
      fontWeight: '700',
    },
    deltaPositivo: {
      color: c.success,
    },
    deltaNegativo: {
      color: c.error,
    },
    deleteButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: c.errorBg,
    },
    deleteButtonLoading: { opacity: 0.5 },
    deleteButtonPressed: {
      opacity: 0.75,
    },
    deleteButtonText: {
      color: c.error,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}
