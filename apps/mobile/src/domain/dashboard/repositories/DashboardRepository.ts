export interface SessaoComVolume {
  id: string;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  volumeTotal: number;
  melhorOrm: number;
  duracaoMin: number | null;
  arquivado: boolean;
}

export interface EvolucaoPorTreino {
  treinoId: string;
  treinoNome: string;
  sessoes: SessaoComVolume[];
  sessoesArquivadas: SessaoComVolume[];
}

export interface RecordeItem {
  exercicioNome: string;
  melhorOrmKg: number;
}

export interface DiaAderencia {
  label: string;
  totalSessoes: number;
  isToday: boolean;
}

export interface DashboardStats {
  totalSessoes: number;
  sessoesUltimoMes: number;
  aderenciaSemanal: DiaAderencia[];  // 7 dias da semana atual
  aderenciaMensal: DiaAderencia[];   // dias do mês atual
  aderenciaAnual: DiaAderencia[];    // 12 meses do ano atual
  evolucaoPorTreino: EvolucaoPorTreino[];
  recordesPessoais: RecordeItem[];
}

export interface SerieEvolucao {
  cargaKg: number;
  repeticoes: number;
}

export interface SessaoExercicioEvolucao {
  sessaoId: string;
  dataHoraInicio: string;
  melhorOrm: number;
  series: SerieEvolucao[];
}

export interface ExercicioEvolucao {
  exercicioId: string;
  exercicioNome: string;
  groupMuscle: string;
  sessoes: SessaoExercicioEvolucao[];
}

export interface DashboardRepository {
  getStats(): Promise<DashboardStats>;
  getEvolucaoExercicios(treinoId: string): Promise<ExercicioEvolucao[]>;
  arquivarSessao(sessaoId: string): Promise<void>;
  desarquivarSessao(sessaoId: string): Promise<void>;
  deletarSessao(sessaoId: string): Promise<void>;
}
