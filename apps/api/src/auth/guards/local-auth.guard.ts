import { Injectable, Optional } from '@nestjs/common';
import { AuthGuard, AuthModuleOptions } from '@nestjs/passport';

/** Construtor opcional redeclarado pelo mesmo motivo do JwtAuthGuard (ver comentário lá). */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(@Optional() options?: AuthModuleOptions) {
    super(options);
  }
}
