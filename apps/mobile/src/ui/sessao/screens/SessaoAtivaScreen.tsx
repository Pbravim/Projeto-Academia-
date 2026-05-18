import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SessaoAtivaControllerState } from '../hooks/useSessaoAtivaController';
import type { SessaoExercicioComSeries } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { ExercicioCard } from '../components/ExercicioCard';
import { AddExercicioSection } from '../components/AddExercicioSection';
import { ExercicioDetalheScreen } from './ExercicioDetalheScreen';
import { SubstituirExercicioModal } from '../components/SubstituirExercicioModal';
import { useTheme } from '../../shared/theme';

const METODO_LABELS: Record<string, string> = {
  drop_set:   'Drop-set',
  piramide:   'Pirâmide',
  rest_pause: 'Rest-pause',
};

const METODO_COLORS: Record<string, string> = {
  drop_set:   '#9333ea',
  piramide:   '#d97706',
  rest_pause: '#e11d48',
};

interface Grupo {
  grupoId: string | null;
  metodo: string;
  itens: SessaoExercicioComSeries[];
}

function agruparExercicios(exercicios: SessaoExercicioComSeries[]): Grupo[] {
  const grupos: Grupo[] = [];
  const grupoMap = new Map<string, Grupo>();

  for (const item of exercicios) {
    const { grupoId, metodo } = item.sessaoExercicio;
    if (!grupoId) {
      grupos.push({ grupoId: null, metodo: 'normal', itens: [item] });
    } else if (grupoMap.has(grupoId)) {
      grupoMap.get(grupoId)!.itens.push(item);
    } else {
      const grupo: Grupo = { grupoId, metodo: metodo ?? 'normal', itens: [item] };
      grupoMap.set(grupoId, grupo);
      grupos.push(grupo);
    }
  }
  return grupos;
}

