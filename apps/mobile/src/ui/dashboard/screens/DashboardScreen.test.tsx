import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { DashboardScreen } from './DashboardScreen';

/**
 * Smoke test de render: esta tela nunca era executada por teste (só existia
 * na malha do app real). Cobre os dois estados sem stats (semHistorico e
 * erro) — o suficiente para exercitar o import ordenado e o `makeStyles`
 * (StyleSheet) tocados no lint de mobile, sem precisar mockar FlatList/
 * react-native-svg (só entram em cena quando `stats` tem treinos com
 * histórico).
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  ActivityIndicator: host('ActivityIndicator'),
  FlatList: host('FlatList'),
  Modal: host('Modal'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('@expo/vector-icons', () => ({ Ionicons: host('Ionicons') }));

vi.mock('react-native-svg', () => ({
  default: host('Svg'),
  Circle: host('Circle'),
  Defs: host('Defs'),
  LinearGradient: host('LinearGradient'),
  Path: host('Path'),
  Stop: host('Stop'),
}));

vi.mock('../../shared/theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return {
    ThemeContext: react.createContext(colors),
    useTheme: () => colors,
  };
});

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

async function render(props: Parameters<typeof DashboardScreen>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(DashboardScreen, props));
  });
  return renderer;
}

const baseProps = {
  isLoading: false,
  isResetting: false,
  isExporting: false,
  exportFormatoVisible: false,
  onRefresh: vi.fn(),
  onReset: vi.fn(async () => {}),
  onExportar: vi.fn(async () => {}),
  onFecharExportar: vi.fn(),
  onExportarFormato: vi.fn(async () => {}),
  onVerEvolucao: vi.fn(),
  onVerRecordes: vi.fn(),
  onGerenciarSessoes: vi.fn(),
  onArquivarSessao: vi.fn(async () => {}),
  onDesarquivarSessao: vi.fn(async () => {}),
  onDeletarSessao: vi.fn(async () => {}),
  onArquivarTodasSessoesTreino: vi.fn(async () => {}),
  onDeletarTodasSessoesTreino: vi.fn(async () => {}),
};

describe('DashboardScreen', () => {
  it('sem histórico: mostra o estado vazio', async () => {
    const renderer = await render({ ...baseProps, stats: null, errorMessage: null });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('dashboard.home.semHistoricoTitle');
  });

  it('com erro: mostra a mensagem e tentar novamente chama onRefresh', async () => {
    const onRefresh = vi.fn();
    const renderer = await render({
      ...baseProps,
      stats: null,
      errorMessage: 'falhou',
      onRefresh,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('falhou');

    const retry = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'dashboard.home.tentarNovamente'));
    await act(async () => {
      (retry!.props as { onPress: () => void }).onPress();
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it('grupo sem treino (#33): rotula "Sessões livres", oculta "ver evolução" e chama onGerenciarSessoes com treinoId null', async () => {
    const onGerenciarSessoes = vi.fn();
    const stats = {
      totalSessoes: 1,
      sessoesUltimoMes: 1,
      aderenciaSemanal: [],
      aderenciaMensal: [],
      aderenciaAnual: [],
      recordesPessoais: [],
      evolucaoPorTreino: [
        {
          treinoId: null,
          treinoNome: '',
          sessoes: [{ id: 's1', dataHoraInicio: '2026-09-13T10:00:00.000Z', dataHoraFim: null, volumeTotal: 0, melhorOrm: 0, duracaoMin: null, arquivado: false }],
          sessoesArquivadas: [],
        },
      ],
    };
    const renderer = await render({ ...baseProps, stats, errorMessage: null, onGerenciarSessoes });

    const flatList = renderer.root.findByType('FlatList');
    const rendered = flatList.props.renderItem({ item: stats.evolucaoPorTreino[0] });
    let cardRenderer!: ReactTestRenderer;
    await act(async () => {
      cardRenderer = TestRenderer.create(rendered);
    });

    const cardTexts = cardRenderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(cardTexts).toContain('dashboard.home.sessoesLivres');
    expect(cardTexts).not.toContain('dashboard.treinoCard.verEvolucaoPorExercicio');

    const gerenciarBtn = cardRenderer.root
      .findAllByType('Pressable')
      .find((p) => (p.props as { accessibilityRole?: string }).accessibilityRole === 'button');
    await act(async () => {
      (gerenciarBtn!.props as { onPress: () => void }).onPress();
    });
    expect(onGerenciarSessoes).toHaveBeenCalledWith(null, '');
  });
});
