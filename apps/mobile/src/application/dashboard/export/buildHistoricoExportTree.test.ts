import { describe, expect, it } from 'vitest';

import { buildHistoricoExportTree } from './buildHistoricoExportTree';
import type { SegmentoExportRow, SerieExportRow } from './HistoricoExportTypes';

function baseRow(overrides: Partial<SerieExportRow> = {}): SerieExportRow {
  return {
    sessao_id: 's1',
    data_hora_inicio: '2026-01-01T10:00:00.000Z',
    data_hora_fim: '2026-01-01T11:00:00.000Z',
    treino_id: 'tr1',
    treino_nome_snapshot: 'Treino A',
    sessao_exercicio_id: 'se1',
    exercicio_ordem: 1,
    exercicio_id: 'ex1',
    nome_snapshot: 'Supino reto',
    grupo_muscular_snapshot: 'Peito',
    equipamento_snapshot: 'Barra',
    tracking_type_snapshot: 'reps_load',
    metodo: 'normal',
    grupo_id: null,
    substituido_por_exercicio_id: null,
    nome_original_snapshot: null,
    substituicao_motivo: null,
    serie_id: 'sr1',
    serie_ordem: 1,
    carga_kg: 60,
    repeticoes: 8,
    duracao_segundos: null,
    distancia_metros: null,
    intensidade: null,
    observacao: null,
    ...overrides,
  };
}

function segmento(overrides: Partial<SegmentoExportRow> = {}): SegmentoExportRow {
  return {
    id: 'sg1',
    serie_id: 'sr1',
    ordem: 2,
    carga_kg: 50,
    repeticoes: 6,
    descanso_segundos: 0,
    ...overrides,
  };
}

describe('buildHistoricoExportTree', () => {
  it('groups 2 sessões × 2 exercícios × séries into the expected tree shape', () => {
    const rows = [
      baseRow({ sessao_id: 's1', sessao_exercicio_id: 'se1', exercicio_ordem: 1, serie_id: 'sr1', serie_ordem: 1 }),
      baseRow({ sessao_id: 's1', sessao_exercicio_id: 'se2', exercicio_ordem: 2, exercicio_id: 'ex2', nome_snapshot: 'Rosca', serie_id: 'sr2', serie_ordem: 1 }),
      baseRow({ sessao_id: 's2', sessao_exercicio_id: 'se3', exercicio_ordem: 1, serie_id: 'sr3', serie_ordem: 1, treino_id: 'tr2', treino_nome_snapshot: 'Treino B' }),
    ];

    const tree = buildHistoricoExportTree(rows, []);

    expect(tree.sessoes).toHaveLength(2);
    expect(tree.sessoes[0].exercicios).toHaveLength(2);
    expect(tree.sessoes[0].exercicios[0].series).toHaveLength(1);
    expect(tree.sessoes[1].treino).toBe('Treino B');
  });

  it('attaches drop-set segmentos to the right série, ordered', () => {
    const rows = [baseRow()];
    const segmentos = [
      segmento({ id: 'sg2', ordem: 3, carga_kg: 40, repeticoes: 6 }),
      segmento({ id: 'sg1', ordem: 2, carga_kg: 50, repeticoes: 6 }),
    ];

    const tree = buildHistoricoExportTree(rows, segmentos);

    expect(tree.sessoes[0].exercicios[0].series[0].segmentos.map((s) => s.id)).toEqual(['sg2', 'sg1']);
  });

  it('série sem segmentos gera segmentos: []', () => {
    const tree = buildHistoricoExportTree([baseRow()], []);
    expect(tree.sessoes[0].exercicios[0].series[0].segmentos).toEqual([]);
  });

  it('preenche substituicao quando substituido_por_exercicio_id existe', () => {
    const rows = [
      baseRow({
        substituido_por_exercicio_id: 'ex-original',
        nome_original_snapshot: 'Agachamento',
        substituicao_motivo: 'dor no joelho',
      }),
    ];

    const tree = buildHistoricoExportTree(rows, []);

    expect(tree.sessoes[0].exercicios[0].substituicao).toEqual({
      exercicio_id: 'ex-original',
      nome: 'Agachamento',
      motivo: 'dor no joelho',
    });
  });

  it('substituicao é null quando não houve substituição', () => {
    const tree = buildHistoricoExportTree([baseRow()], []);
    expect(tree.sessoes[0].exercicios[0].substituicao).toBeNull();
  });

  it('bi-set mantém grupo_id nos dois exercícios', () => {
    const rows = [
      baseRow({ sessao_exercicio_id: 'se1', exercicio_ordem: 1, grupo_id: 'grupo-1', serie_id: 'sr1' }),
      baseRow({ sessao_exercicio_id: 'se2', exercicio_ordem: 2, exercicio_id: 'ex2', grupo_id: 'grupo-1', serie_id: 'sr2' }),
    ];

    const tree = buildHistoricoExportTree(rows, []);

    expect(tree.sessoes[0].exercicios.map((e) => e.grupo_id)).toEqual(['grupo-1', 'grupo-1']);
  });
});
