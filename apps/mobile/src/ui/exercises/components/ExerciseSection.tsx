import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ExerciseSectionViewModel, ExerciseCardViewModel } from '../presenters/buildExerciseCatalogViewModel';
import type { ExercisePrimitives } from '../../../domain/exercises/entities/Exercise';
import { useTheme } from '../../shared/theme';

interface SectionProps {
  section: ExerciseSectionViewModel;
  exercises: ExercisePrimitives[];
  editingExerciseId: string | null;
  deletingId: string | null;
  forceExpanded?: boolean;
  onSelectEdit: (exercise: ExercisePrimitives) => void;
  onViewHistorico: (id: string, name: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ExerciseSection({ section, exercises, editingExerciseId, deletingId, forceExpanded, onSelectEdit, onViewHistorico, onDelete }: SectionProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [expanded, setExpanded] = useState(false);
  const isOpen = forceExpanded || expanded;

  return (
    <View style={styles.sectionContainer}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.sectionHeader, pressed ? styles.sectionHeaderPressed : null]}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderTitle}>{section.groupMuscle}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{section.cards.length}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.sectionBody}>
          {section.cards.map((card) => (
            <ExerciseCard
              key={card.id}
              card={card}
              isEditing={editingExerciseId === card.id}
              isDeleting={deletingId === card.id}
              anyDeleting={deletingId !== null}
              exercise={exercises.find((e) => e.id === card.id)!}
              onSelectEdit={onSelectEdit}
              onViewHistorico={onViewHistorico}
              onDelete={onDelete}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface CardProps {
  card: ExerciseCardViewModel;
  isEditing: boolean;
  isDeleting: boolean;
  anyDeleting: boolean;
  exercise: ExercisePrimitives;
  onSelectEdit: (exercise: ExercisePrimitives) => void;
  onViewHistorico: (id: string, name: string) => void;
  onDelete: (id: string) => Promise<void>;
}

function ExerciseCard({ card, isEditing, isDeleting, anyDeleting, exercise, onSelectEdit, onViewHistorico, onDelete }: CardProps) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[styles.exerciseCard, isEditing ? styles.exerciseCardEditing : null]}>
      <Text style={styles.exerciseTitle}>{card.title}</Text>
      <Text style={styles.exerciseSubtitle}>{card.subtitle}</Text>
      <Text style={styles.exerciseMeta}>{card.meta}</Text>
      {card.ultimoPeso ? (
        <Text style={styles.exerciseUltimoPeso}>{card.ultimoPeso}</Text>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelectEdit(exercise)}
          style={({ pressed }) => [styles.actionButton, pressed ? styles.actionButtonPressed : null]}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onViewHistorico(card.id, card.title)}
          style={({ pressed }) => [styles.actionButton, styles.historicoButton, pressed ? styles.actionButtonPressed : null]}
        >
          <Text style={styles.historicoButtonText}>Historico</Text>
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
          <Text style={styles.deleteButtonText}>{isDeleting ? 'Excluindo...' : 'Excluir'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    sectionContainer: { gap: 0 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.hero, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 2 },
    sectionHeaderPressed: { opacity: 0.85 },
    sectionHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionHeaderTitle: { color: c.heroText, fontSize: 15, fontWeight: '800' },
    countBadge: { backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    countBadgeText: { color: c.accentText, fontSize: 12, fontWeight: '800' },
    chevron: { color: c.heroSubtext, fontSize: 11, fontWeight: '700' },
    sectionBody: { backgroundColor: c.card, borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: c.cardBorder, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    exerciseCard: { borderRadius: 14, padding: 14, backgroundColor: c.cardAlt, gap: 4 },
    exerciseCardEditing: { borderWidth: 2, borderColor: c.accent },
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
