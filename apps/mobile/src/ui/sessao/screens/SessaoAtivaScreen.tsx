import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { RegistrarSerieInput } from '../../../application/sessoes/use-cases/RegistrarSerieUseCase';
import type { SerieRegistradaPrimitives, TipoSerie } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import type { SessaoAtivaControllerState } from '../hooks/useSessaoAtivaController';

export function SessaoAtivaScreen({
  detalhe,
  availableExercises,
  showAddExercise,
  errorMessage,
  isFinalizing,
  onRegistrarSerie,
  onDeleteSerie,
  onToggleRealizado,
  onAddExercicio,
  onToggleShowAddExercise,
  onFinalizar,
}: SessaoAtivaControllerState) {
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

      {detalhe.exercicios.map(({ sessaoExercicio, series }) => (
        <ExercicioCard
          key={sessaoExercicio.id}
          sessaoExercicio={sessaoExercicio}
          series={series}
          onRegistrarSerie={onRegistrarSerie}
          onDeleteSerie={onDeleteSerie}
          onToggleRealizado={onToggleRealizado}
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
          disabled={isFinalizing}
          style={({ pressed }) => [
            styles.finalizarButton,
            pressed ? styles.finalizarButtonPressed : null,
            isFinalizing ? styles.finalizarButtonDisabled : null,
          ]}
        >
          <Text style={styles.finalizarButtonText}>
            {isFinalizing ? 'Finalizando...' : 'Finalizar sessao'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

interface ExercicioCardProps {
  sessaoExercicio: SessaoExercicioPrimitives;
  series: SerieRegistradaPrimitives[];
  onRegistrarSerie: (input: RegistrarSerieInput) => Promise<void>;
  onDeleteSerie: (id: string) => Promise<void>;
  onToggleRealizado: (id: string) => Promise<void>;
}

function ExercicioCard({ sessaoExercicio, series, onRegistrarSerie, onDeleteSerie, onToggleRealizado }: ExercicioCardProps) {
  const [tipoSerie, setTipoSerie] = useState<TipoSerie>('valida');
  const [carga, setCarga] = useState(sessaoExercicio.cargaPadrao != null ? String(sessaoExercicio.cargaPadrao) : '');
  const [reps, setReps] = useState(sessaoExercicio.execucoesRecomendadas != null ? String(sessaoExercicio.execucoesRecomendadas) : '');
  const [obs, setObs] = useState('');
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

    // Mantém a carga como default para a próxima série
    setReps('');
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
                placeholderTextColor="#7f856f"
                value={carga}
                onChangeText={setCarga}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.formInput, styles.formInputSmall]}
                placeholder="Reps"
                placeholderTextColor="#7f856f"
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.formInput, styles.formInputObs]}
                placeholder="Obs."
                placeholderTextColor="#7f856f"
                value={obs}
                onChangeText={setObs}
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
  if (availableExercises.length === 0) {
    return <Text style={styles.emptyAddText}>Todos os exercicios ja estao nesta sessao.</Text>;
  }

  return (
    <View style={styles.addExercicioList}>
      {availableExercises.map((ex) => (
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f0e8' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#66725f', fontSize: 15 },
  heroCard: { backgroundColor: '#20352c', borderRadius: 24, padding: 22, gap: 8 },
  eyebrow: { color: '#b8c9a9', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#f8f4ea', fontSize: 26, fontWeight: '800' },
  description: { color: '#dde7d3', fontSize: 14 },
  errorMessage: { color: '#a1362e', fontSize: 14, fontWeight: '600', paddingHorizontal: 4 },
  exercicioCard: { backgroundColor: '#fbf9f2', borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: '#e1dccd' },
  exercicioCardNaoRealizado: { opacity: 0.55 },
  exercicioHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  exercicioInfo: { flex: 1 },
  exercicioName: { color: '#20352c', fontSize: 15, fontWeight: '800' },
  exercicioMeta: { color: '#657062', fontSize: 13, marginTop: 2 },
  metaRecs: { color: '#c96f2d', fontSize: 12, fontWeight: '700', marginTop: 4 },
  realizadoToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#c5e0b8' },
  naoRealizadoToggle: { backgroundColor: '#f0dbd8' },
  realizadoToggleText: { color: '#1e4030', fontSize: 12, fontWeight: '700' },
  naoRealizadoText: { color: '#7a2a24' },
  seriesList: { gap: 6 },
  serieRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eef1e7', borderRadius: 10, padding: 8 },
  tipoBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tipoBadgeAquec: { backgroundColor: '#d4e8fc' },
  tipoBadgeValida: { backgroundColor: '#d4f0dc' },
  tipoBadgeText: { fontSize: 11, fontWeight: '700', color: '#1d3a2a' },
  serieLabel: { flex: 1, color: '#20352c', fontSize: 14, fontWeight: '600' },
  serieObs: { color: '#66725f', fontSize: 12, flexShrink: 1 },
  deleteSerieBtn: { padding: 4 },
  deleteSerieBtnText: { color: '#a1362e', fontSize: 14, fontWeight: '700' },
  addSerieForm: { gap: 10 },
  tipoToggle: { flexDirection: 'row', gap: 8 },
  tipoBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#e4e8de' },
  tipoBtnActive: { backgroundColor: '#c96f2d' },
  tipoBtnText: { color: '#31463d', fontSize: 13, fontWeight: '700' },
  tipoBtnTextActive: { color: '#fff8f2' },
  formRow: { flexDirection: 'row', gap: 8 },
  formInput: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#d4cfbf', backgroundColor: '#fff', paddingHorizontal: 12, color: '#1d271f', fontSize: 14 },
  formInputSmall: { width: 90 },
  formInputObs: { flex: 1 },
  formError: { color: '#a1362e', fontSize: 13 },
  addSerieBtn: { backgroundColor: '#20352c', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  addSerieBtnText: { color: '#f8f4ea', fontSize: 14, fontWeight: '700' },
  actionsCard: { backgroundColor: '#fbf9f2', borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: '#e1dccd' },
  secondaryButton: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#20352c' },
  secondaryButtonPressed: { opacity: 0.7 },
  secondaryButtonText: { color: '#20352c', fontSize: 14, fontWeight: '700' },
  addExercicioList: { gap: 8 },
  emptyAddText: { color: '#66725f', fontSize: 13 },
  availableCard: { borderRadius: 12, padding: 12, backgroundColor: '#eef1e7' },
  availableName: { color: '#20352c', fontSize: 14, fontWeight: '700' },
  availableMeta: { color: '#657062', fontSize: 12, marginTop: 2 },
  finalizarButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#c96f2d' },
  finalizarButtonPressed: { opacity: 0.9 },
  finalizarButtonDisabled: { opacity: 0.5 },
  finalizarButtonText: { color: '#fff8f2', fontSize: 15, fontWeight: '800' },
});
