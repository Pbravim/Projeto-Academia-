import type { SyncResponse } from '@academia/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncEngine } from './SyncEngine';

const emptyChanges = () => ({
  exercises: [],
  treinos: [],
  treinoExercicios: [],
  sessaoTreinos: [],
  sessaoExercicios: [],
  seriesRegistradas: [],
  serieSegmentos: [],
  registrosPeso: [],
  userSettings: [],
  exerciseAlternatives: [],
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
  let serieSegmentoRepo: ReturnType<typeof makeRepo>;
  let pesoRepo: ReturnType<typeof makeRepo>;
  let exerciseAlternativeRepo: ReturnType<typeof makeRepo>;

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
      serieSegmentoRepo,
      pesoRepo,
      exerciseAlternativeRepo,
      undefined,
      { attempts: 3, baseDelayMs: 0 },
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
    serieSegmentoRepo = makeRepo();
    pesoRepo = makeRepo();
    exerciseAlternativeRepo = makeRepo();
  });

  it('pusha os vínculos de alternativa dirty e aplica os do servidor após exercises', async () => {
    const link = { exercicioId: 'ex-a', alternativaId: 'ex-b', updatedAt: 'T1', deletedAt: null };
    exerciseAlternativeRepo = makeRepo([link]);
    apiClient.sync = vi.fn().mockResolvedValue({
      serverChanges: { ...emptyChanges(), exerciseAlternatives: [link] },
      newCursor: 'c1',
    });

    await makeEngine().run();

    expect(apiClient.sync.mock.calls[0][0].changes.exerciseAlternatives).toEqual([link]);
    expect(exerciseAlternativeRepo.applyServerRows).toHaveBeenCalledWith([link]);
  });

  it('pusha os segmentos dirty e aplica os do servidor logo após seriesRegistradas (FK)', async () => {
    const segmento = {
      id: 'seg-1', serieId: 'serie-1', ordem: 2, cargaKg: 40, repeticoes: 6,
      descansoSegundos: 30, createdAt: 'T1', updatedAt: 'T1', deletedAt: null,
    };
    serieSegmentoRepo = makeRepo([segmento]);
    const calls: string[] = [];
    serieRepo.applyServerRows.mockImplementation(async () => { calls.push('serie'); });
    serieSegmentoRepo.applyServerRows.mockImplementation(async () => { calls.push('segmento'); });
    apiClient.sync = vi.fn().mockResolvedValue({
      serverChanges: { ...emptyChanges(), seriesRegistradas: [{}], serieSegmentos: [segmento] },
      newCursor: 'c1',
    });

    await makeEngine().run();

    expect(apiClient.sync.mock.calls[0][0].changes.serieSegmentos).toEqual([segmento]);
    expect(serieSegmentoRepo.applyServerRows).toHaveBeenCalledWith([segmento]);
    expect(calls).toEqual(['serie', 'segmento']);
  });

  it('resposta de servidor antigo sem serieSegmentos não quebra', async () => {
    const { serieSegmentos: _omit, ...changesSemSegmentos } = emptyChanges();
    apiClient.sync = vi.fn().mockResolvedValue({
      serverChanges: changesSemSegmentos,
      newCursor: 'c1',
    });

    await expect(makeEngine().run()).resolves.not.toThrow();
    expect(serieSegmentoRepo.applyServerRows).not.toHaveBeenCalled();
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
    // backoff: 3 tentativas antes de desistir em silêncio
    expect(apiClient.sync).toHaveBeenCalledTimes(3);
  });

  it('retries transient failures with backoff and succeeds', async () => {
    const serverResponse: SyncResponse = { serverChanges: emptyChanges(), newCursor: 'c1' };
    apiClient.sync
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockRejectedValueOnce(Object.assign(new Error('Sync failed: 503'), { status: 503 }))
      .mockResolvedValueOnce(serverResponse);
    const engine = makeEngine();
    await engine.run();
    expect(apiClient.sync).toHaveBeenCalledTimes(3);
    expect(storage.setItem).toHaveBeenCalledWith('@sync/cursor', 'c1');
  });

  it('does not retry non-transient errors (4xx)', async () => {
    apiClient.sync.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    const engine = makeEngine();
    await expect(engine.run()).rejects.toThrow('Unauthorized');
    expect(apiClient.sync).toHaveBeenCalledTimes(1);
  });

  it('re-throws on server error (4xx/5xx)', async () => {
    apiClient.sync.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { status: 401 }),
    );
    const engine = makeEngine();
    await expect(engine.run()).rejects.toThrow('Unauthorized');
  });

  // Regressão P0.4 (rodada 3): logout não limpava cursor/dirty — login de outra
  // conta pushava os dados da conta anterior e o cursor stale escondia o
  // histórico da conta nova.
  describe('guarda de troca de conta', () => {
    const makeMapStorage = (initial: Record<string, string> = {}) => {
      const map = new Map(Object.entries(initial));
      return {
        getItem: vi.fn((key: string) => Promise.resolve(map.get(key) ?? null)),
        setItem: vi.fn((key: string, value: string) => {
          map.set(key, value);
          return Promise.resolve();
        }),
      };
    };

    const okResponse = { serverChanges: emptyChanges(), newCursor: 'c-novo' };

    const makeEngineWithAccount = (
      mapStorage: ReturnType<typeof makeMapStorage>,
      current: string | null,
      onSwitch: () => Promise<void>,
    ) =>
      new SyncEngine(
        { sync: apiClient.sync },
        mapStorage,
        exerciseRepo, treinoRepo, treinoExercicioRepo, sessaoTreinoRepo,
        sessaoExercicioRepo, serieRepo, serieSegmentoRepo, pesoRepo, exerciseAlternativeRepo,
        undefined,
        { attempts: 3, baseDelayMs: 0 },
        { current: () => current, onSwitch },
      );

    it('conta trocou: chama onSwitch, ignora o cursor antigo e grava a conta nova', async () => {
      apiClient.sync.mockResolvedValue(okResponse);
      const mapStorage = makeMapStorage({
        '@sync/cursor': 'cursor-da-conta-a',
        '@sync/account': 'a@x.com',
      });
      const onSwitch = vi.fn().mockResolvedValue(undefined);

      await makeEngineWithAccount(mapStorage, 'b@x.com', onSwitch).run();

      expect(onSwitch).toHaveBeenCalledTimes(1);
      expect(apiClient.sync).toHaveBeenCalledWith(
        expect.objectContaining({ since: null }),
      );
      expect(mapStorage.setItem).toHaveBeenCalledWith('@sync/account', 'b@x.com');
    });

    it('mesma conta: não chama onSwitch e usa o cursor salvo', async () => {
      apiClient.sync.mockResolvedValue(okResponse);
      const mapStorage = makeMapStorage({
        '@sync/cursor': 'cursor-salvo',
        '@sync/account': 'a@x.com',
      });
      const onSwitch = vi.fn();

      await makeEngineWithAccount(mapStorage, 'a@x.com', onSwitch).run();

      expect(onSwitch).not.toHaveBeenCalled();
      expect(apiClient.sync).toHaveBeenCalledWith(
        expect.objectContaining({ since: 'cursor-salvo' }),
      );
    });

    it('primeiro sync do device (sem conta gravada): não chama onSwitch', async () => {
      apiClient.sync.mockResolvedValue(okResponse);
      const mapStorage = makeMapStorage();
      const onSwitch = vi.fn();

      await makeEngineWithAccount(mapStorage, 'a@x.com', onSwitch).run();

      expect(onSwitch).not.toHaveBeenCalled();
      expect(mapStorage.setItem).toHaveBeenCalledWith('@sync/account', 'a@x.com');
    });

    it('cursor vazio (limpo no logout) vira since=null', async () => {
      apiClient.sync.mockResolvedValue(okResponse);
      const mapStorage = makeMapStorage({ '@sync/cursor': '' });

      await makeEngineWithAccount(mapStorage, 'a@x.com', vi.fn()).run();

      expect(apiClient.sync).toHaveBeenCalledWith(
        expect.objectContaining({ since: null }),
      );
    });
  });
});
