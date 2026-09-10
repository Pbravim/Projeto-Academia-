import { useEffect,useMemo, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type AppLocale,useT } from '../i18n';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import { useTheme } from '../theme';

interface Props {
  visible: boolean;
  activeLocale: AppLocale;
  onSelect: (locale: AppLocale) => void;
  onClose: () => void;
}

export function LanguagePickerModal({ visible, activeLocale, onSelect, onClose }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
    // translateY vem de useRef(...).current: identidade estável por toda a vida
    // do componente, então incluí-lo não muda quando o efeito roda.
  }, [visible, translateY]);

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

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <Pressable style={styles.dragArea} onPress={onClose} {...panResponder.panHandlers}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t('perfil.config.idioma')}</Text>
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = lang.code === activeLocale;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => onSelect(lang.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={lang.endonym}
                  style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
                >
                  <Text style={styles.rowFlag}>{lang.flag}</Text>
                  <Text style={[styles.rowText, active ? styles.rowTextActive : null]}>
                    {lang.endonym}
                  </Text>
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
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder, gap: 12 },
    rowPressed: { backgroundColor: c.cardAlt },
    rowFlag: { fontSize: 20 },
    rowText: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '600' },
    rowTextActive: { color: c.accent, fontWeight: '800' },
    check: { color: c.accent, fontSize: 17, fontWeight: '800' },
  });
}
