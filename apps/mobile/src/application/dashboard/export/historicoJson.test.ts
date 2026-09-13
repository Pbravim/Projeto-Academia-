import { describe, expect, it } from 'vitest';

import { HISTORICO_EXPORT_SCHEMA, type HistoricoExportTree } from './HistoricoExportTypes';
import { buildHistoricoJson, serializeHistoricoJson } from './historicoJson';

function tree(): HistoricoExportTree {
  return {
    sessoes: [
      {
        id: 's1', treino_id: 'tr1', treino: 'Treino A',
        data_inicio: '2026-01-01T10:00:00.000Z', data_fim: '2026-01-01T11:00:00.000Z',
        exercicios: [
          {
            id: 'se1', ordem: 1, exercicio_id: 'ex1', nome: 'Supino reto',
            grupo_muscular: 'Peito', equipamento: 'Barra', tracking_type: 'reps_load',
            metodo: 'drop_set', grupo_id: null, substituicao: null,
            series: [
              {
                id: 'sr1', ordem: 1, carga_kg: 60, repeticoes: 8,
                duracao_s: null, distancia_m: null, intensidade: null, observacao: null,
                segmentos: [{ id: 'sg1', ordem: 2, carga_kg: 50, repeticoes: 6, descanso_segundos: 0 }],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('buildHistoricoJson', () => {
  it('sets schema and exportado_em exactly', () => {
    const exportadoEm = new Date('2026-09-12T18:00:00.000Z');
    const envelope = buildHistoricoJson(tree(), exportadoEm);

    expect(envelope.schema).toBe(HISTORICO_EXPORT_SCHEMA);
    expect(envelope.exportado_em).toBe('2026-09-12T18:00:00.000Z');
  });
});

describe('serializeHistoricoJson', () => {
  it('round-trips sessoes through JSON.parse deep-equal to the tree', () => {
    const t = tree();
    const envelope = buildHistoricoJson(t, new Date('2026-09-12T18:00:00.000Z'));
    const serialized = serializeHistoricoJson(envelope);

    const parsed = JSON.parse(serialized);
    expect(parsed.sessoes).toEqual(t.sessoes);
  });
});
