import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';
import type { SugestaoTreino } from '../../../application/sessoes/use-cases/SugerirTreinoUseCase';
import { useTheme } from '../../shared/theme';

interface Props {
  treinos: TreinoPrimitives[];
  treinosComExercicios: Set<string>;
  sugestao: SugestaoTreino | null;
  errorMessage: string | null;
  isIniciando: boolean;
  onIniciar: (treinoId: string) => Promise<void>;
  onGoToTreinos?: () => void;
}

function labelUltimaSessao(ultimaSessao: string | null): string {
  if (!ultimaSessao) return 'Nunca feito';
  const dias = Math.floor((Date.now() - new Date(ultimaSessao).getTime()) / 86_400_000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return `Há ${dias} dias`;
}

export function SessaoInicioScreen({ treinos, treinosComExercicios, sugestao, errorMessage, isIniciando, onIniciar, onGoToTreinos }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Treinar agora</Text>
        <Text style={styles.title}>Começar treino</Text>
        <Text style={styles.description}>
          Escolha um treino para começar. Todas as séries serão registradas e salvas no histórico.
        </Text>
      </View>

      {sugestao ? (
        <View style={styles.sugestaoCard}>
          <View style={styles.sugestaoInfo}>
            <Text style={styles.sugestaoLabel}>
              {sugestao.fonte === 'plano' ? 'Planejado para hoje' : 'Sugerido para hoje'}
            </Text>
            <Text style={styles.sugestaoNome} numberOfLines={1}>{sugestao.treino.name}</Text>
            {sugestao.treino.objetivo ? (
              <Text style={styles.sugestaoObjetivo} numberOfLines={1}>{sugestao.treino.objetivo}</Text>
            ) : null}
            <Text style={styles.sugestaoUltimo}>{labelUltimaSessao(sugestao.ultimaSessao)}</Text>
          </View>
          <Pressable
            onPress={() => { void onIniciar(sugestao.treino.id); }}
            disabled={isIniciando || !treinosComExercicios.has(sugestao.treino.id)}
            style={({ pressed }) => [
              styles.sugestaoBtn,
              pressed ? { opacity: 0.85 } : null,
              !treinosComExercicios.has(sugestao.treino.id) ? { opacity: 0.45 } : null,
            ]}
          >
            <Text style={styles.sugestaoBtnText}>Começar</Text>
          </Pressable>
        </View>
      ) : null}

      {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

      {treinos.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhum treino cadastrado</Text>
          <Text style={styles.emptyText}>
            Crie um treino primeiro para poder iniciar uma sessão.
          </Text>
          {onGoToTreinos ? (
            <Pressable
              accessibilityRole="button"
              onPress={onGoToTreinos}
              style={({ pressed }) => [styles.emptyCta, pressed ? { opacity: 0.85 } : null]}
            >
              <Text style={styles.emptyCtaText}>Ir para Treinos</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Escolha o treino</Text>
          {treinos.map((treino) => {
            const semExercicios = !treinosComExercicios.has(treino.id);
            const buttonDisabled = isIniciando || semExercicios;
            return (
              <View key={treino.id} style={styles.treinoCard}>
                <View>
                  <Text style={styles.treinoName}>{treino.name}</Text>
                  {treino.objetivo ? (
                    <Text style={styles.treinoObjetivo}>{treino.objetivo}</Text>
                  ) : null}
                  {semExercicios ? (
                    <Text style={styles.treinoSemExercicios}>Sem exercícios</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => { void onIniciar(treino.id); }}
                  disabled={buttonDisabled}
                  style={({ pressed }) => [
                    styles.iniciarButton,
                    pressed && !buttonDisabled ? styles.iniciarButtonPressed : null,
                    buttonDisabled ? styles.iniciarButtonDisabled : null,
                  ]}
                >
                  <Text style={styles.iniciarButtonText}>
                    {isIniciando ? 'Iniciando...' : 'Começar'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18 },
    sugestaoCard: { backgroundColor: c.card, borderRadius: 20, padding: 18, borderWidth: 2, borderColor: c.accent, flexDirection: 'row', alignItems: 'center', gap: 14 },
    sugestaoInfo: { flex: 1, gap: 2 },
    sugestaoLabel: { color: c.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
    sugestaoNome: { color: c.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 2 },
    sugestaoObjetivo: { color: c.textLabel, fontSize: 13 },
    sugestaoUltimo: { color: c.textSecondary, fontSize: 12, marginTop: 4 },
    sugestaoBtn: { backgroundColor: c.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
    sugestaoBtnText: { color: c.accentText, fontSize: 14, fontWeight: '800' },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 10 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 30, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 15, lineHeight: 22 },
    errorMessage: { color: c.error, fontSize: 14, fontWeight: '600', paddingHorizontal: 4 },
    emptyCard: { backgroundColor: c.card, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: c.cardBorder, gap: 10, alignItems: 'center' },
    emptyTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    emptyText: { color: c.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
    emptyCta: { backgroundColor: c.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
    emptyCtaText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    listCard: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    treinoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.cardAlt, borderRadius: 16, padding: 16 },
    treinoName: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    treinoObjetivo: { color: c.textLabel, fontSize: 13, marginTop: 2 },
    treinoSemExercicios: { color: c.error, fontSize: 12, marginTop: 3 },
    iniciarButton: { backgroundColor: c.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
    iniciarButtonPressed: { opacity: 0.85 },
    iniciarButtonDisabled: { opacity: 0.5 },
    iniciarButtonText: { color: c.accentText, fontSize: 14, fontWeight: '800' },
  });
}
