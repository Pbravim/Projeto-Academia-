import type { StoredTokens, TokenStore } from './TokenStore';

/** Minimal key/value surface — satisfied by the app's SQLite database client. */
export interface KeyValueSettings {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

/**
 * Persists the auth session in the app's SQLite settings table.
 *
 * NOTE: this is adequate for the current local-only milestone. For production,
 * swap to an expo-secure-store-backed TokenStore (keychain/keystore) — that's a
 * drop-in replacement of this class behind the {@link TokenStore} interface,
 * once `expo-secure-store` is part of the native build.
 */
export class SettingsTokenStore implements TokenStore {
  constructor(
    private readonly settings: KeyValueSettings,
    private readonly key = '@auth/session',
  ) {}

  async load(): Promise<StoredTokens | null> {
    const raw = await this.settings.getSetting(this.key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredTokens;
      if (parsed?.accessToken && parsed?.refreshToken && parsed?.email) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  async save(tokens: StoredTokens): Promise<void> {
    await this.settings.setSetting(this.key, JSON.stringify(tokens));
  }

  async clear(): Promise<void> {
    await this.settings.setSetting(this.key, '');
  }
}
