import { type MetodoExercicio,METODOS_EXERCICIO } from '../entities/TreinoExercicio';

import { TreinoImportError, type TreinoImportErrorCode } from './TreinoImportError';
import { TREINO_JSON_SCHEMA, type TreinoImportado, type TreinoJsonExercicioV1 } from './TreinoJsonSchema';

export type ParseResult = { ok: true; treino: TreinoImportado } | { ok: false; error: TreinoImportError };

function erro(code: TreinoImportErrorCode, message: string, path?: string): ParseResult {
  return { ok: false, error: new TreinoImportError(code, message, path) };
}

function normalizeTexto(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalizado = value.trim().replace(/\s+/g, ' ');
  return normalizado.length > 0 ? normalizado : null;
}

function normalizeNomeTreino(value: unknown): string | null {
  const normalizado = normalizeTexto(value);
  return normalizado && normalizado.length >= 2 ? normalizado : null;
}

function validarInteiro(value: unknown, min: number, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    throw new TreinoImportError('exercicio_invalido', `Campo invalido: ${path}`, path);
  }
  return value;
}

function validarNumero(value: unknown, min: number, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || Number.isNaN(value) || value < min) {
    throw new TreinoImportError('exercicio_invalido', `Campo invalido: ${path}`, path);
  }
  return value;
}

function validarTextoOpcional(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  const normalizado = normalizeTexto(value);
  if (normalizado === null) {
    throw new TreinoImportError('exercicio_invalido', `Campo invalido: ${path}`, path);
  }
  return normalizado;
}

function validarMetodo(value: unknown, path: string): MetodoExercicio {
  if (value === undefined) return 'normal';
  if (typeof value !== 'string' || !METODOS_EXERCICIO.includes(value as MetodoExercicio)) {
    throw new TreinoImportError('exercicio_invalido', `Campo invalido: ${path}`, path);
  }
  return value as MetodoExercicio;
}

function validarItem(raw: unknown, index: number): TreinoJsonExercicioV1 {
  const path = (campo: string) => `exercicios[${index}].${campo}`;

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TreinoImportError('exercicio_invalido', 'Exercicio invalido.', `exercicios[${index}]`);
  }
  const item = raw as Record<string, unknown>;

  const nome = normalizeTexto(item.nome);
  if (nome === null) {
    throw new TreinoImportError('exercicio_invalido', 'Campo "nome" invalido.', path('nome'));
  }

  const equipamento = validarTextoOpcional(item.equipamento, path('equipamento'));
  const seriesAlvo = validarInteiro(item.seriesAlvo, 1, path('seriesAlvo'));
  const repsAlvo = validarInteiro(item.repsAlvo, 1, path('repsAlvo'));
  const descansoSegundos = validarInteiro(item.descansoSegundos, 0, path('descansoSegundos'));
  const grupo = validarTextoOpcional(item.grupo, path('grupo'));
  const metodo = validarMetodo(item.metodo, path('metodo'));
  const duracaoSegundos = validarNumero(item.duracaoSegundos, 0, path('duracaoSegundos'));
  const distanciaMetros = validarNumero(item.distanciaMetros, 0, path('distanciaMetros'));
  const intensidade = validarNumero(item.intensidade, 0, path('intensidade'));

  return {
    nome,
    ...(equipamento !== undefined && { equipamento }),
    ...(seriesAlvo !== undefined && { seriesAlvo }),
    ...(repsAlvo !== undefined && { repsAlvo }),
    metodo,
    ...(descansoSegundos !== undefined && { descansoSegundos }),
    ...(grupo !== undefined && { grupo }),
    ...(duracaoSegundos !== undefined && { duracaoSegundos }),
    ...(distanciaMetros !== undefined && { distanciaMetros }),
    ...(intensidade !== undefined && { intensidade }),
  };
}

/** Parser puro do JSON de treino: nunca lança — devolve union discriminada. */
export function parseTreinoJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return erro('json_invalido', 'JSON invalido.');
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return erro('json_invalido', 'JSON invalido.');
  }
  const obj = raw as Record<string, unknown>;

  if (obj.schema === undefined) {
    return erro('schema_ausente', 'Campo "schema" e obrigatorio.');
  }
  if (obj.schema !== TREINO_JSON_SCHEMA) {
    return erro('schema_desconhecido', `Schema "${String(obj.schema)}" nao e suportado.`);
  }

  const nome = normalizeNomeTreino(obj.nome);
  if (nome === null) {
    return erro('nome_invalido', 'Campo "nome" invalido.');
  }

  const objetivo = normalizeTexto(obj.objetivo);

  if (!Array.isArray(obj.exercicios) || obj.exercicios.length === 0) {
    return erro('exercicios_vazios', 'E preciso ao menos um exercicio.');
  }

  const exercicios: TreinoJsonExercicioV1[] = [];
  for (let index = 0; index < obj.exercicios.length; index += 1) {
    try {
      exercicios.push(validarItem(obj.exercicios[index], index));
    } catch (e) {
      if (e instanceof TreinoImportError) {
        return { ok: false, error: e };
      }
      throw e;
    }
  }

  return { ok: true, treino: { nome, objetivo, exercicios } };
}
