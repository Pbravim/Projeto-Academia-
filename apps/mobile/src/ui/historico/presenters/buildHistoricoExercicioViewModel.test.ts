import { describe, expect, it } from 'vitest';

import type { ExecucaoExercicio } from '../../../domain/historico/repositories/HistoricoRepository';

import { buildHistoricoExercicioViewModel } from './buildHistoricoExercicioViewModel';

const serie = (
  id: string,
  tipo: 'aquecimento' | 'valida',
  cargaKg: number,
  repeticoes: number,
  ordem = 1
) => ({ id, tipoSerie: tipo, cargaKg, repeticoes, observacao: null, ordem });

const execucao = (
  sessaoId: string,
  series: ReturnType<typeof serie>[],
  date = '2026-05-03T10:00:00.000Z'
): ExecucaoExercicio => ({
  sessaoTreinoId: sessaoId,
  dataExecucao: date,
  nomeSnapshot: 'Supino reto',
  series,
});

describe('buildHistoricoExercicioViewModel', () => {
  describe('estado vazio', () => {
    it('retorna mensagem de estado vazio quando nao ha execucoes', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', []);
      expect(vm.emptyStateMessage).not.toBeNull();
      expect(vm.sessionRows).toHaveLength(0);
      expect(vm.exercicioNome).toBe('Supino reto');
    });
  });

  describe('sessionRows', () => {
    it('formata cada set com carga e reps separados', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 80, 8)]),
      ]);
      expect(vm.sessionRows[0].sets[0].cargaLabel).toBe('80');
      expect(vm.sessionRows[0].sets[0].repsLabel).toBe('8');
    });

    it('calcula ormLabel do melhor set valido (Epley)', () => {
      // 80×8 -> 80 * (1 + 8/30) = 101.33 -> 101,3
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 80, 8)]),
      ]);
      expect(vm.sessionRows[0].ormLabel).toBe('1RM ~101,3');
    });

    it('series de aquecimento ficam muted e fora do 1RM/volume', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [
          serie('sr1', 'aquecimento', 40, 15, 1),
          serie('sr2', 'valida', 80, 8, 2),
        ]),
      ]);
      expect(vm.sessionRows[0].sets[0].muted).toBe(true);
      expect(vm.sessionRows[0].sets[1].muted).toBe(false);
      expect(vm.sessionRows[0].ormLabel).toBe('1RM ~101,3');
      expect(vm.sessionRows[0].volumeLabel).toBe('640 kg');
    });

    it('repassa os segmentos (degraus) ordenados e soma o volume da pilha', () => {
      const execucaoComSegmentos: ExecucaoExercicio = {
        sessaoTreinoId: 's1',
        dataExecucao: '2026-05-03T10:00:00.000Z',
        nomeSnapshot: 'Supino reto',
        series: [
          {
            id: 'sr1', tipoSerie: 'valida', cargaKg: 60, repeticoes: 5, observacao: null, ordem: 1,
            segmentos: [
              { ordem: 3, cargaKg: 40, repeticoes: 3, descansoSegundos: null },
              { ordem: 2, cargaKg: 50, repeticoes: 4, descansoSegundos: null },
            ],
          },
        ],
      };
      const vm = buildHistoricoExercicioViewModel('Supino reto', [execucaoComSegmentos]);
      expect(vm.sessionRows[0].sets[0].degrausLabel).toBe('60×5 → 50×4 → 40×3');
      expect(vm.sessionRows[0].volumeLabel).toBe(`${60 * 5 + 50 * 4 + 40 * 3} kg`);
    });

    it('ordena sets pela ordem registrada', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [
          serie('sr2', 'valida', 85, 6, 2),
          serie('sr1', 'valida', 80, 8, 1),
        ]),
      ]);
      expect(vm.sessionRows[0].sets.map((s) => `${s.cargaLabel}×${s.repsLabel}`)).toEqual(['80×8', '85×6']);
    });

    it('ormLabel nulo quando so ha aquecimento', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'aquecimento', 40, 15)]),
      ]);
      expect(vm.sessionRows[0].ormLabel).toBeNull();
    });

    it('gera uma linha por execucao, mais recente primeiro com isLatest', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 85, 8)], '2026-05-04T10:00:00Z'),
        execucao('s2', [serie('sr2', 'valida', 80, 8)], '2026-05-03T10:00:00Z'),
      ]);
      expect(vm.sessionRows).toHaveLength(2);
      expect(vm.sessionRows[0].isLatest).toBe(true);
      expect(vm.sessionRows[1].isLatest).toBe(false);
      expect(vm.sessionRows[0].trend).toBe('up');
    });

    it('propaga label de substituicao', () => {
      const vm = buildHistoricoExercicioViewModel('Supino inclinado', [
        {
          ...execucao('s1', [serie('sr1', 'valida', 80, 8)]),
          substituiuExercicio: { nomeOriginal: 'Supino reto', motivo: 'variacao' },
        },
      ]);
      expect(vm.sessionRows[0].subLabel).toBe('Substituiu: Supino reto · variação');
    });
  });

  describe('rm1ChartPoints', () => {
    it('gera pontos em ordem cronologica com o 1RM da melhor serie valida', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'valida', 85, 8)], '2026-05-04T10:00:00Z'),
        execucao('s2', [serie('sr2', 'valida', 80, 8)], '2026-05-03T10:00:00Z'),
      ]);
      // ordem ascendente: s2 (03/05) depois s1 (04/05)
      expect(vm.rm1ChartPoints).toHaveLength(2);
      expect(vm.rm1ChartPoints[0].value).toBeCloseTo(101.3, 1);
      expect(vm.rm1ChartPoints[1].value).toBeCloseTo(107.7, 1);
    });

    it('ignora execucoes sem series validas', () => {
      const vm = buildHistoricoExercicioViewModel('Supino reto', [
        execucao('s1', [serie('sr1', 'aquecimento', 40, 15)]),
      ]);
      expect(vm.rm1ChartPoints).toHaveLength(0);
    });
  });

  describe('detectarPlateau', () => {
    function makeEx(sessaoId: string, date: string, series: ReturnType<typeof serie>[]): ExecucaoExercicio {
      return { sessaoTreinoId: sessaoId, dataExecucao: date, nomeSnapshot: 'Supino', series };
    }

    it('retorna null com menos de 4 execucoes com series validas', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'valida', 80, 10)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'valida', 80, 10)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'valida', 80, 10)]),
      ];
      expect(buildHistoricoExercicioViewModel('Supino', execucoes).plateau).toBeNull();
    });

    it('retorna null quando ha melhora >= 1 kg no 1RM entre a mais antiga e qualquer recente', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'valida', 110, 10)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'valida', 90, 10)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'valida', 85, 10)]),
        makeEx('s4', '2026-05-01T10:00:00Z', [serie('sr4', 'valida', 80, 10)]),
      ];
      expect(buildHistoricoExercicioViewModel('Supino', execucoes).plateau).toBeNull();
    });

    it('retorna PlateauInfo quando 1RM maximo nao supera o mais antigo em 1 kg', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'valida', 80, 10)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'valida', 80, 10)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'valida', 80, 10)]),
        makeEx('s4', '2026-05-01T10:00:00Z', [serie('sr4', 'valida', 80, 10)]),
      ];
      const vm = buildHistoricoExercicioViewModel('Supino', execucoes);
      expect(vm.plateau).not.toBeNull();
      expect(vm.plateau!.sessoes).toBe(4);
    });

    it('ignora execucoes sem series validas na contagem', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'valida', 80, 10)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'aquecimento', 40, 15)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'valida', 80, 10)]),
        makeEx('s4', '2026-05-01T10:00:00Z', [serie('sr4', 'valida', 80, 10)]),
      ];
      expect(buildHistoricoExercicioViewModel('Supino', execucoes).plateau).toBeNull();
    });

    it('retorna null quando execucoes tem apenas series de aquecimento', () => {
      const execucoes = [
        makeEx('s1', '2026-05-04T10:00:00Z', [serie('sr1', 'aquecimento', 40, 15)]),
        makeEx('s2', '2026-05-03T10:00:00Z', [serie('sr2', 'aquecimento', 40, 15)]),
        makeEx('s3', '2026-05-02T10:00:00Z', [serie('sr3', 'aquecimento', 40, 15)]),
        makeEx('s4', '2026-05-01T10:00:00Z', [serie('sr4', 'aquecimento', 40, 15)]),
      ];
      expect(buildHistoricoExercicioViewModel('Supino', execucoes).plateau).toBeNull();
    });
  });
});
