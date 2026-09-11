import { describe, expect, it } from 'vitest';

import { metadataLabel } from './exerciseMetadataLabels';

describe('metadataLabel', () => {
  it('traduz padrão de movimento para PT por padrão', () => {
    expect(metadataLabel('movementPattern', 'Horizontal Push')).toBe('Empurrar horizontal');
    expect(metadataLabel('movementPattern', 'Hinge')).toBe('Dobradiça de quadril');
    expect(metadataLabel('movementPattern', 'Trunk Flexion')).toBe('Flexão de tronco');
  });
  it('traduz tipo de execução', () => {
    expect(metadataLabel('executionType', 'Can Be Both')).toBe('Ambos');
    expect(metadataLabel('executionType', 'Can Be Both', 'en-US')).toBe('Can be both');
  });
  it('traduz equipamento primário', () => {
    expect(metadataLabel('primaryEquipment', 'Barbell')).toBe('Barra');
    expect(metadataLabel('primaryEquipment', 'Suspension Trainer')).toBe('Fitas de suspensão (TRX)');
  });
  it('valor desconhecido retorna o valor cru, nunca undefined', () => {
    expect(metadataLabel('movementPattern', 'Alien Pattern')).toBe('Alien Pattern');
    expect(metadataLabel('secondaryEquipment', 'Banco')).toBe('Banco');
  });
});
