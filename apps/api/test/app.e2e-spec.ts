/**
 * E2E real contra o Postgres do docker (docker compose up -d postgres + migrate deploy).
 * Cobre o fluxo register → login → sync ponta-a-ponta, exercitando guards JWT, o
 * SyncService e o round-trip dos campos biomecânicos sobre HTTP.
 *
 * Env injetada ANTES de importar o AppModule (o app não usa ConfigModule; a JwtStrategy
 * exige secret >= 32 chars).
 */
import type { SyncRequest } from '@academia/contracts';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Segredos FIXOS (=, não ||=): o e2e não pode depender do .env da máquina.
// `||=` não substitui valor curto porém truthy, e o resultado passava a
// depender da ordem de carga do dotenv do Prisma (ver LEARNINGS, jest 30).
process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-0123456789-abcdefghij';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-0123456789-abcdefghij';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';
process.env.DATABASE_URL ||= 'postgresql://academia:academia@localhost:5433/academia_db';

const emptyChanges = (): SyncRequest['changes'] => ({
  exercises: [], treinos: [], treinoExercicios: [], sessaoTreinos: [],
  sessaoExercicios: [], seriesRegistradas: [], serieSegmentos: [], registrosPeso: [], userSettings: [],
  exerciseAlternatives: [],
});

describe('API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@test.local`;
  const password = 'supersecret';
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) await prisma.user.delete({ where: { id: user.id } }); // cascateia dados do user
    await app.close();
  });

  it('POST /auth/register cria o usuário e retorna tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, name: 'E2E' })
      .expect(201);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('POST /auth/login autentica e retorna access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    expect(typeof res.body.accessToken).toBe('string');
    accessToken = res.body.accessToken;
  });

  it('POST /sync sem token retorna 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/sync')
      .send({ since: null, changes: emptyChanges() })
      .expect(401);
  });

  it('POST /sync faz round-trip de um exercício custom (prova user.id + campos biomecânicos)', async () => {
    const id = `ex-e2e-${Date.now()}`;
    const now = new Date().toISOString();

    // push
    await request(app.getHttpServer())
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        since: null,
        changes: {
          ...emptyChanges(),
          exercises: [{
            id, name: 'Supino E2E', normalizedName: 'supino e2e', groupMuscle: 'Peito',
            category: '', equipment: 'Barra', loadUnit: 'kg', isCustom: true,
            mediaOnline: null, mediaLocal: null, musculoAlvo: '["Peitoral maior"]',
            movementPattern: 'Horizontal Push', stabilizers: '["Triceps"]',
            executionType: 'Bilateral', nameVariations: '["Bench Press"]',
            primaryEquipment: 'Barbell', secondaryEquipment: 'Bench',
            catalogVersion: 5, trackingType: 'reps_load',
            createdAt: now, updatedAt: now, deletedAt: null,
          }],
        },
      })
      .expect(201);

    // pull (since=null devolve tudo do usuário)
    const pull = await request(app.getHttpServer())
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ since: null, changes: emptyChanges() })
      .expect(201);

    const got = pull.body.serverChanges.exercises.find((e: any) => e.id === id);
    expect(got).toBeDefined();
    expect(got).toMatchObject({
      movementPattern: 'Horizontal Push', stabilizers: '["Triceps"]',
      executionType: 'Bilateral', nameVariations: '["Bench Press"]',
      primaryEquipment: 'Barbell', secondaryEquipment: 'Bench',
      catalogVersion: 5, trackingType: 'reps_load',
    });
  });
});
