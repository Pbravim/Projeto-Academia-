import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { RegistrarSerieInput } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { SugestaoProgressao } from '../../../application/sessoes/use-cases/SugerirProgressaoUseCase';
import type { SerieRegistradaPrimitives, TipoSerie } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import { useTheme } from '../../shared/theme';

interface Props {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  sugestao: SugestaoProgressao | null;
  onRegistrarSerie: (input: RegistrarSerieInput) => Promise<void>;
  onDeleteSerie: (id: string) => Promise<void>;
  onToggleRealizado: (id: string) => Promise<void>;
  onSerieRegistrada: (tempoDescanso: number | null) => void;
}

export function ExercicioCard({
  sessaoExercicio,
  series,
  sugestao,
  onRegistrarSerie,
  onDeleteSerie,
  onToggleRealizado,
  onSerieRegistrada,
}: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const defaultDescanso = sessaoExercicio.tempoDescansoSegundos != null ? String(sessaoExercicio.tempoDescansoSegundos) : '';
  const [tipoSerie, setTipoSerie] = useState<TipoSerie>('valida');
  const [carga, setCarga] = useState(sessaoExercicio.cargaPadrao != null ? String(sessaoExercicio.cargaPadrao) : '');
  const [reps, setReps] = useState(sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '');
  const [obs, setObs] = useState('');
  const [descanso, setDescanso] = useState(defaultDescanso);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingSerie, setIsSubmittingSerie] = useState(false);

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
      onSerieRegistrada(Number.isInteger(descansoNum) && descansoNum > 0 ? descansoNum : null);

      setReps(sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '');
      setDescanso(defaultDescanso);
      setObs('');
    } finally {
      setIsSubmittingSerie(false);
    }
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
                editable={!isSubmittingSerie}
              />
              <TextInput
                style={[styles.formInput, styles.formInputSmall]}
                placeholder="Reps"
                placeholderTextColor={c.inputPlaceholder}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                editable={!isSubmittingSerie}
              />
              <TextInput
                style={[styles.formInput, styles.formInputObs]}
                placeholder="Obs."
                placeholderTextColor={c.inputPlaceholder}
                value={obs}
                onChangeText={setObs}
                editable={!isSubmittingSerie}
              />
              <TextInput
                style={[styles.formInput, styles.formInputDescanso]}
                placeholder="⏱ s"
                placeholderTextColor={c.inputPlaceholder}
                value={descanso}
                onChangeText={setDescanso}
                keyboardType="number-pad"
                editable={!isSubmittingSerie}
              />
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
          </View>
        </>
      ) : null}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
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
    addSerieBtnDisabled: { opacity: 0.6 },
    addSerieBtnText: { color: c.heroText, fontSize: 14, fontWeight: '700' },
  });
}
