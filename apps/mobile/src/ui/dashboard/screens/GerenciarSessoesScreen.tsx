import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SessaoComVolume } from '../../../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useAndroidBack } from '../../shared/hooks/useAndroidBack';
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

function formatSessaoData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const styles = useMemo(() => makeStyles(c), [c]);
  useAndroidBack(onBack);

  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const total = sessoes.length + sessoesArquivadas.length;

  const confirmDeletar = (sessao: SessaoComVolume) => {
    setPending({
      title: 'Excluir sessão',
      message: `A sessão de ${formatSessaoData(sessao.dataHoraInicio)} e todas as séries registradas nela serão apagadas permanentemente. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      destructive: true,
      action: () => onDeletar(sessao.id),
    });
  };

  const confirmArquivarTodas = () => {
    const ids = sessoes.map((s) => s.id);
    setPending({
      title: 'Arquivar todas as ativas',
      message: `${ids.length} sess${ids.length !== 1 ? 'ões' : 'ão'} de "${treinoNome}" ${ids.length !== 1 ? 'saem' : 'sai'} do dashboard, mas os dados são mantidos e podem ser restaurados a qualquer momento.`,
      confirmLabel: 'Arquivar',
      destructive: false,
      action: () => onArquivarTodas(ids),
    });
  };

  const confirmDeletarArquivadas = () => {
    const ids = sessoesArquivadas.map((s) => s.id);
    setPending({
      title: 'Excluir arquivadas',
      message: `${ids.length} sess${ids.length !== 1 ? 'ões' : 'ão'} arquivada${ids.length !== 1 ? 's' : ''} de "${treinoNome}" será${ids.length !== 1 ? 'ão' : ''} apagada${ids.length !== 1 ? 's' : ''} permanentemente. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      destructive: true,
      action: () => onDeletarTodas(ids),
    });
  };

  const confirmDeletarTudo = () => {
    const ids = [...sessoes.map((s) => s.id), ...sessoesArquivadas.map((s) => s.id)];
    setPending({
      title: 'Excluir todo o histórico',
      message: `Todas as ${ids.length} sessões de "${treinoNome}" (incluindo arquivadas) serão apagadas permanentemente. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir tudo',
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
          <Text style={styles.backButtonText}>← Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Gerenciar sessões</Text>
        <Text style={styles.title}>{treinoNome}</Text>
        <Text style={styles.description}>
          Arquivar tira a sessão do dashboard mantendo os dados — dá para restaurar depois.
          Excluir apaga a sessão e as séries de forma permanente.
        </Text>
      </View>

      {total === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>Nenhuma sessão registrada para este treino.</Text>
        </View>
      ) : null}

      {sessoes.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sessões ativas ({sessoes.length})</Text>
          <View style={styles.sessaoList}>
            {sessoes.map((s) => (
              <View key={s.id} style={styles.sessaoRow}>
                <View style={styles.sessaoInfo}>
                  <Text style={styles.sessaoData}>{formatSessaoData(s.dataHoraInicio)}</Text>
                  <Text style={styles.sessaoMeta}>
                    {s.volumeTotal > 0 ? `${s.volumeTotal.toLocaleString('pt-BR')} kg · ` : ''}
                    {formatDuracao(s.duracaoMin)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onArquivar(s.id)}
                  style={({ pressed }) => [styles.rowBtn, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={styles.rowBtnText}>Arquivar</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDeletar(s)}
                  style={({ pressed }) => [styles.rowBtn, styles.rowBtnDanger, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={[styles.rowBtnText, styles.rowBtnTextDanger]}>Excluir</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {sessoesArquivadas.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Arquivadas ({sessoesArquivadas.length})</Text>
          <Text style={styles.helperText}>Fora do dashboard, mas com os dados preservados.</Text>
          <View style={styles.sessaoList}>
            {sessoesArquivadas.map((s) => (
              <View key={s.id} style={[styles.sessaoRow, styles.sessaoRowArquivada]}>
                <View style={styles.sessaoInfo}>
                  <Text style={styles.sessaoData}>{formatSessaoData(s.dataHoraInicio)}</Text>
                  <Text style={styles.sessaoMeta}>
                    {s.volumeTotal > 0 ? `${s.volumeTotal.toLocaleString('pt-BR')} kg · ` : ''}
                    {formatDuracao(s.duracaoMin)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onDesarquivar(s.id)}
                  style={({ pressed }) => [styles.rowBtn, styles.rowBtnRestore, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={[styles.rowBtnText, styles.rowBtnTextRestore]}>Restaurar</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDeletar(s)}
                  style={({ pressed }) => [styles.rowBtn, styles.rowBtnDanger, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={[styles.rowBtnText, styles.rowBtnTextDanger]}>Excluir</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {total > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ações em massa</Text>
          {sessoes.length > 0 ? (
            <Pressable
              onPress={confirmArquivarTodas}
              style={({ pressed }) => [styles.bulkItem, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={styles.bulkItemTitle}>Arquivar todas as ativas ({sessoes.length})</Text>
              <Text style={styles.bulkItemDesc}>Saem do dashboard, mas podem ser restauradas.</Text>
            </Pressable>
          ) : null}
          {sessoesArquivadas.length > 0 ? (
            <Pressable
              onPress={confirmDeletarArquivadas}
              style={({ pressed }) => [styles.bulkItem, styles.bulkItemDanger, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={[styles.bulkItemTitle, styles.bulkItemTitleDanger]}>
                Excluir arquivadas ({sessoesArquivadas.length})
              </Text>
              <Text style={styles.bulkItemDesc}>Apaga permanentemente só as sessões arquivadas.</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={confirmDeletarTudo}
            style={({ pressed }) => [styles.bulkItem, styles.bulkItemDanger, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={[styles.bulkItemTitle, styles.bulkItemTitleDanger]}>
              Excluir todo o histórico ({total})
            </Text>
            <Text style={styles.bulkItemDesc}>
              Apaga permanentemente todas as sessões deste treino, incluindo arquivadas.
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ConfirmDialog
        visible={pending !== null}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel ?? ''}
        cancelLabel="Cancelar"
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
