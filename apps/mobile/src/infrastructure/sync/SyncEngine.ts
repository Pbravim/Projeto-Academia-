import type {
  SyncRequest,
  SyncResponse,
  ExerciseSyncRow,
  TreinoSyncRow,
  TreinoExercicioSyncRow,
  SessaoTreinoSyncRow,
  SessaoExercicioSyncRow,
  SerieRegistradaSyncRow,
  RegistroPesoSyncRow,
} from '@academia/contracts';

const CURSOR_KEY = '@sync/cursor';

interface SyncClient {
  sync(req: SyncRequest): Promise<SyncResponse>;
}

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

interface SyncableRepo<T> {
  getDirty(): Promise<T[]>;
  applyServerRows(rows: T[]): Promise<void>;
}

interface TransactionRunner {
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}

export class SyncEngine {
  constructor(
    private readonly client: SyncClient,
    private readonly storage: StorageAdapter,
    private readonly exerciseRepo: SyncableRepo<ExerciseSyncRow>,
    private readonly treinoRepo: SyncableRepo<TreinoSyncRow>,
    private readonly treinoExercicioRepo: SyncableRepo<TreinoExercicioSyncRow>,
    private readonly sessaoTreinoRepo: SyncableRepo<SessaoTreinoSyncRow>,
    private readonly sessaoExercicioRepo: SyncableRepo<SessaoExercicioSyncRow>,
    private readonly serieRepo: SyncableRepo<SerieRegistradaSyncRow>,
    private readonly pesoRepo: SyncableRepo<RegistroPesoSyncRow>,
    private readonly database?: TransactionRunner,
  ) {}

  async run(): Promise<void> {
    const since = await this.storage.getItem(CURSOR_KEY);

    const [
      exercises,
      treinos,
      treinoExercicios,
      sessaoTreinos,
      sessaoExercicios,
      seriesRegistradas,
      registrosPeso,
    ] = await Promise.all([
      this.exerciseRepo.getDirty(),
      this.treinoRepo.getDirty(),
      this.treinoExercicioRepo.getDirty(),
      this.sessaoTreinoRepo.getDirty(),
      this.sessaoExercicioRepo.getDirty(),
      this.serieRepo.getDirty(),
      this.pesoRepo.getDirty(),
    ]);

    let response: SyncResponse;
    try {
      response = await this.client.sync({
        since,
        changes: {
          exercises,
          treinos,
          treinoExercicios,
          sessaoTreinos,
          sessaoExercicios,
          seriesRegistradas,
          registrosPeso,
          userSettings: [],
        },
      });
    } catch (err: unknown) {
      if (err instanceof TypeError) return; // network offline — silent
      throw err;
    }

    const { serverChanges, newCursor } = response;

    const applyIfAny = <T>(rows: T[], repo: { applyServerRows(r: T[]): Promise<void> }) =>
      rows.length > 0 ? repo.applyServerRows(rows) : Promise.resolve();

    // Transação única: sem ela cada linha do servidor vira um auto-commit
    // próprio e uma falha no meio deixa o banco em estado parcial.
    const applyAll = () =>
      Promise.all([
        applyIfAny(serverChanges.exercises, this.exerciseRepo),
        applyIfAny(serverChanges.treinos, this.treinoRepo),
        applyIfAny(serverChanges.treinoExercicios, this.treinoExercicioRepo),
        applyIfAny(serverChanges.sessaoTreinos, this.sessaoTreinoRepo),
        applyIfAny(serverChanges.sessaoExercicios, this.sessaoExercicioRepo),
        applyIfAny(serverChanges.seriesRegistradas, this.serieRepo),
        applyIfAny(serverChanges.registrosPeso, this.pesoRepo),
      ]);

    if (this.database) {
      await this.database.withTransaction(applyAll);
    } else {
      await applyAll();
    }

    await this.storage.setItem(CURSOR_KEY, newCursor);
  }
}
