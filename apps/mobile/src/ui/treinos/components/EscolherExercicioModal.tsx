import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { type ExerciseQueryFields, matchesExerciseQuery } from '../../../domain/exercises/matchesExerciseQuery';
import { ChipPicker, Field, MultiChipPicker } from '../../exercises/components/ExerciseFormFields';
import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';

interface Props {
  visible: boolean;
  nomeSugerido: string;
  candidatos: ExercisePrimitives[];
  catalogo: ExercisePrimitives[];
  onSelect: (exercicioId: string) => void;
  onCriarCustom: (input: { nome: string; groupMuscles: string[]; category: string }) => void;
  onClose: () => void;
}

function toQueryFields(exercise: ExercisePrimitives): ExerciseQueryFields {
  return {
    name: exercise.name,
    nameVariations: exercise.nameVariations,
    groupMuscles: exercise.groupMuscles,
    equipment: exercise.equipment,
    primaryEquipment: exercise.primaryEquipment,
    secondaryEquipment: exercise.secondaryEquipment,
  };
}

export function EscolherExercicioModal({
  visible,
  nomeSugerido,
  candidatos,
  catalogo,
  onSelect,
  onCriarCustom,
  onClose,
}: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [tab, setTab] = useState<'buscar' | 'custom'>('buscar');
  const [search, setSearch] = useState('');
  const [customNome, setCustomNome] = useState(nomeSugerido);
  const [customGrupos, setCustomGrupos] = useState('');
  const [customCategoria, setCustomCategoria] = useState('');

  useEffect(() => {
    if (visible) {
      setTab('buscar');
      setSearch('');
      setCustomNome(nomeSugerido);
      setCustomGrupos('');
      setCustomCategoria('');
    }
  }, [visible, nomeSugerido]);

  const resultados = useMemo(() => {
    const termo = search.trim();
    if (termo.length === 0) return candidatos;
    return catalogo.filter((exercise) => matchesExerciseQuery(termo, toQueryFields(exercise)));
  }, [search, candidatos, catalogo]);

  const gruposArray = customGrupos.split(',').map((s) => s.trim()).filter(Boolean);
  const podeCriar = customNome.trim().length > 0 && gruposArray.length > 0;

  const handleCriar = () => {
    if (!podeCriar) return;
    onCriarCustom({ nome: customNome.trim(), groupMuscles: gruposArray, category: customCategoria });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]} accessibilityRole="button">
            <Text style={styles.backBtnText}>{t('common.backArrow')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('treinos.importar.escolherNoCatalogo')}</Text>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('buscar')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'buscar' }}
            style={({ pressed }) => [styles.tabBtn, tab === 'buscar' ? styles.tabBtnActive : null, pressed ? { opacity: 0.8 } : null]}
          >
            <Text style={[styles.tabBtnText, tab === 'buscar' ? styles.tabBtnTextActive : null]}>{t('treinos.importar.escolherNoCatalogo')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('custom')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'custom' }}
            style={({ pressed }) => [styles.tabBtn, tab === 'custom' ? styles.tabBtnActive : null, pressed ? { opacity: 0.8 } : null]}
          >
            <Text style={[styles.tabBtnText, tab === 'custom' ? styles.tabBtnTextActive : null]}>{t('treinos.importar.criarCustom')}</Text>
          </Pressable>
        </View>

        {tab === 'buscar' ? (
          <>
            <TextInput
              style={styles.search}
              placeholder={t('treinos.substitutos.buscarPlaceholder')}
              placeholderTextColor={c.inputPlaceholder}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
              accessibilityLabel={t('treinos.substitutos.buscarPlaceholder')}
            />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
              {resultados.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => onSelect(exercise.id)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
                >
                  <Text style={styles.itemName}>{exercise.name}</Text>
                  {exercise.equipment ? <Text style={styles.itemMeta}>{exercise.equipment}</Text> : null}
                </Pressable>
              ))}
              {resultados.length === 0 ? (
                <Text style={styles.empty}>{t('treinos.substitutos.nenhumEncontrado')}</Text>
              ) : null}
            </ScrollView>
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.customForm}>
            <Text style={styles.customTitulo}>{t('treinos.importar.custom.titulo')}</Text>
            <Field
              label={t('treinos.importar.custom.nomeLabel')}
              placeholder={t('treinos.importar.custom.nomeLabel')}
              value={customNome}
              onChangeText={setCustomNome}
              required
            />
            <MultiChipPicker
              label={t('treinos.importar.custom.grupoLabel')}
              value={customGrupos}
              onChange={setCustomGrupos}
              required
            />
            <ChipPicker
              label={t('treinos.importar.custom.categoriaLabel')}
              value={customCategoria}
              onChange={setCustomCategoria}
              allowCustom
            />
            <Pressable
              onPress={handleCriar}
              disabled={!podeCriar}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.criarBtn,
                !podeCriar ? styles.criarBtnDisabled : null,
                pressed && podeCriar ? { opacity: 0.85 } : null,
              ]}
            >
              <Text style={styles.criarBtnText}>{t('treinos.importar.custom.criar')}</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
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
    backBtnText: { color: c.accentInk, fontSize: 15, fontWeight: '700' },
    title: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
    tabs: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 14, gap: 8 },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    tabBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    tabBtnText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
    tabBtnTextActive: { color: c.accentText },
    search: {
      margin: 16,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      paddingHorizontal: 14,
      color: c.inputText,
      fontSize: 15,
    },
    list: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
    item: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: c.cardAlt,
    },
    itemPressed: { opacity: 0.75 },
    itemName: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    itemMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    empty: { color: c.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 48 },
    customForm: { padding: 20, gap: 14 },
    customTitulo: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    criarBtn: {
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
    },
    criarBtnDisabled: { opacity: 0.5 },
    criarBtnText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
  });
}
