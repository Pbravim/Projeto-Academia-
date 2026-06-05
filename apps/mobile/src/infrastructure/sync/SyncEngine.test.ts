import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncEngine } from './SyncEngine';
import type { SyncResponse } from '@academia/contracts';

const emptyChanges = () => ({
  exercises: [],
  treinos: [],
  treinoExercicios: [],
  sessaoTreinos: [],
  sessaoExercicios: [],
  seriesRegistradas: [],
  registrosPeso: [],
  userSettings: [],
});

const makeRepo = (dirtyRows: any[] = []) => ({
  getDirty: vi.fn().mockResolvedValue(dirtyRows),
  applyServerRows: vi.fn().mockResolvedValue(undefined),
});

const makeStorage = (initial: string | null = null) => ({
  getItem: vi.fn().mockResolvedValue(initial),
  setItem: vi.fn().mockResolvedValue(undefined),
});

describe('SyncEngine', () => {
  let apiClient: { sync: any };
  let storage: ReturnType<typeof makeStorage>;
  let exerciseRepo: ReturnType<typeof makeRepo>;
  let treinoRepo: ReturnType<typeof makeRepo>;
  let treinoExercicioRepo: ReturnType<typeof makeRepo>;
  let sessaoTreinoRepo: ReturnType<typeof makeRepo>;
  let sessaoExercicioRepo: ReturnType<typeof makeRepo>;
  let serieRepo: ReturnType<typeof makeRepo>;
  let pesoRepo: ReturnType<typeof makeRepo>;

  const makeEngine = () =>
    new SyncEngine(
      { sync: apiClient.sync },
      storage,
      exerciseRepo,
      treinoRepo,
      treinoExercicioRepo,
      sessaoTreinoRepo,
      sessaoExercicioRepo,
      serieRepo,
      pesoRepo,
    );

  beforeEach(() => {
    apiClient = { sync: vi.fn() };
    storage = makeStorage();
    exerciseRepo = makeRepo();
    treinoRepo = makeRepo();
    treinoExercicioRepo = makeRepo();
    sessaoTreinoRepo = makeRepo();
    sessaoExercicioRepo = makeRepo();
    serieRepo = makeRepo();
    pesoRepo = makeRepo();
  });

  it('sends dirty rows and applies server changes', async () => {
    const serverCursor = '2026-06-05T14:00:00.000Z';
    const serverResponse: SyncResponse = {
      serverChanges: {
        ...emptyChanges(),
        treinos: [
          {
            id: 't1',
            name: 'Server treino',
            objetivo: null,
            createdAt: serverCursor,
            updatedAt: serverCursor,
            deletedAt: null,
          },
        ],
      },
      newCursor: serverCursor,
    };
    apiClient.sync.mockResolvedValue(serverResponse);
    treinoRepo = makeRepo([
      {
        id: 'local-1',
        name: 'Local',
        objetivo: null,
        createdAt: '2026-06-05T10:00:00.000Z',
        updatedAt: '2026-06-05T10:00:00.000Z',
        deletedAt: null,
      },
    ]);

    const engine = makeEngine();
    await engine.run();

    expect(apiClient.sync).toHaveBeenCalledWith({
      since: null,
      changes: expect.objectContaining({
        treinos: [expect.objectContaining({ id: 'local-1' })],
      }),
    });
    expect(treinoRepo.applyServerRows).toHaveBeenCalledWith(
      serverResponse.serverChanges.treinos,
    );
    expect(storage.setItem).toHaveBeenCalledWith(
      '@sync/cursor',
      serverCursor,
    );
  });

  it('passes stored cursor as since on subsequent runs', async () => {
    const cursor = '2026-06-05T12:00:00.000Z';
    storage = makeStorage(cursor);
    apiClient.sync.mockResolvedValue({
      serverChanges: emptyChanges(),
      newCursor: cursor,
    });
    const engine = makeEngine();
    await engine.run();
    expect(apiClient.sync).toHaveBeenCalledWith(
      expect.objectContaining({ since: cursor }),
    );
  });

  it('does not throw on network error (offline-safe)', async () => {
    apiClient.sync.mockRejectedValue(
      new TypeError('Network request failed'),
    );
    const engine = makeEngine();
    await expect(engine.run()).resolves.not.toThrow();
  });

  it('re-throws on server error (4xx/5xx)', async () => {
    apiClient.sync.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { status: 401 }),
    );
    const engine = makeEngine();
    await expect(engine.run()).rejects.toThrow('Unauthorized');
  });
});
