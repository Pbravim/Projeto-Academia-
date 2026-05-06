import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { buildExerciseCatalogViewModel, type ExerciseSectionViewModel, type ExerciseCardViewModel } from '../presenters/buildExerciseCatalogViewModel';
import type { ExerciseCatalogControllerState } from '../hooks/useExerciseCatalogController';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { useTheme } from '../../shared/theme';

export function ExerciseCatalogScreen({
  draft,
  exercises,
  ultimosPesos,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  deletingId,
  editingExerciseId,
  onChangeField,
  onSubmit,
  onSelectEdit,
  onCancelEdit,
  onDelete,
  onViewHistorico,
}: ExerciseCatalogControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const viewModel = buildExerciseCatalogViewModel(exercises, ultimosPesos);
  const isEditing = editingExerciseId !== null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Catalogo de exercicios</Text>
        <Text style={styles.title}>Exercicios</Text>
        <Text style={styles.description}>
          Organizados por grupo muscular. Toque no grupo para expandir.
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
          editable={!isSubmitting}
          styles={styles}
          placeholderTextColor={c.inputPlaceholder}
        />
        <MultiChipPicker
          value={draft.groupMuscle}
          onChange={(value) => onChangeField('groupMuscle', value)}
          styles={styles}
          placeholderTextColor={c.inputPlaceholder}
        />
        <ChipPicker
          label="Categoria"
          options={CATEGORIES}
          customPlaceholder="Digite a categoria"
          value={draft.category}
          onChange={(value) => onChangeField('category', value)}
          styles={styles}
          placeholderTextColor={c.inputPlaceholder}
        />
        <ChipPicker
          label="Equipamento"
          options={EQUIPMENTS}
          customPlaceholder="Digite o equipamento"
          value={draft.equipment}
          onChange={(value) => onChangeField('equipment', value)}
          styles={styles}
          placeholderTextColor={c.inputPlaceholder}
        />

        <Text style={styles.helperText}>Carga sempre registrada em kg com valores decimais.</Text>

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
            {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alteracoes' : 'Salvar exercicio'}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={c.accent} style={styles.loading} />
      ) : viewModel.emptyStateMessage ? (
        <View style={styles.listCard}>
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        </View>
      ) : (
        viewModel.sections.map((section) => (
          <ExerciseSection
            key={section.groupMuscle}
            section={section}
            exercises={exercises}
            editingExerciseId={editingExerciseId}
            deletingId={deletingId}
            onSelectEdit={onSelectEdit}
            onViewHistorico={onViewHistorico}
            onDelete={onDelete}
          />
        ))
      )}
    </ScrollView>
  );
}

interface ExerciseSectionProps {
  section: ExerciseSectionViewModel;
  exercises: ExercisePrimitives[];
  editingExerciseId: string | null;
  deletingId: string | null;
  onSelectEdit: (exercise: ExercisePrimitives) => void;
  onViewHistorico: (id: string, name: string) => void;
  onDelete: (id: string) => Promise<void>;
}

