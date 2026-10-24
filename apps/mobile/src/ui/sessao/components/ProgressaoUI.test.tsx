import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { GetHistoricoAnteriorDaSessaoUseCase } from '../../../application/historico/use-cases/GetHistoricoAnteriorDaSessaoUseCase';
import { InMemoryHistoricoRepository } from '../../../infrastructure/historico/InMemoryHistoricoRepository';
import { progressaoDetalhe, progressaoExecucao, progressaoSerie } from '../../../test/progressaoFixtures';
import { HistoricoProgressaoPanel } from '../../historico/components/HistoricoProgressaoPanel';
import { buildHistoricoProgressaoViewModel } from '../../historico/presenters/buildHistoricoProgressaoViewModel';
import { SessaoResumoScreen } from '../screens/SessaoResumoScreen';

import { SeriesRegistradasList } from './SeriesRegistradasList';
import { SessaoProgressaoProvider } from './SessaoProgressaoContext';

const host = vi.hoisted(() => (name: string) => (props: Record<string, unknown>) => createElement(name, props, props.children as ReactNode));
vi.mock('react-native', () => ({
  View: host('View'), Text: host('Text'), Pressable: host('Pressable'), ScrollView: host('ScrollView'),
  StyleSheet: { create: (s: unknown) => s },
}));
vi.mock('./SerieRow', () => ({ SerieRow: host('SerieRow') }));
vi.mock('./SerieEditor', () => ({ SerieEditor: host('SerieEditor') }));
vi.mock('../../shared/LineChart', () => ({ LineChart: host('LineChart') }));
vi.mock('../../shared/i18n', async () => {
  const { translate } = await import('../../shared/i18n/core');
  return { useT: () => (key: string, opts?: Record<string, unknown>) => translate('en-US', key, opts), useLocale: () => 'en-US' };
});
vi.mock('../../shared/theme', () => ({ useTheme: () => new Proxy({}, { get: (_t, key) => String(key) }) }));

async function render(el: ReturnType<typeof createElement>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}
const texts = (renderer: ReactTestRenderer) => renderer.root.findAllByType('Text').map((n) => n.props.children);

describe('progression UI', () => {
  it('switches load / volume / e1RM with accessible selected states and keeps a single-session chart', async () => {
    const vm = buildHistoricoProgressaoViewModel([progressaoExecucao()], 'en-US');
    const renderer = await render(createElement(HistoricoProgressaoPanel, { progressao: vm }));
    expect(renderer.root.findByType('LineChart').props.points[0].value).toBe(60);
    expect(texts(renderer)).toContain('First recorded performance');
    const buttons = renderer.root.findAllByType('Pressable');
    expect(buttons.map((b) => b.props.accessibilityRole)).toEqual(['button', 'button', 'button']);
    expect(buttons.map((b) => b.props.accessibilityLabel)).toEqual(['Maximum load', 'Volume', 'e1RM']);
    await act(async () => { buttons[1].props.onPress(); });
    expect(renderer.root.findByType('LineChart').props.points[0].value).toBe(360);
    expect(buttons[1].props.accessibilityState.selected).toBe(true);
    expect(buttons[0].props.accessibilityState.selected).toBe(false);
    await act(async () => { buttons[2].props.onPress(); });
    expect(renderer.root.findByType('LineChart').props.points[0].value).toBe(72);
    expect(texts(renderer)).toContain('Personal records');
    const empty = await render(createElement(HistoricoProgressaoPanel, { progressao: buildHistoricoProgressaoViewModel([], 'en-US') }));
    expect(empty.toJSON()).toBeNull();
  });

  it('renders active-set records from real historical data through the provider and removes them after an edit', async () => {
    const repo = new InMemoryHistoricoRepository();
    repo.seed('exercise', progressaoExecucao());
    repo.seed('exercise', progressaoExecucao({ sessaoTreinoId: 'older', dataExecucao: '2026-09-01T10:00:00Z' }));
    const useCase = new GetHistoricoAnteriorDaSessaoUseCase(repo);
    let detalhe = progressaoDetalhe();
    const el = () => createElement(SessaoProgressaoProvider, { detalhe, useCase,
      children: createElement(SeriesRegistradasList, {
        series: detalhe.exercicios[0].series, trackingType: 'reps_load', realizado: false,
        bestSerieId: 'new', locale: 'en-US', onDeleteSerie: vi.fn(), onUpdateSerie: vi.fn(),
        onRegistrarSegmento: vi.fn(), onRemoverSegmento: vi.fn(),
      }),
    });
    const renderer = await render(el());
    expect(texts(renderer)).toContain('PR · New personal record');
    expect(texts(renderer)).toContain('Last: 60 kg × 6');
    expect(texts(renderer)).toContain('Previous: 60 kg × 6');
    detalhe = progressaoDetalhe([progressaoSerie({ cargaKg: 50 })]);
    await act(async () => { renderer.update(el()); });
    expect(texts(renderer)).not.toContain('PR · New personal record');
    detalhe = progressaoDetalhe([]);
    await act(async () => { renderer.update(el()); });
    expect(texts(renderer)).not.toContain('PR · New personal record');
  });

  it('shows the daily PR section and strength separately from volume using the real summary presenter', async () => {
    const repo = new InMemoryHistoricoRepository();
    repo.seed('exercise', progressaoExecucao());
    const renderer = await render(createElement(SessaoResumoScreen, {
      detalhe: progressaoDetalhe(), onFechar: vi.fn(), getHistoricoAnterior: new GetHistoricoAnteriorDaSessaoUseCase(repo),
    }));
    expect(texts(renderer)).toContain('Today’s PRs');
    const content = JSON.stringify(renderer.toJSON());
    expect(content).toContain('Strength (e1RM)');
    expect(content).toContain('78');
    expect(content).toContain('390');
  });

  it('does not invent PRs when the historical baseline cannot be loaded', async () => {
    const getHistoricoAnterior = { execute: vi.fn().mockRejectedValue(new Error('db failed')) } as unknown as GetHistoricoAnteriorDaSessaoUseCase;
    const renderer = await render(createElement(SessaoResumoScreen, { detalhe: progressaoDetalhe(), onFechar: vi.fn(), getHistoricoAnterior }));
    expect(texts(renderer)).toContain('Could not compare personal records with history.');
    expect(texts(renderer)).not.toContain('Today’s PRs');
  });
});