export function SessaoAtivaScreen({
  detalhe,
  sugestoes,
  availableExercises,
  showAddExercise,
  errorMessage,
  isFinalizing,
  isCanceling,
  temSerieValida,
  candidatosSubstituicao,
  sessaoExercicioSubstituindo,
  onRegistrarSerie,
  onDeleteSerie,
  onToggleRealizado,
  onAddExercicio,
  onToggleShowAddExercise,
  onFinalizar,
  onCancelar,
  onAbrirSubstituicao,
  onConfirmarSubstituicao,
  onFecharSubstituicao,
}: SessaoAtivaControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [selectedExercicioId, setSelectedExercicioId] = useState<string | null>(null);

  const handleCancelar = () => {
    Alert.alert(
      'Cancelar sessao',
      'Tem certeza? Todo o progresso desta sessao sera perdido.',
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Cancelar sessao', style: 'destructive', onPress: () => { void onCancelar(); } },
      ]
    );
  };

  if (!detalhe) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando sessao...</Text>
      </View>
    );
  }

  if (selectedExercicioId) {
    const item = detalhe.exercicios.find((e) => e.sessaoExercicio.id === selectedExercicioId);
    if (item) {
      const exercicioIds = detalhe.exercicios.map((e) => e.sessaoExercicio.id);
      const currentIndex = exercicioIds.indexOf(selectedExercicioId);
      const isLastExercicio = currentIndex === exercicioIds.length - 1;

      return (
        <>
          <ExercicioDetalheScreen
            sessaoExercicio={item.sessaoExercicio}
            series={item.series}
            sugestao={sugestoes[selectedExercicioId] ?? null}
            isLastExercicio={isLastExercicio}
            canFinalizar={temSerieValida}
            onRegistrarSerie={onRegistrarSerie}
            onDeleteSerie={onDeleteSerie}
            onToggleRealizado={onToggleRealizado}
            onAbrirSubstituicao={onAbrirSubstituicao}
            onProximoExercicio={() => setSelectedExercicioId(exercicioIds[currentIndex + 1])}
            onFinalizarSessao={() => { void onFinalizar(); }}
            onBack={() => setSelectedExercicioId(null)}
          />
          <SubstituirExercicioModal
            visible={sessaoExercicioSubstituindo === selectedExercicioId}
            candidatos={candidatosSubstituicao}
            onConfirmar={(novoId, motivo) => {
              void onConfirmarSubstituicao(novoId, motivo);
              setSelectedExercicioId(null);
            }}
            onFechar={onFecharSubstituicao}
          />
        </>
      );
    }
  }

  const inicio = new Date(detalhe.sessao.dataHoraInicio);
  const horaInicio = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Sessao em andamento</Text>
        <Text style={styles.title}>{detalhe.sessao.treinoNomeSnapshot}</Text>
        <Text style={styles.description}>Inicio: {horaInicio}</Text>
      </View>

      {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

      {agruparExercicios(detalhe.exercicios).map((grupo, gi) => {
        if (grupo.metodo === 'normal') {
          const { sessaoExercicio, series } = grupo.itens[0];
          return (
            <ExercicioCard
              key={sessaoExercicio.id}
              sessaoExercicio={sessaoExercicio}
              series={series}
              onPress={() => setSelectedExercicioId(sessaoExercicio.id)}
            />
          );
        }

        return (
          <View key={grupo.grupoId ?? gi} style={[styles.grupoCard, { borderColor: METODO_COLORS[grupo.metodo] }]}>
            <View style={[styles.grupoHeader, { backgroundColor: METODO_COLORS[grupo.metodo] }]}>
              <Text style={styles.grupoHeaderText}>{METODO_LABELS[grupo.metodo] ?? grupo.metodo}</Text>
            </View>
            {grupo.itens.map(({ sessaoExercicio, series }) => (
              <ExercicioCard
                key={sessaoExercicio.id}
                sessaoExercicio={sessaoExercicio}
                series={series}
                onPress={() => setSelectedExercicioId(sessaoExercicio.id)}
              />
            ))}
          </View>
        );
      })}

      <View style={styles.actionsCard}>
        <Pressable
          onPress={onToggleShowAddExercise}
          style={({ pressed }) => [styles.secondaryButton, pressed ? styles.secondaryButtonPressed : null]}
        >
          <Text style={styles.secondaryButtonText}>
            {showAddExercise ? 'Cancelar' : '+ Adicionar exercicio a esta sessao'}
          </Text>
        </Pressable>

        {showAddExercise ? (
          <AddExercicioSection
            availableExercises={availableExercises}
            onAdd={onAddExercicio}
          />
        ) : null}

        <Pressable
          onPress={() => { void onFinalizar(); }}
          disabled={isFinalizing || isCanceling || !temSerieValida}
          style={({ pressed }) => [
            styles.finalizarButton,
            pressed ? styles.finalizarButtonPressed : null,
            (isFinalizing || isCanceling || !temSerieValida) ? styles.finalizarButtonDisabled : null,
          ]}
        >
          <Text style={styles.finalizarButtonText}>
            {isFinalizing ? 'Finalizando...' : 'Finalizar sessao'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCancelar}
          disabled={isFinalizing || isCanceling}
          style={({ pressed }) => [
            styles.cancelarButton,
            pressed ? styles.cancelarButtonPressed : null,
            (isFinalizing || isCanceling) ? styles.cancelarButtonDisabled : null,
          ]}
        >
          <Text style={styles.cancelarButtonText}>
            {isCanceling ? 'Cancelando...' : 'Cancelar sessao'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: c.textSecondary, fontSize: 15 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 26, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 14 },
    errorMessage: { color: c.error, fontSize: 14, fontWeight: '600', paddingHorizontal: 4 },
    actionsCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    secondaryButton: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.textPrimary },
    secondaryButtonPressed: { opacity: 0.7 },
    secondaryButtonText: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    finalizarButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: c.accent },
    finalizarButtonPressed: { opacity: 0.9 },
    finalizarButtonDisabled: { opacity: 0.5 },
    finalizarButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    cancelarButton: { borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.error },
    cancelarButtonPressed: { opacity: 0.7 },
    cancelarButtonDisabled: { opacity: 0.4 },
    cancelarButtonText: { color: c.error, fontSize: 14, fontWeight: '700' },
    grupoCard: { borderRadius: 16, borderWidth: 2, overflow: 'hidden', gap: 0 },
    grupoHeader: { paddingHorizontal: 14, paddingVertical: 6 },
    grupoHeaderText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  });
}
