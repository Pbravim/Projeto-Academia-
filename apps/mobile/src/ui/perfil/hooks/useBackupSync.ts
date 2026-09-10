import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { AuthSession } from '../../../application/auth/AuthSession';
import type { SyncResult } from '../../../application/sync/BackupSyncService';
import { type AppLocale,translate, useLocale } from '../../shared/i18n';

export interface BackupSyncDependencies {
  session: Pick<AuthSession, 'isAuthenticated' | 'email' | 'login' | 'register' | 'logout' | 'restore'>;
  syncNow: () => Promise<SyncResult>;
  restore: () => Promise<void>;
}

function messageFor(result: SyncResult, locale: AppLocale): string | null {
  switch (result.status) {
    case 'synced': return translate(locale, 'perfil.backup.statusSincronizado');
    case 'error': return translate(locale, 'perfil.backup.statusFalha');
    case 'auth-expired': return translate(locale, 'perfil.backup.sessaoExpirada');
    default: return null;
  }
}

function errorMessage(err: unknown, locale: AppLocale): string {
  if (err instanceof Error && /failed: 401/.test(err.message)) return translate(locale, 'perfil.backup.erroCredenciais');
  if (err instanceof Error && err.name === 'AuthApiError') return translate(locale, 'perfil.backup.erroServidor');
  return err instanceof Error ? err.message : translate(locale, 'perfil.backup.erroGenerico');
}

/**
 * Drives the opt-in Backup & Sync UI: session state, login/register/logout, a
 * manual "sync now", and an automatic sync when the app returns to foreground.
 */
export function useBackupSync(deps: BackupSyncDependencies) {
  const locale = useLocale();
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
      setStatus(messageFor(result, locale));
      refresh(); // a rejected refresh token may have logged us out
    } catch (err) {
      // Sem este catch, o auto-sync de foreground (`void sync()`) virava
      // unhandled rejection e o usuário não via status nenhum.
      setStatus(errorMessage(err, locale));
    } finally {
      setBusy(false);
    }
  }, [deps, refresh, locale]);

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
      setStatus(errorMessage(err, locale));
    } finally {
      setBusy(false);
    }
  }, [deps.session, refresh, sync, locale]);

  const register = useCallback(async (e: string, password: string, name?: string) => {
    setBusy(true);
    setStatus(null);
    try {
      await deps.session.register(e.trim(), password, name?.trim() || undefined);
      refresh();
      await sync();
    } catch (err) {
      setStatus(errorMessage(err, locale));
    } finally {
      setBusy(false);
    }
  }, [deps.session, refresh, sync, locale]);

  const logout = useCallback(async () => {
    await deps.session.logout();
    setStatus(null);
    refresh();
  }, [deps.session, refresh]);

  return { authenticated, email, busy, status, login, register, logout, syncNow: sync };
}
