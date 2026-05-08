import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { useTheme } from '../../shared/theme';

interface Props {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  onPress: () => void;
}

export function ExercicioCard({ sessaoExercicio, series, onPress }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const finalizado = sessaoExercicio.realizado;
  const validCount = series.filter((s) => s.tipoSerie === 'valida').length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, finalizado ? styles.cardFinalizado : null, pressed ? { opacity: 0.8 } : null]}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{sessaoExercicio.nomeSnapshot}</Text>
        <Text style={styles.meta}>
          {sessaoExercicio.grupoMuscularSnapshot} · {sessaoExercicio.categoriaSnapshot}
        </Text>
        {sessaoExercicio.nomeOriginalSnapshot ? (
          <Text style={styles.substituicaoBadge} numberOfLines={1}>
            ↔ {sessaoExercicio.nomeOriginalSnapshot}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={[styles.seriesCount, validCount > 0 ? styles.seriesCountDone : null]}>
          {validCount > 0 ? `${validCount} serie${validCount !== 1 ? 's' : ''}` : 'Sem series'}
        </Text>
        {finalizado ? <Text style={styles.finalizadoBadge}>✓</Text> : null}
        <Text style={styles.arrow}>›</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    cardFinalizado: { opacity: 0.55 },
    info: { flex: 1, gap: 3 },
    name: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    meta: { color: c.textSecondary, fontSize: 13 },
    substituicaoBadge: { color: c.accent, fontSize: 11, fontWeight: '600' },
    right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seriesCount: { color: c.textLabel, fontSize: 13, fontWeight: '600' },
    seriesCountDone: { color: c.accent },
    finalizadoBadge: { color: c.accent, fontSize: 15, fontWeight: '800' },
    arrow: { color: c.textLabel, fontSize: 20, fontWeight: '300' },
  });
}
