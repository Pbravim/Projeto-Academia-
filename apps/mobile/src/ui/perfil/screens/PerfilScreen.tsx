import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import type { PerfilControllerState } from '../hooks/usePerfilController';
import type { PesoControllerState } from '../../peso/hooks/usePesoController';
import type { StatsControllerState } from '../hooks/useStatsController';
import { AderenciaCard } from '../../shared/components/AderenciaCard';
import { LineChart, type LineChartPoint } from '../../shared/LineChart';
import { useTheme, useThemePreference, type ThemePreference } from '../../shared/theme';

// ─── Metric abstraction ──────────────────────────────────────────────────────
// To add a new metric (arm, height, body fat…), push a MetricSeries into the
// metricSeries array built inside PerfilScreen. The chart section renders
// whichever series is active; a tab strip appears automatically once there are
// two or more series.

export interface MetricSeries {
  key: string;
  label: string;
  icon: string;
  points: LineChartPoint[];
  formatValue: (v: number) => string;
  color?: string;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PerfilScreenProps {
  perfil: PerfilControllerState;
  peso: PesoControllerState;
  statsState: StatsControllerState;
  isExporting: boolean;
  isResetting: boolean;
  onExportar: () => Promise<void>;
  onReset: () => Promise<void>;
}

const THEME_OPTIONS: { value: ThemePreference; icon: string; label: string }[] = [
  { value: 'system', icon: '⊙', label: 'Auto' },
  { value: 'light',  icon: '☀', label: 'Claro' },
  { value: 'dark',   icon: '🌙', label: 'Escuro' },
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricTabs({
  series,
  activeKey,
  onSelect,
  styles,
  c,
}: {
  series: MetricSeries[];
  activeKey: string;
  onSelect: (key: string) => void;
  styles: ReturnType<typeof makeStyles>;
  c: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.metricTabs}>
      {series.map((s) => {
        const active = s.key === activeKey;
        return (
          <Pressable
            key={s.key}
            onPress={() => onSelect(s.key)}
            style={({ pressed }) => [
              styles.metricTab,
              active ? styles.metricTabActive : null,
              pressed && !active ? styles.metricTabPressed : null,
            ]}
          >
            <Text style={styles.metricTabIcon}>{s.icon}</Text>
            <Text style={[styles.metricTabLabel, active ? { color: c.accentText } : null]}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function PerfilScreen({
  perfil,
  peso,
  statsState,
  isExporting,
  isResetting,
  onExportar,
  onReset,
}: PerfilScreenProps) {
  const c = useTheme();
  const { preference, setPreference } = useThemePreference();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPesoOpen, setIsPesoOpen] = useState(false);
  const [activeMetricKey, setActiveMetricKey] = useState('peso');
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null);
  const nameInputRef = useRef<TextInput>(null);

  // ── Metric series ────────────────────────────────────────────────────────
  const metricSeries = useMemo<MetricSeries[]>(() => {
    const series: MetricSeries[] = [];
    if (peso.viewModel.chartPoints.length >= 2) {
      series.push({
        key: 'peso',
        label: 'Peso',
        icon: '⚖',
        points: peso.viewModel.chartPoints.map((p) => ({ value: p.pesoKg, label: p.label })),
        formatValue: (v) => `${v % 1 === 0 ? String(v) : v.toFixed(1)} kg`,
      });
    }
    // Future: push braco, altura, etc.
    return series;
  }, [peso.viewModel.chartPoints]);

  const activeSeries = metricSeries.find((s) => s.key === activeMetricKey) ?? metricSeries[0];

  // ── Derived stats ────────────────────────────────────────────────────────
  const { stats } = statsState;
  const treinoFavorito = stats?.evolucaoPorTreino.reduce(
    (best, t) => (t.sessoes.length > (best?.sessoes.length ?? 0) ? t : best),
    null as (typeof stats.evolucaoPorTreino)[0] | null,
  ) ?? null;
  const topRecord = stats?.recordesPessoais[0] ?? null;

  // ── Date helpers ─────────────────────────────────────────────────────────
  const now = new Date();
  const isToday = now.toDateString() === peso.selectedDate.toDateString();
  const timeStr = peso.selectedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateLabel =
    (isToday
      ? 'Hoje'
      : peso.selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })) +
    ', ' + timeStr;

  const startEditingName = () => {
    setNameInput(perfil.displayName);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const commitName = () => {
    setIsEditingName(false);
    void perfil.onSaveName(nameInput);
  };

  const handleReset = () => {
    Alert.alert(
      'Apagar historico',
      'Isso vai apagar todas as sessoes, series e registros de progresso. Os treinos e exercicios serao mantidos. Essa acao nao pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: () => { void onReset(); } },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* ── Hero ── */}
      <View style={styles.heroCard}>
        <View style={styles.avatarRow}>

          {/* Avatar com foto ou iniciais */}
          <Pressable
            onPress={perfil.onPickPhoto}
            style={({ pressed }) => [styles.avatarWrapper, pressed ? { opacity: 0.8 } : null]}
            accessibilityLabel="Alterar foto de perfil"
          >
            {perfil.photoUri ? (
              <Image source={{ uri: perfil.photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(perfil.displayName)}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeIcon}>📷</Text>
            </View>
          </Pressable>

          <View style={styles.nameBlock}>
            {isEditingName ? (
              <TextInput
                ref={nameInputRef}
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                onBlur={commitName}
                onSubmitEditing={commitName}
                returnKeyType="done"
                placeholder="Seu nome"
                placeholderTextColor={c.heroSubtext}
                autoFocus
              />
            ) : (
              <Pressable onPress={startEditingName} style={styles.nameRow}>
                <Text style={styles.nameText}>{perfil.displayName || 'Seu nome'}</Text>
                <Text style={styles.editIcon}>✏️</Text>
              </Pressable>
            )}

            {peso.viewModel.pesoAtual ? (
              <Text style={styles.pesoAtualBadge}>⚖ {peso.viewModel.pesoAtual}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => setIsConfigOpen((v) => !v)}
            style={({ pressed }) => [
              styles.gearButton,
              isConfigOpen ? styles.gearButtonActive : null,
              pressed ? styles.gearButtonPressed : null,
            ]}
            accessibilityLabel="Configuracoes"
          >
            <Text style={styles.gearIcon}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Configuracoes ── */}
      {isConfigOpen ? (
        <View style={[styles.card, styles.configCard]}>
          <View style={styles.configTitleRow}>
            <Text style={styles.cardTitle}>Configuracoes</Text>
            <View style={styles.configActiveDot} />
          </View>

          {/* Tema */}
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Tema</Text>
            <View style={styles.themeTrack}>
              {THEME_OPTIONS.map((opt) => {
                const active = preference === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPreference(opt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={opt.label}
                    style={({ pressed }) => [
                      styles.themeOption,
                      active ? styles.themeOptionActive : null,
                      pressed && !active ? styles.themeOptionPressed : null,
                    ]}
                  >
                    <Text style={styles.themeIcon}>{opt.icon}</Text>
                    <Text style={[styles.themeOptionLabel, active ? styles.themeOptionLabelActive : null]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.configDivider} />

          {/* Acoes de dados */}
          <Text style={styles.configSectionLabel}>Dados</Text>
          <View style={styles.configActionsRow}>
            <Pressable
              onPress={() => { void onExportar(); }}
              disabled={isExporting || isResetting}
              style={({ pressed }) => [
                styles.configActionBtn,
                pressed ? styles.configActionBtnPressed : null,
                (isExporting || isResetting) ? styles.configActionBtnDisabled : null,
              ]}
            >
              <Text style={styles.configActionBtnText}>
                {isExporting ? 'Exportando...' : 'Exportar CSV'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleReset}
              disabled={isResetting || isExporting}
              style={({ pressed }) => [
                styles.configActionBtn,
                styles.configActionBtnDanger,
                pressed ? styles.configActionBtnPressed : null,
                (isResetting || isExporting) ? styles.configActionBtnDisabled : null,
              ]}
            >
              <Text style={[styles.configActionBtnText, styles.configActionBtnTextDanger]}>
                {isResetting ? 'Apagando...' : 'Apagar historico'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ── Estatisticas ── */}
      {statsState.isLoading ? null : stats ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estatisticas</Text>

          <View style={styles.statsPills}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.totalSessoes}</Text>
              <Text style={styles.statLabel}>Sessoes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.sessoesUltimoMes}</Text>
              <Text style={styles.statLabel}>Este mes</Text>
            </View>
          </View>

          {(treinoFavorito || topRecord) ? <View style={styles.statsSeparator} /> : null}

          {treinoFavorito ? (
            <View style={styles.statsRow}>
              <Text style={styles.statsRowIcon}>🏆</Text>
              <View style={styles.statsRowInfo}>
                <Text style={styles.statsRowLabel}>Treino favorito</Text>
                <Text style={styles.statsRowValue} numberOfLines={1}>
                  {treinoFavorito.treinoNome}
                  <Text style={styles.statsRowMeta}> · {treinoFavorito.sessoes.length} sessoes</Text>
                </Text>
              </View>
            </View>
          ) : null}

          {topRecord ? (
            <View style={styles.statsRow}>
              <Text style={styles.statsRowIcon}>💪</Text>
              <View style={styles.statsRowInfo}>
                <Text style={styles.statsRowLabel}>Melhor recorde</Text>
                <Text style={styles.statsRowValue} numberOfLines={1}>
                  {topRecord.exercicioNome}
                  <Text style={styles.statsRowMeta}> · {topRecord.melhorOrmKg}kg</Text>
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Aderencia ── */}
      {stats ? (
        <AderenciaCard
          semanal={stats.aderenciaSemanal}
          mensal={stats.aderenciaMensal}
          anual={stats.aderenciaAnual}
        />
      ) : null}

      {/* ── Evolucao ── */}
      {metricSeries.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evolucao do Peso</Text>
          {metricSeries.length > 1 ? (
            <MetricTabs
              series={metricSeries}
              activeKey={activeMetricKey}
              onSelect={setActiveMetricKey}
              styles={styles}
              c={c}
            />
          ) : null}
          {activeSeries ? (
            <LineChart
              points={activeSeries.points}
              formatValue={activeSeries.formatValue}
              color={activeSeries.color}
            />
          ) : null}
        </View>
      ) : null}

      {/* ── Medidas ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medidas</Text>

        <Pressable
          onPress={() => setIsPesoOpen((v) => !v)}
          style={({ pressed }) => [styles.medicaoRow, pressed ? styles.medicaoRowPressed : null]}
        >
          <Text style={styles.medicaoIcon}>⚖</Text>
          <View style={styles.medicaoInfo}>
            <Text style={styles.medicaoLabel}>Peso</Text>
            {peso.viewModel.pesoAtual ? (
              <Text style={styles.medicaoValor}>{peso.viewModel.pesoAtual}</Text>
            ) : (
              <Text style={styles.medicaoVazio}>Nenhum registro</Text>
            )}
          </View>
          <Text style={styles.medicaoChevron}>{isPesoOpen ? '▼' : '▶'}</Text>
        </Pressable>

        {isPesoOpen ? (
          <>
            <View style={styles.medicaoDivider} />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Peso (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 80.5"
                placeholderTextColor={c.inputPlaceholder}
                value={peso.pesoKgInput}
                onChangeText={peso.onChangePesoKg}
                keyboardType="decimal-pad"
                editable={!peso.isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Observacao (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Em jejum"
                placeholderTextColor={c.inputPlaceholder}
                value={peso.observacaoInput}
                onChangeText={peso.onChangeObservacao}
                editable={!peso.isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Data e hora</Text>
              <Pressable
                onPress={() => setPickerStep('date')}
                style={styles.dateTrigger}
                disabled={peso.isSubmitting}
              >
                <Text style={[styles.dateTriggerText, !isToday ? styles.dateTriggerTextPast : null]}>
                  {dateLabel}
                </Text>
                <Text style={styles.dateCalIcon}>📅</Text>
              </Pressable>

              {pickerStep !== null ? (
                Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={peso.selectedDate}
                    mode="datetime"
                    display="spinner"
                    maximumDate={now}
                    onChange={(_event, date) => { if (date) peso.onChangeDate(date); }}
                  />
                ) : (
                  <DateTimePicker
                    value={peso.selectedDate}
                    mode={pickerStep}
                    display="default"
                    maximumDate={pickerStep === 'date' ? now : undefined}
                    onChange={(_event, date) => {
                      if (!date) { setPickerStep(null); return; }
                      peso.onChangeDate(date);
                      setPickerStep(pickerStep === 'date' ? 'time' : null);
                    }}
                  />
                )
              ) : null}
            </View>

            {peso.errorMessage ? <Text style={styles.errorMessage}>{peso.errorMessage}</Text> : null}
            {peso.feedbackMessage ? <Text style={styles.successMessage}>{peso.feedbackMessage}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => { void peso.onSubmit(); }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryButtonPressed : null,
                peso.isSubmitting ? styles.primaryButtonDisabled : null,
              ]}
              disabled={peso.isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {peso.isSubmitting ? 'Salvando...' : 'Registrar'}
              </Text>
            </Pressable>

            {!peso.isLoading && !peso.viewModel.emptyStateMessage && peso.viewModel.cards.length > 0 ? (
              <>
                <View style={styles.medicaoDivider} />
                <Text style={styles.subSectionTitle}>Historico</Text>
                {peso.viewModel.cards.map((card) => (
                  <View key={card.id} style={styles.registroCard}>
                    <View style={styles.registroMain}>
                      <View>
                        <Text style={styles.registroPeso}>{card.peso}</Text>
                        <Text style={styles.registroData}>{card.data}</Text>
                        {card.observacao ? (
                          <Text style={styles.registroObservacao}>{card.observacao}</Text>
                        ) : null}
                      </View>
                      <View style={styles.registroRight}>
                        {card.delta ? (
                          <Text style={[styles.registroDelta, card.deltaPositivo ? styles.deltaNegativo : styles.deltaPositivo]}>
                            {card.delta}
                          </Text>
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => { void peso.onDelete(card.id); }}
                          disabled={peso.deletingId !== null}
                          style={({ pressed }) => [
                            styles.deleteButton,
                            pressed ? styles.deleteButtonPressed : null,
                            peso.deletingId === card.id ? styles.deleteButtonLoading : null,
                          ]}
                        >
                          <Text style={styles.deleteButtonText}>
                            {peso.deletingId === card.id ? 'Excluindo...' : 'Excluir'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : peso.isLoading ? (
              <ActivityIndicator size="small" color={c.accent} style={styles.loading} />
            ) : null}
          </>
        ) : null}
      </View>

    </ScrollView>
  );
}

function PesoLineChart({ points }: { points: LineChartPoint[] }) {
  return (
    <LineChart
      points={points}
      formatValue={(v) => `${v % 1 === 0 ? String(v) : v.toFixed(1)} kg`}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18 },

    // ── Hero ──
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22 },
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarWrapper: { width: 72, height: 72, position: 'relative' },
    avatar: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarText: { color: c.accentText, fontSize: 26, fontWeight: '800' },
    avatarEditBadge: {
      position: 'absolute', bottom: 0, right: 0,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: c.hero,
    },
    avatarEditBadgeIcon: { fontSize: 11 },
    nameBlock: { flex: 1, gap: 6 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nameText: { color: c.heroText, fontSize: 20, fontWeight: '800', flexShrink: 1 },
    editIcon: { fontSize: 15 },
    nameInput: {
      color: c.heroText, fontSize: 20, fontWeight: '800',
      borderBottomWidth: 1, borderBottomColor: c.heroSubtext, paddingVertical: 2,
    },
    pesoAtualBadge: { color: c.heroSubtext, fontSize: 14, fontWeight: '600' },
    gearButton: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: 'transparent',
    },
    gearButtonActive: { backgroundColor: c.accent, borderColor: c.accentText + '30' },
    gearButtonPressed: { opacity: 0.65 },
    gearIcon: { fontSize: 18 },

    // ── Cards (base) ──
    card: {
      backgroundColor: c.card, borderRadius: 24, padding: 20,
      gap: 14, borderWidth: 1.5, borderColor: c.cardBorder,
    },
    cardTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },

    // ── Config ──
    configCard: { borderColor: c.accent, backgroundColor: c.accentLight },
    configTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    configActiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent, marginTop: 2 },
    configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    configLabel: { color: c.textLabel, fontSize: 14, fontWeight: '700' },
    configDivider: { height: 1, backgroundColor: c.cardBorder },
    configSectionLabel: {
      color: c.textLabel, fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    configActionsRow: { flexDirection: 'row', gap: 10 },
    configActionBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 12,
      alignItems: 'center', backgroundColor: c.card,
      borderWidth: 1, borderColor: c.cardBorder,
    },
    configActionBtnDanger: { borderColor: c.error, backgroundColor: c.errorBg },
    configActionBtnPressed: { opacity: 0.7 },
    configActionBtnDisabled: { opacity: 0.4 },
    configActionBtnText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
    configActionBtnTextDanger: { color: c.error },

    themeTrack: {
      flexDirection: 'row', backgroundColor: c.cardBorder,
      borderRadius: 10, padding: 3, gap: 2,
    },
    themeOption: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7,
    },
    themeOptionActive: { backgroundColor: c.accent },
    themeOptionPressed: { opacity: 0.5 },
    themeIcon: { fontSize: 13 },
    themeOptionLabel: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    themeOptionLabelActive: { color: c.accentText },

    // ── Stats ──
    statsPills: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    statPill: { flex: 1, alignItems: 'center', gap: 4 },
    statDivider: { width: 1, height: 36, backgroundColor: c.cardBorder },
    statValue: { color: c.textPrimary, fontSize: 28, fontWeight: '800' },
    statLabel: {
      color: c.textSecondary, fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    statsSeparator: { height: 1, backgroundColor: c.cardBorder },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statsRowIcon: { fontSize: 22, width: 28, textAlign: 'center' },
    statsRowInfo: { flex: 1, gap: 2 },
    statsRowLabel: { color: c.textLabel, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    statsRowValue: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    statsRowMeta: { color: c.textSecondary, fontWeight: '400' },

    // ── Metric tabs ──
    metricTabs: { flexDirection: 'row', gap: 8 },
    metricTab: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
      backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.cardBorder,
    },
    metricTabActive: { backgroundColor: c.accent, borderColor: c.accent },
    metricTabPressed: { opacity: 0.6 },
    metricTabIcon: { fontSize: 13 },
    metricTabLabel: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },

    // ── Medidas ──
    medicaoRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.cardAlt, borderRadius: 16, padding: 14, gap: 12,
    },
    medicaoRowPressed: { opacity: 0.7 },
    medicaoIcon: { fontSize: 22, width: 28, textAlign: 'center' },
    medicaoInfo: { flex: 1, gap: 2 },
    medicaoLabel: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
    medicaoValor: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    medicaoVazio: { color: c.textMeta, fontSize: 13 },
    medicaoChevron: { color: c.textSecondary, fontSize: 12 },
    medicaoDivider: { height: 1, backgroundColor: c.cardBorder },
    subSectionTitle: {
      color: c.textLabel, fontSize: 13, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
    },

    // ── Form ──
    field: { gap: 6 },
    fieldLabel: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    input: {
      minHeight: 48, borderRadius: 14, borderWidth: 1,
      borderColor: c.inputBorder, backgroundColor: c.inputBg,
      paddingHorizontal: 14, color: c.inputText, fontSize: 15,
    },
    dateTrigger: {
      height: 48, borderRadius: 14, borderWidth: 1,
      borderColor: c.inputBorder, backgroundColor: c.inputBg,
      paddingHorizontal: 14, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-between',
    },
    dateTriggerText: { color: c.inputText, fontSize: 15 },
    dateTriggerTextPast: { color: c.accent, fontWeight: '700' },
    dateCalIcon: { fontSize: 18 },
    errorMessage: { color: c.error, fontSize: 14, fontWeight: '600' },
    successMessage: { color: c.success, fontSize: 14, fontWeight: '600' },
    primaryButton: {
      minHeight: 50, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent,
    },
    primaryButtonPressed: { opacity: 0.9 },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    loading: { marginVertical: 12 },

    // ── Historico ──
    registroCard: { backgroundColor: c.cardAlt, borderRadius: 16, padding: 14 },
    registroMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    registroPeso: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    registroData: { color: c.textLabel, fontSize: 13, fontWeight: '600', marginTop: 2 },
    registroObservacao: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    registroRight: { alignItems: 'flex-end', gap: 8 },
    registroDelta: { fontSize: 14, fontWeight: '700' },
    deltaPositivo: { color: c.success },
    deltaNegativo: { color: c.error },
    deleteButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: c.errorBg },
    deleteButtonLoading: { opacity: 0.5 },
    deleteButtonPressed: { opacity: 0.75 },
    deleteButtonText: { color: c.error, fontSize: 12, fontWeight: '700' },
  });
}
