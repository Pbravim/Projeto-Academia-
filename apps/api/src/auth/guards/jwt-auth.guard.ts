import { Injectable, Optional } from '@nestjs/common';
import { AuthGuard, AuthModuleOptions } from '@nestjs/passport';

/**
 * O `AuthGuard()` do passport declara `@Optional() @Inject(AuthModuleOptions)` no
 * construtor da classe mixin. Até o Nest 11 essa marcação de opcional era herdada
 * pela subclasse; no Nest 12 não é mais — o injetor lê o `design:paramtypes` do pai
 * e passa a exigir `AuthModuleOptions` em TODO módulo que use o guard (ExercisesModule,
 * SyncModule, TreinosModule não importam PassportModule, então a app nem sobe).
 *
 * Redeclarar o construtor opcional aqui restaura o comportamento anterior sem espalhar
 * `PassportModule.register({})` por todos os módulos.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(@Optional() options?: AuthModuleOptions) {
    super(options);
  }
}
