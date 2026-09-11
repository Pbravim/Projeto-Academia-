import { describe, expect, it } from 'vitest';

import { TreinoValidationError } from '../errors/TreinoValidationError';

import { Treino } from './Treino';

describe('Treino', () => {
  it('creates a valid treino', () => {
    const treino = Treino.create({
      id: 'treino_1',
      name: '  Treino A  ',
      objetivo: ' Hipertrofia ',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    expect(treino.toPrimitives()).toEqual({
      id: 'treino_1',
      name: 'Treino A',
      objetivo: 'Hipertrofia',
      createdAt: '2026-04-24T12:00:00.000Z',
      updatedAt: '2026-04-24T12:00:00.000Z',
    });
  });

  it('accepts treino without objetivo', () => {
    const treino = Treino.create({
      id: 'treino_1',
      name: 'Treino B',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    expect(treino.toPrimitives().objetivo).toBeNull();
  });

  it('rejects empty name', () => {
    expect(() =>
      Treino.create({ id: 'treino_1', name: '   ', createdAt: new Date() })
    ).toThrow(TreinoValidationError);
  });

  it('updates name and objetivo', () => {
    const original = Treino.create({
      id: 'treino_1',
      name: 'Treino A',
      createdAt: new Date('2026-04-24T12:00:00.000Z'),
    });

    const updated = Treino.update(
      original.toPrimitives(),
      { name: 'Treino B', objetivo: 'Forca' },
      new Date('2026-04-25T10:00:00.000Z')
    );

    expect(updated.toPrimitives()).toMatchObject({
      id: 'treino_1',
      name: 'Treino B',
      objetivo: 'Forca',
      createdAt: '2026-04-24T12:00:00.000Z',
      updatedAt: '2026-04-25T10:00:00.000Z',
    });
  });
});
