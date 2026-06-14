import { describe, expect, it, vi } from 'vitest';

import { AuthApiClient, AuthApiError } from './AuthApiClient';

const tokens = { accessToken: 'acc', refreshToken: 'ref' };

function okFetch() {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => tokens });
}

describe('AuthApiClient', () => {
  it('POSTs register to the right URL with a JSON body', async () => {
    const fetchFn = okFetch();
    const client = new AuthApiClient('http://localhost:3000/api/v1', fetchFn);

    const result = await client.register({ email: 'a@b.com', password: 'pw', name: 'Al' });

    expect(result).toEqual(tokens);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/auth/register');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'pw', name: 'Al' });
  });

  it('POSTs login and refresh to their endpoints', async () => {
    const fetchFn = okFetch();
    const client = new AuthApiClient('http://localhost:3000/api/v1', fetchFn);

    await client.login({ email: 'a@b.com', password: 'pw' });
    await client.refresh({ refreshToken: 'ref' });

    expect(fetchFn.mock.calls[0][0]).toBe('http://localhost:3000/api/v1/auth/login');
    expect(fetchFn.mock.calls[1][0]).toBe('http://localhost:3000/api/v1/auth/refresh');
  });

  it('throws AuthApiError carrying the status on a non-ok response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const client = new AuthApiClient('http://localhost:3000/api/v1', fetchFn);

    await expect(client.login({ email: 'a@b.com', password: 'bad' })).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 401,
    });
    await expect(client.login({ email: 'a@b.com', password: 'bad' })).rejects.toBeInstanceOf(AuthApiError);
  });
});
