import * as SecureStore from 'expo-secure-store';

import type { KeyValueSettings } from './SettingsTokenStore';
import type { StoredTokens, TokenStore } from './TokenStore';

// SecureStore só aceita [A-Za-z0-9._-] em chaves — não reutilizar '@auth/session'.
const KEY = 'auth.session';

/**
 * Persiste a sessão de auth no keychain (iOS) / keystore (Android) via
 * expo-secure-store — os tokens não ficam mais em texto plano no SQLite.
 * Migra uma única vez a sessão legada gravada na tabela settings.
 */
export class SecureTokenStore implements TokenStore {
  constructor(
    private readonly legacySettings?: KeyValueSettings,
    private readonly legacyKey = '@auth/session',
  ) {}

  async load(): Promise<StoredTokens | null> {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) return this.parse(raw);

    if (this.legacySettings) {
      const legacy = await this.legacySettings.getSetting(this.legacyKey);
      const parsed = legacy ? this.parse(legacy) : null;
      if (parsed && legacy) {
        await SecureStore.setItemAsync(KEY, legacy);
        await this.legacySettings.setSetting(this.legacyKey, '');
        return parsed;
      }
    }
    return null;
  }

  async save(tokens: StoredTokens): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  }

  private parse(raw: string): StoredTokens | null {
    try {
      const parsed = JSON.parse(raw) as StoredTokens;
      if (parsed?.accessToken && parsed?.refreshToken && parsed?.email) return parsed;
      return null;
    } catch {
      return null;
    }
  }
}
