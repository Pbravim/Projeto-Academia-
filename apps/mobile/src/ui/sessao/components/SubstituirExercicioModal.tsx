import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CandidatoSubstituto } from '../../../application/sessoes/use-cases/SugerirSubstitutosUseCase';
import type { SubstituicaoMotivo } from '../../../domain/sessoes/entities/SessaoExercicio';
import { useTheme } from '../../shared/theme';

interface Props {
  visible: boolean;
  candidatos: CandidatoSubstituto[];
  onConfirmar: (novoExercicioId: string, motivo: SubstituicaoMotivo | null) => void;
  onFechar: () => void;
}

export function SubstituirExercicioModal({ visible, candidatos, onConfirmar, onFechar }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [selecionado, setSelecionado] = useState<string | null>(null);

  const predefinidos = candidatos.filter((c) => c.predefinido);
  const camada1 = candidatos.filter((c) => !c.predefinido && !c.enfaseDiferente);
  const camada2 = candidatos.filter((c) => !c.predefinido && c.enfaseDiferente);

  const handleSelecionado = (id: string) => setSelecionado((prev) => (prev === id ? null : id));

  const confirmar = (motivo: SubstituicaoMotivo | null) => {
    if (!selecionado) return;
    onConfirmar(selecionado, motivo);
    setSelecionado(null);
  };

  const fechar = () => {
    setSelecionado(null);
    onFechar();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={fechar}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Substituir exercicio</Text>
            <Pressable onPress={fechar} style={({ pressed }) => [styles.closeBtn, pressed ? { opacity: 0.6 } : null]}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {predefinidos.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, styles.sectionLabelPredefinido]}>⭐ Substitutos predefinidos</Text>
                {predefinidos.map((cand) => (
                  <CandidatoRow
                    key={cand.exercicio.id}
                    candidato={cand}
                    selected={selecionado === cand.exercicio.id}
                    onPress={() => handleSelecionado(cand.exercicio.id)}
                    styles={styles}
                    theme={c}
                  />
                ))}
              </>
            ) : null}

            {camada1.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Mesmo músculo</Text>
                {camada1.map((cand) => (
                  <CandidatoRow
                    key={cand.exercicio.id}
                    candidato={cand}
                    selected={selecionado === cand.exercicio.id}
                    onPress={() => handleSelecionado(cand.exercicio.id)}
                    styles={styles}
                    theme={c}
                  />
                ))}
              </>
            ) : null}

            {camada2.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Mesmo grupo muscular</Text>
                {camada2.map((cand) => (
                  <CandidatoRow
                    key={cand.exercicio.id}
                    candidato={cand}
                    selected={selecionado === cand.exercicio.id}
                    onPress={() => handleSelecionado(cand.exercicio.id)}
                    styles={styles}
                    theme={c}
                  />
                ))}
              </>
            ) : null}

            {candidatos.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum substituto encontrado para este exercicio.</Text>
            ) : null}
          </ScrollView>

          {selecionado ? (
            <View style={styles.motivoSection}>
              <Text style={styles.motivoLabel}>Motivo da substituição</Text>
              <View style={styles.motivoRow}>
                <Pressable
                  onPress={() => confirmar('equipamento_indisponivel')}
                  style={({ pressed }) => [styles.motivoBtn, pressed ? { opacity: 0.8 } : null]}
                >
                  <Text style={styles.motivoBtnText}>Equipamento ocupado</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmar('variacao')}
                  style={({ pressed }) => [styles.motivoBtn, pressed ? { opacity: 0.8 } : null]}
                >
                  <Text style={styles.motivoBtnText}>Variar estímulo</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => confirmar(null)}
                style={({ pressed }) => [styles.confirmarBtn, pressed ? { opacity: 0.85 } : null]}
              >
                <Text style={styles.confirmarBtnText}>Substituir</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function CandidatoRow({
  candidato,
  selected,
  onPress,
  styles,
  theme,
}: {
  candidato: CandidatoSubstituto;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  theme: ReturnType<typeof useTheme>;
}) {
  const ex = candidato.exercicio;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.candidatoRow, selected ? styles.candidatoRowSelected : null, pressed ? { opacity: 0.8 } : null]}
    >
      <View style={styles.candidatoInfo}>
        <Text style={[styles.candidatoNome, selected ? styles.candidatoNomeSelected : null]} numberOfLines={1}>
          {ex.name}
        </Text>
        <Text style={styles.candidatoMeta}>
          {ex.groupMuscle}{ex.equipment ? ` · ${ex.equipment}` : ''}
          {candidato.enfaseDiferente ? '  ⚠ Ênfase diferente' : ''}
        </Text>
        {candidato.ultimaExecucao ? (
          <Text style={styles.candidatoUltimo}>
            Último: {candidato.ultimaExecucao.cargaKg}kg × {candidato.ultimaExecucao.repeticoes}
          </Text>
        ) : null}
      </View>
      {selected ? <Text style={styles.checkmark}>✓</Text> : null}
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 32 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    title: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
    closeBtn: { padding: 6 },
    closeBtnText: { color: c.textSecondary, fontSize: 18 },
    list: { padding: 16, gap: 8 },
    sectionLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 4 },
    sectionLabelPredefinido: { color: c.accent },
    candidatoRow: { backgroundColor: c.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: c.cardBorder },
    candidatoRowSelected: { borderColor: c.accent, backgroundColor: c.accentLight },
    candidatoInfo: { flex: 1, gap: 3 },
    candidatoNome: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    candidatoNomeSelected: { color: c.accent },
    candidatoMeta: { color: c.textSecondary, fontSize: 12 },
    candidatoUltimo: { color: c.accent, fontSize: 12, fontWeight: '600' },
    checkmark: { color: c.accent, fontSize: 18, fontWeight: '800', marginLeft: 8 },
    emptyText: { color: c.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
    motivoSection: { borderTopWidth: 1, borderTopColor: c.cardBorder, padding: 16, gap: 10 },
    motivoLabel: { color: c.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    motivoRow: { flexDirection: 'row', gap: 8 },
    motivoBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.cardBorder },
    motivoBtnText: { color: c.textPrimary, fontSize: 13, fontWeight: '600' },
    confirmarBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    confirmarBtnText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
  });
}
