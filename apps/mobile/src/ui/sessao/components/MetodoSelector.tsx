import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MetodoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { useT } from '../../shared/i18n';
import type { AppLocale } from '../../shared/i18n/core';
import { METODO_CONFIG, metodoDescricao, metodoLabel } from '../../shared/metodoPresentation';
import { useTheme } from '../../shared/theme';

const TECNICAS: Exclude<MetodoExercicio, 'normal'>[] = ['drop_set', 'piramide', 'rest_pause'];

interface Props {
  metodo: MetodoExercicio;
  onChange: (metodo: MetodoExercicio) => void;
  locale: AppLocale;
}

/** Chips de método de execução (normal + técnicas), compartilhado entre ExercicioDetalheScreen e BiSetDetalheScreen. */
export function MetodoSelector({ metodo, onChange, locale }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.tecnicaSection}>
      <Text style={styles.pickerLabel}>{t('sessao.detalhe.tecnicaLabel')}</Text>
      <View style={styles.tecnicaChipsRow}>
        <Pressable
          onPress={() => onChange('normal')}
          style={[styles.tecnicaChip, metodo === 'normal' ? styles.tecnicaChipNormal : null]}
        >
          <Text style={[styles.tecnicaChipText, metodo === 'normal' ? styles.tecnicaChipTextNormal : null]}>
            {t('sessao.metodo.normal')}
          </Text>
        </Pressable>
        {TECNICAS.map((tecnica) => {
          const active = metodo === tecnica;
          const cfg = METODO_CONFIG[tecnica];
          return (
            <Pressable
              key={tecnica}
              onPress={() => onChange(tecnica)}
              style={[styles.tecnicaChip, active ? { backgroundColor: cfg.color, borderColor: cfg.color } : null]}
            >
              <Text style={[styles.tecnicaChipText, active ? styles.tecnicaChipTextActive : null]}>
                {metodoLabel(tecnica, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {metodo !== 'normal' ? (
        <Text style={styles.tecnicaDescricao}>{metodoDescricao(metodo, locale)}</Text>
      ) : null}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    tecnicaSection: { gap: 8 },
    pickerLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    tecnicaChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tecnicaChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    tecnicaChipNormal: { backgroundColor: c.accent, borderColor: c.accent },
    tecnicaChipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    tecnicaChipTextNormal: { color: c.accentText, fontWeight: '700' },
    tecnicaChipTextActive: { color: '#fff', fontWeight: '700' },
    tecnicaDescricao: { color: c.textSecondary, fontSize: 12, fontStyle: 'italic', paddingHorizontal: 2 },
  });
}
