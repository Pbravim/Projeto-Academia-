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

    await Promise.all([
      serverChanges.exercises.length > 0
        ? this.exerciseRepo.applyServerRows(serverChanges.exercises)
        : Promise.resolve(),
      serverChanges.treinos.length > 0
        ? this.treinoRepo.applyServerRows(serverChanges.treinos)
        : Promise.resolve(),
      serverChanges.treinoExercicios.length > 0
        ? this.treinoExercicioRepo.applyServerRows(
            serverChanges.treinoExercicios,
          )
        : Promise.resolve(),
      serverChanges.sessaoTreinos.length > 0
        ? this.sessaoTreinoRepo.applyServerRows(
            serverChanges.sessaoTreinos,
          )
        : Promise.resolve(),
      serverChanges.sessaoExercicios.length > 0
        ? this.sessaoExercicioRepo.applyServerRows(
            serverChanges.sessaoExercicios,
          )
        : Promise.resolve(),
      serverChanges.seriesRegistradas.length > 0
        ? this.serieRepo.applyServerRows(serverChanges.seriesRegistradas)
        : Promise.resolve(),
      serverChanges.registrosPeso.length > 0
        ? this.pesoRepo.applyServerRows(serverChanges.registrosPeso)
        : Promise.resolve(),
    ]);

    await this.storage.setItem(CURSOR_KEY, newCursor);
  }
}
