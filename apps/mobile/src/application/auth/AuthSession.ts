import { AuthApiClient, AuthApiError } from '../../infrastructure/auth/AuthApiClient';
import type { StoredTokens, TokenStore } from '../../infrastructure/auth/TokenStore';

export class NotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'NotAuthenticatedError';
  }
}

/** Reads the `exp` claim (seconds since epoch) from a JWT without verifying it. */
function readJwtExpMs(jwt: string): number | null {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Owns the authenticated session: login / register / logout and minting a fresh
 * access token (refreshing transparently when the current one is near expiry).
 * Offline-first: the app works without a session; this is only exercised when the
 * user opts into backup/sync.
 */
export class AuthSession {
  private tokens: StoredTokens | null = null;

  constructor(
    private readonly client: AuthApiClient,
    private readonly store: TokenStore,
    private readonly now: () => number = () => Date.now(),
    /** Refresh this many ms before the access token actually expires. */
    private readonly refreshSkewMs = 30_000,
    /**
     * Invoked after the tokens are cleared on logout. Wired by the composition
     * root to clear the sync cursor — a stale cursor from a previous account
     * would hide the next account's history on the first pull.
     */
    private readonly onLogout?: () => Promise<void>,
  ) {}

  /** Rehydrate a previously-saved session at app start. */
  async restore(): Promise<void> {
    this.tokens = await this.store.load();
  }

  isAuthenticated(): boolean {
    return this.tokens !== null;
  }

  get email(): string | null {
    return this.tokens?.email ?? null;
  }

  async register(email: string, password: string, name?: string): Promise<void> {
    const tokens = await this.client.register({ email, password, name });
    await this.persist(email, tokens);
  }

  async login(email: string, password: string): Promise<void> {
    const tokens = await this.client.login({ email, password });
    await this.persist(email, tokens);
  }

  async logout(): Promise<void> {
    this.tokens = null;
    await this.store.clear();
    await this.onLogout?.();
  }

  /**
   * Returns a valid access token, refreshing first if the current one is expired
   * or within the skew window. Throws {@link NotAuthenticatedError} when logged
   * out, and clears the session if the refresh token is rejected.
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) throw new NotAuthenticatedError();

    const expMs = readJwtExpMs(this.tokens.accessToken);
    const stillValid = expMs === null || this.now() < expMs - this.refreshSkewMs;
    if (stillValid) return this.tokens.accessToken;

    try {
      const refreshed = await this.client.refresh({ refreshToken: this.tokens.refreshToken });
      await this.persist(this.tokens.email, refreshed);
      return refreshed.accessToken;
    } catch (err) {
      if (err instanceof AuthApiError && (err.status === 401 || err.status === 403)) {
        await this.logout();
      }
      throw err;
    }
  }

  private async persist(email: string, tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    this.tokens = { email, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    await this.store.save(this.tokens);
  }
}
