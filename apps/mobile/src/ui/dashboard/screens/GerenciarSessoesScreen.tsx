import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SessaoComVolume } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
import { type AppLocale,useLocale, useT } from '../../shared/i18n';
import { formatMediumDate, formatNumber } from '../../shared/i18n/formatters';
import { useTheme } from '../../shared/theme';

interface Props {
  treinoNome: string;
  sessoes: SessaoComVolume[];
  sessoesArquivadas: SessaoComVolume[];
  onArquivar: (id: string) => void;
  onDesarquivar: (id: string) => void;
  onDeletar: (id: string) => void;
  onArquivarTodas: (ids: string[]) => void;
  onDeletarTodas: (ids: string[]) => void;
  onBack: () => void;
}

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  action: () => void;
}

function formatSessaoData(iso: string, locale: AppLocale): string {
  return formatMediumDate(iso, locale);
}

function formatDuracao(duracaoMin: number | null): string {
  if (duracaoMin == null) return '—';
  if (duracaoMin >= 60) {
    const resto = duracaoMin % 60;
    return `${Math.floor(duracaoMin / 60)}h${resto > 0 ? `${resto}m` : ''}`;
  }
  return `${duracaoMin}min`;
}

export function GerenciarSessoesScreen({
  treinoNome,
  sessoes,
  sessoesArquivadas,
  onArquivar,
  onDesarquivar,
  onDeletar,
  onArquivarTodas,
  onDeletarTodas,
  onBack,
}: Props) {
  const c = useTheme();
  const locale = useLocale();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const total = sessoes.length + sessoesArquivadas.length;

  const confirmDeletar = (sessao: SessaoComVolume) => {
    setPending({
      title: t('dashboard.gerenciarSessoes.confirmDeletar.title'),
      message: t('dashboard.gerenciarSessoes.confirmDeletar.message', { data: formatSessaoData(sessao.dataHoraInicio, locale) }),
      confirmLabel: t('common.delete'),
      destructive: true,
      action: () => onDeletar(sessao.id),
    });
  };

  const confirmArquivarTodas = () => {
    const ids = sessoes.map((s) => s.id);
    setPending({
      title: t('dashboard.gerenciarSessoes.confirmArquivarTodas.title'),
      message: t('dashboard.gerenciarSessoes.confirmArquivarTodas.message', { count: ids.length, treino: treinoNome }),
      confirmLabel: t('common.archive'),
      destructive: false,
      action: () => onArquivarTodas(ids),
    });
  };

  const confirmDeletarArquivadas = () => {
    const ids = sessoesArquivadas.map((s) => s.id);
    setPending({
      title: t('dashboard.gerenciarSessoes.confirmDeletarArquivadas.title'),
      message: t('dashboard.gerenciarSessoes.confirmDeletarArquivadas.message', { count: ids.length, treino: treinoNome }),
      confirmLabel: t('common.delete'),
      destructive: true,
      action: () => onDeletarTodas(ids),
    });
  };

  const confirmDeletarTudo = () => {
    const ids = [...sessoes.map((s) => s.id), ...sessoesArquivadas.map((s) => s.id)];
    setPending({
      title: t('dashboard.gerenciarSessoes.confirmDeletarTudo.title'),
      message: t('dashboard.gerenciarSessoes.confirmDeletarTudo.message', { count: ids.length, treino: treinoNome }),
      confirmLabel: t('dashboard.gerenciarSessoes.confirmDeletarTudo.confirmLabel'),
      destructive: true,
      action: () => onDeletarTodas(ids),
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed ? { opacity: 0.7 } : null]}
        >
          <Text style={styles.backButtonText}>{t('common.backArrow')}</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('dashboard.gerenciarSessoes.eyebrow')}</Text>
        <Text style={styles.title}>{treinoNome}</Text>
        <Text style={styles.description}>
          {t('dashboard.gerenciarSessoes.description')}
        </Text>
      </View>

      {total === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t('dashboard.gerenciarSessoes.emptyText')}</Text>
        </View>
      ) : null}

      {sessoes.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('dashboard.gerenciarSessoes.sessoesAtivasTitle', { count: sessoes.length })}</Text>
          <View style={styles.sessaoList}>
            {sessoes.map((s) => (
              <View key={s.id} style={styles.sessaoRow}>
                <View style={styles.sessaoInfo}>
                  <Text style={styles.sessaoData}>{formatSessaoData(s.dataHoraInicio, locale)}</Text>
                  <Text style={styles.sessaoMeta}>
                    {s.volumeTotal > 0 ? `${formatNumber(s.volumeTotal, locale)} kg · ` : ''}
                    {formatDuracao(s.duracaoMin)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onArquivar(s.id)}
                  style={({ pressed }) => [styles.rowBtn, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={styles.rowBtnText}>{t('common.archive')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDeletar(s)}
                  style={({ pressed }) => [styles.rowBtn, styles.rowBtnDanger, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={[styles.rowBtnText, styles.rowBtnTextDanger]}>{t('common.delete')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {sessoesArquivadas.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('dashboard.gerenciarSessoes.arquivadasTitle', { count: sessoesArquivadas.length })}</Text>
          <Text style={styles.helperText}>{t('dashboard.gerenciarSessoes.arquivadasHelper')}</Text>
          <View style={styles.sessaoList}>
            {sessoesArquivadas.map((s) => (
              <View key={s.id} style={[styles.sessaoRow, styles.sessaoRowArquivada]}>
                <View style={styles.sessaoInfo}>
                  <Text style={styles.sessaoData}>{formatSessaoData(s.dataHoraInicio, locale)}</Text>
                  <Text style={styles.sessaoMeta}>
                    {s.volumeTotal > 0 ? `${formatNumber(s.volumeTotal, locale)} kg · ` : ''}
                    {formatDuracao(s.duracaoMin)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onDesarquivar(s.id)}
                  style={({ pressed }) => [styles.rowBtn, styles.rowBtnRestore, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={[styles.rowBtnText, styles.rowBtnTextRestore]}>{t('common.restore')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDeletar(s)}
                  style={({ pressed }) => [styles.rowBtn, styles.rowBtnDanger, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={[styles.rowBtnText, styles.rowBtnTextDanger]}>{t('common.delete')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {total > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('dashboard.gerenciarSessoes.acoesEmMassaTitle')}</Text>
          {sessoes.length > 0 ? (
            <Pressable
              onPress={confirmArquivarTodas}
              style={({ pressed }) => [styles.bulkItem, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={styles.bulkItemTitle}>{t('dashboard.gerenciarSessoes.arquivarTodasAtivasTitle', { count: sessoes.length })}</Text>
              <Text style={styles.bulkItemDesc}>{t('dashboard.gerenciarSessoes.arquivarTodasAtivasDesc')}</Text>
            </Pressable>
          ) : null}
          {sessoesArquivadas.length > 0 ? (
            <Pressable
              onPress={confirmDeletarArquivadas}
              style={({ pressed }) => [styles.bulkItem, styles.bulkItemDanger, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={[styles.bulkItemTitle, styles.bulkItemTitleDanger]}>
                {t('dashboard.gerenciarSessoes.excluirArquivadasTitle', { count: sessoesArquivadas.length })}
              </Text>
              <Text style={styles.bulkItemDesc}>{t('dashboard.gerenciarSessoes.excluirArquivadasDesc')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={confirmDeletarTudo}
            style={({ pressed }) => [styles.bulkItem, styles.bulkItemDanger, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={[styles.bulkItemTitle, styles.bulkItemTitleDanger]}>
              {t('dashboard.gerenciarSessoes.excluirTudoTitle', { count: total })}
            </Text>
            <Text style={styles.bulkItemDesc}>
              {t('dashboard.gerenciarSessoes.excluirTudoDesc')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ConfirmDialog
        visible={pending !== null}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel ?? ''}
        cancelLabel={t('common.cancel')}
        destructive={pending?.destructive ?? false}
        onConfirm={() => {
          pending?.action();
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
    header: { flexDirection: 'row' },
    backButton: {
      backgroundColor: c.card,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    backButtonText: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 26, fontWeight: '800' },
    description: { color: c.heroDescription, fontSize: 14, lineHeight: 21 },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
    helperText: { color: c.textSecondary, fontSize: 12, lineHeight: 17, marginTop: -6 },
    emptyText: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    sessaoList: { gap: 8 },
    sessaoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.cardAlt,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    sessaoRowArquivada: { opacity: 0.75 },
    sessaoInfo: { flex: 1, gap: 1 },
    sessaoData: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    sessaoMeta: { color: c.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
    rowBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    rowBtnText: { color: c.textPrimary, fontSize: 12, fontWeight: '700' },
    rowBtnRestore: { backgroundColor: c.successBg, borderColor: c.success },
    rowBtnTextRestore: { color: c.success },
    rowBtnDanger: { backgroundColor: c.errorBg, borderColor: c.errorBg },
    rowBtnTextDanger: { color: c.error },
    bulkItem: {
      backgroundColor: c.cardAlt,
      borderRadius: 14,
      padding: 14,
      gap: 3,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    bulkItemDanger: { backgroundColor: c.errorBg, borderColor: c.errorBg },
    bulkItemTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
    bulkItemTitleDanger: { color: c.error },
    bulkItemDesc: { color: c.textSecondary, fontSize: 12, lineHeight: 17 },
  });
}
