export interface UltimaExecucaoValida {
  cargaKg: number;
  repeticoes: number;
  dataExecucao: string;
}

export interface ExecucaoExercicioSerie {
  id: string;
  tipoSerie: 'aquecimento' | 'valida';
  cargaKg: number;
  repeticoes: number;
  observacao: string | null;
  ordem: number;
}

export interface ExecucaoExercicio {
  sessaoTreinoId: string;
  dataExecucao: string;
  nomeSnapshot: string;
  series: ExecucaoExercicioSerie[];
}

export interface HistoricoRepository {
  getUltimaExecucaoValida(exercicioId: string): Promise<UltimaExecucaoValida | null>;
  getHistoricoExercicio(exercicioId: string): Promise<ExecucaoExercicio[]>;
}
