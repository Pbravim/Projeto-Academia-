import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { resolveFullMediaSource, resolveThumbSource, resolveThumbSourceOrPlaceholder } from '../../shared/exerciseMedia';
import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';

const GROUP_ORDER = [
  'Peito', 'Costas', 'Ombros', 'Biceps', 'Triceps',
  'Quadriceps', 'Posterior', 'Gluteos', 'Panturrilha',
  'Abdomen', 'Trapezio', 'Antebraco',
];

function primaryGroup(groupMuscles: string[]): string {
  return groupMuscles[0] ?? 'Outros';
}

function groupExercises(exercises: ExercisePrimitives[]): { group: string; items: ExercisePrimitives[] }[] {
  const byGroup = new Map<string, ExercisePrimitives[]>();
  for (const ex of exercises) {
    const group = primaryGroup(ex.groupMuscles);
    const list = byGroup.get(group) ?? [];
    list.push(ex);
    byGroup.set(group, list);
  }
  return Array.from(byGroup.entries())
    .sort(([a], [b]) => {
      const ai = GROUP_ORDER.indexOf(a), bi = GROUP_ORDER.indexOf(b);
      const ao = ai === -1 ? GROUP_ORDER.length : ai;
      const bo = bi === -1 ? GROUP_ORDER.length : bi;
      return ao !== bo ? ao - bo : a.localeCompare(b);
    })
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

interface Props {
  availableExercises: ExercisePrimitives[];
  onAdd: (id: string) => Promise<void>;
}

export function AddExercicioSection({ availableExercises, onAdd }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (availableExercises.length === 0) {
    return <Text style={styles.emptyAddText}>{t('sessao.addExercicio.empty')}</Text>;
  }

  return (
    <View style={styles.addExercicioList}>
      {groupExercises(availableExercises).map(({ group, items }) => (
        <ExerciseGroup key={group} group={group} items={items} onAdd={onAdd} />
      ))}
    </View>
  );
}

interface ExerciseGroupProps {
  group: string;
  items: ExercisePrimitives[];
  onAdd: (id: string) => Promise<void>;
}

function ExerciseGroup({ group, items, onAdd }: ExerciseGroupProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [expanded, setExpanded] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <View>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.groupHeader, pressed ? { opacity: 0.85 } : null]}
      >
        <View style={styles.groupHeaderLeft}>
          <Text style={styles.groupTitle}>{group}</Text>
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>{items.length}</Text>
          </View>
        </View>
        <Text style={styles.groupChevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.groupBody}>
          {items.map((ex) => {
            const playing = playingId === ex.id;
            const thumbSource = resolveThumbSource(ex.mediaLocal, ex.id);
            const gifSource = playing ? (resolveFullMediaSource(ex.mediaLocal) ?? thumbSource) : thumbSource;
            return (
              <Pressable
                key={ex.id}
                onPress={() => { void onAdd(ex.id); }}
                style={({ pressed }) => [styles.exerciseCard, pressed ? { opacity: 0.7 } : null]}
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
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseMeta}>{ex.category ? `${ex.groupMuscles.join(', ')} · ${ex.category}` : ex.groupMuscles.join(', ')}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    addExercicioList: { gap: 4 },
    emptyAddText: { color: c.textSecondary, fontSize: 13 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.hero, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 2 },
    groupHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    groupTitle: { color: c.heroText, fontSize: 13, fontWeight: '800' },
    groupBadge: { backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
    groupBadgeText: { color: c.accentText, fontSize: 11, fontWeight: '800' },
    groupChevron: { color: c.heroSubtext, fontSize: 10, fontWeight: '700' },
    groupBody: { gap: 4, paddingBottom: 4 },
    exerciseCard: { borderRadius: 12, padding: 12, backgroundColor: c.cardAlt, flexDirection: 'row', alignItems: 'center', gap: 10 },
    thumbnailWrap: { width: 44, height: 44, flexShrink: 0 },
    thumbnail: { width: 44, height: 44, borderRadius: 8, backgroundColor: c.card },
    thumbnailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.30)', alignItems: 'center', justifyContent: 'center' },
    thumbnailPlayIcon: { color: '#fff', fontSize: 11, fontWeight: '800' },
    exerciseInfo: { flex: 1 },
    exerciseName: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    exerciseMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  });
}
