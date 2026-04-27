import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { buildExerciseCatalogViewModel } from '../presenters/buildExerciseCatalogViewModel';
import type { ExerciseCatalogControllerState } from '../hooks/useExerciseCatalogController';

export function ExerciseCatalogScreen({
  draft,
  exercises,
  errorMessage,
  feedbackMessage,
  isSubmitting,
  onChangeField,
  onSubmit,
}: ExerciseCatalogControllerState) {
  const viewModel = buildExerciseCatalogViewModel(exercises);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>MVP local e offline</Text>
        <Text style={styles.title}>Cadastro de exercicios</Text>
        <Text style={styles.description}>
          Comecamos pela base do treino: exercicios reutilizaveis, historico limpo e
          arquitetura pronta para TDD.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Novo exercicio</Text>

        <Field
          label="Nome"
          placeholder="Ex.: Supino reto"
          value={draft.name}
          onChangeText={(value) => onChangeField('name', value)}
        />
        <Field
          label="Grupo muscular"
          placeholder="Ex.: Peito"
          value={draft.groupMuscle}
          onChangeText={(value) => onChangeField('groupMuscle', value)}
        />
        <Field
          label="Categoria"
          placeholder="Ex.: Composto"
          value={draft.category}
          onChangeText={(value) => onChangeField('category', value)}
        />
        <Field
          label="Equipamento"
          placeholder="Ex.: Barra olimpica"
          value={draft.equipment}
          onChangeText={(value) => onChangeField('equipment', value)}
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
            {isSubmitting ? 'Salvando...' : 'Salvar exercicio'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Catalogo atual</Text>

        {viewModel.emptyStateMessage ? (
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        ) : (
          viewModel.cards.map((card) => (
            <View key={card.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseTitle}>{card.title}</Text>
              <Text style={styles.exerciseSubtitle}>{card.subtitle}</Text>
              <Text style={styles.exerciseMeta}>{card.meta}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
});
