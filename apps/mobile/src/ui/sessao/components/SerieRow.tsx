import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SerieComSegmentos } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { SerieSegmentoPrimitives } from '../../../domain/sessoes/entities/SerieSegmento';
import { formatCarga } from '../../shared/components/sessionSeriesTableModel';
import { useT } from '../../shared/i18n';
import type { AppLocale } from '../../shared/i18n/core';
import { useTheme } from '../../shared/theme';
import { formatSerieMetric } from '../presenters/segmentosPresentation';

import type { DegrauFormFieldsState } from './DegrauForm';
import { DegrauForm } from './DegrauForm';

type Styles = ReturnType<typeof makeStyles>;

interface SerieMetricContentProps {
  serie: SerieComSegmentos;
  trackingType: string;
  isBest: boolean;
  locale: AppLocale;
  styles: Styles;
}

/** Carga×reps (reps_load) ou o label adaptado ao trackingType — extraído para manter SerieRow abaixo do teto de complexidade. */
function SerieMetricContent({ serie, trackingType, isBest, locale, styles }: SerieMetricContentProps) {
  if (trackingType !== 'reps_load' || serie.cargaKg == null || serie.repeticoes == null) {
    return (
      <Text style={[styles.serieLabel, isBest ? styles.serieLabelBest : null]}>
        {formatSerieMetric(serie, trackingType, locale)}
      </Text>
    );
  }
  return (
    <View style={styles.serieMetricRow}>
      <View style={styles.serieMetricCellRight}>
        <Text style={[styles.serieValue, isBest ? styles.serieValueBest : null]}>
          {formatCarga(serie.cargaKg, locale)}
        </Text>
        <Text style={styles.serieUnit}> kg</Text>
      </View>
      <Text style={styles.serieTimes}>×</Text>
      <View style={styles.serieMetricCellLeft}>
        <Text style={[styles.serieValue, isBest ? styles.serieValueBest : null]}>{serie.repeticoes}</Text>
        <Text style={styles.serieUnit}> reps</Text>
      </View>
    </View>
  );
}

export interface DegrauChipProps {
  segmento: SerieSegmentoPrimitives;
  ordemExibicao: number;
  realizado: boolean;
  locale: AppLocale;
  onRemoverSegmento: (segmentoId: string) => void;
}

/**
 * Um degrau como chip próprio "50×6 ✕" — distinguível do ✕ que apaga a série-mãe
 * (achado #5, r1). Auto-contido (própria `useTheme`) para ser reusável fora de
 * `SerieRow` — usado também no BiSet (achado #2, r2), onde antes os ✕ ficavam
 * soltos após a pilha textual em vez de colados a cada degrau.
 */
