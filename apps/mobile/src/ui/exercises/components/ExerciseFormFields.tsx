import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';

import { isYouTubeUrl } from '../../../application/exercises/use-cases/BaixarMidiaExercicioUseCase';
import { useTheme } from '../../shared/theme';

function isImageMediaUri(uri: string): boolean {
  const lower = uri.split('?')[0]!.toLowerCase();
  return lower.endsWith('.gif') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
}

function isVideoMediaUri(uri: string): boolean {
  const lower = uri.split('?')[0]!.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.m4v') || lower.endsWith('.webm');
}

export const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Abdomen', 'Gluteos', 'Quadriceps', 'Posterior', 'Panturrilha',
  'Antebraco', 'Trapezio',
];

export const CATEGORIES = ['Composto', 'Isolado', 'Cardio', 'Mobilidade', 'Alongamento'];

export const EQUIPMENTS = [
  'Barra olimpica', 'Haltere', 'Cabo', 'Maquina',
  'Peso corporal', 'Elastico', 'Smith', 'Kettlebell',
];

// ─── Field simples ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  required?: boolean;
}

export function Field({ label, placeholder, value, onChangeText, editable = true, required }: FieldProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={c.inputPlaceholder}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
      />
    </View>
  );
}

// ─── MultiChipPicker → MultiSelectField ──────────────────────────────────────

