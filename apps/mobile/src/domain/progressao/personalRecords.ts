import type { ExecucaoExercicio } from '../historico/repositories/HistoricoRepository';

import { calcularE1RM } from './calcularE1RM';

export type TipoPR = 'carga' | 'reps@carga' | 'e1rm';
export interface SerieParaPR {
  id: string;
  tipoSerie: string;
  cargaKg: number | null;
  repeticoes: number | null;
  ordem: number;
  segmentos?: { cargaKg: number | null; repeticoes: number | null }[];
}
export interface TopSet {
  serieId: string;
  sessaoTreinoId: string;
  dataExecucao: string;
  cargaKg: number;
  repeticoes: number;
  e1rm: number;
}
export interface PersonalRecords {
  prCarga: number | null;
  prE1RM: number | null;
  prRepsPorCarga: Map<number, number>;
  prVolumeSessao: number | null;
  melhorSerie: TopSet | null;
}

export function ehSerieForcaValida(s: SerieParaPR): s is SerieParaPR & { cargaKg: number; repeticoes: number } {
  return s.tipoSerie === 'valida' && metricasValidas(s);
}

function metricasValidas(s: { cargaKg: number | null; repeticoes: number | null }): s is { cargaKg: number; repeticoes: number } {
  return s.cargaKg !== null && s.repeticoes !== null && Number.isFinite(s.cargaKg)
    && s.cargaKg >= 0 && Number.isInteger(s.repeticoes) && s.repeticoes > 0;
}

function volumeDaSerie(s: SerieParaPR & { cargaKg: number; repeticoes: number }): number {
  return s.cargaKg * s.repeticoes + (s.segmentos ?? []).reduce((total, segmento) =>
    total + (metricasValidas(segmento) ? segmento.cargaKg * segmento.repeticoes : 0), 0);
}

export function melhorTopSet(execucao: ExecucaoExercicio): TopSet | null {
  let best: TopSet | null = null;
  for (const s of execucao.series.filter(ehSerieForcaValida)) {
    const e1rm = calcularE1RM(s.cargaKg, s.repeticoes);
    if (best === null || e1rm > best.e1rm) {
      best = { serieId: s.id, sessaoTreinoId: execucao.sessaoTreinoId,
        dataExecucao: execucao.dataExecucao, cargaKg: s.cargaKg, repeticoes: s.repeticoes, e1rm };
    }
  }
  return best;
}

/** Merge repeated exercise entries in one session; never count a set twice. */
function sessoesDistintas(historico: ExecucaoExercicio[], ate?: Date): ExecucaoExercicio[] {
  const sessoes = new Map<string, ExecucaoExercicio>();
  for (const execucao of historico) {
    const timestamp = Date.parse(execucao.dataExecucao);
    if (!Number.isFinite(timestamp) || (ate && timestamp > ate.getTime())) continue;
    const anterior = sessoes.get(execucao.sessaoTreinoId);
    const series = new Map((anterior?.series ?? []).map((s) => [s.id, s]));
    for (const s of execucao.series) series.set(s.id, s);
    sessoes.set(execucao.sessaoTreinoId, { ...execucao, series: [...series.values()] });
  }
  return [...sessoes.values()];
}

export function calcularPRs(historico: ExecucaoExercicio[], ate?: Date): PersonalRecords {
  const result: PersonalRecords = {
    prCarga: null, prE1RM: null, prRepsPorCarga: new Map(), prVolumeSessao: null, melhorSerie: null,
  };
  for (const execucao of sessoesDistintas(historico, ate)) {
    const validas = execucao.series.filter(ehSerieForcaValida);
    if (validas.length === 0) continue;
    let volume = 0;
    for (const s of validas) {
      result.prCarga = Math.max(result.prCarga ?? 0, s.cargaKg);
      result.prRepsPorCarga.set(s.cargaKg, Math.max(result.prRepsPorCarga.get(s.cargaKg) ?? 0, s.repeticoes));
      volume += volumeDaSerie(s);
    }
    result.prVolumeSessao = Math.max(result.prVolumeSessao ?? 0, volume);
    const top = melhorTopSet(execucao)!;
    if (result.melhorSerie === null || top.e1rm > result.melhorSerie.e1rm) result.melhorSerie = top;
  }
  result.prE1RM = result.melhorSerie?.e1rm ?? null;
  return result;
}

export function detectarPRsDaSerie(serie: SerieParaPR, historicoAnterior: ExecucaoExercicio[]): TipoPR[] {
  if (!ehSerieForcaValida(serie)) return [];
  const records = calcularPRs(historicoAnterior);
  const result: TipoPR[] = [];
  if (records.prCarga !== null && serie.cargaKg > records.prCarga) result.push('carga');
  const reps = records.prRepsPorCarga.get(serie.cargaKg);
  if (reps !== undefined && serie.repeticoes > reps) result.push('reps@carga');
  if (records.prE1RM !== null && calcularE1RM(serie.cargaKg, serie.repeticoes) > records.prE1RM) result.push('e1rm');
  return result;
}

export function ultimosTopSets(historico: ExecucaoExercicio[]): TopSet[] {
  return sessoesDistintas(historico)
    .sort((a, b) => Date.parse(b.dataExecucao) - Date.parse(a.dataExecucao)
      || b.sessaoTreinoId.localeCompare(a.sessaoTreinoId))
    .map(melhorTopSet).filter((s): s is TopSet => s !== null).slice(0, 2);
}
