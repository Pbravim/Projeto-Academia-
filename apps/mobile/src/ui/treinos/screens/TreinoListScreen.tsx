import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TreinoListControllerState } from '../hooks/useTreinoListController';
import { buildTreinoListViewModel } from '../presenters/buildTreinoListViewModel';

export function TreinoListScreen({
  draft,
  treinos,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  onChangeField,
  onSubmit,
  onDelete,
  onSelectTreino,
}: TreinoListControllerState) {
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
        />
        <ObjetivoPicker
          value={draft.objetivo}
          onChange={(v) => onChangeField('objetivo', v)}
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
          <ActivityIndicator size="small" color="#c96f2d" style={styles.loading} />
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
                style={({ pressed }) => [styles.deleteButton, pressed ? styles.deleteButtonPressed : null]}
              >
                <Text style={styles.deleteButtonText}>Excluir</Text>
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
}

function ObjetivoPicker({ value, onChange }: ObjetivoPickerProps) {
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
              onPress={() => onChange(opt)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{opt}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onChange('__outro__')}
          style={[styles.chip, showCustomInput ? styles.chipActive : null]}
        >
          <Text style={[styles.chipText, showCustomInput ? styles.chipTextActive : null]}>Outro</Text>
        </Pressable>
      </View>
      {showCustomInput ? (
        <TextInput
          style={styles.input}
          placeholder="Digite o objetivo"
          placeholderTextColor="#7f856f"
          value={value === '__outro__' ? '' : value}
          onChangeText={onChange}
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
}

function Field({ label, placeholder, value, onChangeText }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#7f856f"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f0e8' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18 },
  heroCard: { backgroundColor: '#20352c', borderRadius: 24, padding: 22, gap: 10 },
  eyebrow: { color: '#b8c9a9', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#f8f4ea', fontSize: 30, fontWeight: '800' },
  description: { color: '#dde7d3', fontSize: 15, lineHeight: 22 },
  formCard: { backgroundColor: '#fbf9f2', borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: '#e1dccd' },
  listCard: { backgroundColor: '#fbf9f2', borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: '#e1dccd' },
  sectionTitle: { color: '#20352c', fontSize: 20, fontWeight: '800' },
  field: { gap: 6 },
  fieldLabel: { color: '#31463d', fontSize: 13, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#d4cfbf', backgroundColor: '#ffffff', paddingHorizontal: 14, color: '#1d271f', fontSize: 15 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eef1e7', borderWidth: 1, borderColor: '#d4cfbf' },
  chipActive: { backgroundColor: '#20352c', borderColor: '#20352c' },
  chipText: { color: '#31463d', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#f8f4ea' },
  errorMessage: { color: '#a1362e', fontSize: 14, fontWeight: '600' },
  successMessage: { color: '#2c6b42', fontSize: 14, fontWeight: '600' },
  primaryButton: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c96f2d' },
  primaryButtonPressed: { opacity: 0.9 },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff8f2', fontSize: 15, fontWeight: '800' },
  loading: { marginVertical: 12 },
  emptyState: { color: '#66725f', fontSize: 14, lineHeight: 20 },
  treinoCard: { borderRadius: 18, padding: 16, backgroundColor: '#eef1e7', gap: 10 },
  treinoCardPressed: { opacity: 0.8 },
  treinoCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  treinoTitle: { color: '#20352c', fontSize: 16, fontWeight: '800' },
  treinoSubtitle: { color: '#40584d', fontSize: 14, fontWeight: '600', marginTop: 2 },
  treinoArrow: { color: '#40584d', fontSize: 22, fontWeight: '700' },
  deleteButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f0dbd8' },
  deleteButtonPressed: { opacity: 0.75 },
  deleteButtonText: { color: '#a1362e', fontSize: 13, fontWeight: '700' },
});
