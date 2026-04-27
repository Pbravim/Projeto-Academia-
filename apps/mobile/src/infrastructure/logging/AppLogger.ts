export interface AppLogger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error: unknown, context?: Record<string, unknown>): void;
}

export class ConsoleAppLogger implements AppLogger {
  info(message: string, context: Record<string, unknown> = {}): void {
    console.log(`[info] ${message}`, context);
  }

  error(message: string, error: unknown, context: Record<string, unknown> = {}): void {
    console.error(`[error] ${message}`, error, context);
  }
}
