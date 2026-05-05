import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DashboardControllerState } from '../hooks/useDashboardController';
import type { EvolucaoPorTreino, SessaoComVolume } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';

export function DashboardScreen({ stats, isLoading, errorMessage, onRefresh }: DashboardControllerState) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Evolucao</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.description}>Progresso real por treino, ultimas 10 sessoes de cada.</Text>
      </View>

      {errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={onRefresh} style={({ pressed }) => [styles.refreshBtn, pressed ? { opacity: 0.8 } : null]}>
            <Text style={styles.refreshBtnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <ActivityIndicator size="large" color="#c96f2d" style={styles.loader} />
      ) : stats ? (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Total de sessoes" value={String(stats.totalSessoes)} />
            <StatCard label="Ultimo mes" value={String(stats.sessoesUltimoMes)} />
          </View>

          {stats.recordesPessoais.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recordes pessoais</Text>
              <Text style={styles.helperText}>Melhor 1RM estimado — carga × (1 + reps / 30)</Text>
              {stats.recordesPessoais.map((r) => (
                <View key={r.exercicioNome} style={styles.recordeRow}>
                  <Text style={styles.recordeNome} numberOfLines={1}>{r.exercicioNome}</Text>
                  <Text style={styles.recordeValor}>{r.melhorOrmKg} kg</Text>
                </View>
              ))}
            </View>
          ) : null}

          {stats.evolucaoPorTreino.length > 0 ? (
            <>
              <Text style={styles.groupLabel}>Evolucao por treino</Text>
              {stats.evolucaoPorTreino.map((grupo) => (
                <TreinoEvolucaoCard key={grupo.treinoNome} grupo={grupo} />
              ))}
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Evolucao por treino</Text>
              <Text style={styles.emptyText}>
                Nenhum treino finalizado ainda. Inicie e finalize uma sessao para ver a evolucao aqui.
              </Text>
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function TreinoEvolucaoCard({ grupo }: { grupo: EvolucaoPorTreino }) {
  const [expanded, setExpanded] = useState(true);

  const sessoes = grupo.sessoes;
  const temVolume = sessoes.some((s) => s.volumeTotal > 0);

  // Trend: compare first two (most recent)
  const trend =
    sessoes.length >= 2 && temVolume
      ? sessoes[0].volumeTotal > sessoes[1].volumeTotal
        ? 'up'
        : sessoes[0].volumeTotal < sessoes[1].volumeTotal
          ? 'down'
          : 'equal'
      : null;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.treinoHeader}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.treinoNome}>{grupo.treinoNome}</Text>
          <Text style={styles.treinoMeta}>{sessoes.length} sessao{sessoes.length !== 1 ? 'es' : ''}</Text>
        </View>
        <View style={styles.treinoHeaderRight}>
          {trend === 'up' ? <Text style={styles.trendUp}>↑</Text> : null}
          {trend === 'down' ? <Text style={styles.trendDown}>↓</Text> : null}
          {trend === 'equal' ? <Text style={styles.trendEqual}>→</Text> : null}
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.sessoesList}>
          <View style={styles.sessaoTableHeader}>
            <Text style={[styles.sessaoTableCell, styles.sessaoTableDate]}>Data</Text>
            {temVolume ? <Text style={[styles.sessaoTableCell, styles.sessaoTableVol]}>Volume</Text> : null}
            <Text style={[styles.sessaoTableCell, styles.sessaoTableDur]}>Duracao</Text>
          </View>
          {sessoes.map((s, i) => (
            <SessaoRow key={s.id} sessao={s} prev={sessoes[i + 1] ?? null} temVolume={temVolume} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SessaoRow({
  sessao,
  prev,
  temVolume,
}: {
  sessao: SessaoComVolume;
  prev: SessaoComVolume | null;
  temVolume: boolean;
}) {
  const data = new Date(sessao.dataHoraInicio);
  const dataStr = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const durStr =
    sessao.duracaoMin != null
      ? sessao.duracaoMin >= 60
        ? `${Math.floor(sessao.duracaoMin / 60)}h${sessao.duracaoMin % 60 > 0 ? `${sessao.duracaoMin % 60}m` : ''}`
        : `${sessao.duracaoMin}m`
      : '—';

  const volDiff = prev && temVolume && prev.volumeTotal > 0
    ? sessao.volumeTotal - prev.volumeTotal
    : null;

  return (
    <View style={styles.sessaoRow}>
      <Text style={[styles.sessaoTableCell, styles.sessaoTableDate, styles.sessaoDataText]}>{dataStr}</Text>
      {temVolume ? (
        <View style={[styles.sessaoTableVolContainer, styles.volCell]}>
          <Text style={styles.sessaoVolText}>{sessao.volumeTotal > 0 ? `${sessao.volumeTotal.toLocaleString('pt-BR')}kg` : '—'}</Text>
          {volDiff != null ? (
            <Text style={[styles.volDiff, volDiff > 0 ? styles.volDiffUp : volDiff < 0 ? styles.volDiffDown : styles.volDiffEqual]}>
              {volDiff > 0 ? `+${volDiff}` : String(volDiff)}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Text style={[styles.sessaoTableCell, styles.sessaoTableDur, styles.sessaoDurText]}>{durStr}</Text>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f0e8' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
  heroCard: { backgroundColor: '#20352c', borderRadius: 24, padding: 22, gap: 8 },
  eyebrow: { color: '#b8c9a9', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#f8f4ea', fontSize: 30, fontWeight: '800' },
  description: { color: '#dde7d3', fontSize: 15, lineHeight: 22 },
  loader: { marginTop: 40 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fbf9f2', borderRadius: 20, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#e1dccd' },
  statValue: { color: '#20352c', fontSize: 32, fontWeight: '800' },
  statLabel: { color: '#66725f', fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#fbf9f2', borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: '#e1dccd' },
  sectionTitle: { color: '#20352c', fontSize: 20, fontWeight: '800' },
  helperText: { color: '#66725f', fontSize: 12, lineHeight: 17 },
  emptyText: { color: '#66725f', fontSize: 14, lineHeight: 20 },
  errorText: { color: '#a1362e', fontSize: 14, fontWeight: '600' },
  refreshBtn: { backgroundColor: '#20352c', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  refreshBtnText: { color: '#f8f4ea', fontSize: 14, fontWeight: '700' },
  recordeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef1e7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  recordeNome: { flex: 1, color: '#20352c', fontSize: 14, fontWeight: '700' },
  recordeValor: { color: '#c96f2d', fontSize: 15, fontWeight: '800', marginLeft: 8 },
  groupLabel: { color: '#40584d', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  treinoHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  treinoNome: { color: '#20352c', fontSize: 17, fontWeight: '800' },
  treinoMeta: { color: '#66725f', fontSize: 13, marginTop: 2 },
  treinoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  trendUp: { color: '#2c6b42', fontSize: 16, fontWeight: '800' },
  trendDown: { color: '#a1362e', fontSize: 16, fontWeight: '800' },
  trendEqual: { color: '#66725f', fontSize: 16, fontWeight: '800' },
  chevron: { color: '#8a9486', fontSize: 11, fontWeight: '700' },
  sessoesList: { gap: 4 },
  sessaoTableHeader: { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e1dccd' },
  sessaoTableCell: { fontSize: 12 },
  sessaoTableDate: { flex: 2, color: '#31463d', fontWeight: '700' },
  sessaoTableVol: { flex: 2, color: '#31463d', fontWeight: '700' },
  sessaoTableVolContainer: { flex: 2 },
  sessaoTableDur: { flex: 1, color: '#31463d', fontWeight: '700', textAlign: 'right' },
  sessaoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f0e8' },
  sessaoDataText: { color: '#20352c', fontWeight: '600', fontSize: 13 },
  volCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessaoVolText: { color: '#20352c', fontWeight: '700', fontSize: 13 },
  volDiff: { fontSize: 11, fontWeight: '700' },
  volDiffUp: { color: '#2c6b42' },
  volDiffDown: { color: '#a1362e' },
  volDiffEqual: { color: '#8a9486' },
  sessaoDurText: { color: '#66725f', fontSize: 12 },
});
