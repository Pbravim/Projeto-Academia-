import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TreinoDetailControllerState } from '../hooks/useTreinoDetailController';
import { buildTreinoDetailViewModel } from '../presenters/buildTreinoDetailViewModel';
import { ExercicioCardTreino } from '../components/ExercicioCardTreino';
import { ExercisePickerGroup } from '../components/ExercisePickerGroup';
import { SubstitutosPickerModal } from '../components/SubstitutosPickerModal';
import { ExerciseMediaViewer } from '../../exercises/components/ExerciseMediaViewer';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { useTheme } from '../../shared/theme';

const GROUP_ORDER = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Quadriceps', 'Posterior', 'Gluteos', 'Panturrilha',
  'Abdomen', 'Trapezio', 'Antebraco',
];

function grupoLabel(n: number): string {
  if (n === 2) return 'Bi-set';
  if (n === 3) return 'Tri-set';
  return 'Circuito';
}

function grupoColor(n: number): string {
  if (n === 2) return '#16a34a';
  if (n === 3) return '#ea580c';
  return '#0891b2';
}

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

function gerarGrupoId(): string {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
  onMoveUpInGroup,
  onMoveDownInGroup,
  onUpdateRecomendacoes,
  onUpdateMetodoGrupo,
  onUpdateNome,
  onUpdateObjetivo,
  alternativasByExercicioId,
  onAddAlternativa,
  onRemoveAlternativa,
  getSessaoAtiva,
  cancelarSessao,
  onBack,
  onGoToSessao,
}: TreinoDetailControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(() => { void handleSaveAll(); });

  const viewModel = buildTreinoDetailViewModel(treino, treinoExercicios, exercisesById);

  const addedExercicioIds = new Set(treinoExercicios.map((te) => te.exercicioId));
  const notAddedExercises = availableExercises.filter((e) => !addedExercicioIds.has(e.id));

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingNome, setEditingNome] = useState(false);
  const [nomeText, setNomeText] = useState(treino.name);
  const [substitutoPickerFor, setSubstitutoPickerFor] = useState<{ exercicioId: string } | null>(null);
  const [mediaViewerInfo, setMediaViewerInfo] = useState<{ name: string; mediaLocal: string | null; mediaOnline: string | null } | null>(null);

  const recsRef = useRef<Map<string, { series: string; execucoes: string; carga: string; descanso: string }>>(new Map());
  useEffect(() => {
    for (const te of treinoExercicios) {
      if (!recsRef.current.has(te.id)) {
        recsRef.current.set(te.id, {
          series: te.seriesRecomendadas != null ? String(te.seriesRecomendadas) : '',
          execucoes: te.execucoesRecomendadas != null ? String(te.execucoesRecomendadas) : '',
          carga: te.cargaPadrao != null ? String(te.cargaPadrao) : '',
          descanso: te.tempoDescansoSegundos != null ? String(te.tempoDescansoSegundos) : '',
        });
      }
    }
  }, [treinoExercicios]);

  const [isSaving, setIsSaving] = useState(false);

  const performSave = async () => {
    setIsSaving(true);
    for (const te of treinoExercicios) {
      const vals = recsRef.current.get(te.id);
      if (!vals) continue;
      const s = parseInt(vals.series, 10);
      const e = parseInt(vals.execucoes, 10);
      const cv = parseFloat(vals.carga.replace(/,/g, '.'));
      const d = parseInt(vals.descanso, 10);
      await onUpdateRecomendacoes(
        te.id,
        Number.isInteger(s) && s > 0 ? s : null,
        Number.isInteger(e) && e > 0 ? e : null,
        Number.isFinite(cv) && cv > 0 ? cv : null,
        Number.isInteger(d) && d > 0 ? d : null,
      );
    }
    setIsSaving(false);
    onBack();
  };

  const handleSaveAll = async () => {
    if (isSaving) return;
    if (treinoExercicios.length === 0) { onBack(); return; }

    const sessaoAtiva = await getSessaoAtiva();
    if (sessaoAtiva) {
      Alert.alert(
        'Sessao em andamento',
        `Ha uma sessao de "${sessaoAtiva.treinoNomeSnapshot}" em andamento. Salvar o treino agora vai cancelar essa sessao e perder todo o progresso.`,
        [
          { text: 'Continuar sessao', style: 'cancel', onPress: onGoToSessao },
          {
            text: 'Salvar treino e cancelar sessao',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                await cancelarSessao(sessaoAtiva.id);
                await performSave();
              })();
            },
          },
        ]
      );
      return;
    }

    await performSave();
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

  // Sorted exercises for group rendering
  const sorted = [...treinoExercicios].sort((a, b) => a.ordem - b.ordem);

  // Agrupa exercícios adjacentes com o mesmo grupoId
  interface Bloco {
    tipo: 'single' | 'grupo';
    grupoId: string | null;
    exercicios: typeof sorted;
  }

  const blocos: Bloco[] = [];
  for (const te of sorted) {
    if (te.grupoId) {
      const ultimo = blocos[blocos.length - 1];
      if (ultimo?.tipo === 'grupo' && ultimo.grupoId === te.grupoId) {
        ultimo.exercicios.push(te);
      } else {
        blocos.push({ tipo: 'grupo', grupoId: te.grupoId, exercicios: [te] });
      }
    } else {
      blocos.push({ tipo: 'single', grupoId: null, exercicios: [te] });
    }
  }

  // Vincula dois exercícios (ou adiciona ao grupo existente)
  const vincular = async (teId: string, nextId: string, grupoId: string | null) => {
    const gid = grupoId ?? gerarGrupoId();
    // Conta quantos terão o grupoId após o link
    const jaNoGrupo = sorted.filter((x) => x.grupoId === gid).map((x) => x.id);
    const todos = [...new Set([...jaNoGrupo, teId, nextId])];
    for (const id of todos) {
      await onUpdateMetodoGrupo(id, sorted.find((x) => x.id === id)?.metodo ?? 'normal', gid);
    }
  };

  const sairDoGrupo = async (teId: string, grupoId: string) => {
    await onUpdateMetodoGrupo(teId, 'normal', null);
    // Se restar apenas 1 exercício no grupo, dissolve o grupo
    const restantes = sorted.filter((x) => x.grupoId === grupoId && x.id !== teId);
    if (restantes.length === 1) {
      await onUpdateMetodoGrupo(restantes[0].id, restantes[0].metodo, null);
    }
  };

  const desfazerGrupo = async (grupoId: string) => {
    const membros = sorted.filter((x) => x.grupoId === grupoId);
    for (const m of membros) {
      await onUpdateMetodoGrupo(m.id, m.metodo, null);
    }
  };

  return (
    <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={() => { void handleSaveAll(); }}
          disabled={isSaving}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
        >
          <Text style={styles.backButtonText}>{isSaving ? 'Salvando...' : '← Voltar'}</Text>
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
        <ObjetivoInlineField
          value={treino.objetivo ?? ''}
          onChange={(v) => { void onUpdateObjetivo(v || null); }}
          styles={styles}
          placeholderTextColor={c.heroDescription}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Exercicios do treino</Text>

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {feedbackMessage ? <Text style={styles.successMessage}>{feedbackMessage}</Text> : null}

        {viewModel.emptyStateMessage ? (
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        ) : (
          blocos.map((bloco, bi) => {
            if (bloco.tipo === 'single') {
              const te = bloco.exercicios[0];
              const vm = viewModel.exercicios.find((x) => x.treinoExercicioId === te.id)!;
              const teIdx = sorted.findIndex((x) => x.id === te.id);
              const next = teIdx < sorted.length - 1 ? sorted[teIdx + 1] : null;
              // Pode vincular com o próximo se houver próximo (mesmo se o próximo já está num grupo)
              const canVincular = !!next;

              return (
                <ExercicioCardTreino
                  key={te.id}
                  item={{ ...vm, metodo: te.metodo, grupoId: te.grupoId, isFirst: bi === 0, isLast: bi === blocos.length - 1 }}
                  seriesRecomendadas={te.seriesRecomendadas}
                  execucoesRecomendadas={te.execucoesRecomendadas}
                  cargaPadrao={te.cargaPadrao}
                  tempoDescansoSegundos={te.tempoDescansoSegundos}
                  alternativas={alternativasByExercicioId.get(te.exercicioId) ?? []}
                  canVincular={canVincular}
                  onMoveUp={() => { void onMoveUp(te.id); }}
                  onMoveDown={() => { void onMoveDown(te.id); }}
                  onDesvincular={() => { void onRemoveExercicio(te.id); }}
                  onChangeRecs={(series, execucoes, carga, descanso) => {
                    recsRef.current.set(te.id, { series, execucoes, carga, descanso });
                  }}
                  onUpdateMetodo={async (metodo) => {
                    await onUpdateMetodoGrupo(te.id, metodo, te.grupoId);
                  }}
                  onVincular={async () => {
                    if (!next) return;
                    await vincular(te.id, next.id, null);
                  }}
                  onSairDoGrupo={null}
                  onOpenSubstitutoPicker={() => setSubstitutoPickerFor({ exercicioId: te.exercicioId })}
                  onRemoveAlternativa={(altId) => { void onRemoveAlternativa(te.exercicioId, altId); }}
                  onViewMedia={() => setMediaViewerInfo({ name: vm.name, mediaLocal: vm.mediaLocal, mediaOnline: vm.mediaOnline })}
                />
              );
            }

            // Bloco agrupado
            const n = bloco.exercicios.length;
            const color = grupoColor(n);
            const label = grupoLabel(n);
            const lastTeIdx = sorted.findIndex((x) => x.id === bloco.exercicios[n - 1].id);
            const nextAfterGrupo = lastTeIdx < sorted.length - 1 ? sorted[lastTeIdx + 1] : null;
            // Unified series/descanso from first exercise in group
            const firstTe = bloco.exercicios[0];
            const grupoSeriesKey  = `grupo_series_${bloco.grupoId}`;
            const grupoDescansoKey = `grupo_descanso_${bloco.grupoId}`;

            return (
              <View key={bloco.grupoId ?? bi} style={[styles.grupoContainer, { borderColor: color }]}>

                {/* ── Group header: label + block move + desfazer ── */}
                <View style={[styles.grupoHeader, { backgroundColor: color }]}>
                  <Text style={styles.grupoHeaderText}>{label}</Text>
                  <View style={styles.grupoHeaderActions}>
                    <Pressable onPress={() => { void onMoveUp(bloco.exercicios[0].id); }}
                      disabled={bi === 0}
                      style={[styles.grupoArrowBtn, bi === 0 ? { opacity: 0.3 } : null]}>
                      <Text style={styles.grupoArrowText}>↑</Text>
                    </Pressable>
                    <Pressable onPress={() => { void onMoveDown(bloco.exercicios[0].id); }}
                      disabled={bi === blocos.length - 1}
                      style={[styles.grupoArrowBtn, bi === blocos.length - 1 ? { opacity: 0.3 } : null]}>
                      <Text style={styles.grupoArrowText}>↓</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { void desfazerGrupo(bloco.grupoId!); }}
                      style={({ pressed }) => [styles.desfazerBtn, pressed ? { opacity: 0.7 } : null]}>
                      <Text style={styles.desfazerBtnText}>Desfazer</Text>
                    </Pressable>
                  </View>
                </View>

                {/* ── Unified Series + Descanso ── */}
                <View style={styles.grupoRecs}>
                  <View style={styles.grupoRecCell}>
                    <Text style={[styles.grupoRecLabel, { color }]}>Séries (todas)</Text>
                    <TextInput
                      style={[styles.grupoRecInput, { borderColor: color }]}
                      defaultValue={firstTe.seriesRecomendadas != null ? String(firstTe.seriesRecomendadas) : ''}
                      onChangeText={(v) => {
                        recsRef.current.set(grupoSeriesKey, { series: v, execucoes: '', carga: '', descanso: '' });
                        for (const m of bloco.exercicios) {
                          const existing = recsRef.current.get(m.id) ?? { series: '', execucoes: '', carga: '', descanso: '' };
                          recsRef.current.set(m.id, { ...existing, series: v });
                        }
                      }}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor={c.inputPlaceholder}
                    />
                  </View>
                  <View style={styles.grupoRecCell}>
                    <Text style={[styles.grupoRecLabel, { color }]}>Descanso (s)</Text>
                    <TextInput
                      style={[styles.grupoRecInput, { borderColor: color }]}
                      defaultValue={firstTe.tempoDescansoSegundos != null ? String(firstTe.tempoDescansoSegundos) : ''}
                      onChangeText={(v) => {
                        recsRef.current.set(grupoDescansoKey, { series: '', execucoes: '', carga: '', descanso: v });
                        for (const m of bloco.exercicios) {
                          const existing = recsRef.current.get(m.id) ?? { series: '', execucoes: '', carga: '', descanso: '' };
                          recsRef.current.set(m.id, { ...existing, descanso: v });
                        }
                      }}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor={c.inputPlaceholder}
                    />
                  </View>
                </View>

                {/* ── Exercise cards inside group ── */}
                <View style={[styles.grupoBody, { backgroundColor: `${color}12` }]}>
                  {bloco.exercicios.map((te, idx) => {
                    const vm = viewModel.exercicios.find((x) => x.treinoExercicioId === te.id)!;

                    return (
                      <View key={te.id}>
                        {idx > 0 ? (
                          <View style={[styles.grupoDivider, { backgroundColor: color }]} />
                        ) : null}
                        <ExercicioCardTreino
                          item={{ ...vm, metodo: te.metodo, grupoId: te.grupoId, isFirst: bi === 0, isLast: bi === blocos.length - 1 }}
                          seriesRecomendadas={te.seriesRecomendadas}
                          execucoesRecomendadas={te.execucoesRecomendadas}
                          cargaPadrao={te.cargaPadrao}
                          tempoDescansoSegundos={te.tempoDescansoSegundos}
                          alternativas={alternativasByExercicioId.get(te.exercicioId) ?? []}
                          inGroup
                          isFirstInGroup={idx === 0}
                          isLastInGroup={idx === n - 1}
                          canVincular={false}
                          onMoveUp={() => { void onMoveUp(te.id); }}
                          onMoveDown={() => { void onMoveDown(te.id); }}
                          onMoveUpInGroup={() => { void onMoveUpInGroup(te.id); }}
                          onMoveDownInGroup={() => { void onMoveDownInGroup(te.id); }}
                          onDesvincular={() => { void onRemoveExercicio(te.id); }}
                          onChangeRecs={(_series, execucoes, carga, _descanso) => {
                            const existing = recsRef.current.get(te.id) ?? { series: '', execucoes: '', carga: '', descanso: '' };
                            recsRef.current.set(te.id, { ...existing, execucoes, carga });
                          }}
                          onUpdateMetodo={async (metodo) => {
                            await onUpdateMetodoGrupo(te.id, metodo, te.grupoId);
                          }}
                          onVincular={async () => {}}
                          onSairDoGrupo={async () => {
                            await sairDoGrupo(te.id, bloco.grupoId!);
                          }}
                          onOpenSubstitutoPicker={() => setSubstitutoPickerFor({ exercicioId: te.exercicioId })}
                          onRemoveAlternativa={(altId) => { void onRemoveAlternativa(te.exercicioId, altId); }}
                          onViewMedia={() => setMediaViewerInfo({ name: vm.name, mediaLocal: vm.mediaLocal, mediaOnline: vm.mediaOnline })}
                        />
                      </View>
                    );
                  })}

                  {/* "+ Vincular próximo ao grupo" — group-level, shown once after all cards */}
                  {nextAfterGrupo ? (
                    <Pressable
                      onPress={() => { void vincular(bloco.exercicios[n - 1].id, nextAfterGrupo.id, bloco.grupoId); }}
                      style={({ pressed }) => [styles.vincularAoGrupoBtn, { borderColor: color }, pressed ? { opacity: 0.65 } : null]}
                    >
                      <Text style={[styles.vincularAoGrupoBtnText, { color }]}>+ Adicionar próximo ao grupo</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        {treinoExercicios.length > 0 ? (
          <View style={styles.saveRow}>
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
                {isSaving ? 'Salvando...' : 'Salvar treino'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {notAddedExercises.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Adicionar exercicios</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar exercicio ou grupo muscular..."
            placeholderTextColor={c.inputPlaceholder}
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
                onViewMedia={(ex) => setMediaViewerInfo({ name: ex.name, mediaLocal: ex.mediaLocal ?? null, mediaOnline: ex.mediaOnline ?? null })}
              />
            ))
          )}
        </View>
      ) : null}

      {substitutoPickerFor ? (
        <SubstitutosPickerModal
          visible
          excludeExercicioId={substitutoPickerFor.exercicioId}
          currentAlternativaIds={new Set((alternativasByExercicioId.get(substitutoPickerFor.exercicioId) ?? []).map((a) => a.id))}
          allExercises={Array.from(exercisesById.values())}
          onAdd={async (altId) => { await onAddAlternativa(substitutoPickerFor.exercicioId, altId); }}
          onClose={() => setSubstitutoPickerFor(null)}
        />
      ) : null}
    </ScrollView>
    {mediaViewerInfo ? (
      <ExerciseMediaViewer
        visible
        exercicioNome={mediaViewerInfo.name}
        mediaLocal={mediaViewerInfo.mediaLocal}
        mediaOnline={mediaViewerInfo.mediaOnline}
        onClose={() => setMediaViewerInfo(null)}
      />
    ) : null}
    </>
  );
}

const OBJETIVOS = [
  'Hipertrofia', 'Forca', 'Resistencia', 'Emagrecimento',
  'Mobilidade', 'Reabilitacao', 'Condicionamento',
];

interface ObjetivoInlineFieldProps {
  value: string;
  onChange: (value: string) => void;
  styles: ReturnType<typeof makeStyles>;
  placeholderTextColor: string;
}

function ObjetivoInlineField({ value, onChange, styles, placeholderTextColor }: ObjetivoInlineFieldProps) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const isCustom = value !== '' && !OBJETIVOS.includes(value);
  const displayValue = value || null;

  function select(opt: string) {
    onChange(opt);
    setOpen(false);
  }

  function confirmCustom() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setCustomText('');
    setOpen(false);
  }

  function clear() {
    onChange('');
    setOpen(false);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.objetivoTrigger}>
        <Text style={[styles.description, !displayValue ? styles.objetivoPlaceholder : null]}>
          {displayValue ?? 'Definir objetivo...'}
        </Text>
        <Text style={styles.objetivoEditIcon}>✎</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Objetivo do treino</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={clear}
              style={({ pressed }) => [styles.sheetRow, pressed ? { backgroundColor: c.cardAlt } : null]}
            >
              <Text style={[styles.sheetRowText, !value ? styles.sheetRowActive : null]}>Sem objetivo</Text>
              {!value ? <Text style={styles.sheetCheck}>✓</Text> : null}
            </Pressable>
            <View style={styles.sheetDivider} />
            {OBJETIVOS.map((opt) => {
              const active = value === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => select(opt)}
                  style={({ pressed }) => [styles.sheetRow, pressed ? { backgroundColor: c.cardAlt } : null]}
                >
                  <Text style={[styles.sheetRowText, active ? styles.sheetRowActive : null]}>{opt}</Text>
                  {active ? <Text style={styles.sheetCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
            <View style={styles.sheetDivider} />
            <Text style={styles.sheetSectionLabel}>Outro (personalizado)</Text>
            {isCustom ? (
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetRowText, styles.sheetRowActive]}>{value}</Text>
                <Text style={styles.sheetCheck}>✓</Text>
              </View>
            ) : null}
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Digite o objetivo..."
                placeholderTextColor={placeholderTextColor}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={confirmCustom}
                returnKeyType="done"
              />
              <Pressable onPress={confirmCustom} style={styles.addCustomBtn}>
                <Text style={styles.addCustomBtnText}>OK</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 18 },
    header: { flexDirection: 'row', alignItems: 'center' },
    backButton: { paddingVertical: 8, paddingRight: 12 },
    backButtonPressed: { opacity: 0.6 },
    backButtonText: { color: c.accent, fontSize: 15, fontWeight: '700' },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 10 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    nomeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { color: c.heroText, fontSize: 28, fontWeight: '800', flex: 1 },
    editNomeBtn: { padding: 4 },
    editNomeBtnText: { color: c.heroSubtext, fontSize: 20 },
    editNomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editNomeInput: { flex: 1, backgroundColor: c.hero, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: c.heroText, fontSize: 20, fontWeight: '800', borderWidth: 1, borderColor: c.inputBorder },
    saveNomeBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.accent, borderRadius: 10 },
    saveNomeBtnText: { color: c.accentText, fontSize: 13, fontWeight: '700' },
    description: { color: c.heroDescription, fontSize: 15, lineHeight: 22, flex: 1 },
    objetivoTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    objetivoPlaceholder: { opacity: 0.5 },
    objetivoEditIcon: { color: c.heroSubtext, fontSize: 16 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '60%' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.cardBorder, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    sheetTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    sheetRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    sheetRowText: { flex: 1, color: c.textPrimary, fontSize: 15 },
    sheetRowActive: { color: c.accent, fontWeight: '700' },
    sheetCheck: { color: c.accent, fontSize: 16, fontWeight: '800' },
    sheetDivider: { height: 1, backgroundColor: c.cardBorder, marginVertical: 4 },
    sheetSectionLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
    customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
    customInput: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, color: c.inputText, fontSize: 14 },
    addCustomBtn: { height: 42, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.hero, alignItems: 'center', justifyContent: 'center' },
    addCustomBtnText: { color: c.heroText, fontSize: 13, fontWeight: '700' },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    helperText: { color: c.textSecondary, fontSize: 13, lineHeight: 18 },
    emptyState: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    errorMessage: { color: c.error, fontSize: 14, fontWeight: '600' },
    successMessage: { color: c.success, fontSize: 14, fontWeight: '600' },
    searchInput: { height: 44, borderRadius: 14, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 14, color: c.inputText, fontSize: 14 },
    addSelectedBtn: { backgroundColor: c.hero, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
    addSelectedBtnText: { color: c.heroText, fontSize: 14, fontWeight: '700' },
    saveRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    saveTreinoBtn: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent },
    saveTreinoBtnPressed: { opacity: 0.9 },
    saveTreinoBtnDisabled: { opacity: 0.6 },
    saveTreinoBtnText: { color: c.accentText, fontSize: 16, fontWeight: '800' },
    // Group visual blocks
    grupoContainer: { borderRadius: 16, borderWidth: 3, overflow: 'hidden' },
    grupoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
    grupoHeaderText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
    grupoHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    grupoArrowBtn: { width: 26, height: 26, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' },
    grupoArrowText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    desfazerBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.22)' },
    desfazerBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    // Series/Descanso strip — card-coloured background with group-colour accents (set via inline style)
    grupoRecs: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.card },
    grupoRecCell: { flex: 1, gap: 4 },
    grupoRecLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    grupoRecInput: { height: 38, borderRadius: 8, backgroundColor: c.inputBg, textAlign: 'center', color: c.inputText, fontSize: 15, fontWeight: '700', borderWidth: 2 },
    grupoBody: { padding: 8, gap: 0 },
    grupoDivider: { height: 2, opacity: 0.35, marginVertical: 6, marginHorizontal: 4 },
    vincularAoGrupoBtn: { marginTop: 8, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
    vincularAoGrupoBtnText: { fontSize: 12, fontWeight: '700' },
  });
}
