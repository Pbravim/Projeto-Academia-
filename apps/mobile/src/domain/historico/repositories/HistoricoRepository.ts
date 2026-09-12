export interface UltimaExecucaoValida {
  cargaKg: number;
  repeticoes: number;
  dataExecucao: string;
}

export interface ExecucaoExercicioSegmento {
  ordem: number;
  cargaKg: number;
  repeticoes: number;
  descansoSegundos: number | null;
}

export interface ExecucaoExercicioSerie {
  id: string;
  tipoSerie: 'valida' | 'aquecimento';
  cargaKg: number;
  repeticoes: number;
  observacao: string | null;
  ordem: number;
  segmentos?: ExecucaoExercicioSegmento[];
}

export interface ExecucaoExercicio {
  sessaoTreinoId: string;
  dataExecucao: string;
  nomeSnapshot: string;
  series: ExecucaoExercicioSerie[];
  substituiuExercicio?: { nomeOriginal: string; motivo: string | null } | null;
}

export interface HistoricoRepository {
  getUltimaExecucaoValida(exercicioId: string): Promise<UltimaExecucaoValida | null>;
  getUltimasExecucoesValidas(): Promise<Map<string, UltimaExecucaoValida>>;
  getHistoricoExercicio(exercicioId: string): Promise<ExecucaoExercicio[]>;
  getHistoricoExercicios(exercicioIds: string[]): Promise<Map<string, ExecucaoExercicio[]>>;
}
