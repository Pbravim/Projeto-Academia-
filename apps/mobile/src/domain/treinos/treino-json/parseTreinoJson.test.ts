import { describe, expect, it } from 'vitest';

import { parseTreinoJson } from './parseTreinoJson';
import { TREINO_JSON_SCHEMA } from './TreinoJsonSchema';

const JSON_DA_ISSUE = {
  schema: TREINO_JSON_SCHEMA,
  nome: 'Treino A — Peito/Tríceps',
  objetivo: 'Hipertrofia',
  exercicios: [
    {
      nome: 'Supino reto com barra',
      equipamento: 'Barra',
      seriesAlvo: 4,
      repsAlvo: 8,
      metodo: 'normal',
      descansoSegundos: 90,
    },
    {
      nome: 'Crucifixo inclinado',
      seriesAlvo: 3,
      repsAlvo: 12,
      metodo: 'drop_set',
    },
    {
      nome: 'Tríceps corda',
      seriesAlvo: 3,
      repsAlvo: 15,
      grupo: 'A',
    },
    {
      nome: 'Tríceps testa',
      seriesAlvo: 3,
      repsAlvo: 12,
      grupo: 'A',
    },
  ],
};

describe('parseTreinoJson', () => {
  it('(a) aceita o JSON exato da issue com 4 itens, metodo e grupo preservados', () => {
    const resultado = parseTreinoJson(JSON.stringify(JSON_DA_ISSUE));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.treino.nome).toBe('Treino A — Peito/Tríceps');
    expect(resultado.treino.objetivo).toBe('Hipertrofia');
    expect(resultado.treino.exercicios).toHaveLength(4);
    expect(resultado.treino.exercicios.map((e) => e.metodo)).toEqual(['normal', 'drop_set', 'normal', 'normal']);
    expect(resultado.treino.exercicios[2].grupo).toBe('A');
    expect(resultado.treino.exercicios[3].grupo).toBe('A');
    expect(resultado.treino.exercicios[0].descansoSegundos).toBe(90);
    expect(resultado.treino.exercicios[1].descansoSegundos).toBeUndefined();
  });

  it('(b) texto nao-JSON -> json_invalido', () => {
    const resultado = parseTreinoJson('isso nao e json {{{');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error.code).toBe('json_invalido');
  });

  it('(c) sem schema -> schema_ausente', () => {
    const { schema: _schema, ...semSchema } = JSON_DA_ISSUE;
    const resultado = parseTreinoJson(JSON.stringify(semSchema));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error.code).toBe('schema_ausente');
  });

  it.each(['projeto-academia/treino@2', 'outro/coisa@1'])('(d) schema desconhecido "%s" -> schema_desconhecido', (schema) => {
    const resultado = parseTreinoJson(JSON.stringify({ ...JSON_DA_ISSUE, schema }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error.code).toBe('schema_desconhecido');
  });

  it.each([undefined, '', 'a', 123])('(e) nome invalido (%j) -> nome_invalido', (nome) => {
    const resultado = parseTreinoJson(JSON.stringify({ ...JSON_DA_ISSUE, nome }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error.code).toBe('nome_invalido');
  });

  it.each([undefined, [], 'nao-array'])('(f) exercicios invalido (%j) -> exercicios_vazios', (exercicios) => {
    const resultado = parseTreinoJson(JSON.stringify({ ...JSON_DA_ISSUE, exercicios }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error.code).toBe('exercicios_vazios');
  });

  it.each([
    ['sem nome', { seriesAlvo: 4 }, 'exercicios[1].nome'],
    ['seriesAlvo 0', { nome: 'X', seriesAlvo: 0 }, 'exercicios[1].seriesAlvo'],
    ['seriesAlvo 2.5', { nome: 'X', seriesAlvo: 2.5 }, 'exercicios[1].seriesAlvo'],
    ['seriesAlvo string', { nome: 'X', seriesAlvo: '4' }, 'exercicios[1].seriesAlvo'],
    ['metodo invalido', { nome: 'X', metodo: 'superset' }, 'exercicios[1].metodo'],
    ['grupo vazio', { nome: 'X', grupo: '' }, 'exercicios[1].grupo'],
    ['descansoSegundos negativo', { nome: 'X', descansoSegundos: -1 }, 'exercicios[1].descansoSegundos'],
  ])('(g) item invalido: %s -> exercicio_invalido com path', (_label, itemInvalido, path) => {
    const resultado = parseTreinoJson(JSON.stringify({ ...JSON_DA_ISSUE, exercicios: [JSON_DA_ISSUE.exercicios[0], itemInvalido] }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error.code).toBe('exercicio_invalido');
    expect(resultado.error.path).toBe(path);
  });

  it('(h) ignora campos desconhecidos na raiz e no item', () => {
    const comLixo = {
      ...JSON_DA_ISSUE,
      camaraExtra: 'lixo',
      exercicios: [{ ...JSON_DA_ISSUE.exercicios[0], campoDesconhecido: 'lixo' }],
    };

    const resultado = parseTreinoJson(JSON.stringify(comLixo));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.treino).not.toHaveProperty('camaraExtra');
    expect(resultado.treino.exercicios[0]).not.toHaveProperty('campoDesconhecido');
  });

  it('(i) duracaoSegundos/distanciaMetros/intensidade numericos passam', () => {
    const comCardio = {
      ...JSON_DA_ISSUE,
      exercicios: [{ nome: 'Esteira', duracaoSegundos: 600, distanciaMetros: 2000, intensidade: 7 }],
    };

    const resultado = parseTreinoJson(JSON.stringify(comCardio));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.treino.exercicios[0]).toMatchObject({ duracaoSegundos: 600, distanciaMetros: 2000, intensidade: 7 });
  });

  it.each(['duracaoSegundos', 'distanciaMetros', 'intensidade'])('(i) %s negativo reprova', (campo) => {
    const comCardio = {
      ...JSON_DA_ISSUE,
      exercicios: [{ nome: 'Esteira', [campo]: -1 }],
    };

    const resultado = parseTreinoJson(JSON.stringify(comCardio));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error.code).toBe('exercicio_invalido');
    expect(resultado.error.path).toBe(`exercicios[0].${campo}`);
  });

  it('(j) nome do treino com espacos duplicados e normalizado', () => {
    const resultado = parseTreinoJson(JSON.stringify({ ...JSON_DA_ISSUE, nome: '  Treino   A  ' }));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.treino.nome).toBe('Treino A');
  });
});