function ExerciseSection({ section, exercises, editingExerciseId, deletingId, onSelectEdit, onViewHistorico, onDelete }: ExerciseSectionProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.sectionContainer}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.sectionHeader, pressed ? styles.sectionHeaderPressed : null]}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderTitle}>{section.groupMuscle}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{section.cards.length}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.sectionBody}>
          {section.cards.map((card) => (
            <ExerciseCard
              key={card.id}
              card={card}
              isEditing={editingExerciseId === card.id}
              isDeleting={deletingId === card.id}
              anyDeleting={deletingId !== null}
              exercise={exercises.find((e) => e.id === card.id)!}
              onSelectEdit={onSelectEdit}
              onViewHistorico={onViewHistorico}
              onDelete={onDelete}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface ExerciseCardProps {
  card: ExerciseCardViewModel;
  isEditing: boolean;
  isDeleting: boolean;
  anyDeleting: boolean;
  exercise: ExercisePrimitives;
  onSelectEdit: (exercise: ExercisePrimitives) => void;
  onViewHistorico: (id: string, name: string) => void;
  onDelete: (id: string) => Promise<void>;
}

function ExerciseCard({ card, isEditing, isDeleting, anyDeleting, exercise, onSelectEdit, onViewHistorico, onDelete }: ExerciseCardProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[styles.exerciseCard, isEditing ? styles.exerciseCardEditing : null]}>
      <Text style={styles.exerciseTitle}>{card.title}</Text>
      <Text style={styles.exerciseSubtitle}>{card.subtitle}</Text>
      <Text style={styles.exerciseMeta}>{card.meta}</Text>
      {card.ultimoPeso ? (
        <Text style={styles.exerciseUltimoPeso}>{card.ultimoPeso}</Text>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelectEdit(exercise)}
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
          disabled={anyDeleting}
          style={({ pressed }) => [
            styles.actionButton,
            styles.deleteButton,
            pressed ? styles.actionButtonPressed : null,
            isDeleting ? styles.deleteButtonLoading : null,
          ]}
        >
          <Text style={styles.deleteButtonText}>{isDeleting ? 'Excluindo...' : 'Excluir'}</Text>
        </Pressable>
      </View>
    </View>
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
  styles: ReturnType<typeof makeStyles>;
  placeholderTextColor: string;
}

function MultiChipPicker({ value, onChange, styles, placeholderTextColor }: MultiChipPickerProps) {
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
          placeholderTextColor={placeholderTextColor}
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
  styles: ReturnType<typeof makeStyles>;
  placeholderTextColor: string;
}

function ChipPicker({ label, options, customPlaceholder, value, onChange, styles, placeholderTextColor }: ChipPickerProps) {
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
          placeholderTextColor={placeholderTextColor}
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
  editable?: boolean;
  styles: ReturnType<typeof makeStyles>;
  placeholderTextColor: string;
}

function Field({ label, placeholder, value, onChangeText, editable = true, styles, placeholderTextColor }: FieldProps) {
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
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
      gap: 18,
    },
    heroCard: {
      backgroundColor: c.hero,
      borderRadius: 24,
      padding: 22,
      gap: 10,
    },
    eyebrow: {
      color: c.heroSubtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      color: c.heroText,
      fontSize: 30,
      fontWeight: '800',
    },
    description: {
      color: c.heroDescription,
      fontSize: 15,
      lineHeight: 22,
    },
    formCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    listCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    sectionTitle: {
      color: c.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    cancelLink: {
      color: c.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    field: {
      gap: 6,
    },
    fieldLabel: {
      color: c.textLabel,
      fontSize: 13,
      fontWeight: '700',
    },
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
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    chipActive: {
      backgroundColor: c.hero,
      borderColor: c.hero,
    },
    chipText: {
      color: c.textLabel,
      fontSize: 13,
      fontWeight: '600',
    },
    chipTextActive: {
      color: c.heroText,
    },
    helperText: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    errorMessage: {
      color: c.error,
      fontSize: 14,
      fontWeight: '600',
    },
    successMessage: {
      color: c.success,
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
    },
    primaryButtonPressed: {
      opacity: 0.9,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: c.accentText,
      fontSize: 15,
      fontWeight: '800',
    },
    loading: {
      marginVertical: 12,
    },
    emptyState: {
      color: c.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    sectionContainer: { gap: 0 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.hero, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 2 },
    sectionHeaderPressed: { opacity: 0.85 },
    sectionHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionHeaderTitle: { color: c.heroText, fontSize: 15, fontWeight: '800' },
    countBadge: { backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    countBadgeText: { color: c.accentText, fontSize: 12, fontWeight: '800' },
    chevron: { color: c.heroSubtext, fontSize: 11, fontWeight: '700' },
    sectionBody: { backgroundColor: c.card, borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: c.cardBorder, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    exerciseCard: {
      borderRadius: 14,
      padding: 14,
      backgroundColor: c.cardAlt,
      gap: 4,
    },
    exerciseCardEditing: {
      borderWidth: 2,
      borderColor: c.accent,
    },
    exerciseTitle: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    exerciseSubtitle: {
      color: c.textLabel,
      fontSize: 14,
      fontWeight: '600',
    },
    exerciseMeta: {
      color: c.textSecondary,
      fontSize: 13,
    },
    exerciseUltimoPeso: {
      color: c.accent,
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
      backgroundColor: c.cardAlt,
    },
    actionButtonPressed: {
      opacity: 0.75,
    },
    deleteButton: {
      backgroundColor: c.errorBg,
    },
    historicoButton: {
      backgroundColor: c.cardAlt,
    },
    editButtonText: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    deleteButtonText: {
      color: c.error,
      fontSize: 13,
      fontWeight: '700',
    },
    historicoButtonText: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
