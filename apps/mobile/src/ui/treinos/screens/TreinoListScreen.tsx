import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TreinoListControllerState } from '../hooks/useTreinoListController';
import { buildTreinoListViewModel } from '../presenters/buildTreinoListViewModel';
import { useTheme } from '../../shared/theme';

export function TreinoListScreen({
  draft,
  treinos,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  deletingId,
  onChangeField,
  onSubmit,
  onDelete,
  onSelectTreino,
}: TreinoListControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const viewModel = buildTreinoListViewModel(treinos);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Modulo de treinos</Text>
        <Text style={styles.title}>Meus treinos</Text>
        <Text style={styles.description}>
          Monte seus treinos A, B, C com os exercicios do catalogo. Cada treino vira uma sessao.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Novo treino</Text>

        <Field
          label="Nome"
          placeholder="Ex.: Treino A"
          value={draft.name}
          onChangeText={(v) => onChangeField('name', v)}
          editable={!isSubmitting}
          styles={styles}
          placeholderTextColor={c.inputPlaceholder}
        />
        <ObjetivoPicker
          value={draft.objetivo}
          onChange={(v) => onChangeField('objetivo', v)}
          editable={!isSubmitting}
          styles={styles}
          placeholderTextColor={c.inputPlaceholder}
        />

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {feedbackMessage ? <Text style={styles.successMessage}>{feedbackMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => { void onSubmit(); }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            isSubmitting ? styles.primaryButtonDisabled : null,
          ]}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Criando...' : 'Criar treino'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Treinos criados</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color={c.accent} style={styles.loading} />
        ) : viewModel.emptyStateMessage ? (
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        ) : (
          viewModel.cards.map((card) => (
            <Pressable
              key={card.id}
              onPress={() => onSelectTreino(treinos.find((t) => t.id === card.id)!)}
              style={({ pressed }) => [styles.treinoCard, pressed ? styles.treinoCardPressed : null]}
            >
              <View style={styles.treinoCardContent}>
                <View>
                  <Text style={styles.treinoTitle}>{card.title}</Text>
                  <Text style={styles.treinoSubtitle}>{card.subtitle}</Text>
                </View>
                <Text style={styles.treinoArrow}>›</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => { void onDelete(card.id); }}
                disabled={deletingId !== null}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed ? styles.deleteButtonPressed : null,
                  deletingId === card.id ? styles.deleteButtonLoading : null,
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  {deletingId === card.id ? 'Excluindo...' : 'Excluir'}
                </Text>
              </Pressable>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const OBJETIVOS = [
  'Hipertrofia', 'Forca', 'Resistencia', 'Emagrecimento',
  'Mobilidade', 'Reabilitacao', 'Condicionamento',
];

interface ObjetivoPickerProps {
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
  styles: ReturnType<typeof makeStyles>;
  placeholderTextColor: string;
}

function ObjetivoPicker({ value, onChange, editable, styles, placeholderTextColor }: ObjetivoPickerProps) {
  const isCustom = value !== '' && !OBJETIVOS.includes(value);
  const showCustomInput = isCustom || value === '__outro__';

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Objetivo</Text>
      <View style={styles.chipGrid}>
        {OBJETIVOS.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => editable && onChange(opt)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{opt}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => editable && onChange('__outro__')}
          style={[styles.chip, showCustomInput ? styles.chipActive : null]}
        >
          <Text style={[styles.chipText, showCustomInput ? styles.chipTextActive : null]}>Outro</Text>
        </Pressable>
      </View>
      {showCustomInput ? (
        <TextInput
          style={styles.input}
          placeholder="Digite o objetivo"
          placeholderTextColor={placeholderTextColor}
          value={value === '__outro__' ? '' : value}
          onChangeText={onChange}
          editable={editable}
          autoFocus
        />
      ) : null}
    </View>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
  styles: ReturnType<typeof makeStyles>;
  placeholderTextColor: string;
}

function Field({ label, placeholder, value, onChangeText, editable, styles, placeholderTextColor }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 10 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 30, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 15, lineHeight: 22 },
    formCard: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    listCard: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    field: { gap: 6 },
    fieldLabel: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 14, color: c.inputText, fontSize: 15 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.inputBorder },
    chipActive: { backgroundColor: c.hero, borderColor: c.hero },
    chipText: { color: c.textLabel, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: c.heroText },
    errorMessage: { color: c.error, fontSize: 14, fontWeight: '600' },
    successMessage: { color: c.success, fontSize: 14, fontWeight: '600' },
    primaryButton: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent },
    primaryButtonPressed: { opacity: 0.9 },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    loading: { marginVertical: 12 },
    emptyState: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    treinoCard: { borderRadius: 18, padding: 16, backgroundColor: c.cardAlt, gap: 10 },
    treinoCardPressed: { opacity: 0.8 },
    treinoCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    treinoTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    treinoSubtitle: { color: c.textLabel, fontSize: 14, fontWeight: '600', marginTop: 2 },
    treinoArrow: { color: c.textLabel, fontSize: 22, fontWeight: '700' },
    deleteButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: c.errorBg },
    deleteButtonPressed: { opacity: 0.75 },
    deleteButtonLoading: { opacity: 0.5 },
    deleteButtonText: { color: c.error, fontSize: 13, fontWeight: '700' },
  });
}
