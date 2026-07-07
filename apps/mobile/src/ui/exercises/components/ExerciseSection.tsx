import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { ExerciseCardViewModel } from '../presenters/buildExerciseCatalogViewModel';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { gifAssets } from './gifAssets';
import { useTheme } from '../../shared/theme';
import { useT } from '../../shared/i18n';

// ── Header de seção (usado como renderSectionHeader da SectionList) ──
// Visual idêntico ao antigo header interno do ExerciseSection; o estado de
// expansão agora vive na tela (ExerciseCatalogScreen), que passa isOpen/onToggle.

interface SectionHeaderProps {
  groupMuscle: string;
  count: number;
  isOpen: boolean;
  onToggle: (groupMuscle: string) => void;
}

export const ExerciseSectionHeader = memo(function ExerciseSectionHeader({ groupMuscle, count, isOpen, onToggle }: SectionHeaderProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Pressable
      onPress={() => onToggle(groupMuscle)}
      style={({ pressed }) => [styles.sectionHeader, pressed ? styles.sectionHeaderPressed : null]}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionHeaderTitle}>{groupMuscle}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
    </Pressable>
  );
});

// ── Card individual (usado como renderItem da SectionList) ──
// O antigo container `sectionBody` (fundo card + borda + padding 12 + gap 10)
// é reconstituído por linha: bordas laterais em todas, topo na primeira,
// fundo/raios na última — visual final idêntico ao bloco único de antes.

interface CardRowProps {
  card: ExerciseCardViewModel;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  anyDeleting: boolean;
  exercise: ExercisePrimitives;
  onSelectEdit: (exercise: ExercisePrimitives) => void;
  onViewHistorico: (id: string, name: string) => void;
  onViewMedia: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export const ExerciseCardRow = memo(function ExerciseCardRow({ card, isFirst, isLast, isEditing, isDeleting, anyDeleting, exercise, onSelectEdit, onViewHistorico, onViewMedia, onDelete }: CardRowProps) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const gifSource = exercise.mediaLocal ? (gifAssets[exercise.mediaLocal] ?? null) : null;

  return (
    <View style={[styles.rowWrap, isFirst ? styles.rowWrapFirst : null, isLast ? styles.rowWrapLast : null]}>
      <View style={[styles.exerciseCard, isEditing ? styles.exerciseCardEditing : null]}>
        <View style={styles.exerciseRow}>
          {gifSource ? (
            <Pressable onPress={() => onViewMedia(card.id)} hitSlop={4} style={styles.exerciseThumbnailWrap}>
              <Image source={gifSource} style={styles.exerciseThumbnail} contentFit="cover" autoplay={false} recyclingKey={card.id} cachePolicy="memory-disk" />
              <View style={styles.thumbnailOverlay}>
                <Text style={styles.thumbnailPlayIcon}>▶</Text>
              </View>
            </Pressable>
          ) : null}
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseTitle}>{card.title}</Text>
            <Text style={styles.exerciseSubtitle}>{card.subtitle}</Text>
            <Text style={styles.exerciseMeta}>{card.meta}</Text>
            {card.ultimoPeso ? (
              <Text style={styles.exerciseUltimoPeso}>{card.ultimoPeso}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSelectEdit(exercise)}
            style={({ pressed }) => [styles.actionButton, pressed ? styles.actionButtonPressed : null]}
          >
            <Text style={styles.editButtonText}>{t('exercises.card.editar')}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => onViewHistorico(card.id, card.title)}
            style={({ pressed }) => [styles.actionButton, styles.historicoButton, pressed ? styles.actionButtonPressed : null]}
          >
            <Text style={styles.historicoButtonText}>{t('exercises.card.historico')}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => { void onDelete(card.id); }}
            disabled={anyDeleting}
            style={({ pressed }) => [
              styles.actionButton,
              styles.deleteButton,
              pressed ? styles.actionButtonPressed : null,
              isDeleting ? styles.deleteButtonLoading : null,
            ]}
          >
            <Text style={styles.deleteButtonText}>{isDeleting ? t('exercises.card.excluindo') : t('common.delete')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.hero, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 2 },
    sectionHeaderPressed: { opacity: 0.85 },
    sectionHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionHeaderTitle: { color: c.heroText, fontSize: 15, fontWeight: '800' },
    countBadge: { backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    countBadgeText: { color: c.accentText, fontSize: 12, fontWeight: '800' },
    chevron: { color: c.heroSubtext, fontSize: 11, fontWeight: '700' },
    // Reconstituição do antigo sectionBody (padding 12, gap 10) por linha
    rowWrap: { backgroundColor: c.card, borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 12, paddingTop: 10 },
    rowWrapFirst: { borderTopWidth: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4, paddingTop: 12 },
    rowWrapLast: { borderBottomWidth: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingBottom: 12 },
    exerciseCard: { borderRadius: 14, padding: 14, backgroundColor: c.cardAlt, gap: 10 },
    exerciseCardEditing: { borderWidth: 2, borderColor: c.accent },
    exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    exerciseThumbnailWrap: { width: 52, height: 52, flexShrink: 0 },
    exerciseThumbnail: { width: 52, height: 52, borderRadius: 10, backgroundColor: c.card },
    thumbnailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.30)', alignItems: 'center', justifyContent: 'center' },
    thumbnailPlayIcon: { color: '#fff', fontSize: 11, fontWeight: '800' },
    exerciseInfo: { flex: 1, gap: 2 },
    exerciseTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    exerciseSubtitle: { color: c.textLabel, fontSize: 14, fontWeight: '600' },
    exerciseMeta: { color: c.textSecondary, fontSize: 13 },
    exerciseUltimoPeso: { color: c.accent, fontSize: 12, fontWeight: '700', marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
    actionButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: c.cardAlt },
    actionButtonPressed: { opacity: 0.75 },
    deleteButton: { backgroundColor: c.errorBg },
    historicoButton: { backgroundColor: c.cardAlt },
    deleteButtonLoading: { opacity: 0.6 },
    editButtonText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
    deleteButtonText: { color: c.error, fontSize: 13, fontWeight: '700' },
    historicoButtonText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
  });
}
