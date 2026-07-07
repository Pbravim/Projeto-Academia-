import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthApiClient, AuthApiError } from '../../infrastructure/auth/AuthApiClient';
import type { StoredTokens, TokenStore } from '../../infrastructure/auth/TokenStore';
import { AuthSession, NotAuthenticatedError } from './AuthSession';

/** Build a JWT-shaped string whose payload carries the given exp (seconds). */
function jwtWithExp(expSeconds: number | null): string {
  const payload = expSeconds === null ? {} : { exp: expSeconds };
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${b64}.sig`;
}

class FakeTokenStore implements TokenStore {
  current: StoredTokens | null = null;
  load = vi.fn(async () => this.current);
  save = vi.fn(async (t: StoredTokens) => { this.current = t; });
  clear = vi.fn(async () => { this.current = null; });
}

function makeClient(fetchImpl: any) {
  return new AuthApiClient('http://localhost:3000/api/v1', fetchImpl);
}

describe('AuthSession', () => {
  let store: FakeTokenStore;

  beforeEach(() => {
    store = new FakeTokenStore();
  });

  it('starts unauthenticated and throws when asked for a token', async () => {
    const session = new AuthSession(makeClient(vi.fn()), store);
    expect(session.isAuthenticated()).toBe(false);
    await expect(session.getAccessToken()).rejects.toBeInstanceOf(NotAuthenticatedError);
  });

  it('login persists tokens and exposes the email', async () => {
    const access = jwtWithExp(2_000); // exp far in the future (seconds)
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ accessToken: access, refreshToken: 'ref' }) });
    const session = new AuthSession(makeClient(fetchFn), store, () => 0);

    await session.login('a@b.com', 'pw');

    expect(session.isAuthenticated()).toBe(true);
    expect(session.email).toBe('a@b.com');
    expect(store.save).toHaveBeenCalledWith({ email: 'a@b.com', accessToken: access, refreshToken: 'ref' });
    expect(await session.getAccessToken()).toBe(access);
  });

  it('restore rehydrates a saved session', async () => {
    store.current = { email: 'a@b.com', accessToken: jwtWithExp(2_000), refreshToken: 'ref' };
    const session = new AuthSession(makeClient(vi.fn()), store, () => 0);

    await session.restore();

    expect(session.isAuthenticated()).toBe(true);
    expect(session.email).toBe('a@b.com');
  });

  it('refreshes the access token when the current one is expired', async () => {
    const expired = jwtWithExp(10); // exp = 10s
    const fresh = jwtWithExp(10_000);
    store.current = { email: 'a@b.com', accessToken: expired, refreshToken: 'ref-1' };
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ accessToken: fresh, refreshToken: 'ref-2' }) });
    // now = 1_000_000 ms (= 1000s), well past exp 10s
    const session = new AuthSession(makeClient(fetchFn), store, () => 1_000_000);
    await session.restore();

    const token = await session.getAccessToken();

    expect(token).toBe(fresh);
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({ refreshToken: 'ref-1' });
    expect(store.save).toHaveBeenCalledWith({ email: 'a@b.com', accessToken: fresh, refreshToken: 'ref-2' });
  });

  it('logs out and clears the store when the refresh token is rejected', async () => {
    const expired = jwtWithExp(10);
    store.current = { email: 'a@b.com', accessToken: expired, refreshToken: 'stale' };
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const session = new AuthSession(makeClient(fetchFn), store, () => 1_000_000);
    await session.restore();

    await expect(session.getAccessToken()).rejects.toBeInstanceOf(AuthApiError);
    expect(session.isAuthenticated()).toBe(false);
    expect(store.clear).toHaveBeenCalled();
  });

  it('logout clears tokens and the store', async () => {
    store.current = { email: 'a@b.com', accessToken: jwtWithExp(2_000), refreshToken: 'ref' };
    const session = new AuthSession(makeClient(vi.fn()), store, () => 0);
    await session.restore();

    await session.logout();

    expect(session.isAuthenticated()).toBe(false);
    expect(store.clear).toHaveBeenCalled();
  });

  // Regressão P0.4 (rodada 3): logout precisa limpar o cursor de sync — stale,
  // ele esconderia o histórico da próxima conta no primeiro pull.
  it('logout invoca o hook onLogout (limpeza do cursor de sync)', async () => {
    store.current = { email: 'a@b.com', accessToken: jwtWithExp(2_000), refreshToken: 'ref' };
    const onLogout = vi.fn().mockResolvedValue(undefined);
    const session = new AuthSession(makeClient(vi.fn()), store, () => 0, undefined, onLogout);
    await session.restore();

    await session.logout();

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
