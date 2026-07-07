import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SessaoAtivaControllerState } from '../hooks/useSessaoAtivaController';
import type { SessaoExercicioComSeries } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { Image } from 'expo-image';

import { ExercicioCard } from '../components/ExercicioCard';
import { AddExercicioSection } from '../components/AddExercicioSection';
import { ExercicioDetalheScreen } from './ExercicioDetalheScreen';
import { BiSetDetalheScreen } from './BiSetDetalheScreen';
import { SubstituirExercicioModal } from '../components/SubstituirExercicioModal';
import { ExerciseMediaViewer } from '../../exercises/components/ExerciseMediaViewer';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { resolveThumbSource } from '../../shared/exerciseMedia';
import { METODO_CONFIG, metodoLabel } from '../../shared/metodoPresentation';
import { useTheme } from '../../shared/theme';
import { useLocale, useT } from '../../shared/i18n';
import { translate, type AppLocale } from '../../shared/i18n/core';
import { formatTime } from '../../shared/i18n/formatters';

function grupoLabelFor(metodo: string, count: number, locale: AppLocale): string {
  if (count === 2) return translate(locale, 'sessao.grupo.biSet');
  if (count === 3) return translate(locale, 'sessao.grupo.triSet');
  if (count > 3) return translate(locale, 'sessao.grupo.circuito');
  return metodo in METODO_CONFIG ? metodoLabel(metodo as keyof typeof METODO_CONFIG, locale) : metodo;
}

function grupoColorFor(metodo: string, count: number): string {
  if (count === 2) return '#16a34a';
  if (count === 3) return '#ea580c';
  if (count > 3) return '#0891b2';
  return METODO_CONFIG[metodo as keyof typeof METODO_CONFIG]?.color ?? '#666';
}

interface Grupo {
  grupoId: string | null;
  metodo: string;
  itens: SessaoExercicioComSeries[];
}

function agruparExercicios(exercicios: SessaoExercicioComSeries[]): Grupo[] {
  const grupos: Grupo[] = [];
  const grupoMap = new Map<string, Grupo>();

  for (const item of exercicios) {
    const { grupoId, metodo } = item.sessaoExercicio;
    if (!grupoId) {
      grupos.push({ grupoId: null, metodo: 'normal', itens: [item] });
    } else if (grupoMap.has(grupoId)) {
      grupoMap.get(grupoId)!.itens.push(item);
    } else {
      const grupo: Grupo = { grupoId, metodo: metodo ?? 'normal', itens: [item] };
      grupoMap.set(grupoId, grupo);
      grupos.push(grupo);
    }
  }
  return grupos;
}

