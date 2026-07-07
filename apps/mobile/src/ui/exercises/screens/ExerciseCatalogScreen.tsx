import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View,
  type SectionListData, type SectionListRenderItem,
} from 'react-native';

import {
  buildExerciseCatalogViewModel,
  type CatalogSortMode,
  type ExerciseCardViewModel,
  type ExerciseSectionViewModel,
} from '../presenters/buildExerciseCatalogViewModel';
import type { ExerciseCatalogControllerState } from '../hooks/useExerciseCatalogController';
import { ExerciseCardRow, ExerciseSectionHeader } from '../components/ExerciseSection';
import {
  Field, MultiChipPicker, ChipPicker, MediaFields,
  CATEGORIES, EQUIPMENTS, MOVEMENT_PATTERNS, EXECUTION_TYPES, PRIMARY_EQUIPMENTS,
} from '../components/ExerciseFormFields';
import { ExerciseMediaViewer } from '../components/ExerciseMediaViewer';
import { metadataLabel } from '../exerciseMetadataLabels';
import { useTheme } from '../../shared/theme';
import { useLocale, useT } from '../../shared/i18n';
import { normalizeText } from '../../../shared/utils/normalizeText';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';

// Seção da SectionList: `data` vazio quando o grupo está colapsado, então só
// os cards de grupos expandidos (e visíveis) montam suas thumbs de GIF.
interface CatalogListSection {
  key: string;
  section: ExerciseSectionViewModel;
  data: ExerciseCardViewModel[];
}

