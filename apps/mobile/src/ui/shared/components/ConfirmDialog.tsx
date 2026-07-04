import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { useT } from '../i18n';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Oculta o botão de cancelar — vira um aviso com um único botão (estilo "OK"). */
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmação com o visual do app, no lugar do Alert nativo. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  hideCancel = false,
  onConfirm,
  onCancel,
}: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  const resolvedCancelLabel = cancelLabel ?? t('common.back');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            {!hideCancel ? (
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [styles.cancelBtn, pressed ? { opacity: 0.7 } : null]}
              >
                <Text style={styles.cancelBtnText}>{resolvedCancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                destructive ? styles.confirmBtnDestructive : null,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <Text style={[styles.confirmBtnText, destructive ? styles.confirmBtnTextDestructive : null]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 22,
      gap: 10,
    },
    title: { color: c.textPrimary, fontSize: 18, fontWeight: '800' },
    message: { color: c.textSecondary, fontSize: 14, lineHeight: 21 },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    cancelBtn: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    cancelBtnText: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    confirmBtn: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: c.accent,
    },
    confirmBtnDestructive: { backgroundColor: c.error },
    confirmBtnText: { color: c.accentText, fontSize: 14, fontWeight: '800' },
    confirmBtnTextDestructive: { color: '#ffffff' },
  });
}
