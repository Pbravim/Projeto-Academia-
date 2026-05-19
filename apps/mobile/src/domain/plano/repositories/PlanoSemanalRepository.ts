import type { DiaSemana } from '../entities/DiaSemana';

export type PlanoSemanal = Record<DiaSemana, string | null>;

export interface PlanoSemanalRepository {
  getPlano(): Promise<PlanoSemanal>;
  setDia(dia: DiaSemana, treinoId: string | null): Promise<void>;
}
