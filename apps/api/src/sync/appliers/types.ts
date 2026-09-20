import type { Logger } from '@nestjs/common';

export interface ApplyCtx {
  tx: any;
  userId: string;
  now: Date;
  log: Logger;
}
