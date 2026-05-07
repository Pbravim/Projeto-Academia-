import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';

import type { SessaoAtivaControllerState } from '../hooks/useSessaoAtivaController';
import { ExercicioCard } from '../components/ExercicioCard';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { AddExercicioSection } from '../components/AddExercicioSection';
import { useTheme } from '../../shared/theme';

interface TimerState {
  exercicioNome: string;
  total: number;
  restante: number;
}

export function SessaoAtivaScreen({
  detalhe,
  sugestoes,
  availableExercises,
  showAddExercise,
  errorMessage,
  isFinalizing,
  isCanceling,
  onRegistrarSerie,
  onDeleteSerie,
  onToggleRealizado,
  onAddExercicio,
  onToggleShowAddExercise,
  onFinalizar,
  onCancelar,
}: SessaoAtivaControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [timer, setTimer] = useState<TimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (exercicioNome: string, segundos: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer({ exercicioNome, total: segundos, restante: segundos });
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (!prev) return null;
        if (prev.restante <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          Vibration.vibrate([0, 400, 100, 400]);
          return null;
        }
        return { ...prev, restante: prev.restante - 1 };
      });
    }, 1000);
  };

  const skipTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setTimer(null);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

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

      {timer ? (
        <RestTimerBanner
          nome={timer.exercicioNome}
          restante={timer.restante}
          total={timer.total}
          onSkip={skipTimer}
        />
      ) : null}

      {detalhe.exercicios.map(({ sessaoExercicio, series }) => (
        <ExercicioCard
          key={sessaoExercicio.id}
          sessaoExercicio={sessaoExercicio}
          series={series}
          sugestao={sugestoes[sessaoExercicio.id] ?? null}
          onRegistrarSerie={onRegistrarSerie}
          onDeleteSerie={onDeleteSerie}
          onToggleRealizado={onToggleRealizado}
          onSerieRegistrada={(tempoDescanso) => {
            if (tempoDescanso) startTimer(sessaoExercicio.nomeSnapshot, tempoDescanso);
          }}
        />
      ))}

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
          disabled={isFinalizing || isCanceling}
          style={({ pressed }) => [
            styles.finalizarButton,
            pressed ? styles.finalizarButtonPressed : null,
            (isFinalizing || isCanceling) ? styles.finalizarButtonDisabled : null,
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
  });
}
