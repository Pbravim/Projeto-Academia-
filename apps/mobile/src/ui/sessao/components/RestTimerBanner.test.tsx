import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { RestTimerBanner } from './RestTimerBanner';

/**
 * Smoke test de render: este módulo (banner do cronômetro de descanso)
 * nunca era executado por teste — a lógica de arrasto/canto mora em
 * useRestTimerCorner (testado à parte); aqui só cobrimos o binding visual
 * (pill/card, botões) que passou a envolver Animated.View + panHandlers.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  Animated: { View: host('Animated.View') },
  StyleSheet: { create: (s: unknown) => s },
  AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  Vibration: { vibrate: vi.fn() },
}));

vi.mock('../hooks/useRestTimerCorner', () => ({
  useRestTimerCorner: () => ({
    corner: 'bottom-right',
    panHandlers: {},
    animatedStyle: {},
    positionStyle: {},
  }),
}));

vi.mock('../restTimerNotification', () => ({
  startRestNotification: vi.fn().mockResolvedValue(undefined),
  cancelRestNotification: vi.fn().mockResolvedValue(undefined),
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
}));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(el);
  });
  return renderer;
}

const baseProps = {
  nome: 'Supino reto',
  total: 90,
  runId: 1,
  onToggleMinimized: vi.fn(),
  onSkip: vi.fn(),
  onDone: vi.fn(),
};

describe('RestTimerBanner', () => {
  it('renders the minimized pill with the countdown and toggles on press', async () => {
    const onToggleMinimized = vi.fn();
    const renderer = await render(
      createElement(RestTimerBanner, { ...baseProps, minimized: true, onToggleMinimized }),
    );

    const text = renderer.root.findAllByType('Text').find((t) => String(t.props.children).includes('1:30'));
    expect(text).toBeTruthy();

    const pill = renderer.root.findAllByType('Pressable')[0];
    await act(async () => {
      (pill.props as { onPress: () => void }).onPress();
    });
    expect(onToggleMinimized).toHaveBeenCalledTimes(1);
  });

  it('renders the expanded card and fires onSkip / onToggleMinimized', async () => {
    const onSkip = vi.fn();
    const onToggleMinimized = vi.fn();
    const renderer = await render(
      createElement(RestTimerBanner, { ...baseProps, minimized: false, onSkip, onToggleMinimized }),
    );

    expect(
      renderer.root.findAllByType('Text').some((t) => t.props.children === 'Supino reto'),
    ).toBe(true);

    const buttons = renderer.root.findAllByType('Pressable');
    const skipBtn = buttons.find((p) =>
      p.findAllByType('Text').some((t) => t.props.children === 'sessao.timer.pular'),
    );
    await act(async () => {
      (skipBtn!.props as { onPress: () => void }).onPress();
    });
    expect(onSkip).toHaveBeenCalledTimes(1);

    const minimizeBtn = buttons.find((p) =>
      p.findAllByType('Text').some((t) => t.props.children === '−'),
    );
    await act(async () => {
      (minimizeBtn!.props as { onPress: () => void }).onPress();
    });
    expect(onToggleMinimized).toHaveBeenCalledTimes(1);
  });
});
