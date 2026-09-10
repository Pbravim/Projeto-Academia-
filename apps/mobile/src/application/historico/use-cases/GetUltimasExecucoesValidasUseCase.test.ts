import { describe, expect, it } from 'vitest';

import type {
  HistoricoRepository,
  UltimaExecucaoValida,
} from '../../../domain/historico/repositories/HistoricoRepository';

import { GetUltimasExecucoesValidasUseCase } from './GetUltimasExecucoesValidasUseCase';

describe('GetUltimasExecucoesValidasUseCase', () => {
  it('delega ao repositório e retorna o mapa de últimas execuções', async () => {
    const esperado = new Map<string, UltimaExecucaoValida>([
      ['ex1', { cargaKg: 80, repeticoes: 8, dataExecucao: '2026-01-01T10:00:00Z' }],
    ]);
    let chamado = 0;
    const historicoRepository = {
      async getUltimasExecucoesValidas() {
        chamado += 1;
        return esperado;
      },
    } as unknown as HistoricoRepository;

    const useCase = new GetUltimasExecucoesValidasUseCase({ historicoRepository });
    const resultado = await useCase.execute();

    expect(chamado).toBe(1);
    expect(resultado).toBe(esperado);
    expect(resultado.get('ex1')?.cargaKg).toBe(80);
  });
});
