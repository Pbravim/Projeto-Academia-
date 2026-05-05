import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TreinoPrimitives } from '../../../domain/treinos/entities/Treino';

interface Props {
  treinos: TreinoPrimitives[];
  errorMessage: string | null;
  isIniciando: boolean;
  onIniciar: (treinoId: string) => Promise<void>;
}

export function SessaoInicioScreen({ treinos, errorMessage, isIniciando, onIniciar }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Treinar agora</Text>
        <Text style={styles.title}>Comecar treino</Text>
        <Text style={styles.description}>
          Escolha um treino para comecar. Todas as series serao registradas e salvas no historico.
        </Text>
      </View>

      {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

      {treinos.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhum treino cadastrado</Text>
          <Text style={styles.emptyText}>
            Crie um treino na aba Treinos antes de iniciar uma sessao.
          </Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Escolha o treino</Text>
          {treinos.map((treino) => (
            <View key={treino.id} style={styles.treinoCard}>
              <View>
                <Text style={styles.treinoName}>{treino.name}</Text>
                {treino.objetivo ? (
                  <Text style={styles.treinoObjetivo}>{treino.objetivo}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => { void onIniciar(treino.id); }}
                disabled={isIniciando}
                style={({ pressed }) => [
                  styles.iniciarButton,
                  pressed ? styles.iniciarButtonPressed : null,
                  isIniciando ? styles.iniciarButtonDisabled : null,
                ]}
              >
                <Text style={styles.iniciarButtonText}>
                  {isIniciando ? 'Iniciando...' : 'Comecar'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f0e8' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18 },
  heroCard: { backgroundColor: '#20352c', borderRadius: 24, padding: 22, gap: 10 },
  eyebrow: { color: '#b8c9a9', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#f8f4ea', fontSize: 30, fontWeight: '800' },
  description: { color: '#dde7d3', fontSize: 15, lineHeight: 22 },
  errorMessage: { color: '#a1362e', fontSize: 14, fontWeight: '600', paddingHorizontal: 4 },
  emptyCard: { backgroundColor: '#fbf9f2', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#e1dccd', gap: 8 },
  emptyTitle: { color: '#20352c', fontSize: 17, fontWeight: '800' },
  emptyText: { color: '#66725f', fontSize: 14, lineHeight: 20 },
  listCard: { backgroundColor: '#fbf9f2', borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: '#e1dccd' },
  sectionTitle: { color: '#20352c', fontSize: 20, fontWeight: '800' },
  treinoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eef1e7', borderRadius: 16, padding: 16 },
  treinoName: { color: '#20352c', fontSize: 15, fontWeight: '800' },
  treinoObjetivo: { color: '#40584d', fontSize: 13, marginTop: 2 },
  iniciarButton: { backgroundColor: '#c96f2d', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  iniciarButtonPressed: { opacity: 0.85 },
  iniciarButtonDisabled: { opacity: 0.5 },
  iniciarButtonText: { color: '#fff8f2', fontSize: 14, fontWeight: '800' },
});
