import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';

import type { RegistrarSerieInput } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { SugestaoProgressao } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { SerieRegistradaPrimitives, TipoSerie } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { useTheme } from '../../shared/theme';

interface Props {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  sugestao: SugestaoProgressao | null;
  onRegistrarSerie: (input: RegistrarSerieInput) => Promise<void>;
  onDeleteSerie: (id: string) => Promise<void>;
  onToggleRealizado: (id: string) => Promise<void>;
  onBack: () => void;
}

interface TimerState {
  total: number;
  restante: number;
}

export function ExercicioDetalheScreen({
  sessaoExercicio,
  series,
  sugestao,
  onRegistrarSerie,
  onDeleteSerie,
  onToggleRealizado,
  onBack,
}: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const finalizado = sessaoExercicio.realizado;

  const defaultDescanso = sessaoExercicio.tempoDescansoSegundos != null ? String(sessaoExercicio.tempoDescansoSegundos) : '';
  const [tipoSerie, setTipoSerie] = useState<TipoSerie>('valida');
  const [carga, setCarga] = useState(sessaoExercicio.cargaPadrao != null ? String(sessaoExercicio.cargaPadrao) : '');
  const [reps, setReps] = useState(sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '');
  const [obs, setObs] = useState('');
  const [descanso, setDescanso] = useState(defaultDescanso);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingSerie, setIsSubmittingSerie] = useState(false);

  const [timer, setTimer] = useState<TimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (segundos: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
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

  const handleAdd = async () => {
    if (isSubmittingSerie) return;
    setIsSubmittingSerie(true);
    setFormError(null);

    const cargaNum = parseFloat(carga.replace(',', '.'));
    const repsNum = parseInt(reps, 10);

    if (!Number.isFinite(cargaNum) || cargaNum < 0) {
      setFormError('Carga invalida. Use um numero como 80 ou 102,5.');
      setIsSubmittingSerie(false);
      return;
    }
    if (!Number.isInteger(repsNum) || repsNum < 1) {
      setFormError('Repeticoes deve ser um numero inteiro maior que 0.');
      setIsSubmittingSerie(false);
      return;
    }

    try {
      await onRegistrarSerie({
        sessaoExercicioId: sessaoExercicio.id,
        tipoSerie,
        cargaKg: cargaNum,
        repeticoes: repsNum,
        observacao: obs,
      });

      const descansoNum = parseInt(descanso, 10);
      if (Number.isInteger(descansoNum) && descansoNum > 0) {
        startTimer(descansoNum);
      }

      setReps(sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '');
      setDescanso(defaultDescanso);
      setObs('');
    } finally {
      setIsSubmittingSerie(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </Pressable>
        <Pressable
          onPress={() => { void onToggleRealizado(sessaoExercicio.id); }}
          style={[styles.finalizadoToggle, finalizado ? styles.finalizadoToggleOn : styles.finalizadoToggleOff]}
        >
          <Text style={[styles.finalizadoToggleText, finalizado ? styles.finalizadoToggleTextOn : styles.finalizadoToggleTextOff]}>
            {finalizado ? 'Retomar' : 'Finalizar'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.infoCard}>
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

      <View style={styles.mediaPlaceholder}>
        <Text style={styles.mediaPlaceholderText}>Video de execucao</Text>
        <Text style={styles.mediaPlaceholderSub}>Em breve</Text>
      </View>

      {timer ? (
        <RestTimerBanner
          nome={sessaoExercicio.nomeSnapshot}
          restante={timer.restante}
          total={timer.total}
          onSkip={skipTimer}
        />
      ) : null}

      {!finalizado && sugestao ? (
        <Pressable
          onPress={() => setCarga(String(sugestao.cargaSugerida))}
          style={({ pressed }) => [styles.sugestaoChip, pressed ? { opacity: 0.75 } : null]}
        >
          <Text style={styles.sugestaoText}>
            ↑ Sugestao: {sugestao.cargaSugerida} kg — {sugestao.motivo}
          </Text>
        </Pressable>
      ) : null}

      {series.length > 0 ? (
        <View style={styles.seriesCard}>
          <Text style={styles.seriesTitle}>Series registradas</Text>
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
                {!finalizado ? (
                  <Pressable
                    onPress={() => { void onDeleteSerie(serie.id); }}
                    style={({ pressed }) => [styles.deleteSerieBtn, pressed ? { opacity: 0.6 } : null]}
                  >
                    <Text style={styles.deleteSerieBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {!finalizado ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Registrar serie</Text>

          <View style={styles.tipoToggle}>
            <Pressable
              onPress={() => setTipoSerie('aquecimento')}
              style={[styles.tipoBtn, tipoSerie === 'aquecimento' ? styles.tipoBtnActive : null]}
            >
              <Text style={[styles.tipoBtnText, tipoSerie === 'aquecimento' ? styles.tipoBtnTextActive : null]}>Aquecimento</Text>
            </Pressable>
            <Pressable
              onPress={() => setTipoSerie('valida')}
              style={[styles.tipoBtn, tipoSerie === 'valida' ? styles.tipoBtnActive : null]}
            >
              <Text style={[styles.tipoBtnText, tipoSerie === 'valida' ? styles.tipoBtnTextActive : null]}>Valida</Text>
            </Pressable>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Carga (kg)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0"
                placeholderTextColor={c.inputPlaceholder}
                value={carga}
                onChangeText={setCarga}
                keyboardType="decimal-pad"
                editable={!isSubmittingSerie}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Reps</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0"
                placeholderTextColor={c.inputPlaceholder}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                editable={!isSubmittingSerie}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Descanso (s)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="60"
                placeholderTextColor={c.inputPlaceholder}
                value={descanso}
                onChangeText={setDescanso}
                keyboardType="number-pad"
                editable={!isSubmittingSerie}
              />
            </View>
          </View>

          <TextInput
            style={[styles.formInput, styles.formInputObs]}
            placeholder="Observacao (opcional)"
            placeholderTextColor={c.inputPlaceholder}
            value={obs}
            onChangeText={setObs}
            editable={!isSubmittingSerie}
          />

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
        </View>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { paddingVertical: 8, paddingRight: 16 },
    backBtnText: { color: c.accent, fontSize: 15, fontWeight: '700' },
    finalizadoToggle: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
    finalizadoToggleOff: { backgroundColor: c.hero },
    finalizadoToggleOn: { backgroundColor: c.cardAlt },
    finalizadoToggleText: { fontSize: 13, fontWeight: '700' },
    finalizadoToggleTextOff: { color: c.heroText },
    finalizadoToggleTextOn: { color: c.textSecondary },
    infoCard: { backgroundColor: c.card, borderRadius: 20, padding: 18, gap: 6, borderWidth: 1, borderColor: c.cardBorder },
    exercicioName: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    exercicioMeta: { color: c.textSecondary, fontSize: 14 },
    metaRecs: { color: c.accent, fontSize: 13, fontWeight: '700', marginTop: 2 },
    mediaPlaceholder: { backgroundColor: c.cardAlt, borderRadius: 20, height: 180, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: c.cardBorder, borderStyle: 'dashed' },
    mediaPlaceholderText: { color: c.textSecondary, fontSize: 15, fontWeight: '700' },
    mediaPlaceholderSub: { color: c.textLabel, fontSize: 12 },
    sugestaoChip: { backgroundColor: c.accentLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    sugestaoText: { color: c.inputText, fontSize: 13, fontWeight: '700' },
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
    formCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    formTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    tipoToggle: { flexDirection: 'row', gap: 8 },
    tipoBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: c.cardAlt },
    tipoBtnActive: { backgroundColor: c.accent },
    tipoBtnText: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    tipoBtnTextActive: { color: c.accentText },
    formRow: { flexDirection: 'row', gap: 10 },
    formField: { flex: 1, gap: 4 },
    formLabel: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    formInput: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, color: c.inputText, fontSize: 15 },
    formInputObs: { height: 44 },
    formError: { color: c.error, fontSize: 13 },
    addSerieBtn: { backgroundColor: c.hero, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    addSerieBtnDisabled: { opacity: 0.6 },
    addSerieBtnText: { color: c.heroText, fontSize: 15, fontWeight: '800' },
  });
}
