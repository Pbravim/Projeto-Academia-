import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { resolveFullMediaSource, resolveThumbSource, resolveThumbSourceOrPlaceholder } from '../../shared/exerciseMedia';
import { useTheme } from '../../shared/theme';
import { useT } from '../../shared/i18n';

interface Props {
  visible: boolean;
  excludeExercicioId: string;
  currentAlternativaIds: Set<string>;
  allExercises: ExercisePrimitives[];
  onAdd: (exercicioId: string) => Promise<void>;
  onClose: () => void;
}

interface MuscleGroup {
  group: string;
  items: ExercisePrimitives[];
}

const GROUP_ORDER = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Quadriceps', 'Posterior', 'Gluteos', 'Panturrilha',
  'Abdomen', 'Trapezio', 'Antebraco',
];

function groupByMuscle(exercises: ExercisePrimitives[]): MuscleGroup[] {
  const map = new Map<string, ExercisePrimitives[]>();
  for (const ex of exercises) {
    const g = ex.groupMuscles[0] ?? 'Outros';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(ex);
  }
  const ordered: MuscleGroup[] = [];
  for (const g of GROUP_ORDER) {
    if (map.has(g)) { ordered.push({ group: g, items: map.get(g)! }); map.delete(g); }
  }
  for (const [group, items] of map) ordered.push({ group, items });
  return ordered;
}

function CollapsibleGroup({
  group,
  items,
  isSearching,
  adding,
  currentAlternativaIds,
  addedThisSession,
  onAdd,
  styles,
  c,
}: {
  group: string;
  items: ExercisePrimitives[];
  isSearching: boolean;
  adding: string | null;
  currentAlternativaIds: Set<string>;
  addedThisSession: Set<string>;
  onAdd: (id: string) => void;
  styles: ReturnType<typeof makeStyles>;
  c: ReturnType<typeof useTheme>;
}) {
  const [open, setOpen] = useState(isSearching);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const addedCount = items.filter(
    (e) => currentAlternativaIds.has(e.id) || addedThisSession.has(e.id)
  ).length;

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.groupHeader, pressed ? { opacity: 0.7 } : null]}
      >
        <Text style={styles.groupTitle}>{group}</Text>
        <View style={styles.groupMeta}>
          {addedCount > 0 ? (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>{addedCount} ✓</Text>
            </View>
          ) : null}
          <Text style={styles.groupChevron}>{open ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {open ? (
        <View>
          {items.map((ex) => {
            const alreadyAdded = currentAlternativaIds.has(ex.id) || addedThisSession.has(ex.id);
            const isLoading = adding === ex.id;
            const playing = playingId === ex.id;
            const thumbSource = resolveThumbSource(ex.mediaLocal, ex.id);
            const gifSource = playing ? (resolveFullMediaSource(ex.mediaLocal) ?? thumbSource) : thumbSource;
            return (
              <Pressable
                key={ex.id}
                onPress={() => onAdd(ex.id)}
                disabled={alreadyAdded || isLoading}
                style={({ pressed }) => [
                  styles.item,
                  alreadyAdded ? styles.itemAdded : null,
                  pressed && !alreadyAdded ? styles.itemPressed : null,
                ]}
              >
                {gifSource ? (
                  <Pressable onPress={() => setPlayingId((prev) => (prev === ex.id ? null : ex.id))} hitSlop={4} style={styles.thumbnailWrap}>
                    <Image source={gifSource} style={styles.thumbnail} contentFit="cover" autoplay={playing} />
                    {!playing ? (
                      <View style={styles.thumbnailOverlay}>
                        <Text style={styles.thumbnailPlayIcon}>▶</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ) : (
                  <View style={styles.thumbnailWrap}>
                    <Image source={resolveThumbSourceOrPlaceholder(ex.mediaLocal, ex.id)} style={styles.thumbnail} contentFit="cover" autoplay={false} />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, alreadyAdded ? styles.itemNameAdded : null]}>
                    {ex.name}
                  </Text>
                  {ex.category ? <Text style={styles.itemMeta}>{ex.category}</Text> : null}
                </View>
                <Text style={[styles.actionIcon, alreadyAdded ? styles.actionIconAdded : null]}>
                  {isLoading ? '…' : alreadyAdded ? '✓' : '+'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function SubstitutosPickerModal({
  visible,
  excludeExercicioId,
  currentAlternativaIds,
  allExercises,
  onAdd,
  onClose,
}: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [addedThisSession, setAddedThisSession] = useState<Set<string>>(new Set());

  const isSearching = search.trim().length > 0;

  const candidates = useMemo(
    () => allExercises.filter((e) => e.id !== excludeExercicioId),
    [allExercises, excludeExercicioId]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return candidates;
    return candidates.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.groupMuscles.join(', ').toLowerCase().includes(term)
    );
  }, [candidates, search]);

  const grouped = useMemo(() => groupByMuscle(filtered), [filtered]);

  const handleAdd = (exercicioId: string) => {
    if (adding || currentAlternativaIds.has(exercicioId) || addedThisSession.has(exercicioId)) return;
    setAdding(exercicioId);
    void onAdd(exercicioId).then(() => {
      setAddedThisSession((prev) => new Set(prev).add(exercicioId));
      setAdding(null);
    }).catch(() => setAdding(null));
  };

  const handleClose = () => {
    setSearch('');
    setAddedThisSession(new Set());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]}>
            <Text style={styles.backBtnText}>{t('common.backArrow')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('treinos.substitutos.title')}</Text>
        </View>

        <TextInput
          style={styles.search}
          placeholder={t('treinos.substitutos.buscarPlaceholder')}
          placeholderTextColor={c.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
          autoFocus
          returnKeyType="search"
        />

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {grouped.map(({ group, items }) => (
            <CollapsibleGroup
              key={group}
              group={group}
              items={items}
              isSearching={isSearching}
              adding={adding}
              currentAlternativaIds={currentAlternativaIds}
              addedThisSession={addedThisSession}
              onAdd={handleAdd}
              styles={styles}
              c={c}
            />
          ))}
          {grouped.length === 0 ? (
            <Text style={styles.empty}>{t('treinos.substitutos.nenhumEncontrado')}</Text>
          ) : null}
        </ScrollView>
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
    backBtnText: { color: c.accent, fontSize: 15, fontWeight: '700' },
    title: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
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
    list: { paddingBottom: 40 },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: c.cardAlt,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    groupTitle: { color: c.textPrimary, fontSize: 13, fontWeight: '800' },
    groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    groupBadge: { backgroundColor: c.accentLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    groupBadgeText: { color: c.accent, fontSize: 11, fontWeight: '700' },
    groupChevron: { color: c.textSecondary, fontSize: 10, fontWeight: '700' },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    thumbnailWrap: { width: 44, height: 44, flexShrink: 0 },
    thumbnail: { width: 44, height: 44, borderRadius: 8, backgroundColor: c.cardAlt },
    thumbnailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.30)', alignItems: 'center', justifyContent: 'center' },
    thumbnailPlayIcon: { color: '#fff', fontSize: 11, fontWeight: '800' },
    itemPressed: { backgroundColor: c.cardAlt },
    itemAdded: { opacity: 0.45 },
    itemInfo: { flex: 1 },
    itemName: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    itemNameAdded: { color: c.textSecondary },
    itemMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    actionIcon: { color: c.accent, fontSize: 22, fontWeight: '800', width: 28, textAlign: 'center' },
    actionIconAdded: { color: c.textSecondary, fontSize: 18 },
    empty: { color: c.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 48 },
  });
}
