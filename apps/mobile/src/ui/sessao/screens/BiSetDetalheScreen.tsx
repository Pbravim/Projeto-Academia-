import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SessaoExercicioComSeries } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { RegistrarSegmentoInput } from '../../../application/sessoes/use-cases/RegistrarSegmentoUseCase';
import type { RegistrarSerieInput } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { SugestaoProgressao } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { parseDecimalInput } from '../../../shared/utils/parseDecimalInput';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useLocale, useT } from '../../shared/i18n';
import { type AppLocale,translate } from '../../shared/i18n/core';
import { useTheme } from '../../shared/theme';
import { DegrauForm } from '../components/DegrauForm';
import { MetodoSelector } from '../components/MetodoSelector';
import { PickerCarousel } from '../components/PickerCarousel';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { parseDegrauInput, useDegrauForm } from '../hooks/useDegrauForm';
import { formatDegrausStack, mostraDescanso,precisaDegrauPrescrito } from '../presenters/segmentosPresentation';

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

function grupoLabel(count: number, locale: AppLocale): string {
  if (count === 2) return translate(locale, 'sessao.grupo.biSet');
  if (count === 3) return translate(locale, 'sessao.grupo.triSet');
  return translate(locale, 'sessao.grupo.circuito');
}

interface TimerState { total: number; runId: number }

interface Props {
  grupoItens: SessaoExercicioComSeries[];
  grupoColor: string;
  sugestoes: Record<string, SugestaoProgressao | null>;
  isLastExercicio: boolean;
  canFinalizar?: boolean;
  onRegistrarSeriesEmLote: (inputs: RegistrarSerieInput[]) => Promise<void>;
  onDeleteSeries: (serieIds: string[]) => Promise<void>;
  onToggleRealizadoGrupo: (sessaoExercicioIds: string[]) => Promise<void>;
  onAbrirSubstituicao: (sessaoExercicioId: string) => Promise<void>;
  onAtualizarMetodo: (sessaoExercicioId: string, metodo: SessaoExercicioPrimitives['metodo']) => Promise<void>;
  onRegistrarSegmento: (input: RegistrarSegmentoInput) => Promise<boolean>;
  onRemoverSegmento: (id: string) => Promise<void>;
  onProximoExercicio: () => void;
  onFinalizarSessao: () => void;
  onBack: () => void;
}

