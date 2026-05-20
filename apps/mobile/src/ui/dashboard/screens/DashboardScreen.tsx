import { memo, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type DashboardChartMode = 'orm' | 'volume';

import type { DashboardControllerState } from '../hooks/useDashboardController';
import type { EvolucaoPorTreino, SessaoComVolume } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { LineChart } from '../../shared/LineChart';
import { useTheme } from '../../shared/theme';

export function DashboardScreen({
  stats,
  isLoading,
  isResetting,
  isExporting,
  errorMessage,
  onRefresh,
  onReset,
  onExportar,
  onVerEvolucao,
  onVerRecordes,
  onArquivarSessao,
  onDesarquivarSessao,
  onDeletarSessao,
  onArquivarTodasSessoesTreino,
  onDeletarTodasSessoesTreino,
}: DashboardControllerState) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const handleReset = () => {
    Alert.alert(
      'Resetar historico',
      'Isso vai apagar todas as sessoes, series e registros de progresso. Os treinos e exercicios serao mantidos. Essa acao nao pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Resetar', style: 'destructive', onPress: () => { void onReset(); } },
      ]
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.eyebrow}>Evolucao</Text>
          <Pressable
            onPress={onRefresh}
            disabled={isLoading || isResetting}
            style={({ pressed }) => [styles.refreshIconBtn, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={[styles.refreshIconText, (isLoading || isResetting) ? styles.refreshIconLoading : null]}>↺</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.description}>Progresso real por treino, ultimas 10 sessoes de cada.</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => { void onExportar(); }}
          disabled={isExporting || isLoading || isResetting}
          style={({ pressed }) => [styles.exportBtn, pressed ? { opacity: 0.8 } : null, (isExporting || isLoading || isResetting) ? styles.exportBtnDisabled : null]}
        >
          <Text style={styles.exportBtnText}>{isExporting ? 'Exportando...' : 'Exportar CSV'}</Text>
        </Pressable>
        <Pressable
          onPress={handleReset}
          disabled={isResetting || isLoading || isExporting}
          style={({ pressed }) => [styles.resetBtn, pressed ? { opacity: 0.8 } : null, (isResetting || isLoading || isExporting) ? styles.resetBtnDisabled : null]}
        >
          <Text style={styles.resetBtnText}>{isResetting ? 'Resetando...' : 'Resetar historico'}</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={onRefresh} style={({ pressed }) => [styles.refreshBtn, pressed ? { opacity: 0.8 } : null]}>
            <Text style={styles.refreshBtnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <ActivityIndicator size="large" color={c.accent} style={styles.loader} />
      ) : stats ? (
        <>
          {stats.recordesPessoais.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.recordesHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Recordes pessoais</Text>
                  <Text style={styles.helperText}>Melhor 1RM — carga × (1 + reps / 30)</Text>
                </View>
                {stats.recordesPessoais.length > 3 ? (
                  <Pressable
                    onPress={onVerRecordes}
                    style={({ pressed }) => [styles.verTodosBtn, pressed ? { opacity: 0.7 } : null]}
                  >
                    <Text style={styles.verTodosBtnText}>Ver todos</Text>
                  </Pressable>
                ) : null}
              </View>
              {stats.recordesPessoais.slice(0, 3).map((r, i) => (
                <View key={r.exercicioNome} style={styles.recordeRow}>
                  <Text style={[styles.recordeRank, i === 0 ? styles.recordeRank1 : i === 1 ? styles.recordeRank2 : styles.recordeRank3]}>
                    {i + 1}
                  </Text>
                  <Text style={styles.recordeNome} numberOfLines={1}>{r.exercicioNome}</Text>
                  <Text style={styles.recordeValor}>{r.melhorOrmKg} kg</Text>
                </View>
              ))}
              {stats.recordesPessoais.length > 3 ? (
                <Pressable
                  onPress={onVerRecordes}
                  style={({ pressed }) => [styles.verTodosRow, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={styles.verTodosRowText}>+{stats.recordesPessoais.length - 3} exercícios →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {stats.evolucaoPorTreino.length > 0 ? (
            <>
              <Text style={styles.groupLabel}>Evolucao por treino</Text>
              <FlatList
                data={stats.evolucaoPorTreino}
                keyExtractor={(item) => item.treinoNome}
                renderItem={({ item: grupo }) => (
                  <TreinoEvolucaoCard
                    grupo={grupo}
                    onVerEvolucao={() => onVerEvolucao(grupo.treinoId, grupo.treinoNome)}
                    onArquivar={(id) => { void onArquivarSessao(id); }}
                    onDesarquivar={(id) => { void onDesarquivarSessao(id); }}
                    onDeletar={(id) => { void onDeletarSessao(id); }}
                    onArquivarTodas={(ids) => { void onArquivarTodasSessoesTreino(ids); }}
                    onDeletarTodas={(ids) => { void onDeletarTodasSessoesTreino(ids); }}
                  />
                )}
                scrollEnabled={false}
                removeClippedSubviews
                initialNumToRender={4}
                windowSize={5}
              />
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

const TreinoEvolucaoCard = memo(function TreinoEvolucaoCard({
  grupo,
  onVerEvolucao,
  onArquivar,
  onDesarquivar,
  onDeletar,
  onArquivarTodas,
  onDeletarTodas,
}: {
  grupo: EvolucaoPorTreino;
  onVerEvolucao: () => void;
  onArquivar: (id: string) => void;
  onDesarquivar: (id: string) => void;
  onDeletar: (id: string) => void;
  onArquivarTodas: (ids: string[]) => void;
  onDeletarTodas: (ids: string[]) => void;
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [expanded, setExpanded] = useState(false);
  const [arqExpanded, setArqExpanded] = useState(false);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [chartMode, setChartMode] = useState<DashboardChartMode>('orm');

  const sessoes = grupo.sessoes;

  const { temOrm, temVolume, sessaoesAsc, ormChartPoints, volumeChartPoints, trend } = useMemo(() => {
    const hasOrm = sessoes.some((s) => s.melhorOrm > 0);
    const hasVolume = sessoes.some((s) => s.volumeTotal > 0);
    const asc = [...sessoes].reverse();
    const orm = hasOrm
      ? asc
          .map((s) => ({
            value: s.melhorOrm,
            label: new Date(s.dataHoraInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          }))
          .filter((p) => p.value > 0)
      : [];
    const vol = hasVolume
      ? asc.map((s) => ({
          value: s.volumeTotal,
          label: new Date(s.dataHoraInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        }))
      : [];
    const trendVal =
      sessoes.length >= 2 && hasOrm
        ? sessoes[0].melhorOrm > sessoes[1].melhorOrm
          ? 'up'
          : sessoes[0].melhorOrm < sessoes[1].melhorOrm
            ? 'down'
            : 'equal'
        : null;
    return { temOrm: hasOrm, temVolume: hasVolume, sessaoesAsc: asc, ormChartPoints: orm, volumeChartPoints: vol, trend: trendVal };
  }, [sessoes]);

  const activePoints = chartMode === 'orm' ? ormChartPoints : volumeChartPoints;
  const activeColor = chartMode === 'orm' ? undefined : c.success;
  const activeFormat = chartMode === 'orm'
    ? (v: number) => `${v} kg`
    : (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`;

  const handleDeletar = (id: string) => {
    Alert.alert(
      'Excluir sessao',
      'Isso vai apagar permanentemente esta sessao e todas as series registradas. Essa acao nao pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => onDeletar(id) },
      ]
    );
  };

  const handleArquivarTodas = () => {
    const ids = sessoes.map((s) => s.id);
    Alert.alert(
      'Arquivar todas as sessoes',
      `Isso vai arquivar ${ids.length} sessao${ids.length !== 1 ? 'ões' : ''} de "${grupo.treinoNome}". Elas ficam ocultas mas podem ser restauradas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Arquivar todas', onPress: () => onArquivarTodas(ids) },
      ]
    );
  };

  const handleDeletarTodas = () => {
    const ids = [...sessoes.map((s) => s.id), ...grupo.sessoesArquivadas.map((s) => s.id)];
    Alert.alert(
      'Excluir todo o historico',
      `Isso vai apagar permanentemente todas as ${ids.length} sessao${ids.length !== 1 ? 'ões' : ''} de "${grupo.treinoNome}" (incluindo arquivadas). Essa acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir tudo', style: 'destructive', onPress: () => onDeletarTodas(ids) },
      ]
    );
  };

  const handleDeletarArquivadas = () => {
    const ids = grupo.sessoesArquivadas.map((s) => s.id);
    Alert.alert(
      'Excluir sessoes arquivadas',
      `Isso vai apagar permanentemente ${ids.length} sessao${ids.length !== 1 ? 'ões' : ''} arquivada${ids.length !== 1 ? 's' : ''} de "${grupo.treinoNome}". Essa acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => onDeletarTodas(ids) },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Header row — expand area + separate bulk menu button */}
      <View style={styles.treinoHeader}>
        <Pressable
          onPress={() => { setExpanded((v) => !v); setBulkMenuOpen(false); }}
          style={({ pressed }) => [styles.treinoHeaderMain, pressed ? { opacity: 0.7 } : null]}
        >
          <Text style={styles.treinoNome}>{grupo.treinoNome}</Text>
          <Text style={styles.treinoMeta}>{sessoes.length} sessão{sessoes.length !== 1 ? 'ões' : ''}</Text>
        </Pressable>
        <View style={styles.treinoHeaderRight}>
          {trend === 'up' ? <Text style={styles.trendUp}>↑</Text> : null}
          {trend === 'down' ? <Text style={styles.trendDown}>↓</Text> : null}
          {trend === 'equal' ? <Text style={styles.trendEqual}>→</Text> : null}
          <Pressable
            onPress={() => { setBulkMenuOpen((v) => !v); }}
            hitSlop={8}
            style={({ pressed }) => [styles.treinoMenuBtn, bulkMenuOpen ? styles.treinoMenuBtnActive : null, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={[styles.treinoMenuBtnDot, bulkMenuOpen ? styles.treinoMenuBtnDotActive : null]}>•</Text>
            <Text style={[styles.treinoMenuBtnDot, bulkMenuOpen ? styles.treinoMenuBtnDotActive : null]}>•</Text>
            <Text style={[styles.treinoMenuBtnDot, bulkMenuOpen ? styles.treinoMenuBtnDotActive : null]}>•</Text>
          </Pressable>
          <Pressable
            onPress={() => { setExpanded((v) => !v); setBulkMenuOpen(false); }}
            hitSlop={8}
          >
            <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Bulk action menu */}
      {bulkMenuOpen ? (
        <View style={styles.bulkMenu}>
          {sessoes.length > 0 ? (
            <Pressable
              onPress={() => { setBulkMenuOpen(false); handleArquivarTodas(); }}
              style={({ pressed }) => [styles.bulkMenuItem, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={styles.bulkMenuItemText}>Arquivar todas as ativas ({sessoes.length})</Text>
            </Pressable>
          ) : null}
          {grupo.sessoesArquivadas.length > 0 ? (
            <Pressable
              onPress={() => { setBulkMenuOpen(false); handleDeletarArquivadas(); }}
              style={({ pressed }) => [styles.bulkMenuItem, styles.bulkMenuItemDanger, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={[styles.bulkMenuItemText, styles.bulkMenuItemTextDanger]}>
                Excluir arquivadas ({grupo.sessoesArquivadas.length})
              </Text>
            </Pressable>
          ) : null}
          {(sessoes.length + grupo.sessoesArquivadas.length) > 0 ? (
            <Pressable
              onPress={() => { setBulkMenuOpen(false); handleDeletarTodas(); }}
              style={({ pressed }) => [styles.bulkMenuItem, styles.bulkMenuItemDanger, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={[styles.bulkMenuItemText, styles.bulkMenuItemTextDanger]}>
                Excluir todo o historico ({sessoes.length + grupo.sessoesArquivadas.length})
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {(ormChartPoints.length >= 2 || volumeChartPoints.length >= 2) ? (
        <View style={styles.chartSection}>
          <View style={styles.chartToggleRow}>
            {ormChartPoints.length >= 2 ? (
              <Pressable
                onPress={() => setChartMode('orm')}
                style={[styles.chartToggleBtn, chartMode === 'orm' ? styles.chartToggleBtnActive : null]}
              >
                <Text style={[styles.chartToggleBtnText, chartMode === 'orm' ? styles.chartToggleBtnTextActive : null]}>
                  1RM estimado
                </Text>
              </Pressable>
            ) : null}
            {volumeChartPoints.length >= 2 ? (
              <Pressable
                onPress={() => setChartMode('volume')}
                style={[styles.chartToggleBtn, chartMode === 'volume' ? styles.chartToggleBtnActiveVolume : null]}
              >
                <Text style={[styles.chartToggleBtnText, chartMode === 'volume' ? styles.chartToggleBtnTextActive : null]}>
                  Volume
                </Text>
              </Pressable>
            ) : null}
          </View>
          {activePoints.length >= 2 ? (
            <LineChart
              points={activePoints}
              color={activeColor}
              height={110}
              formatValue={activeFormat}
            />
          ) : null}
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.sessoesList}>
          {sessoes.map((s, i) => (
            <SessaoRow
              key={s.id}
              sessao={s}
              prev={sessoes[i + 1] ?? null}
              temVolume={temVolume}
              isFirst={i === 0}
              onArquivar={() => onArquivar(s.id)}
              onDeletar={() => handleDeletar(s.id)}
            />
          ))}
        </View>
      ) : null}

      {/* Archived sessions section */}
      {grupo.sessoesArquivadas.length > 0 ? (
        <View style={styles.arqSection}>
          <Pressable
            onPress={() => setArqExpanded((v) => !v)}
            style={({ pressed }) => [styles.arqToggle, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={styles.arqToggleText}>
              {grupo.sessoesArquivadas.length} sessão{grupo.sessoesArquivadas.length !== 1 ? 'ões' : ''} arquivada{grupo.sessoesArquivadas.length !== 1 ? 's' : ''} {arqExpanded ? '▲' : '▼'}
            </Text>
          </Pressable>
          {arqExpanded ? (
            <View style={styles.sessoesList}>
              {grupo.sessoesArquivadas.map((s) => (
                <SessaoRow
                  key={s.id}
                  sessao={s}
                  prev={null}
                  temVolume={grupo.sessoesArquivadas.some((a) => a.volumeTotal > 0)}
                  isFirst={false}
                  onDesarquivar={() => onDesarquivar(s.id)}
                  onDeletar={() => handleDeletar(s.id)}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Bottom CTA */}
      <Pressable
        onPress={onVerEvolucao}
        style={({ pressed }) => [styles.verEvolucaoBtn, pressed ? styles.verEvolucaoBtnPressed : null]}
      >
        <Text style={styles.verEvolucaoBtnText}>Ver evolução por exercício →</Text>
      </Pressable>
    </View>
  );
});

function SessaoRow({
  sessao,
  prev,
  temVolume,
  isFirst,
  onArquivar,
  onDesarquivar,
  onDeletar,
}: {
  sessao: SessaoComVolume;
  prev: SessaoComVolume | null;
  temVolume: boolean;
  isFirst: boolean;
  onArquivar?: () => void;
  onDesarquivar?: () => void;
  onDeletar: () => void;
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [actionsOpen, setActionsOpen] = useState(false);

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
    <View style={[styles.sessaoRow, isFirst ? styles.sessaoRowFirst : null, sessao.arquivado ? styles.sessaoRowArquivada : null]}>
      <View style={styles.sessaoMainRow}>
        <Text style={[styles.sessaoDataText, { flex: 2 }, sessao.arquivado ? styles.sessaoTextArquivada : null]}>{dataStr}</Text>
        {temVolume ? (
          <View style={[styles.volCell, { flex: 2 }]}>
            <Text style={[styles.sessaoVolText, sessao.arquivado ? styles.sessaoTextArquivada : null]}>
              {sessao.volumeTotal > 0 ? `${sessao.volumeTotal.toLocaleString('pt-BR')}kg` : '—'}
            </Text>
            {volDiff != null ? (
              <Text style={[styles.volDiff, volDiff > 0 ? styles.volDiffUp : volDiff < 0 ? styles.volDiffDown : styles.volDiffEqual]}>
                {volDiff > 0 ? `+${volDiff}` : String(volDiff)}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={[styles.sessaoDurText, { flex: 1 }, sessao.arquivado ? styles.sessaoTextArquivada : null]}>{durStr}</Text>
        <Pressable
          onPress={() => setActionsOpen((v) => !v)}
          hitSlop={8}
          style={({ pressed }) => [styles.sessaoMenuBtn, actionsOpen ? styles.sessaoMenuBtnActive : null, pressed ? { opacity: 0.7 } : null]}
        >
          <Text style={[styles.sessaoMenuDot, actionsOpen ? styles.sessaoMenuDotActive : null]}>•</Text>
          <Text style={[styles.sessaoMenuDot, actionsOpen ? styles.sessaoMenuDotActive : null]}>•</Text>
          <Text style={[styles.sessaoMenuDot, actionsOpen ? styles.sessaoMenuDotActive : null]}>•</Text>
        </Pressable>
      </View>

      {actionsOpen ? (
        <View style={styles.sessaoActions}>
          {onArquivar ? (
            <Pressable
              onPress={() => { setActionsOpen(false); onArquivar(); }}
              style={({ pressed }) => [styles.sessaoActionBtn, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={styles.sessaoActionBtnText}>Arquivar</Text>
            </Pressable>
          ) : null}
          {onDesarquivar ? (
            <Pressable
              onPress={() => { setActionsOpen(false); onDesarquivar(); }}
              style={({ pressed }) => [styles.sessaoActionBtn, styles.sessaoActionBtnRestore, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={[styles.sessaoActionBtnText, styles.sessaoActionBtnRestoreText]}>Restaurar</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => { setActionsOpen(false); onDeletar(); }}
            style={({ pressed }) => [styles.sessaoActionBtn, styles.sessaoActionBtnDelete, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={[styles.sessaoActionBtnText, styles.sessaoActionBtnDeleteText]}>Excluir</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    refreshIconBtn: { padding: 4 },
    refreshIconText: { color: c.heroSubtext, fontSize: 20, fontWeight: '700' },
    refreshIconLoading: { opacity: 0.4 },
    actionRow: { flexDirection: 'row', gap: 10 },
    exportBtn: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.accent },
    exportBtnDisabled: { opacity: 0.5 },
    exportBtnText: { color: c.accent, fontSize: 14, fontWeight: '700' },
    resetBtn: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.error },
    resetBtnDisabled: { opacity: 0.5 },
    resetBtnText: { color: c.error, fontSize: 14, fontWeight: '700' },
    title: { color: c.heroText, fontSize: 30, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 15, lineHeight: 22 },
    loader: { marginTop: 40 },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    helperText: { color: c.textSecondary, fontSize: 12, lineHeight: 17 },
    emptyText: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    errorText: { color: c.error, fontSize: 14, fontWeight: '600' },
    refreshBtn: { backgroundColor: c.hero, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    refreshBtnText: { color: c.heroText, fontSize: 14, fontWeight: '700' },
    recordesHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    verTodosBtn: {
      backgroundColor: c.cardAlt,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
      alignSelf: 'flex-start',
      marginTop: 2,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    verTodosBtnText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    recordeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardAlt,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
    },
    recordeRank: { fontSize: 13, fontWeight: '800', minWidth: 18, textAlign: 'center' },
    recordeRank1: { color: '#d4a017' },
    recordeRank2: { color: c.textSecondary },
    recordeRank3: { color: '#a0522d' },
    recordeNome: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    recordeValor: { color: c.accent, fontSize: 15, fontWeight: '800' },
    verTodosRow: { alignItems: 'center', paddingVertical: 6 },
    verTodosRowText: { color: c.accent, fontSize: 13, fontWeight: '700' },
    groupLabel: { color: c.textLabel, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
    // Treino card header — flex row, main area pressable, buttons separate
    treinoHeader: { flexDirection: 'row', alignItems: 'center' },
    treinoHeaderMain: { flex: 1 },
    treinoNome: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
    treinoMeta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
    treinoHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    trendUp: { color: c.success, fontSize: 16, fontWeight: '800' },
    trendDown: { color: c.error, fontSize: 16, fontWeight: '800' },
    trendEqual: { color: c.textSecondary, fontSize: 16, fontWeight: '800' },
    chevron: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    // Treino card bulk action button
    treinoMenuBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.cardAlt,
    },
    treinoMenuBtnActive: { backgroundColor: c.hero, borderColor: c.hero },
    treinoMenuBtnDot: { color: c.textSecondary, fontSize: 8 },
    treinoMenuBtnDotActive: { color: c.heroText },
    // Bulk action menu
    bulkMenu: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
    },
    bulkMenuItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    bulkMenuItemDanger: { backgroundColor: c.errorBg },
    bulkMenuItemText: { color: c.textPrimary, fontSize: 14, fontWeight: '600' },
    bulkMenuItemTextDanger: { color: c.error },
    // Chart
    chartSection: { gap: 10 },
    chartToggleRow: { flexDirection: 'row', gap: 8 },
    chartToggleBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chartToggleBtnActive: { backgroundColor: c.hero, borderColor: c.hero },
    chartToggleBtnActiveVolume: { backgroundColor: c.successBg, borderColor: c.success },
    chartToggleBtnText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
    chartToggleBtnTextActive: { color: c.heroText },
    // Session list
    sessoesList: { gap: 6 },
    sessaoRow: {
      backgroundColor: c.cardAlt,
      borderRadius: 12,
      overflow: 'hidden',
    },
    sessaoRowFirst: { borderWidth: 1.5, borderColor: c.accent },
    sessaoRowArquivada: { opacity: 0.55 },
    sessaoMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    sessaoDataText: { color: c.textPrimary, fontWeight: '700', fontSize: 13 },
    sessaoTextArquivada: { color: c.textSecondary },
    volCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sessaoVolText: { color: c.textPrimary, fontWeight: '700', fontSize: 13 },
    volDiff: { fontSize: 11, fontWeight: '700' },
    volDiffUp: { color: c.success },
    volDiffDown: { color: c.error },
    volDiffEqual: { color: c.textSecondary },
    sessaoDurText: { color: c.textSecondary, fontSize: 12, textAlign: 'right' },
    // Session row menu button (three-dot pill)
    sessaoMenuBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginLeft: 6,
    },
    sessaoMenuBtnActive: { backgroundColor: c.hero, borderColor: c.hero },
    sessaoMenuDot: { color: c.textSecondary, fontSize: 7 },
    sessaoMenuDotActive: { color: c.heroText },
    // Session row expanded actions
    sessaoActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    sessaoActionBtn: {
      flex: 1,
      paddingVertical: 9,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: c.cardBorder,
    },
    sessaoActionBtnText: { color: c.textSecondary, fontSize: 12, fontWeight: '700' },
    sessaoActionBtnRestore: { backgroundColor: c.successBg },
    sessaoActionBtnRestoreText: { color: c.success },
    sessaoActionBtnDelete: { backgroundColor: c.errorBg, borderRightWidth: 0 },
    sessaoActionBtnDeleteText: { color: c.error },
    // Archived sessions toggle
    arqSection: { gap: 8 },
    arqToggle: { paddingVertical: 6 },
    arqToggleText: { color: c.textSecondary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    // Bottom CTA
    verEvolucaoBtn: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: c.accent,
    },
    verEvolucaoBtnPressed: { opacity: 0.7 },
    verEvolucaoBtnText: { color: c.accent, fontSize: 14, fontWeight: '700' },
  });
}
