import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SerieComSegmentos } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { RegistrarSegmentoInput } from '../../../application/sessoes/use-cases/RegistrarSegmentoUseCase';
import { parseDecimalInput } from '../../../shared/utils/parseDecimalInput';
import { formatCarga } from '../../shared/components/sessionSeriesTableModel';
import { useT } from '../../shared/i18n';
import type { AppLocale } from '../../shared/i18n/core';
import { formatNumber } from '../../shared/i18n/formatters';
import { useTheme } from '../../shared/theme';
import { useDegrauForm } from '../hooks/useDegrauForm';
import { formatDegrausStack, formatSerieMetric, volumeComDegraus } from '../presenters/segmentosPresentation';

import { DegrauForm } from './DegrauForm';
import { PickerCarousel } from './PickerCarousel';

const KG_VALUES = Array.from({ length: 81 }, (_, i) => i * 2.5);

function kgIndexFor(kg: number): number {
  return Math.max(0, Math.min(Math.round(kg / 2.5), KG_VALUES.length - 1));
}

interface Props {
  series: SerieComSegmentos[];
  trackingType: string;
  realizado: boolean;
  bestSerieId: string | null;
  locale: AppLocale;
  onDeleteSerie: (id: string) => Promise<void>;
  onUpdateSerie: (input: { serieId: string; cargaKg: number; repeticoes: number }) => Promise<void>;
  onRegistrarSegmento: (input: RegistrarSegmentoInput) => Promise<boolean>;
  onRemoverSegmento: (id: string) => Promise<void>;
}

