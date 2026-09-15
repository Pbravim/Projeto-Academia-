import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';
import { EscolherExercicioModal } from '../components/EscolherExercicioModal';
import type { ImportarTreinoControllerState } from '../hooks/useImportarTreinoController';

interface Props extends ImportarTreinoControllerState {
  onCancelar: () => void;
}

export function ImportarTreinoScreen({
  texto,
  etapa,
  itens,
  catalogo,
  errorMessage,
  isAnalisando,
  isSalvando,
  podeSalvar,
  onChangeTexto,
  escolherArquivo,
  analisar,
  resolverItem,
  criarCustom,
  salvar,
  onCancelar,
}: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onCancelar} accessibilityRole="button" style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]}>
          <Text style={styles.backBtnText}>{t('common.backArrow')}</Text>
        </Pressable>
        <Text style={styles.title}>{etapa === 'entrada' ? t('treinos.importar.titulo') : t('treinos.importar.revisaoTitulo')}</Text>
      </View>

      {etapa === 'entrada' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>{t('treinos.importar.colarLabel')}</Text>
          <TextInput
            style={styles.textarea}
            placeholder={t('treinos.importar.colarPlaceholder')}
            placeholderTextColor={c.inputPlaceholder}
            value={texto}
            onChangeText={onChangeTexto}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            accessibilityLabel={t('treinos.importar.colarLabel')}
          />

          <Pressable
            onPress={() => { void escolherArquivo(); }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryButton, pressed ? { opacity: 0.85 } : null]}
          >
            <Text style={styles.secondaryButtonText}>{t('treinos.importar.escolherArquivo')}</Text>
          </Pressable>

          {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

          <Pressable
            onPress={() => { void analisar(); }}
            disabled={isAnalisando}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              isAnalisando ? styles.primaryButtonDisabled : null,
              pressed && !isAnalisando ? { opacity: 0.9 } : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isAnalisando ? t('treinos.importar.analisando') : t('treinos.importar.analisar')}
            </Text>
          </Pressable>
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

            {itens.map((it, index) => {
              const resolvido = it.exercicioId !== null;
              return (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNome}>{it.item.nome}</Text>
                  <View style={[styles.badge, resolvido ? styles.badgeCasado : styles.badgeNaoCasado]}>
                    <Text style={[styles.badgeText, resolvido ? styles.badgeTextCasado : styles.badgeTextNaoCasado]}>
                      {resolvido ? t('treinos.importar.casado') : t('treinos.importar.naoCasado')}
                    </Text>
                  </View>
                </View>

                {it.exercicioId ? (
                  <Text style={styles.itemResolvido}>
                    {catalogo.find((e) => e.id === it.exercicioId)?.name ?? it.exercicioId}
                  </Text>
                ) : null}

                <Pressable
                  onPress={() => setPickerFor(index)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.itemActionBtn, pressed ? { opacity: 0.85 } : null]}
                >
                  <Text style={styles.itemActionBtnText}>
                    {resolvido ? t('treinos.importar.trocar') : t('treinos.importar.escolherNoCatalogo')}
                  </Text>
                </Pressable>
              </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => { void salvar(); }}
              disabled={!podeSalvar || isSalvando}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                !podeSalvar || isSalvando ? styles.primaryButtonDisabled : null,
                pressed && podeSalvar && !isSalvando ? { opacity: 0.9 } : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isSalvando ? t('treinos.importar.salvando') : t('treinos.importar.salvar')}
              </Text>
            </Pressable>
          </View>

          <EscolherExercicioModal
            visible={pickerFor !== null}
            nomeSugerido={pickerFor !== null ? itens[pickerFor]!.item.nome : ''}
            candidatos={pickerFor !== null ? itens[pickerFor]!.candidatos : []}
            catalogo={catalogo}
            onSelect={(exercicioId) => {
              if (pickerFor === null) return;
              resolverItem(pickerFor, exercicioId);
              setPickerFor(null);
            }}
            onCriarCustom={(input) => {
              if (pickerFor === null) return;
              void criarCustom(pickerFor, input);
              setPickerFor(null);
            }}
            onClose={() => setPickerFor(null)}
          />
        </>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    backBtn: { paddingVertical: 4 },
    backBtnText: { color: c.accent, fontSize: 15, fontWeight: '700' },
    title: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
    content: { padding: 20, gap: 14 },
    label: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    textarea: {
      minHeight: 160,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.inputText,
      fontSize: 14,
    },
    secondaryButton: {
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: { color: c.textSecondary, fontSize: 14, fontWeight: '700' },
    errorMessage: { color: c.error, fontSize: 14, fontWeight: '600' },
    primaryButton: {
      minHeight: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    itemCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    itemNome: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '700' },
    badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    badgeCasado: { backgroundColor: c.successBg },
    badgeNaoCasado: { backgroundColor: c.warningBg },
    badgeText: { fontSize: 12, fontWeight: '700' },
    badgeTextCasado: { color: c.success },
    badgeTextNaoCasado: { color: c.warning },
    itemResolvido: { color: c.textSecondary, fontSize: 13 },
    itemActionBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    itemActionBtnText: { color: c.accent, fontSize: 13, fontWeight: '700' },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
  });
}
