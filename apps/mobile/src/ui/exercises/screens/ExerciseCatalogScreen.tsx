import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { buildExerciseCatalogViewModel } from '../presenters/buildExerciseCatalogViewModel';
import type { ExerciseCatalogControllerState } from '../hooks/useExerciseCatalogController';

export function ExerciseCatalogScreen({
  draft,
  exercises,
  ultimosPesos,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  editingExerciseId,
  onChangeField,
  onSubmit,
  onSelectEdit,
  onCancelEdit,
  onDelete,
  onViewHistorico,
}: ExerciseCatalogControllerState) {
  const viewModel = buildExerciseCatalogViewModel(exercises, ultimosPesos);
  const isEditing = editingExerciseId !== null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>MVP local e offline</Text>
        <Text style={styles.title}>Catalogo de exercicios</Text>
        <Text style={styles.description}>
          Exercicios reutilizaveis, historico limpo e arquitetura pronta para TDD.
        </Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.sectionTitle}>
            {isEditing ? 'Editar exercicio' : 'Novo exercicio'}
          </Text>
          {isEditing ? (
            <Pressable onPress={onCancelEdit} hitSlop={8}>
              <Text style={styles.cancelLink}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>

        <Field
          label="Nome"
          placeholder="Ex.: Supino reto"
          value={draft.name}
          onChangeText={(value) => onChangeField('name', value)}
        />
        <MultiChipPicker
          value={draft.groupMuscle}
          onChange={(value) => onChangeField('groupMuscle', value)}
        />
        <ChipPicker
          label="Categoria"
          options={CATEGORIES}
          customPlaceholder="Digite a categoria"
          value={draft.category}
          onChange={(value) => onChangeField('category', value)}
        />
        <ChipPicker
          label="Equipamento"
          options={EQUIPMENTS}
          customPlaceholder="Digite o equipamento"
          value={draft.equipment}
          onChange={(value) => onChangeField('equipment', value)}
        />

        <Text style={styles.helperText}>Carga sempre registrada em kg com valores decimais.</Text>

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {feedbackMessage ? <Text style={styles.successMessage}>{feedbackMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void onSubmit();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            isSubmitting ? styles.primaryButtonDisabled : null,
          ]}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting
              ? isEditing
                ? 'Salvando...'
                : 'Salvando...'
              : isEditing
                ? 'Salvar alteracoes'
                : 'Salvar exercicio'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Catalogo atual</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color="#c96f2d" style={styles.loading} />
        ) : viewModel.emptyStateMessage ? (
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        ) : (
          viewModel.cards.map((card) => (
            <View
              key={card.id}
              style={[styles.exerciseCard, editingExerciseId === card.id ? styles.exerciseCardEditing : null]}
            >
              <Text style={styles.exerciseTitle}>{card.title}</Text>
              <Text style={styles.exerciseSubtitle}>{card.subtitle}</Text>
              <Text style={styles.exerciseMeta}>{card.meta}</Text>
              {card.ultimoPeso ? (
                <Text style={styles.exerciseUltimoPeso}>{card.ultimoPeso}</Text>
              ) : null}

              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSelectEdit(exercises.find((e) => e.id === card.id)!)}
                  style={({ pressed }) => [styles.actionButton, pressed ? styles.actionButtonPressed : null]}
                >
                  <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => onViewHistorico(card.id, card.title)}
                  style={({ pressed }) => [styles.actionButton, styles.historicoButton, pressed ? styles.actionButtonPressed : null]}
                >
                  <Text style={styles.historicoButtonText}>Historico</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => { void onDelete(card.id); }}
                  style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed ? styles.actionButtonPressed : null]}
                >
                  <Text style={styles.deleteButtonText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Abdomen', 'Gluteos', 'Quadriceps', 'Posterior', 'Panturrilha',
  'Antebraco', 'Trapezio',
];

const CATEGORIES = ['Composto', 'Isolado', 'Cardio', 'Mobilidade', 'Alongamento'];

const EQUIPMENTS = [
  'Barra olimpica', 'Haltere', 'Cabo', 'Maquina',
  'Peso corporal', 'Elastico', 'Smith', 'Kettlebell',
];

interface MultiChipPickerProps {
  value: string;
  onChange: (value: string) => void;
}

