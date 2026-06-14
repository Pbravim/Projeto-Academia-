import type { KeyValueSettings } from '../auth/SettingsTokenStore';

/**
 * Adapts the app's SQLite settings store to the `StorageAdapter` shape the
 * {@link SyncEngine} expects (getItem/setItem) — used to persist the sync cursor.
 */
export class SettingsStorageAdapter {
  constructor(private readonly settings: KeyValueSettings) {}

  getItem(key: string): Promise<string | null> {
    return this.settings.getSetting(key);
  }

  setItem(key: string, value: string): Promise<void> {
    return this.settings.setSetting(key, value);
  }
}
