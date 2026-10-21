import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';

export interface ObjetivoInlineFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function ObjetivoInlineField({ value, onChange }: ObjetivoInlineFieldProps) {
  const c = useTheme();
  const t = useT();
  const styles = makeStyles(c);
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const OBJETIVOS = [
    t('treinos.detail.objetivoField.options.hipertrofia'),
    t('treinos.detail.objetivoField.options.forca'),
    t('treinos.detail.objetivoField.options.resistencia'),
    t('treinos.detail.objetivoField.options.emagrecimento'),
    t('treinos.detail.objetivoField.options.mobilidade'),
    t('treinos.detail.objetivoField.options.reabilitacao'),
    t('treinos.detail.objetivoField.options.condicionamento'),
  ];

  const isCustom = value !== '' && !OBJETIVOS.includes(value);
  const displayValue = value || null;

  function select(opt: string) {
    onChange(opt);
    setOpen(false);
  }

  function confirmCustom() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setCustomText('');
    setOpen(false);
  }

  function clear() {
    onChange('');
    setOpen(false);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.objetivoTrigger}>
        <Text style={[styles.description, !displayValue ? styles.objetivoPlaceholder : null]}>
          {displayValue ?? t('treinos.detail.objetivoField.placeholder')}
        </Text>
        <Text style={styles.objetivoEditIcon}>✎</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('treinos.detail.objetivoField.sheetTitle')}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={clear}
              style={({ pressed }) => [styles.sheetRow, pressed ? { backgroundColor: c.cardAlt } : null]}
            >
              <Text style={[styles.sheetRowText, !value ? styles.sheetRowActive : null]}>{t('treinos.detail.objetivoField.semObjetivo')}</Text>
              {!value ? <Text style={styles.sheetCheck}>✓</Text> : null}
            </Pressable>
            <View style={styles.sheetDivider} />
            {OBJETIVOS.map((opt) => {
              const active = value === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => select(opt)}
                  style={({ pressed }) => [styles.sheetRow, pressed ? { backgroundColor: c.cardAlt } : null]}
                >
                  <Text style={[styles.sheetRowText, active ? styles.sheetRowActive : null]}>{opt}</Text>
                  {active ? <Text style={styles.sheetCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
            <View style={styles.sheetDivider} />
            <Text style={styles.sheetSectionLabel}>{t('treinos.objetivo.outroPersonalizado')}</Text>
            {isCustom ? (
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetRowText, styles.sheetRowActive]}>{value}</Text>
                <Text style={styles.sheetCheck}>✓</Text>
              </View>
            ) : null}
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder={t('treinos.objetivo.digitePlaceholder')}
                placeholderTextColor={c.heroDescription}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={confirmCustom}
                returnKeyType="done"
              />
              <Pressable onPress={confirmCustom} style={styles.addCustomBtn}>
                <Text style={styles.addCustomBtnText}>{t('common.ok')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    description: { color: c.heroDescription, fontSize: 15, lineHeight: 22, flex: 1 },
    objetivoTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    objetivoPlaceholder: { opacity: 0.5 },
    objetivoEditIcon: { color: c.heroSubtext, fontSize: 16 },
    backdrop: { flex: 1, backgroundColor: c.overlay },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '60%' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.cardBorder, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    sheetTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    sheetRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    sheetRowText: { flex: 1, color: c.textPrimary, fontSize: 15 },
    sheetRowActive: { color: c.accentInk, fontWeight: '700' },
    sheetCheck: { color: c.accentInk, fontSize: 16, fontWeight: '800' },
    sheetDivider: { height: 1, backgroundColor: c.cardBorder, marginVertical: 4 },
    sheetSectionLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
    customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
    customInput: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, color: c.inputText, fontSize: 14 },
    addCustomBtn: { height: 42, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.hero, alignItems: 'center', justifyContent: 'center' },
    addCustomBtnText: { color: c.heroText, fontSize: 13, fontWeight: '700' },
  });
}