function MultiChipPicker({ value, onChange }: MultiChipPickerProps) {
  const toArray = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

  const allSelected = toArray(value);
  const predefinedSelected = allSelected.filter((s) => MUSCLE_GROUPS.includes(s));
  const initialCustom = allSelected.filter((s) => !MUSCLE_GROUPS.includes(s)).join(', ');

  const [customText, setCustomText] = useState(initialCustom);
  const [showCustomInput, setShowCustomInput] = useState(initialCustom !== '');

  useEffect(() => {
    const custom = toArray(value).filter((s) => !MUSCLE_GROUPS.includes(s)).join(', ');
    setCustomText(custom);
    setShowCustomInput(custom !== '');
  }, [value]);

  function buildValue(predefined: string[], custom: string) {
    const parts = [...predefined, ...(custom.trim() ? [custom.trim()] : [])];
    return parts.join(', ');
  }

  function toggleGroup(group: string) {
    const next = predefinedSelected.includes(group)
      ? predefinedSelected.filter((g) => g !== group)
      : [...predefinedSelected, group];
    onChange(buildValue(next, customText));
  }

  function handleCustomChange(text: string) {
    setCustomText(text);
    onChange(buildValue(predefinedSelected, text));
  }

  function toggleCustom() {
    if (showCustomInput) {
      setShowCustomInput(false);
      setCustomText('');
      onChange(buildValue(predefinedSelected, ''));
    } else {
      setShowCustomInput(true);
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Grupo muscular</Text>
      <View style={styles.chipGrid}>
        {MUSCLE_GROUPS.map((group) => {
          const active = predefinedSelected.includes(group);
          return (
            <Pressable
              key={group}
              onPress={() => toggleGroup(group)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{group}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={toggleCustom}
          style={[styles.chip, showCustomInput ? styles.chipActive : null]}
        >
          <Text style={[styles.chipText, showCustomInput ? styles.chipTextActive : null]}>Outro</Text>
        </Pressable>
      </View>
      {showCustomInput ? (
        <TextInput
          style={styles.input}
          placeholder="Digite o grupo muscular"
          placeholderTextColor="#7f856f"
          value={customText}
          onChangeText={handleCustomChange}
          autoFocus
        />
      ) : null}
    </View>
  );
}

interface ChipPickerProps {
  label: string;
  options: string[];
  customPlaceholder: string;
  value: string;
  onChange: (value: string) => void;
}

function ChipPicker({ label, options, customPlaceholder, value, onChange }: ChipPickerProps) {
  const isCustom = value !== '' && !options.includes(value);
  const showCustomInput = isCustom || value === '__outro__';

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipGrid}>
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{option}</Text>
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
          placeholder={customPlaceholder}
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
  screen: {
    flex: 1,
    backgroundColor: '#f3f0e8',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 18,
  },
  heroCard: {
    backgroundColor: '#20352c',
    borderRadius: 24,
    padding: 22,
    gap: 10,
  },
  eyebrow: {
    color: '#b8c9a9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#f8f4ea',
    fontSize: 30,
    fontWeight: '800',
  },
  description: {
    color: '#dde7d3',
    fontSize: 15,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#fbf9f2',
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e1dccd',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCard: {
    backgroundColor: '#fbf9f2',
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e1dccd',
  },
  sectionTitle: {
    color: '#20352c',
    fontSize: 20,
    fontWeight: '800',
  },
  cancelLink: {
    color: '#c96f2d',
    fontSize: 14,
    fontWeight: '700',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#31463d',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d4cfbf',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    color: '#1d271f',
    fontSize: 15,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eef1e7',
    borderWidth: 1,
    borderColor: '#d4cfbf',
  },
  chipActive: {
    backgroundColor: '#20352c',
    borderColor: '#20352c',
  },
  chipText: {
    color: '#31463d',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#f8f4ea',
  },
  helperText: {
    color: '#66725f',
    fontSize: 13,
    lineHeight: 18,
  },
  errorMessage: {
    color: '#a1362e',
    fontSize: 14,
    fontWeight: '600',
  },
  successMessage: {
    color: '#2c6b42',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c96f2d',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff8f2',
    fontSize: 15,
    fontWeight: '800',
  },
  loading: {
    marginVertical: 12,
  },
  emptyState: {
    color: '#66725f',
    fontSize: 14,
    lineHeight: 20,
  },
  exerciseCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#eef1e7',
    gap: 4,
  },
  exerciseCardEditing: {
    borderWidth: 2,
    borderColor: '#c96f2d',
  },
  exerciseTitle: {
    color: '#20352c',
    fontSize: 16,
    fontWeight: '800',
  },
  exerciseSubtitle: {
    color: '#40584d',
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseMeta: {
    color: '#657062',
    fontSize: 13,
  },
  exerciseUltimoPeso: {
    color: '#c96f2d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#d9ddd0',
  },
  actionButtonPressed: {
    opacity: 0.75,
  },
  deleteButton: {
    backgroundColor: '#f0dbd8',
  },
  historicoButton: {
    backgroundColor: '#dde8e3',
  },
  editButtonText: {
    color: '#20352c',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButtonText: {
    color: '#a1362e',
    fontSize: 13,
    fontWeight: '700',
  },
  historicoButtonText: {
    color: '#20352c',
    fontSize: 13,
    fontWeight: '700',
  },
});
