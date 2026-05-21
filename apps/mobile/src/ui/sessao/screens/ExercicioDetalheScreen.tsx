import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';

import type { RegistrarSerieInput } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { SugestaoProgressao } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';

type MetodoSessao = SessaoExercicioPrimitives['metodo'];

const TECNICAS: { value: Exclude<MetodoSessao, 'normal'>; label: string; color: string; descricao: string }[] = [
  { value: 'drop_set',   label: 'Drop-set',   color: '#9333ea', descricao: 'Reduza a carga a cada serie sem descanso' },
  { value: 'piramide',   label: 'Piramide',   color: '#d97706', descricao: 'Aumente a carga progressivamente' },
  { value: 'rest_pause', label: 'Rest-pause', color: '#e11d48', descricao: 'Breve pausa entre reps para mais volume' },
];
import { PickerCarousel } from '../components/PickerCarousel';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { ExerciseMediaViewer } from '../../exercises/components/ExerciseMediaViewer';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useTheme } from '../../shared/theme';

interface Props {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  sugestao: SugestaoProgressao | null;
  isLastExercicio: boolean;
  canFinalizar?: boolean;
  mediaOnline: string | null;
  mediaLocal: string | null;
  onRegistrarSerie: (input: RegistrarSerieInput) => Promise<void>;
  onRegistrarSeriesEmLote: (inputs: RegistrarSerieInput[]) => Promise<void>;
  onDeleteSerie: (id: string) => Promise<void>;
  onUpdateSerie: (input: { serieId: string; cargaKg: number; repeticoes: number; observacao?: string | null }) => Promise<void>;
  onToggleRealizado: (id: string) => Promise<void>;
  onAbrirSubstituicao: (id: string) => Promise<void>;
  onAtualizarMetodo: (id: string, metodo: MetodoSessao) => Promise<void>;
  onProximoExercicio: () => void;
  onFinalizarSessao: () => void;
  onBack: () => void;
}

interface TimerState { total: number; restante: number }

// 0, 2.5, 5, …, 200 kg
const KG_VALUES = Array.from({ length: 81 }, (_, i) => i * 2.5);

const DESCANSO_PRESETS: { label: string; value: number | null }[] = [
  { label: 'Off', value: null },
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '1min', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
];

function kgIndexFor(kg: number): number {
  return Math.max(0, Math.min(Math.round(kg / 2.5), KG_VALUES.length - 1));
}

