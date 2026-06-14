import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { AuthSession } from '../../../application/auth/AuthSession';
import type { SyncResult } from '../../../application/sync/BackupSyncService';

export interface BackupSyncDependencies {
  session: Pick<AuthSession, 'isAuthenticated' | 'email' | 'login' | 'register' | 'logout' | 'restore'>;
  syncNow: () => Promise<SyncResult>;
  restore: () => Promise<void>;
}

function messageFor(result: SyncResult): string | null {
  switch (result.status) {
    case 'synced': return 'Sincronizado';
    case 'error': return 'Falha ao sincronizar — tentaremos de novo mais tarde';
    default: return null;
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && /failed: 401/.test(err.message)) return 'Email ou senha incorretos';
  if (err instanceof Error && err.name === 'AuthApiError') return 'Não foi possível conectar ao servidor';
  return err instanceof Error ? err.message : 'Algo deu errado';
}

/**
 * Drives the opt-in Backup & Sync UI: session state, login/register/logout, a
 * manual "sync now", and an automatic sync when the app returns to foreground.
 */
export function useBackupSync(deps: BackupSyncDependencies) {
  const [authenticated, setAuthenticated] = useState(deps.session.isAuthenticated());
  const [email, setEmail] = useState<string | null>(deps.session.email);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setAuthenticated(deps.session.isAuthenticated());
    setEmail(deps.session.email);
  }, [deps.session]);

  const sync = useCallback(async () => {
    setBusy(true);
    try {
      const result = await deps.syncNow();
      setStatus(messageFor(result));
      refresh(); // a rejected refresh token may have logged us out
    } finally {
      setBusy(false);
    }
  }, [deps, refresh]);

  // Rehydrate a saved session at mount.
  useEffect(() => {
    let active = true;
    void deps.restore().finally(() => { if (active) refresh(); });
    return () => { active = false; };
  }, [deps, refresh]);

  // Sync when the app returns to the foreground (only if logged in).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && deps.session.isAuthenticated()) void sync();
    });
    return () => subscription.remove();
  }, [deps.session, sync]);

  const login = useCallback(async (e: string, password: string) => {
    setBusy(true);
    setStatus(null);
    try {
      await deps.session.login(e.trim(), password);
      refresh();
      await sync();
    } catch (err) {
      setStatus(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [deps.session, refresh, sync]);

  const register = useCallback(async (e: string, password: string, name?: string) => {
    setBusy(true);
    setStatus(null);
    try {
      await deps.session.register(e.trim(), password, name?.trim() || undefined);
      refresh();
      await sync();
    } catch (err) {
      setStatus(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [deps.session, refresh, sync]);

  const logout = useCallback(async () => {
    await deps.session.logout();
    setStatus(null);
    refresh();
  }, [deps.session, refresh]);

  return { authenticated, email, busy, status, login, register, logout, syncNow: sync };
}
