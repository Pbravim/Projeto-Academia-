import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ExportFormato } from '../../../application/dashboard/export/HistoricoExportTypes';
import { useT } from '../i18n';
import { useTheme } from '../theme';

interface Props {
  visible: boolean;
  onSelect: (formato: ExportFormato) => void;
  onClose: () => void;
}

/** Diálogo de escolha de formato (CSV/JSON) para "Exportar histórico". */
export function ExportFormatDialog({ visible, onSelect, onClose }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t('dashboard.exportar.titulo')}</Text>
          <Text style={styles.subtitle}>{t('dashboard.exportar.subtitulo')}</Text>

          <Pressable
            onPress={() => onSelect('csv')}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.exportar.csv')}
            style={({ pressed }) => [styles.option, pressed ? styles.optionPressed : null]}
          >
            <Text style={styles.optionTitle}>{t('dashboard.exportar.csv')}</Text>
            <Text style={styles.optionDescription}>{t('dashboard.exportar.csvDescricao')}</Text>
          </Pressable>

          <Pressable
            onPress={() => onSelect('json')}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.exportar.json')}
            style={({ pressed }) => [styles.option, pressed ? styles.optionPressed : null]}
          >
            <Text style={styles.optionTitle}>{t('dashboard.exportar.json')}</Text>
            <Text style={styles.optionDescription}>{t('dashboard.exportar.jsonDescricao')}</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            style={({ pressed }) => [styles.cancelBtn, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
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
    subtitle: { color: c.textSecondary, fontSize: 14, marginBottom: 4 },
    option: {
      borderRadius: 14,
      padding: 14,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    optionPressed: { opacity: 0.8 },
    optionTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    optionDescription: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    cancelBtn: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    cancelBtnText: { color: c.textSecondary, fontSize: 14, fontWeight: '700' },
  });
}
