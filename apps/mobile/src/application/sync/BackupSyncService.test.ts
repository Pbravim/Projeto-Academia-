import { describe, expect, it, vi } from 'vitest';

import { BackupSyncService } from './BackupSyncService';

function makeSession(authenticated: boolean) {
  return { isAuthenticated: () => authenticated } as any;
}

describe('BackupSyncService', () => {
  it('skips the engine when logged out', async () => {
    const engine = { run: vi.fn() };
    const svc = new BackupSyncService(makeSession(false), engine, () => 100);

    const result = await svc.syncNow();

    expect(result).toEqual({ status: 'skipped', at: 100 });
    expect(engine.run).not.toHaveBeenCalled();
  });

  it('runs the engine and reports synced when authenticated', async () => {
    const engine = { run: vi.fn().mockResolvedValue(undefined) };
    const svc = new BackupSyncService(makeSession(true), engine, () => 200);

    const result = await svc.syncNow();

    expect(result).toEqual({ status: 'synced', at: 200 });
    expect(engine.run).toHaveBeenCalledTimes(1);
    expect(svc.getLastResult()).toEqual({ status: 'synced', at: 200 });
  });

  it('captures engine failures as an error result instead of throwing', async () => {
    const boom = new Error('network down');
    const engine = { run: vi.fn().mockRejectedValue(boom) };
    const svc = new BackupSyncService(makeSession(true), engine, () => 300);

    const result = await svc.syncNow();

    expect(result.status).toBe('error');
    expect(result.error).toBe(boom);
  });

  it('sinaliza auth-expired quando a sessão caiu durante o run (refresh rejeitado)', async () => {
    // P3 rodada 3 (C): o AuthSession desloga sozinho no 401/403 do refresh; o
    // resultado 'error' genérico escondia que o usuário precisa logar de novo.
    const answers = [true, false]; // autenticado ao entrar, deslogado após o auto-logout
    const session = { isAuthenticated: () => answers.shift() ?? false } as any;
    const engine = { run: vi.fn().mockRejectedValue(new Error('Auth refresh failed: 401')) };
    const svc = new BackupSyncService(session, engine, () => 400);

    const result = await svc.syncNow();

    expect(result.status).toBe('auth-expired');
  });

  it('coalesces concurrent syncNow calls into a single run', async () => {
    let resolveRun: () => void = () => {};
    const engine = { run: vi.fn().mockReturnValue(new Promise<void>((r) => { resolveRun = r; })) };
    const svc = new BackupSyncService(makeSession(true), engine, () => 0);

    const a = svc.syncNow();
    const b = svc.syncNow();
    resolveRun();
    await Promise.all([a, b]);

    expect(engine.run).toHaveBeenCalledTimes(1);
  });
});
