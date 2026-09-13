export interface SyncRow {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExerciseSyncRow extends SyncRow {
  name: string;
  normalizedName: string;
  groupMuscle: string;
  category: string;
  equipment: string | null;
  loadUnit: string;
  isCustom: boolean;
  mediaOnline: string | null;
  mediaLocal: string | null;
  musculoAlvo: string | null;
  // Biomechanical fields (mobile v17/v20). Carried as raw column values to match the
  // mobile SQLite storage: JSON-encoded arrays (stabilizers, nameVariations) and plain
  // TEXT for the rest. The wire treats them as opaque strings — no parsing in the sync path.
  movementPattern: string | null;
  stabilizers: string | null;
  executionType: string | null;
  nameVariations: string | null;
  primaryEquipment: string | null;
  secondaryEquipment: string | null;
  catalogVersion: number;
  trackingType: string | null;
  createdAt: string;
}

export interface TreinoSyncRow extends SyncRow {
  name: string;
  objetivo: string | null;
  createdAt: string;
}

export interface TreinoExercicioSyncRow extends SyncRow {
  treinoId: string;
  exercicioId: string;
  ordem: number;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  metodo: string;
  grupoId: string | null;
  duracaoRecomendadaSegundos: number | null;
  distanciaRecomendadaMetros: number | null;
  intensidadeRecomendada: number | null;
}

export interface SessaoTreinoSyncRow extends SyncRow {
  treinoId: string;
  treinoNomeSnapshot: string;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  status: string;
  arquivado: boolean;
  createdAt: string;
}

export interface SessaoExercicioSyncRow extends SyncRow {
  sessaoTreinoId: string;
  exercicioId: string;
  ordem: number;
  nomeSnapshot: string;
  grupoMuscularSnapshot: string;
  categoriaSnapshot: string;
  equipamentoSnapshot: string | null;
  musculoAlvoSnapshot: string | null;
  nomeOriginalSnapshot: string | null;
  movementPatternSnapshot: string | null;
  realizado: boolean;
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  cargaPadrao: number | null;
  tempoDescansoSegundos: number | null;
  metodo: string;
  grupoId: string | null;
  substituidoPorExercicioId: string | null;
  substituicaoMotivo: string | null;
  trackingTypeSnapshot: string | null;
  duracaoRecomendadaSegundos: number | null;
  distanciaRecomendadaMetros: number | null;
  intensidadeRecomendada: number | null;
  createdAt: string;
}

export interface SerieRegistradaSyncRow extends SyncRow {
  sessaoExercicioId: string;
  tipoSerie: string;
  ordem: number;
  cargaKg: number | null;
  repeticoes: number | null;
  duracaoSegundos: number | null;
  distanciaMetros: number | null;
  intensidade: number | null;
  observacao: string | null;
  createdAt: string;
}

export interface SerieSegmentoSyncRow extends SyncRow {
  serieId: string;
  ordem: number;
  cargaKg: number | null;
  repeticoes: number | null;
  descansoSegundos: number | null;
  createdAt: string;
}

export interface RegistroPesoSyncRow extends SyncRow {
  pesoKg: number;
  dataRegistro: string;
  observacao: string | null;
  createdAt: string;
}

export interface UserSettingSyncRow {
  key: string;
  value: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

/** Vínculo manual de alternativa entre exercícios (PK composta, sem id próprio). */
export interface ExerciseAlternativeSyncRow {
  exercicioId: string;
  alternativaId: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface SyncChanges {
  exercises: ExerciseSyncRow[];
  treinos: TreinoSyncRow[];
  treinoExercicios: TreinoExercicioSyncRow[];
  sessaoTreinos: SessaoTreinoSyncRow[];
  sessaoExercicios: SessaoExercicioSyncRow[];
  seriesRegistradas: SerieRegistradaSyncRow[];
  serieSegmentos: SerieSegmentoSyncRow[];
  registrosPeso: RegistroPesoSyncRow[];
  userSettings: UserSettingSyncRow[];
  exerciseAlternatives: ExerciseAlternativeSyncRow[];
}

export interface SyncRequest {
  since: string | null;
  changes: SyncChanges;
}

export interface SyncResponse {
  serverChanges: SyncChanges;
  newCursor: string;
}
