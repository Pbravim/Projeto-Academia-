import { useMemo, useRef, useEffect } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { DiaSemana } from '../../../domain/plano/entities/DiaSemana';
import { useTheme } from '../../shared/theme';
import { useT } from '../../shared/i18n';

interface Props {
  dia: DiaSemana | null;
  treinos: TreinoPrimitives[];
  treinosVazios: Set<string>;
  treinoAtualId: string | null;
  onSelect: (treinoId: string | null) => Promise<void>;
  onClose: () => void;
}

export function PlanoPickerModal({ dia, treinos, treinosVazios, treinoAtualId, onSelect, onClose }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (dia) translateY.setValue(0);
  }, [dia]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100) {
          Animated.timing(translateY, { toValue: 600, duration: 200, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            onCloseRef.current();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!dia) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <Pressable style={styles.dragArea} onPress={onClose} {...panResponder.panHandlers}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t(`treinos.plano.dia.${dia}`)}</Text>
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            <Pressable
              onPress={() => { void onSelect(null); }}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            >
              <Text style={[styles.rowText, treinoAtualId === null ? styles.rowTextActive : null]}>
                {t('treinos.plano.descanso')}
              </Text>
              {treinoAtualId === null ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>

            {treinos.map((treino) => {
              const active = treinoAtualId === treino.id;
              const vazio = treinosVazios.has(treino.id);
              return (
                <Pressable
                  key={treino.id}
                  onPress={() => { if (!vazio) void onSelect(treino.id); }}
                  style={({ pressed }) => [styles.row, !vazio && pressed ? styles.rowPressed : null, vazio ? styles.rowDisabled : null]}
                >
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowText, active ? styles.rowTextActive : null, vazio ? styles.rowTextDisabled : null]} numberOfLines={1}>
                      {treino.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {vazio ? t('treinos.plano.adicioneExerciciosPrimeiro') : (treino.objetivo ?? '')}
                    </Text>
                  </View>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    backdrop: { flex: 1 },
    sheet: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 32 },
    dragArea: { paddingBottom: 4 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.cardBorder, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    title: { color: c.textPrimary, fontSize: 17, fontWeight: '800', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    list: { paddingVertical: 8 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    rowPressed: { backgroundColor: c.cardAlt },
    rowInfo: { flex: 1 },
    rowText: { color: c.textPrimary, fontSize: 15, fontWeight: '600' },
    rowTextActive: { color: c.accent, fontWeight: '800' },
    rowMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    rowDisabled: { opacity: 0.45 },
    rowTextDisabled: { color: c.textSecondary },
    check: { color: c.accent, fontSize: 17, fontWeight: '800', marginLeft: 12 },
  });
}