export function ExercicioDetalheScreen({
  sessaoExercicio,
  series,
  sugestao,
  isLastExercicio,
  canFinalizar = true,
  mediaOnline,
  mediaLocal,
  onRegistrarSerie,
  onRegistrarSeriesEmLote,
  onDeleteSerie,
  onUpdateSerie,
  onToggleRealizado,
  onAbrirSubstituicao,
  onAtualizarMetodo,
  onProximoExercicio,
  onFinalizarSessao,
  onBack,
}: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  // --- form state ---
  const [mediaVisible, setMediaVisible] = useState(false);

  const [cargaMode, setCargaMode] = useState<'carousel' | 'text'>('carousel');
  const [cargaIndex, setCargaIndex] = useState(
    sessaoExercicio.cargaPadrao != null ? kgIndexFor(sessaoExercicio.cargaPadrao) : 0,
  );
  const [cargaText, setCargaText] = useState(
    sessaoExercicio.cargaPadrao != null ? String(sessaoExercicio.cargaPadrao) : '',
  );

  const [repsMode, setRepsMode] = useState<'carousel' | 'text'>('carousel');
  const [repsIndex, setRepsIndex] = useState(
    Math.max(0, Math.min((sessaoExercicio.execucoesRecomendadas ?? 8) - 1, 29)),
  );
  const [repsText, setRepsText] = useState(
    String(sessaoExercicio.execucoesRecomendadas ?? 8),
  );

  const [descanso, setDescanso] = useState<number | null>(sessaoExercicio.tempoDescansoSegundos ?? null);
  const [metodo, setMetodo] = useState<MetodoSessao>(sessaoExercicio.metodo);
  const [customDescansoOpen, setCustomDescansoOpen] = useState(false);
  const [customDescansoText, setCustomDescansoText] = useState('');

  const [obs, setObs] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingSerie, setIsSubmittingSerie] = useState(false);
  const [deletingSerieIds, setDeletingSerieIds] = useState<Set<string>>(new Set());
  const [editingSerieId, setEditingSerieId] = useState<string | null>(null);
  const [editKg, setEditKg] = useState(0);
  const [editReps, setEditReps] = useState(0);

  // --- timer ---
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [timerMinimized, setTimerMinimized] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerMinimizedByScrollRef = useRef(false);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCargaMode('carousel');
    setCargaIndex(sessaoExercicio.cargaPadrao != null ? kgIndexFor(sessaoExercicio.cargaPadrao) : 0);
    setCargaText(sessaoExercicio.cargaPadrao != null ? String(sessaoExercicio.cargaPadrao) : '');
    setRepsMode('carousel');
    setRepsIndex(Math.max(0, Math.min((sessaoExercicio.execucoesRecomendadas ?? 8) - 1, 29)));
    setRepsText(String(sessaoExercicio.execucoesRecomendadas ?? 8));
    setDescanso(sessaoExercicio.tempoDescansoSegundos ?? null);
    setMetodo(sessaoExercicio.metodo);
    setCustomDescansoOpen(false);
    setCustomDescansoText('');
    setObs('');
    setFormError(null);
    setTimer(null);
    setTimerMinimized(false);
  }, [sessaoExercicio.id]);

  const startTimer = (segundos: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerMinimizedByScrollRef.current = false;
    setTimerMinimized(false); // always expand when a new timer starts
    setTimer({ total: segundos, restante: segundos });
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

  // --- kg mode toggle ---
  const switchToText = () => {
    setCargaText(String(KG_VALUES[cargaIndex]));
    setCargaMode('text');
  };

  const switchToCarousel = () => {
    const num = parseFloat(cargaText.replace(',', '.'));
    if (Number.isFinite(num) && num >= 0) setCargaIndex(kgIndexFor(num));
    setCargaMode('carousel');
  };

  const switchRepsToText = () => {
    setRepsText(String(repsIndex + 1));
    setRepsMode('text');
  };

  const switchRepsToCarousel = () => {
    const num = parseInt(repsText, 10);
    if (Number.isInteger(num) && num >= 1 && num <= 30) setRepsIndex(num - 1);
    setRepsMode('carousel');
  };

  // sugestao fills text mode (exact decimal values may not be in carousel steps)
  const handleSugestao = () => {
    setCargaText(String(sugestao!.cargaSugerida));
    setCargaMode('text');
  };

  const sugestaoLabel = (() => {
    if (!sugestao) return '';
    const ref = sessaoExercicio.cargaPadrao;
    if (ref != null) {
      const delta = sugestao.cargaSugerida - ref;
      return delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}kg` : `${sugestao.cargaSugerida}kg`;
    }
    return `${sugestao.cargaSugerida}kg`;
  })();

  const adjustCarga = (delta: number) => {
    const current = parseFloat(cargaText.replace(',', '.'));
    const base = Number.isFinite(current) && current >= 0 ? current : 0;
    const result = Math.max(0, Math.round((base + delta) * 10) / 10);
    setCargaText(String(result));
  };

  // --- custom rest ---
  const handleConfirmCustomDescanso = () => {
    const num = parseInt(customDescansoText, 10);
    if (Number.isInteger(num) && num > 0) {
      setDescanso(num);
      setCustomDescansoOpen(false);
      setCustomDescansoText('');
    }
  };

  const isCustomDescanso = descanso !== null && !DESCANSO_PRESETS.some(p => p.value === descanso);

  // --- submit ---
  const handleAdd = async () => {
    if (isSubmittingSerie) return;
    setIsSubmittingSerie(true);
    setFormError(null);

    const cargaNum = cargaMode === 'carousel'
      ? KG_VALUES[cargaIndex]
      : parseFloat(cargaText.replace(',', '.'));

    if (!Number.isFinite(cargaNum) || cargaNum < 0) {
      setFormError('Carga invalida. Use um numero como 80 ou 102,5.');
      setIsSubmittingSerie(false);
      return;
    }

    try {
      const repsNum = repsMode === 'carousel'
        ? repsIndex + 1
        : parseInt(repsText, 10);

      if (!Number.isInteger(repsNum) || repsNum < 1) {
        setFormError('Reps invalidas. Use um numero inteiro maior que 0.');
        setIsSubmittingSerie(false);
        return;
      }

      await onRegistrarSerie({
        sessaoExercicioId: sessaoExercicio.id,
        cargaKg: cargaNum,
        repeticoes: repsNum,
        observacao: obs,
      });

      if (descanso != null) startTimer(descanso);
      setObs('');
    } finally {
      setIsSubmittingSerie(false);
    }
  };

  const formatKgItem = useCallback((i: number) => String(KG_VALUES[i]), []);
  const formatRepsItem = useCallback((i: number) => String(i + 1), []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => {
        if (timer && !timerMinimizedByScrollRef.current) {
          timerMinimizedByScrollRef.current = true;
          setTimerMinimized(true);
        }
      }}
    >
      {/* Header — back arrow + exercise name + substituir + finalizar */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle} numberOfLines={1}>{sessaoExercicio.nomeSnapshot}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {sessaoExercicio.grupoMuscularSnapshot}
            {sessaoExercicio.equipamentoSnapshot ? ` · ${sessaoExercicio.equipamentoSnapshot}` : ''}
          </Text>
          {sessaoExercicio.nomeOriginalSnapshot ? (
            <Text style={styles.substituicaoBadge} numberOfLines={1}>
              ↔ {sessaoExercicio.nomeOriginalSnapshot}
            </Text>
          ) : null}
        </View>
        {!sessaoExercicio.realizado ? (
          <Pressable
            onPress={() => { void onAbrirSubstituicao(sessaoExercicio.id); }}
            style={({ pressed }) => [styles.substituirBtn, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={styles.substituirBtnText}>Trocar exercicio</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => { void onToggleRealizado(sessaoExercicio.id); }}
          style={[styles.finalizadoToggle, sessaoExercicio.realizado ? styles.finalizadoToggleOn : styles.finalizadoToggleOff]}
        >
          <Text style={[styles.finalizadoToggleText, sessaoExercicio.realizado ? styles.finalizadoToggleTextOn : styles.finalizadoToggleTextOff]}>
            {sessaoExercicio.realizado ? 'Retomar' : 'Finalizar'}
          </Text>
        </Pressable>
      </View>

      {/* Media — only shown while exercise is active */}
      {!sessaoExercicio.realizado ? (
        <ExerciseMediaViewer
          visible={mediaVisible}
          exercicioNome={sessaoExercicio.nomeSnapshot}
          mediaOnline={mediaOnline}
          mediaLocal={mediaLocal}
          onClose={() => setMediaVisible(false)}
        />
      ) : null}

      {/* Stats — shown when exercise is done and has series */}
      {sessaoExercicio.realizado && series.filter(s => s.tipoSerie === 'valida').length > 0 ? (() => {
        const validSeries = series.filter(s => s.tipoSerie === 'valida');
        const totalVolume = validSeries.reduce((sum, s) => sum + s.cargaKg * s.repeticoes, 0);
        const maxCarga = Math.max(...validSeries.map(s => s.cargaKg));
        const totalReps = validSeries.reduce((sum, s) => sum + s.repeticoes, 0);
        const avgReps = Math.round(totalReps / validSeries.length);
        const volumes = validSeries.map(s => s.cargaKg * s.repeticoes);
        const maxVolume = Math.max(...volumes, 1);
        const BARS_H = 80;

        const hasMeta = sessaoExercicio.seriesRecomendadas != null
          || sessaoExercicio.execucoesRecomendadas != null
          || sessaoExercicio.cargaPadrao != null;

        return (
          <View style={styles.statsCard}>

            {/* Meta / objetivo */}
            {hasMeta ? (
              <>
                <Text style={styles.statsSectionLabel}>Objetivo</Text>
                <View style={styles.statsPillsMuted}>
                  {sessaoExercicio.seriesRecomendadas != null ? (
                    <View style={styles.statPill}>
                      <Text style={styles.statValueMuted}>{sessaoExercicio.seriesRecomendadas}</Text>
                      <Text style={styles.statLabel}>Series</Text>
                    </View>
                  ) : null}
                  {sessaoExercicio.seriesRecomendadas != null && (sessaoExercicio.execucoesRecomendadas != null || sessaoExercicio.cargaPadrao != null) ? (
                    <View style={styles.statDivider} />
                  ) : null}
                  {sessaoExercicio.execucoesRecomendadas != null ? (
                    <View style={styles.statPill}>
                      <Text style={styles.statValueMuted}>{sessaoExercicio.execucoesRecomendadas}</Text>
                      <Text style={styles.statLabel}>Reps/serie</Text>
                    </View>
                  ) : null}
                  {sessaoExercicio.execucoesRecomendadas != null && sessaoExercicio.cargaPadrao != null ? (
                    <View style={styles.statDivider} />
                  ) : null}
                  {sessaoExercicio.cargaPadrao != null ? (
                    <View style={styles.statPill}>
                      <Text style={styles.statValueMuted}>{sessaoExercicio.cargaPadrao}kg</Text>
                      <Text style={styles.statLabel}>Carga</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.statsSeparator} />
              </>
            ) : null}

            {/* Realizado */}
            <Text style={styles.statsSectionLabel}>Realizado</Text>
            <View style={styles.statsPills}>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{validSeries.length}</Text>
                <Text style={styles.statLabel}>Series</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{avgReps}</Text>
                <Text style={styles.statLabel}>Reps/serie</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{maxCarga}kg</Text>
                <Text style={styles.statLabel}>Max</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{totalVolume.toLocaleString('pt-BR')}kg</Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>
            </View>

            <View style={styles.statsSeparator} />

            {/* Volume bar chart */}
            <Text style={styles.statsSectionLabel}>Volume por serie</Text>
            <View style={styles.barsContainer}>
              {validSeries.map((serie, i) => {
                const vol = serie.cargaKg * serie.repeticoes;
                const barH = Math.max(12, (vol / maxVolume) * BARS_H);
                return (
                  <View key={serie.id} style={styles.barCol}>
                    <Text style={styles.chartBarTopLabel}>{serie.cargaKg}kg</Text>
                    <View style={[styles.chartBar, { height: barH }]} />
                  </View>
                );
              })}
            </View>
            <View style={styles.barLabelRow}>
              {validSeries.map((serie, i) => (
                <View key={serie.id} style={styles.barLabelCol}>
                  <Text style={styles.chartBarBotLabel}>×{serie.repeticoes}</Text>
                  <Text style={styles.chartBarXLabel}>S{i + 1}</Text>
                </View>
              ))}
            </View>

          </View>
        );
      })() : null}

      {/* Navigation — shown when exercise is done */}
      {sessaoExercicio.realizado ? (
        <View style={styles.formCard}>
          <Pressable
            onPress={() => {
              if (isLastExercicio) {
                onFinalizarSessao();
              } else {
                onProximoExercicio();
              }
            }}
            disabled={isLastExercicio && !canFinalizar}
            style={({ pressed }) => [
              styles.navegacaoBtn,
              isLastExercicio ? styles.navegacaoBtnFinalizar : styles.navegacaoBtnProximo,
              pressed ? { opacity: 0.85 } : null,
              (isLastExercicio && !canFinalizar) ? { opacity: 0.4 } : null,
            ]}
          >
            <Text style={[styles.navegacaoBtnText, isLastExercicio ? styles.navegacaoBtnTextFinalizar : styles.navegacaoBtnTextProximo]}>
              {isLastExercicio ? 'Finalizar sessao' : 'Proximo exercicio →'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Registration form */}
      {!sessaoExercicio.realizado ? (
        <View style={styles.formCard}>
          {/* Series progress */}
          {sessaoExercicio.seriesRecomendadas != null ? (() => {
            const total = sessaoExercicio.seriesRecomendadas!;
            const validCount = series.filter((s) => s.tipoSerie === 'valida').length;
            const allDone = validCount >= total;
            const dotCount = Math.min(total, 12);
            const overflow = total > 12 ? total - 12 : 0;
            return (
              <View style={styles.seriesProgressSection}>
                <View style={styles.seriesProgressRow}>
                  <View style={styles.seriesProgressLeft}>
                    <View style={styles.seriesProgressDots}>
                      {Array.from({ length: dotCount }).map((_, i) => (
                        <View
                          key={i}
                          style={[styles.seriesProgressDot, i < validCount ? (allDone ? styles.seriesProgressDotDone : styles.seriesProgressDotFilled) : styles.seriesProgressDotEmpty]}
                        />
                      ))}
                      {overflow > 0 ? <Text style={styles.seriesProgressOverflow}>+{overflow}</Text> : null}
                    </View>
                    <Text style={[styles.seriesProgressLabel, allDone ? styles.seriesProgressLabelDone : null]}>
                      {validCount}/{total} series
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setMediaVisible((v) => !v)}
                    style={({ pressed }) => [styles.mediaInlineBtn, pressed ? { opacity: 0.7 } : null]}
                  >
                    <Text style={styles.mediaInlineBtnIcon}>{mediaVisible ? '✕' : '▶'}</Text>
                    <Text style={styles.mediaInlineBtnText}>{mediaVisible ? 'Fechar' : 'Ver execucao'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })() : null}

          {/* Suggestion — full-width above both carousels so alignment is unaffected */}
          {sugestao ? (
            <Pressable onPress={handleSugestao} style={({ pressed }) => [styles.sugestaoChip, pressed ? { opacity: 0.75 } : null]}>
              <Text style={styles.sugestaoText}>↑ {sugestaoLabel} — {sugestao.motivo}</Text>
            </Pressable>
          ) : null}

          {/* Pickers row — each column is independently carousel or text */}
          <View style={styles.textModeRow}>
            {/* Carga column */}
            {cargaMode === 'carousel' ? (
              <View style={styles.pickerCol}>
                <View style={styles.pickerLabelRow}>
                  <Text style={styles.pickerLabel}>Carga (kg)</Text>
                  <Pressable onPress={switchToText}>
                    <Text style={styles.modeToggleText}>Digitar</Text>
                  </Pressable>
                </View>
                <PickerCarousel
                  count={KG_VALUES.length}
                  selectedIndex={cargaIndex}
                  onChangeIndex={setCargaIndex}
                  formatItem={formatKgItem}
                />
              </View>
            ) : (
              <View style={styles.textModeCol}>
                <View style={styles.pickerLabelRow}>
                  <Text style={styles.pickerLabel}>Carga (kg)</Text>
                  <Pressable onPress={switchToCarousel}>
                    <Text style={styles.modeToggleText}>Rolar</Text>
                  </Pressable>
                </View>
                <TextInput
                  style={styles.cargaInput}
                  value={cargaText}
                  onChangeText={setCargaText}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={c.inputPlaceholder}
                  textAlign="center"
                  editable={!isSubmittingSerie}
                  autoFocus={repsMode !== 'text'}
                />
                <View style={styles.adjustRow}>
                  {([-5, -2.5, 2.5, 5] as const).map((delta) => (
                    <Pressable
                      key={delta}
                      onPress={() => adjustCarga(delta)}
                      disabled={isSubmittingSerie}
                      style={({ pressed }) => [styles.adjustBtn, pressed ? { opacity: 0.6 } : null]}
                    >
                      <Text style={styles.adjustBtnText}>{delta > 0 ? `+${delta}` : delta}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Reps column */}
            {repsMode === 'carousel' ? (
              <View style={styles.pickerCol}>
                <View style={styles.pickerLabelRow}>
                  <Text style={styles.pickerLabel}>Reps</Text>
                  <Pressable onPress={switchRepsToText}>
                    <Text style={styles.modeToggleText}>Digitar</Text>
                  </Pressable>
                </View>
                <PickerCarousel
                  count={30}
                  selectedIndex={repsIndex}
                  onChangeIndex={setRepsIndex}
                  formatItem={formatRepsItem}
                />
              </View>
            ) : (
              <View style={styles.textModeCol}>
                <View style={styles.pickerLabelRow}>
                  <Text style={styles.pickerLabel}>Reps</Text>
                  <Pressable onPress={switchRepsToCarousel}>
                    <Text style={styles.modeToggleText}>Rolar</Text>
                  </Pressable>
                </View>
                <TextInput
                  style={styles.cargaInput}
                  value={repsText}
                  onChangeText={setRepsText}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={c.inputPlaceholder}
                  textAlign="center"
                  editable={!isSubmittingSerie}
                  autoFocus
                />
              </View>
            )}
          </View>

          {/* Rest options */}
          <View style={styles.descansoSection}>
            <Text style={styles.pickerLabel}>Descanso</Text>
            <View style={styles.chipsRow}>
              {DESCANSO_PRESETS.map((preset) => {
                const active = descanso === preset.value && !isCustomDescanso;
                return (
                  <Pressable
                    key={String(preset.value)}
                    onPress={() => { setDescanso(preset.value); setCustomDescansoOpen(false); }}
                    style={[styles.chip, active ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{preset.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setCustomDescansoOpen((v) => !v)}
                style={[styles.chip, (customDescansoOpen || isCustomDescanso) ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, (customDescansoOpen || isCustomDescanso) ? styles.chipTextActive : null]}>
                  {isCustomDescanso ? `${descanso}s` : '+ Custom'}
                </Text>
              </Pressable>
            </View>

            {customDescansoOpen ? (
              <View style={styles.customDescansoRow}>
                <TextInput
                  style={styles.customDescansoInput}
                  value={customDescansoText}
                  onChangeText={setCustomDescansoText}
                  keyboardType="number-pad"
                  placeholder="Segundos"
                  placeholderTextColor={c.inputPlaceholder}
                  autoFocus
                />
                <Pressable onPress={handleConfirmCustomDescanso} style={styles.customDescansoOk}>
                  <Text style={styles.customDescansoOkText}>OK</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Observation */}
          <TextInput
            style={styles.obsInput}
            placeholder="Observacao (opcional)"
            placeholderTextColor={c.inputPlaceholder}
            value={obs}
            onChangeText={setObs}
            editable={!isSubmittingSerie}
          />

          {/* Technique selector */}
          <View style={styles.tecnicaSection}>
            <Text style={styles.pickerLabel}>Tecnica</Text>
            <View style={styles.tecnicaChipsRow}>
              <Pressable
                onPress={() => { setMetodo('normal'); void onAtualizarMetodo(sessaoExercicio.id, 'normal'); }}
                style={[styles.tecnicaChip, metodo === 'normal' ? styles.tecnicaChipNormal : null]}
              >
                <Text style={[styles.tecnicaChipText, metodo === 'normal' ? styles.tecnicaChipTextNormal : null]}>Normal</Text>
              </Pressable>
              {TECNICAS.map((t) => {
                const active = metodo === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => { setMetodo(t.value); void onAtualizarMetodo(sessaoExercicio.id, t.value); }}
                    style={[styles.tecnicaChip, active ? { backgroundColor: t.color, borderColor: t.color } : null]}
                  >
                    <Text style={[styles.tecnicaChipText, active ? styles.tecnicaChipTextActive : null]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {metodo !== 'normal' ? (() => {
              const t = TECNICAS.find((x) => x.value === metodo);
              return t ? <Text style={styles.tecnicaDescricao}>{t.descricao}</Text> : null;
            })() : null}
          </View>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <Pressable
            onPress={() => { void handleAdd(); }}
            disabled={isSubmittingSerie}
            style={({ pressed }) => [
              styles.addSerieBtn,
              pressed && !isSubmittingSerie ? { opacity: 0.85 } : null,
              isSubmittingSerie ? styles.addSerieBtnDisabled : null,
            ]}
          >
            <Text style={styles.addSerieBtnText}>
              {isSubmittingSerie ? 'Registrando...' : '+ Registrar serie'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Alert.alert(
                'Concluir exercicio',
                `Marcar "${sessaoExercicio.nomeSnapshot}" como concluido?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Concluir',
                    onPress: () => {
                      void (async () => {
                        const validCount = series.filter((s) => s.tipoSerie === 'valida').length;
                        const recomendadas = sessaoExercicio.seriesRecomendadas ?? 0;
                        const missing = Math.max(0, recomendadas - validCount);

                        const cargaNum = cargaMode === 'carousel'
                          ? KG_VALUES[cargaIndex]
                          : parseFloat(cargaText.replace(',', '.'));
                        const repsNum = repsMode === 'carousel'
                          ? repsIndex + 1
                          : parseInt(repsText, 10);

                        const cargaFinal = Number.isFinite(cargaNum) && cargaNum >= 0 ? cargaNum : (sessaoExercicio.cargaPadrao ?? 0);
                        const repsFinal = Number.isInteger(repsNum) && repsNum >= 1 ? repsNum : (sessaoExercicio.execucoesRecomendadas ?? 1);

                        if (missing > 0) {
                          const inputs = Array.from({ length: missing }, () => ({
                            sessaoExercicioId: sessaoExercicio.id,
                            cargaKg: cargaFinal,
                            repeticoes: repsFinal,
                            observacao: '',
                          }));
                          await onRegistrarSeriesEmLote(inputs);
                        }
                        await onToggleRealizado(sessaoExercicio.id);
                      })();
                    },
                  },
                ]
              );
            }}
            style={({ pressed }) => [styles.concluirBtn, pressed ? { opacity: 0.75 } : null]}
          >
            <Text style={styles.concluirBtnText}>✓ Concluir exercicio</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              if (!sessaoExercicio.realizado) {
                await onToggleRealizado(sessaoExercicio.id);
              }
              if (isLastExercicio) {
                onFinalizarSessao();
              } else {
                onProximoExercicio();
              }
            }}
            disabled={isLastExercicio && !canFinalizar}
            style={({ pressed }) => [
              styles.navegacaoBtn,
              isLastExercicio ? styles.navegacaoBtnFinalizar : styles.navegacaoBtnProximo,
              pressed ? { opacity: 0.85 } : null,
              (isLastExercicio && !canFinalizar) ? { opacity: 0.4 } : null,
            ]}
          >
            <Text style={[styles.navegacaoBtnText, isLastExercicio ? styles.navegacaoBtnTextFinalizar : styles.navegacaoBtnTextProximo]}>
              {isLastExercicio ? 'Finalizar sessao' : 'Proximo exercicio →'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Series list */}
      {series.length > 0 ? (
        <View style={styles.seriesCard}>
          <Text style={styles.seriesTitle}>Series registradas</Text>
          <View style={styles.seriesList}>
            {series.map((serie) => {
              const isEditing = editingSerieId === serie.id;
              if (isEditing) {
                return (
                  <View key={serie.id} style={[styles.serieRow, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                    <Text style={styles.serieLabel}>Editando serie</Text>
                    <View style={styles.textModeRow}>
                      <View style={styles.pickerCol}>
                        <Text style={styles.pickerLabel}>Carga (kg)</Text>
                        <PickerCarousel
                          count={KG_VALUES.length}
                          selectedIndex={kgIndexFor(editKg)}
                          onChangeIndex={(i) => setEditKg(KG_VALUES[i])}
                          formatItem={formatKgItem}
                        />
                      </View>
                      <View style={styles.pickerCol}>
                        <Text style={styles.pickerLabel}>Reps</Text>
                        <PickerCarousel
                          count={30}
                          selectedIndex={Math.max(0, Math.min(editReps - 1, 29))}
                          onChangeIndex={(i) => setEditReps(i + 1)}
                          formatItem={formatRepsItem}
                        />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          void (async () => {
                            await onUpdateSerie({ serieId: serie.id, cargaKg: editKg, repeticoes: editReps });
                            setEditingSerieId(null);
                          })();
                        }}
                        style={({ pressed }) => [styles.addSerieBtn, { flex: 1 }, pressed ? { opacity: 0.85 } : null]}
                      >
                        <Text style={styles.addSerieBtnText}>Salvar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setEditingSerieId(null)}
                        style={({ pressed }) => [styles.concluirBtn, { flex: 1 }, pressed ? { opacity: 0.75 } : null]}
                      >
                        <Text style={styles.concluirBtnText}>Cancelar</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }
              return (
                <View key={serie.id} style={styles.serieRow}>
                  <View style={[styles.tipoBadge, serie.tipoSerie === 'aquecimento' ? styles.tipoBadgeAquec : styles.tipoBadgeValida]}>
                    <Text style={styles.tipoBadgeText}>{serie.tipoSerie === 'aquecimento' ? 'Aquec.' : 'Valida'}</Text>
                  </View>
                  <Pressable
                    style={{ flex: 1 }}
                    onLongPress={() => {
                      if (!sessaoExercicio.realizado) {
                        setEditingSerieId(serie.id);
                        setEditKg(serie.cargaKg);
                        setEditReps(serie.repeticoes);
                      }
                    }}
                  >
                    <Text style={styles.serieLabel}>{serie.cargaKg}kg × {serie.repeticoes}</Text>
                    {serie.observacao ? <Text style={styles.serieObs}>{serie.observacao}</Text> : null}
                  </Pressable>
                  {!sessaoExercicio.realizado ? (
                    <Pressable
                      disabled={deletingSerieIds.has(serie.id)}
                      onPress={() => {
                        void (async () => {
                          setDeletingSerieIds((prev) => new Set(prev).add(serie.id));
                          try {
                            await onDeleteSerie(serie.id);
                          } finally {
                            setDeletingSerieIds((prev) => {
                              const next = new Set(prev);
                              next.delete(serie.id);
                              return next;
                            });
                          }
                        })();
                      }}
                      style={({ pressed }) => [
                        styles.deleteSerieBtn,
                        (pressed || deletingSerieIds.has(serie.id)) ? { opacity: 0.4 } : null,
                      ]}
                    >
                      <Text style={styles.deleteSerieBtnText}>✕</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
    {timer ? (
      <RestTimerBanner
        nome={sessaoExercicio.nomeSnapshot}
        restante={timer.restante}
        total={timer.total}
        minimized={timerMinimized}
        onToggleMinimized={() => setTimerMinimized((v) => !v)}
        onSkip={skipTimer}
      />
    ) : null}
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 14 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    backBtn: { padding: 6 },
    backBtnText: { color: c.accent, fontSize: 20, fontWeight: '700', lineHeight: 22 },
    headerMeta: { flex: 1, gap: 2 },
    headerTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    headerSubtitle: { color: c.textSecondary, fontSize: 12 },
    substituicaoBadge: { color: c.accent, fontSize: 11, fontWeight: '600' },
    metodoBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    metodoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    substituirBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: c.accentLight, borderWidth: 1, borderColor: c.accent, flexShrink: 0 },
    substituirBtnText: { color: c.accent, fontSize: 11, fontWeight: '700' },
    finalizadoToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    finalizadoToggleOff: { backgroundColor: c.hero },
    finalizadoToggleOn: { backgroundColor: c.cardAlt },
    finalizadoToggleText: { fontSize: 12, fontWeight: '700' },
    finalizadoToggleTextOff: { color: c.heroText },
    finalizadoToggleTextOn: { color: c.textSecondary },

    mediaToggleBtn: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.accentLight, borderWidth: 1, borderColor: c.accent },
    mediaToggleBtnIcon: { color: c.accent, fontSize: 12, fontWeight: '800' },
    mediaToggleBtnText: { color: c.accent, fontSize: 13, fontWeight: '700' },
    mediaInlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: c.accentLight, borderWidth: 1, borderColor: c.accent },
    mediaInlineBtnIcon: { color: c.accent, fontSize: 10, fontWeight: '800' },
    mediaInlineBtnText: { color: c.accent, fontSize: 11, fontWeight: '700' },
    sugestaoChip: { backgroundColor: c.accentLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: c.accent },
    sugestaoText: { color: c.accent, fontSize: 13, fontWeight: '700' },

    // Stats card
    statsCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: c.cardBorder },
    statsSectionLabel: { color: c.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    statsSeparator: { height: 1, backgroundColor: c.cardBorder },
    statsPills: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    statsPillsMuted: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, backgroundColor: c.cardAlt, borderRadius: 12 },
    statPill: { flex: 1, alignItems: 'center', gap: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: c.cardBorder },
    statValue: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    statValueMuted: { color: c.textSecondary, fontSize: 18, fontWeight: '700' },
    statLabel: { color: c.textSecondary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    chartBarTopLabel: { color: c.textSecondary, fontSize: 10, fontWeight: '700' },
    chartBar: { width: '100%', backgroundColor: c.accent, borderRadius: 5 },
    chartBarBotLabel: { color: c.textSecondary, fontSize: 10 },
    chartBarXLabel: { color: c.textLabel, fontSize: 10, fontWeight: '700' },
    barsContainer: { height: 80, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    barLabelRow: { flexDirection: 'row', gap: 8 },
    barLabelCol: { flex: 1, alignItems: 'center', gap: 2 },

    seriesCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    seriesTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    seriesList: { gap: 8 },
    serieRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.cardAlt, borderRadius: 10, padding: 10 },
    tipoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    tipoBadgeAquec: { backgroundColor: '#d4e8fc' },
    tipoBadgeValida: { backgroundColor: c.accentLight },
    tipoBadgeText: { fontSize: 11, fontWeight: '700', color: c.inputText },
    serieLabel: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '600' },
    serieObs: { color: c.textSecondary, fontSize: 12, flexShrink: 1 },
    deleteSerieBtn: { padding: 4 },
    deleteSerieBtnText: { color: c.error, fontSize: 15, fontWeight: '700' },

    formCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: c.cardBorder },
    formTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },

    pickersRow: { flexDirection: 'row', gap: 12 },
    textModeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    pickerCol: { flex: 1, gap: 6 },
    textModeCol: { flex: 1, gap: 8 },
    pickerLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
    pickerLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    modeToggleText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    cargaInput: { height: 72, borderRadius: 14, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, color: c.inputText, fontSize: 30, fontWeight: '700' },
    adjustRow: { flexDirection: 'row', gap: 6 },
    adjustBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.cardBorder },
    adjustBtnText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },

    descansoSection: { gap: 8 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.hero, borderColor: c.hero },
    chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: c.heroText, fontWeight: '700' },
    customDescansoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    customDescansoInput: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, color: c.inputText, fontSize: 15 },
    customDescansoOk: { backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
    customDescansoOkText: { color: c.accentText, fontSize: 14, fontWeight: '700' },

    tecnicaSection: { gap: 8 },
    tecnicaChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tecnicaChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    tecnicaChipNormal: { backgroundColor: c.accent, borderColor: c.accent },
    tecnicaChipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    tecnicaChipTextNormal: { color: c.accentText, fontWeight: '700' },
    tecnicaChipTextActive: { color: '#fff', fontWeight: '700' },
    tecnicaDescricao: { color: c.textSecondary, fontSize: 12, fontStyle: 'italic', paddingHorizontal: 2 },
    obsInput: { height: 36, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, color: c.inputText, fontSize: 14 },
    formError: { color: c.error, fontSize: 13 },
    addSerieBtn: { backgroundColor: c.hero, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
    addSerieBtnDisabled: { opacity: 0.6 },
    addSerieBtnText: { color: c.heroText, fontSize: 15, fontWeight: '800' },
    concluirBtn: { borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: c.success },
    concluirBtnText: { color: c.success, fontSize: 14, fontWeight: '700' },
    seriesProgressSection: { gap: 4, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    seriesProgressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    seriesProgressLeft: { flexDirection: 'row', alignItems: 'center' },
    seriesProgressDots: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    seriesProgressDot: { width: 12, height: 12, borderRadius: 6 },
    seriesProgressDotFilled: { backgroundColor: c.accent },
    seriesProgressDotDone: { backgroundColor: c.success },
    seriesProgressDotEmpty: { backgroundColor: c.cardBorder },
    seriesProgressOverflow: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    seriesProgressLabel: { color: c.textSecondary, fontSize: 13, fontWeight: '700', marginLeft: 8 },
    seriesProgressLabelDone: { color: c.success },
    seriesProgressComplete: { color: c.success, fontSize: 12, fontWeight: '700' },
    navegacaoBtn: { borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
    navegacaoBtnProximo: { backgroundColor: c.cardAlt, borderWidth: 1.5, borderColor: c.accent },
    navegacaoBtnFinalizar: { backgroundColor: c.accent },
    navegacaoBtnText: { fontSize: 15, fontWeight: '800' },
    navegacaoBtnTextProximo: { color: c.accent },
    navegacaoBtnTextFinalizar: { color: c.accentText },
  });
}
