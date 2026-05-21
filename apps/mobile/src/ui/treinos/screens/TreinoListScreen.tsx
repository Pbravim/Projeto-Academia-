import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { TreinoListControllerState } from '../hooks/useTreinoListController';
import type { PlanoControllerState } from '../hooks/usePlanoController';
import { PlanoSemanalCard } from '../components/PlanoSemanalCard';
import { PlanoPickerModal } from '../components/PlanoPickerModal';
import { buildTreinoListViewModel } from '../presenters/buildTreinoListViewModel';
import { useTheme } from '../../shared/theme';

interface TreinoListScreenProps extends TreinoListControllerState {
  plano: PlanoControllerState;
}

export function TreinoListScreen({
  draft,
  treinos,
  treinosVazios,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  deletingId,
  duplicandoId,
  onChangeField,
  onSubmit,
  onDelete,
  onDuplicate,
  onSelectTreino,
  plano,
}: TreinoListScreenProps) {
  const canSubmit = draft.name.trim().length > 0 && !isSubmitting;
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const viewModel = buildTreinoListViewModel(treinos);

  return (
    <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PlanoSemanalCard
        plano={plano.plano}
        treinos={treinos}
        isLoading={plano.isLoading}
        onSelectDia={plano.onSelectDia}
      />
      {plano.errorMessage ? (
        <Text style={styles.errorMessage}>{plano.errorMessage}</Text>
      ) : null}

      {treinos.length === 0 && !isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Nenhum treino ainda</Text>
          <Text style={styles.emptyStateBody}>
            Crie seu primeiro treino para comecar a registrar sessoes.
          </Text>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Modulo de treinos</Text>
        <Text style={styles.title}>Meus treinos</Text>
        <Text style={styles.description}>
          Monte seus treinos A, B, C com os exercicios do catalogo. Cada treino
          vira uma sessao.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Novo treino</Text>

        <Field
          label="Nome"
          placeholder="Ex.: Treino A"
          value={draft.name}
          onChangeText={(v) => onChangeField('name', v)}
          onSubmitEditing={() => {
            if (canSubmit) void onSubmit();
          }}
          editable={!isSubmitting}
          required
          styles={styles}
          placeholderTextColor={c.inputPlaceholder}
        />

        <ObjetivoPicker
          value={draft.objetivo}
          onChange={(v) => onChangeField('objetivo', v)}
          editable={!isSubmitting}
          styles={styles}
          placeholderTextColor={c.inputPlaceholder}
        />

        {errorMessage ? (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        ) : null}
        {feedbackMessage ? (
          <Text style={styles.successMessage}>{feedbackMessage}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void onSubmit();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            !canSubmit ? styles.primaryButtonDisabled : null,
          ]}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Criando...' : 'Criar treino'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Treinos criados</Text>

        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={c.accent}
            style={styles.loading}
          />
        ) : viewModel.emptyStateMessage ? (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyStateIcon}>↑</Text>
            <Text style={styles.emptyStateTitle}>Crie seu primeiro treino</Text>
            <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
          </View>
        ) : (
          viewModel.cards.map((card) => (
            <Pressable
              key={card.id}
              onPress={() =>
                onSelectTreino(treinos.find((t) => t.id === card.id)!)
              }
              style={({ pressed }) => [
                styles.treinoCard,
                pressed ? styles.treinoCardPressed : null,
              ]}
            >
              <View style={styles.treinoCardContent}>
                <View>
                  <Text style={styles.treinoTitle}>{card.title}</Text>
                  <Text style={styles.treinoSubtitle}>{card.subtitle}</Text>
                </View>
                <Text style={styles.treinoArrow}>›</Text>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void onDuplicate(card.id);
                  }}
                  disabled={duplicandoId !== null || deletingId !== null}
                  style={({ pressed }) => [
                    styles.duplicateButton,
                    pressed ? styles.duplicateButtonPressed : null,
                    duplicandoId === card.id
                      ? styles.duplicateButtonLoading
                      : null,
                  ]}
                >
                  <Text style={styles.duplicateButtonText}>
                    {duplicandoId === card.id ? 'Duplicando...' : 'Duplicar'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void onDelete(card.id);
                  }}
                  disabled={deletingId !== null || duplicandoId !== null}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed ? styles.deleteButtonPressed : null,
                    deletingId === card.id ? styles.deleteButtonLoading : null,
                  ]}
                >
                  <Text style={styles.deleteButtonText}>
                    {deletingId === card.id ? 'Excluindo...' : 'Excluir'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>

    <PlanoPickerModal
      dia={plano.diaSelecionado}
      treinos={treinos}
      treinosVazios={treinosVazios}
      treinoAtualId={plano.diaSelecionado ? plano.plano[plano.diaSelecionado] : null}
      onSelect={plano.onSetTreino}
      onClose={plano.onClosePicker}
    />
    </>
  );
}

const OBJETIVOS = [
  'Hipertrofia',
  'Forca',
  'Resistencia',
  'Emagrecimento',
  'Mobilidade',
  'Reabilitacao',
  'Condicionamento',
];

interface ObjetivoPickerProps {
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
  styles: ReturnType<typeof makeStyles>;
  placeholderTextColor: string;
}

