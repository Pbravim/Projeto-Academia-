import type { ExecucaoExercicio, ExecucaoExercicioSerie } from '../../../domain/historico/repositories/HistoricoRepository';
import { calcularE1RM } from '../../../domain/progressao/calcularE1RM';
import { detectarPRsDaSerie, ehSerieForcaValida, type SerieParaPR, type TipoPR, ultimosTopSets } from '../../../domain/progressao/personalRecords';
import type { AppLocale } from '../../shared/i18n';
import { translate } from '../../shared/i18n/core';
import { formatNumber } from '../../shared/i18n/formatters';

export interface ConquistaPR {
  serieId: string;
  tipo: TipoPR;
  label: string;
  value: string;
}
export interface ProgressaoExercicioViewModel {
  prs: ConquistaPR[];
  topSets: string[];
}
const TIPO_CHAVE = { carga: 'carga', 'reps@carga': 'reps', e1rm: 'e1rm' };

export function buildProgressaoExercicioViewModel(
  series: SerieParaPR[], historico: ExecucaoExercicio[], locale: AppLocale,
): ProgressaoExercicioViewModel {
  const prs: ConquistaPR[] = [];
  const anteriores = [...historico];
  const seriesDaSessao: ExecucaoExercicioSerie[] = [];
  for (const s of [...series].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))) {
    if (!ehSerieForcaValida(s)) continue;
    for (const tipo of detectarPRsDaSerie(s, anteriores)) {
      const value = tipo === 'reps@carga'
        ? translate(locale, 'progressao.repsValue', { reps: s.repeticoes, carga: formatNumber(s.cargaKg, locale) })
        : `${tipo === 'e1rm' && s.repeticoes > 12 ? '~' : ''}${formatNumber(tipo === 'carga' ? s.cargaKg : Math.round(calcularE1RM(s.cargaKg, s.repeticoes) * 10) / 10, locale)} kg`;
      prs.push({ serieId: s.id, tipo,
        label: translate(locale, 'progressao.setRecord', { ordem: s.ordem, tipo: translate(locale, `progressao.tipo.${TIPO_CHAVE[tipo]}`) }), value });
    }
    seriesDaSessao.push({ id: s.id, ordem: s.ordem, tipoSerie: 'valida', cargaKg: s.cargaKg, repeticoes: s.repeticoes, observacao: null });
    const atual: ExecucaoExercicio = { sessaoTreinoId: 'current', dataExecucao: '9999-01-01T00:00:00Z', nomeSnapshot: '', series: [...seriesDaSessao] };
    anteriores.splice(historico.length, anteriores.length, atual);
  }
  return {
    prs,
    topSets: ultimosTopSets(historico).map((s) => `${formatNumber(s.cargaKg, locale)} kg × ${s.repeticoes}`),
  };
}
