import { Image } from 'expo-image';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { resolveThumbSource, resolveThumbSourceOrPlaceholder } from '../../shared/exerciseMedia';
import { useTheme } from '../../shared/theme';

interface Props {
  group: string;
  items: ExercisePrimitives[];
  selected: Set<string>;
  forceExpanded: boolean;
  hasSelection: boolean;
  onToggleSelect: (id: string) => void;
  onAdd: (id: string) => void;
  onViewMedia: (exercise: ExercisePrimitives) => void;
}

export const ExercisePickerGroup = memo(function ExercisePickerGroup({ group, items, selected, forceExpanded, hasSelection, onToggleSelect, onAdd, onViewMedia }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [expanded, setExpanded] = useState(false);
  const isOpen = expanded || forceExpanded;

  return (
    <View style={styles.pickerGroup}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.pickerGroupHeader, pressed ? { opacity: 0.85 } : null]}
      >
        <View style={styles.pickerGroupHeaderLeft}>
          <Text style={styles.pickerGroupTitle}>{group}</Text>
          <View style={styles.pickerCountBadge}>
            <Text style={styles.pickerCountBadgeText}>{items.length}</Text>
          </View>
        </View>
        <Text style={styles.pickerChevron}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.pickerGroupBody}>
          {items.map((exercise) => {
            const isSelected = selected.has(exercise.id);
            const gifSource = resolveThumbSource(exercise.mediaLocal, exercise.id);
            const hasMedia = gifSource !== null || exercise.mediaOnline !== null;
            return (
              <Pressable
                key={exercise.id}
                onPress={() => {
                  if (!hasSelection && !isSelected) {
                    onAdd(exercise.id);
                  } else {
                    onToggleSelect(exercise.id);
                  }
                }}
                onLongPress={() => onToggleSelect(exercise.id)}
                style={({ pressed }) => [
                  styles.availableCard,
                  isSelected ? styles.availableCardSelected : null,
                  pressed ? { opacity: 0.7 } : null,
                ]}
              >
                <View style={styles.availableCardContent}>
                  {gifSource ? (
                    <Pressable onPress={() => onViewMedia(exercise)} hitSlop={4} style={styles.thumbnailWrap}>
                      <Image source={gifSource} style={styles.thumbnail} contentFit="cover" autoplay={false} recyclingKey={exercise.id} cachePolicy="memory-disk" />
                      <View style={styles.thumbnailOverlay}>
                        <Text style={styles.thumbnailPlayIcon}>▶</Text>
                      </View>
                    </Pressable>
                  ) : hasMedia ? (
                    <Pressable onPress={() => onViewMedia(exercise)} hitSlop={4} style={styles.thumbnailWrap}>
                      <View style={[styles.thumbnail, styles.thumbnailOverlay]}>
                        <Text style={styles.thumbnailPlayIcon}>▶</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View style={styles.thumbnailWrap}>
                      <Image source={resolveThumbSourceOrPlaceholder(exercise.mediaLocal, exercise.id)} style={styles.thumbnail} contentFit="cover" autoplay={false} recyclingKey={exercise.id} cachePolicy="memory-disk" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.availableName}>{exercise.name}</Text>
                    <Text style={styles.availableMeta}>{exercise.category ? `${exercise.groupMuscles.join(', ')} · ${exercise.category}` : exercise.groupMuscles.join(', ')}</Text>
                  </View>
                  {isSelected ? (
                    <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    pickerGroup: { gap: 0 },
    pickerGroupHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.hero, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 2 },
    pickerGroupHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    pickerGroupTitle: { color: c.heroText, fontSize: 14, fontWeight: '800' },
    pickerCountBadge: { backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 },
    pickerCountBadgeText: { color: c.accentText, fontSize: 11, fontWeight: '800' },
    pickerChevron: { color: c.heroSubtext, fontSize: 11, fontWeight: '700' },
    pickerGroupBody: { gap: 6, paddingBottom: 4 },
    availableCard: { borderRadius: 14, padding: 14, backgroundColor: c.cardAlt, borderWidth: 1.5, borderColor: 'transparent' },
    availableCardSelected: { backgroundColor: c.accentLight, borderColor: c.textPrimary },
    availableCardContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    thumbnailWrap: { width: 44, height: 44, flexShrink: 0 },
    thumbnail: { width: 44, height: 44, borderRadius: 8, backgroundColor: c.card },
    thumbnailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.30)', alignItems: 'center', justifyContent: 'center' },
    thumbnailPlayIcon: { color: '#fff', fontSize: 11, fontWeight: '800' },
    availableName: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
    availableMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    checkmark: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.hero, alignItems: 'center', justifyContent: 'center' },
    checkmarkText: { color: c.heroText, fontSize: 13, fontWeight: '800' },
  });
}
