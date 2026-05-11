import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HistoricoExercicioControllerState } from '../hooks/useHistoricoExercicioController';
import { LineChart } from '../../shared/LineChart';
import { useTheme } from '../../shared/theme';

export function HistoricoExercicioScreen({
  viewModel,
  isLoading,
  onBack,
}: HistoricoExercicioControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) { next.delete(index); } else { next.add(index); }
      return next;
    });
  };

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

      {!isLoading && viewModel.plateau ? (
        <View style={styles.plateauBanner}>
          <Text style={styles.plateauTitle}>⚠ Plateau detectado</Text>
          <Text style={styles.plateauText}>{viewModel.plateau.mensagem}</Text>
        </View>
      ) : null}

      {!isLoading && viewModel.rm1ChartPoints.length >= 1 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Evolucao do 1RM estimado</Text>
          {viewModel.rm1ChartPoints.length >= 2 ? (
            <LineChart
              points={viewModel.rm1ChartPoints}
              formatValue={(v) => `${v} kg`}
            />
          ) : (
            <Text style={styles.chartEmpty}>
              Faca mais sessoes para visualizar a evolucao em grafico.
            </Text>
          )}
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator size="large" color={c.accent} style={styles.loading} />
      ) : viewModel.emptyStateMessage ? (
        <View style={styles.listCard}>
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        </View>
      ) : (
        viewModel.execucoes.map((execucao, index) => {
          const isExpanded = expandedIndexes.has(index);
          return (
            <View key={index} style={styles.execucaoCard}>
              <Pressable
                onPress={() => toggleExpanded(index)}
                style={({ pressed }) => [styles.execucaoHeader, pressed ? { opacity: 0.7 } : null]}
              >
                <View>
                  <Text style={styles.execucaoData}>{execucao.data}</Text>
                  <Text style={styles.execucaoVolume}>Volume: {execucao.volumeTotal}</Text>
                </View>
                <View style={styles.execucaoHeaderRight}>
                  <Text style={styles.execucaoRm1}>Melhor 1RM: {execucao.melhorRm1}</Text>
                  <Text style={styles.execucaoChevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </Pressable>

              {isExpanded ? execucao.series.map((serie, serieIndex) => (
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
              )) : null}
            </View>
          );
        })
      )}
    </ScrollView>
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
      paddingTop: 16,
      paddingBottom: 40,
      gap: 14,
    },
    header: {
      paddingVertical: 4,
    },
    backText: {
      color: c.accent,
      fontSize: 15,
      fontWeight: '700',
    },
    backPressed: {
      opacity: 0.6,
    },
    heroCard: {
      backgroundColor: c.hero,
      borderRadius: 24,
      padding: 22,
      gap: 8,
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
      fontSize: 26,
      fontWeight: '800',
    },
    loading: {
      marginTop: 40,
    },
    chartCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chartTitle: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    chartEmpty: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    plateauBanner: {
      backgroundColor: c.warningBg,
      borderRadius: 20,
      padding: 16,
      gap: 6,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    plateauTitle: {
      color: c.warning,
      fontSize: 14,
      fontWeight: '800',
    },
    plateauText: {
      color: c.warning,
      fontSize: 13,
      lineHeight: 18,
    },
    listCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    emptyState: {
      color: c.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    execucaoCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    execucaoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    execucaoHeaderRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    execucaoChevron: {
      color: c.textSecondary,
      fontSize: 10,
      fontWeight: '700',
    },
    execucaoData: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    execucaoRm1: {
      color: c.accent,
      fontSize: 13,
      fontWeight: '700',
    },
    execucaoVolume: {
      color: c.textSecondary,
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
      backgroundColor: c.cardAlt,
    },
    serieAquecimento: {
      backgroundColor: c.background,
    },
    serieInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    serieTipo: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      minWidth: 44,
    },
    serieDescricao: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    serieRm1: {
      color: c.textLabel,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
