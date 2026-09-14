import { normalizeText } from '../../../shared/utils/normalizeText';
import type { ExercisePrimitives } from '../../exercises/entities/Exercise';
import { type ExerciseQueryFields,matchesExerciseQuery } from '../../exercises/matchesExerciseQuery';

import type { TreinoJsonExercicioV1 } from './TreinoJsonSchema';

const MAX_CANDIDATOS = 10;

export type ItemProposta =
  | { status: 'casado'; item: TreinoJsonExercicioV1; exercicio: ExercisePrimitives; candidatos: [] }
  | { status: 'nao_casado'; item: TreinoJsonExercicioV1; exercicio: null; candidatos: ExercisePrimitives[] };

export interface PropostaImportacao {
  nome: string;
  objetivo: string | null;
  itens: ItemProposta[];
}

function toQueryFields(exercise: ExercisePrimitives): ExerciseQueryFields {
  return {
    name: exercise.name,
    nameVariations: exercise.nameVariations,
    groupMuscles: exercise.groupMuscles,
    equipment: exercise.equipment,
    primaryEquipment: exercise.primaryEquipment,
    secondaryEquipment: exercise.secondaryEquipment,
  };
}

function ordenarPorNomeNormalizado(exercicios: ExercisePrimitives[]): ExercisePrimitives[] {
  return [...exercicios].sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
}

function matchesExatos(item: TreinoJsonExercicioV1, catalogo: ExercisePrimitives[]): ExercisePrimitives[] {
  const alvo = normalizeText(item.nome);
  const exatos = catalogo.filter(
    (ex) => ex.normalizedName === alvo || ex.nameVariations.some((variation) => normalizeText(variation) === alvo)
  );
  return ordenarPorNomeNormalizado(exatos);
}

function desempatarPorEquipamento(item: TreinoJsonExercicioV1, empatados: ExercisePrimitives[]): ExercisePrimitives[] {
  if (!item.equipamento) return empatados;
  return empatados.filter((ex) => matchesExerciseQuery(item.equipamento as string, toQueryFields(ex)));
}

function sugerirCandidatos(item: TreinoJsonExercicioV1, catalogo: ExercisePrimitives[]): ExercisePrimitives[] {
  const sugestoes = catalogo.filter((ex) => matchesExerciseQuery(item.nome, toQueryFields(ex)));
  return ordenarPorNomeNormalizado(sugestoes).slice(0, MAX_CANDIDATOS);
}

function casarItem(item: TreinoJsonExercicioV1, catalogo: ExercisePrimitives[]): ItemProposta {
  const exatos = matchesExatos(item, catalogo);

  if (exatos.length === 0) {
    return { status: 'nao_casado', item, exercicio: null, candidatos: sugerirCandidatos(item, catalogo) };
  }
  if (exatos.length === 1) {
    return { status: 'casado', item, exercicio: exatos[0], candidatos: [] };
  }

  const resolvidos = desempatarPorEquipamento(item, exatos);
  if (resolvidos.length === 1) {
    return { status: 'casado', item, exercicio: resolvidos[0], candidatos: [] };
  }

  return { status: 'nao_casado', item, exercicio: null, candidatos: exatos };
}

/** Casamento determinístico e sem score: ver decisão D6 do plano #38. Puro. */
export function casarExercicios(itens: TreinoJsonExercicioV1[], catalogo: ExercisePrimitives[]): ItemProposta[] {
  return itens.map((item) => casarItem(item, catalogo));
}
