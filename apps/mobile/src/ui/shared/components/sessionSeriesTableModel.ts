import { calcularEstimativa1rm } from '../../../shared/utils/estimativa1rm';

export interface SessionTableInputSet {
  cargaKg: number;
  repeticoes: number;
  /** Ex.: aquecimento — exibido esmaecido e fora de melhor set/1RM/volume. */
  muted?: boolean;
}

export interface SessionTableInputSession {
  id: string;
  dateLabel: string;
  subLabel?: string | null;
  sets: SessionTableInputSet[];
}

export interface SessionTableSetVM {
  /** Carga formatada, sem unidade (ex.: "82,5"). */
  cargaLabel: string;
  /** Repeticoes (ex.: "8"). */
  repsLabel: string;
  isBest: boolean;
  muted: boolean;
}

export interface SessionTableRowVM {
  id: string;
  dateLabel: string;
  subLabel: string | null;
  sets: SessionTableSetVM[];
  setsCountLabel: string | null;
  ormLabel: string | null;
  volumeLabel: string | null;
  trend: 'up' | 'down' | null;
  isLatest: boolean;
}

export function formatCarga(kg: number): string {
  if (kg % 1 === 0) return String(kg);
  const oneDecimal = Math.round(kg * 10) / 10;
  return (oneDecimal === kg ? kg.toFixed(1) : kg.toFixed(2)).replace('.', ',');
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace('.', ',')} t`;
  return `${formatCarga(kg)} kg`;
}

export function formatKgDelta(
  first: number,
  last: number,
): { direction: 'up' | 'down' | 'flat'; label: string } {
  const diff = Math.round((last - first) * 10) / 10;
  if (diff > 0) return { direction: 'up', label: `↑ +${formatCarga(diff)} kg` };
  if (diff < 0) return { direction: 'down', label: `↓ −${formatCarga(Math.abs(diff))} kg` };
  return { direction: 'flat', label: '→ estável' };
}

/** Sessoes em ordem: mais recente primeiro. `trend` compara com a proxima da lista (mais antiga). */
export function buildSessionTableRows(sessions: SessionTableInputSession[]): SessionTableRowVM[] {
  const bestOrms = sessions.map((s) =>
    s.sets
      .filter((x) => !x.muted)
      .reduce((max, x) => Math.max(max, calcularEstimativa1rm(x.cargaKg, x.repeticoes)), 0),
  );

  return sessions.map((s, i) => {
    const valid = s.sets.filter((x) => !x.muted);
    const best = bestOrms[i];

    let bestMarked = false;
    const sets = s.sets.map((x) => {
      const isBest =
        !x.muted &&
        valid.length > 1 &&
        !bestMarked &&
        calcularEstimativa1rm(x.cargaKg, x.repeticoes) === best;
      if (isBest) bestMarked = true;
      return {
        cargaLabel: formatCarga(x.cargaKg),
        repsLabel: String(x.repeticoes),
        isBest,
        muted: x.muted ?? false,
      };
    });

    const volume = valid.reduce((acc, x) => acc + x.cargaKg * x.repeticoes, 0);
    const prevBest = bestOrms[i + 1];
    const trend =
      prevBest == null || prevBest === 0 || best === 0
        ? null
        : best > prevBest ? 'up' : best < prevBest ? 'down' : null;

    return {
      id: s.id,
      dateLabel: s.dateLabel,
      subLabel: s.subLabel ?? null,
      sets,
      setsCountLabel: valid.length > 0 ? `${valid.length} série${valid.length !== 1 ? 's' : ''}` : null,
      ormLabel: best > 0 ? `1RM ~${formatCarga(Math.round(best * 10) / 10)}` : null,
      volumeLabel: valid.length > 0 ? formatVolume(volume) : null,
      trend,
      isLatest: i === 0,
    };
  });
}
