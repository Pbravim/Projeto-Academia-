import { describe, expect, it } from 'vitest';

import {
  formatDegrausStack,
  formatSerieMetric,
  mostraDescanso,
  precisaDegrauPrescrito,
  volumeComDegraus,
} from './segmentosPresentation';

describe('formatDegrausStack', () => {
  it('returns null when there are no segmentos', () => {
    expect(formatDegrausStack({ cargaKg: 60, repeticoes: 8 }, undefined)).toBeNull();
    expect(formatDegrausStack({ cargaKg: 60, repeticoes: 8 }, [])).toBeNull();
  });

  it('returns null when the série-mãe has no carga/reps', () => {
    expect(
      formatDegrausStack({ cargaKg: null, repeticoes: 8 }, [{ ordem: 2, cargaKg: 50, repeticoes: 6 }]),
    ).toBeNull();
  });

  it('formats the mãe followed by degraus sorted by ordem', () => {
    const result = formatDegrausStack(
      { cargaKg: 60, repeticoes: 8 },
      [
        { ordem: 3, cargaKg: 40, repeticoes: 7 },
        { ordem: 2, cargaKg: 50, repeticoes: 6 },
      ],
    );
    expect(result).toBe('60×8 → 50×6 → 40×7');
  });

  it('skips degraus with missing carga/reps', () => {
    const result = formatDegrausStack(
      { cargaKg: 60, repeticoes: 8 },
      [{ ordem: 2, cargaKg: null, repeticoes: null }],
    );
    expect(result).toBe('60×8');
  });
});

describe('precisaDegrauPrescrito', () => {
  it('is true only for drop_set and rest_pause', () => {
    expect(precisaDegrauPrescrito('drop_set')).toBe(true);
    expect(precisaDegrauPrescrito('rest_pause')).toBe(true);
    expect(precisaDegrauPrescrito('piramide')).toBe(false);
    expect(precisaDegrauPrescrito('normal')).toBe(false);
  });
});

describe('mostraDescanso', () => {
  it('is true only for rest_pause', () => {
    expect(mostraDescanso('rest_pause')).toBe(true);
    expect(mostraDescanso('drop_set')).toBe(false);
    expect(mostraDescanso('normal')).toBe(false);
  });
});

describe('volumeComDegraus', () => {
  it('sums the mãe volume with each degrau volume', () => {
    const volume = volumeComDegraus(
      { cargaKg: 60, repeticoes: 8 },
      [
        { ordem: 2, cargaKg: 50, repeticoes: 6 },
        { ordem: 3, cargaKg: 40, repeticoes: 7 },
      ],
    );
    expect(volume).toBe(60 * 8 + 50 * 6 + 40 * 7);
  });

  it('handles missing segmentos and null mãe values as zero', () => {
    expect(volumeComDegraus({ cargaKg: null, repeticoes: null }, undefined)).toBe(0);
  });
});

describe('formatSerieMetric', () => {
  const base = { cargaKg: null, repeticoes: null, duracaoSegundos: null, distanciaMetros: null, intensidade: null };

  it('formats reps_load as carga × reps', () => {
    expect(formatSerieMetric({ ...base, cargaKg: 60, repeticoes: 8 }, 'reps_load')).toBe('60 kg × 8');
  });

  it('formats cardio joining duration/distance/intensity', () => {
    expect(
      formatSerieMetric({ ...base, duracaoSegundos: 90, distanciaMetros: 500, intensidade: 7 }, 'cardio'),
    ).toBe('1:30 min · 500m · int. 7');
  });

  it('formats hold as duration only', () => {
    expect(formatSerieMetric({ ...base, duracaoSegundos: 30 }, 'hold')).toBe('30s');
  });

  it('formats reps_only as reps', () => {
    expect(formatSerieMetric({ ...base, repeticoes: 12 }, 'reps_only')).toBe('12 reps');
  });

  it('falls back to "-" when required fields are missing', () => {
    expect(formatSerieMetric(base, 'reps_load')).toBe('-');
    expect(formatSerieMetric(base, 'hold')).toBe('-');
    expect(formatSerieMetric(base, 'reps_only')).toBe('-');
  });
});