export function SessaoAtivaScreen({
  detalhe,
  sugestoes,
  availableExercises,
  showAddExercise,
  errorMessage,
  isFinalizing,
  isCanceling,
  temSerieValida,
  candidatosSubstituicao,
  sessaoExercicioSubstituindo,
  onRegistrarSerie,
  onRegistrarSeriesEmLote,
  onDeleteSerie,
  onUpdateSerie,
  onToggleRealizado,
  onToggleRealizadoGrupo,
  onDeleteSeries,
  onAddExercicio,
  onToggleShowAddExercise,
  onFinalizar,
  onCancelar,
  onAbrirSubstituicao,
  onConfirmarSubstituicao,
  onFecharSubstituicao,
  onAtualizarMetodo,
}: SessaoAtivaControllerState) {
  const c = useTheme();
  const locale = useLocale();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [selectedExercicioId, setSelectedExercicioId] = useState<string | null>(null);
  const [mediaViewerItem, setMediaViewerItem] = useState<{ nome: string; mediaLocal: string | null } | null>(null);
  const [confirmCancelarVisible, setConfirmCancelarVisible] = useState(false);
  const [confirmConcluirGrupo, setConfirmConcluirGrupo] = useState<Grupo | null>(null);

  const handleConcluirExercicio = async (item: SessaoExercicioComSeries) => {
    const { sessaoExercicio, series } = item;
    const validCount = series.length;
    const recomendadas = sessaoExercicio.seriesRecomendadas ?? 0;
    const missing = Math.max(0, recomendadas - validCount);
    if (missing > 0) {
      const inputs = Array.from({ length: missing }, () => ({
        sessaoExercicioId: sessaoExercicio.id,
        cargaKg: sessaoExercicio.cargaPadrao ?? 0,
        repeticoes: sessaoExercicio.execucoesRecomendadas ?? 1,
        observacao: '',
      }));
      await onRegistrarSeriesEmLote(inputs);
    }
    await onToggleRealizado(sessaoExercicio.id);
  };

  const handleConcluirGrupo = async (grupo: Grupo) => {
    const allRealizado = grupo.itens.every((i) => i.sessaoExercicio.realizado);
    const toToggle = allRealizado
      ? grupo.itens.map((i) => i.sessaoExercicio.id)
      : grupo.itens.filter((i) => !i.sessaoExercicio.realizado).map((i) => i.sessaoExercicio.id);

    if (!allRealizado) {
      const allInputs = grupo.itens.flatMap((item) => {
        if (item.sessaoExercicio.realizado) return [];
        const validCount = item.series.length;
        const recomendadas = item.sessaoExercicio.seriesRecomendadas ?? 0;
        const missing = Math.max(0, recomendadas - validCount);
        return Array.from({ length: missing }, () => ({
          sessaoExercicioId: item.sessaoExercicio.id,
          cargaKg: item.sessaoExercicio.cargaPadrao ?? 0,
          repeticoes: item.sessaoExercicio.execucoesRecomendadas ?? 1,
          observacao: '',
        }));
      });
      if (allInputs.length > 0) await onRegistrarSeriesEmLote(allInputs);
    }
    await onToggleRealizadoGrupo(toToggle);
  };

  const handleCancelar = () => {
    setConfirmCancelarVisible(true);
  };

  if (!detalhe) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('sessao.ativa.carregando')}</Text>
      </View>
    );
  }

  if (selectedExercicioId) {
    const item = detalhe.exercicios.find((e) => e.sessaoExercicio.id === selectedExercicioId);
    if (item) {
      const exercicioIds = detalhe.exercicios.map((e) => e.sessaoExercicio.id);
      const currentIndex = exercicioIds.indexOf(selectedExercicioId);

      const grupoId = item.sessaoExercicio.grupoId;
      const grupoItens = grupoId
        ? detalhe.exercicios.filter((e) => e.sessaoExercicio.grupoId === grupoId)
        : null;
      const isInGrupo = grupoItens && grupoItens.length > 1;

      // For groups, "next" skips past all group members
      const effectiveLastIndex = isInGrupo
        ? grupoItens.reduce((max, gi) => Math.max(max, exercicioIds.indexOf(gi.sessaoExercicio.id)), currentIndex)
        : currentIndex;
      const isLastExercicio = effectiveLastIndex === exercicioIds.length - 1;
      const handleProximoExercicio = () => {
        const nextId = exercicioIds[effectiveLastIndex + 1];
        if (nextId) setSelectedExercicioId(nextId);
      };

      if (isInGrupo) {
        const color = grupoColorFor(item.sessaoExercicio.metodo, grupoItens.length);
        const grupoIds = grupoItens.map((gi) => gi.sessaoExercicio.id);
        return (
          <>
            <BiSetDetalheScreen
              grupoItens={grupoItens}
              grupoColor={color}
              sugestoes={sugestoes}
              isLastExercicio={isLastExercicio}
              canFinalizar={temSerieValida}
              onRegistrarSeriesEmLote={onRegistrarSeriesEmLote}
              onDeleteSeries={onDeleteSeries}
              onToggleRealizadoGrupo={onToggleRealizadoGrupo}
              onAbrirSubstituicao={onAbrirSubstituicao}
              onAtualizarMetodo={onAtualizarMetodo}
              onProximoExercicio={handleProximoExercicio}
              onFinalizarSessao={() => { void onFinalizar(); }}
              onBack={() => setSelectedExercicioId(null)}
            />
            <SubstituirExercicioModal
              visible={sessaoExercicioSubstituindo != null && grupoIds.includes(sessaoExercicioSubstituindo)}
              candidatos={candidatosSubstituicao}
              onConfirmar={(novoId, motivo) => {
                void onConfirmarSubstituicao(novoId, motivo);
                setSelectedExercicioId(null);
              }}
              onFechar={onFecharSubstituicao}
            />
          </>
        );
      }

      return (
        <>
          <ExercicioDetalheScreen
            sessaoExercicio={item.sessaoExercicio}
            series={item.series}
            sugestao={sugestoes[selectedExercicioId] ?? null}
            isLastExercicio={isLastExercicio}
            canFinalizar={temSerieValida}
            mediaOnline={item.mediaOnline}
            mediaLocal={item.mediaLocal}
            onRegistrarSerie={onRegistrarSerie}
            onRegistrarSeriesEmLote={onRegistrarSeriesEmLote}
            onDeleteSerie={onDeleteSerie}
            onUpdateSerie={onUpdateSerie}
            onToggleRealizado={onToggleRealizado}
            onAbrirSubstituicao={onAbrirSubstituicao}
            onAtualizarMetodo={onAtualizarMetodo}
            onProximoExercicio={handleProximoExercicio}
            onFinalizarSessao={() => { void onFinalizar(); }}
            onBack={() => setSelectedExercicioId(null)}
          />
          <SubstituirExercicioModal
            visible={sessaoExercicioSubstituindo === selectedExercicioId}
            candidatos={candidatosSubstituicao}
            onConfirmar={(novoId, motivo) => {
              void onConfirmarSubstituicao(novoId, motivo);
              setSelectedExercicioId(null);
            }}
            onFechar={onFecharSubstituicao}
          />
        </>
      );
    }
  }

  const horaInicio = formatTime(detalhe.sessao.dataHoraInicio, locale);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('sessao.ativa.emAndamento')}</Text>
        <Text style={styles.title}>{detalhe.sessao.treinoNomeSnapshot}</Text>
        <Text style={styles.description}>{t('sessao.ativa.inicio', { hora: horaInicio })}</Text>
      </View>

      {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

      {agruparExercicios(detalhe.exercicios).map((grupo, gi) => {
        if (grupo.grupoId === null) {
          const item = grupo.itens[0];
          return (
            <ExercicioCard
              key={item.sessaoExercicio.id}
              sessaoExercicio={item.sessaoExercicio}
              series={item.series}
              mediaLocal={item.mediaLocal}
              onPress={() => setSelectedExercicioId(item.sessaoExercicio.id)}
              onToggleRealizado={() => { void handleConcluirExercicio(item); }}
            />
          );
        }

        const color = grupoColorFor(grupo.metodo, grupo.itens.length);
        const label = grupoLabelFor(grupo.metodo, grupo.itens.length, locale);
        const allRealizado = grupo.itens.every((i) => i.sessaoExercicio.realizado);
        const recSeries = grupo.itens[0]?.sessaoExercicio.seriesRecomendadas ?? null;
        const minValidSeries = recSeries != null
          ? Math.min(...grupo.itens.map((i) => i.series.length))
          : null;
        const grupoAllDone = recSeries != null && minValidSeries != null && minValidSeries >= recSeries;

        return (
          <Pressable
            key={grupo.grupoId ?? gi}
            onPress={() => setSelectedExercicioId(grupo.itens[0].sessaoExercicio.id)}
            style={({ pressed }) => [styles.grupoCard, { borderColor: color }, allRealizado ? styles.grupoCardRealizado : null, pressed ? { opacity: 0.8 } : null]}
          >
            {/* Colored header — label only */}
            <View style={[styles.grupoHeader, { backgroundColor: color }]}>
              <Text style={styles.grupoHeaderText}>{label}</Text>
            </View>

            {/* Exercise list | progress | checkbox | arrow — all vertically centered, mirroring ExercicioCard */}
            <View style={styles.grupoBody}>
              <View style={styles.grupoExercicios}>
                {grupo.itens.map((item, idx) => {
                  const grupoThumb = resolveThumbSource(item.mediaLocal, item.sessaoExercicio.exercicioId);
                  return (
                  <View key={item.sessaoExercicio.id}>
                    {idx > 0 ? <View style={styles.grupoItemDivider} /> : null}
                    <View style={styles.grupoItemRow}>
                      {grupoThumb ? (
                        <Pressable
                          hitSlop={4}
                          onPress={(e) => { e.stopPropagation(); setMediaViewerItem({ nome: item.sessaoExercicio.nomeSnapshot, mediaLocal: item.mediaLocal ?? null }); }}
                        >
                          <Image source={grupoThumb} style={styles.grupoItemThumb} contentFit="cover" autoplay={false} />
                          <View style={styles.grupoItemThumbOverlay}>
                            <Text style={styles.grupoItemThumbIcon}>▶</Text>
                          </View>
                        </Pressable>
                      ) : null}
                      <View style={styles.grupoItemInfo}>
                        <View style={styles.grupoItemNameRow}>
                          <Text style={styles.grupoItemNome}>{item.sessaoExercicio.nomeSnapshot}</Text>
                          {item.sessaoExercicio.metodo !== 'normal' ? (
                            <View style={[styles.grupoItemTecnicaBadge, { backgroundColor: METODO_CONFIG[item.sessaoExercicio.metodo].color }]}>
                              <Text style={styles.grupoItemTecnicaBadgeText}>{metodoLabel(item.sessaoExercicio.metodo, locale)}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.grupoItemMeta}>{item.sessaoExercicio.grupoMuscularSnapshot} · {item.sessaoExercicio.categoriaSnapshot}</Text>
                      </View>
                    </View>
                  </View>
                  );
                })}
              </View>
              {recSeries != null && minValidSeries != null ? (
                <View style={styles.grupoProgressCol}>
                  <View style={styles.grupoProgressRow}>
                    {Array.from({ length: Math.min(recSeries, 8) }).map((_, i) => (
                      <View
                        key={i}
                        style={[styles.grupoDot, i < minValidSeries ? (grupoAllDone ? styles.grupoDotDone : styles.grupoDotFilled) : styles.grupoDotEmpty]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.grupoProgressLabel, grupoAllDone ? styles.grupoProgressLabelDone : null]}>
                    {t('sessao.ativa.gruposProgressLabel', { filled: minValidSeries, total: recSeries })}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => {
                  if (!allRealizado) {
                    setConfirmConcluirGrupo(grupo);
                  } else {
                    void handleConcluirGrupo(grupo);
                  }
                }}
                style={({ pressed }) => [styles.grupoCheckbox, allRealizado ? styles.grupoCheckboxDone : styles.grupoCheckboxPending, pressed ? { opacity: 0.7 } : null]}
                hitSlop={8}
              >
                <Text style={[styles.grupoCheckboxText, allRealizado ? styles.grupoCheckboxTextDone : styles.grupoCheckboxTextPending]}>{allRealizado ? '✓' : ''}</Text>
              </Pressable>
              <Text style={styles.grupoArrow}>›</Text>
            </View>
          </Pressable>
        );
      })}

      <ExerciseMediaViewer
        visible={mediaViewerItem !== null}
        exercicioNome={mediaViewerItem?.nome ?? ''}
        mediaOnline={null}
        mediaLocal={mediaViewerItem?.mediaLocal ?? null}
        onClose={() => setMediaViewerItem(null)}
      />

      <View style={styles.actionsCard}>
        <Pressable
          onPress={onToggleShowAddExercise}
          style={({ pressed }) => [styles.secondaryButton, pressed ? styles.secondaryButtonPressed : null]}
        >
          <Text style={styles.secondaryButtonText}>
            {showAddExercise ? t('common.cancel') : t('sessao.ativa.adicionarExercicio')}
          </Text>
        </Pressable>

        {showAddExercise ? (
          <AddExercicioSection
            availableExercises={availableExercises}
            onAdd={onAddExercicio}
          />
        ) : null}

        <Pressable
          onPress={() => { void onFinalizar(); }}
          disabled={isFinalizing || isCanceling || !temSerieValida}
          style={({ pressed }) => [
            styles.finalizarButton,
            pressed ? styles.finalizarButtonPressed : null,
            (isFinalizing || isCanceling || !temSerieValida) ? styles.finalizarButtonDisabled : null,
          ]}
        >
          <Text style={styles.finalizarButtonText}>
            {isFinalizing ? t('sessao.ativa.finalizando') : t('sessao.ativa.finalizarSessaoBtn')}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCancelar}
          disabled={isFinalizing || isCanceling}
          style={({ pressed }) => [
            styles.cancelarButton,
            pressed ? styles.cancelarButtonPressed : null,
            (isFinalizing || isCanceling) ? styles.cancelarButtonDisabled : null,
          ]}
        >
          <Text style={styles.cancelarButtonText}>
            {isCanceling ? t('sessao.ativa.cancelando') : t('sessao.ativa.cancelarSessaoBtn')}
          </Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmConcluirGrupo !== null}
        title={confirmConcluirGrupo ? t('sessao.grupo.concluirTitle', { label: grupoLabelFor(confirmConcluirGrupo.metodo, confirmConcluirGrupo.itens.length, locale) }) : ''}
        message={t('sessao.ativa.concluirGrupoMessage')}
        confirmLabel={t('sessao.common.concluir')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          const grupo = confirmConcluirGrupo;
          setConfirmConcluirGrupo(null);
          if (grupo) void handleConcluirGrupo(grupo);
        }}
        onCancel={() => setConfirmConcluirGrupo(null)}
      />

      <ConfirmDialog
        visible={confirmCancelarVisible}
        title={t('sessao.ativa.cancelarSessaoBtn')}
        message={t('sessao.ativa.cancelarSessaoMessage')}
        confirmLabel={t('sessao.ativa.cancelarSessaoBtn')}
        cancelLabel={t('common.back')}
        destructive
        onConfirm={() => {
          setConfirmCancelarVisible(false);
          void onCancelar();
        }}
        onCancel={() => setConfirmCancelarVisible(false)}
      />
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: c.textSecondary, fontSize: 15 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 26, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 14 },
    errorMessage: { color: c.error, fontSize: 14, fontWeight: '600', paddingHorizontal: 4 },
    actionsCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    secondaryButton: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.textPrimary },
    secondaryButtonPressed: { opacity: 0.7 },
    secondaryButtonText: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    finalizarButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: c.accent },
    finalizarButtonPressed: { opacity: 0.9 },
    finalizarButtonDisabled: { opacity: 0.5 },
    finalizarButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    cancelarButton: { borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.error },
    cancelarButtonPressed: { opacity: 0.7 },
    cancelarButtonDisabled: { opacity: 0.4 },
    cancelarButtonText: { color: c.error, fontSize: 14, fontWeight: '700' },
    grupoCard: { borderRadius: 16, borderWidth: 2, overflow: 'hidden', backgroundColor: c.card, borderColor: c.cardBorder },
    grupoCardRealizado: { opacity: 0.55 },
    grupoHeader: { paddingHorizontal: 14, paddingVertical: 6 },
    grupoHeaderText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
    grupoCheckbox: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    grupoCheckboxPending: { borderColor: c.cardBorder, backgroundColor: 'transparent' },
    grupoCheckboxDone: { borderColor: c.success, backgroundColor: c.success },
    grupoCheckboxText: { fontSize: 14, fontWeight: '800' },
    grupoCheckboxTextPending: { color: 'transparent' },
    grupoCheckboxTextDone: { color: '#fff' },
    grupoBody: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    grupoExercicios: { flex: 1 },
    grupoItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 10 },
    grupoItemThumb: { width: 40, height: 40, borderRadius: 8, flexShrink: 0, backgroundColor: c.card },
    grupoItemThumbOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.30)', alignItems: 'center', justifyContent: 'center' },
    grupoItemThumbIcon: { color: '#fff', fontSize: 10, fontWeight: '800' },
    grupoItemInfo: { flex: 1, gap: 2 },
    grupoItemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    grupoItemTecnicaBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    grupoItemTecnicaBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    grupoItemDivider: { height: 1, backgroundColor: c.cardBorder },
    grupoItemNome: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    grupoItemMeta: { color: c.textSecondary, fontSize: 13 },
    grupoProgressCol: { alignItems: 'flex-end', gap: 4 },
    grupoProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    grupoDot: { width: 10, height: 10, borderRadius: 5 },
    grupoDotFilled: { backgroundColor: c.accent },
    grupoDotDone: { backgroundColor: c.success },
    grupoDotEmpty: { backgroundColor: c.cardBorder },
    grupoProgressLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    grupoProgressLabelDone: { color: c.success },
    grupoArrow: { color: c.textLabel, fontSize: 20, fontWeight: '300' },
  });
}
