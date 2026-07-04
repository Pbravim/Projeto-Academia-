import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { PlanoSemanal } from '../../../domain/plano/repositories/PlanoSemanalRepository';
import type { DiaSemana } from '../../../domain/plano/entities/DiaSemana';
import { DIAS_SEMANA, diaSemanaHoje } from '../../../domain/plano/entities/DiaSemana';
import { useTheme } from '../../shared/theme';
import { useT } from '../../shared/i18n';

interface Props {
  plano: PlanoSemanal;
  treinos: TreinoPrimitives[];
  isLoading: boolean;
  onSelectDia: (dia: DiaSemana) => void;
}

export function PlanoSemanalCard({ plano, treinos, isLoading, onSelectDia }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  const hoje = diaSemanaHoje();
  const treinoMap = useMemo(() => new Map(treinos.map((tr) => [tr.id, tr])), [treinos]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('treinos.plano.title')}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={c.accent} style={styles.loader} />
      ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {DIAS_SEMANA.map((dia) => {
          const treinoId = plano[dia];
          const treino = treinoId ? treinoMap.get(treinoId) : null;
          const isHoje = dia === hoje;

          return (
            <Pressable
              key={dia}
              onPress={() => onSelectDia(dia)}
              style={({ pressed }) => [
                styles.cell,
                isHoje ? styles.cellHoje : null,
                pressed ? styles.cellPressed : null,
              ]}
            >
              <Text style={[styles.dayLabel, isHoje ? styles.dayLabelHoje : null]}>
                {t(`treinos.plano.dia.${dia}`)}
              </Text>
              <View style={[styles.badge, treino ? styles.badgeFilled : styles.badgeEmpty]}>
                <Text
                  style={[styles.badgeText, treino ? styles.badgeTextFilled : styles.badgeTextEmpty]}
                  numberOfLines={1}
                >
                  {treino ? treino.name.substring(0, 3).toUpperCase() : '—'}
                </Text>
              </View>
              <Text style={[styles.treinoName, !treino ? styles.treinoNameEmpty : null]} numberOfLines={1}>
                {treino ? treino.name : t('treinos.plano.descansoAbrev')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    cardTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    loader: { marginVertical: 16 },
    row: { gap: 8, paddingBottom: 4 },
    cell: {
      alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10,
      borderRadius: 14, borderWidth: 1.5, borderColor: c.cardBorder,
      backgroundColor: c.cardAlt, minWidth: 58,
    },
    cellHoje: { borderColor: c.accent },
    cellPressed: { opacity: 0.7 },
    dayLabel: { color: c.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    dayLabelHoje: { color: c.accent },
    badge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    badgeFilled: { backgroundColor: c.accent },
    badgeEmpty: { backgroundColor: c.background, borderWidth: 1, borderColor: c.cardBorder },
    badgeText: { fontSize: 11, fontWeight: '800' },
    badgeTextFilled: { color: c.accentText },
    badgeTextEmpty: { color: c.textSecondary },
    treinoName: { color: c.textPrimary, fontSize: 10, fontWeight: '600', maxWidth: 58, textAlign: 'center' },
    treinoNameEmpty: { color: c.textSecondary },
  });
}
