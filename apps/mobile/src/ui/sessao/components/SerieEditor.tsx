import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';

import { PickerCarousel } from './PickerCarousel';

const KG_VALUES = Array.from({ length: 81 }, (_, i) => i * 2.5);

function kgIndexFor(kg: number): number {
  return Math.max(0, Math.min(Math.round(kg / 2.5), KG_VALUES.length - 1));
}

interface Props {
  editKg: number;
  editReps: number;
  /** Carga fora da grade de 2.5kg → modo texto com o valor exato; `null` → carrossel. */
  editKgText: string | null;
  onChangeEditKgText: (text: string) => void;
  onChangeEditKg: (kg: number) => void;
  onChangeEditReps: (reps: number) => void;
  formatKgItem: (i: number) => string;
  formatRepsItem: (i: number) => string;
  onSave: () => void;
  onCancel: () => void;
}

/** Modo de edição inline de uma série (extraído de SeriesRegistradasList — achado #4). */
export function SerieEditor({
  editKg,
  editReps,
  editKgText,
  onChangeEditKgText,
  onChangeEditKg,
  onChangeEditReps,
  formatKgItem,
  formatRepsItem,
  onSave,
  onCancel,
}: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[styles.serieRow, styles.serieRowEditing]}>
      <Text style={styles.serieLabel}>{t('sessao.detalhe.editandoSerie')}</Text>
      <View style={styles.editRow}>
        <View style={styles.pickerCol}>
          <Text style={styles.pickerLabel}>{t('sessao.common.cargaKgLabel')}</Text>
          {editKgText !== null ? (
            <TextInput
              style={styles.editKgInput}
              value={editKgText}
              onChangeText={onChangeEditKgText}
              keyboardType="decimal-pad"
              textAlign="center"
            />
          ) : (
            <PickerCarousel
              count={KG_VALUES.length}
              selectedIndex={kgIndexFor(editKg)}
              onChangeIndex={(idx) => onChangeEditKg(KG_VALUES[idx])}
              formatItem={formatKgItem}
            />
          )}
        </View>
        <View style={styles.pickerCol}>
          <Text style={styles.pickerLabel}>{t('sessao.common.repsLabel')}</Text>
          <PickerCarousel
            count={30}
            selectedIndex={Math.max(0, Math.min(editReps - 1, 29))}
            onChangeIndex={(idx) => onChangeEditReps(idx + 1)}
            formatItem={formatRepsItem}
          />
        </View>
      </View>
      <View style={styles.editActionsRow}>
        <Pressable onPress={onSave} style={({ pressed }) => [styles.saveBtn, pressed ? { opacity: 0.85 } : null]}>
          <Text style={styles.saveBtnText}>{t('common.save')}</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelBtn, pressed ? { opacity: 0.75 } : null]}>
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    serieRow: { gap: 6, backgroundColor: c.cardAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
    serieRowEditing: { alignItems: 'stretch' },
    serieLabel: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
    editRow: { flexDirection: 'row', gap: 12 },
    pickerCol: { flex: 1, gap: 6 },
    pickerLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    editKgInput: { height: 72, borderRadius: 14, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, color: c.inputText, fontSize: 30, fontWeight: '700' },
    editActionsRow: { flexDirection: 'row', gap: 8 },
    saveBtn: { flex: 1, backgroundColor: c.hero, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
    saveBtnText: { color: c.heroText, fontSize: 15, fontWeight: '800' },
    cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: c.success },
    cancelBtnText: { color: c.success, fontSize: 14, fontWeight: '700' },
  });
}
