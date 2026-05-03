import { describe, expect, it } from 'vitest';

import { buildHistoricoExercicioViewModel } from './buildHistoricoExercicioViewModel';
import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';

const serie = (
  id: string,
  tipo: 'aquecimento' | 'valida',
  cargaKg: number,
  repeticoes: number
) => ({ id, tipoSerie: tipo, cargaKg, repeticoes, observacao: null, ordem: 1 });

const execucao = (
  sessaoId: string,
  series: ReturnType<typeof serie>[]
): ExecucaoExercicio => ({
  sessaoTreinoId: sessaoId,
  dataExecucao: '2026-05-03T10:00:00.000Z',
  nomeSnapshot: 'Supino reto',
  series,
});

describe('buildHistoricoExercicioViewModel', () => {
  describe('estado vazio', () => {
    it('retorna mensagem de estado vazio quando nao ha execucoes', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', []);
      expect(vm.emptyStateMessage).not.toBeNull();
      expect(vm.execucoes).toHaveLength(0);
      expect(vm.exercicioNome).toBe('Supino reto');
    });
  });

  describe('execucao com series', () => {
    it('formata descricao de serie como "carga kg x reps rep"', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 80, 8)]),
      ]);
      expect(vm.execucoes[0].series[0].descricao).toBe('80 kg × 8 rep');
    });

    it('serie valida recebe rm1Estimado calculado', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 80, 8)]),
      ]);
      // 1RM = 80 * (1 + 8/30) = 80 * 1.2667 = 101.3
      expect(vm.execucoes[0].series[0].rm1Estimado).toBe('1RM ~101.3 kg');
    });

    it('serie de aquecimento nao recebe rm1Estimado', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'aquecimento', 40, 15)]),
      ]);
      expect(vm.execucoes[0].series[0].rm1Estimado).toBeNull();
    });

    it('calcula melhorRm1 a partir das series validas', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [
          serie('sr1', 'aquecimento', 40, 15),
          serie('sr2', 'valida', 80, 8),   // 1RM = 101.3
          serie('sr3', 'valida', 85, 5),   // 1RM = 85 * 1.167 = 99.2
        ]),
      ]);
      // 80x8 tem 1RM maior: 101.3
      expect(vm.execucoes[0].melhorRm1).toBe('101.3 kg');
    });

    it('exibe "—" como melhorRm1 quando so ha series de aquecimento', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'aquecimento', 40, 15)]),
      ]);
      expect(vm.execucoes[0].melhorRm1).toBe('—');
    });

    it('preserva o nome do exercicio no view model', () => {
      const vm = buildHistoricoExercicioViewModel('Agachamento livre', [
        execucao('s1', [serie('sr1', 'valida', 100, 5)]),
      ]);
      expect(vm.exercicioNome).toBe('Agachamento livre');
    });

    it('gera um card por execucao', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 80, 8)]),
        execucao('s2', [serie('sr2', 'valida', 85, 6)]),
      ]);
      expect(vm.execucoes).toHaveLength(2);
    });
  });

  describe('formula 1RM', () => {
    it('aplica a formula carga * (1 + reps / 30)', () => {
      // 100kg x 5 reps => 100 * (1 + 5/30) = 100 * 1.1667 = 116.7
      const vm = buildHistoricoExercicioViewModel('Agachamento', [
        execucao('s1', [serie('sr1', 'valida', 100, 5)]),
      ]);
      expect(vm.execucoes[0].series[0].rm1Estimado).toBe('1RM ~116.7 kg');
      expect(vm.execucoes[0].melhorRm1).toBe('116.7 kg');
    });
  });
});
