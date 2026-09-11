import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLocale, useT } from '../../shared/i18n';
import { formatFullDate, formatTime } from '../../shared/i18n/formatters';
import { LineChart } from '../../shared/LineChart';
import { useTheme } from '../../shared/theme';
import type { PesoControllerState } from '../hooks/usePesoController';
import type { PesoChartPoint } from '../presenters/buildPesoViewModel';

export function PesoScreen({
  viewModel,
  pesoKgInput,
  observacaoInput,
  selectedDate,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  deletingId,
  onChangePesoKg,
  onChangeObservacao,
  onChangeDate,
  onSubmit,
  onDelete,
}: PesoControllerState) {
  const c = useTheme();
  const locale = useLocale();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null);

  const now = new Date();
  const isToday = now.toDateString() === selectedDate.toDateString();
  const timeStr = formatTime(selectedDate, locale);
  const dateLabel = (isToday ? t('peso.form.hoje') : formatFullDate(selectedDate, locale)) + ', ' + timeStr;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('peso.eyebrow')}</Text>
        <Text style={styles.title}>{t('peso.title')}</Text>
        {viewModel.pesoAtual ? (
          <Text style={styles.pesoAtual}>{t('peso.pesoAtualAgora', { peso: viewModel.pesoAtual })}</Text>
        ) : null}
      </View>

      {viewModel.chartPoints.length >= 2 ? (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>{t('peso.evolucao')}</Text>
          <PesoLineChart points={viewModel.chartPoints} />
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{t('peso.registrarPeso')}</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('peso.form.pesoKgLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('peso.form.pesoPlaceholder')}
            placeholderTextColor={c.inputPlaceholder}
            value={pesoKgInput}
            onChangeText={onChangePesoKg}
            keyboardType="decimal-pad"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('peso.form.observacaoLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('peso.form.observacaoPlaceholder')}
            placeholderTextColor={c.inputPlaceholder}
            value={observacaoInput}
            onChangeText={onChangeObservacao}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('peso.form.dataHoraLabel')}</Text>
          <Pressable
            onPress={() => setPickerStep('date')}
            style={styles.dateTrigger}
            disabled={isSubmitting}
          >
            <Text style={[styles.dateTriggerText, !isToday ? styles.dateTriggerTextPast : null]}>
              {dateLabel}
            </Text>
            <Text style={styles.dateCalIcon}>📅</Text>
          </Pressable>

          {pickerStep !== null ? (
            Platform.OS === 'ios' ? (
              <DateTimePicker
                value={selectedDate}
                mode="datetime"
                display="spinner"
                maximumDate={now}
                onChange={(_event, date) => {
                  if (date) onChangeDate(date);
                }}
              />
            ) : (
              <DateTimePicker
                value={selectedDate}
                mode={pickerStep}
                display="default"
                maximumDate={pickerStep === 'date' ? now : undefined}
                onChange={(_event, date) => {
                  if (!date) { setPickerStep(null); return; }
                  onChangeDate(date);
                  setPickerStep(pickerStep === 'date' ? 'time' : null);
                }}
              />
            )
          ) : null}
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
            {isSubmitting ? t('peso.form.salvando') : t('peso.form.registrar')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>{t('peso.historico')}</Text>

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
                    <Text style={[styles.registroDelta, card.pesoAumentou ? styles.deltaNegativo : styles.deltaPositivo]}>
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
                      {deletingId === card.id ? t('peso.excluindo') : t('common.delete')}
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

function PesoLineChart({ points }: { points: PesoChartPoint[] }) {
  return (
    <LineChart
      points={points.map((p) => ({ value: p.pesoKg, label: p.label }))}
      formatValue={(v) => `${v % 1 === 0 ? String(v) : v.toFixed(1)} kg`}
    />
  );
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
    dateTrigger: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dateTriggerText: { color: c.inputText, fontSize: 15 },
    dateTriggerTextPast: { color: c.accent, fontWeight: '700' },
    dateCalIcon: { fontSize: 18 },
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
