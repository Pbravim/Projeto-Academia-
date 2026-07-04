import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { buildSessaoResumoViewModel } from '../presenters/buildSessaoResumoViewModel';
import { useTheme } from '../../shared/theme';
import { useLocale, useT } from '../../shared/i18n';

interface Props {
  detalhe: SessaoDetalhe;
  onFechar: () => void;
}

export function SessaoResumoScreen({ detalhe, onFechar }: Props) {
  const c = useTheme();
  const locale = useLocale();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);
  const vm = buildSessaoResumoViewModel(detalhe, locale);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('sessao.resumo.eyebrow')}</Text>
        <Text style={styles.title}>{vm.treinoNome}</Text>
        <Text style={styles.duracao}>{vm.duracao}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatBox label={t('sessao.resumo.statExercicios')} value={`${vm.exerciciosRealizados}/${vm.totalExercicios}`} styles={styles} />
        <StatBox label={t('sessao.resumo.statSeriesValidas')} value={String(vm.totalSeriesValidas)} styles={styles} />
        <StatBox label={t('sessao.common.volume')} value={vm.volumeTotal} styles={styles} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('sessao.resumo.sectionTitle')}</Text>

        {vm.exercicios.map((item, index) => (
          <View key={index} style={[styles.exercicioRow, !item.realizado ? styles.exercicioRowNaoRealizado : null]}>
            <View style={styles.exercicioInfo}>
              <Text style={styles.exercicioNome}>{item.nome}</Text>
              {item.realizado ? (
                <>
                  <Text style={styles.exercicioStats}>
                    {t('sessao.resumo.seriesValidasCount', { count: item.totalSeriesValidas, volume: item.volume })}
                  </Text>
                  {item.melhorSerie ? (
                    <Text style={styles.exercicioMelhor}>{t('sessao.resumo.melhorSerie', { serie: item.melhorSerie })}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.naoRealizadoLabel}>{t('sessao.resumo.naoRealizado')}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onFechar}
        style={({ pressed }) => [styles.fecharButton, pressed ? styles.fecharButtonPressed : null]}
      >
        <Text style={styles.fecharButtonText}>{t('sessao.common.fechar')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatBox({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18 },
    heroCard: { backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 8 },
    eyebrow: { color: c.heroSubtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    title: { color: c.heroText, fontSize: 28, fontWeight: '800' },
    duracao: { color: c.heroDescription, fontSize: 16, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: c.card, borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: c.cardBorder, gap: 4 },
    statValue: { color: c.accent, fontSize: 22, fontWeight: '800' },
    statLabel: { color: c.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: c.cardBorder },
    sectionTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    exercicioRow: { backgroundColor: c.cardAlt, borderRadius: 14, padding: 14, gap: 4 },
    exercicioRowNaoRealizado: { opacity: 0.5 },
    exercicioInfo: { gap: 2 },
    exercicioNome: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    exercicioStats: { color: c.textLabel, fontSize: 13 },
    exercicioMelhor: { color: c.accent, fontSize: 13, fontWeight: '700' },
    naoRealizadoLabel: { color: c.error, fontSize: 13, fontWeight: '600' },
    fecharButton: { backgroundColor: c.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    fecharButtonPressed: { opacity: 0.9 },
    fecharButtonText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
  });
}
