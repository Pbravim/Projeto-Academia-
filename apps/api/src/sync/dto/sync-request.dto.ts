import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDefined, IsISO8601, IsInt, IsNumber, IsObject,
  IsOptional, IsString, MaxLength, ValidateNested,
} from 'class-validator';
import type {
  ExerciseSyncRow, TreinoSyncRow, TreinoExercicioSyncRow, SessaoTreinoSyncRow,
  SessaoExercicioSyncRow, SerieRegistradaSyncRow, RegistroPesoSyncRow,
  UserSettingSyncRow, ExerciseAlternativeSyncRow, SyncChanges, SyncRequest,
} from '@academia/contracts';

// Wire DTOs for POST /sync. Same shape as the @academia/contracts interfaces, but as
// classes so the global ValidationPipe (whitelist+transform) actually validates the body
// and strips server-managed fields (dirty, serverUpdatedAt, userId) sent by a client.
// MaxLength on free-text mirrors the mobile input limits, generously.

const TEXT_MAX = 10_000;

export class ExerciseSyncRowDto implements ExerciseSyncRow {
  @IsString() @MaxLength(255)
  id: string;

  @IsISO8601()
  updatedAt: string;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;

  @IsString() @MaxLength(255)
  name: string;

  @IsString() @MaxLength(255)
  normalizedName: string;

  @IsString() @MaxLength(255)
  groupMuscle: string;

  @IsString() @MaxLength(255)
  category: string;

  @IsOptional() @IsString() @MaxLength(255)
  equipment: string | null;

  @IsString() @MaxLength(50)
  loadUnit: string;

  @IsBoolean()
  isCustom: boolean;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  mediaOnline: string | null;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  mediaLocal: string | null;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  musculoAlvo: string | null;

  @IsOptional() @IsString() @MaxLength(255)
  movementPattern: string | null;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  stabilizers: string | null;

  @IsOptional() @IsString() @MaxLength(255)
  executionType: string | null;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  nameVariations: string | null;

  @IsOptional() @IsString() @MaxLength(255)
  primaryEquipment: string | null;

  @IsOptional() @IsString() @MaxLength(255)
  secondaryEquipment: string | null;

  @IsInt()
  catalogVersion: number;

  @IsOptional() @IsString() @MaxLength(50)
  trackingType: string | null;

  @IsISO8601()
  createdAt: string;
}

export class TreinoSyncRowDto implements TreinoSyncRow {
  @IsString() @MaxLength(255)
  id: string;

  @IsISO8601()
  updatedAt: string;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;

  @IsString() @MaxLength(255)
  name: string;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  objetivo: string | null;

  @IsISO8601()
  createdAt: string;
}

export class TreinoExercicioSyncRowDto implements TreinoExercicioSyncRow {
  @IsString() @MaxLength(255)
  id: string;

  @IsISO8601()
  updatedAt: string;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;

  @IsString() @MaxLength(255)
  treinoId: string;

  @IsString() @MaxLength(255)
  exercicioId: string;

  @IsInt()
  ordem: number;

  @IsOptional() @IsInt()
  seriesRecomendadas: number | null;

  @IsOptional() @IsInt()
  execucoesRecomendadas: number | null;

  @IsOptional() @IsNumber()
  cargaPadrao: number | null;

  @IsOptional() @IsInt()
  tempoDescansoSegundos: number | null;

  @IsString() @MaxLength(50)
  metodo: string;

  @IsOptional() @IsString() @MaxLength(255)
  grupoId: string | null;

  @IsOptional() @IsInt()
  duracaoRecomendadaSegundos: number | null;

  @IsOptional() @IsNumber()
  distanciaRecomendadaMetros: number | null;

  @IsOptional() @IsNumber()
  intensidadeRecomendada: number | null;
}

export class SessaoTreinoSyncRowDto implements SessaoTreinoSyncRow {
  @IsString() @MaxLength(255)
  id: string;

  @IsISO8601()
  updatedAt: string;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;

  @IsString() @MaxLength(255)
  treinoId: string;

  @IsString() @MaxLength(255)
  treinoNomeSnapshot: string;

  @IsISO8601()
  dataHoraInicio: string;

  @IsOptional() @IsISO8601()
  dataHoraFim: string | null;

  @IsString() @MaxLength(50)
  status: string;

  @IsBoolean()
  arquivado: boolean;

  @IsISO8601()
  createdAt: string;
}

export class SessaoExercicioSyncRowDto implements SessaoExercicioSyncRow {
  @IsString() @MaxLength(255)
  id: string;

  @IsISO8601()
  updatedAt: string;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;

  @IsString() @MaxLength(255)
  sessaoTreinoId: string;

  @IsString() @MaxLength(255)
  exercicioId: string;

  @IsInt()
  ordem: number;

  @IsString() @MaxLength(255)
  nomeSnapshot: string;

