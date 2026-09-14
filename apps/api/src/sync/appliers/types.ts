import type { Logger } from '@nestjs/common';

export interface ApplyCtx {
  tx: any;
  userId: string;
  now: Date;
  log: Logger;
}

export type Applier<T> = (ctx: ApplyCtx, rows: T[]) => Promise<void>;
