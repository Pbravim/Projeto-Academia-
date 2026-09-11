import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { GerenciarSessoesScreen } from './GerenciarSessoesScreen';

/**
 * Smoke test de render: esta tela nunca era executada por teste. Cobre a
 * lista de sessões ativas + o botão de voltar (useAndroidBack usa o
 * BackHandler mockado abaixo, com o default `TabActivityContext = true`).
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
  Modal: host('Modal'),
  StyleSheet: { create: (s: unknown) => s },
  BackHandler: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
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

async function render(props: Parameters<typeof GerenciarSessoesScreen>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(GerenciarSessoesScreen, props));
  });
  return renderer;
}

const sessao = {
  id: 'sessao-1',
  dataHoraInicio: '2026-01-01T10:00:00.000Z',
  duracaoMin: 45,
  volumeTotal: 1000,
  melhorOrm: 80,
} as Parameters<typeof GerenciarSessoesScreen>[0]['sessoes'][number];

describe('GerenciarSessoesScreen', () => {
  it('lista sessões ativas e volta ao pressionar o botão de voltar', async () => {
    const onBack = vi.fn();
    const renderer = await render({
      treinoNome: 'Treino A',
      sessoes: [sessao],
      sessoesArquivadas: [],
      onArquivar: vi.fn(),
      onDesarquivar: vi.fn(),
      onDeletar: vi.fn(),
      onArquivarTodas: vi.fn(),
      onDeletarTodas: vi.fn(),
      onBack,
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Treino A');

    const back = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'common.backArrow'));
    await act(async () => {
      (back!.props as { onPress: () => void }).onPress();
    });
    expect(onBack).toHaveBeenCalled();
  });

  it('arquivar uma sessão chama onArquivar com o id certo', async () => {
    const onArquivar = vi.fn();
    const renderer = await render({
      treinoNome: 'Treino A',
      sessoes: [sessao],
      sessoesArquivadas: [],
      onArquivar,
      onDesarquivar: vi.fn(),
      onDeletar: vi.fn(),
      onArquivarTodas: vi.fn(),
      onDeletarTodas: vi.fn(),
      onBack: vi.fn(),
    });

    const arquivarBtn = renderer.root
      .findAllByType('Pressable')
      .find((p) => p.findAllByType('Text').some((t) => t.props.children === 'common.archive'));
    await act(async () => {
      (arquivarBtn!.props as { onPress: () => void }).onPress();
    });
    expect(onArquivar).toHaveBeenCalledWith('sessao-1');
  });
});
