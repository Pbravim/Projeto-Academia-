import { BadRequestException } from '@nestjs/common';

import { buildValidationPipe } from '../../validation';
import { SyncController } from '../sync.controller';

import { SyncRequestDto } from './sync-request.dto';

// O MESMO pipe do main.ts — é o que a API aplica ao @Body() em produção.
const pipe = buildValidationPipe();
const asBody = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: SyncRequestDto });

const emptyChanges = () => ({
  exercises: [], treinos: [], treinoExercicios: [], sessaoTreinos: [],
  sessaoExercicios: [], seriesRegistradas: [], registrosPeso: [], userSettings: [],
  exerciseAlternatives: [],
});

const SEGMENTO_NOW = '2026-09-12T10:00:00.000Z';
const validSegmento = () => ({
  id: 'seg-1', serieId: 'serie-1', ordem: 2,
  cargaKg: 60, repeticoes: 8, descansoSegundos: 90,
  createdAt: SEGMENTO_NOW, updatedAt: SEGMENTO_NOW, deletedAt: null,
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

  it('rejects rows carrying server-managed fields (forbidNonWhitelisted)', async () => {
    const now = '2026-07-07T10:00:00.000Z';
    await expect(
      asBody({
        since: null,
        changes: {
          ...emptyChanges(),
          treinos: [{
            id: 't1', name: 'Peito', objetivo: null, createdAt: now, updatedAt: now,
            deletedAt: null, dirty: true, serverUpdatedAt: now, userId: 'attacker',
          }],
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a valid serieSegmento row', async () => {
    const result = await asBody({
      since: null,
      changes: { ...emptyChanges(), serieSegmentos: [validSegmento()] },
    });
    expect(result.changes.serieSegmentos[0]).toMatchObject({ id: 'seg-1', ordem: 2 });
  });

  it('accepts a body without serieSegmentos (cliente anterior ao campo)', async () => {
    const changes = emptyChanges();
    const result = await asBody({ since: null, changes });
    expect(result.changes.serieSegmentos).toBeUndefined();
  });

  it('rejects a serieSegmento with ordem menor que 2 (degrau 1 é a série-mãe)', async () => {
    await expect(
      asBody({
        since: null,
        changes: { ...emptyChanges(), serieSegmentos: [{ ...validSegmento(), ordem: 1 }] },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a serieSegmento com descansoSegundos negativo', async () => {
    await expect(
      asBody({
        since: null,
        changes: { ...emptyChanges(), serieSegmentos: [{ ...validSegmento(), descansoSegundos: -1 }] },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts metodo legado bi_set/circuito (@IsString mantido, sem @IsIn)', async () => {
    const result = await asBody({
      since: null,
      changes: {
        ...emptyChanges(),
        treinoExercicios: [{
          id: 'te1', treinoId: 't1', exercicioId: 'ex1', ordem: 1,
          seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null,
          tempoDescansoSegundos: null, metodo: 'bi_set', grupoId: null,
          duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null,
          intensidadeRecomendada: null,
          updatedAt: SEGMENTO_NOW, deletedAt: null,
        }],
      },
    });
    expect(result.changes.treinoExercicios[0].metodo).toBe('bi_set');
  });

  it('is the metatype of the controller @Body param (route actually validates)', () => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', SyncController.prototype, 'sync');
    expect(paramTypes).toContain(SyncRequestDto);
  });
});
