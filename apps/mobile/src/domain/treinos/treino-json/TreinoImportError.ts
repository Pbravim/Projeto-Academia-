export type TreinoImportErrorCode =
  | 'json_invalido'
  | 'schema_ausente'
  | 'schema_desconhecido'
  | 'nome_invalido'
  | 'exercicios_vazios'
  | 'exercicio_invalido';

/** Erro tipado do import de treino JSON — `path` aponta o campo quando aplicável (ex.: `exercicios[2].seriesAlvo`). */
export class TreinoImportError extends Error {
  readonly code: TreinoImportErrorCode;
  readonly path?: string;

  constructor(code: TreinoImportErrorCode, message: string, path?: string) {
    super(message);
    this.name = 'TreinoImportError';
    this.code = code;
    this.path = path;
  }
}
