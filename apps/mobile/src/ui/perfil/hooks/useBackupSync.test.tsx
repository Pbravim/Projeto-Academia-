import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '../../../test/renderHook';

vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));
vi.mock('react-native', () => ({
  AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}));
import { useBackupSync, type BackupSyncDependencies } from './useBackupSync';

// Buraco de teste da rodada 3 (F) + regressão do fix da frente 7: sync() sem
// catch virava unhandled rejection no auto-sync de foreground e o usuário não
// via status nenhum.

const makeDeps = (overrides?: Partial<BackupSyncDependencies>): BackupSyncDependencies => ({
  session: {
    isAuthenticated: () => true,
    email: 'a@x.com',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    restore: vi.fn().mockResolvedValue(undefined),
  },
  syncNow: vi.fn().mockResolvedValue({ status: 'synced' }),
  restore: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useBackupSync — sync', () => {
  it('sucesso seta o status de sincronizado e libera o busy', async () => {
    const deps = makeDeps();
    const { result } = await renderHook(() => useBackupSync(deps));
    await flush();

    await act(async () => {
      await result.current.syncNow();
    });

    expect(result.current.status).not.toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('falha do sync NÃO rejeita (auto-sync usa void) e mostra o erro no status', async () => {
    const deps = makeDeps({
      syncNow: vi.fn().mockRejectedValue(new Error('rede caiu')),
    });
    const { result } = await renderHook(() => useBackupSync(deps));
    await flush();

    await act(async () => {
      await expect(result.current.syncNow()).resolves.toBeUndefined();
    });

    expect(result.current.status).toBe('rede caiu');
    expect(result.current.busy).toBe(false);
  });
});
