import type { TreinoComUltimaSessao } from '../../dashboard/repositories/DashboardRepository';

/**
 * Porta de leitura que o SugerirTreinoUseCase realmente precisa: 2 métodos, não
 * os 7 do DashboardRepository.
 *
 * Resolve o TODO que vivia no use case ("considerar um SugestaoRepository
 * dedicado para reduzir acoplamento"). É segregação de interface, não uma
 * implementação nova: o SqliteDashboardRepository já satisfaz este contrato
 * estruturalmente, então nada muda no wiring nem em runtime.
 */
export interface SugestaoRepository {
  findTreinoComUltimaSessao(treinoId: string): Promise<TreinoComUltimaSessao | null>;
  findSugestaoRotacao(): Promise<TreinoComUltimaSessao | null>;
}
