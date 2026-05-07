import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../shared/theme';

interface Props {
  item: {
    treinoExercicioId: string;
    name: string;
    groupMuscle: string;
    category: string;
    ordem: number;
    isFirst: boolean;
    isLast: boolean;
  };
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeRecs: (series: string, execucoes: string, carga: string, descanso: string) => void;
}

export function ExercicioCardTreino({
  item,
  seriesRecomendadas,
  execucoesRecomendadas,
  cargaPadrao,
  tempoDescansoSegundos,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangeRecs,
}: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [seriesText, setSeriesText] = useState(seriesRecomendadas != null ? String(seriesRecomendadas) : '');
  const [execucoesText, setExecucoesText] = useState(execucoesRecomendadas != null ? String(execucoesRecomendadas) : '');
  const [cargaText, setCargaText] = useState(cargaPadrao != null ? String(cargaPadrao) : '');
  const [descansoText, setDescansoText] = useState(tempoDescansoSegundos != null ? String(tempoDescansoSegundos) : '');

  return (
    <View style={styles.exercicioCard}>
      <View style={styles.exercicioInfo}>
        <Text style={styles.exercicioOrdem}>{item.ordem}.</Text>
        <View style={styles.exercicioTexts}>
          <Text style={styles.exercicioName}>{item.name}</Text>
          <Text style={styles.exercicioMeta}>{item.category ? `${item.groupMuscle} · ${item.category}` : item.groupMuscle}</Text>
        </View>
      </View>

      <View style={styles.recomendacoesRow}>
        <View style={styles.recomendacaoField}>
          <Text style={styles.recomendacaoLabel}>Series</Text>
          <TextInput
            style={styles.recomendacaoInput}
            value={seriesText}
            onChangeText={(v) => { setSeriesText(v); onChangeRecs(v, execucoesText, cargaText, descansoText); }}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={c.inputPlaceholder}
            returnKeyType="next"
          />
        </View>
        <Text style={styles.recomendacaoSep}>×</Text>
        <View style={styles.recomendacaoField}>
          <Text style={styles.recomendacaoLabel}>Reps</Text>
          <TextInput
            style={styles.recomendacaoInput}
            value={execucoesText}
            onChangeText={(v) => { setExecucoesText(v); onChangeRecs(seriesText, v, cargaText, descansoText); }}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={c.inputPlaceholder}
            returnKeyType="next"
          />
        </View>
        <Text style={styles.recomendacaoSep}>@</Text>
        <View style={styles.recomendacaoField}>
          <Text style={styles.recomendacaoLabel}>Carga kg</Text>
          <TextInput
            style={[styles.recomendacaoInput, styles.recomendacaoInputCarga]}
            value={cargaText}
            onChangeText={(v) => { setCargaText(v); onChangeRecs(seriesText, execucoesText, v, descansoText); }}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={c.inputPlaceholder}
            returnKeyType="next"
          />
        </View>
        <Text style={styles.recomendacaoSep}>·</Text>
        <View style={styles.recomendacaoField}>
          <Text style={styles.recomendacaoLabel}>Desc. (s)</Text>
          <TextInput
            style={styles.recomendacaoInput}
            value={descansoText}
            onChangeText={(v) => { setDescansoText(v); onChangeRecs(seriesText, execucoesText, cargaText, v); }}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={c.inputPlaceholder}
            returnKeyType="done"
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

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    exercicioCard: { borderRadius: 16, padding: 14, backgroundColor: c.cardAlt, gap: 10 },
    exercicioInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    exercicioOrdem: { color: c.accent, fontSize: 16, fontWeight: '800', minWidth: 20 },
    exercicioTexts: { flex: 1 },
    exercicioName: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    exercicioMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    exercicioActions: { flexDirection: 'row', gap: 8 },
    orderButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' },
    orderButtonDisabled: { opacity: 0.3 },
    orderButtonPressed: { opacity: 0.7 },
    orderButtonText: { color: c.textPrimary, fontSize: 16, fontWeight: '700' },
    removeButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: c.errorBg },
    removeButtonPressed: { opacity: 0.75 },
    removeButtonText: { color: c.error, fontSize: 13, fontWeight: '700' },
    recomendacoesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    recomendacaoField: { alignItems: 'center', gap: 3 },
    recomendacaoLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    recomendacaoInput: { width: 52, height: 36, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, textAlign: 'center', color: c.inputText, fontSize: 15, fontWeight: '700' },
    recomendacaoInputCarga: { width: 64 },
    recomendacaoSep: { color: c.textSecondary, fontSize: 16, fontWeight: '700', marginTop: 14 },
  });
}
