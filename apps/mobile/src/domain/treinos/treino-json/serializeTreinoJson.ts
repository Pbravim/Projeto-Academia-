import type { ExercisePrimitives } from '../../exercises/entities/Exercise';
import type { TreinoPrimitives } from '../entities/Treino';
import type { TreinoExercicioPrimitives } from '../entities/TreinoExercicio';

import { TREINO_JSON_SCHEMA, type TreinoJsonExercicioV1, type TreinoJsonV1 } from './TreinoJsonSchema';

export interface TreinoJsonExportItem {
  te: TreinoExercicioPrimitives;
  exercise: ExercisePrimitives;
}

const LETRAS_GRUPO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function letraDoGrupo(grupoId: string | null, letraPorGrupoId: Map<string, string>): string | undefined {
  if (!grupoId) return undefined;

  const existente = letraPorGrupoId.get(grupoId);
  if (existente) return existente;

  const letra = LETRAS_GRUPO[letraPorGrupoId.size] ?? `G${letraPorGrupoId.size + 1}`;
  letraPorGrupoId.set(grupoId, letra);
  return letra;
}

function buildItem(entry: TreinoJsonExportItem, letraPorGrupoId: Map<string, string>): TreinoJsonExercicioV1 {
  const { te, exercise } = entry;
  const grupo = letraDoGrupo(te.grupoId, letraPorGrupoId);

  return {
    nome: exercise.name,
    ...(exercise.equipment && { equipamento: exercise.equipment }),
    ...(te.seriesRecomendadas !== null && { seriesAlvo: te.seriesRecomendadas }),
    ...(te.execucoesRecomendadas !== null && { repsAlvo: te.execucoesRecomendadas }),
    metodo: te.metodo,
    ...(te.tempoDescansoSegundos !== null && { descansoSegundos: te.tempoDescansoSegundos }),
    ...(grupo && { grupo }),
    ...(te.duracaoRecomendadaSegundos !== null && { duracaoSegundos: te.duracaoRecomendadaSegundos }),
    ...(te.distanciaRecomendadaMetros !== null && { distanciaMetros: te.distanciaRecomendadaMetros }),
    ...(te.intensidadeRecomendada !== null && { intensidade: te.intensidadeRecomendada }),
  };
}

/** Monta o objeto do schema treino@1 a partir do treino e seus itens (te + exercise). `grupoId` vira letra por ordem de primeira aparição (D8). */
export function buildTreinoJson(treino: TreinoPrimitives, itens: TreinoJsonExportItem[]): TreinoJsonV1 {
  const ordenados = [...itens].sort((a, b) => a.te.ordem - b.te.ordem);
  const letraPorGrupoId = new Map<string, string>();
  const exercicios = ordenados.map((entry) => buildItem(entry, letraPorGrupoId));

  return {
    schema: TREINO_JSON_SCHEMA,
    nome: treino.name,
    ...(treino.objetivo && { objetivo: treino.objetivo }),
    exercicios,
  };
}

export function serializeTreinoJson(json: TreinoJsonV1): string {
  return JSON.stringify(json, null, 2);
}