function ObjetivoPicker({
  value,
  onChange,
  editable,
  styles,
  placeholderTextColor,
}: ObjetivoPickerProps) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const isCustom =
    value !== '' && value !== '__outro__' && !OBJETIVOS.includes(value);
  const displayValue = value === '__outro__' || value === '' ? null : value;

  function select(opt: string) {
    if (!editable) return;
    onChange(opt);
    setOpen(false);
  }

  function confirmCustom() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setCustomText('');
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        Objetivo{' '}
        <Text style={{ color: c.textSecondary, fontWeight: '400' }}>
          (opcional)
        </Text>
      </Text>
      <Pressable
        onPress={() => editable && setOpen(true)}
        style={[styles.selectTrigger, !editable ? { opacity: 0.6 } : null]}
      >
        <Text
          style={[
            styles.selectValue,
            !displayValue ? styles.selectPlaceholder : null,
          ]}
        >
          {displayValue ?? 'Selecionar objetivo'}
        </Text>
        <Text style={styles.selectChevron}>▼</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Objetivo</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {OBJETIVOS.map((opt) => {
              const active = value === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => select(opt)}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    pressed ? { backgroundColor: c.cardAlt } : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetRowText,
                      active ? styles.sheetRowActive : null,
                    ]}
                  >
                    {opt}
                  </Text>
                  {active ? <Text style={styles.sheetCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
            <View style={styles.sheetDivider} />
            <Text style={styles.sheetSectionLabel}>Outro (personalizado)</Text>
            {isCustom ? (
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetRowText, styles.sheetRowActive]}>
                  {value}
                </Text>
                <Text style={styles.sheetCheck}>✓</Text>
              </View>
            ) : null}
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Digite o objetivo..."
                placeholderTextColor={placeholderTextColor}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={confirmCustom}
                returnKeyType="done"
              />
              <Pressable onPress={confirmCustom} style={styles.addCustomBtn}>
                <Text style={styles.addCustomBtnText}>OK</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  editable: boolean;
  required?: boolean;
  styles: ReturnType<typeof makeStyles>;
  placeholderTextColor: string;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  onSubmitEditing,
  editable,
  required,
  styles,
  placeholderTextColor,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.requiredMark}> *</Text> : null}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={onSubmitEditing ? 'done' : 'default'}
        editable={editable}
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
      gap: 18,
    },
    heroCard: {
      backgroundColor: c.hero,
      borderRadius: 24,
      padding: 22,
      gap: 10,
    },
    eyebrow: {
      color: c.heroSubtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: { color: c.heroText, fontSize: 30, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 15, lineHeight: 22 },
    formCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    listCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    field: { gap: 6 },
    fieldLabel: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    requiredMark: { color: c.error, fontSize: 13, fontWeight: '700' },
    input: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 14,
      color: c.inputText,
      fontSize: 15,
    },
    selectTrigger: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectValue: { flex: 1, color: c.inputText, fontSize: 15 },
    selectPlaceholder: { color: c.inputPlaceholder },
    selectChevron: { color: c.textSecondary, fontSize: 12, marginLeft: 8 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 32,
      maxHeight: '60%',
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.cardBorder,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    sheetTitle: {
      color: c.textPrimary,
      fontSize: 17,
      fontWeight: '800',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    sheetRowText: { flex: 1, color: c.textPrimary, fontSize: 15 },
    sheetRowActive: { color: c.accent, fontWeight: '700' },
    sheetCheck: { color: c.accent, fontSize: 16, fontWeight: '800' },
    sheetDivider: {
      height: 1,
      backgroundColor: c.cardBorder,
      marginVertical: 4,
    },
    sheetSectionLabel: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 6,
    },
    customInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    customInput: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 12,
      color: c.inputText,
      fontSize: 14,
    },
    addCustomBtn: {
      height: 42,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.hero,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addCustomBtnText: { color: c.heroText, fontSize: 13, fontWeight: '700' },
    errorMessage: { color: c.error, fontSize: 14, fontWeight: '600' },
    successMessage: { color: c.success, fontSize: 14, fontWeight: '600' },
    primaryButton: {
      minHeight: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
    },
    primaryButtonPressed: { opacity: 0.9 },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    loading: { marginVertical: 12 },
    emptyState: { backgroundColor: c.card, borderRadius: 16, padding: 20, gap: 8, alignItems: 'center' },
    emptyStateTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    emptyStateBody: { color: c.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
    emptyStateBox: { alignItems: 'center', paddingVertical: 16, gap: 6 },
    emptyStateIcon: { color: c.accent, fontSize: 28, fontWeight: '800' },
    treinoCard: {
      borderRadius: 18,
      padding: 16,
      backgroundColor: c.cardAlt,
      gap: 10,
    },
    treinoCardPressed: { opacity: 0.8 },
    treinoCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    treinoTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    treinoSubtitle: {
      color: c.textLabel,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 2,
    },
    treinoArrow: { color: c.textLabel, fontSize: 22, fontWeight: '700' },
    cardActions: { flexDirection: 'row', gap: 8 },
    duplicateButton: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    duplicateButtonPressed: { opacity: 0.75 },
    duplicateButtonLoading: { opacity: 0.5 },
    duplicateButtonText: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    deleteButton: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: c.errorBg,
    },
    deleteButtonPressed: { opacity: 0.75 },
    deleteButtonLoading: { opacity: 0.5 },
    deleteButtonText: { color: c.error, fontSize: 13, fontWeight: '700' },
  });
}
