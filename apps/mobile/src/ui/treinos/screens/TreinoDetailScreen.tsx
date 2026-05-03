import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TreinoDetailControllerState } from '../hooks/useTreinoDetailController';
import { buildTreinoDetailViewModel } from '../presenters/buildTreinoDetailViewModel';

export function TreinoDetailScreen({
  treino,
  treinoExercicios,
  availableExercises,
  exercisesById,
  errorMessage,
  feedbackMessage,
  onAddExercicio,
  onRemoveExercicio,
  onMoveUp,
  onMoveDown,
  onBack,
}: TreinoDetailControllerState) {
  const viewModel = buildTreinoDetailViewModel(treino, treinoExercicios, exercisesById);

  const addedExercicioIds = new Set(treinoExercicios.map((te) => te.exercicioId));
  const notAddedExercises = availableExercises.filter((e) => !addedExercicioIds.has(e.id));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Treino</Text>
        <Text style={styles.title}>{viewModel.treinoName}</Text>
        <Text style={styles.description}>{viewModel.objetivo}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Exercicios do treino</Text>

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {feedbackMessage ? <Text style={styles.successMessage}>{feedbackMessage}</Text> : null}

        {viewModel.emptyStateMessage ? (
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        ) : (
          viewModel.exercicios.map((item) => (
            <View key={item.treinoExercicioId} style={styles.exercicioCard}>
              <View style={styles.exercicioInfo}>
                <Text style={styles.exercicioOrdem}>{item.ordem}.</Text>
                <View style={styles.exercicioTexts}>
                  <Text style={styles.exercicioName}>{item.name}</Text>
                  <Text style={styles.exercicioMeta}>{item.groupMuscle} · {item.category}</Text>
                </View>
              </View>

              <View style={styles.exercicioActions}>
                <Pressable
                  onPress={() => { void onMoveUp(item.treinoExercicioId); }}
                  style={({ pressed }) => [styles.orderButton, item.isFirst ? styles.orderButtonDisabled : null, pressed ? styles.orderButtonPressed : null]}
                  disabled={item.isFirst}
                >
                  <Text style={styles.orderButtonText}>↑</Text>
                </Pressable>

                <Pressable
                  onPress={() => { void onMoveDown(item.treinoExercicioId); }}
                  style={({ pressed }) => [styles.orderButton, item.isLast ? styles.orderButtonDisabled : null, pressed ? styles.orderButtonPressed : null]}
                  disabled={item.isLast}
                >
                  <Text style={styles.orderButtonText}>↓</Text>
                </Pressable>

                <Pressable
                  onPress={() => { void onRemoveExercicio(item.treinoExercicioId); }}
                  style={({ pressed }) => [styles.removeButton, pressed ? styles.removeButtonPressed : null]}
                >
                  <Text style={styles.removeButtonText}>Remover</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      {notAddedExercises.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Adicionar exercicio</Text>
          <Text style={styles.helperText}>Toque em um exercicio para adicionar ao treino.</Text>

          {notAddedExercises.map((exercise) => (
            <Pressable
              key={exercise.id}
              onPress={() => { void onAddExercicio(exercise.id); }}
              style={({ pressed }) => [styles.availableCard, pressed ? styles.availableCardPressed : null]}
            >
              <Text style={styles.availableName}>{exercise.name}</Text>
              <Text style={styles.availableMeta}>{exercise.groupMuscle} · {exercise.category}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f0e8' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { paddingVertical: 8, paddingRight: 12 },
  backButtonPressed: { opacity: 0.6 },
  backButtonText: { color: '#c96f2d', fontSize: 15, fontWeight: '700' },
  heroCard: { backgroundColor: '#20352c', borderRadius: 24, padding: 22, gap: 10 },
  eyebrow: { color: '#b8c9a9', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#f8f4ea', fontSize: 28, fontWeight: '800' },
  description: { color: '#dde7d3', fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: '#fbf9f2', borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: '#e1dccd' },
  sectionTitle: { color: '#20352c', fontSize: 20, fontWeight: '800' },
  helperText: { color: '#66725f', fontSize: 13, lineHeight: 18 },
  emptyState: { color: '#66725f', fontSize: 14, lineHeight: 20 },
  errorMessage: { color: '#a1362e', fontSize: 14, fontWeight: '600' },
  successMessage: { color: '#2c6b42', fontSize: 14, fontWeight: '600' },
  exercicioCard: { borderRadius: 16, padding: 14, backgroundColor: '#eef1e7', gap: 10 },
  exercicioInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exercicioOrdem: { color: '#c96f2d', fontSize: 16, fontWeight: '800', minWidth: 20 },
  exercicioTexts: { flex: 1 },
  exercicioName: { color: '#20352c', fontSize: 15, fontWeight: '800' },
  exercicioMeta: { color: '#657062', fontSize: 13, marginTop: 2 },
  exercicioActions: { flexDirection: 'row', gap: 8 },
  orderButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#d9ddd0', alignItems: 'center', justifyContent: 'center' },
  orderButtonDisabled: { opacity: 0.3 },
  orderButtonPressed: { opacity: 0.7 },
  orderButtonText: { color: '#20352c', fontSize: 16, fontWeight: '700' },
  removeButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f0dbd8' },
  removeButtonPressed: { opacity: 0.75 },
  removeButtonText: { color: '#a1362e', fontSize: 13, fontWeight: '700' },
  availableCard: { borderRadius: 14, padding: 14, backgroundColor: '#eef1e7' },
  availableCardPressed: { opacity: 0.7 },
  availableName: { color: '#20352c', fontSize: 15, fontWeight: '700' },
  availableMeta: { color: '#657062', fontSize: 13, marginTop: 2 },
});
