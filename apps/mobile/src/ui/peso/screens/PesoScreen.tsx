import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PesoControllerState } from '../hooks/usePesoController';

export function PesoScreen({
  viewModel,
  pesoKgInput,
  observacaoInput,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  onChangePesoKg,
  onChangeObservacao,
  onSubmit,
  onDelete,
}: PesoControllerState) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Acompanhamento</Text>
        <Text style={styles.title}>Peso corporal</Text>
        {viewModel.pesoAtual ? (
          <Text style={styles.pesoAtual}>{viewModel.pesoAtual} agora</Text>
        ) : null}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Registrar peso</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Peso (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 80.5"
            placeholderTextColor="#7f856f"
            value={pesoKgInput}
            onChangeText={onChangePesoKg}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Observacao (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Em jejum"
            placeholderTextColor="#7f856f"
            value={observacaoInput}
            onChangeText={onChangeObservacao}
          />
        </View>

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
            {isSubmitting ? 'Salvando...' : 'Registrar'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Historico</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color="#c96f2d" style={styles.loading} />
        ) : viewModel.emptyStateMessage ? (
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        ) : (
          viewModel.cards.map((card) => (
            <View key={card.id} style={styles.registroCard}>
              <View style={styles.registroMain}>
                <View>
                  <Text style={styles.registroPeso}>{card.peso}</Text>
                  <Text style={styles.registroData}>{card.data}</Text>
                  {card.observacao ? (
                    <Text style={styles.registroObservacao}>{card.observacao}</Text>
                  ) : null}
                </View>

                <View style={styles.registroRight}>
                  {card.delta ? (
                    <Text style={[styles.registroDelta, card.deltaPositivo ? styles.deltaNegativo : styles.deltaPositivo]}>
                      {card.delta}
                    </Text>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => { void onDelete(card.id); }}
                    style={({ pressed }) => [styles.deleteButton, pressed ? styles.deleteButtonPressed : null]}
                  >
                    <Text style={styles.deleteButtonText}>Excluir</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
    gap: 8,
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
  pesoAtual: {
    color: '#b8c9a9',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
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
  registroCard: {
    backgroundColor: '#eef1e7',
    borderRadius: 16,
    padding: 14,
  },
  registroMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  registroPeso: {
    color: '#20352c',
    fontSize: 22,
    fontWeight: '800',
  },
  registroData: {
    color: '#40584d',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  registroObservacao: {
    color: '#66725f',
    fontSize: 12,
    marginTop: 2,
  },
  registroRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  registroDelta: {
    fontSize: 14,
    fontWeight: '700',
  },
  deltaPositivo: {
    color: '#2c6b42',
  },
  deltaNegativo: {
    color: '#a1362e',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f0dbd8',
  },
  deleteButtonPressed: {
    opacity: 0.75,
  },
  deleteButtonText: {
    color: '#a1362e',
    fontSize: 12,
    fontWeight: '700',
  },
});
