export interface TransactionPort {
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