export function ExerciseCatalogScreen({
  draft,
  exercises,
  ultimosPesos,
  alternativas,
  errorMessage,
  feedbackMessage,
  isLoading,
  isSubmitting,
  deletingId,
  editingExerciseId,
  onChangeField,
  onSubmit,
  onSelectEdit,
  onCancelEdit,
  onDelete,
  onChangeMediaLocal,
  onAddAlternativa,
  onRemoveAlternativa,
  onViewHistorico,
}: ExerciseCatalogControllerState) {
  const c = useTheme();
  const t = useT();
  const locale = useLocale();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [search, setSearch] = useState('');
  const [showSubstPicker, setShowSubstPicker] = useState(false);
  const [substSearch, setSubstSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [sortMode, setSortMode] = useState<CatalogSortMode>('nome');
  const [viewerExercise, setViewerExercise] = useState<ExercisePrimitives | null>(null);
  // Expansão por grupo muscular (colapsado por padrão) — antes vivia dentro de
  // cada ExerciseSection; subiu para a tela para alimentar a SectionList.
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set());

  const isEditing = editingExerciseId !== null;
  const canSubmit = draft.name.trim().length > 0 && draft.groupMuscle.trim().length > 0 && !isSubmitting;

  // Opções únicas derivadas do catálogo real
  const availableCategories = useMemo(
    () => [...new Set(exercises.map((e) => e.category).filter((c): c is string => !!c))].sort(),
    [exercises]
  );
  const availableEquipments = useMemo(
    () => [...new Set(exercises.map((e) => e.equipment).filter((eq): eq is string => !!eq))].sort(),
    [exercises]
  );
  const musculoAlvoOptions = useMemo(
    () => [...new Set(exercises.flatMap((e) => e.musculoAlvo))].sort(),
    [exercises]
  );

  // Sugestões de nomes similares ao criar (não ao editar).
  // useMemo: sem ele o filtro sobre os 500+ exercícios rodava a cada render
  // da tela (inclusive a cada tecla do campo de busca, que nem usa o draft).
  const normalizedDraftName = normalizeText(draft.name);
  const nameSuggestions: ExercisePrimitives[] = useMemo(
    () =>
      !isEditing && normalizedDraftName.length >= 2
        ? exercises.filter((e) => e.normalizedName.includes(normalizedDraftName)).slice(0, 4)
        : [],
    [exercises, isEditing, normalizedDraftName]
  );
  const exactMatch = nameSuggestions.find((e) => e.normalizedName === normalizedDraftName);

  // Aplica filtros de categoria/equipamento antes de construir a view model
  const preFilteredExercises = useMemo(
    () => exercises
      .filter((e) => !filterCategory || e.category === filterCategory)
      .filter((e) => !filterEquipment || e.equipment === filterEquipment),
    [exercises, filterCategory, filterEquipment]
  );

  const viewModel = useMemo(
    () => buildExerciseCatalogViewModel(preFilteredExercises, ultimosPesos, sortMode, locale),
    [preFilteredExercises, ultimosPesos, sortMode, locale]
  );

  // O(1) lookup por id — evita exercises.find() por card a cada render (era O(n) por card).
  const exercisesById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e] as const)),
    [exercises]
  );

  // Aplica busca por texto sobre as sections já filtradas
  const activeSearch = search.trim();
  const hasAnyFilter = activeSearch.length > 0 || !!filterCategory || !!filterEquipment;
  const filteredSections = useMemo(() => {
    if (activeSearch.length === 0) return viewModel.sections;
    const q = normalizeText(activeSearch);
    return viewModel.sections
      .map((section) => ({
        ...section,
        cards: section.cards.filter((card) =>
          normalizeText(card.title).includes(q) ||
          normalizeText(section.groupMuscle).includes(q) ||
          card.nameVariations.some((v) => normalizeText(v).includes(q))
        ),
      }))
      .filter((section) => section.cards.length > 0);
  }, [viewModel, activeSearch]);

  const handleViewMedia = useCallback(
    (id: string) => setViewerExercise(exercisesById.get(id) ?? null),
    [exercisesById]
  );

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  // A lista só existe quando o catálogo carregou e não está vazio (mesmas
  // condições do render antigo); grupos colapsados entram com data vazio.
  const showCatalogList = !isLoading && !viewModel.emptyStateMessage;
  const listSections: CatalogListSection[] = useMemo(
    () =>
      showCatalogList
        ? filteredSections.map((section) => ({
            key: section.groupMuscle,
            section,
            data: hasAnyFilter || expandedGroups.has(section.groupMuscle) ? section.cards : [],
          }))
        : [],
    [showCatalogList, filteredSections, hasAnyFilter, expandedGroups]
  );

  const keyExtractor = useCallback((item: ExerciseCardViewModel) => item.id, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<ExerciseCardViewModel, CatalogListSection> }) => (
      <View style={styles.sectionSpacer}>
        <ExerciseSectionHeader
          groupMuscle={section.section.groupMuscle}
          count={section.section.cards.length}
          isOpen={hasAnyFilter || expandedGroups.has(section.section.groupMuscle)}
          onToggle={toggleGroup}
        />
      </View>
    ),
    [styles, hasAnyFilter, expandedGroups, toggleGroup]
  );

  const renderItem: SectionListRenderItem<ExerciseCardViewModel, CatalogListSection> = useCallback(
    ({ item, index, section }) => (
      <ExerciseCardRow
        card={item}
        isFirst={index === 0}
        isLast={index === section.data.length - 1}
        isEditing={editingExerciseId === item.id}
        isDeleting={deletingId === item.id}
        anyDeleting={deletingId !== null}
        exercise={exercisesById.get(item.id)!}
        onSelectEdit={onSelectEdit}
        onViewHistorico={onViewHistorico}
        onViewMedia={handleViewMedia}
        onDelete={onDelete}
      />
    ),
    [editingExerciseId, deletingId, exercisesById, onSelectEdit, onViewHistorico, handleViewMedia, onDelete]
  );

  // Elemento (não componente) para o ListHeaderComponent: evita remontagem do
  // formulário/busca a cada render, o que faria o teclado fechar ao digitar.
  const listHeader = (
    <View style={styles.headerContent}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('exercises.catalog.eyebrow')}</Text>
        <Text style={styles.title}>{t('exercises.catalog.title')}</Text>
        <Text style={styles.description}>
          {t('exercises.catalog.description')}
        </Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.sectionTitle}>
            {isEditing ? t('exercises.catalog.editingFormTitle') : t('exercises.catalog.newFormTitle')}
          </Text>
          {isEditing ? (
            <Pressable onPress={onCancelEdit} hitSlop={8}>
              <Text style={styles.cancelLink}>{t('common.cancel')}</Text>
            </Pressable>
          ) : null}
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Field
          label={t('exercises.form.nome')}
          placeholder={t('exercises.form.nomePlaceholder')}
          value={draft.name}
          onChangeText={(value) => onChangeField('name', value)}
          editable={!isSubmitting}
          required
        />

        {/* Sugestões de exercícios similares */}
        {nameSuggestions.length > 0 ? (
          <View style={styles.suggestionsBlock}>
            {exactMatch ? (
              <Text style={styles.exactMatchWarning}>
                {t('exercises.catalog.exactMatchWarning')}
              </Text>
            ) : (
              <Text style={styles.suggestionsLabel}>{t('exercises.catalog.suggestionsLabel')}</Text>
            )}
            {nameSuggestions.map((ex) => (
              <Pressable
                key={ex.id}
                onPress={() => onSelectEdit(ex)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  ex.normalizedName === normalizedDraftName ? styles.suggestionRowExact : null,
                  pressed ? styles.suggestionRowPressed : null,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionName}>{ex.name}</Text>
                  <Text style={styles.suggestionMeta}>{ex.category ? `${ex.groupMuscles.join(', ')} · ${ex.category}` : ex.groupMuscles.join(', ')}</Text>
                </View>
                <Text style={styles.suggestionEditHint}>{t('exercises.catalog.editArrow')}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <MultiChipPicker
          value={draft.groupMuscle}
          onChange={(value) => onChangeField('groupMuscle', value)}
        />
        <ChipPicker
          label={t('exercises.form.categoria')}
          options={CATEGORIES}
          customPlaceholder={t('exercises.form.categoriaPlaceholder')}
          value={draft.category}
          onChange={(value) => onChangeField('category', value)}
        />
        <ChipPicker
          label={t('exercises.form.equipamento')}
          options={EQUIPMENTS}
          customPlaceholder={t('exercises.form.equipamentoPlaceholder')}
          value={draft.equipment}
          onChange={(value) => onChangeField('equipment', value)}
        />

        <Text style={styles.helperText}>
          {t('exercises.form.biomecanicoHelper')}
        </Text>

        <ChipPicker
          label={t('exercises.form.padraoMovimento')}
          options={MOVEMENT_PATTERNS}
          customPlaceholder={t('exercises.form.padraoMovimentoPlaceholder')}
          value={draft.movementPattern}
          onChange={(value) => onChangeField('movementPattern', value)}
          formatOption={(v) => metadataLabel('movementPattern', v, locale)}
        />
        <ChipPicker
          label={t('exercises.form.tipoExecucao')}
          options={EXECUTION_TYPES}
          allowCustom={false}
          value={draft.executionType}
          onChange={(value) => onChangeField('executionType', value)}
          formatOption={(v) => metadataLabel('executionType', v, locale)}
        />
        <ChipPicker
          label={t('exercises.form.equipamentoPrincipal')}
          options={PRIMARY_EQUIPMENTS}
          customPlaceholder={t('exercises.form.equipamentoPrincipalPlaceholder')}
          value={draft.primaryEquipment}
          onChange={(value) => onChangeField('primaryEquipment', value)}
          formatOption={(v) => metadataLabel('primaryEquipment', v, locale)}
        />
        <ChipPicker
          label={t('exercises.form.equipamentoSecundario')}
          options={PRIMARY_EQUIPMENTS}
          customPlaceholder={t('exercises.form.equipamentoSecundarioPlaceholder')}
          value={draft.secondaryEquipment}
          onChange={(value) => onChangeField('secondaryEquipment', value)}
          formatOption={(v) => metadataLabel('secondaryEquipment', v, locale)}
        />
        <MultiChipPicker
          label={t('exercises.form.musculosAlvo')}
          options={musculoAlvoOptions}
          placeholder={t('exercises.form.musculosAlvoPlaceholder')}
          customPlaceholder={t('exercises.form.musculoNomePlaceholder')}
          required={false}
          value={draft.musculoAlvo}
          onChange={(value) => onChangeField('musculoAlvo', value)}
        />

        <MediaFields
          exercicioId={editingExerciseId}
          mediaOnline={draft.mediaOnline}
          mediaLocal={draft.mediaLocal}
          onChangeOnline={(v) => onChangeField('mediaOnline', v)}
          onChangeLocal={onChangeMediaLocal}
        />

        <Text style={styles.helperText}>{t('exercises.form.cargaHelper')}</Text>

        {/* ── Exercícios substitutos (only when editing) ── */}
        {isEditing ? (
          <View style={styles.substSection}>
            <Text style={styles.substTitle}>{t('exercises.catalog.substTitle')}</Text>
            <Text style={styles.substHint}>
              {t('exercises.catalog.substHint')}
            </Text>

            {alternativas.length > 0 ? (
              <View style={styles.substChips}>
                {alternativas.map((alt) => (
                  <View key={alt.id} style={styles.substChip}>
                    <Text style={styles.substChipText} numberOfLines={1}>{alt.name}</Text>
                    <Pressable
                      onPress={() => { void onRemoveAlternativa(alt.id); }}
                      hitSlop={6}
                      style={({ pressed }) => [pressed ? { opacity: 0.5 } : null]}
                    >
                      <Text style={styles.substChipRemove}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {!showSubstPicker ? (
              <Pressable
                onPress={() => { setShowSubstPicker(true); setSubstSearch(''); }}
                style={({ pressed }) => [styles.addSubstBtn, pressed ? { opacity: 0.75 } : null]}
              >
                <Text style={styles.addSubstBtnText}>{t('exercises.catalog.addSubstBtn')}</Text>
              </Pressable>
            ) : (
              <View style={styles.substPicker}>
                <TextInput
                  style={styles.substSearch}
                  placeholder={t('exercises.catalog.substSearchPlaceholder')}
                  placeholderTextColor={c.inputPlaceholder}
                  value={substSearch}
                  onChangeText={setSubstSearch}
                  autoFocus
                />
                <Pressable onPress={() => setShowSubstPicker(false)} style={styles.substCancelBtn}>
                  <Text style={styles.substCancelText}>{t('common.cancel')}</Text>
                </Pressable>
                {exercises
                  .filter((ex) =>
                    ex.id !== editingExerciseId &&
                    !alternativas.some((a) => a.id === ex.id) &&
                    (substSearch.length === 0 ||
                      ex.name.toLowerCase().includes(substSearch.toLowerCase()) ||
                      ex.groupMuscles.join(', ').toLowerCase().includes(substSearch.toLowerCase()) ||
                      ex.nameVariations.some((v) => v.toLowerCase().includes(substSearch.toLowerCase())))
                  )
                  .slice(0, 8)
                  .map((ex) => (
                    <Pressable
                      key={ex.id}
                      onPress={() => {
                        void onAddAlternativa(ex.id);
                        setSubstSearch('');
                        setShowSubstPicker(false);
                      }}
                      style={({ pressed }) => [styles.substPickerRow, pressed ? { opacity: 0.75 } : null]}
                    >
                      <Text style={styles.substPickerName} numberOfLines={1}>{ex.name}</Text>
                      <Text style={styles.substPickerMeta}>{ex.groupMuscles.join(', ')}</Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        ) : null}

        {feedbackMessage ? <Text style={styles.successMessage}>{feedbackMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => { void onSubmit(); }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            !canSubmit ? styles.primaryButtonDisabled : null,
          ]}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting
              ? t('exercises.catalog.saving')
              : isEditing
                ? t('exercises.catalog.saveEdit')
                : t('exercises.catalog.saveNew')}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={c.accent} style={styles.loading} />
      ) : viewModel.emptyStateMessage ? (
        <View style={styles.listCard}>
          <Text style={styles.emptyState}>{viewModel.emptyStateMessage}</Text>
        </View>
      ) : (
        <>
          {/* Barra de busca no catálogo */}
          <TextInput
            style={styles.searchInput}
            placeholder={t('exercises.catalog.searchPlaceholder')}
            placeholderTextColor={c.inputPlaceholder}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />

          {/* Toggle de ordenação */}
          <View style={styles.sortRow}>
            <Text style={styles.filterLabel}>{t('exercises.catalog.ordemLabel')}</Text>
            <Pressable
              onPress={() => setSortMode('nome')}
              style={[styles.filterChip, sortMode === 'nome' ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterChipText, sortMode === 'nome' ? styles.filterChipTextActive : null]}>
                {t('exercises.catalog.sortAZ')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSortMode('ultimo_uso')}
              style={[styles.filterChip, sortMode === 'ultimo_uso' ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterChipText, sortMode === 'ultimo_uso' ? styles.filterChipTextActive : null]}>
                {t('exercises.catalog.sortUltimoUso')}
              </Text>
            </Pressable>
          </View>

          {/* Chips de filtro — categoria */}
          {availableCategories.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <Text style={styles.filterLabel}>{t('exercises.catalog.catLabel')}</Text>
              {availableCategories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                  style={[styles.filterChip, filterCategory === cat ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterChipText, filterCategory === cat ? styles.filterChipTextActive : null]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* Chips de filtro — equipamento */}
          {availableEquipments.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <Text style={styles.filterLabel}>{t('exercises.catalog.equipLabel')}</Text>
              {availableEquipments.map((eq) => (
                <Pressable
                  key={eq}
                  onPress={() => setFilterEquipment(filterEquipment === eq ? '' : eq)}
                  style={[styles.filterChip, filterEquipment === eq ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterChipText, filterEquipment === eq ? styles.filterChipTextActive : null]}>
                    {eq}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* Botão limpar filtros */}
          {(filterCategory || filterEquipment) ? (
            <Pressable
              onPress={() => { setFilterCategory(''); setFilterEquipment(''); }}
              style={({ pressed }) => [styles.clearFiltersBtn, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={styles.clearFiltersBtnText}>{t('exercises.catalog.clearFilters')}</Text>
            </Pressable>
          ) : null}

          {filteredSections.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.emptyState}>{t('exercises.catalog.noneFound')}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <>
      <SectionList
        style={styles.screen}
        contentContainerStyle={styles.content}
        sections={listSections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={listHeader}
        stickySectionHeadersEnabled={false}
        initialNumToRender={12}
      />

      {viewerExercise ? (
        <ExerciseMediaViewer
          visible
          exercicioNome={viewerExercise.name}
          mediaOnline={viewerExercise.mediaOnline}
          mediaLocal={viewerExercise.mediaLocal}
          onClose={() => setViewerExercise(null)}
        />
      ) : null}
    </>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    // Sem `gap` aqui: na SectionList cada linha é filha direta do container de
    // conteúdo; o espaçamento de 18 vive em headerContent e sectionSpacer.
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
    headerContent: { gap: 18 },
    sectionSpacer: { marginTop: 18 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 10 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 30, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 15, lineHeight: 22 },
    formCard: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listCard: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    cancelLink: { color: c.accent, fontSize: 14, fontWeight: '700' },
    helperText: { color: c.textSecondary, fontSize: 13, lineHeight: 18 },
    errorBanner: { backgroundColor: c.errorBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.error },
    errorBannerText: { color: c.error, fontSize: 14, fontWeight: '700' },
    successMessage: { color: c.success, fontSize: 14, fontWeight: '600' },
    primaryButton: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent },
    primaryButtonPressed: { opacity: 0.9 },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    loading: { marginVertical: 12 },
    emptyState: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    searchInput: {
      height: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      color: c.inputText,
      fontSize: 14,
    },
    // Sort + filter chips
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
    filterLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 2 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    filterChipActive: { backgroundColor: c.hero, borderColor: c.hero },
    filterChipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    filterChipTextActive: { color: c.heroText, fontWeight: '700' },
    clearFiltersBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.errorBg, borderWidth: 1, borderColor: c.error },
    clearFiltersBtnText: { color: c.error, fontSize: 12, fontWeight: '700' },
    // Name suggestions
    suggestionsBlock: {
      gap: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.warningBorder,
      backgroundColor: c.warningBg,
      padding: 12,
    },
    suggestionsLabel: { color: c.warning, fontSize: 12, fontWeight: '700' },
    exactMatchWarning: { color: c.warning, fontSize: 13, fontWeight: '800' },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 10,
    },
    suggestionRowExact: { borderWidth: 1.5, borderColor: c.warningBorder },
    suggestionRowPressed: { opacity: 0.7 },
    suggestionName: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    suggestionMeta: { color: c.textSecondary, fontSize: 12, marginTop: 1 },
    suggestionEditHint: { color: c.accent, fontSize: 12, fontWeight: '700' },

    // Substitutes section
    substSection: { gap: 10, paddingTop: 4 },
    substTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    substHint: { color: c.textSecondary, fontSize: 12, lineHeight: 17, marginTop: -4 },
    substChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    substChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.accentLight, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: c.accent,
      maxWidth: '100%',
    },
    substChipText: { color: c.accent, fontSize: 13, fontWeight: '700', flexShrink: 1 },
    substChipRemove: { color: c.accent, fontSize: 13, fontWeight: '800' },
    addSubstBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: c.accent,
    },
    addSubstBtnText: { color: c.accent, fontSize: 13, fontWeight: '700' },
    substPicker: { gap: 6 },
    substSearch: {
      height: 40, borderRadius: 12, borderWidth: 1,
      borderColor: c.inputBorder, backgroundColor: c.inputBg,
      paddingHorizontal: 12, color: c.inputText, fontSize: 14,
    },
    substCancelBtn: { alignSelf: 'flex-end' },
    substCancelText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    substPickerRow: {
      padding: 10, borderRadius: 10,
      backgroundColor: c.cardAlt, gap: 2,
    },
    substPickerName: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    substPickerMeta: { color: c.textSecondary, fontSize: 12 },
  });
}