export function DegrauChip({ segmento, ordemExibicao, realizado, locale, onRemoverSegmento }: DegrauChipProps) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeChipStyles(c), [c]);
  return (
    <View style={styles.degrauChip}>
      <Text style={styles.degrauChipText}>
        {segmento.cargaKg != null && segmento.repeticoes != null
          ? `${formatCarga(segmento.cargaKg, locale)}×${segmento.repeticoes}`
          : '-'}
      </Text>
      {!realizado ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sessao.degrau.removerN', {
            n: ordemExibicao,
            carga: segmento.cargaKg ?? 0,
            reps: segmento.repeticoes ?? 0,
          })}
          onPress={() => onRemoverSegmento(segmento.id)}
          style={({ pressed }) => [styles.degrauChipRemove, pressed ? { opacity: 0.5 } : null]}
        >
          <Text style={styles.degrauChipRemoveText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface DegrauSectionProps {
  podeAdicionarDegrau: boolean;
  degrauAberto: boolean;
  degrauForm: DegrauFormFieldsState;
  titulo: string;
  onAbrirDegrau: () => void;
  onFecharDegrau: () => void;
  onConfirmarDegrau: () => void;
  styles: Styles;
}

/** Form inline do próximo degrau ou o botão "+ degrau" — extraído para manter SerieRow abaixo do teto de complexidade. */
function DegrauSection({
  podeAdicionarDegrau,
  degrauAberto,
  degrauForm,
  titulo,
  onAbrirDegrau,
  onFecharDegrau,
  onConfirmarDegrau,
  styles,
}: DegrauSectionProps) {
  const t = useT();
  if (!podeAdicionarDegrau) return null;
  if (degrauAberto) {
    return (
      <DegrauForm titulo={titulo} form={degrauForm} showDescanso={false} onConfirm={onConfirmarDegrau} onCancel={onFecharDegrau} />
    );
  }
  return (
    <Pressable
      onPress={onAbrirDegrau}
      accessibilityRole="button"
      accessibilityLabel={t('sessao.degrau.adicionar')}
      style={({ pressed }) => [styles.addDegrauBtn, pressed ? { opacity: 0.7 } : null]}
    >
      <Text style={styles.addDegrauBtnText}>{t('sessao.degrau.adicionar')}</Text>
    </Pressable>
  );
}

interface Props {
  serie: SerieComSegmentos;
  index: number;
  isBest: boolean;
  trackingType: string;
  realizado: boolean;
  locale: AppLocale;
  deleting: boolean;
  onLongPress: () => void;
  onDelete: () => void;
  onRemoverSegmento: (segmentoId: string) => void;
  podeAdicionarDegrau: boolean;
  degrauAberto: boolean;
  degrauForm: DegrauFormFieldsState;
  onAbrirDegrau: () => void;
  onFecharDegrau: () => void;
  onConfirmarDegrau: () => void;
}

/**
 * Uma linha de série registrada: métrica + degraus (cada um com seu próprio ✕,
 * distinguível do ✕ que apaga a série-mãe — achado #5) + "+ degrau" inline.
 * Extraído de SeriesRegistradasList (achado #4 — complexidade do map).
 */
export function SerieRow({
  serie,
  index,
  isBest,
  trackingType,
  realizado,
  locale,
  deleting,
  onLongPress,
  onDelete,
  onRemoverSegmento,
  podeAdicionarDegrau,
  degrauAberto,
  degrauForm,
  onAbrirDegrau,
  onFecharDegrau,
  onConfirmarDegrau,
}: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const segmentosOrdenados = serie.segmentos ? [...serie.segmentos].sort((a, b) => a.ordem - b.ordem) : [];

  return (
    <View style={[styles.serieRow, isBest ? styles.serieRowBest : null]}>
      <View style={styles.serieMainRow}>
        <View style={[styles.serieBadge, isBest ? styles.serieBadgeBest : null]}>
          <Text style={[styles.serieBadgeText, isBest ? styles.serieBadgeTextBest : null]}>{index + 1}</Text>
        </View>
        <Pressable style={styles.serieMetricPressable} onLongPress={onLongPress}>
          <SerieMetricContent serie={serie} trackingType={trackingType} isBest={isBest} locale={locale} styles={styles} />
          {serie.observacao ? <Text style={styles.serieObs}>{serie.observacao}</Text> : null}
        </Pressable>
        {isBest ? <Text style={styles.serieBestStar}>★</Text> : null}
        {!realizado ? (
          <Pressable
            disabled={deleting}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={t('sessao.a11y.removerSerie', { n: index + 1 })}
            style={({ pressed }) => [styles.deleteSerieBtn, pressed || deleting ? { opacity: 0.4 } : null]}
          >
            <Text style={styles.deleteSerieBtnText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {segmentosOrdenados.length > 0 ? (
        <View style={styles.degrausRow}>
          {segmentosOrdenados.map((segmento, idx) => (
            <DegrauChip
              key={segmento.id}
              segmento={segmento}
              ordemExibicao={idx + 2}
              realizado={realizado}
              locale={locale}
              onRemoverSegmento={onRemoverSegmento}
            />
          ))}
        </View>
      ) : null}

      <DegrauSection
        podeAdicionarDegrau={podeAdicionarDegrau}
        degrauAberto={degrauAberto}
        degrauForm={degrauForm}
        titulo={t('sessao.degrau.titulo', { n: segmentosOrdenados.length + 2 })}
        onAbrirDegrau={onAbrirDegrau}
        onFecharDegrau={onFecharDegrau}
        onConfirmarDegrau={onConfirmarDegrau}
        styles={styles}
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    serieRow: { gap: 6, backgroundColor: c.cardAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
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
    degrausRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 36 },
    addDegrauBtn: { alignSelf: 'flex-start', marginLeft: 36, paddingHorizontal: 10, paddingVertical: 4 },
    addDegrauBtnText: { color: c.accent, fontSize: 12, fontWeight: '700' },
  });
}

function makeChipStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    degrauChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.card,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    degrauChipText: { color: c.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
    degrauChipRemove: { padding: 2 },
    degrauChipRemoveText: { color: c.error, fontSize: 11, fontWeight: '700' },
  });
}
