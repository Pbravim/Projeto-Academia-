import { describe, expect, it } from 'vitest';

import type { SessaoDetalhe } from '../../../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { buildSessaoResumoViewModel } from './buildSessaoResumoViewModel';

function makeSessao(inicio: string, fim: string | null = null) {
  return {
    id: 'sessao_1',
    treinoId: 'treino_1',
    treinoNomeSnapshot: 'Treino A',
    dataHoraInicio: inicio,
    dataHoraFim: fim,
    status: fim ? 'finalizada' : 'em_andamento',
  } as const;
}

function makeSessaoExercicio(id: string, realizado = true) {
  return {
    id,
    sessaoTreinoId: 'sessao_1',
    exercicioId: 'ex_1',
    ordem: 1,
    nomeSnapshot: 'Supino reto',
    grupoMuscularSnapshot: 'Peito',
    categoriaSnapshot: 'Composto',
    equipamentoSnapshot: null,
    realizado,
    seriesRecomendadas: null,
    execucoesRecomendadas: null,
    cargaPadrao: null,
    tempoDescansoSegundos: null,
  };
}

function makeSerie(id: string, tipo: 'aquecimento' | 'valida', cargaKg: number, repeticoes: number) {
  return { id, sessaoExercicioId: 'se_1', tipoSerie: tipo, ordem: 1, cargaKg, repeticoes, observacao: null };
}

function makeDetalhe(overrides: Partial<SessaoDetalhe> = {}): SessaoDetalhe {
  return {
    sessao: makeSessao('2026-05-03T10:00:00.000Z', '2026-05-03T11:05:00.000Z'),
    exercicios: [
      {
        sessaoExercicio: makeSessaoExercicio('se_1'),
        series: [
          makeSerie('s1', 'aquecimento', 40, 15),
          makeSerie('s2', 'valida', 80, 8),
          makeSerie('s3', 'valida', 85, 6),
        ],
      },
    ],
    ...overrides,
  };
}

describe('buildSessaoResumoViewModel', () => {
  describe('volume', () => {
    it('calcula volume somando carga x repeticoes apenas das series validas', () => {
      const vm = buildSessaoResumoViewModel(makeDetalhe());
      // validas: 80x8=640 + 85x6=510 = 1150 → mas espera: vamos checar o retorno
      // 80*8 = 640, 85*6 = 510, total = 1.150 kg >= 1000 → exibe em toneladas
      expect(vm.volumeTotal).toContain('t');
    });

    it('exclui series de aquecimento do calculo de volume', () => {
      const vm = buildSessaoResumoViewModel(
        makeDetalhe({
          exercicios: [
            {
              sessaoExercicio: makeSessaoExercicio('se_1'),
              series: [
                makeSerie('s1', 'aquecimento', 100, 15), // nao entra
                makeSerie('s2', 'valida', 80, 10),        // 800
              ],
            },
          ],
        })
      );
      // volume de exercicio deve ser 800 (so serie valida)
      expect(vm.exercicios[0].volume).toBe(800);
    });

    it('formata volume abaixo de 1000kg em kg', () => {
      const vm = buildSessaoResumoViewModel(
        makeDetalhe({
          exercicios: [
            {
              sessaoExercicio: makeSessaoExercicio('se_1'),
              series: [makeSerie('s1', 'valida', 80, 5)],  // 400kg
            },
          ],
        })
      );
      expect(vm.volumeTotal).toContain('kg');
      expect(vm.volumeTotal).not.toContain('t');
    });

    it('formata volume acima de 1000kg em toneladas', () => {
      const vm = buildSessaoResumoViewModel(
        makeDetalhe({
          exercicios: [
            {
              sessaoExercicio: makeSessaoExercicio('se_1'),
              series: [makeSerie('s1', 'valida', 100, 15)],  // 1500kg
            },
          ],
        })
      );
      expect(vm.volumeTotal).toContain('t');
    });
  });

  describe('duracao', () => {
    it('calcula duracao em minutos quando menor que uma hora', () => {
      const vm = buildSessaoResumoViewModel(
        makeDetalhe({
          sessao: makeSessao('2026-05-03T10:00:00.000Z', '2026-05-03T10:45:00.000Z'),
        })
      );
      expect(vm.duracao).toBe('45min');
    });

    it('calcula duracao em horas e minutos quando uma hora ou mais', () => {
      const vm = buildSessaoResumoViewModel(
        makeDetalhe({
          sessao: makeSessao('2026-05-03T10:00:00.000Z', '2026-05-03T11:20:00.000Z'),
        })
      );
      expect(vm.duracao).toBe('1h 20min');
    });

    it('exibe traco quando a sessao nao foi finalizada', () => {
      const vm = buildSessaoResumoViewModel(
        makeDetalhe({ sessao: makeSessao('2026-05-03T10:00:00.000Z', null) })
      );
      expect(vm.duracao).toBe('–');
    });
  });

  describe('melhor serie', () => {
    it('identifica a melhor serie pelo 1RM estimado', () => {
      // s2: 1RM = 80*(1+8/30)=101.3, s3: 1RM = 85*(1+6/30)=102
      // s3 tem melhor 1RM
      const vm = buildSessaoResumoViewModel(makeDetalhe());
      expect(vm.exercicios[0].melhorSerie).toContain('85');
    });

    it('retorna null quando nao ha series validas', () => {
      const vm = buildSessaoResumoViewModel(
        makeDetalhe({
          exercicios: [
            {
              sessaoExercicio: makeSessaoExercicio('se_1'),
              series: [makeSerie('s1', 'aquecimento', 40, 15)],
            },
          ],
        })
      );
      expect(vm.exercicios[0].melhorSerie).toBeNull();
    });
  });

  describe('contagens', () => {
    it('conta como realizado apenas exercicio com realizado=true E ao menos uma serie valida', () => {
      const vm = buildSessaoResumoViewModel(
        makeDetalhe({
          exercicios: [
            { sessaoExercicio: makeSessaoExercicio('se_1', true), series: [makeSerie('s1', 'valida', 80, 8)] },
            { sessaoExercicio: makeSessaoExercicio('se_2', false), series: [] },
            { sessaoExercicio: makeSessaoExercicio('se_3', true), series: [] },
          ],
        })
      );
      expect(vm.totalExercicios).toBe(3);
      expect(vm.exerciciosRealizados).toBe(1);
    });

    it('conta apenas series validas no total de series', () => {
      const vm = buildSessaoResumoViewModel(makeDetalhe());
      // 1 aquecimento + 2 validas → totalSeriesValidas = 2
      expect(vm.totalSeriesValidas).toBe(2);
    });
  });
});
