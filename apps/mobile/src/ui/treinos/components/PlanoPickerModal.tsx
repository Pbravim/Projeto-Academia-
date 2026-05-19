import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { DiaSemana } from '../../../domain/plano/entities/DiaSemana';
import { DIA_LABEL } from '../../../domain/plano/entities/DiaSemana';
import { useTheme } from '../../shared/theme';

interface Props {
  dia: DiaSemana | null;
  treinos: TreinoPrimitives[];
  treinoAtualId: string | null;
  onSelect: (treinoId: string | null) => Promise<void>;
  onClose: () => void;
}

export function PlanoPickerModal({ dia, treinos, treinoAtualId, onSelect, onClose }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (!dia) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{DIA_LABEL[dia]}</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            <Pressable
              onPress={() => { void onSelect(null); }}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            >
              <Text style={[styles.rowText, treinoAtualId === null ? styles.rowTextActive : null]}>
                Descanso
              </Text>
              {treinoAtualId === null ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>

            {treinos.map((t) => {
              const active = treinoAtualId === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => { void onSelect(t.id); }}
                  style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
                >
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowText, active ? styles.rowTextActive : null]} numberOfLines={1}>
                      {t.name}
                    </Text>
                    {t.objetivo ? (
                      <Text style={styles.rowMeta} numberOfLines={1}>{t.objetivo}</Text>
                    ) : null}
                  </View>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 32 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.cardBorder, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    title: { color: c.textPrimary, fontSize: 17, fontWeight: '800', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    list: { paddingVertical: 8 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    rowPressed: { backgroundColor: c.cardAlt },
    rowInfo: { flex: 1 },
    rowText: { color: c.textPrimary, fontSize: 15, fontWeight: '600' },
    rowTextActive: { color: c.accent, fontWeight: '800' },
    rowMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    check: { color: c.accent, fontSize: 17, fontWeight: '800', marginLeft: 12 },
  });
}