interface MultiChipPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function MultiChipPicker({ value, onChange }: MultiChipPickerProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const toArray = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const selected = toArray(value);
  const predefined = selected.filter((s) => MUSCLE_GROUPS.includes(s));
  const custom = selected.filter((s) => !MUSCLE_GROUPS.includes(s));

  const displayValue = selected.length === 0
    ? null
    : selected.length <= 2
      ? selected.join(', ')
      : `${selected.slice(0, 2).join(', ')} +${selected.length - 2}`;

  function buildValue(pred: string[], cust: string[]) {
    return [...pred, ...cust].join(', ');
  }

  function toggle(group: string) {
    const next = predefined.includes(group)
      ? predefined.filter((g) => g !== group)
      : [...predefined, group];
    onChange(buildValue(next, custom));
  }

  function confirmCustom() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    if (!custom.includes(trimmed)) onChange(buildValue(predefined, [...custom, trimmed]));
    setCustomText('');
  }

  function removeCustom(item: string) {
    onChange(buildValue(predefined, custom.filter((c) => c !== item)));
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Grupo muscular<Text style={styles.requiredMark}> *</Text></Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.selectTrigger, pressed ? styles.selectTriggerPressed : null]}
      >
        <Text style={[styles.selectValue, !displayValue && styles.selectPlaceholder]}>
          {displayValue ?? 'Selecionar grupos'}
        </Text>
        <Text style={styles.selectChevron}>▼</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Grupo muscular</Text>
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {MUSCLE_GROUPS.map((group) => {
              const active = predefined.includes(group);
              return (
                <Pressable
                  key={group}
                  onPress={() => toggle(group)}
                  style={({ pressed }) => [styles.sheetRow, pressed ? styles.sheetRowPressed : null]}
                >
                  <Text style={styles.sheetRowText}>{group}</Text>
                  <View style={[styles.checkbox, active ? styles.checkboxActive : null]}>
                    {active ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}

            <View style={styles.sheetDivider} />
            <Text style={styles.sheetSectionLabel}>Outro (personalizado)</Text>
            {custom.map((item) => (
              <View key={item} style={styles.sheetRow}>
                <Text style={styles.sheetRowText}>{item}</Text>
                <Pressable onPress={() => removeCustom(item)} hitSlop={8}>
                  <Text style={styles.removeCustom}>✕</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Nome do grupo..."
                placeholderTextColor={c.inputPlaceholder}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={confirmCustom}
                returnKeyType="done"
              />
              <Pressable onPress={confirmCustom} style={styles.addCustomBtn}>
                <Text style={styles.addCustomBtnText}>Adicionar</Text>
              </Pressable>
            </View>
          </ScrollView>
          <Pressable onPress={() => setOpen(false)} style={styles.sheetConfirmBtn}>
            <Text style={styles.sheetConfirmText}>Confirmar</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

// ─── ChipPicker → SelectField ─────────────────────────────────────────────────

interface ChipPickerProps {
  label: string;
  options?: string[];
  customPlaceholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function ChipPicker({ label, options = CATEGORIES, customPlaceholder, value, onChange }: ChipPickerProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const isCustom = value !== '' && value !== '__outro__' && !options.includes(value);
  const displayValue = value === '__outro__' ? null : value || null;

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

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.selectTrigger, pressed ? styles.selectTriggerPressed : null]}
      >
        <Text style={[styles.selectValue, !displayValue && styles.selectPlaceholder]}>
          {displayValue ?? `Selecionar ${label.toLowerCase()}`}
        </Text>
        <Text style={styles.selectChevron}>▼</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label}</Text>
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const active = value === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => select(opt)}
                  style={({ pressed }) => [styles.sheetRow, pressed ? styles.sheetRowPressed : null]}
                >
                  <Text style={[styles.sheetRowText, active ? styles.sheetRowTextActive : null]}>{opt}</Text>
                  {active ? <Text style={styles.radioCheck}>✓</Text> : null}
                </Pressable>
              );
            })}

            <View style={styles.sheetDivider} />
            <Text style={styles.sheetSectionLabel}>Outro (personalizado)</Text>
            {isCustom ? (
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetRowText, styles.sheetRowTextActive]}>{value}</Text>
                <Text style={styles.radioCheck}>✓</Text>
              </View>
            ) : null}
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder={customPlaceholder}
                placeholderTextColor={c.inputPlaceholder}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={confirmCustom}
                returnKeyType="done"
              />
              <Pressable onPress={confirmCustom} style={styles.addCustomBtn}>
                <Text style={styles.addCustomBtnText}>OK</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    field: { gap: 6 },
    fieldLabel: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    requiredMark: { color: c.error, fontSize: 13, fontWeight: '700' },
    input: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 14,
      color: c.inputText,
      fontSize: 15,
    },
    // Trigger (looks like an input)
    selectTrigger: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectTriggerPressed: { opacity: 0.75 },
    selectValue: { flex: 1, color: c.inputText, fontSize: 15 },
    selectPlaceholder: { color: c.inputPlaceholder },
    selectChevron: { color: c.textSecondary, fontSize: 12, marginLeft: 8 },
    // Backdrop
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    // Sheet
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 32,
      maxHeight: '70%',
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.cardBorder,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    sheetTitle: {
      color: c.textPrimary,
      fontSize: 17,
      fontWeight: '800',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    sheetScroll: { flexGrow: 0 },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    sheetRowPressed: { backgroundColor: c.cardAlt },
    sheetRowText: { flex: 1, color: c.textPrimary, fontSize: 15 },
    sheetRowTextActive: { color: c.accent, fontWeight: '700' },
    // Checkbox (multi-select)
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.inputBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: { backgroundColor: c.hero, borderColor: c.hero },
    checkmark: { color: c.heroText, fontSize: 13, fontWeight: '800' },
    // Radio (single-select)
    radioCheck: { color: c.accent, fontSize: 16, fontWeight: '800' },
    // Divider & custom section
    sheetDivider: { height: 1, backgroundColor: c.cardBorder, marginVertical: 4 },
    sheetSectionLabel: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 6,
    },
    removeCustom: { color: c.error, fontSize: 16, fontWeight: '700', paddingLeft: 8 },
    customInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    customInput: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 12,
      color: c.inputText,
      fontSize: 14,
    },
    addCustomBtn: {
      height: 42,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.hero,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addCustomBtnText: { color: c.heroText, fontSize: 13, fontWeight: '700' },
    // Confirm button (multi-select)
    sheetConfirmBtn: {
      marginHorizontal: 20,
      marginTop: 8,
      height: 48,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetConfirmText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
  });
}

// ─── Campos de mídia ──────────────────────────────────────────────────────────

