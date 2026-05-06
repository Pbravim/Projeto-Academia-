import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';

import type { RegistrarSerieInput } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { SugestaoProgressao } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { SerieRegistradaPrimitives, TipoSerie } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { SessaoAtivaControllerState } from '../hooks/useSessaoAtivaController';
import { useTheme } from '../../shared/theme';

const SESSAO_GROUP_ORDER = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Quadriceps', 'Posterior', 'Gluteos', 'Panturrilha',
  'Abdomen', 'Trapezio', 'Antebraco',
];

function sessaoPrimaryGroup(groupMuscle: string): string {
  return groupMuscle.split(',')[0].trim();
}

function sessaoGroupExercises(exercises: ExercisePrimitives[]): { group: string; items: ExercisePrimitives[] }[] {
  const byGroup = new Map<string, ExercisePrimitives[]>();
  for (const ex of exercises) {
    const group = sessaoPrimaryGroup(ex.groupMuscle);
    const list = byGroup.get(group) ?? [];
    list.push(ex);
    byGroup.set(group, list);
  }
  return Array.from(byGroup.entries())
    .sort(([a], [b]) => {
      const ai = SESSAO_GROUP_ORDER.indexOf(a), bi = SESSAO_GROUP_ORDER.indexOf(b);
      const ao = ai === -1 ? SESSAO_GROUP_ORDER.length : ai;
      const bo = bi === -1 ? SESSAO_GROUP_ORDER.length : bi;
      return ao !== bo ? ao - bo : a.localeCompare(b);
    })
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

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

interface RestTimerBannerProps {
  nome: string;
  restante: number;
  total: number;
  onSkip: () => void;
}

function RestTimerBanner({ nome, restante, total, onSkip }: RestTimerBannerProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const mins = Math.floor(restante / 60);
  const secs = restante % 60;
  const label = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
  const progress = restante / total;

  return (
    <View style={styles.timerBanner}>
      <View style={styles.timerBannerTop}>
        <View>
          <Text style={styles.timerLabel}>Descanso — {nome}</Text>
          <Text style={styles.timerCountdown}>{label}</Text>
        </View>
        <Pressable onPress={onSkip} style={({ pressed }) => [styles.timerSkipBtn, pressed ? { opacity: 0.7 } : null]}>
          <Text style={styles.timerSkipText}>Pular</Text>
        </Pressable>
      </View>
      <View style={styles.timerBarTrack}>
        <View style={[styles.timerBarFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

interface ExercicioCardProps {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  sugestao: SugestaoProgressao | null;
  onRegistrarSerie: (input: RegistrarSerieInput) => Promise<void>;
  onDeleteSerie: (id: string) => Promise<void>;
  onToggleRealizado: (id: string) => Promise<void>;
  onSerieRegistrada: (tempoDescanso: number | null) => void;
}

function ExercicioCard({ sessaoExercicio, series, sugestao, onRegistrarSerie, onDeleteSerie, onToggleRealizado, onSerieRegistrada }: ExercicioCardProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const defaultDescanso = sessaoExercicio.tempoDescansoSegundos != null ? String(sessaoExercicio.tempoDescansoSegundos) : '';
  const [tipoSerie, setTipoSerie] = useState<TipoSerie>('valida');
  const [carga, setCarga] = useState(sessaoExercicio.cargaPadrao != null ? String(sessaoExercicio.cargaPadrao) : '');
  const [reps, setReps] = useState(sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '');
  const [obs, setObs] = useState('');
  const [descanso, setDescanso] = useState(defaultDescanso);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = async () => {
    setFormError(null);
    const cargaNum = parseFloat(carga.replace(',', '.'));
    const repsNum = parseInt(reps, 10);

    if (!Number.isFinite(cargaNum) || cargaNum < 0) {
      setFormError('Carga invalida. Use um numero como 80 ou 102,5.');
      return;
    }
    if (!Number.isInteger(repsNum) || repsNum < 1) {
      setFormError('Repeticoes deve ser um numero inteiro maior que 0.');
      return;
    }

    await onRegistrarSerie({
      sessaoExercicioId: sessaoExercicio.id,
      tipoSerie,
      cargaKg: cargaNum,
      repeticoes: repsNum,
      observacao: obs,
    });

    const descansoNum = parseInt(descanso, 10);
    onSerieRegistrada(Number.isInteger(descansoNum) && descansoNum > 0 ? descansoNum : null);

    // Mantém carga, reps e descanso como default para a próxima série
    setReps(sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '');
    setDescanso(defaultDescanso);
    setObs('');
  };

  const efetivamenteRealizado = sessaoExercicio.realizado && series.length > 0;

  return (
    <View style={[styles.exercicioCard, !sessaoExercicio.realizado ? styles.exercicioCardNaoRealizado : null]}>
      <View style={styles.exercicioHeader}>
        <View style={styles.exercicioInfo}>
          <Text style={styles.exercicioName}>{sessaoExercicio.nomeSnapshot}</Text>
          <Text style={styles.exercicioMeta}>
            {sessaoExercicio.grupoMuscularSnapshot} · {sessaoExercicio.categoriaSnapshot}
          </Text>
          {(sessaoExercicio.seriesRecomendadas != null || sessaoExercicio.execucoesRecomendadas != null) ? (
            <Text style={styles.metaRecs}>
              Meta: {sessaoExercicio.seriesRecomendadas ?? '?'} × {sessaoExercicio.execucoesRecomendadas ?? '?'}
              {sessaoExercicio.cargaPadrao != null ? ` @ ${sessaoExercicio.cargaPadrao}kg` : ''}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => { void onToggleRealizado(sessaoExercicio.id); }}
          style={[styles.realizadoToggle, !efetivamenteRealizado ? styles.naoRealizadoToggle : null]}
        >
          <Text style={[styles.realizadoToggleText, !efetivamenteRealizado ? styles.naoRealizadoText : null]}>
            {efetivamenteRealizado ? 'Realizado' : 'Sem series'}
          </Text>
        </Pressable>
      </View>

      {sugestao ? (
        <Pressable
          onPress={() => setCarga(String(sugestao.cargaSugerida))}
          style={({ pressed }) => [styles.sugestaoChip, pressed ? styles.sugestaoChipPressed : null]}
        >
          <Text style={styles.sugestaoText}>
            ↑ Sugestao: {sugestao.cargaSugerida} kg — {sugestao.motivo}
          </Text>
        </Pressable>
      ) : null}

      {sessaoExercicio.realizado ? (
        <>
          {series.length > 0 ? (
            <View style={styles.seriesList}>
              {series.map((serie) => (
                <View key={serie.id} style={styles.serieRow}>
                  <View style={[styles.tipoBadge, serie.tipoSerie === 'aquecimento' ? styles.tipoBadgeAquec : styles.tipoBadgeValida]}>
                    <Text style={styles.tipoBadgeText}>
                      {serie.tipoSerie === 'aquecimento' ? 'Aquec.' : 'Valida'}
                    </Text>
                  </View>
                  <Text style={styles.serieLabel}>
                    {serie.cargaKg}kg × {serie.repeticoes}
                  </Text>
                  {serie.observacao ? <Text style={styles.serieObs}>{serie.observacao}</Text> : null}
                  <Pressable
                    onPress={() => { void onDeleteSerie(serie.id); }}
                    style={({ pressed }) => [styles.deleteSerieBtn, pressed ? { opacity: 0.6 } : null]}
                  >
                    <Text style={styles.deleteSerieBtnText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.addSerieForm}>
            <View style={styles.tipoToggle}>
              <Pressable
                onPress={() => setTipoSerie('aquecimento')}
                style={[styles.tipoBtn, tipoSerie === 'aquecimento' ? styles.tipoBtnActive : null]}
              >
                <Text style={[styles.tipoBtnText, tipoSerie === 'aquecimento' ? styles.tipoBtnTextActive : null]}>Aquec.</Text>
              </Pressable>
              <Pressable
                onPress={() => setTipoSerie('valida')}
                style={[styles.tipoBtn, tipoSerie === 'valida' ? styles.tipoBtnActive : null]}
              >
                <Text style={[styles.tipoBtnText, tipoSerie === 'valida' ? styles.tipoBtnTextActive : null]}>Valida</Text>
              </Pressable>
            </View>

            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.formInputSmall]}
                placeholder="Carga (kg)"
                placeholderTextColor={c.inputPlaceholder}
                value={carga}
                onChangeText={setCarga}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.formInput, styles.formInputSmall]}
                placeholder="Reps"
                placeholderTextColor={c.inputPlaceholder}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.formInput, styles.formInputObs]}
                placeholder="Obs."
                placeholderTextColor={c.inputPlaceholder}
                value={obs}
                onChangeText={setObs}
              />
              <TextInput
                style={[styles.formInput, styles.formInputDescanso]}
                placeholder="⏱ s"
                placeholderTextColor={c.inputPlaceholder}
                value={descanso}
                onChangeText={setDescanso}
                keyboardType="number-pad"
              />
            </View>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Pressable
              onPress={() => { void handleAdd(); }}
              style={({ pressed }) => [styles.addSerieBtn, pressed ? { opacity: 0.85 } : null]}
            >
              <Text style={styles.addSerieBtnText}>+ Registrar serie</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

interface AddExercicioSectionProps {
  availableExercises: ExercisePrimitives[];
  onAdd: (id: string) => Promise<void>;
}

function AddExercicioSection({ availableExercises, onAdd }: AddExercicioSectionProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (availableExercises.length === 0) {
    return <Text style={styles.emptyAddText}>Todos os exercicios ja estao nesta sessao.</Text>;
  }

  return (
    <View style={styles.addExercicioList}>
      {sessaoGroupExercises(availableExercises).map(({ group, items }) => (
        <SessaoExerciseGroup key={group} group={group} items={items} onAdd={onAdd} />
      ))}
    </View>
  );
}

interface SessaoExerciseGroupProps {
  group: string;
  items: ExercisePrimitives[];
  onAdd: (id: string) => Promise<void>;
}

function SessaoExerciseGroup({ group, items, onAdd }: SessaoExerciseGroupProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.sessaoGroupHeader, pressed ? { opacity: 0.85 } : null]}
      >
        <View style={styles.sessaoGroupHeaderLeft}>
          <Text style={styles.sessaoGroupTitle}>{group}</Text>
          <View style={styles.sessaoGroupBadge}>
            <Text style={styles.sessaoGroupBadgeText}>{items.length}</Text>
          </View>
        </View>
        <Text style={styles.sessaoGroupChevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.sessaoGroupBody}>
          {items.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => { void onAdd(ex.id); }}
              style={({ pressed }) => [styles.availableCard, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={styles.availableName}>{ex.name}</Text>
              <Text style={styles.availableMeta}>{ex.groupMuscle} · {ex.category}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
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
    exercicioCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    exercicioCardNaoRealizado: { opacity: 0.55 },
    exercicioHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    exercicioInfo: { flex: 1 },
    exercicioName: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    exercicioMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    metaRecs: { color: c.accent, fontSize: 12, fontWeight: '700', marginTop: 4 },
    sugestaoChip: { backgroundColor: c.accentLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    sugestaoChipPressed: { opacity: 0.75 },
    sugestaoText: { color: c.inputText, fontSize: 12, fontWeight: '700' },
    realizadoToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: c.successBg },
    naoRealizadoToggle: { backgroundColor: c.errorBg },
    realizadoToggleText: { color: c.inputText, fontSize: 12, fontWeight: '700' },
    naoRealizadoText: { color: c.error },
    seriesList: { gap: 6 },
    serieRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.cardAlt, borderRadius: 10, padding: 8 },
    tipoBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    tipoBadgeAquec: { backgroundColor: '#d4e8fc' },
    tipoBadgeValida: { backgroundColor: c.accentLight },
    tipoBadgeText: { fontSize: 11, fontWeight: '700', color: c.inputText },
    serieLabel: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '600' },
    serieObs: { color: c.textSecondary, fontSize: 12, flexShrink: 1 },
    deleteSerieBtn: { padding: 4 },
    deleteSerieBtnText: { color: c.error, fontSize: 14, fontWeight: '700' },
    addSerieForm: { gap: 10 },
    tipoToggle: { flexDirection: 'row', gap: 8 },
    tipoBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: c.cardAlt },
    tipoBtnActive: { backgroundColor: c.accent },
    tipoBtnText: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    tipoBtnTextActive: { color: c.accentText },
    formRow: { flexDirection: 'row', gap: 8 },
    formInput: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, color: c.inputText, fontSize: 14 },
    formInputSmall: { width: 90 },
    formInputObs: { flex: 1 },
    formInputDescanso: { width: 54 },
    formError: { color: c.error, fontSize: 13 },
    addSerieBtn: { backgroundColor: c.hero, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    addSerieBtnText: { color: c.heroText, fontSize: 14, fontWeight: '700' },
    actionsCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    secondaryButton: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.textPrimary },
    secondaryButtonPressed: { opacity: 0.7 },
    secondaryButtonText: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    addExercicioList: { gap: 4 },
    emptyAddText: { color: c.textSecondary, fontSize: 13 },
    sessaoGroupHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.hero, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 2 },
    sessaoGroupHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    sessaoGroupTitle: { color: c.heroText, fontSize: 13, fontWeight: '800' },
    sessaoGroupBadge: { backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
    sessaoGroupBadgeText: { color: c.accentText, fontSize: 11, fontWeight: '800' },
    sessaoGroupChevron: { color: c.heroSubtext, fontSize: 10, fontWeight: '700' },
    sessaoGroupBody: { gap: 4, paddingBottom: 4 },
    availableCard: { borderRadius: 12, padding: 12, backgroundColor: c.cardAlt },
    availableName: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    availableMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    finalizarButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: c.accent },
    finalizarButtonPressed: { opacity: 0.9 },
    finalizarButtonDisabled: { opacity: 0.5 },
    finalizarButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    cancelarButton: { borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.error },
    cancelarButtonPressed: { opacity: 0.7 },
    cancelarButtonDisabled: { opacity: 0.4 },
    cancelarButtonText: { color: c.error, fontSize: 14, fontWeight: '700' },
    timerBanner: { backgroundColor: c.hero, borderRadius: 20, padding: 16, gap: 10 },
    timerBannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    timerLabel: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    timerCountdown: { color: c.heroText, fontSize: 32, fontWeight: '800', marginTop: 2 },
    timerSkipBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: c.inputBorder },
    timerSkipText: { color: c.heroSubtext, fontSize: 13, fontWeight: '700' },
    timerBarTrack: { height: 6, borderRadius: 3, backgroundColor: c.hero, overflow: 'hidden' },
    timerBarFill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
  });
}
