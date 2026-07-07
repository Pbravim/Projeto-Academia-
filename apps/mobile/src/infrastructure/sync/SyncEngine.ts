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

export const SYNC_CURSOR_KEY = '@sync/cursor';
export const SYNC_ACCOUNT_KEY = '@sync/account';

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

interface RetryPolicy {
  attempts: number;
  baseDelayMs: number;
}

const DEFAULT_RETRY: RetryPolicy = { attempts: 3, baseDelayMs: 1000 };

/** Transitório = rede fora (fetch lança TypeError) ou erro 5xx do servidor. */
function isTransient(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const status = (err as { status?: number }).status;
  return typeof status === 'number' && status >= 500;
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
    private readonly retry: RetryPolicy = DEFAULT_RETRY,
    /**
     * Guarda de troca de conta: `current` devolve o e-mail autenticado no
     * momento do sync; `onSwitch` é invocado quando a conta mudou desde o
     * último sync (o composition root limpa os flags dirty herdados, para os
     * dados da conta anterior nunca serem pushados para a conta nova).
     */
    private readonly account?: {
      current: () => string | null;
      onSwitch: () => Promise<void>;
    },
  ) {}

  private async syncWithRetry(request: SyncRequest): Promise<SyncResponse> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.client.sync(request);
      } catch (err) {
        if (!isTransient(err) || attempt >= this.retry.attempts - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, this.retry.baseDelayMs * 2 ** attempt));
      }
    }
  }

  async run(): Promise<void> {
    // Settings usam '' como "ausente" (convenção do SettingsTokenStore).
    let since = (await this.storage.getItem(SYNC_CURSOR_KEY)) || null;

    const account = this.account?.current() ?? null;
    const lastAccount = (await this.storage.getItem(SYNC_ACCOUNT_KEY)) || null;
    if (this.account && account && lastAccount && account !== lastAccount) {
      // Conta trocou: o cursor antigo esconderia o histórico da conta nova, e
      // os dirty herdados vazariam os dados da conta anterior para ela.
      await this.account.onSwitch();
      since = null;
    }

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
      response = await this.syncWithRetry({
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
      // Esgotadas as tentativas com backoff: offline continua silencioso
      // (o auto-sync do foreground tenta de novo depois).
      if (err instanceof TypeError) return;
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

    await this.storage.setItem(SYNC_CURSOR_KEY, newCursor);
    if (account) await this.storage.setItem(SYNC_ACCOUNT_KEY, account);
  }
}
