import { describe, expect, it, vi } from 'vitest';

import { Exercise } from '../../../domain/exercises/entities/Exercise';
import { TREINO_JSON_SCHEMA } from '../../../domain/treinos/treino-json/TreinoJsonSchema';
import { InMemoryExerciseRepository } from '../../../infrastructure/exercises/InMemoryExerciseRepository';

import { ImportarTreinoUseCase } from './ImportarTreinoUseCase';

const JSON_DA_ISSUE = JSON.stringify({
  schema: TREINO_JSON_SCHEMA,
  nome: 'Treino A',
  objetivo: 'Hipertrofia',
  exercicios: [
    { nome: 'Supino reto com barra', seriesAlvo: 4, repsAlvo: 8, metodo: 'normal', descansoSegundos: 90 },
    { nome: 'Crucifixo inclinado', seriesAlvo: 3, repsAlvo: 12, metodo: 'drop_set' },
    { nome: 'Tríceps corda', seriesAlvo: 3, repsAlvo: 12, grupo: 'A' },
    { nome: 'Tríceps testa', seriesAlvo: 3, repsAlvo: 12, grupo: 'A' },
  ],
});

async function repositorioComCatalogo() {
  const repo = new InMemoryExerciseRepository();
  const nomes = ['Supino reto com barra', 'Crucifixo inclinado', 'Tríceps corda', 'Tríceps testa'];
  for (const [i, nome] of nomes.entries()) {
    await repo.save(Exercise.create({ id: `ex-${i}`, name: nome, groupMuscles: ['Peito'], createdAt: new Date('2026-01-01') }));
  }
  return repo;
}

describe('ImportarTreinoUseCase', () => {
  it('JSON no formato da issue -> proposta com 4 itens, metodo e grupo preservados no item', async () => {
    const exerciseRepository = await repositorioComCatalogo();
    const uc = new ImportarTreinoUseCase({ exerciseRepository });

    const proposta = await uc.execute(JSON_DA_ISSUE);

    expect(proposta.nome).toBe('Treino A');
    expect(proposta.objetivo).toBe('Hipertrofia');
    expect(proposta.itens).toHaveLength(4);
    expect(proposta.itens.every((i) => i.status === 'casado')).toBe(true);
    expect(proposta.itens.map((i) => i.item.metodo)).toEqual(['normal', 'drop_set', 'normal', 'normal']);
    expect(proposta.itens[2].item.grupo).toBe('A');
    expect(proposta.itens[3].item.grupo).toBe('A');
  });

  it('JSON invalido -> rejeita com TreinoImportError e o code certo', async () => {
    const exerciseRepository = await repositorioComCatalogo();
    const uc = new ImportarTreinoUseCase({ exerciseRepository });

    await expect(uc.execute('nao e json')).rejects.toMatchObject({ name: 'TreinoImportError', code: 'json_invalido' });
  });

  it('chama exerciseRepository.list uma unica vez, nao por item', async () => {
    const exerciseRepository = await repositorioComCatalogo();
    const listSpy = vi.spyOn(exerciseRepository, 'list');
    const uc = new ImportarTreinoUseCase({ exerciseRepository });

    await uc.execute(JSON_DA_ISSUE);

    expect(listSpy).toHaveBeenCalledTimes(1);
  });
});
