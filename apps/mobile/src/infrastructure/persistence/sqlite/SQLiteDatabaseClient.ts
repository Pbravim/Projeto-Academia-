export type SQLiteBindValue = number | string | null;
export type SQLiteBindParams = SQLiteBindValue[];

export interface SQLiteDatabaseClient {
  exec(statement: string): Promise<void>;
  run(statement: string, params?: SQLiteBindParams): Promise<void>;
  getFirst<T>(statement: string, params?: SQLiteBindParams): Promise<T | null>;
  getAll<T>(statement: string, params?: SQLiteBindParams): Promise<T[]>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
