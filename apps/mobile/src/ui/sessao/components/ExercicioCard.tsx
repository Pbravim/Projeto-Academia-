import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { gifAssets } from '../../exercises/components/gifAssets';
import { useTheme } from '../../shared/theme';

interface Props {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  mediaLocal?: string | null;
  onPress: () => void;
  onToggleRealizado?: () => void;
  hideProgress?: boolean;
}

const METODO_CONFIG: Record<string, { label: string; color: string }> = {
  drop_set:   { label: 'Drop-set',   color: '#9333ea' },
  piramide:   { label: 'Piramide',   color: '#d97706' },
  rest_pause: { label: 'Rest-pause', color: '#e11d48' },
};

const MAX_DOTS = 8;

export function ExercicioCard({ sessaoExercicio, series, mediaLocal, onPress, onToggleRealizado, hideProgress }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const finalizado = sessaoExercicio.realizado;
  const validCount = series.filter((s) => s.tipoSerie === 'valida').length;
  const total = sessaoExercicio.seriesRecomendadas;
  const metodoConfig = sessaoExercicio.metodo !== 'normal' ? METODO_CONFIG[sessaoExercicio.metodo] : null;

  const allDone = total != null && validCount >= total;
  const dotCount = total != null ? Math.min(total, MAX_DOTS) : 0;
  const overflow = total != null && total > MAX_DOTS ? total - MAX_DOTS : 0;

  const gifSource = mediaLocal ? (gifAssets[mediaLocal] ?? null) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, finalizado ? styles.cardFinalizado : null, pressed ? { opacity: 0.8 } : null]}
    >
      {gifSource ? (
        <Image
          source={gifSource}
          style={styles.thumbnail}
          contentFit="cover"
          autoplay={false}
        />
      ) : null}
      <View style={styles.info}>
        <Text style={styles.name}>{sessaoExercicio.nomeSnapshot}</Text>
        <Text style={styles.meta}>
          {sessaoExercicio.grupoMuscularSnapshot} · {sessaoExercicio.categoriaSnapshot}
        </Text>
        {metodoConfig ? (
          <View style={[styles.metodoBadge, { backgroundColor: metodoConfig.color }]}>
            <Text style={styles.metodoBadgeText}>{metodoConfig.label}</Text>
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
                {validCount}/{total} series
              </Text>
            </View>
          ) : (
            <Text style={[styles.seriesCount, validCount > 0 ? styles.seriesCountDone : null]}>
              {validCount > 0 ? `${validCount} serie${validCount !== 1 ? 's' : ''}` : 'Sem series'}
            </Text>
          )
        ) : null}
        {onToggleRealizado ? (
          <Pressable
            onPress={() => {
              if (finalizado) {
                onToggleRealizado();
              } else {
                Alert.alert(
                  'Concluir exercicio',
                  `Marcar "${sessaoExercicio.nomeSnapshot}" como concluido?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Concluir', onPress: onToggleRealizado },
                  ]
                );
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
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    thumbnail: { width: 52, height: 52, borderRadius: 10, backgroundColor: c.cardAlt },
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
