import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { RegistrarSerieInput } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { SugestaoProgressao } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';

type MetodoSessao = SessaoExercicioPrimitives['metodo'];

const TECNICAS: { value: Exclude<MetodoSessao, 'normal'>; color: string }[] = [
  { value: 'drop_set',   color: '#9333ea' },
  { value: 'piramide',   color: '#d97706' },
  { value: 'rest_pause', color: '#e11d48' },
];
import { PickerCarousel } from '../components/PickerCarousel';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { ExerciseMediaViewer } from '../../exercises/components/ExerciseMediaViewer';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { parseDecimalInput } from '../../../shared/utils/parseDecimalInput';
import { calcularEstimativa1rm } from '../../../shared/utils/estimativa1rm';
import { formatCarga } from '../../shared/components/sessionSeriesTableModel';
import { metodoLabel, metodoDescricao } from '../../shared/metodoPresentation';
import { useTheme } from '../../shared/theme';
import { useLocale, useT } from '../../shared/i18n';
import { formatNumber } from '../../shared/i18n/formatters';

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

interface TimerState { total: number; runId: number }

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

function formatDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  if (min > 0) return `${min}:${String(sec).padStart(2, '0')} min`;
  return `${sec}s`;
}

/** Display label for a series row, adapted to the exercise's tracking_type. */
function formatSerieMetric(serie: SerieRegistradaPrimitives, trackingType: string): string {
  switch (trackingType) {
    case 'cardio': {
      const parts: string[] = [];
      if (serie.duracaoSegundos != null) parts.push(formatDuracao(serie.duracaoSegundos));
      if (serie.distanciaMetros != null) parts.push(`${serie.distanciaMetros}m`);
      if (serie.intensidade != null) parts.push(`int. ${serie.intensidade}`);
      return parts.join(' · ') || '-';
    }
    case 'hold':
      return serie.duracaoSegundos != null ? formatDuracao(serie.duracaoSegundos) : '-';
    case 'reps_only':
      return serie.repeticoes != null ? `${serie.repeticoes} reps` : '-';
    default:
      return serie.cargaKg != null && serie.repeticoes != null
        ? `${formatCarga(serie.cargaKg)} kg × ${serie.repeticoes}`
        : '-';
  }
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
  const locale = useLocale();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  const trackingType = sessaoExercicio.trackingTypeSnapshot;

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

  // --- non-strength form state ---
  const [duracaoMinText, setDuracaoMinText] = useState(
    sessaoExercicio.duracaoRecomendadaSegundos != null ? String(Math.floor(sessaoExercicio.duracaoRecomendadaSegundos / 60)) : '',
  );
  const [duracaoSecText, setDuracaoSecText] = useState(
    sessaoExercicio.duracaoRecomendadaSegundos != null ? String(sessaoExercicio.duracaoRecomendadaSegundos % 60) : '',
  );
  const [intensidadeText, setIntensidadeText] = useState(
    sessaoExercicio.intensidadeRecomendada != null ? String(sessaoExercicio.intensidadeRecomendada) : '',
  );
  const [distanciaText, setDistanciaText] = useState(
    sessaoExercicio.distanciaRecomendadaMetros != null ? String(sessaoExercicio.distanciaRecomendadaMetros) : '',
  );
  const [holdSecText, setHoldSecText] = useState(
    sessaoExercicio.duracaoRecomendadaSegundos != null ? String(sessaoExercicio.duracaoRecomendadaSegundos) : '',
  );
  const [repsOnlyText, setRepsOnlyText] = useState(
    sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '',
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
  const [confirmConcluirVisible, setConfirmConcluirVisible] = useState(false);
  const [editKg, setEditKg] = useState(0);
  const [editReps, setEditReps] = useState(0);

  // Melhor serie (maior 1RM estimado) — so destaca com 2+ series comparaveis.
  const bestSerieId = useMemo(() => {
    if (trackingType !== 'reps_load') return null;
    const comparaveis = series.filter((s) => s.cargaKg != null && s.repeticoes != null);
    if (comparaveis.length < 2) return null;
    let best = comparaveis[0];
    for (const s of comparaveis) {
      if (calcularEstimativa1rm(s.cargaKg!, s.repeticoes!) > calcularEstimativa1rm(best.cargaKg!, best.repeticoes!)) {
        best = s;
      }
    }
    return best.id;
  }, [series, trackingType]);

  // --- timer ---
  // A contagem por segundo vive no RestTimerBanner; aqui só existe o "há um
  // descanso ativo" — o ecrã inteiro não re-renderiza a cada tick.
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [timerMinimized, setTimerMinimized] = useState(false);
  const timerRunIdRef = useRef(0);
  const timerMinimizedByScrollRef = useRef(false);

  useEffect(() => {
    setCargaMode('carousel');
    setCargaIndex(sessaoExercicio.cargaPadrao != null ? kgIndexFor(sessaoExercicio.cargaPadrao) : 0);
    setCargaText(sessaoExercicio.cargaPadrao != null ? String(sessaoExercicio.cargaPadrao) : '');
    setRepsMode('carousel');
    setRepsIndex(Math.max(0, Math.min((sessaoExercicio.execucoesRecomendadas ?? 8) - 1, 29)));
    setRepsText(String(sessaoExercicio.execucoesRecomendadas ?? 8));
    setDuracaoMinText(sessaoExercicio.duracaoRecomendadaSegundos != null ? String(Math.floor(sessaoExercicio.duracaoRecomendadaSegundos / 60)) : '');
    setDuracaoSecText(sessaoExercicio.duracaoRecomendadaSegundos != null ? String(sessaoExercicio.duracaoRecomendadaSegundos % 60) : '');
    setIntensidadeText(sessaoExercicio.intensidadeRecomendada != null ? String(sessaoExercicio.intensidadeRecomendada) : '');
    setDistanciaText(sessaoExercicio.distanciaRecomendadaMetros != null ? String(sessaoExercicio.distanciaRecomendadaMetros) : '');
    setHoldSecText(sessaoExercicio.duracaoRecomendadaSegundos != null ? String(sessaoExercicio.duracaoRecomendadaSegundos) : '');
    setRepsOnlyText(sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '');
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
    timerMinimizedByScrollRef.current = false;
    setTimerMinimized(false); // always expand when a new timer starts
    timerRunIdRef.current += 1;
    setTimer({ total: segundos, runId: timerRunIdRef.current });
  };

  const skipTimer = () => {
    setTimer(null);
  };

  // --- kg mode toggle ---
  const switchToText = () => {
    setCargaText(String(KG_VALUES[cargaIndex]));
    setCargaMode('text');
  };

  const switchToCarousel = () => {
    const num = parseDecimalInput(cargaText);
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
    const current = parseDecimalInput(cargaText);
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

    try {
      if (trackingType === 'cardio') {
        const min = parseInt(duracaoMinText, 10) || 0;
        const sec = parseInt(duracaoSecText, 10) || 0;
        const totalSegundos = min * 60 + sec;
        if (!Number.isInteger(totalSegundos) || totalSegundos < 1) {
          setFormError(t('sessao.detalhe.duracaoInvalidaCardio'));
          return;
        }

        let intensidade: number | undefined;
        if (intensidadeText.trim() !== '') {
          const intNum = parseDecimalInput(intensidadeText);
          if (!Number.isFinite(intNum) || intNum < 0) {
            setFormError(t('sessao.detalhe.intensidadeInvalida'));
            return;
          }
          intensidade = intNum;
        }

        let distanciaMetros: number | undefined;
        if (distanciaText.trim() !== '') {
          const distNum = parseDecimalInput(distanciaText);
          if (!Number.isFinite(distNum) || distNum < 0) {
            setFormError(t('sessao.detalhe.distanciaInvalida'));
            return;
          }
          distanciaMetros = distNum;
        }

        await onRegistrarSerie({
          sessaoExercicioId: sessaoExercicio.id,
          duracaoSegundos: totalSegundos,
          intensidade,
          distanciaMetros,
          observacao: obs,
        });

        if (descanso != null) startTimer(descanso);
        setObs('');
        return;
      }

      if (trackingType === 'hold') {
        const segundos = parseInt(holdSecText, 10);
        if (!Number.isInteger(segundos) || segundos < 1) {
          setFormError(t('sessao.detalhe.duracaoInvalidaHold'));
          return;
        }

        await onRegistrarSerie({
          sessaoExercicioId: sessaoExercicio.id,
          duracaoSegundos: segundos,
          observacao: obs,
        });

        if (descanso != null) startTimer(descanso);
        setObs('');
        return;
      }

      if (trackingType === 'reps_only') {
        const repsNum = parseInt(repsOnlyText, 10);
        if (!Number.isInteger(repsNum) || repsNum < 1) {
          setFormError(t('sessao.detalhe.repsInvalidas'));
          return;
        }

        await onRegistrarSerie({
          sessaoExercicioId: sessaoExercicio.id,
          repeticoes: repsNum,
          observacao: obs,
        });

        if (descanso != null) startTimer(descanso);
        setObs('');
        return;
      }

      // reps_load (default)
      const cargaNum = cargaMode === 'carousel'
        ? KG_VALUES[cargaIndex]
        : parseDecimalInput(cargaText);

      if (!Number.isFinite(cargaNum) || cargaNum < 0) {
        setFormError(t('sessao.detalhe.cargaInvalida'));
        return;
      }

      const repsNum = repsMode === 'carousel'
        ? repsIndex + 1
        : parseInt(repsText, 10);

      if (!Number.isInteger(repsNum) || repsNum < 1) {
        setFormError(t('sessao.detalhe.repsInvalidas'));
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

  // Completa as series que faltam (com os valores atuais do formulario) e marca o exercicio como realizado.
  const concluirExercicio = async () => {
    const validCount = series.length;
    const recomendadas = sessaoExercicio.seriesRecomendadas ?? 0;
    const missing = Math.max(0, recomendadas - validCount);

    if (missing > 0) {
      let baseInput: RegistrarSerieInput;

      if (trackingType === 'cardio') {
        const min = parseInt(duracaoMinText, 10) || 0;
        const sec = parseInt(duracaoSecText, 10) || 0;
        const totalSegundos = min * 60 + sec;
        const duracaoFinal = Number.isInteger(totalSegundos) && totalSegundos >= 1
          ? totalSegundos
          : (sessaoExercicio.duracaoRecomendadaSegundos ?? 60);
        const intensidadeNum = parseDecimalInput(intensidadeText);
        const distanciaNum = parseDecimalInput(distanciaText);
        baseInput = {
          sessaoExercicioId: sessaoExercicio.id,
          duracaoSegundos: duracaoFinal,
          intensidade: Number.isFinite(intensidadeNum) && intensidadeNum >= 0 ? intensidadeNum : (sessaoExercicio.intensidadeRecomendada ?? undefined),
          distanciaMetros: Number.isFinite(distanciaNum) && distanciaNum >= 0 ? distanciaNum : (sessaoExercicio.distanciaRecomendadaMetros ?? undefined),
          observacao: '',
        };
      } else if (trackingType === 'hold') {
        const segundos = parseInt(holdSecText, 10);
        const duracaoFinal = Number.isInteger(segundos) && segundos >= 1
          ? segundos
          : (sessaoExercicio.duracaoRecomendadaSegundos ?? 30);
        baseInput = {
          sessaoExercicioId: sessaoExercicio.id,
          duracaoSegundos: duracaoFinal,
          observacao: '',
        };
      } else if (trackingType === 'reps_only') {
        const repsNum = parseInt(repsOnlyText, 10);
        const repsFinal = Number.isInteger(repsNum) && repsNum >= 1 ? repsNum : (sessaoExercicio.execucoesRecomendadas ?? 1);
        baseInput = {
          sessaoExercicioId: sessaoExercicio.id,
          repeticoes: repsFinal,
          observacao: '',
        };
      } else {
        const cargaNum = cargaMode === 'carousel'
          ? KG_VALUES[cargaIndex]
          : parseDecimalInput(cargaText);
        const repsNum = repsMode === 'carousel'
          ? repsIndex + 1
          : parseInt(repsText, 10);

        const cargaFinal = Number.isFinite(cargaNum) && cargaNum >= 0 ? cargaNum : (sessaoExercicio.cargaPadrao ?? 0);
        const repsFinal = Number.isInteger(repsNum) && repsNum >= 1 ? repsNum : (sessaoExercicio.execucoesRecomendadas ?? 1);
        baseInput = {
          sessaoExercicioId: sessaoExercicio.id,
          cargaKg: cargaFinal,
          repeticoes: repsFinal,
          observacao: '',
        };
      }

      const inputs = Array.from({ length: missing }, () => ({ ...baseInput }));
      await onRegistrarSeriesEmLote(inputs);
    }
    await onToggleRealizado(sessaoExercicio.id);
  };

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
            <Text style={styles.substituirBtnText}>{t('sessao.common.trocarExercicio')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => { void onToggleRealizado(sessaoExercicio.id); }}
          style={[styles.finalizadoToggle, sessaoExercicio.realizado ? styles.finalizadoToggleOn : styles.finalizadoToggleOff]}
        >
          <Text style={[styles.finalizadoToggleText, sessaoExercicio.realizado ? styles.finalizadoToggleTextOn : styles.finalizadoToggleTextOff]}>
            {sessaoExercicio.realizado ? t('sessao.common.retomar') : t('sessao.common.finalizar')}
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
      {sessaoExercicio.realizado && series.length > 0 ? (() => {
        const validSeries = series;

        const hasMeta = sessaoExercicio.seriesRecomendadas != null
          || sessaoExercicio.execucoesRecomendadas != null
          || sessaoExercicio.cargaPadrao != null
          || sessaoExercicio.duracaoRecomendadaSegundos != null
          || sessaoExercicio.distanciaRecomendadaMetros != null
          || sessaoExercicio.intensidadeRecomendada != null;

        const objetivoBlock = hasMeta ? (
          <>
            <Text style={styles.statsSectionLabel}>{t('sessao.detalhe.objetivo')}</Text>
            <View style={styles.statsPillsMuted}>
              {sessaoExercicio.seriesRecomendadas != null ? (
                <View style={styles.statPill}>
                  <Text style={styles.statValueMuted}>{sessaoExercicio.seriesRecomendadas}</Text>
                  <Text style={styles.statLabel}>{t('sessao.detalhe.seriesLabel')}</Text>
                </View>
              ) : null}
              {sessaoExercicio.execucoesRecomendadas != null ? (
                <View style={styles.statPill}>
                  <Text style={styles.statValueMuted}>{sessaoExercicio.execucoesRecomendadas}</Text>
                  <Text style={styles.statLabel}>{t('sessao.detalhe.repsPorSerie')}</Text>
                </View>
              ) : null}
              {sessaoExercicio.cargaPadrao != null ? (
                <View style={styles.statPill}>
                  <Text style={styles.statValueMuted}>{sessaoExercicio.cargaPadrao}kg</Text>
                  <Text style={styles.statLabel}>{t('sessao.detalhe.cargaLabel')}</Text>
                </View>
              ) : null}
              {sessaoExercicio.duracaoRecomendadaSegundos != null ? (
                <View style={styles.statPill}>
                  <Text style={styles.statValueMuted}>{formatDuracao(sessaoExercicio.duracaoRecomendadaSegundos)}</Text>
                  <Text style={styles.statLabel}>{t('sessao.detalhe.duracaoLabel')}</Text>
                </View>
              ) : null}
              {sessaoExercicio.intensidadeRecomendada != null ? (
                <View style={styles.statPill}>
                  <Text style={styles.statValueMuted}>{sessaoExercicio.intensidadeRecomendada}</Text>
                  <Text style={styles.statLabel}>{t('sessao.detalhe.intensidadeLabel')}</Text>
                </View>
              ) : null}
              {sessaoExercicio.distanciaRecomendadaMetros != null ? (
                <View style={styles.statPill}>
                  <Text style={styles.statValueMuted}>{sessaoExercicio.distanciaRecomendadaMetros}m</Text>
                  <Text style={styles.statLabel}>{t('sessao.detalhe.distanciaLabel')}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.statsSeparator} />
          </>
        ) : null;

        if (trackingType !== 'reps_load') {
          // Non-strength: no volume/oRM stats, just series count + per-series metric.
          return (
            <View style={styles.statsCard}>
              {objetivoBlock}

              <Text style={styles.statsSectionLabel}>{t('sessao.detalhe.realizado')}</Text>
              <View style={styles.statsPills}>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{validSeries.length}</Text>
                  <Text style={styles.statLabel}>{t('sessao.detalhe.seriesLabel')}</Text>
                </View>
              </View>

              <View style={styles.statsSeparator} />
              <Text style={styles.statsSectionLabel}>{t('sessao.detalhe.seriesLabel')}</Text>
              <View style={styles.barLabelRow}>
                {validSeries.map((serie, i) => (
                  <View key={serie.id} style={styles.barLabelCol}>
                    <Text style={styles.chartBarBotLabel}>{formatSerieMetric(serie, trackingType)}</Text>
                    <Text style={styles.chartBarXLabel}>S{i + 1}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        }

        const totalVolume = validSeries.reduce((sum, s) => sum + (s.cargaKg ?? 0) * (s.repeticoes ?? 0), 0);
        const maxCarga = Math.max(...validSeries.map(s => s.cargaKg ?? 0));
        const totalReps = validSeries.reduce((sum, s) => sum + (s.repeticoes ?? 0), 0);
        const avgReps = Math.round(totalReps / validSeries.length);
        const volumes = validSeries.map(s => (s.cargaKg ?? 0) * (s.repeticoes ?? 0));
        const maxVolume = Math.max(...volumes, 1);
        const BARS_H = 80;

        return (
          <View style={styles.statsCard}>

            {/* Meta / objetivo */}
            {objetivoBlock}

            {/* Realizado */}
            <Text style={styles.statsSectionLabel}>{t('sessao.detalhe.realizado')}</Text>
            <View style={styles.statsPills}>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{validSeries.length}</Text>
                <Text style={styles.statLabel}>{t('sessao.detalhe.seriesLabel')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{avgReps}</Text>
                <Text style={styles.statLabel}>{t('sessao.detalhe.repsPorSerie')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{maxCarga}kg</Text>
                <Text style={styles.statLabel}>{t('sessao.detalhe.maxLabel')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{formatNumber(totalVolume, locale)}kg</Text>
                <Text style={styles.statLabel}>{t('sessao.common.volume')}</Text>
              </View>
            </View>

            <View style={styles.statsSeparator} />

            {/* Volume bar chart */}
            <Text style={styles.statsSectionLabel}>{t('sessao.detalhe.volumePorSerie')}</Text>
            <View style={styles.barsContainer}>
              {validSeries.map((serie) => {
                const vol = (serie.cargaKg ?? 0) * (serie.repeticoes ?? 0);
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
              {isLastExercicio ? t('sessao.common.finalizarSessao') : t('sessao.common.proximoExercicio')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Registration form */}
      {!sessaoExercicio.realizado ? (
        <View style={styles.formCard}>
          {/* Series progress + media toggle (button must not depend on seriesRecomendadas) */}
          {(() => {
            const total = sessaoExercicio.seriesRecomendadas;
            const validCount = series.length;
            const allDone = total != null && validCount >= total;
            const dotCount = total != null ? Math.min(total, 12) : 0;
            const overflow = total != null && total > 12 ? total - 12 : 0;
            return (
              <View style={styles.seriesProgressSection}>
                <View style={styles.seriesProgressRow}>
                  {total != null ? (
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
                        {validCount}/{total} {t('sessao.detalhe.seriesSuffix')}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.seriesProgressLabel, { marginLeft: 0 }]}>
                      {t('sessao.detalhe.seriesRegistradasCount', { count: validCount })}
                    </Text>
                  )}
                  <Pressable
                    onPress={() => setMediaVisible((v) => !v)}
                    style={({ pressed }) => [styles.mediaInlineBtn, pressed ? { opacity: 0.7 } : null]}
                  >
                    <Text style={styles.mediaInlineBtnIcon}>{mediaVisible ? '✕' : '▶'}</Text>
                    <Text style={styles.mediaInlineBtnText}>{mediaVisible ? t('sessao.common.fechar') : t('sessao.detalhe.verExecucao')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })()}

          {/* Suggestion — full-width above both carousels so alignment is unaffected */}
          {sugestao ? (
            <Pressable onPress={handleSugestao} style={({ pressed }) => [styles.sugestaoChip, pressed ? { opacity: 0.75 } : null]}>
              <Text style={styles.sugestaoText}>↑ {sugestaoLabel} — {sugestao.motivo}</Text>
            </Pressable>
          ) : null}

          {/* Cardio inputs — duration (min/sec) + intensity + optional distance */}
          {trackingType === 'cardio' ? (
            <View style={styles.textModeRow}>
              <View style={styles.textModeCol}>
                <Text style={styles.pickerLabel}>{t('sessao.detalhe.duracaoLabel')}</Text>
                <View style={styles.adjustRow}>
                  <TextInput
                    style={styles.cargaInput}
                    value={duracaoMinText}
                    onChangeText={setDuracaoMinText}
                    keyboardType="number-pad"
                    placeholder={t('sessao.detalhe.minPlaceholder')}
                    placeholderTextColor={c.inputPlaceholder}
                    textAlign="center"
                    editable={!isSubmittingSerie}
                  />
                  <TextInput
                    style={styles.cargaInput}
                    value={duracaoSecText}
                    onChangeText={setDuracaoSecText}
                    keyboardType="number-pad"
                    placeholder={t('sessao.detalhe.segPlaceholder')}
                    placeholderTextColor={c.inputPlaceholder}
                    textAlign="center"
                    editable={!isSubmittingSerie}
                  />
                </View>
              </View>
              <View style={styles.textModeCol}>
                <Text style={styles.pickerLabel}>{t('sessao.detalhe.intensidadeLabel')}</Text>
                <TextInput
                  style={styles.cargaInput}
                  value={intensidadeText}
                  onChangeText={setIntensidadeText}
                  keyboardType="decimal-pad"
                  placeholder={t('sessao.detalhe.opcionalPlaceholder')}
                  placeholderTextColor={c.inputPlaceholder}
                  textAlign="center"
                  editable={!isSubmittingSerie}
                />
              </View>
              <View style={styles.textModeCol}>
                <Text style={styles.pickerLabel}>{t('sessao.detalhe.distanciaMLabel')}</Text>
                <TextInput
                  style={styles.cargaInput}
                  value={distanciaText}
                  onChangeText={setDistanciaText}
                  keyboardType="decimal-pad"
                  placeholder={t('sessao.detalhe.opcionalPlaceholder')}
                  placeholderTextColor={c.inputPlaceholder}
                  textAlign="center"
                  editable={!isSubmittingSerie}
                />
              </View>
            </View>
          ) : null}

          {/* Hold inputs — duration in seconds */}
          {trackingType === 'hold' ? (
            <View style={styles.textModeRow}>
              <View style={styles.textModeCol}>
                <Text style={styles.pickerLabel}>{t('sessao.detalhe.duracaoSegundosLabel')}</Text>
                <TextInput
                  style={styles.cargaInput}
                  value={holdSecText}
                  onChangeText={setHoldSecText}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={c.inputPlaceholder}
                  textAlign="center"
                  editable={!isSubmittingSerie}
                  autoFocus
                />
              </View>
            </View>
          ) : null}

          {/* Reps-only inputs */}
          {trackingType === 'reps_only' ? (
            <View style={styles.textModeRow}>
              <View style={styles.textModeCol}>
                <Text style={styles.pickerLabel}>{t('sessao.common.repsLabel')}</Text>
                <TextInput
                  style={styles.cargaInput}
                  value={repsOnlyText}
                  onChangeText={setRepsOnlyText}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={c.inputPlaceholder}
                  textAlign="center"
                  editable={!isSubmittingSerie}
                  autoFocus
                />
              </View>
            </View>
          ) : null}

          {/* Pickers row — each column is independently carousel or text */}
          {trackingType === 'reps_load' ? (
          <View style={styles.textModeRow}>
            {/* Carga column */}
            {cargaMode === 'carousel' ? (
              <View style={styles.pickerCol}>
                <View style={styles.pickerLabelRow}>
                  <Text style={styles.pickerLabel}>{t('sessao.common.cargaKgLabel')}</Text>
                  <Pressable onPress={switchToText}>
                    <Text style={styles.modeToggleText}>{t('sessao.common.digitar')}</Text>
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
                  <Text style={styles.pickerLabel}>{t('sessao.common.cargaKgLabel')}</Text>
                  <Pressable onPress={switchToCarousel}>
                    <Text style={styles.modeToggleText}>{t('sessao.common.rolar')}</Text>
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
                  <Text style={styles.pickerLabel}>{t('sessao.common.repsLabel')}</Text>
                  <Pressable onPress={switchRepsToText}>
                    <Text style={styles.modeToggleText}>{t('sessao.common.digitar')}</Text>
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
                  <Text style={styles.pickerLabel}>{t('sessao.common.repsLabel')}</Text>
                  <Pressable onPress={switchRepsToCarousel}>
                    <Text style={styles.modeToggleText}>{t('sessao.common.rolar')}</Text>
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
          ) : null}

          {/* Rest options */}
          <View style={styles.descansoSection}>
            <Text style={styles.pickerLabel}>{t('sessao.common.descanso')}</Text>
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
                  {isCustomDescanso ? `${descanso}s` : t('sessao.detalhe.descansoCustomChip')}
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
                  placeholder={t('sessao.detalhe.segundosPlaceholder')}
                  placeholderTextColor={c.inputPlaceholder}
                  autoFocus
                />
                <Pressable onPress={handleConfirmCustomDescanso} style={styles.customDescansoOk}>
                  <Text style={styles.customDescansoOkText}>{t('common.ok')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Observation */}
          <TextInput
            style={styles.obsInput}
            placeholder={t('sessao.common.observacaoPlaceholder')}
            placeholderTextColor={c.inputPlaceholder}
            value={obs}
            onChangeText={setObs}
            editable={!isSubmittingSerie}
          />

          {/* Technique selector */}
          <View style={styles.tecnicaSection}>
            <Text style={styles.pickerLabel}>{t('sessao.detalhe.tecnicaLabel')}</Text>
            <View style={styles.tecnicaChipsRow}>
              <Pressable
                onPress={() => { setMetodo('normal'); void onAtualizarMetodo(sessaoExercicio.id, 'normal'); }}
                style={[styles.tecnicaChip, metodo === 'normal' ? styles.tecnicaChipNormal : null]}
              >
                <Text style={[styles.tecnicaChipText, metodo === 'normal' ? styles.tecnicaChipTextNormal : null]}>{t('sessao.metodo.normal')}</Text>
              </Pressable>
              {TECNICAS.map((tecnica) => {
                const active = metodo === tecnica.value;
                return (
                  <Pressable
                    key={tecnica.value}
                    onPress={() => { setMetodo(tecnica.value); void onAtualizarMetodo(sessaoExercicio.id, tecnica.value); }}
                    style={[styles.tecnicaChip, active ? { backgroundColor: tecnica.color, borderColor: tecnica.color } : null]}
                  >
                    <Text style={[styles.tecnicaChipText, active ? styles.tecnicaChipTextActive : null]}>{metodoLabel(tecnica.value, locale)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {metodo !== 'normal' ? (
              <Text style={styles.tecnicaDescricao}>{metodoDescricao(metodo, locale)}</Text>
            ) : null}
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
              {isSubmittingSerie ? t('sessao.common.registrando') : t('sessao.detalhe.registrarSerieBtn')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setConfirmConcluirVisible(true)}
            style={({ pressed }) => [styles.concluirBtn, pressed ? { opacity: 0.75 } : null]}
          >
            <Text style={styles.concluirBtnText}>{t('sessao.common.concluirExercicioBtn')}</Text>
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
              {isLastExercicio ? t('sessao.common.finalizarSessao') : t('sessao.common.proximoExercicio')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Series list */}
      {series.length > 0 ? (() => {
        const totalVolume = trackingType === 'reps_load'
          ? series.reduce((sum, s) => sum + (s.cargaKg ?? 0) * (s.repeticoes ?? 0), 0)
          : 0;
        return (
        <View style={styles.seriesCard}>
          <View style={styles.seriesHeader}>
            <Text style={styles.seriesTitle}>{t('sessao.detalhe.seriesRegistradasTitle')}</Text>
            <View style={styles.seriesSummaryChip}>
              <Text style={styles.seriesSummaryText}>
                {t('sessao.detalhe.seriesCount', { count: series.length })}
                {totalVolume > 0 ? ` · ${formatNumber(Math.round(totalVolume), locale)} kg` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.seriesList}>
            {series.map((serie, i) => {
              const isEditing = editingSerieId === serie.id;
              if (isEditing) {
                return (
                  <View key={serie.id} style={[styles.serieRow, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                    <Text style={styles.serieLabel}>{t('sessao.detalhe.editandoSerie')}</Text>
                    <View style={styles.textModeRow}>
                      <View style={styles.pickerCol}>
                        <Text style={styles.pickerLabel}>{t('sessao.common.cargaKgLabel')}</Text>
                        <PickerCarousel
                          count={KG_VALUES.length}
                          selectedIndex={kgIndexFor(editKg)}
                          onChangeIndex={(i) => setEditKg(KG_VALUES[i])}
                          formatItem={formatKgItem}
                        />
                      </View>
                      <View style={styles.pickerCol}>
                        <Text style={styles.pickerLabel}>{t('sessao.common.repsLabel')}</Text>
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
                        <Text style={styles.addSerieBtnText}>{t('common.save')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setEditingSerieId(null)}
                        style={({ pressed }) => [styles.concluirBtn, { flex: 1 }, pressed ? { opacity: 0.75 } : null]}
                      >
                        <Text style={styles.concluirBtnText}>{t('common.cancel')}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }
              const isBest = serie.id === bestSerieId;
              return (
                <View key={serie.id} style={[styles.serieRow, isBest ? styles.serieRowBest : null]}>
                  <View style={[styles.serieBadge, isBest ? styles.serieBadgeBest : null]}>
                    <Text style={[styles.serieBadgeText, isBest ? styles.serieBadgeTextBest : null]}>{i + 1}</Text>
                  </View>
                  <Pressable
                    style={{ flex: 1 }}
                    onLongPress={() => {
                      if (!sessaoExercicio.realizado && trackingType === 'reps_load' && serie.cargaKg != null && serie.repeticoes != null) {
                        setEditingSerieId(serie.id);
                        setEditKg(serie.cargaKg);
                        setEditReps(serie.repeticoes);
                      }
                    }}
                  >
                    {trackingType === 'reps_load' && serie.cargaKg != null && serie.repeticoes != null ? (
                      <View style={styles.serieMetricRow}>
                        <View style={styles.serieMetricCellRight}>
                          <Text style={[styles.serieValue, isBest ? styles.serieValueBest : null]}>
                            {formatCarga(serie.cargaKg)}
                          </Text>
                          <Text style={styles.serieUnit}> kg</Text>
                        </View>
                        <Text style={styles.serieTimes}>×</Text>
                        <View style={styles.serieMetricCellLeft}>
                          <Text style={[styles.serieValue, isBest ? styles.serieValueBest : null]}>
                            {serie.repeticoes}
                          </Text>
                          <Text style={styles.serieUnit}> reps</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={[styles.serieLabel, isBest ? styles.serieLabelBest : null]}>
                        {formatSerieMetric(serie, trackingType)}
                      </Text>
                    )}
                    {serie.observacao ? <Text style={styles.serieObs}>{serie.observacao}</Text> : null}
                  </Pressable>
                  {isBest ? <Text style={styles.serieBestStar}>★</Text> : null}
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
        );
      })() : null}
    </ScrollView>
    <ConfirmDialog
      visible={confirmConcluirVisible}
      title={t('sessao.detalhe.concluirTitle')}
      message={t('sessao.detalhe.concluirMessage', { nome: sessaoExercicio.nomeSnapshot })}
      confirmLabel={t('sessao.common.concluir')}
      cancelLabel={t('common.cancel')}
      onConfirm={() => {
        setConfirmConcluirVisible(false);
        void concluirExercicio();
      }}
      onCancel={() => setConfirmConcluirVisible(false)}
    />
    {timer ? (
      <RestTimerBanner
        nome={sessaoExercicio.nomeSnapshot}
        total={timer.total}
        runId={timer.runId}
        minimized={timerMinimized}
        onToggleMinimized={() => setTimerMinimized((v) => !v)}
        onSkip={skipTimer}
        onDone={() => setTimer(null)}
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
    seriesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    seriesTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    seriesSummaryChip: {
      backgroundColor: c.cardAlt,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    seriesSummaryText: { color: c.textSecondary, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
    seriesList: { gap: 8 },
    serieRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.cardAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
    serieBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    serieBadgeBest: { backgroundColor: c.accent, borderColor: c.accent },
    serieBadgeText: { color: c.textSecondary, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
    serieBadgeTextBest: { color: c.accentText },
    serieMetricCellRight: { width: 76, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end' },
    serieMetricCellLeft: { flexDirection: 'row', alignItems: 'baseline' },
    serieValue: { color: c.textPrimary, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
    serieValueBest: { color: c.accent },
    serieUnit: { color: c.textSecondary, fontSize: 11, fontWeight: '600' },
    serieBestStar: { color: c.accent, fontSize: 14, fontWeight: '800' },
    tipoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    tipoBadgeAquec: { backgroundColor: '#d4e8fc' },
    tipoBadgeValida: { backgroundColor: c.accentLight },
    tipoBadgeText: { fontSize: 11, fontWeight: '700', color: c.inputText },
    serieLabel: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
    serieMetricRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    serieTimes: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    serieLabelBest: { color: c.accent, fontWeight: '800' },
    serieRowBest: { borderWidth: 1, borderColor: c.accent },
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
