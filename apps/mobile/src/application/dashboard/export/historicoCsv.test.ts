import { describe, expect, it } from 'vitest';

import { flattenHistoricoCsvRows, HISTORICO_CSV_COLUMNS, serializeCsv } from './historicoCsv';
import type { HistoricoExportTree } from './HistoricoExportTypes';

function tree(overrides: Partial<HistoricoExportTree['sessoes'][number]> = {}): HistoricoExportTree {
  return {
    sessoes: [
      {
        id: 's1',
        treino_id: 'tr1',
        treino: 'Treino A',
        data_inicio: '2026-01-01T10:00:00.000Z',
        data_fim: '2026-01-01T11:00:00.000Z',
        exercicios: [
          {
            id: 'se1',
            ordem: 1,
            exercicio_id: 'ex1',
            nome: 'Supino reto',
            grupo_muscular: 'Peito',
            equipamento: 'Barra',
            tracking_type: 'reps_load',
            metodo: 'drop_set',
            grupo_id: null,
            substituicao: null,
            series: [
              {
                id: 'sr1',
                ordem: 1,
                carga_kg: 60,
                repeticoes: 8,
                duracao_s: null,
                distancia_m: null,
                intensidade: null,
                observacao: null,
                segmentos: [
                  { id: 'sg1', ordem: 2, carga_kg: 50, repeticoes: 6, descanso_segundos: 0 },
                  { id: 'sg2', ordem: 3, carga_kg: 40, repeticoes: 6, descanso_segundos: 0 },
                ],
              },
            ],
          },
        ],
        ...overrides,
      },
    ],
  };
}

describe('HISTORICO_CSV_COLUMNS', () => {
  it('matches the exact header contract (snapshot literal)', () => {
    expect(HISTORICO_CSV_COLUMNS.join(',')).toBe(
      'sessao_id,data_inicio_iso,data_fim_iso,treino_id,treino,' +
      'exercicio_id,exercicio,grupo_muscular,equipamento,tracking_type,exercicio_ordem,metodo,grupo_id,' +
      'serie_id,serie_ordem,segmento_id,segmento_ordem,' +
      'carga_kg,repeticoes,duracao_s,distancia_m,intensidade,descanso_segundos,observacao,' +
      'substituiu_exercicio_id,substituiu_exercicio,substituicao_motivo'
    );
  });
});

describe('flattenHistoricoCsvRows', () => {
  it('drop set de 3 degraus → 3 linhas com mesmo serie_id e segmento_ordem 1..3', () => {
    const rows = flattenHistoricoCsvRows(tree());
    expect(rows).toHaveLength(3);
    const serieIdIdx = HISTORICO_CSV_COLUMNS.indexOf('serie_id');
    const segOrdemIdx = HISTORICO_CSV_COLUMNS.indexOf('segmento_ordem');
    expect(rows.map((r) => r[serieIdIdx])).toEqual(['sr1', 'sr1', 'sr1']);
    expect(rows.map((r) => r[segOrdemIdx])).toEqual([1, 2, 3]);
  });

  it('cardio: duracao_s preenchido, carga_kg/repeticoes vazios', () => {
    const t: HistoricoExportTree = {
      sessoes: [
        {
          id: 's1', treino_id: 'tr1', treino: 'Treino A',
          data_inicio: '2026-01-01T10:00:00.000Z', data_fim: null,
          exercicios: [
            {
              id: 'se1', ordem: 1, exercicio_id: 'ex1', nome: 'Corrida',
              grupo_muscular: 'Cardio', equipamento: null, tracking_type: 'duracao',
              metodo: 'normal', grupo_id: null, substituicao: null,
              series: [
                { id: 'sr1', ordem: 1, carga_kg: null, repeticoes: null, duracao_s: 600, distancia_m: 2000, intensidade: null, observacao: null, segmentos: [] },
              ],
            },
          ],
        },
      ],
    };

    const rows = flattenHistoricoCsvRows(t);
    const cargaIdx = HISTORICO_CSV_COLUMNS.indexOf('carga_kg');
    const repsIdx = HISTORICO_CSV_COLUMNS.indexOf('repeticoes');
    const duracaoIdx = HISTORICO_CSV_COLUMNS.indexOf('duracao_s');

    expect(rows[0][duracaoIdx]).toBe(600);
    expect(rows[0][cargaIdx]).toBeNull();
    expect(rows[0][repsIdx]).toBeNull();
  });

  it('substituiu_exercicio preenchido quando houve substituição', () => {
    const t = tree();
    t.sessoes[0].exercicios[0].substituicao = { exercicio_id: 'ex-orig', nome: 'Agachamento', motivo: 'dor' };

    const rows = flattenHistoricoCsvRows(t);
    const subNomeIdx = HISTORICO_CSV_COLUMNS.indexOf('substituiu_exercicio');
    expect(rows[0][subNomeIdx]).toBe('Agachamento');
  });
});

describe('serializeCsv', () => {
  it('escapes commas, quotes and newlines per RFC 4180', () => {
    const csv = serializeCsv([['a,b', 'has "quote"', 'line\nbreak', 5, null]]);
    const [, dataLine] = csv.split('\n', 2);
    expect(dataLine.startsWith('"a,b","has ""quote""",')).toBe(true);
    expect(csv).toContain('"line\nbreak"');
    expect(csv.endsWith(',')).toBe(true);
  });

  it('escapes a lone \\r (without \\n) per RFC 4180', () => {
    const csv = serializeCsv([['a\rb']]);
    const [, dataLine] = csv.split('\n');
    expect(dataLine).toBe('"a\rb"');
  });

  it('renders numbers as plain strings and null/undefined as empty', () => {
    const csv = serializeCsv([[1, 2.5, null, undefined as unknown as null]]);
    const [, dataLine] = csv.split('\n');
    expect(dataLine).toBe('1,2.5,,');
  });

  it('starts with the exact header', () => {
    const csv = serializeCsv([]);
    expect(csv).toBe(HISTORICO_CSV_COLUMNS.join(','));
  });
});
