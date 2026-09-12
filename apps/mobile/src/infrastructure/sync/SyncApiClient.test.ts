import type { SyncRequest } from '@academia/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SyncApiClient } from './SyncApiClient';

// Buraco de teste apontado na rodada 3 (F): o client HTTP do sync não tinha
// nenhuma cobertura — contrato do POST, auth header e propagação de status.

const emptyRequest: SyncRequest = {
  since: null,
  changes: {
    exercises: [], treinos: [], treinoExercicios: [], sessaoTreinos: [],
    sessaoExercicios: [], seriesRegistradas: [], serieSegmentos: [], registrosPeso: [], userSettings: [],
    exerciseAlternatives: [],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SyncApiClient', () => {
  it('POSTa em {baseUrl}/sync com Bearer token e o body do request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ serverChanges: emptyRequest.changes, newCursor: 'c1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new SyncApiClient('https://api.test/api/v1', () => Promise.resolve('tok-123'));
    const result = await client.sync(emptyRequest);

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v1/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-123',
      },
      body: JSON.stringify(emptyRequest),
    });
    expect(result.newCursor).toBe('c1');
  });

  it('erro HTTP vira Error com o status anexado (o SyncEngine decide retry por ele)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const client = new SyncApiClient('https://api.test/api/v1', () => Promise.resolve('tok'));
    const error = await client.sync(emptyRequest).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(503);
    expect(String(error.message)).toContain('503');
  });
});
