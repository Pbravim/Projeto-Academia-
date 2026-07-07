import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SyncRequestDto } from './sync-request.dto';
import { SyncController } from '../sync.controller';

// Same configuration as main.ts — this is what the running API applies to @Body()
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const asBody = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: SyncRequestDto });

const emptyChanges = () => ({
  exercises: [], treinos: [], treinoExercicios: [], sessaoTreinos: [],
  sessaoExercicios: [], seriesRegistradas: [], registrosPeso: [], userSettings: [],
});

describe('SyncRequestDto validation', () => {
  it('accepts a valid empty sync payload', async () => {
    const result = await asBody({ since: null, changes: emptyChanges() });
    expect(result.changes.treinos).toEqual([]);
    expect(result.since).toBeNull();
  });

  it('accepts a valid treino row and a since cursor', async () => {
    const now = '2026-07-07T10:00:00.000Z';
    const result = await asBody({
      since: now,
      changes: {
        ...emptyChanges(),
        treinos: [{ id: 't1', name: 'Peito', objetivo: null, createdAt: now, updatedAt: now, deletedAt: null }],
      },
    });
    expect(result.changes.treinos[0].name).toBe('Peito');
  });

  it('rejects a body without changes', async () => {
    await expect(asBody({ since: null })).rejects.toThrow(BadRequestException);
  });

  it('rejects changes that is not an object', async () => {
    await expect(asBody({ since: null, changes: 'garbage' })).rejects.toThrow(BadRequestException);
  });

  it('rejects a non-array collection', async () => {
    await expect(
      asBody({ since: null, changes: { ...emptyChanges(), treinos: 'not-an-array' } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a treino row with wrong field types', async () => {
    await expect(
      asBody({
        since: null,
        changes: {
          ...emptyChanges(),
          treinos: [{ id: 123, name: { evil: true }, objetivo: null, createdAt: 'x', updatedAt: null, deletedAt: null }],
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a serie row with non-numeric carga', async () => {
    const now = '2026-07-07T10:00:00.000Z';
    await expect(
      asBody({
        since: null,
        changes: {
          ...emptyChanges(),
          seriesRegistradas: [{
            id: 's1', sessaoExercicioId: 'se1', tipoSerie: 'valida', ordem: 1,
            cargaKg: 'DROP TABLE', repeticoes: 8, duracaoSegundos: null,
            distanciaMetros: null, intensidade: null, observacao: null,
            createdAt: now, updatedAt: now, deletedAt: null,
          }],
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an invalid since cursor', async () => {
    await expect(asBody({ since: 'not-a-date', changes: emptyChanges() })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('strips unknown keys from rows (whitelist)', async () => {
    const now = '2026-07-07T10:00:00.000Z';
    const result = await asBody({
      since: null,
      changes: {
        ...emptyChanges(),
        treinos: [{
          id: 't1', name: 'Peito', objetivo: null, createdAt: now, updatedAt: now,
          deletedAt: null, dirty: true, serverUpdatedAt: now, userId: 'attacker',
        }],
      },
    });
    expect(result.changes.treinos[0]).not.toHaveProperty('userId');
    expect(result.changes.treinos[0]).not.toHaveProperty('serverUpdatedAt');
  });

  it('is the metatype of the controller @Body param (route actually validates)', () => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', SyncController.prototype, 'sync');
    expect(paramTypes).toContain(SyncRequestDto);
  });
});
