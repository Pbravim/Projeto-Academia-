import type { SerieRegistradaPrimitives } from '../../../domain/sessoes/entities/SerieRegistrada';
import type { SessaoExercicioPrimitives } from '../../../domain/sessoes/entities/SessaoExercicio';
import type { MetodoExercicio } from '../../../domain/treinos/entities/TreinoExercicio';

export interface TemplateFromSessao {
  seriesRecomendadas: number | null;
  execucoesRecomendadas: number | null;
  duracaoRecomendadaSegundos: number | null;
  distanciaRecomendadaMetros: null;
  intensidadeRecomendada: null;
  cargaPadrao: null;
  tempoDescansoSegundos: number | null;
  metodo: MetodoExercicio;
  grupoId: string | null;
}

const TRACKING_TYPES_DURACAO = new Set(['cardio', 'hold']);

/**
 * Deriva os campos de recomendacao do TreinoExercicio a partir do SessaoExercicio e suas series.
 * Media (nao moda) porque com poucas series de reps distintas a moda e indefinida — o
 * arredondamento e o que a issue #33 pede (D3).
 */
export function templateFromSessao(
  sessaoExercicio: SessaoExercicioPrimitives,
  series: SerieRegistradaPrimitives[]
): TemplateFromSessao {
  const validas = series.filter((serie) => serie.tipoSerie === 'valida');
  const usaDuracao = TRACKING_TYPES_DURACAO.has(sessaoExercicio.trackingTypeSnapshot);

  return {
    seriesRecomendadas: validas.length > 0 ? validas.length : null,
    execucoesRecomendadas: usaDuracao ? null : mediaArredondada(validas.map((serie) => serie.repeticoes)),
    duracaoRecomendadaSegundos: usaDuracao ? mediaArredondada(validas.map((serie) => serie.duracaoSegundos)) : null,
    distanciaRecomendadaMetros: null,
    intensidadeRecomendada: null,
    cargaPadrao: null,
    tempoDescansoSegundos: sessaoExercicio.tempoDescansoSegundos,
    metodo: sessaoExercicio.metodo,
    grupoId: sessaoExercicio.grupoId,
  };
}

function mediaArredondada(valores: Array<number | null>): number | null {
  const numeros = valores.filter((valor): valor is number => valor !== null);
  if (numeros.length === 0) return null;
  const soma = numeros.reduce((acc, valor) => acc + valor, 0);
  return Math.round(soma / numeros.length);
}
