import { describe, expect, it } from 'vitest';

import { buildPesoViewModel } from './buildPesoViewModel';

const reg = (id: string, pesoKg: number, dataRegistro: string, observacao: string | null = null) => ({
  id,
  pesoKg,
  dataRegistro,
  observacao,
});

describe('buildPesoViewModel', () => {
  describe('estado vazio', () => {
    it('retorna mensagem de estado vazio quando nao ha registros', () => {
      const vm = buildPesoViewModel([]);
      expect(vm.emptyStateMessage).not.toBeNull();
      expect(vm.cards).toHaveLength(0);
      expect(vm.pesoAtual).toBeNull();
    });
  });

  describe('registro unico', () => {
    it('exibe peso atual do registro mais recente', () => {
      const vm = buildPesoViewModel([reg('r1', 80.5, '2026-05-01T10:00:00.000Z')]);
      expect(vm.pesoAtual).toBe('80.5 kg');
      expect(vm.emptyStateMessage).toBeNull();
    });

    it('nao exibe delta no primeiro registro', () => {
      const vm = buildPesoViewModel([reg('r1', 80, '2026-05-01T10:00:00.000Z')]);
      expect(vm.cards[0].delta).toBeNull();
    });

    it('preserva a observacao', () => {
      const vm = buildPesoViewModel([reg('r1', 80, '2026-05-01T10:00:00.000Z', 'Em jejum')]);
      expect(vm.cards[0].observacao).toBe('Em jejum');
    });

    it('formata o peso com sufixo kg', () => {
      const vm = buildPesoViewModel([reg('r1', 75.3, '2026-05-01T10:00:00.000Z')]);
      expect(vm.cards[0].peso).toBe('75.3 kg');
    });
  });

  describe('delta zero (P2-9: exibia "-0 kg")', () => {
    it('dois registros iguais mostram delta neutro "0 kg"', () => {
      const vm = buildPesoViewModel([
        reg('r2', 80, '2026-05-02T10:00:00.000Z'),
        reg('r1', 80, '2026-05-01T10:00:00.000Z'),
      ]);
      expect(vm.cards[0].delta).toBe('0 kg');
      expect(vm.cards[0].pesoAumentou).toBe(false);
    });
  });

  describe('multiplos registros (lista ja ordenada DESC)', () => {
    it('calcula delta positivo entre registros consecutivos', () => {
      const vm = buildPesoViewModel([
        reg('r2', 81, '2026-05-08T10:00:00.000Z'),
        reg('r1', 80, '2026-05-01T10:00:00.000Z'),
      ]);
      expect(vm.cards[0].delta).toBe('+1 kg');
      expect(vm.cards[0].pesoAumentou).toBe(true);
    });

    it('calcula delta negativo entre registros consecutivos', () => {
      const vm = buildPesoViewModel([
        reg('r2', 79.5, '2026-05-08T10:00:00.000Z'),
        reg('r1', 80, '2026-05-01T10:00:00.000Z'),
      ]);
      expect(vm.cards[0].delta).toBe('-0.5 kg');
      expect(vm.cards[0].pesoAumentou).toBe(false);
    });

    it('entrada mais antiga nao tem delta', () => {
      const vm = buildPesoViewModel([
        reg('r2', 79.5, '2026-05-08T10:00:00.000Z'),
        reg('r1', 80, '2026-05-01T10:00:00.000Z'),
      ]);
      expect(vm.cards[1].delta).toBeNull();
    });

    it('formata delta inteiro sem casas decimais', () => {
      const vm = buildPesoViewModel([
        reg('r2', 82, '2026-05-08T10:00:00.000Z'),
        reg('r1', 80, '2026-05-01T10:00:00.000Z'),
      ]);
      expect(vm.cards[0].delta).toBe('+2 kg');
    });

    it('formata delta decimal com uma casa decimal', () => {
      const vm = buildPesoViewModel([
        reg('r2', 80.3, '2026-05-08T10:00:00.000Z'),
        reg('r1', 80, '2026-05-01T10:00:00.000Z'),
      ]);
      expect(vm.cards[0].delta).toBe('+0.3 kg');
    });

    it('pesoAtual reflete o primeiro elemento (mais recente)', () => {
      const vm = buildPesoViewModel([
        reg('r3', 79, '2026-05-15T10:00:00.000Z'),
        reg('r2', 80, '2026-05-08T10:00:00.000Z'),
        reg('r1', 81, '2026-05-01T10:00:00.000Z'),
      ]);
      expect(vm.pesoAtual).toBe('79 kg');
    });
  });
});
