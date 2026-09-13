import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PerfilFeature } from './PerfilFeature';

/**
 * Smoke test de render: cobre a orquestração de "Exportar histórico" (fatia
 * #28) — abrir o diálogo de formato e exportar chamando o use case injetado.
 * Hooks e telas pesadas viram stubs; o que se exercita é o PerfilFeature.
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('./screens/PerfilScreen', () => ({ PerfilScreen: host('PerfilScreen') }));
vi.mock('./components/BackupSyncSection', () => ({ BackupSyncSection: host('BackupSyncSection') }));
vi.mock('../shared/components/ConfirmDialog', () => ({ ConfirmDialog: host('ConfirmDialog') }));
vi.mock('../shared/components/ExportFormatDialog', () => ({ ExportFormatDialog: host('ExportFormatDialog') }));

vi.mock('../peso/hooks/usePesoController', () => ({
  usePesoController: vi.fn(() => ({})),
}));
vi.mock('./hooks/usePerfilController', () => ({
  usePerfilController: vi.fn(() => ({ displayName: 'Ana', photoUri: null })),
}));
vi.mock('./hooks/useStatsController', () => ({
  useStatsController: vi.fn(() => ({ stats: null, isLoading: false })),
}));

vi.mock('../shared/i18n', () => ({ useT: () => (key: string) => key }));

const dependencies = {
  peso: {} as never,
  getDashboardStats: {} as never,
  exportarHistorico: { execute: vi.fn().mockResolvedValue(undefined) },
  exportarBanco: { execute: vi.fn().mockResolvedValue(undefined) },
  importarBanco: { execute: vi.fn().mockResolvedValue({ status: 'not_imported' }) },
  resetHistorico: { execute: vi.fn().mockResolvedValue(undefined) },
  logger: { error: vi.fn(), info: vi.fn() },
  backup: {} as never,
} as unknown as Parameters<typeof PerfilFeature>[0]['dependencies'];

async function render(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(PerfilFeature, { dependencies }));
  });
  return renderer;
}

describe('PerfilFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza a PerfilScreen com o diálogo de formato fechado', async () => {
    const renderer = await render();
    expect(renderer.root.findAllByType('PerfilScreen')).toHaveLength(1);
    expect(renderer.root.findByType('ExportFormatDialog').props.visible).toBe(false);
  });

  it('onExportar da tela abre o diálogo de formato', async () => {
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');

    await act(async () => {
      await (screen.props as { onExportar: () => Promise<void> }).onExportar();
    });

    expect(renderer.root.findByType('ExportFormatDialog').props.visible).toBe(true);
  });

  it('selecionar um formato no diálogo exporta e fecha', async () => {
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => {
      await (screen.props as { onExportar: () => Promise<void> }).onExportar();
    });

    const dialog = renderer.root.findByType('ExportFormatDialog');
    await act(async () => {
      await (dialog.props as { onSelect: (f: string) => void }).onSelect('json');
    });

    expect(dependencies.exportarHistorico.execute).toHaveBeenCalledWith('json');
    expect(renderer.root.findByType('ExportFormatDialog').props.visible).toBe(false);
  });

  it('erro ao exportar mostra o diálogo de info com a mensagem', async () => {
    vi.mocked(dependencies.exportarHistorico.execute).mockRejectedValueOnce(new Error('falhou'));
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => { await (screen.props as { onExportar: () => Promise<void> }).onExportar(); });

    const dialog = renderer.root.findByType('ExportFormatDialog');
    await act(async () => { await (dialog.props as { onSelect: (f: string) => void }).onSelect('csv'); });

    const infoDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.message === 'falhou');
    expect(infoDialog).toBeDefined();
  });

  it('erro não-Error ao exportar usa a mensagem padrão e fecha ao confirmar', async () => {
    vi.mocked(dependencies.exportarHistorico.execute).mockRejectedValueOnce('boom');
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => { await (screen.props as { onExportar: () => Promise<void> }).onExportar(); });

    const dialog = renderer.root.findByType('ExportFormatDialog');
    await act(async () => { await (dialog.props as { onSelect: (f: string) => void }).onSelect('csv'); });

    const findInfoDialog = () => renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.hideCancel === true);
    expect(findInfoDialog()?.props.visible).toBe(true);
    expect(findInfoDialog()?.props.message).toBe('perfil.dialogs.erroExportar');

    await act(async () => { (findInfoDialog()?.props as { onConfirm: () => void }).onConfirm(); });
    expect(findInfoDialog()?.props.visible).toBe(false);
  });

  it('onReset chama resetHistorico.execute', async () => {
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => { await (screen.props as { onReset: () => Promise<void> }).onReset(); });
    expect(dependencies.resetHistorico.execute).toHaveBeenCalledTimes(1);
  });

  it('erro ao resetar mostra o diálogo de info', async () => {
    vi.mocked(dependencies.resetHistorico.execute).mockRejectedValueOnce(new Error('reset falhou'));
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => { await (screen.props as { onReset: () => Promise<void> }).onReset(); });

    const infoDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.message === 'reset falhou');
    expect(infoDialog).toBeDefined();
  });

  it('onBackup chama exportarBanco.execute', async () => {
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => { await (screen.props as { onBackup: () => Promise<void> }).onBackup(); });
    expect(dependencies.exportarBanco.execute).toHaveBeenCalledTimes(1);
  });

  it('erro ao fazer backup mostra o diálogo de info', async () => {
    vi.mocked(dependencies.exportarBanco.execute).mockRejectedValueOnce(new Error('backup falhou'));
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => { await (screen.props as { onBackup: () => Promise<void> }).onBackup(); });

    const infoDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.message === 'backup falhou');
    expect(infoDialog).toBeDefined();
  });

  it('onImport da tela abre o diálogo de confirmação; confirmar chama importarBanco', async () => {
    vi.mocked(dependencies.importarBanco.execute).mockResolvedValueOnce({ status: 'imported' } as never);
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');

    await act(async () => { (screen.props as { onImport: () => void }).onImport(); });

    const confirmDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.destructive === true);
    expect(confirmDialog?.props.visible).toBe(true);

    await act(async () => { await (confirmDialog?.props as { onConfirm: () => Promise<void> }).onConfirm(); });

    expect(dependencies.importarBanco.execute).toHaveBeenCalledTimes(1);
    const infoDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.title === 'perfil.dialogs.backupRestauradoTitle');
    expect(infoDialog?.props.visible).toBe(true);
  });

  it('cancelar a importação fecha o diálogo de confirmação sem chamar importarBanco', async () => {
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => { (screen.props as { onImport: () => void }).onImport(); });

    const confirmDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.destructive === true);
    await act(async () => { (confirmDialog?.props as { onCancel: () => void }).onCancel(); });

    expect(dependencies.importarBanco.execute).not.toHaveBeenCalled();
  });

  it('erro ao importar mostra o diálogo de info', async () => {
    vi.mocked(dependencies.importarBanco.execute).mockRejectedValueOnce(new Error('import falhou'));
    const renderer = await render();
    const screen = renderer.root.findByType('PerfilScreen');
    await act(async () => { (screen.props as { onImport: () => void }).onImport(); });

    const confirmDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.destructive === true);
    await act(async () => { await (confirmDialog?.props as { onConfirm: () => Promise<void> }).onConfirm(); });

    const infoDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.message === 'import falhou');
    expect(infoDialog).toBeDefined();
  });
});
