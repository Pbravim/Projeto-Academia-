import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SecureTokenStore } from './SecureTokenStore';
import type { StoredTokens } from './TokenStore';

const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => secureStore);

/** Chave literal do keychain — renomeá-la invalida as sessões já salvas. */
const KEY = 'auth.session';
const LEGACY_KEY = '@auth/session';

const TOKENS: StoredTokens = {
  email: 'aluno@academia.app',
  accessToken: 'access-abc',
  refreshToken: 'refresh-xyz',
};
const RAW = JSON.stringify(TOKENS);

const makeLegacySettings = (stored: string | null) => ({
  getSetting: vi.fn().mockResolvedValue(stored),
  setSetting: vi.fn().mockResolvedValue(undefined),
});

describe('SecureTokenStore', () => {
  beforeEach(() => {
    secureStore.getItemAsync.mockReset().mockResolvedValue(null);
    secureStore.setItemAsync.mockReset().mockResolvedValue(undefined);
    secureStore.deleteItemAsync.mockReset().mockResolvedValue(undefined);
  });

  describe('load', () => {
    it('devolve a sessão do keychain sob a chave auth.session', async () => {
      secureStore.getItemAsync.mockResolvedValue(RAW);

      const loaded = await new SecureTokenStore().load();

      expect(secureStore.getItemAsync).toHaveBeenCalledWith(KEY);
      expect(loaded).toEqual(TOKENS);
    });

    it('devolve null quando o keychain está vazio e não há store legado', async () => {
      const store = new SecureTokenStore();

      expect(await store.load()).toBeNull();
      expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('devolve null quando o conteúdo do keychain não é JSON', async () => {
      secureStore.getItemAsync.mockResolvedValue('não-é-json{');

      expect(await new SecureTokenStore().load()).toBeNull();
    });

    it.each([
      ['sem refreshToken', { email: TOKENS.email, accessToken: 'a' }],
      ['sem accessToken', { email: TOKENS.email, refreshToken: 'r' }],
      ['sem email', { accessToken: 'a', refreshToken: 'r' }],
      ['com campos vazios', { email: '', accessToken: '', refreshToken: '' }],
    ])('devolve null quando a sessão está %s', async (_label, payload) => {
      secureStore.getItemAsync.mockResolvedValue(JSON.stringify(payload));

      expect(await new SecureTokenStore().load()).toBeNull();
    });

    it('propaga a falha do módulo nativo em vez de mascarar como deslogado', async () => {
      const boom = new Error('Keychain unavailable');
      secureStore.getItemAsync.mockRejectedValue(boom);

      await expect(new SecureTokenStore().load()).rejects.toBe(boom);
    });
  });

  describe('migração da sessão legada em settings', () => {
    it('move a sessão do settings para o keychain e apaga a legada', async () => {
      const legacy = makeLegacySettings(RAW);

      const loaded = await new SecureTokenStore(legacy).load();

      expect(loaded).toEqual(TOKENS);
      expect(legacy.getSetting).toHaveBeenCalledWith(LEGACY_KEY);
      // Grava o texto original, não um re-serializado — nada de perda de campos extras.
      expect(secureStore.setItemAsync).toHaveBeenCalledWith(KEY, RAW);
      expect(legacy.setSetting).toHaveBeenCalledWith(LEGACY_KEY, '');
    });

    it('não olha o settings quando o keychain já tem sessão', async () => {
      secureStore.getItemAsync.mockResolvedValue(RAW);
      const legacy = makeLegacySettings(RAW);

      await new SecureTokenStore(legacy).load();

      expect(legacy.getSetting).not.toHaveBeenCalled();
      expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('sessão legada inválida: devolve null e não apaga nem migra nada', async () => {
      const legacy = makeLegacySettings('{corrompido');

      expect(await new SecureTokenStore(legacy).load()).toBeNull();
      expect(secureStore.setItemAsync).not.toHaveBeenCalled();
      expect(legacy.setSetting).not.toHaveBeenCalled();
    });

    it('settings vazio: devolve null sem migrar', async () => {
      const legacy = makeLegacySettings(null);

      expect(await new SecureTokenStore(legacy).load()).toBeNull();
      expect(secureStore.setItemAsync).not.toHaveBeenCalled();
      expect(legacy.setSetting).not.toHaveBeenCalled();
    });

    it('respeita uma chave legada customizada', async () => {
      const legacy = makeLegacySettings(RAW);

      await new SecureTokenStore(legacy, '@auth/outra').load();

      expect(legacy.getSetting).toHaveBeenCalledWith('@auth/outra');
      expect(legacy.setSetting).toHaveBeenCalledWith('@auth/outra', '');
    });
  });

  it('save serializa a sessão sob auth.session', async () => {
    await new SecureTokenStore().save(TOKENS);

    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(KEY, RAW);
  });

  it('clear apaga a chave do keychain', async () => {
    await new SecureTokenStore().clear();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(KEY);
  });

  it('o que save grava é exatamente o que load lê de volta', async () => {
    const store = new SecureTokenStore();
    await store.save(TOKENS);
    secureStore.getItemAsync.mockResolvedValue(secureStore.setItemAsync.mock.calls[0][1]);

    expect(await store.load()).toEqual(TOKENS);
  });
});