  @IsString() @MaxLength(255)
  grupoMuscularSnapshot: string;

  @IsString() @MaxLength(255)
  categoriaSnapshot: string;

  @IsOptional() @IsString() @MaxLength(255)
  equipamentoSnapshot: string | null;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  musculoAlvoSnapshot: string | null;

  @IsOptional() @IsString() @MaxLength(255)
  nomeOriginalSnapshot: string | null;

  @IsOptional() @IsString() @MaxLength(255)
  movementPatternSnapshot: string | null;

  @IsBoolean()
  realizado: boolean;

  @IsOptional() @IsInt()
  seriesRecomendadas: number | null;

  @IsOptional() @IsInt()
  execucoesRecomendadas: number | null;

  @IsOptional() @IsNumber()
  cargaPadrao: number | null;

  @IsOptional() @IsInt()
  tempoDescansoSegundos: number | null;

  @IsString() @MaxLength(50)
  metodo: string;

  @IsOptional() @IsString() @MaxLength(255)
  grupoId: string | null;

  @IsOptional() @IsString() @MaxLength(255)
  substituidoPorExercicioId: string | null;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  substituicaoMotivo: string | null;

  @IsOptional() @IsString() @MaxLength(50)
  trackingTypeSnapshot: string | null;

  @IsOptional() @IsInt()
  duracaoRecomendadaSegundos: number | null;

  @IsOptional() @IsNumber()
  distanciaRecomendadaMetros: number | null;

  @IsOptional() @IsNumber()
  intensidadeRecomendada: number | null;

  @IsISO8601()
  createdAt: string;
}

export class SerieRegistradaSyncRowDto implements SerieRegistradaSyncRow {
  @IsString() @MaxLength(255)
  id: string;

  @IsISO8601()
  updatedAt: string;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;

  @IsString() @MaxLength(255)
  sessaoExercicioId: string;

  @IsString() @MaxLength(50)
  tipoSerie: string;

  @IsInt()
  ordem: number;

  @IsOptional() @IsNumber()
  cargaKg: number | null;

  @IsOptional() @IsInt()
  repeticoes: number | null;

  @IsOptional() @IsInt()
  duracaoSegundos: number | null;

  @IsOptional() @IsNumber()
  distanciaMetros: number | null;

  @IsOptional() @IsNumber()
  intensidade: number | null;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  observacao: string | null;

  @IsISO8601()
  createdAt: string;
}

export class RegistroPesoSyncRowDto implements RegistroPesoSyncRow {
  @IsString() @MaxLength(255)
  id: string;

  @IsISO8601()
  updatedAt: string;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;

  @IsNumber()
  pesoKg: number;

  @IsISO8601()
  dataRegistro: string;

  @IsOptional() @IsString() @MaxLength(TEXT_MAX)
  observacao: string | null;

  @IsISO8601()
  createdAt: string;
}

export class UserSettingSyncRowDto implements UserSettingSyncRow {
  @IsString() @MaxLength(255)
  key: string;

  @IsString() @MaxLength(TEXT_MAX)
  value: string;

  @IsOptional() @IsISO8601()
  updatedAt: string | null;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;
}

export class ExerciseAlternativeSyncRowDto implements ExerciseAlternativeSyncRow {
  @IsString() @MaxLength(255)
  exercicioId: string;

  @IsString() @MaxLength(255)
  alternativaId: string;

  @IsOptional() @IsISO8601()
  updatedAt: string | null;

  @IsOptional() @IsISO8601()
  deletedAt: string | null;
}

export class SyncChangesDto implements SyncChanges {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ExerciseSyncRowDto)
  exercises: ExerciseSyncRowDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => TreinoSyncRowDto)
  treinos: TreinoSyncRowDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => TreinoExercicioSyncRowDto)
  treinoExercicios: TreinoExercicioSyncRowDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => SessaoTreinoSyncRowDto)
  sessaoTreinos: SessaoTreinoSyncRowDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => SessaoExercicioSyncRowDto)
  sessaoExercicios: SessaoExercicioSyncRowDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => SerieRegistradaSyncRowDto)
  seriesRegistradas: SerieRegistradaSyncRowDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => RegistroPesoSyncRowDto)
  registrosPeso: RegistroPesoSyncRowDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => UserSettingSyncRowDto)
  userSettings: UserSettingSyncRowDto[];

  // @IsOptional: clientes anteriores a este campo não o enviam.
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ExerciseAlternativeSyncRowDto)
  exerciseAlternatives: ExerciseAlternativeSyncRowDto[];
}

export class SyncRequestDto implements SyncRequest {
  @IsOptional() @IsISO8601()
  since: string | null;

  @IsDefined() @IsObject() @ValidateNested() @Type(() => SyncChangesDto)
  changes: SyncChangesDto;
}
