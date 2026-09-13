import type { ExercicioExport, HistoricoExportTree, SerieExport, SessaoExport } from './HistoricoExportTypes';

export const HISTORICO_CSV_COLUMNS = [
  'sessao_id', 'data_inicio_iso', 'data_fim_iso', 'treino_id', 'treino',
  'exercicio_id', 'exercicio', 'grupo_muscular', 'equipamento', 'tracking_type', 'exercicio_ordem', 'metodo', 'grupo_id',
  'serie_id', 'serie_ordem', 'segmento_id', 'segmento_ordem',
  'carga_kg', 'repeticoes', 'duracao_s', 'distancia_m', 'intensidade', 'descanso_segundos', 'observacao',
  'substituiu_exercicio_id', 'substituiu_exercicio', 'substituicao_motivo',
] as const;

export type CsvCell = string | number | null;

/** Achata a árvore em linhas CSV: 1 linha por degrau, mãe = `segmento_ordem 1`, campos do pai repetidos. */
export function flattenHistoricoCsvRows(tree: HistoricoExportTree): CsvCell[][] {
  const rows: CsvCell[][] = [];
  for (const sessao of tree.sessoes) {
    for (const exercicio of sessao.exercicios) {
      for (const serie of exercicio.series) {
        rows.push(rowMae(sessao, exercicio, serie));
        for (const segmento of serie.segmentos) {
          rows.push(rowDegrau(sessao, exercicio, serie, segmento));
        }
      }
    }
  }
  return rows;
}

function rowPai(sessao: SessaoExport, exercicio: ExercicioExport): CsvCell[] {
  return [
    sessao.id, sessao.data_inicio, sessao.data_fim, sessao.treino_id, sessao.treino,
    exercicio.exercicio_id, exercicio.nome, exercicio.grupo_muscular, exercicio.equipamento, exercicio.tracking_type, exercicio.ordem, exercicio.metodo, exercicio.grupo_id,
  ];
}

function rowSubstituicao(exercicio: ExercicioExport): CsvCell[] {
  return [
    exercicio.substituicao?.exercicio_id ?? null,
    exercicio.substituicao?.nome ?? null,
    exercicio.substituicao?.motivo ?? null,
  ];
}

function rowMae(sessao: SessaoExport, exercicio: ExercicioExport, serie: SerieExport): CsvCell[] {
  return [
    ...rowPai(sessao, exercicio),
    serie.id, serie.ordem, '', 1,
    serie.carga_kg, serie.repeticoes, serie.duracao_s, serie.distancia_m, serie.intensidade, '', serie.observacao,
    ...rowSubstituicao(exercicio),
  ];
}

function rowDegrau(
  sessao: SessaoExport,
  exercicio: ExercicioExport,
  serie: SerieExport,
  segmento: SerieExport['segmentos'][number]
): CsvCell[] {
  return [
    ...rowPai(sessao, exercicio),
    serie.id, serie.ordem, segmento.id, segmento.ordem,
    segmento.carga_kg, segmento.repeticoes, null, null, null, segmento.descanso_segundos, serie.observacao,
    ...rowSubstituicao(exercicio),
  ];
}

/** Serializa linhas em CSV RFC 4180: campo com `,` `"` ou quebra vai entre aspas com `""`; número → String(n); null/undefined → ''. */
export function serializeCsv(rows: CsvCell[][]): string {
  const header = HISTORICO_CSV_COLUMNS.join(',');
  const lines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [header, ...lines].join('\n');
}

function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