export function BiSetDetalheScreen({
  grupoItens,
  grupoColor,
  sugestoes,
  isLastExercicio,
  canFinalizar = true,
  onRegistrarSeriesEmLote,
  onDeleteSeries,
  onToggleRealizadoGrupo,
  onAbrirSubstituicao,
  onAtualizarMetodo,
  onRegistrarSegmento,
  onRemoverSegmento,
  onProximoExercicio,
  onFinalizarSessao,
  onBack,
}: Props) {
  const c = useTheme();
  const locale = useLocale();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  const [cargaModes, setCargaModes] = useState<Array<'carousel' | 'text'>>(() =>
    grupoItens.map(() => 'carousel' as const)
  );
  const [cargaIndexes, setCargaIndexes] = useState<number[]>(() =>
    grupoItens.map((item) =>
      item.sessaoExercicio.cargaPadrao != null ? kgIndexFor(item.sessaoExercicio.cargaPadrao) : 0
    )
  );
  const [cargaTexts, setCargaTexts] = useState<string[]>(() =>
    grupoItens.map((item) =>
      item.sessaoExercicio.cargaPadrao != null ? String(item.sessaoExercicio.cargaPadrao) : '0'
    )
  );
  const [repsModes, setRepsModes] = useState<Array<'carousel' | 'text'>>(() =>
    grupoItens.map(() => 'carousel' as const)
  );
  const [repsIndexes, setRepsIndexes] = useState<number[]>(() =>
    grupoItens.map((item) =>
      Math.max(0, Math.min((item.sessaoExercicio.execucoesRecomendadas ?? 8) - 1, 29))
    )
  );
  const [repsTexts, setRepsTexts] = useState<string[]>(() =>
    grupoItens.map((item) => String(item.sessaoExercicio.execucoesRecomendadas ?? 8))
  );

  // Degrau 2 prescrito por exercicio (drop_set/rest_pause) — convite, nao obrigacao.
  const [degrau2CargaTexts, setDegrau2CargaTexts] = useState<string[]>(() => grupoItens.map(() => ''));
  const [degrau2RepsTexts, setDegrau2RepsTexts] = useState<string[]>(() =>
    grupoItens.map((item) => String(item.sessaoExercicio.execucoesRecomendadas ?? 8))
  );
  const [degrau2DescansoTexts, setDegrau2DescansoTexts] = useState<string[]>(() =>
    grupoItens.map((item) => (item.sessaoExercicio.metodo === 'rest_pause' ? '15' : ''))
  );
  const [degrau2Errors, setDegrau2Errors] = useState<Array<string | null>>(() => grupoItens.map(() => null));

  const [descanso, setDescanso] = useState<number | null>(
    grupoItens[0]?.sessaoExercicio.tempoDescansoSegundos ?? null
  );
  const [obs, setObs] = useState('');

  // "+ degrau" inline por linha do set pareado — um por vez.
  const [degrauAberto, setDegrauAberto] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const degrauInline = useDegrauForm(locale);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingSetIndexes, setDeletingSetIndexes] = useState<Set<number>>(new Set());
  const [confirmConcluirVisible, setConfirmConcluirVisible] = useState(false);

  // Countdown vive no RestTimerBanner — ver comentário em ExercicioDetalheScreen.
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [timerMinimized, setTimerMinimized] = useState(false);
  const timerRunIdRef = useRef(0);
  const timerMinimizedByScrollRef = useRef(false);

  const startTimer = (segundos: number) => {
    timerMinimizedByScrollRef.current = false;
    setTimerMinimized(false);
    timerRunIdRef.current += 1;
    setTimer({ total: segundos, runId: timerRunIdRef.current });
  };

  const skipTimer = () => {
    setTimer(null);
  };

  const updateArr = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, val: T) =>
    setter((prev) => { const next = [...prev]; next[i] = val; return next; });

  const setMode = (setter: React.Dispatch<React.SetStateAction<Array<'carousel' | 'text'>>>, i: number, val: 'carousel' | 'text') =>
    setter((prev) => { const next = [...prev]; next[i] = val; return next; });

  const switchCargaToText = (i: number) => {
    updateArr(setCargaTexts, i, String(KG_VALUES[cargaIndexes[i]]));
    setMode(setCargaModes, i, 'text');
  };
  const switchCargaToCarousel = (i: number) => {
    const num = parseDecimalInput(cargaTexts[i]);
    if (Number.isFinite(num) && num >= 0) updateArr(setCargaIndexes, i, kgIndexFor(num));
    setMode(setCargaModes, i, 'carousel');
  };
  const switchRepsToText = (i: number) => {
    updateArr(setRepsTexts, i, String(repsIndexes[i] + 1));
    setMode(setRepsModes, i, 'text');
  };
  const switchRepsToCarousel = (i: number) => {
    const num = parseInt(repsTexts[i], 10);
    if (Number.isInteger(num) && num >= 1 && num <= 30) updateArr(setRepsIndexes, i, num - 1);
    setMode(setRepsModes, i, 'carousel');
  };
  const adjustCarga = (i: number, delta: number) => {
    const current = parseDecimalInput(cargaTexts[i]);
    const base = Number.isFinite(current) && current >= 0 ? current : 0;
    updateArr(setCargaTexts, i, String(Math.max(0, Math.round((base + delta) * 10) / 10)));
  };

  const parseDegrau2 = (i: number) => {
    const result = parseDegrauInput(
      {
        cargaText: degrau2CargaTexts[i] ?? '',
        repsText: degrau2RepsTexts[i] ?? '',
        descansoText: degrau2DescansoTexts[i] ?? '',
      },
      locale,
    );
    updateArr<string | null>(setDegrau2Errors, i, result.error);
    return result;
  };

  const handleAdd = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const inputs: RegistrarSerieInput[] = [];
      for (let i = 0; i < grupoItens.length; i++) {
        const item = grupoItens[i];
        const cargaNum = cargaModes[i] === 'carousel'
          ? KG_VALUES[cargaIndexes[i]]
          : parseDecimalInput(cargaTexts[i]);
        if (!Number.isFinite(cargaNum) || cargaNum < 0) {
          setFormError(t('sessao.biset.cargaInvalidaPara', { nome: item.sessaoExercicio.nomeSnapshot }));
          setIsSubmitting(false);
          return;
        }
        const repsNum = repsModes[i] === 'carousel'
          ? repsIndexes[i] + 1
          : parseInt(repsTexts[i], 10);
        if (!Number.isInteger(repsNum) || repsNum < 1) {
          setFormError(t('sessao.biset.repsInvalidasPara', { nome: item.sessaoExercicio.nomeSnapshot }));
          setIsSubmitting(false);
          return;
        }
        let degrau2Input: { cargaKg: number; repeticoes: number; descansoSegundos?: number } | null = null;
        if (precisaDegrauPrescrito(item.sessaoExercicio.metodo)) {
          const degrau2Result = parseDegrau2(i);
          if (degrau2Result.error) {
            // Degrau 2 preenchido porém inválido: bloqueia o registro (não é convite vazio) — achado #1.
            setIsSubmitting(false);
            return;
          }
          degrau2Input = degrau2Result.input;
        }
        inputs.push({
          sessaoExercicioId: item.sessaoExercicio.id,
          cargaKg: cargaNum,
          repeticoes: repsNum,
          observacao: obs,
          segmentos: degrau2Input ? [degrau2Input] : undefined,
        });
      }
      await onRegistrarSeriesEmLote(inputs);
      // Re-prefila o Degrau 2 de cada exercício que o usou — mesmo comportamento
      // de ExercicioDetalheScreen (achado #8): carga vazia, reps/descanso do template.
      grupoItens.forEach((item, i) => {
        if (!precisaDegrauPrescrito(item.sessaoExercicio.metodo)) return;
        updateArr<string>(setDegrau2CargaTexts, i, '');
        updateArr<string>(setDegrau2RepsTexts, i, String(item.sessaoExercicio.execucoesRecomendadas ?? 8));
        updateArr<string>(setDegrau2DescansoTexts, i, item.sessaoExercicio.metodo === 'rest_pause' ? '15' : '');
        updateArr<string | null>(setDegrau2Errors, i, null);
      });
      if (descanso != null) startTimer(descanso);
      setObs('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validSeriesPerExercicio = grupoItens.map((item) =>
    item.series
  );
  const seriesCount = Math.max(...validSeriesPerExercicio.map((s) => s.length), 0);
  const recSeriesCount = grupoItens[0]?.sessaoExercicio.seriesRecomendadas ?? 0;
  const minValidCount = grupoItens.length > 0
    ? Math.min(...validSeriesPerExercicio.map((s) => s.length))
    : 0;

  const allRealizado = grupoItens.every((i) => i.sessaoExercicio.realizado);

  const handleDeleteSet = async (setIdx: number) => {
    const serieIds = validSeriesPerExercicio
      .map((series) => series[setIdx]?.id)
      .filter((id): id is string => id != null);
    setDeletingSetIndexes((prev) => new Set(prev).add(setIdx));
    try {
      await onDeleteSeries(serieIds);
    } finally {
      setDeletingSetIndexes((prev) => { const next = new Set(prev); next.delete(setIdx); return next; });
    }
  };

  const handleToggleGrupo = () => {
    const toToggle = allRealizado
      ? grupoItens.map((i) => i.sessaoExercicio.id)
      : grupoItens.filter((i) => !i.sessaoExercicio.realizado).map((i) => i.sessaoExercicio.id);
    void onToggleRealizadoGrupo(toToggle);
  };

  const handleConcluirComAutoFill = () => {
    setConfirmConcluirVisible(true);
  };

  // Auto-completa as series faltando (com os valores atuais do formulario) e marca o grupo como concluido.
  const concluirComAutoFill = async () => {
    const allInputs = grupoItens.flatMap((item, i) => {
      if (item.sessaoExercicio.realizado) return [];
      const validCount = item.series.length;
      const recomendadas = item.sessaoExercicio.seriesRecomendadas ?? 0;
      const missing = Math.max(0, recomendadas - validCount);
      const cargaNum = cargaModes[i] === 'carousel'
        ? KG_VALUES[cargaIndexes[i]]
        : parseDecimalInput(cargaTexts[i]);
      const repsNum = repsModes[i] === 'carousel'
        ? repsIndexes[i] + 1
        : parseInt(repsTexts[i], 10);
      const cargaFinal = Number.isFinite(cargaNum) && cargaNum >= 0 ? cargaNum : (item.sessaoExercicio.cargaPadrao ?? 0);
      const repsFinal = Number.isInteger(repsNum) && repsNum >= 1 ? repsNum : (item.sessaoExercicio.execucoesRecomendadas ?? 1);
      return Array.from({ length: missing }, () => ({
        sessaoExercicioId: item.sessaoExercicio.id,
        cargaKg: cargaFinal,
        repeticoes: repsFinal,
        observacao: '',
      }));
    });
    if (allInputs.length > 0) await onRegistrarSeriesEmLote(allInputs);
    const toToggle = grupoItens.filter((i) => !i.sessaoExercicio.realizado).map((i) => i.sessaoExercicio.id);
    if (toToggle.length > 0) await onToggleRealizadoGrupo(toToggle);
  };

  const label = grupoLabel(grupoItens.length, locale);
  const isCustomDescanso = descanso !== null && !DESCANSO_PRESETS.some((p) => p.value === descanso);

  const formatKgItem = useCallback((idx: number) => String(KG_VALUES[idx]), []);
  const formatRepsItem = useCallback((idx: number) => String(idx + 1), []);

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <View style={[styles.labelBadge, { backgroundColor: grupoColor }]}>
            <Text style={styles.labelBadgeText}>{label}</Text>
          </View>
          <View style={styles.exerciciosHeader}>
            {grupoItens.map((item, i) => (
              <Text key={item.sessaoExercicio.id} style={styles.headerExercicioNome} numberOfLines={1}>
                {i > 0 ? ' + ' : ''}{item.sessaoExercicio.nomeSnapshot}
              </Text>
            ))}
          </View>
          <Pressable
            onPress={handleToggleGrupo}
            style={[styles.finalizadoToggle, allRealizado ? styles.finalizadoToggleOn : styles.finalizadoToggleOff]}
          >
            <Text style={[styles.finalizadoToggleText, allRealizado ? styles.finalizadoToggleTextOn : styles.finalizadoToggleTextOff]}>
              {allRealizado ? t('sessao.common.retomar') : t('sessao.common.finalizar')}
            </Text>
          </Pressable>
        </View>

        {/* Series progress */}
        {recSeriesCount > 0 ? (() => {
          const total = recSeriesCount;
          const filled = minValidCount;
          const allDone = filled >= total;
          const dotCount = Math.min(total, 12);
          return (
            <View style={styles.seriesProgressRow}>
              <View style={styles.seriesProgressDots}>
                {Array.from({ length: dotCount }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.seriesProgressDot,
                      i < filled
                        ? (allDone ? styles.seriesProgressDotDone : styles.seriesProgressDotFilled)
                        : styles.seriesProgressDotEmpty,
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.seriesProgressLabel, allDone ? styles.seriesProgressLabelDone : null]}>
                {t('sessao.grupo.progressLabel', { filled, total, label })}
              </Text>
            </View>
          );
        })() : null}

        {/* Registration form — only while active */}
        {!allRealizado ? (
          <View style={styles.formCard}>
            {grupoItens.map((item, i) => (
              <View key={item.sessaoExercicio.id} style={[styles.exercicioBlock, i > 0 ? styles.exercicioBlockSeparator : null]}>
                <View style={styles.exercicioBlockHeader}>
                  <View style={styles.exercicioBlockMeta}>
                    <Text style={styles.exercicioNome} numberOfLines={1}>{item.sessaoExercicio.nomeSnapshot}</Text>
                    <View style={styles.exercicioMetaRow}>
                      <Text style={styles.exercicioMuscle} numberOfLines={1}>{item.sessaoExercicio.grupoMuscularSnapshot}</Text>
                    </View>
                  </View>
                  {!item.sessaoExercicio.realizado ? (
                    <Pressable
                      onPress={() => { void onAbrirSubstituicao(item.sessaoExercicio.id); }}
                      style={({ pressed }) => [styles.substituirBtn, pressed ? { opacity: 0.7 } : null]}
                    >
                      <Text style={styles.substituirBtnText}>{t('sessao.common.trocarExercicio')}</Text>
                    </Pressable>
                  ) : null}
                </View>

                {sugestoes[item.sessaoExercicio.id] ? (() => {
                  const sug = sugestoes[item.sessaoExercicio.id]!;
                  const ref = item.sessaoExercicio.cargaPadrao;
                  const delta = ref != null ? sug.cargaSugerida - ref : null;
                  const sugLabel = delta != null
                    ? (delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}kg` : `${sug.cargaSugerida}kg`)
                    : `${sug.cargaSugerida}kg`;
                  return (
                    <Pressable
                      onPress={() => {
                        updateArr(setCargaTexts, i, String(sug.cargaSugerida));
                        setMode(setCargaModes, i, 'text');
                      }}
                      style={({ pressed }) => [styles.sugestaoChip, pressed ? { opacity: 0.75 } : null]}
                    >
                      <Text style={styles.sugestaoText}>↑ {sugLabel} — {sug.motivo}</Text>
                    </Pressable>
                  );
                })() : null}

                <View style={styles.pickersRow}>
                  {/* Carga */}
                  {cargaModes[i] === 'carousel' ? (
                    <View style={styles.pickerCol}>
                      <View style={styles.pickerLabelRow}>
                        <Text style={styles.pickerLabel}>{t('sessao.common.cargaKgLabel')}</Text>
                        <Pressable onPress={() => switchCargaToText(i)}>
                          <Text style={styles.modeToggleText}>{t('sessao.common.digitar')}</Text>
                        </Pressable>
                      </View>
                      <PickerCarousel
                        count={KG_VALUES.length}
                        selectedIndex={cargaIndexes[i]}
                        onChangeIndex={(idx) => updateArr(setCargaIndexes, i, idx)}
                        formatItem={formatKgItem}
                      />
                    </View>
                  ) : (
                    <View style={styles.pickerCol}>
                      <View style={styles.pickerLabelRow}>
                        <Text style={styles.pickerLabel}>{t('sessao.common.cargaKgLabel')}</Text>
                        <Pressable onPress={() => switchCargaToCarousel(i)}>
                          <Text style={styles.modeToggleText}>{t('sessao.common.rolar')}</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        style={styles.cargaInput}
                        value={cargaTexts[i]}
                        onChangeText={(text) => updateArr(setCargaTexts, i, text)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={c.inputPlaceholder}
                        textAlign="center"
                        editable={!isSubmitting}
                      />
                      <View style={styles.adjustRow}>
                        {([-5, -2.5, 2.5, 5] as const).map((delta) => (
                          <Pressable
                            key={delta}
                            onPress={() => adjustCarga(i, delta)}
                            disabled={isSubmitting}
                            style={({ pressed }) => [styles.adjustBtn, pressed ? { opacity: 0.6 } : null]}
                          >
                            <Text style={styles.adjustBtnText}>{delta > 0 ? `+${delta}` : delta}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Reps */}
                  {repsModes[i] === 'carousel' ? (
                    <View style={styles.pickerCol}>
                      <View style={styles.pickerLabelRow}>
                        <Text style={styles.pickerLabel}>{t('sessao.common.repsLabel')}</Text>
                        <Pressable onPress={() => switchRepsToText(i)}>
                          <Text style={styles.modeToggleText}>{t('sessao.common.digitar')}</Text>
                        </Pressable>
                      </View>
                      <PickerCarousel
                        count={30}
                        selectedIndex={repsIndexes[i]}
                        onChangeIndex={(idx) => updateArr(setRepsIndexes, i, idx)}
                        formatItem={formatRepsItem}
                      />
                    </View>
                  ) : (
                    <View style={styles.pickerCol}>
                      <View style={styles.pickerLabelRow}>
                        <Text style={styles.pickerLabel}>{t('sessao.common.repsLabel')}</Text>
                        <Pressable onPress={() => switchRepsToCarousel(i)}>
                          <Text style={styles.modeToggleText}>{t('sessao.common.rolar')}</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        style={styles.cargaInput}
                        value={repsTexts[i]}
                        onChangeText={(text) => updateArr(setRepsTexts, i, text)}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={c.inputPlaceholder}
                        textAlign="center"
                        editable={!isSubmitting}
                        autoFocus
                      />
                    </View>
                  )}
                </View>

                {/* Per-exercise technique selector */}
                <MetodoSelector
                  metodo={item.sessaoExercicio.metodo}
                  locale={locale}
                  onChange={(novoMetodo) => { void onAtualizarMetodo(item.sessaoExercicio.id, novoMetodo); }}
                />

                {/* Degrau 2 prescrito — convite, nao obrigacao */}
                {precisaDegrauPrescrito(item.sessaoExercicio.metodo) ? (
                  <DegrauForm
                    titulo={t('sessao.degrau.prescrito')}
                    showDescanso={mostraDescanso(item.sessaoExercicio.metodo)}
                    form={{
                      cargaText: degrau2CargaTexts[i] ?? '',
                      repsText: degrau2RepsTexts[i] ?? '',
                      descansoText: degrau2DescansoTexts[i] ?? '',
                      error: degrau2Errors[i] ?? null,
                      setCargaText: (v) => updateArr(setDegrau2CargaTexts, i, v),
                      setRepsText: (v) => updateArr(setDegrau2RepsTexts, i, v),
                      setDescansoText: (v) => updateArr(setDegrau2DescansoTexts, i, v),
                    }}
                  />
                ) : null}
              </View>
            ))}

            {/* Shared rest */}
            <View style={styles.descansoSection}>
              <Text style={styles.pickerLabel}>{t('sessao.common.descanso')}</Text>
              <View style={styles.chipsRow}>
                {DESCANSO_PRESETS.map((preset) => {
                  const active = descanso === preset.value && !isCustomDescanso;
                  return (
                    <Pressable
                      key={String(preset.value)}
                      onPress={() => setDescanso(preset.value)}
                      style={[styles.chip, active ? styles.chipActive : null]}
                    >
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{preset.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Shared observation */}
            <TextInput
              style={styles.obsInput}
              placeholder={t('sessao.common.observacaoPlaceholder')}
              placeholderTextColor={c.inputPlaceholder}
              value={obs}
              onChangeText={setObs}
              editable={!isSubmitting}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Pressable
              onPress={() => { void handleAdd(); }}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && !isSubmitting ? { opacity: 0.85 } : null,
                isSubmitting ? styles.addBtnDisabled : null,
              ]}
            >
              <Text style={styles.addBtnText}>
                {isSubmitting ? t('sessao.common.registrando') : t('sessao.biset.registrarBtn', { label: label.toLowerCase() })}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConcluirComAutoFill}
              style={({ pressed }) => [styles.concluirBtn, pressed ? { opacity: 0.75 } : null]}
            >
              <Text style={styles.concluirBtnText}>{t('sessao.common.concluirExercicioBtn')}</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                const toToggle = grupoItens.filter((i) => !i.sessaoExercicio.realizado).map((i) => i.sessaoExercicio.id);
                if (toToggle.length > 0) await onToggleRealizadoGrupo(toToggle);
                if (isLastExercicio) onFinalizarSessao();
                else onProximoExercicio();
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
        ) : (
          <View style={styles.formCard}>
            <Pressable
              onPress={() => { if (isLastExercicio) onFinalizarSessao(); else onProximoExercicio(); }}
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
        )}

        {/* Paired series list */}
        {seriesCount > 0 ? (
          <View style={styles.seriesCard}>
            <Text style={styles.seriesTitle}>{t('sessao.biset.setsRegistrados')}</Text>
            <View style={styles.seriesList}>
              {Array.from({ length: seriesCount }).map((_, setIdx) => {
                const isDeleting = deletingSetIndexes.has(setIdx);
                return (
                  <View key={setIdx} style={styles.setRow}>
                    <Text style={styles.setNumber}>S{setIdx + 1}</Text>
                    <View style={styles.setExercicios}>
                      {grupoItens.map((item, exIdx) => {
                        const serie = validSeriesPerExercicio[exIdx][setIdx];
                        if (!serie) return null;
                        const firstName = item.sessaoExercicio.nomeSnapshot.split(' ')[0];
                        const degrausLabel = formatDegrausStack(serie, serie.segmentos, locale);
                        const isDegrauAberto = degrauAberto?.exIdx === exIdx && degrauAberto?.setIdx === setIdx;
                        return (
                          <View key={item.sessaoExercicio.id}>
                            <View style={styles.setLine}>
                              <Text style={styles.setExercicioNome} numberOfLines={1}>{firstName}</Text>
                              <Text style={styles.setMetric}>{degrausLabel ?? `${serie.cargaKg}kg × ${serie.repeticoes}`}</Text>
                              {!allRealizado ? [...(serie.segmentos ?? [])].sort((a, b) => a.ordem - b.ordem).map((segmento, idx) => (
                                <Pressable
                                  key={segmento.id}
                                  accessibilityRole="button"
                                  accessibilityLabel={t('sessao.degrau.removerN', {
                                    n: idx + 2,
                                    carga: segmento.cargaKg ?? 0,
                                    reps: segmento.repeticoes ?? 0,
                                  })}
                                  onPress={() => { void onRemoverSegmento(segmento.id); }}
                                  style={({ pressed }) => [styles.degrauRemoveBtn, pressed ? { opacity: 0.5 } : null]}
                                >
                                  <Text style={styles.degrauRemoveBtnText}>✕</Text>
                                </Pressable>
                              )) : null}
                              {!allRealizado ? (
                                <Pressable
                                  onPress={() => { degrauInline.reset(); setDegrauAberto(isDegrauAberto ? null : { exIdx, setIdx }); }}
                                  accessibilityRole="button"
                                  accessibilityLabel={t('sessao.degrau.adicionar')}
                                  style={({ pressed }) => [styles.addDegrauBtn, pressed ? { opacity: 0.6 } : null]}
                                >
                                  <Text style={styles.addDegrauBtnText}>{t('sessao.degrau.adicionar')}</Text>
                                </Pressable>
                              ) : null}
                            </View>
                            {isDegrauAberto ? (
                              <DegrauForm
                                titulo={t('sessao.degrau.titulo', { n: (serie.segmentos?.length ?? 0) + 2 })}
                                form={degrauInline}
                                showDescanso={false}
                                onConfirm={() => {
                                  const input = degrauInline.toInput();
                                  if (!input) return;
                                  void onRegistrarSegmento({ serieId: serie.id, ...input }).then((ok) => {
                                    if (ok) setDegrauAberto(null);
                                  });
                                }}
                                onCancel={() => setDegrauAberto(null)}
                              />
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                    {!allRealizado ? (
                      <Pressable
                        disabled={isDeleting}
                        accessibilityRole="button"
                        accessibilityLabel={t('sessao.a11y.removerSerie', { n: setIdx + 1 })}
                        onPress={() => { void handleDeleteSet(setIdx); }}
                        style={({ pressed }) => [styles.deleteBtn, (pressed || isDeleting) ? { opacity: 0.4 } : null]}
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmConcluirVisible}
        title={t('sessao.grupo.concluirTitle', { label })}
        message={t('sessao.biset.autoFillMessage')}
        confirmLabel={t('sessao.common.concluir')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirmConcluirVisible(false);
          void concluirComAutoFill();
        }}
        onCancel={() => setConfirmConcluirVisible(false)}
      />

      {timer ? (
        <RestTimerBanner
          nome={label}
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
    labelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
    labelBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
    exerciciosHeader: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
    headerExercicioNome: { color: c.textPrimary, fontSize: 12, fontWeight: '700', flexShrink: 1 },
    finalizadoToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexShrink: 0 },
    finalizadoToggleOff: { backgroundColor: c.hero },
    finalizadoToggleOn: { backgroundColor: c.cardAlt },
    finalizadoToggleText: { fontSize: 12, fontWeight: '700' },
    finalizadoToggleTextOff: { color: c.heroText },
    finalizadoToggleTextOn: { color: c.textSecondary },

    seriesProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seriesProgressDots: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
    seriesProgressDot: { width: 12, height: 12, borderRadius: 6 },
    seriesProgressDotFilled: { backgroundColor: c.accent },
    seriesProgressDotDone: { backgroundColor: c.success },
    seriesProgressDotEmpty: { backgroundColor: c.cardBorder },
    seriesProgressLabel: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
    seriesProgressLabelDone: { color: c.success },

    formCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    exercicioBlock: { gap: 8 },
    exercicioBlockSeparator: { paddingTop: 12, borderTopWidth: 1, borderTopColor: c.cardBorder },
    exercicioBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    exercicioBlockMeta: { flex: 1, gap: 2 },
    exercicioNome: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    exercicioMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    exercicioMuscle: { color: c.textSecondary, fontSize: 11 },
    tecnicaBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    tecnicaBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    substituirBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: c.accentLight, borderWidth: 1, borderColor: c.accent, flexShrink: 0 },
    substituirBtnText: { color: c.accent, fontSize: 11, fontWeight: '700' },
    tecnicaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tecnicaChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    tecnicaChipNormal: { backgroundColor: c.accent, borderColor: c.accent },
    tecnicaChipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    tecnicaChipTextActive: { color: '#fff', fontWeight: '700' },
    sugestaoChip: { backgroundColor: c.accentLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: c.accent, alignSelf: 'flex-start' },
    sugestaoText: { color: c.accent, fontSize: 12, fontWeight: '700' },

    pickersRow: { flexDirection: 'row', gap: 12 },
    pickerCol: { flex: 1, gap: 6 },
    pickerLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
    pickerLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    modeToggleText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    cargaInput: { height: 64, borderRadius: 14, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, color: c.inputText, fontSize: 26, fontWeight: '700' },
    adjustRow: { flexDirection: 'row', gap: 4 },
    adjustBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.cardBorder },
    adjustBtnText: { color: c.textPrimary, fontSize: 12, fontWeight: '700' },

    descansoSection: { gap: 6 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.hero, borderColor: c.hero },
    chipText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: c.heroText, fontWeight: '700' },

    obsInput: { height: 36, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, color: c.inputText, fontSize: 14 },
    formError: { color: c.error, fontSize: 13 },
    addBtn: { backgroundColor: c.hero, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
    addBtnDisabled: { opacity: 0.6 },
    addBtnText: { color: c.heroText, fontSize: 15, fontWeight: '800' },
    concluirBtn: { borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: c.success },
    concluirBtnText: { color: c.success, fontSize: 14, fontWeight: '700' },
    navegacaoBtn: { borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
    navegacaoBtnProximo: { backgroundColor: c.cardAlt, borderWidth: 1.5, borderColor: c.accent },
    navegacaoBtnFinalizar: { backgroundColor: c.accent },
    navegacaoBtnText: { fontSize: 15, fontWeight: '800' },
    navegacaoBtnTextProximo: { color: c.accent },
    navegacaoBtnTextFinalizar: { color: c.accentText },

    seriesCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    seriesTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    seriesList: { gap: 8 },
    setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.cardAlt, borderRadius: 10, padding: 10 },
    setNumber: { color: c.textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', width: 24, textAlign: 'center' },
    setExercicios: { flex: 1, gap: 3 },
    setLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    setExercicioNome: { color: c.textPrimary, fontSize: 13, fontWeight: '700', width: 92 },
    setMetric: { color: c.textPrimary, fontSize: 13, fontVariant: ['tabular-nums'] },
    addDegrauBtn: { paddingHorizontal: 6, paddingVertical: 2 },
    addDegrauBtnText: { color: c.accent, fontSize: 11, fontWeight: '700' },
    deleteBtn: { padding: 4 },
    deleteBtnText: { color: c.error, fontSize: 15, fontWeight: '700' },
    degrauRemoveBtn: { padding: 2 },
    degrauRemoveBtnText: { color: c.error, fontSize: 11, fontWeight: '700' },
    flex1: { flex: 1 },
  });
}
