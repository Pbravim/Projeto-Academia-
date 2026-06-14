import { beforeEach, describe, expect, it } from 'vitest';

import { SettingsTokenStore } from './SettingsTokenStore';

class FakeSettings {
  map = new Map<string, string>();
  async getSetting(k: string) { return this.map.get(k) ?? null; }
  async setSetting(k: string, v: string) { this.map.set(k, v); }
}

const tokens = { email: 'a@b.com', accessToken: 'acc', refreshToken: 'ref' };

describe('SettingsTokenStore', () => {
  let settings: FakeSettings;
  let store: SettingsTokenStore;

  beforeEach(() => {
    settings = new FakeSettings();
    store = new SettingsTokenStore(settings);
  });

  it('returns null when nothing is stored', async () => {
    expect(await store.load()).toBeNull();
  });

  it('round-trips a saved session', async () => {
    await store.save(tokens);
    expect(await store.load()).toEqual(tokens);
  });

  it('clear() makes load() return null', async () => {
    await store.save(tokens);
    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it('returns null for corrupt or partial stored data', async () => {
    await settings.setSetting('@auth/session', 'not json');
    expect(await store.load()).toBeNull();
    await settings.setSetting('@auth/session', JSON.stringify({ email: 'x' }));
    expect(await store.load()).toBeNull();
  });
});