interface MediaFieldsProps {
  exercicioId: string | null;
  mediaOnline: string;
  mediaLocal: string | null;
  onChangeOnline: (value: string) => void;
  onChangeLocal: (value: string | null) => void;
}

export function MediaFields({ exercicioId, mediaOnline, mediaLocal, onChangeOnline, onChangeLocal }: MediaFieldsProps) {
  const c = useTheme();
  const styles = useMemo(() => makeMediaStyles(c), [c]);
  const [picking, setPicking] = useState(false);

  const localFileName = mediaLocal ? mediaLocal.split('/').pop() ?? 'arquivo' : null;

  const handlePickFile = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissao necessaria', 'Permita o acesso a galeria nas configuracoes do dispositivo.');
      return;
    }
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos', 'images'],
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoMaxDuration: 30,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
      const dir = FileSystemLegacy.documentDirectory + 'exercises/';
      await FileSystemLegacy.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const id = exercicioId ?? ('tmp_' + Date.now());
      const dest = dir + id + '_local.' + ext;
      await FileSystemLegacy.copyAsync({ from: asset.uri, to: dest });
      onChangeLocal(dest);
    } finally {
      setPicking(false);
    }
  };

  // Escolhe qual mídia mostrar no preview: local tem precedência.
  const previewUri = mediaLocal ?? (mediaOnline.trim() || null);
  const showImagePreview = previewUri ? isImageMediaUri(previewUri) : false;
  const showVideoPlaceholder = previewUri && !showImagePreview && !isYouTubeUrl(previewUri) ? isVideoMediaUri(previewUri) : false;
  const showYouTubeBadge = previewUri ? isYouTubeUrl(previewUri) : false;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Mídia de referência</Text>

      {showImagePreview ? (
        <Image source={{ uri: previewUri! }} style={styles.preview} contentFit="contain" transition={150} />
      ) : showVideoPlaceholder ? (
        <View style={styles.previewPlaceholder}>
          <Text style={styles.previewPlaceholderIcon}>🎞</Text>
          <Text style={styles.previewPlaceholderText}>Video selecionado</Text>
        </View>
      ) : showYouTubeBadge ? (
        <View style={styles.previewPlaceholder}>
          <Text style={styles.previewPlaceholderIcon}>▶</Text>
          <Text style={styles.previewPlaceholderText}>Video do YouTube</Text>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>URL online <Text style={styles.hint}>(YouTube, GIF, MP4…)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          placeholderTextColor={c.inputPlaceholder}
          value={mediaOnline}
          onChangeText={onChangeOnline}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Arquivo offline <Text style={styles.hint}>(da galeria, comprimido)</Text></Text>
        {localFileName ? (
          <View style={styles.localRow}>
            <Text style={styles.localFile} numberOfLines={1}>📁 {localFileName}</Text>
            <Pressable onPress={() => onChangeLocal(null)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>Remover</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => { void handlePickFile(); }}
            disabled={picking}
            style={({ pressed }) => [styles.pickBtn, pressed ? { opacity: 0.8 } : null, picking ? { opacity: 0.5 } : null]}
          >
            <Text style={styles.pickBtnText}>{picking ? 'Selecionando...' : '📂 Selecionar da galeria'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function makeMediaStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { gap: 10 },
    sectionLabel: { color: c.textLabel, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
    field: { gap: 6 },
    label: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    hint: { color: c.textSecondary, fontWeight: '400' },
    input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, color: c.inputText, fontSize: 14 },
    localRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.cardAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    localFile: { flex: 1, color: c.textPrimary, fontSize: 13, fontWeight: '600' },
    removeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: c.errorBg },
    removeBtnText: { color: c.error, fontSize: 12, fontWeight: '700' },
    pickBtn: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, alignItems: 'center', justifyContent: 'center' },
    pickBtnText: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
    preview: { width: '100%', height: 160, borderRadius: 12, backgroundColor: c.cardAlt },
    previewPlaceholder: { height: 80, borderRadius: 12, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center', gap: 4 },
    previewPlaceholderIcon: { fontSize: 28 },
    previewPlaceholderText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
  });
}
