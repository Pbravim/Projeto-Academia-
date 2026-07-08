import type { AuthSession } from '../auth/AuthSession';

interface Runnable {
  run(): Promise<void>;
}

export interface SyncResult {
  /** 'auth-expired': a sessão caiu durante o run (refresh rejeitado) — o usuário precisa logar de novo. */
  status: 'synced' | 'skipped' | 'error' | 'auth-expired';
  at: number;
  error?: unknown;
}

/**
 * Session-aware wrapper around the {@link SyncEngine}. Offline-first: a sync is a
 * no-op ("skipped") when the user is logged out, and network failures surface as
 * an "error" result rather than throwing into the caller's UI flow.
 */
export class BackupSyncService {
  private lastResult: SyncResult | null = null;
  private inFlight: Promise<SyncResult> | null = null;

  constructor(
    private readonly session: AuthSession,
    private readonly engine: Runnable,
    private readonly now: () => number = () => Date.now(),
  ) {}

  getLastResult(): SyncResult | null {
    return this.lastResult;
  }

  /** Runs a sync if authenticated. Coalesces concurrent calls into one run. */
  syncNow(): Promise<SyncResult> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.runOnce().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async runOnce(): Promise<SyncResult> {
    if (!this.session.isAuthenticated()) {
      return (this.lastResult = { status: 'skipped', at: this.now() });
    }
    try {
      await this.engine.run();
      return (this.lastResult = { status: 'synced', at: this.now() });
    } catch (error) {
      // Entramos autenticados; se a sessão caiu durante o run, o AuthSession
      // auto-deslogou por refresh rejeitado (401/403) — sinal claro para a UI.
      if (!this.session.isAuthenticated()) {
        return (this.lastResult = { status: 'auth-expired', at: this.now(), error });
      }
      return (this.lastResult = { status: 'error', at: this.now(), error });
    }
  }
}
