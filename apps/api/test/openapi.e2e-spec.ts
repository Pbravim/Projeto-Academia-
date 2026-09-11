/**
 * Trava o contrato observável do documento OpenAPI.
 *
 * O @nestjs/swagger 12 mudou a grafia de schemas nullable (e a major inteira mexeu no
 * pipeline de geração). Este repo não versiona snapshot de OpenAPI, então a migração
 * subiu sem nenhum sinal de que o documento continuava o mesmo. Este spec é esse sinal:
 * se uma major futura trocar a versão do documento, sumir com uma rota ou renomear um
 * schema, ele fica vermelho.
 */
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';

process.env.JWT_ACCESS_SECRET ||= 'e2e-access-secret-0123456789-abcdefghij';
process.env.JWT_REFRESH_SECRET ||= 'e2e-refresh-secret-0123456789-abcdefghij';
process.env.DATABASE_URL ||= 'postgresql://academia:academia@localhost:5433/academia_db';

describe('OpenAPI (e2e)', () => {
  let app: INestApplication;
  let doc: ReturnType<typeof SwaggerModule.createDocument>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Academia API').setVersion('1.0').addBearerAuth().build(),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('gera um documento OpenAPI 3.0.0', () => {
    expect(doc.openapi).toBe('3.0.0');
  });

  it('expõe as rotas públicas sob o prefixo /api/v1', () => {
    expect(Object.keys(doc.paths).sort()).toEqual([
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/api/v1/auth/register',
      '/api/v1/exercises',
      '/api/v1/exercises/{id}',
      '/api/v1/sync',
      '/api/v1/treinos',
      '/api/v1/treinos/{id}',
    ]);
  });

  it('expõe os schemas dos DTOs de entrada', () => {
    expect(Object.keys(doc.components?.schemas ?? {}).sort()).toEqual([
      'RefreshDto',
      'RegisterDto',
      'SyncRequestDto',
    ]);
  });
});
