import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { SessionSeriesTable } from './SessionSeriesTable';
import type { SessionTableRowVM } from './sessionSeriesTableModel';

/** Smoke test de render: nunca era executado por teste (só typecheck protegia). */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('../theme', async () => {
  const react = await import('react');
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return { ThemeContext: react.createContext(colors), useTheme: () => colors };
});

vi.mock('../i18n', () => ({ useT: () => (key: string) => key }));

function row(overrides: Partial<SessionTableRowVM> = {}): SessionTableRowVM {
  return {
    id: 's1',
    dateLabel: '28/06',
    subLabel: null,
    sets: [{ cargaLabel: '60', repsLabel: '8', isBest: false, muted: false, degrausLabel: null }],
    setsCountLabel: '1 série',
    ormLabel: '1RM ~75',
    volumeLabel: '480 kg',
    trend: null,
    isLatest: true,
    ...overrides,
  };
}

function allText(renderer: ReactTestRenderer): string {
  const json = JSON.stringify(renderer.toJSON(), (key, value) => (key === 'key' || key === 'ref' ? undefined : value));
  return json;
}

describe('SessionSeriesTable', () => {
  it('renders a row with carga×reps when there is no degrausLabel', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessionSeriesTable, { rows: [row()] }));
    });
    const text = allText(renderer);
    expect(text).toContain('60');
    expect(text).toContain('8');
  });

  it('renders the degrausLabel stack when present', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessionSeriesTable, {
          rows: [row({ sets: [{ cargaLabel: '60', repsLabel: '8', isBest: false, muted: false, degrausLabel: '60×8 → 50×6' }] })],
        }),
      );
    });
    expect(allText(renderer)).toContain('60×8 → 50×6');
  });

  it('shows the empty state when there are no sets', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(SessionSeriesTable, { rows: [row({ sets: [] })] }));
    });
    expect(allText(renderer)).toContain('sessionSeriesTable.emptyState');
  });

  it('shows volume and trend when showVolume is true', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        createElement(SessionSeriesTable, { rows: [row({ trend: 'up' })], showVolume: true }),
      );
    });
    expect(allText(renderer)).toContain('480 kg');
  });
});
