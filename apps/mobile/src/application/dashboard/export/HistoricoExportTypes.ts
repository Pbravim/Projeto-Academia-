/** Formatos suportados de exportação do histórico. */
export type ExportFormato = 'csv' | 'json';

/** String única que carrega a versão do schema exportado (não duplicar com número). */
export const HISTORICO_EXPORT_SCHEMA = 'projeto-academia/historico@2';

/** Linha flat de uma série (mãe da série ou base do exercício/sessão), 1:1 com a query 1. */
export interface SerieExportRow {
  sessao_id: string;
  data_hora_inicio: string;
  data_hora_fim: string | null;
  treino_id: string;
  treino_nome_snapshot: string;
  sessao_exercicio_id: string;
  exercicio_ordem: number;
  exercicio_id: string;
  nome_snapshot: string;
  grupo_muscular_snapshot: string;
  equipamento_snapshot: string | null;
  tracking_type_snapshot: string | null;
  metodo: string;
  grupo_id: string | null;
  substituido_por_exercicio_id: string | null;
  nome_original_snapshot: string | null;
  substituicao_motivo: string | null;
  serie_id: string;
  serie_ordem: number;
  carga_kg: number | null;
  repeticoes: number | null;
  duracao_segundos: number | null;
  distancia_metros: number | null;
  intensidade: number | null;
  observacao: string | null;
}

/** Linha flat de um degrau (ordem ≥ 2), 1:1 com a query 2. */
export interface SegmentoExportRow {
  id: string;
  serie_id: string;
  ordem: number;
  carga_kg: number | null;
  repeticoes: number | null;
  descanso_segundos: number | null;
}

export interface SegmentoExport {
  id: string;
  ordem: number;
  carga_kg: number | null;
  repeticoes: number | null;
  descanso_segundos: number | null;
}

export interface SubstituicaoExport {
  exercicio_id: string;
  nome: string;
  motivo: string | null;
}

export interface SerieExport {
  id: string;
  ordem: number;
  carga_kg: number | null;
  repeticoes: number | null;
  duracao_s: number | null;
  distancia_m: number | null;
  intensidade: number | null;
  observacao: string | null;
  segmentos: SegmentoExport[];
}

export interface ExercicioExport {
  id: string;
  ordem: number;
  exercicio_id: string;
  nome: string;
  grupo_muscular: string;
  equipamento: string | null;
  tracking_type: string | null;
  metodo: string;
  grupo_id: string | null;
  substituicao: SubstituicaoExport | null;
  series: SerieExport[];
}

export interface SessaoExport {
  id: string;
  treino_id: string;
  treino: string;
  data_inicio: string;
  data_fim: string | null;
  exercicios: ExercicioExport[];
}

export interface HistoricoExportTree {
  sessoes: SessaoExport[];
}
