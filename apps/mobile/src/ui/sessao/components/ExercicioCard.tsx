import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { ExerciseMediaViewer } from '../../exercises/components/ExerciseMediaViewer';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { resolveThumbSource } from '../../shared/exerciseMedia';
import { METODO_CONFIG, metodoLabel } from '../../shared/metodoPresentation';
import { useTheme } from '../../shared/theme';
import { useLocale, useT } from '../../shared/i18n';

interface Props {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  mediaLocal?: string | null;
  mediaOnline?: string | null;
  onPress: () => void;
  onToggleRealizado?: () => void;
  hideProgress?: boolean;
}

const MAX_DOTS = 8;

export function ExercicioCard({ sessaoExercicio, series, mediaLocal, mediaOnline, onPress, onToggleRealizado, hideProgress }: Props) {
  const c = useTheme();
  const locale = useLocale();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const finalizado = sessaoExercicio.realizado;
  const validCount = series.length;
  const total = sessaoExercicio.seriesRecomendadas;
  const metodoConfig = sessaoExercicio.metodo !== 'normal' ? METODO_CONFIG[sessaoExercicio.metodo] : null;
  const metodoConfigLabel = sessaoExercicio.metodo !== 'normal' ? metodoLabel(sessaoExercicio.metodo, locale) : null;

  const allDone = total != null && validCount >= total;
  const dotCount = total != null ? Math.min(total, MAX_DOTS) : 0;
  const overflow = total != null && total > MAX_DOTS ? total - MAX_DOTS : 0;

  const gifSource = resolveThumbSource(mediaLocal);
  const [mediaVisible, setMediaVisible] = useState(false);
  const [confirmConcluirVisible, setConfirmConcluirVisible] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, finalizado ? styles.cardFinalizado : null, pressed ? { opacity: 0.8 } : null]}
    >
      {gifSource ? (
        <Pressable onPress={() => setMediaVisible(true)} hitSlop={4} style={styles.thumbnailWrap}>
          <Image source={gifSource} style={styles.thumbnail} contentFit="cover" autoplay={false} cachePolicy="memory-disk" />
          <View style={styles.thumbnailOverlay}>
            <Text style={styles.thumbnailPlayIcon}>▶</Text>
          </View>
        </Pressable>
      ) : null}
      <ExerciseMediaViewer
        visible={mediaVisible}
        exercicioNome={sessaoExercicio.nomeSnapshot}
        mediaOnline={mediaOnline ?? null}
        mediaLocal={mediaLocal ?? null}
        onClose={() => setMediaVisible(false)}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{sessaoExercicio.nomeSnapshot}</Text>
        <Text style={styles.meta}>
          {sessaoExercicio.grupoMuscularSnapshot} · {sessaoExercicio.categoriaSnapshot}
        </Text>
        {metodoConfig ? (
          <View style={[styles.metodoBadge, { backgroundColor: metodoConfig.color }]}>
            <Text style={styles.metodoBadgeText}>{metodoConfigLabel}</Text>
          </View>
        ) : null}
        {sessaoExercicio.nomeOriginalSnapshot ? (
          <Text style={styles.substituicaoBadge} numberOfLines={1}>
            ↔ {sessaoExercicio.nomeOriginalSnapshot}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {!hideProgress ? (
          total != null ? (
            <View style={styles.progressCol}>
              <View style={styles.dotsRow}>
                {Array.from({ length: dotCount }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i < validCount ? (allDone ? styles.dotDone : styles.dotFilled) : styles.dotEmpty]}
                  />
                ))}
                {overflow > 0 ? (
                  <Text style={styles.dotOverflow}>+{overflow}</Text>
                ) : null}
              </View>
              <Text style={[styles.seriesLabel, allDone ? styles.seriesLabelDone : null]}>
                {validCount}/{total} {t('sessao.card.seriesSuffix')}
              </Text>
            </View>
          ) : (
            <Text style={[styles.seriesCount, validCount > 0 ? styles.seriesCountDone : null]}>
              {validCount > 0 ? t('common.seriesCount', { count: validCount }) : t('sessao.card.semSeries')}
            </Text>
          )
        ) : null}
        {onToggleRealizado ? (
          <Pressable
            onPress={() => {
              if (finalizado) {
                onToggleRealizado();
              } else {
                setConfirmConcluirVisible(true);
              }
            }}
            style={({ pressed }) => [
              styles.checkBtn,
              finalizado ? styles.checkBtnDone : styles.checkBtnPending,
              pressed ? { opacity: 0.7 } : null,
            ]}
            hitSlop={8}
          >
            <Text style={[styles.checkBtnText, finalizado ? styles.checkBtnTextDone : styles.checkBtnTextPending]}>
              {finalizado ? '✓' : ''}
            </Text>
          </Pressable>
        ) : (
          finalizado ? <Text style={styles.finalizadoBadge}>✓</Text> : null
        )}
        <Text style={styles.arrow}>›</Text>
      </View>

      {onToggleRealizado ? (
        <ConfirmDialog
          visible={confirmConcluirVisible}
          title={t('sessao.card.concluirTitle')}
          message={t('sessao.card.concluirMessage', { nome: sessaoExercicio.nomeSnapshot })}
          confirmLabel={t('sessao.common.concluir')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            setConfirmConcluirVisible(false);
            onToggleRealizado();
          }}
          onCancel={() => setConfirmConcluirVisible(false)}
        />
      ) : null}
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    thumbnailWrap: { width: 52, height: 52, flexShrink: 0 },
    thumbnail: { width: 52, height: 52, borderRadius: 10, backgroundColor: c.cardAlt },
    thumbnailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.30)', alignItems: 'center', justifyContent: 'center' },
    thumbnailPlayIcon: { color: '#fff', fontSize: 11, fontWeight: '800' },
    cardFinalizado: { opacity: 0.55 },
    info: { flex: 1, gap: 3 },
    name: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    meta: { color: c.textSecondary, fontSize: 13 },
    metodoBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
    metodoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    substituicaoBadge: { color: c.accent, fontSize: 11, fontWeight: '600' },
    right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressCol: { alignItems: 'flex-end', gap: 4 },
    dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    dotFilled: { backgroundColor: c.accent },
    dotDone: { backgroundColor: c.success },
    dotEmpty: { backgroundColor: c.cardBorder },
    dotOverflow: { color: c.textSecondary, fontSize: 10, fontWeight: '700' },
    seriesLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    seriesLabelDone: { color: c.success },
    seriesCount: { color: c.textLabel, fontSize: 13, fontWeight: '600' },
    seriesCountDone: { color: c.accent },
    finalizadoBadge: { color: c.accent, fontSize: 15, fontWeight: '800' },
    checkBtn: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    checkBtnPending: { borderColor: c.cardBorder, backgroundColor: 'transparent' },
    checkBtnDone: { borderColor: c.success, backgroundColor: c.success },
    checkBtnText: { fontSize: 14, fontWeight: '800' },
    checkBtnTextPending: { color: c.textLabel },
    checkBtnTextDone: { color: '#fff' },
    arrow: { color: c.textLabel, fontSize: 20, fontWeight: '300' },
  });
}