/** Cabeçalho + lista de séries registradas, com editor inline e "+ degrau" por série. */
export function SeriesRegistradasList({
  series,
  trackingType,
  realizado,
  bestSerieId,
  locale,
  onDeleteSerie,
  onUpdateSerie,
  onRegistrarSegmento,
  onRemoverSegmento,
}: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [editingSerieId, setEditingSerieId] = useState<string | null>(null);
  const [editKg, setEditKg] = useState(0);
  const [editReps, setEditReps] = useState(0);
  const [editKgText, setEditKgText] = useState<string | null>(null);
  const [deletingSerieIds, setDeletingSerieIds] = useState<Set<string>>(new Set());
  const [degrauAbertoSerieId, setDegrauAbertoSerieId] = useState<string | null>(null);
  const degrauForm = useDegrauForm(locale);

  const formatKgItem = useCallback((i: number) => String(KG_VALUES[i]), []);
  const formatRepsItem = useCallback((i: number) => String(i + 1), []);

  if (series.length === 0) return null;

  const totalVolume = trackingType === 'reps_load'
    ? series.reduce((sum, s) => sum + volumeComDegraus(s, s.segmentos), 0)
    : 0;

  const podeAdicionarDegrau = trackingType === 'reps_load' && !realizado;

  const abrirDegrau = (serieId: string) => {
    degrauForm.reset();
    setDegrauAbertoSerieId(serieId);
  };

  const confirmarDegrau = (serieId: string) => {
    const input = degrauForm.toInput();
    if (!input) return;
    // Só fecha o form em sucesso — em erro o usuário não perde o que digitou (achado #12).
    void onRegistrarSegmento({ serieId, ...input }).then((ok) => {
      if (ok) setDegrauAbertoSerieId(null);
    });
  };

  return (
    <View style={styles.seriesCard}>
      <View style={styles.seriesHeader}>
        <Text style={styles.seriesTitle}>{t('sessao.detalhe.seriesRegistradasTitle')}</Text>
        <View style={styles.seriesSummaryChip}>
          <Text style={styles.seriesSummaryText}>
            {t('sessao.detalhe.seriesCount', { count: series.length })}
            {totalVolume > 0 ? ` · ${formatNumber(Math.round(totalVolume), locale)} kg` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.seriesList}>
        {series.map((serie, i) => {
          const isEditing = editingSerieId === serie.id;
          if (isEditing) {
            return (
              <View key={serie.id} style={[styles.serieRow, styles.serieRowEditing]}>
                <Text style={styles.serieLabel}>{t('sessao.detalhe.editandoSerie')}</Text>
                <View style={styles.editRow}>
                  <View style={styles.pickerCol}>
                    <Text style={styles.pickerLabel}>{t('sessao.common.cargaKgLabel')}</Text>
                    {editKgText !== null ? (
                      <TextInput
                        style={styles.editKgInput}
                        value={editKgText}
                        onChangeText={(text) => {
                          setEditKgText(text);
                          const num = parseDecimalInput(text);
                          if (Number.isFinite(num) && num >= 0) setEditKg(num);
                        }}
                        keyboardType="decimal-pad"
                        textAlign="center"
                      />
                    ) : (
                      <PickerCarousel
                        count={KG_VALUES.length}
                        selectedIndex={kgIndexFor(editKg)}
                        onChangeIndex={(idx) => setEditKg(KG_VALUES[idx])}
                        formatItem={formatKgItem}
                      />
                    )}
                  </View>
                  <View style={styles.pickerCol}>
                    <Text style={styles.pickerLabel}>{t('sessao.common.repsLabel')}</Text>
                    <PickerCarousel
                      count={30}
                      selectedIndex={Math.max(0, Math.min(editReps - 1, 29))}
                      onChangeIndex={(idx) => setEditReps(idx + 1)}
                      formatItem={formatRepsItem}
                    />
                  </View>
                </View>
                <View style={styles.editActionsRow}>
                  <Pressable
                    onPress={() => {
                      void onUpdateSerie({ serieId: serie.id, cargaKg: editKg, repeticoes: editReps }).then(() =>
                        setEditingSerieId(null),
                      );
                    }}
                    style={({ pressed }) => [styles.saveBtn, pressed ? { opacity: 0.85 } : null]}
                  >
                    <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingSerieId(null)}
                    style={({ pressed }) => [styles.cancelBtn, pressed ? { opacity: 0.75 } : null]}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }

          const isBest = serie.id === bestSerieId;
          const degrausLabel = formatDegrausStack(serie, serie.segmentos, locale);

          return (
            <View key={serie.id} style={[styles.serieRow, isBest ? styles.serieRowBest : null]}>
              <View style={styles.serieMainRow}>
                <View style={[styles.serieBadge, isBest ? styles.serieBadgeBest : null]}>
                  <Text style={[styles.serieBadgeText, isBest ? styles.serieBadgeTextBest : null]}>{i + 1}</Text>
                </View>
                <Pressable
                  style={styles.serieMetricPressable}
                  onLongPress={() => {
                    if (!realizado && trackingType === 'reps_load' && serie.cargaKg != null && serie.repeticoes != null) {
                      setEditingSerieId(serie.id);
                      setEditKg(serie.cargaKg);
                      setEditReps(serie.repeticoes);
                      setEditKgText(serie.cargaKg % 2.5 !== 0 ? String(serie.cargaKg) : null);
                    }
                  }}
                >
                  {trackingType === 'reps_load' && serie.cargaKg != null && serie.repeticoes != null ? (
                    <View style={styles.serieMetricRow}>
                      <View style={styles.serieMetricCellRight}>
                        <Text style={[styles.serieValue, isBest ? styles.serieValueBest : null]}>
                          {formatCarga(serie.cargaKg, locale)}
                        </Text>
                        <Text style={styles.serieUnit}> kg</Text>
                      </View>
                      <Text style={styles.serieTimes}>×</Text>
                      <View style={styles.serieMetricCellLeft}>
                        <Text style={[styles.serieValue, isBest ? styles.serieValueBest : null]}>
                          {serie.repeticoes}
                        </Text>
                        <Text style={styles.serieUnit}> reps</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.serieLabel, isBest ? styles.serieLabelBest : null]}>
                      {formatSerieMetric(serie, trackingType, locale)}
                    </Text>
                  )}
                  {serie.observacao ? <Text style={styles.serieObs}>{serie.observacao}</Text> : null}
                </Pressable>
                {isBest ? <Text style={styles.serieBestStar}>★</Text> : null}
                {!realizado ? (
                  <Pressable
                    disabled={deletingSerieIds.has(serie.id)}
                    onPress={() => {
                      void (async () => {
                        setDeletingSerieIds((prev) => new Set(prev).add(serie.id));
                        try {
                          await onDeleteSerie(serie.id);
                        } finally {
                          setDeletingSerieIds((prev) => {
                            const next = new Set(prev);
                            next.delete(serie.id);
                            return next;
                          });
                        }
                      })();
                    }}
                    style={({ pressed }) => [
                      styles.deleteSerieBtn,
                      pressed || deletingSerieIds.has(serie.id) ? { opacity: 0.4 } : null,
                    ]}
                  >
                    <Text style={styles.deleteSerieBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>

              {degrausLabel ? (
                <View style={styles.degrausRow}>
                  <Text style={styles.degrausLabel}>{degrausLabel}</Text>
                  {!realizado ? (
                    <View style={styles.degrausRemoveRow}>
                      {(serie.segmentos ?? []).map((segmento) => (
                        <Pressable
                          key={segmento.id}
                          accessibilityRole="button"
                          accessibilityLabel={t('sessao.degrau.remover')}
                          onPress={() => { void onRemoverSegmento(segmento.id); }}
                          style={({ pressed }) => [styles.degrauRemoveBtn, pressed ? { opacity: 0.5 } : null]}
                        >
                          <Text style={styles.degrauRemoveBtnText}>✕</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {podeAdicionarDegrau ? (
                degrauAbertoSerieId === serie.id ? (
                  <DegrauForm
                    titulo={t('sessao.degrau.titulo', { n: (serie.segmentos?.length ?? 0) + 2 })}
                    form={degrauForm}
                    showDescanso={false}
                    onConfirm={() => confirmarDegrau(serie.id)}
                    onCancel={() => setDegrauAbertoSerieId(null)}
                  />
                ) : (
                  <Pressable
                    onPress={() => abrirDegrau(serie.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('sessao.degrau.adicionar')}
                    style={({ pressed }) => [styles.addDegrauBtn, pressed ? { opacity: 0.7 } : null]}
                  >
                    <Text style={styles.addDegrauBtnText}>{t('sessao.degrau.adicionar')}</Text>
                  </Pressable>
                )
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    seriesCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    seriesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    seriesTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    seriesSummaryChip: { backgroundColor: c.cardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: c.cardBorder },
    seriesSummaryText: { color: c.textSecondary, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
    seriesList: { gap: 8 },
    serieRow: { gap: 6, backgroundColor: c.cardAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
    serieRowEditing: { alignItems: 'stretch' },
    serieMainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    serieMetricPressable: { flex: 1 },
    serieBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    serieBadgeBest: { backgroundColor: c.accent, borderColor: c.accent },
    serieBadgeText: { color: c.textSecondary, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
    serieBadgeTextBest: { color: c.accentText },
    serieMetricCellRight: { width: 76, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' },
    serieMetricCellLeft: { flexDirection: 'row', alignItems: 'baseline' },
    serieValue: { color: c.textPrimary, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
    serieValueBest: { color: c.accent },
    serieUnit: { color: c.textSecondary, fontSize: 11, fontWeight: '600' },
    serieBestStar: { color: c.accent, fontSize: 14, fontWeight: '800' },
    serieLabel: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
    serieMetricRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    serieTimes: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    serieLabelBest: { color: c.accent, fontWeight: '800' },
    serieRowBest: { borderWidth: 1, borderColor: c.accent },
    serieObs: { color: c.textSecondary, fontSize: 12, flexShrink: 1 },
    deleteSerieBtn: { padding: 4 },
    deleteSerieBtnText: { color: c.error, fontSize: 15, fontWeight: '700' },
    editRow: { flexDirection: 'row', gap: 12 },
    pickerCol: { flex: 1, gap: 6 },
    pickerLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    editKgInput: { height: 72, borderRadius: 14, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, color: c.inputText, fontSize: 30, fontWeight: '700' },
    editActionsRow: { flexDirection: 'row', gap: 8 },
    saveBtn: { flex: 1, backgroundColor: c.hero, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
    saveBtnText: { color: c.heroText, fontSize: 15, fontWeight: '800' },
    cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: c.success },
    cancelBtnText: { color: c.success, fontSize: 14, fontWeight: '700' },
    degrausRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 36 },
    degrausLabel: { color: c.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
    degrausRemoveRow: { flexDirection: 'row', gap: 6 },
    degrauRemoveBtn: { padding: 2 },
    degrauRemoveBtnText: { color: c.error, fontSize: 12, fontWeight: '700' },
    addDegrauBtn: { alignSelf: 'flex-start', marginLeft: 36, paddingHorizontal: 10, paddingVertical: 4 },
    addDegrauBtnText: { color: c.accent, fontSize: 12, fontWeight: '700' },
  });
}
