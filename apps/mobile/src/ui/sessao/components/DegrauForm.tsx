import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';
import type { DegrauFormState } from '../hooks/useDegrauForm';

interface Props {
  titulo: string;
  form: DegrauFormState;
  showDescanso: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/** Inputs de carga × reps (+ descanso opcional) de um degrau. Usado inline na lista ("+ degrau") e no formulário (Degrau 2 prescrito). */
export function DegrauForm({ titulo, form, showDescanso, onConfirm, onCancel }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{titulo}</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>{t('sessao.common.cargaKgLabel')}</Text>
          <TextInput
            style={styles.input}
            value={form.cargaText}
            onChangeText={form.setCargaText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={c.inputPlaceholder}
            textAlign="center"
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>{t('sessao.common.repsLabel')}</Text>
          <TextInput
            style={styles.input}
            value={form.repsText}
            onChangeText={form.setRepsText}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={c.inputPlaceholder}
            textAlign="center"
          />
        </View>
        {showDescanso ? (
          <View style={styles.col}>
            <Text style={styles.label}>{t('sessao.degrau.descansoLabel')}</Text>
            <TextInput
              style={styles.input}
              value={form.descansoText}
              onChangeText={form.setDescansoText}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={c.inputPlaceholder}
              textAlign="center"
            />
          </View>
        ) : null}
      </View>
      {form.error ? <Text style={styles.error}>{form.error}</Text> : null}
      {onConfirm || onCancel ? (
        <View style={styles.actionsRow}>
          {onConfirm ? (
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={t('sessao.degrau.adicionar')}
              style={({ pressed }) => [styles.confirmBtn, pressed ? { opacity: 0.85 } : null]}
            >
              <Text style={styles.confirmBtnText}>{t('common.ok')}</Text>
            </Pressable>
          ) : null}
          {onCancel ? (
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              style={({ pressed }) => [styles.cancelBtn, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { gap: 8, backgroundColor: c.cardAlt, borderRadius: 12, padding: 10 },
    titulo: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    row: { flexDirection: 'row', gap: 8 },
    col: { flex: 1, gap: 4 },
    label: { color: c.textSecondary, fontSize: 10, fontWeight: '600' },
    input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, color: c.inputText, fontSize: 16, fontWeight: '700' },
    error: { color: c.error, fontSize: 12 },
    actionsRow: { flexDirection: 'row', gap: 8 },
    confirmBtn: { flex: 1, backgroundColor: c.hero, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    confirmBtnText: { color: c.heroText, fontSize: 13, fontWeight: '800' },
    cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: c.cardBorder },
    cancelBtnText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
  });
}
