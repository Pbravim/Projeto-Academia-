export interface AppLogger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error: unknown, context?: Record<string, unknown>): void;
}

export class ConsoleAppLogger implements AppLogger {
  info(message: string, context: Record<string, unknown> = {}): void {
    // eslint-disable-next-line no-console -- este É o sink de log da app
    console.log(`[info] ${message}`, context);
  }

  error(message: string, error: unknown, context: Record<string, unknown> = {}): void {
    // eslint-disable-next-line no-console -- este É o sink de log da app
    console.error(`[error] ${message}`, error, context);
  }
}
