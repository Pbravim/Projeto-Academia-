import type { SerieComSegmentos,SessaoDetalhe } from '../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import type { ExecucaoExercicio } from '../domain/historico/repositories/HistoricoRepository';

export function progressaoSerie(extra: Partial<SerieComSegmentos> = {}): SerieComSegmentos {
  return { id: 'new', sessaoExercicioId: 'se', tipoSerie: 'valida', ordem: 1,
    cargaKg: 65, repeticoes: 6, observacao: null, duracaoSegundos: null, distanciaMetros: null, intensidade: null, ...extra };
}

export function progressaoExecucao(extra: Partial<ExecucaoExercicio> = {}): ExecucaoExercicio {
  return { sessaoTreinoId: 'old', dataExecucao: '2026-10-01T10:00:00Z', nomeSnapshot: 'Supino',
    series: [{ id: 'old-set', ordem: 1, tipoSerie: 'valida', cargaKg: 60, repeticoes: 6, observacao: null }], ...extra };
}

export function progressaoDetalhe(series: SerieComSegmentos[] = [progressaoSerie()]): SessaoDetalhe {
  return {
    sessao: { id: 'current', treinoId: null, treinoNomeSnapshot: 'Treino livre',
      dataHoraInicio: '2026-10-24T10:00:00Z', dataHoraFim: null, status: 'em_andamento' },
    exercicios: [{ mediaLocal: null, mediaOnline: null, series,
      sessaoExercicio: {
        id: 'se', sessaoTreinoId: 'current', exercicioId: 'exercise', ordem: 1, nomeSnapshot: 'Supino',
        grupoMuscularSnapshot: 'Peito', categoriaSnapshot: 'Composto', equipamentoSnapshot: null,
        musculoAlvoSnapshot: [], movementPatternSnapshot: null, realizado: false,
        seriesRecomendadas: null, execucoesRecomendadas: null, cargaPadrao: null, tempoDescansoSegundos: null,
        metodo: 'normal', grupoId: null, trackingTypeSnapshot: 'reps_load',
        duracaoRecomendadaSegundos: null, distanciaRecomendadaMetros: null, intensidadeRecomendada: null,
        substituidoPorExercicioId: null, substituicaoMotivo: null, nomeOriginalSnapshot: null,
      },
    }],
  };
}
