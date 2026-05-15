import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MetodoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';
import { useTheme } from '../../shared/theme';

const TECNICAS: { value: Exclude<MetodoExercicio, 'normal'>; label: string; color: string }[] = [
  { value: 'drop_set',   label: 'Drop-set',  color: '#9333ea' },
  { value: 'piramide',   label: 'Pirâmide',  color: '#d97706' },
  { value: 'rest_pause', label: 'Rest-pause', color: '#e11d48' },
];

interface Props {
  item: {
    treinoExercicioId: string;
    name: string;
    groupMuscle: string;
    category: string;
    ordem: number;
    isFirst: boolean;
    isLast: boolean;
    metodo: MetodoExercicio;
    grupoId: string | null;
  };
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  // When true: this card is inside a group — series+descanso are handled at group level
  inGroup?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  canVincular: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveUpInGroup?: () => void;
  onMoveDownInGroup?: () => void;
  onDesvincular: () => void;
  onChangeRecs: (series: string, execucoes: string, carga: string, descanso: string) => void;
  onUpdateMetodo: (metodo: MetodoExercicio) => Promise<void>;
  onVincular: () => Promise<void>;
  onSairDoGrupo: (() => Promise<void>) | null;
}

export function ExercicioCardTreino({
  item,
  seriesRecomendadas,
  execucoesRecomendadas,
  cargaPadrao,
  tempoDescansoSegundos,
  inGroup = false,
  isFirstInGroup = false,
  isLastInGroup = false,
  canVincular,
  onMoveUp,
  onMoveDown,
  onMoveUpInGroup,
  onMoveDownInGroup,
  onDesvincular,
  onChangeRecs,
  onUpdateMetodo,
  onVincular,
  onSairDoGrupo,
}: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [seriesText,   setSeriesText]   = useState(seriesRecomendadas   != null ? String(seriesRecomendadas)   : '');
  const [execText,     setExecText]     = useState(execucoesRecomendadas != null ? String(execucoesRecomendadas) : '');
  const [cargaText,    setCargaText]    = useState(cargaPadrao           != null ? String(cargaPadrao)           : '');
  const [descansoText, setDescansoText] = useState(tempoDescansoSegundos != null ? String(tempoDescansoSegundos) : '');

  const tecnicaAtiva = TECNICAS.find((t) => t.value === item.metodo);
  const isNormal = item.metodo === 'normal';

  function toggleTecnica(value: Exclude<MetodoExercicio, 'normal'>) {
    void onUpdateMetodo(item.metodo === value ? 'normal' : value);
  }

  return (
    <View style={styles.card}>

      {/* ── Nome + ações ── */}
      <View style={styles.row}>
        {/* Within-group reorder arrows (left side) */}
        {inGroup ? (
          <View style={styles.groupArrows}>
            <Pressable onPress={onMoveUpInGroup} disabled={isFirstInGroup}
              style={[styles.groupArrowBtn, isFirstInGroup ? { opacity: 0.2 } : null]}>
              <Text style={styles.groupArrowText}>↑</Text>
            </Pressable>
            <Pressable onPress={onMoveDownInGroup} disabled={isLastInGroup}
              style={[styles.groupArrowBtn, isLastInGroup ? { opacity: 0.2 } : null]}>
              <Text style={styles.groupArrowText}>↓</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.ordem, tecnicaAtiva ? { color: tecnicaAtiva.color } : null]}>
          {item.ordem}
        </Text>

        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.groupMuscle}{item.category ? ` · ${item.category}` : ''}
          </Text>
        </View>

        {/* Block-level reorder (right side, only for standalone exercises) */}
        <View style={styles.actions}>
          {!inGroup ? (
            <>
              <Pressable onPress={onMoveUp} disabled={item.isFirst}
                style={[styles.iconBtn, item.isFirst ? { opacity: 0.2 } : null]}>
                <Text style={styles.iconBtnText}>↑</Text>
              </Pressable>
              <Pressable onPress={onMoveDown} disabled={item.isLast}
                style={[styles.iconBtn, item.isLast ? { opacity: 0.2 } : null]}>
                <Text style={styles.iconBtnText}>↓</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable onPress={onDesvincular}
            style={({ pressed }) => [styles.removeBtn, pressed ? { opacity: 0.5 } : null]}>
            <Text style={styles.removeBtnText}>✕</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Técnica de série (toggle chips) ── */}
      <View style={styles.tecnicaRow}>
        <Pressable
          onPress={() => { void onUpdateMetodo('normal'); }}
          style={[styles.tecnicaChip, isNormal ? styles.tecnicaChipNormal : null]}
        >
          <Text style={[styles.tecnicaText, isNormal ? styles.tecnicaTextNormal : null]} numberOfLines={1} adjustsFontSizeToFit>
            Normal
          </Text>
        </Pressable>
        {TECNICAS.map((t) => {
          const active = item.metodo === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => toggleTecnica(t.value)}
              style={[styles.tecnicaChip, active ? { backgroundColor: t.color, borderColor: t.color } : null]}
            >
              <Text style={[styles.tecnicaText, active ? styles.tecnicaTextActive : null]} numberOfLines={1} adjustsFontSizeToFit>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Recomendações ── */}
      {inGroup ? (
        // Inside a group: only Reps + Carga (Series/Rest are at group level)
        <View style={styles.recsRow}>
          <View style={styles.recCellHalf}>
            <Text style={styles.recLabel}>Reps</Text>
            <TextInput
              style={styles.recInput}
              value={execText}
              onChangeText={(v) => { setExecText(v); onChangeRecs(seriesText, v, cargaText, descansoText); }}
              keyboardType="number-pad" placeholder="—" placeholderTextColor={c.inputPlaceholder}
            />
          </View>
          <View style={styles.recCellHalf}>
            <Text style={styles.recLabel}>Carga (kg)</Text>
            <TextInput
              style={styles.recInput}
              value={cargaText}
              onChangeText={(v) => { setCargaText(v); onChangeRecs(seriesText, execText, v, descansoText); }}
              keyboardType="decimal-pad" placeholder="—" placeholderTextColor={c.inputPlaceholder}
            />
          </View>
        </View>
      ) : (
        // Standalone: full 2×2 grid
        <View style={styles.recsGrid}>
          <View style={styles.recCell}>
            <Text style={styles.recLabel}>Séries</Text>
            <TextInput
              style={styles.recInput}
              value={seriesText}
              onChangeText={(v) => { setSeriesText(v); onChangeRecs(v, execText, cargaText, descansoText); }}
              keyboardType="number-pad" placeholder="—" placeholderTextColor={c.inputPlaceholder}
            />
          </View>
          <View style={styles.recCell}>
            <Text style={styles.recLabel}>Reps</Text>
            <TextInput
              style={styles.recInput}
              value={execText}
              onChangeText={(v) => { setExecText(v); onChangeRecs(seriesText, v, cargaText, descansoText); }}
              keyboardType="number-pad" placeholder="—" placeholderTextColor={c.inputPlaceholder}
            />
          </View>
          <View style={styles.recCell}>
            <Text style={styles.recLabel}>Carga (kg)</Text>
            <TextInput
              style={styles.recInput}
              value={cargaText}
              onChangeText={(v) => { setCargaText(v); onChangeRecs(seriesText, execText, v, descansoText); }}
              keyboardType="decimal-pad" placeholder="—" placeholderTextColor={c.inputPlaceholder}
            />
          </View>
          <View style={styles.recCell}>
            <Text style={styles.recLabel}>Descanso (s)</Text>
            <TextInput
              style={styles.recInput}
              value={descansoText}
              onChangeText={(v) => { setDescansoText(v); onChangeRecs(seriesText, execText, cargaText, v); }}
              keyboardType="number-pad" placeholder="—" placeholderTextColor={c.inputPlaceholder}
            />
          </View>
        </View>
      )}

      {/* ── Footer: sair do grupo / vincular ── */}
      {(onSairDoGrupo || canVincular) ? (
        <View style={styles.footer}>
          {onSairDoGrupo ? (
            <Pressable onPress={onSairDoGrupo}
              style={({ pressed }) => [styles.sairBtn, pressed ? { opacity: 0.65 } : null]}>
              <Text style={styles.sairBtnText}>Sair do grupo</Text>
            </Pressable>
          ) : null}
          {canVincular ? (
            <Pressable onPress={() => { void onVincular(); }}
              style={({ pressed }) => [styles.vincularBtn, pressed ? { opacity: 0.65 } : null]}>
              <Text style={styles.vincularBtnText}>+ Vincular com próximo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: { borderRadius: 12, padding: 12, backgroundColor: c.cardAlt, gap: 10 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    groupArrows: { flexDirection: 'column', gap: 2 },
    groupArrowBtn: { width: 22, height: 22, borderRadius: 5, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    groupArrowText: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    ordem: { color: c.accent, fontSize: 14, fontWeight: '800', minWidth: 16 },
    nameBlock: { flex: 1 },
    name: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    meta: { color: c.textSecondary, fontSize: 11, marginTop: 1 },
    actions: { flexDirection: 'row', gap: 4 },
    iconBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    iconBtnText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
    removeBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: c.errorBg, alignItems: 'center', justifyContent: 'center' },
    removeBtnText: { color: c.error, fontSize: 13, fontWeight: '800' },

    tecnicaRow: { flexDirection: 'row', gap: 5 },
    tecnicaChip: {
      flex: 1, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 6,
      borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card,
      alignItems: 'center',
    },
    tecnicaChipNormal: { backgroundColor: c.accent, borderColor: c.accent },
    tecnicaText: { color: c.textSecondary, fontSize: 10, fontWeight: '600' },
    tecnicaTextActive: { color: '#fff', fontWeight: '800' },
    tecnicaTextNormal: { color: c.accentText, fontWeight: '800' },

    // Full grid (standalone)
    recsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    recCell: { width: '48%', gap: 3 },
    // Half row (in-group: reps + carga only)
    recsRow: { flexDirection: 'row', gap: 8 },
    recCellHalf: { flex: 1, gap: 3 },
    recLabel: { color: c.textSecondary, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    recInput: {
      height: 36, borderRadius: 7,
      borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg,
      textAlign: 'center', color: c.inputText, fontSize: 14, fontWeight: '700',
    },

    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    sairBtn: {
      flex: 1, paddingVertical: 7, borderRadius: 6,
      borderWidth: 1, borderColor: c.error, backgroundColor: c.errorBg,
      alignItems: 'center',
    },
    sairBtnText: { color: c.error, fontSize: 12, fontWeight: '700' },
    vincularBtn: {
      flex: 1, paddingVertical: 7, borderRadius: 6,
      borderWidth: 1, borderColor: c.accent, backgroundColor: 'transparent',
      alignItems: 'center',
    },
    vincularBtnText: { color: c.accent, fontSize: 12, fontWeight: '700' },
  });
}
