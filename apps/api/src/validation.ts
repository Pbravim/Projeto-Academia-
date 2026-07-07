import { ValidationPipe } from '@nestjs/common';

/** Pipe global de validação — compartilhado entre main.ts e os testes. */
export function buildValidationPipe(): ValidationPipe {
  // forbidNonWhitelisted: campo desconhecido é 400 explícito, não descarte
  // silencioso — cliente malformado/malicioso falha cedo e com mensagem clara.
  return new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
}
