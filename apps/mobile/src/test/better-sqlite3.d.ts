declare module 'better-sqlite3' {
  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface Statement {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  export default class Database {
    constructor(filename: string);
    prepare(sql: string): Statement;
    exec(sql: string): void;
    pragma(source: string): unknown;
    close(): void;
  }
}
