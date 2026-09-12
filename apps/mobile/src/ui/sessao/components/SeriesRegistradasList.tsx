import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SerieComSegmentos } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { RegistrarSegmentoInput } from '../../../application/sessoes/use-cases/RegistrarSegmentoUseCase';
import { parseDecimalInput } from '../../../shared/utils/parseDecimalInput';
import { useT } from '../../shared/i18n';
import type { AppLocale } from '../../shared/i18n/core';
import { formatNumber } from '../../shared/i18n/formatters';
import { useTheme } from '../../shared/theme';
import { useDegrauForm } from '../hooks/useDegrauForm';
import { volumeComDegraus } from '../presenters/segmentosPresentation';

import { SerieEditor } from './SerieEditor';
import { SerieRow } from './SerieRow';

const KG_VALUES = Array.from({ length: 81 }, (_, i) => i * 2.5);

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
        {series.map((serie, i) =>
          editingSerieId === serie.id ? (
            <SerieEditor
              key={serie.id}
              editKg={editKg}
              editReps={editReps}
              editKgText={editKgText}
              onChangeEditKgText={(text) => {
                setEditKgText(text);
                const num = parseDecimalInput(text);
                if (Number.isFinite(num) && num >= 0) setEditKg(num);
              }}
              onChangeEditKg={setEditKg}
              onChangeEditReps={setEditReps}
              formatKgItem={formatKgItem}
              formatRepsItem={formatRepsItem}
              onSave={() => {
                void onUpdateSerie({ serieId: serie.id, cargaKg: editKg, repeticoes: editReps }).then(() =>
                  setEditingSerieId(null),
                );
              }}
              onCancel={() => setEditingSerieId(null)}
            />
          ) : (
            <SerieRow
              key={serie.id}
              serie={serie}
              index={i}
              isBest={serie.id === bestSerieId}
              trackingType={trackingType}
              realizado={realizado}
              locale={locale}
              deleting={deletingSerieIds.has(serie.id)}
              onLongPress={() => {
                if (!realizado && trackingType === 'reps_load' && serie.cargaKg != null && serie.repeticoes != null) {
                  setEditingSerieId(serie.id);
                  setEditKg(serie.cargaKg);
                  setEditReps(serie.repeticoes);
                  setEditKgText(serie.cargaKg % 2.5 !== 0 ? String(serie.cargaKg) : null);
                }
              }}
              onDelete={() => {
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
              onRemoverSegmento={(id) => { void onRemoverSegmento(id); }}
              podeAdicionarDegrau={podeAdicionarDegrau}
              degrauAberto={degrauAbertoSerieId === serie.id}
              degrauForm={degrauForm}
              onAbrirDegrau={() => abrirDegrau(serie.id)}
              onFecharDegrau={() => setDegrauAbertoSerieId(null)}
              onConfirmarDegrau={() => confirmarDegrau(serie.id)}
            />
          ),
        )}
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
  });
}
