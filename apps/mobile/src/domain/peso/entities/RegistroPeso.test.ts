import { describe, expect, it } from 'vitest';

import { PesoValidationError } from '../errors/PesoValidationError';
import { RegistroPeso } from './RegistroPeso';

const baseDate = new Date('2026-05-03T10:00:00.000Z');

describe('RegistroPeso', () => {
  it('cria um registro valido com peso e data', () => {
    const registro = RegistroPeso.create({ id: 'peso_1', pesoKg: 80.5, dataRegistro: baseDate });

    expect(registro.toPrimitives()).toEqual({
      id: 'peso_1',
      pesoKg: 80.5,
      dataRegistro: '2026-05-03T10:00:00.000Z',
      observacao: null,
    });
  });

  it('normaliza e persiste a observacao', () => {
    const registro = RegistroPeso.create({
      id: 'peso_1',
      pesoKg: 75,
      dataRegistro: baseDate,
      observacao: '  Manha em jejum  ',
    });

    expect(registro.toPrimitives().observacao).toBe('Manha em jejum');
  });

  it('trata observacao vazia como null', () => {
    const registro = RegistroPeso.create({
      id: 'peso_1',
      pesoKg: 75,
      dataRegistro: baseDate,
      observacao: '   ',
    });

    expect(registro.toPrimitives().observacao).toBeNull();
  });

  it('rejeita peso zero', () => {
    expect(() =>
      RegistroPeso.create({ id: 'peso_1', pesoKg: 0, dataRegistro: baseDate })
    ).toThrow(PesoValidationError);
  });

  it('rejeita peso negativo', () => {
    expect(() =>
      RegistroPeso.create({ id: 'peso_1', pesoKg: -5, dataRegistro: baseDate })
    ).toThrow(PesoValidationError);
  });

  it('rejeita peso NaN', () => {
    expect(() =>
      RegistroPeso.create({ id: 'peso_1', pesoKg: NaN, dataRegistro: baseDate })
    ).toThrow(PesoValidationError);
  });

  it('restaura a partir de primitivos sem validacao', () => {
    const primitives = {
      id: 'peso_1',
      pesoKg: 80,
      dataRegistro: '2026-05-03T10:00:00.000Z',
      observacao: null,
    };
    const registro = RegistroPeso.restore(primitives);
    expect(registro.toPrimitives()).toEqual(primitives);
  });
});
