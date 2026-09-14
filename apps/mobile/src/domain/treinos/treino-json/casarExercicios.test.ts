import { describe, expect, it } from 'vitest';

import { Exercise } from '../../exercises/entities/Exercise';

import { casarExercicios } from './casarExercicios';
import type { TreinoJsonExercicioV1 } from './TreinoJsonSchema';

function item(nome: string, extra: Partial<TreinoJsonExercicioV1> = {}): TreinoJsonExercicioV1 {
  return { nome, metodo: 'normal', ...extra };
}

function exercicio(id: string, name: string, opts: { nameVariations?: string[]; equipment?: string | null } = {}) {
  return Exercise.create({
    id,
    name,
    groupMuscles: ['Peito'],
    createdAt: new Date('2026-01-01'),
    nameVariations: opts.nameVariations ?? [],
    equipment: opts.equipment ?? null,
  }).toPrimitives();
}

const catalogo = [
  exercicio('ex-1', 'Supino reto com barra', { nameVariations: ['Bench press'], equipment: 'Barra' }),
  exercicio('ex-2', 'Supino reto com halteres'),
  exercicio('ex-3', 'Crucifixo inclinado'),
  exercicio('ex-4', 'Tríceps corda', { nameVariations: ['Triceps pushdown corda'] }),
  exercicio('ex-5', 'Tríceps testa'),
  exercicio('ex-6', 'Remada baixa', { equipment: 'Technogym' }),
  exercicio('ex-7', 'Remada baixa', { equipment: 'Polia' }),
];

describe('casarExercicios', () => {
  it('(a) casa os 4 itens da issue com os ids certos', () => {
    const itens = [
      item('Supino reto com barra'),
      item('Crucifixo inclinado'),
      item('Tríceps corda'),
      item('Tríceps testa'),
    ];

    const propostas = casarExercicios(itens, catalogo);

    expect(propostas.map((p) => p.status)).toEqual(['casado', 'casado', 'casado', 'casado']);
    expect(propostas.map((p) => p.exercicio?.id)).toEqual(['ex-1', 'ex-3', 'ex-4', 'ex-5']);
  });

  it('(b) casa ignorando acento, caixa e espacos', () => {
    const [proposta] = casarExercicios([item('TRÍCEPS  corda')], catalogo);

    expect(proposta.status).toBe('casado');
    expect(proposta.exercicio?.id).toBe('ex-4');
  });

  it('(c) casa por nameVariation', () => {
    const [proposta] = casarExercicios([item('bench press')], catalogo);

    expect(proposta.status).toBe('casado');
    expect(proposta.exercicio?.id).toBe('ex-1');
  });

  it('(d) "Supino" nao casa - candidatos = os 2 supinos em ordem alfabetica', () => {
    const [proposta] = casarExercicios([item('Supino')], catalogo);

    expect(proposta.status).toBe('nao_casado');
    expect(proposta.candidatos.map((c) => c.id)).toEqual(['ex-1', 'ex-2']);
  });

  it('(e) "Remada baixa" sem equipamento -> nao_casado com 2 candidatos', () => {
    const [proposta] = casarExercicios([item('Remada baixa')], catalogo);

    expect(proposta.status).toBe('nao_casado');
    expect(proposta.candidatos.map((c) => c.id).sort()).toEqual(['ex-6', 'ex-7']);
  });

  it('(e) "Remada baixa" com equipamento Technogym -> casado', () => {
    const [proposta] = casarExercicios([item('Remada baixa', { equipamento: 'Technogym' })], catalogo);

    expect(proposta.status).toBe('casado');
    expect(proposta.exercicio?.id).toBe('ex-6');
  });

  it('(e) "Remada baixa" com equipamento Kettlebell (nao desempata) -> nao_casado com os 2 candidatos', () => {
    const [proposta] = casarExercicios([item('Remada baixa', { equipamento: 'Kettlebell' })], catalogo);

    expect(proposta.status).toBe('nao_casado');
    expect(proposta.candidatos.map((c) => c.id).sort()).toEqual(['ex-6', 'ex-7']);
  });

  it('(f) "Agachamento" nao casa - candidatos vazio', () => {
    const [proposta] = casarExercicios([item('Agachamento')], catalogo);

    expect(proposta.status).toBe('nao_casado');
    expect(proposta.candidatos).toEqual([]);
  });

  it('(g) limite de 10 candidatos', () => {
    const catalogoGrande = Array.from({ length: 15 }, (_, i) => exercicio(`sup-${i}`, `Supino variante ${i}`));

    const [proposta] = casarExercicios([item('Supino')], catalogoGrande);

    expect(proposta.status).toBe('nao_casado');
    expect(proposta.candidatos).toHaveLength(10);
  });

  it('(h) catalogo vazio -> tudo nao_casado', () => {
    const propostas = casarExercicios([item('Supino reto com barra')], []);

    expect(propostas[0].status).toBe('nao_casado');
    expect(propostas[0].candidatos).toEqual([]);
  });
});
