import { describe, expect, it } from 'vitest';

import { Exercise } from '../../exercises/entities/Exercise';
import { Treino } from '../entities/Treino';
import { TreinoExercicio } from '../entities/TreinoExercicio';

import { buildTreinoJson, serializeTreinoJson, type TreinoJsonExportItem } from './serializeTreinoJson';
import { TREINO_JSON_SCHEMA } from './TreinoJsonSchema';

function te(overrides: Partial<Parameters<typeof TreinoExercicio.create>[0]>) {
  return TreinoExercicio.create({
    id: 'te-x',
    treinoId: 'treino-1',
    exercicioId: 'ex-x',
    ordem: 1,
    seriesRecomendadas: null,
    execucoesRecomendadas: null,
    cargaPadrao: null,
    tempoDescansoSegundos: null,
    metodo: 'normal',
    grupoId: null,
    duracaoRecomendadaSegundos: null,
    distanciaRecomendadaMetros: null,
    intensidadeRecomendada: null,
    ...overrides,
  }).toPrimitives();
}

function exercicio(id: string, name: string, equipment: string | null = null) {
  return Exercise.create({ id, name, groupMuscles: ['Peito'], equipment, createdAt: new Date('2026-01-01') }).toPrimitives();
}

describe('buildTreinoJson', () => {
  it('(a) monta o objeto do JSON da issue a partir de 4 TreinoExercicioPrimitives (2 com o mesmo grupoId)', () => {
    const treino = Treino.create({ id: 'treino-1', name: 'Treino A', objetivo: 'Hipertrofia', createdAt: new Date('2026-01-01') }).toPrimitives();
    const itens: TreinoJsonExportItem[] = [
      { te: te({ ordem: 1, exercicioId: 'ex-1', seriesRecomendadas: 4, execucoesRecomendadas: 8, tempoDescansoSegundos: 90 }), exercise: exercicio('ex-1', 'Supino reto com barra') },
      { te: te({ ordem: 2, exercicioId: 'ex-2', metodo: 'drop_set', seriesRecomendadas: 3, execucoesRecomendadas: 12 }), exercise: exercicio('ex-2', 'Crucifixo inclinado') },
      { te: te({ ordem: 3, exercicioId: 'ex-3', grupoId: 'g1', seriesRecomendadas: 3, execucoesRecomendadas: 15 }), exercise: exercicio('ex-3', 'Tríceps corda') },
      { te: te({ ordem: 4, exercicioId: 'ex-4', grupoId: 'g1', seriesRecomendadas: 3, execucoesRecomendadas: 12 }), exercise: exercicio('ex-4', 'Tríceps testa') },
    ];

    const json = buildTreinoJson(treino, itens);

    expect(json.schema).toBe(TREINO_JSON_SCHEMA);
    expect(json.nome).toBe('Treino A');
    expect(json.exercicios).toHaveLength(4);
    expect(json.exercicios[2].grupo).toBe('A');
    expect(json.exercicios[3].grupo).toBe('A');
    expect(json.exercicios[0]).not.toHaveProperty('grupo');
    expect(json.exercicios[0]).toMatchObject({ nome: 'Supino reto com barra', seriesAlvo: 4, repsAlvo: 8, descansoSegundos: 90, metodo: 'normal' });
  });

  it('(b) ordem segue "ordem", nao a ordem do array de entrada', () => {
    const treino = Treino.create({ id: 'treino-1', name: 'Treino B', createdAt: new Date('2026-01-01') }).toPrimitives();
    const itens: TreinoJsonExportItem[] = [
      { te: te({ ordem: 2, exercicioId: 'ex-2' }), exercise: exercicio('ex-2', 'Segundo') },
      { te: te({ ordem: 1, exercicioId: 'ex-1' }), exercise: exercicio('ex-1', 'Primeiro') },
    ];

    const json = buildTreinoJson(treino, itens);

    expect(json.exercicios.map((e) => e.nome)).toEqual(['Primeiro', 'Segundo']);
  });

  it('(c) equipamento = exercise.equipment (omitido se null)', () => {
    const treino = Treino.create({ id: 'treino-1', name: 'Treino C', createdAt: new Date('2026-01-01') }).toPrimitives();
    const itens: TreinoJsonExportItem[] = [
      { te: te({ ordem: 1, exercicioId: 'ex-1' }), exercise: exercicio('ex-1', 'Supino', 'Barra') },
      { te: te({ ordem: 2, exercicioId: 'ex-2' }), exercise: exercicio('ex-2', 'Agachamento', null) },
    ];

    const json = buildTreinoJson(treino, itens);

    expect(json.exercicios[0].equipamento).toBe('Barra');
    expect(json.exercicios[1]).not.toHaveProperty('equipamento');
  });

  it('(d) segundo grupo vira "B"', () => {
    const treino = Treino.create({ id: 'treino-1', name: 'Treino D', createdAt: new Date('2026-01-01') }).toPrimitives();
    const itens: TreinoJsonExportItem[] = [
      { te: te({ ordem: 1, exercicioId: 'ex-1', grupoId: 'g1' }), exercise: exercicio('ex-1', 'A1') },
      { te: te({ ordem: 2, exercicioId: 'ex-2', grupoId: 'g1' }), exercise: exercicio('ex-2', 'A2') },
      { te: te({ ordem: 3, exercicioId: 'ex-3', grupoId: 'g2' }), exercise: exercicio('ex-3', 'B1') },
      { te: te({ ordem: 4, exercicioId: 'ex-4', grupoId: 'g2' }), exercise: exercicio('ex-4', 'B2') },
    ];

    const json = buildTreinoJson(treino, itens);

    expect(json.exercicios.map((e) => e.grupo)).toEqual(['A', 'A', 'B', 'B']);
  });
});

describe('serializeTreinoJson', () => {
  it('(e) produz JSON indentado com "schema" como primeira chave', () => {
    const treino = Treino.create({ id: 'treino-1', name: 'Treino E', createdAt: new Date('2026-01-01') }).toPrimitives();
    const itens: TreinoJsonExportItem[] = [{ te: te({ ordem: 1, exercicioId: 'ex-1' }), exercise: exercicio('ex-1', 'Exercicio X') }];

    const conteudo = serializeTreinoJson(buildTreinoJson(treino, itens));
    const parsed = JSON.parse(conteudo);

    expect(Object.keys(parsed)[0]).toBe('schema');
    expect(conteudo).toContain('\n  "schema"');
  });
});
