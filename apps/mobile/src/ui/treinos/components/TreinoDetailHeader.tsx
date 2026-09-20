import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';

import { ExportarTreinoButton } from './ExportarTreinoButton';
import { ObjetivoInlineField } from './ObjetivoInlineField';

export interface TreinoDetailHeaderProps {
  nome: string;
  objetivo: string;
  isSaving: boolean;
  isExporting: boolean;
  onSaveAll: () => void;
  onUpdateNome: (novoNome: string) => Promise<void>;
  onUpdateObjetivo: (novoObjetivo: string | null) => Promise<void>;
  onExportar: () => void;
}

export function TreinoDetailHeader({
  nome,
  objetivo,
  isSaving,
  isExporting,
  onSaveAll,
  onUpdateNome,
  onUpdateObjetivo,
  onExportar,
}: TreinoDetailHeaderProps) {
  const c = useTheme();
  const t = useT();
  const styles = makeStyles(c);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeText, setNomeText] = useState(nome);

  const handleSaveNome = async () => {
    const trimmed = nomeText.trim();
    if (trimmed && trimmed !== nome) {
      await onUpdateNome(trimmed);
    }
    setEditingNome(false);
  };

  const backLabel = isSaving ? t('treinos.detail.salvando') : t('common.backArrow');

  return (
    <>
      <View style={styles.header}>
        <Pressable
          onPress={onSaveAll}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
        >
          <Text style={styles.backButtonText}>{backLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroCardHeader}>
          <Text style={styles.eyebrow}>{t('treinos.detail.eyebrow')}</Text>
          <ExportarTreinoButton isExporting={isExporting} onPress={onExportar} />
        </View>
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
            <Pressable
              onPress={() => { void handleSaveNome(); }}
              accessibilityRole="button"
              accessibilityLabel={t('common.save')}
              style={styles.saveNomeBtn}
            >
              <Text style={styles.saveNomeBtnText}>{t('common.save')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.nomeRow}>
            <Text style={styles.title}>{nome}</Text>
            <Pressable
              onPress={() => { setNomeText(nome); setEditingNome(true); }}
              accessibilityRole="button"
              accessibilityLabel="✎"
              style={styles.editNomeBtn}
            >
              <Text style={styles.editNomeBtnText}>✎</Text>
            </Pressable>
          </View>
        )}
        <ObjetivoInlineField
          value={objetivo}
          onChange={(v) => { void onUpdateObjetivo(v || null); }}
        />
      </View>
    </>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center' },
    backButton: { paddingVertical: 8, paddingRight: 12 },
    backButtonPressed: { opacity: 0.6 },
    backButtonText: { color: c.accentInk, fontSize: 15, fontWeight: '700' },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 10 },
    heroCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    nomeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { color: c.heroText, fontSize: 28, fontWeight: '800', flex: 1 },
    editNomeBtn: { padding: 4 },
    editNomeBtnText: { color: c.heroSubtext, fontSize: 20 },
    editNomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editNomeInput: { flex: 1, backgroundColor: c.hero, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: c.heroText, fontSize: 20, fontWeight: '800', borderWidth: 1, borderColor: c.inputBorder },
    saveNomeBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.accent, borderRadius: 10 },
    saveNomeBtnText: { color: c.accentText, fontSize: 13, fontWeight: '700' },
  });
}
