import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HistoricoExercicioControllerState } from '../hooks/useHistoricoExercicioController';

export function HistoricoExercicioScreen({
  viewModel,
  isLoading,
  onBack,
}: HistoricoExercicioControllerState) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [pressed ? styles.backPressed : null]}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Historico</Text>
        <Text style={styles.title}>{viewModel.exercicioNome}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#c96f2d" style={styles.loading} />
      ) : viewModel.emptyStateMessage ? (
        <View style={styles.listCard}>
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        </View>
      ) : (
        viewModel.execucoes.map((execucao, index) => (
          <View key={index} style={styles.execucaoCard}>
            <View style={styles.execucaoHeader}>
              <View>
                <Text style={styles.execucaoData}>{execucao.data}</Text>
                <Text style={styles.execucaoVolume}>Volume: {execucao.volumeTotal}</Text>
              </View>
              <Text style={styles.execucaoRm1}>Melhor 1RM: {execucao.melhorRm1}</Text>
            </View>

            {execucao.series.map((serie, serieIndex) => (
              <View
                key={serieIndex}
                style={[styles.serieRow, serie.tipo === 'aquecimento' ? styles.serieAquecimento : styles.serieValida]}
              >
                <View style={styles.serieInfo}>
                  <Text style={styles.serieTipo}>
                    {serie.tipo === 'valida' ? 'Valida' : 'Aquec.'}
                  </Text>
                  <Text style={styles.serieDescricao}>{serie.descricao}</Text>
                </View>
                {serie.rm1Estimado ? (
                  <Text style={styles.serieRm1}>{serie.rm1Estimado}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))
      )}
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    paddingVertical: 4,
  },
  backText: {
    color: '#c96f2d',
    fontSize: 15,
    fontWeight: '700',
  },
  backPressed: {
    opacity: 0.6,
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
    fontSize: 26,
    fontWeight: '800',
  },
  loading: {
    marginTop: 40,
  },
  listCard: {
    backgroundColor: '#fbf9f2',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e1dccd',
  },
  emptyState: {
    color: '#66725f',
    fontSize: 14,
    lineHeight: 20,
  },
  execucaoCard: {
    backgroundColor: '#fbf9f2',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e1dccd',
  },
  execucaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  execucaoData: {
    color: '#20352c',
    fontSize: 15,
    fontWeight: '800',
  },
  execucaoRm1: {
    color: '#c96f2d',
    fontSize: 13,
    fontWeight: '700',
  },
  execucaoVolume: {
    color: '#66725f',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  serieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  serieValida: {
    backgroundColor: '#e4ede7',
  },
  serieAquecimento: {
    backgroundColor: '#f0ede4',
  },
  serieInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serieTipo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#66725f',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 44,
  },
  serieDescricao: {
    color: '#20352c',
    fontSize: 14,
    fontWeight: '600',
  },
  serieRm1: {
    color: '#40584d',
    fontSize: 12,
    fontWeight: '600',
  },
});
