export interface SessaoComVolume {
  id: string;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  volumeTotal: number;
  melhorOrm: number;
  duracaoMin: number | null;
}

export interface EvolucaoPorTreino {
  treinoId: string;
  treinoNome: string;
  sessoes: SessaoComVolume[];
}

export interface RecordeItem {
  exercicioNome: string;
  melhorOrmKg: number;
}

export interface DashboardStats {
  totalSessoes: number;
  sessoesUltimoMes: number;
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
}
