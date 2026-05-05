import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TreinoDetailControllerState } from '../hooks/useTreinoDetailController';
import { buildTreinoDetailViewModel } from '../presenters/buildTreinoDetailViewModel';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';

const GROUP_ORDER = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Quadriceps', 'Posterior', 'Gluteos', 'Panturrilha',
  'Abdomen', 'Trapezio', 'Antebraco',
];

function primaryGroup(groupMuscle: string): string {
  return groupMuscle.split(',')[0].trim();
}

function groupExercises(exercises: ExercisePrimitives[]): { group: string; items: ExercisePrimitives[] }[] {
  const byGroup = new Map<string, ExercisePrimitives[]>();
  for (const ex of exercises) {
    const group = primaryGroup(ex.groupMuscle);
    const list = byGroup.get(group) ?? [];
    list.push(ex);
    byGroup.set(group, list);
  }
  return Array.from(byGroup.entries())
    .sort(([a], [b]) => {
      const ai = GROUP_ORDER.indexOf(a), bi = GROUP_ORDER.indexOf(b);
      const ao = ai === -1 ? GROUP_ORDER.length : ai;
      const bo = bi === -1 ? GROUP_ORDER.length : bi;
      return ao !== bo ? ao - bo : a.localeCompare(b);
    })
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function TreinoDetailScreen({
  treino,
  treinoExercicios,
  availableExercises,
  exercisesById,
  errorMessage,
  feedbackMessage,
  onAddExercicio,
  onAddMultiplosExercicios,
  onRemoveExercicio,
  onMoveUp,
  onMoveDown,
  onUpdateRecomendacoes,
  onUpdateNome,
  onBack,
}: TreinoDetailControllerState) {
  const viewModel = buildTreinoDetailViewModel(treino, treinoExercicios, exercisesById);

  const addedExercicioIds = new Set(treinoExercicios.map((te) => te.exercicioId));
  const notAddedExercises = availableExercises.filter((e) => !addedExercicioIds.has(e.id));

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingNome, setEditingNome] = useState(false);
  const [nomeText, setNomeText] = useState(treino.name);

  // Centralized recs state: tracks current field text for all exercises
  const recsRef = useRef<Map<string, { series: string; execucoes: string; carga: string }>>(new Map());
  useEffect(() => {
    for (const te of treinoExercicios) {
      if (!recsRef.current.has(te.id)) {
        recsRef.current.set(te.id, {
          series: te.seriesRecomendadas != null ? String(te.seriesRecomendadas) : '',
          execucoes: te.execucoesRecomendadas != null ? String(te.execucoesRecomendadas) : '',
          carga: te.cargaPadrao != null ? String(te.cargaPadrao) : '',
        });
      }
    }
  }, [treinoExercicios]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const saveFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (saveFeedbackTimer.current) clearTimeout(saveFeedbackTimer.current); }, []);

  const handleSaveAll = async () => {
    setIsSaving(true);
    for (const te of treinoExercicios) {
      const vals = recsRef.current.get(te.id);
      if (!vals) continue;
      const s = parseInt(vals.series, 10);
      const e = parseInt(vals.execucoes, 10);
      const c = parseFloat(vals.carga.replace(',', '.'));
      await onUpdateRecomendacoes(
        te.id,
        Number.isInteger(s) && s > 0 ? s : null,
        Number.isInteger(e) && e > 0 ? e : null,
        Number.isFinite(c) && c > 0 ? c : null,
      );
    }
    setIsSaving(false);
    onBack();
  };

  const filteredExercises = notAddedExercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.groupMuscle.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selected.size === 0) return;
    await onAddMultiplosExercicios(Array.from(selected));
    setSelected(new Set());
    setSearch('');
  };

  const handleSaveNome = async () => {
    const trimmed = nomeText.trim();
    if (trimmed && trimmed !== treino.name) {
      await onUpdateNome(trimmed);
    }
    setEditingNome(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Treino</Text>
        {editingNome ? (
          <View style={styles.editNomeRow}>
            <TextInput
              style={styles.editNomeInput}
              value={nomeText}
              onChangeText={setNomeText}
              autoFocus
              onBlur={() => { void handleSaveNome(); }}
              onSubmitEditing={() => { void handleSaveNome(); }}
              returnKeyType="done"
            />
            <Pressable onPress={() => { void handleSaveNome(); }} style={styles.saveNomeBtn}>
              <Text style={styles.saveNomeBtnText}>Salvar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.nomeRow}>
            <Text style={styles.title}>{viewModel.treinoName}</Text>
            <Pressable onPress={() => { setNomeText(treino.name); setEditingNome(true); }} style={styles.editNomeBtn}>
              <Text style={styles.editNomeBtnText}>✎</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.description}>{viewModel.objetivo}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Exercicios do treino</Text>

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {feedbackMessage ? <Text style={styles.successMessage}>{feedbackMessage}</Text> : null}

        {viewModel.emptyStateMessage ? (
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        ) : (
          viewModel.exercicios.map((item) => {
            const te = treinoExercicios.find((t) => t.id === item.treinoExercicioId);
            return (
              <ExercicioCardTreino
                key={item.treinoExercicioId}
                item={item}
                seriesRecomendadas={te?.seriesRecomendadas ?? null}
                execucoesRecomendadas={te?.execucoesRecomendadas ?? null}
                cargaPadrao={te?.cargaPadrao ?? null}
                onMoveUp={() => { void onMoveUp(item.treinoExercicioId); }}
                onMoveDown={() => { void onMoveDown(item.treinoExercicioId); }}
                onRemove={() => { void onRemoveExercicio(item.treinoExercicioId); }}
                onChangeRecs={(series, execucoes, carga) => {
                  recsRef.current.set(item.treinoExercicioId, { series, execucoes, carga });
                }}
              />
            );
          })
        )}

        {treinoExercicios.length > 0 ? (
          <Pressable
            onPress={() => { void handleSaveAll(); }}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveTreinoBtn,
              pressed ? styles.saveTreinoBtnPressed : null,
              isSaving ? styles.saveTreinoBtnDisabled : null,
            ]}
          >
            <Text style={styles.saveTreinoBtnText}>
              {isSaving ? 'Salvando...' : saveFeedback ? '✓ Treino salvo!' : 'Salvar treino'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {notAddedExercises.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Adicionar exercicios</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar exercicio ou grupo muscular..."
            placeholderTextColor="#7f856f"
            value={search}
            onChangeText={(v) => { setSearch(v); setSelected(new Set()); }}
          />

          {selected.size > 0 ? (
            <Pressable
              onPress={() => { void handleAddSelected(); }}
              style={({ pressed }) => [styles.addSelectedBtn, pressed ? { opacity: 0.85 } : null]}
            >
              <Text style={styles.addSelectedBtnText}>+ Adicionar selecionados ({selected.size})</Text>
            </Pressable>
          ) : (
            <Text style={styles.helperText}>Toque para selecionar. Toque novamente para desmarcar.</Text>
          )}

          {filteredExercises.length === 0 ? (
            <Text style={styles.emptyState}>
              {search ? 'Nenhum exercicio encontrado.' : 'Todos os exercicios ja estao no treino.'}
            </Text>
          ) : (
            groupExercises(filteredExercises).map(({ group, items }) => (
              <ExercisePickerGroup
                key={group}
                group={group}
                items={items}
                selected={selected}
                forceExpanded={search.length > 0}
                onToggleSelect={toggleSelect}
                onAdd={(id) => { void onAddExercicio(id); }}
                hasSelection={selected.size > 0}
              />
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

interface ExercisePickerGroupProps {
  group: string;
  items: ExercisePrimitives[];
  selected: Set<string>;
  forceExpanded: boolean;
  hasSelection: boolean;
  onToggleSelect: (id: string) => void;
  onAdd: (id: string) => void;
}

function ExercisePickerGroup({ group, items, selected, forceExpanded, hasSelection, onToggleSelect, onAdd }: ExercisePickerGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = expanded || forceExpanded;

  return (
    <View style={styles.pickerGroup}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.pickerGroupHeader, pressed ? { opacity: 0.85 } : null]}
      >
        <View style={styles.pickerGroupHeaderLeft}>
          <Text style={styles.pickerGroupTitle}>{group}</Text>
          <View style={styles.pickerCountBadge}>
            <Text style={styles.pickerCountBadgeText}>{items.length}</Text>
          </View>
        </View>
        <Text style={styles.pickerChevron}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.pickerGroupBody}>
          {items.map((exercise) => {
            const isSelected = selected.has(exercise.id);
            return (
              <Pressable
                key={exercise.id}
                onPress={() => {
                  if (!hasSelection && !isSelected) {
                    onAdd(exercise.id);
                  } else {
                    onToggleSelect(exercise.id);
                  }
                }}
                onLongPress={() => onToggleSelect(exercise.id)}
                style={({ pressed }) => [
                  styles.availableCard,
                  isSelected ? styles.availableCardSelected : null,
                  pressed ? { opacity: 0.7 } : null,
                ]}
              >
                <View style={styles.availableCardContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.availableName}>{exercise.name}</Text>
                    <Text style={styles.availableMeta}>{exercise.groupMuscle} · {exercise.category}</Text>
                  </View>
                  {isSelected ? (
                    <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

interface ExercicioCardTreinoProps {
  item: ReturnType<typeof buildTreinoDetailViewModel>['exercicios'][number];
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeRecs: (series: string, execucoes: string, carga: string) => void;
}

function ExercicioCardTreino({ item, seriesRecomendadas, execucoesRecomendadas, cargaPadrao, onMoveUp, onMoveDown, onRemove, onChangeRecs }: ExercicioCardTreinoProps) {
  const [seriesText, setSeriesText] = useState(seriesRecomendadas != null ? String(seriesRecomendadas) : '');
  const [execucoesText, setExecucoesText] = useState(execucoesRecomendadas != null ? String(execucoesRecomendadas) : '');
  const [cargaText, setCargaText] = useState(cargaPadrao != null ? String(cargaPadrao) : '');

  return (
    <View style={styles.exercicioCard}>
      <View style={styles.exercicioInfo}>
        <Text style={styles.exercicioOrdem}>{item.ordem}.</Text>
        <View style={styles.exercicioTexts}>
          <Text style={styles.exercicioName}>{item.name}</Text>
          <Text style={styles.exercicioMeta}>{item.groupMuscle} · {item.category}</Text>
        </View>
      </View>

      <View style={styles.recomendacoesRow}>
        <View style={styles.recomendacaoField}>
          <Text style={styles.recomendacaoLabel}>Series</Text>
          <TextInput
            style={styles.recomendacaoInput}
            value={seriesText}
            onChangeText={(v) => { setSeriesText(v); onChangeRecs(v, execucoesText, cargaText); }}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor="#aab5a0"
            returnKeyType="next"
          />
        </View>
        <Text style={styles.recomendacaoSep}>×</Text>
        <View style={styles.recomendacaoField}>
          <Text style={styles.recomendacaoLabel}>Reps</Text>
          <TextInput
            style={styles.recomendacaoInput}
            value={execucoesText}
            onChangeText={(v) => { setExecucoesText(v); onChangeRecs(seriesText, v, cargaText); }}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor="#aab5a0"
            returnKeyType="next"
          />
        </View>
        <Text style={styles.recomendacaoSep}>@</Text>
        <View style={styles.recomendacaoField}>
          <Text style={styles.recomendacaoLabel}>Carga kg</Text>
          <TextInput
            style={[styles.recomendacaoInput, styles.recomendacaoInputCarga]}
            value={cargaText}
            onChangeText={(v) => { setCargaText(v); onChangeRecs(seriesText, execucoesText, v); }}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor="#aab5a0"
            returnKeyType="next"
          />
        </View>
      </View>

      <View style={styles.exercicioActions}>
        <Pressable
          onPress={onMoveUp}
          style={({ pressed }) => [styles.orderButton, item.isFirst ? styles.orderButtonDisabled : null, pressed ? styles.orderButtonPressed : null]}
          disabled={item.isFirst}
        >
          <Text style={styles.orderButtonText}>↑</Text>
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          style={({ pressed }) => [styles.orderButton, item.isLast ? styles.orderButtonDisabled : null, pressed ? styles.orderButtonPressed : null]}
          disabled={item.isLast}
        >
          <Text style={styles.orderButtonText}>↓</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          style={({ pressed }) => [styles.removeButton, pressed ? styles.removeButtonPressed : null]}
        >
          <Text style={styles.removeButtonText}>Remover</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f0e8' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { paddingVertical: 8, paddingRight: 12 },
  backButtonPressed: { opacity: 0.6 },
  backButtonText: { color: '#c96f2d', fontSize: 15, fontWeight: '700' },
  heroCard: { backgroundColor: '#20352c', borderRadius: 24, padding: 22, gap: 10 },
  eyebrow: { color: '#b8c9a9', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  nomeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#f8f4ea', fontSize: 28, fontWeight: '800', flex: 1 },
  editNomeBtn: { padding: 4 },
  editNomeBtnText: { color: '#b8c9a9', fontSize: 20 },
  editNomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editNomeInput: { flex: 1, backgroundColor: '#2d4a3e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: '#f8f4ea', fontSize: 20, fontWeight: '800', borderWidth: 1, borderColor: '#4a6b5a' },
  saveNomeBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#c96f2d', borderRadius: 10 },
  saveNomeBtnText: { color: '#fff8f2', fontSize: 13, fontWeight: '700' },
  description: { color: '#dde7d3', fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: '#fbf9f2', borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: '#e1dccd' },
  sectionTitle: { color: '#20352c', fontSize: 20, fontWeight: '800' },
  helperText: { color: '#66725f', fontSize: 13, lineHeight: 18 },
  emptyState: { color: '#66725f', fontSize: 14, lineHeight: 20 },
  errorMessage: { color: '#a1362e', fontSize: 14, fontWeight: '600' },
  successMessage: { color: '#2c6b42', fontSize: 14, fontWeight: '600' },
  searchInput: { height: 44, borderRadius: 14, borderWidth: 1, borderColor: '#d4cfbf', backgroundColor: '#fff', paddingHorizontal: 14, color: '#1d271f', fontSize: 14 },
  addSelectedBtn: { backgroundColor: '#20352c', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  addSelectedBtnText: { color: '#f8f4ea', fontSize: 14, fontWeight: '700' },
  availableCard: { borderRadius: 14, padding: 14, backgroundColor: '#eef1e7', borderWidth: 1.5, borderColor: 'transparent' },
  availableCardSelected: { backgroundColor: '#d4f0dc', borderColor: '#20352c' },
  availableCardContent: { flexDirection: 'row', alignItems: 'center' },
  availableName: { color: '#20352c', fontSize: 15, fontWeight: '700' },
  availableMeta: { color: '#657062', fontSize: 13, marginTop: 2 },
  checkmark: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#20352c', alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { color: '#f8f4ea', fontSize: 13, fontWeight: '800' },
  exercicioCard: { borderRadius: 16, padding: 14, backgroundColor: '#eef1e7', gap: 10 },
  exercicioInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exercicioOrdem: { color: '#c96f2d', fontSize: 16, fontWeight: '800', minWidth: 20 },
  exercicioTexts: { flex: 1 },
  exercicioName: { color: '#20352c', fontSize: 15, fontWeight: '800' },
  exercicioMeta: { color: '#657062', fontSize: 13, marginTop: 2 },
  exercicioActions: { flexDirection: 'row', gap: 8 },
  orderButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#d9ddd0', alignItems: 'center', justifyContent: 'center' },
  orderButtonDisabled: { opacity: 0.3 },
  orderButtonPressed: { opacity: 0.7 },
  orderButtonText: { color: '#20352c', fontSize: 16, fontWeight: '700' },
  removeButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f0dbd8' },
  removeButtonPressed: { opacity: 0.75 },
  removeButtonText: { color: '#a1362e', fontSize: 13, fontWeight: '700' },
  recomendacoesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recomendacaoField: { alignItems: 'center', gap: 3 },
  recomendacaoLabel: { color: '#657062', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  recomendacaoInput: { width: 52, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#d4cfbf', backgroundColor: '#fff', textAlign: 'center', color: '#1d271f', fontSize: 15, fontWeight: '700' },
  recomendacaoInputCarga: { width: 64 },
  recomendacaoSep: { color: '#8a9486', fontSize: 16, fontWeight: '700', marginTop: 14 },
  saveTreinoBtn: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c96f2d', marginTop: 4 },
  saveTreinoBtnPressed: { opacity: 0.9 },
  saveTreinoBtnDisabled: { opacity: 0.6 },
  saveTreinoBtnText: { color: '#fff8f2', fontSize: 16, fontWeight: '800' },
  pickerGroup: { gap: 0 },
  pickerGroupHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#20352c', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 2 },
  pickerGroupHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerGroupTitle: { color: '#f8f4ea', fontSize: 14, fontWeight: '800' },
  pickerCountBadge: { backgroundColor: '#c96f2d', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 },
  pickerCountBadgeText: { color: '#fff8f2', fontSize: 11, fontWeight: '800' },
  pickerChevron: { color: '#b8c9a9', fontSize: 11, fontWeight: '700' },
  pickerGroupBody: { gap: 6, paddingBottom: 4 },
});
