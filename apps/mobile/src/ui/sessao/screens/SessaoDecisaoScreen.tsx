import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DecisaoFinalizacao } from '../../../application/sessoes/use-cases/GetDecisaoFinalizacaoUseCase';
import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';

interface Props {
  decisao: DecisaoFinalizacao;
  nome: string;
  selecionados: Set<string>;
  isSalvando: boolean;
  errorMessage: string | null;
  onChangeNome: (nome: string) => void;
  onToggleSelecionado: (sessaoExercicioId: string) => void;
  onSalvarComoTreino: () => Promise<void>;
  onAdicionarSelecionados: () => Promise<void>;
  onIgnorar: () => void;
}

export function SessaoDecisaoScreen(props: Props) {
  const { decisao } = props;
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (decisao.tipo === 'nenhuma') return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {decisao.tipo === 'salvar_como_treino' ? (
        <SalvarComoTreinoView {...props} decisao={decisao} styles={styles} t={t} />
      ) : (
        <AdicionarAoTreinoView {...props} decisao={decisao} styles={styles} t={t} />
      )}
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;
type TFunc = ReturnType<typeof useT>;

function SalvarComoTreinoView({
  decisao,
  nome,
  isSalvando,
  errorMessage,
  onChangeNome,
  onSalvarComoTreino,
  onIgnorar,
  styles,
  t,
}: Props & { decisao: Extract<DecisaoFinalizacao, { tipo: 'salvar_como_treino' }>; styles: Styles; t: TFunc }) {
  const nomeValido = nome.trim().length >= 2;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('sessao.decisao.salvarTitulo')}</Text>
      <Text style={styles.description}>{t('sessao.decisao.salvarDesc', { count: decisao.totalExercicios })}</Text>

      <Text style={styles.label}>{t('sessao.decisao.nomeLabel')}</Text>
      <TextInput
        accessibilityLabel={t('sessao.decisao.nomeLabel')}
        value={nome}
        onChangeText={onChangeNome}
        style={styles.input}
        editable={!isSalvando}
      />

      {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => { void onSalvarComoTreino(); }}
        disabled={isSalvando || !nomeValido}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && !isSalvando && nomeValido ? { opacity: 0.85 } : null,
          isSalvando || !nomeValido ? styles.btnDisabled : null,
        ]}
      >
        <Text style={styles.primaryBtnText}>{t('sessao.decisao.salvarBtn')}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onIgnorar}
        disabled={isSalvando}
        style={({ pressed }) => [styles.secondaryBtn, pressed ? { opacity: 0.85 } : null]}
      >
        <Text style={styles.secondaryBtnText}>{t('sessao.decisao.naoSalvarBtn')}</Text>
      </Pressable>
    </View>
  );
}

function AdicionarAoTreinoView({
  decisao,
  selecionados,
  isSalvando,
  errorMessage,
  onToggleSelecionado,
  onAdicionarSelecionados,
  onIgnorar,
  styles,
  t,
}: Props & { decisao: Extract<DecisaoFinalizacao, { tipo: 'adicionar_ao_treino' }>; styles: Styles; t: TFunc }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {t('sessao.decisao.avulsosTitulo', { count: decisao.avulsos.length, treino: decisao.treinoNome })}
      </Text>

      {decisao.avulsos.map((avulso) => {
        const checked = selecionados.has(avulso.sessaoExercicioId);
        return (
          <Pressable
            key={avulso.sessaoExercicioId}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={avulso.nome}
            onPress={() => onToggleSelecionado(avulso.sessaoExercicioId)}
            style={({ pressed }) => [styles.avulsoRow, pressed ? { opacity: 0.85 } : null]}
          >
            <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
              {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <View style={styles.avulsoInfo}>
              <Text style={styles.avulsoNome}>{avulso.nome}</Text>
              <Text style={styles.avulsoSeries}>{t('sessao.decisao.seriesValidasCount', { count: avulso.seriesValidas })}</Text>
            </View>
          </Pressable>
        );
      })}

      {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => { void onAdicionarSelecionados(); }}
        disabled={isSalvando || selecionados.size === 0}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && !isSalvando && selecionados.size > 0 ? { opacity: 0.85 } : null,
          isSalvando || selecionados.size === 0 ? styles.btnDisabled : null,
        ]}
      >
        <Text style={styles.primaryBtnText}>{t('sessao.decisao.adicionarBtn', { count: selecionados.size })}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onIgnorar}
        disabled={isSalvando}
        style={({ pressed }) => [styles.secondaryBtn, pressed ? { opacity: 0.85 } : null]}
      >
        <Text style={styles.secondaryBtnText}>{t('sessao.decisao.manterBtn')}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 18 },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 22, gap: 14, borderWidth: 1, borderColor: c.cardBorder },
    title: { color: c.textPrimary, fontSize: 20, fontWeight: '800' },
    description: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    label: { color: c.textLabel, fontSize: 13, fontWeight: '700' },
    input: { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: c.inputText, fontSize: 15 },
    errorMessage: { color: c.error, fontSize: 13, fontWeight: '600' },
    primaryBtn: { backgroundColor: c.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    primaryBtnText: { color: c.accentText, fontSize: 15, fontWeight: '800' },
    secondaryBtn: { paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
    secondaryBtnText: { color: c.textSecondary, fontSize: 14, fontWeight: '700' },
    btnDisabled: { opacity: 0.5 },
    avulsoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.cardAlt, borderRadius: 14, padding: 14 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: c.accent },
    checkboxMark: { color: c.accentText, fontSize: 14, fontWeight: '800' },
    avulsoInfo: { flex: 1, gap: 2 },
    avulsoNome: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
    avulsoSeries: { color: c.textSecondary, fontSize: 12 },
  });
}
