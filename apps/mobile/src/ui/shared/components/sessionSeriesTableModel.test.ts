import { describe, expect, it } from 'vitest';

import {
  buildSessionTableRows,
  formatCarga,
  formatKgDelta,
  formatVolume,
} from './sessionSeriesTableModel';

const sessao = (id: string, sets: { cargaKg: number; repeticoes: number; muted?: boolean }[]) => ({
  id,
  dateLabel: '28/06',
  sets,
});

describe('formatCarga', () => {
  it('inteiro sem casas decimais', () => {
    expect(formatCarga(80)).toBe('80');
  });
  it('decimal com virgula pt-BR', () => {
    expect(formatCarga(82.5)).toBe('82,5');
  });
  it('preserva duas casas decimais quando necessario', () => {
    expect(formatCarga(81.25)).toBe('81,25');
  });
});

describe('formatVolume', () => {
  it('abaixo de 1000 kg mostra em kg', () => {
    expect(formatVolume(960)).toBe('960 kg');
  });
  it('a partir de 1000 kg mostra em toneladas com virgula', () => {
    expect(formatVolume(2400)).toBe('2,4 t');
  });
});

describe('formatKgDelta', () => {
  it('melhora: seta para cima com +', () => {
    expect(formatKgDelta(96, 100)).toEqual({ direction: 'up', label: '↑ +4 kg' });
  });
  it('piora: seta para baixo', () => {
    expect(formatKgDelta(100, 97.5)).toEqual({ direction: 'down', label: '↓ −2,5 kg' });
  });
  it('estavel: sem variacao', () => {
    expect(formatKgDelta(100, 100)).toEqual({ direction: 'flat', label: '→ estável' });
  });
});

describe('buildSessionTableRows', () => {
  it('formata cada set individualmente com carga e reps separados', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }, { cargaKg: 82.5, repeticoes: 8 }]),
    ]);
    expect(rows[0].sets.map((s) => `${s.cargaLabel}×${s.repsLabel}`)).toEqual(['80×10', '82,5×8']);
  });

  it('expoe a contagem de series validas da sessao', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }, { cargaKg: 82.5, repeticoes: 8 }]),
      sessao('s2', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s3', [{ cargaKg: 40, repeticoes: 15, muted: true }]),
    ]);
    expect(rows[0].setsCountLabel).toBe('2 séries');
    expect(rows[1].setsCountLabel).toBe('1 série');
    expect(rows[2].setsCountLabel).toBeNull();
  });

  it('marca como melhor apenas o set de maior 1RM estimado (uma unica marcacao)', () => {
    // 80×10 -> 1RM 106.7 ; 82.5×8 -> 1RM 104.5
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }, { cargaKg: 82.5, repeticoes: 8 }]),
    ]);
    expect(rows[0].sets.map((s) => s.isBest)).toEqual([true, false]);
  });

  it('em empate de 1RM marca apenas o primeiro', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }, { cargaKg: 80, repeticoes: 10 }]),
    ]);
    expect(rows[0].sets.map((s) => s.isBest)).toEqual([true, false]);
  });

  it('nao marca melhor set quando ha apenas um set valido', () => {
    const rows = buildSessionTableRows([sessao('s1', [{ cargaKg: 80, repeticoes: 10 }])]);
    expect(rows[0].sets[0].isBest).toBe(false);
  });

  it('calcula ormLabel a partir do melhor set valido', () => {
    // 80×10 -> 80 * (1 + 10/30) = 106.666... -> 106,7
    const rows = buildSessionTableRows([sessao('s1', [{ cargaKg: 80, repeticoes: 10 }])]);
    expect(rows[0].ormLabel).toBe('1RM ~106,7');
  });

  it('sets muted (aquecimento) nao contam para melhor/1RM/volume e mantem a flag', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [
        { cargaKg: 100, repeticoes: 15, muted: true }, // 1RM maior, mas aquecimento
        { cargaKg: 80, repeticoes: 10 },
      ]),
    ]);
    expect(rows[0].sets[0].muted).toBe(true);
    expect(rows[0].sets[0].isBest).toBe(false);
    expect(rows[0].ormLabel).toBe('1RM ~106,7');
    expect(rows[0].volumeLabel).toBe('800 kg');
  });

  it('ormLabel/volumeLabel nulos quando nao ha sets validos', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 40, repeticoes: 15, muted: true }]),
      sessao('s2', []),
    ]);
    expect(rows[0].ormLabel).toBeNull();
    expect(rows[0].volumeLabel).toBeNull();
    expect(rows[1].ormLabel).toBeNull();
  });

  it('trend compara com a sessao anterior (mais antiga, proxima na lista)', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 85, repeticoes: 10 }]), // mais recente, melhorou
      sessao('s2', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s3', [{ cargaKg: 82.5, repeticoes: 10 }]), // s2 piorou vs s3
    ]);
    expect(rows[0].trend).toBe('up');
    expect(rows[1].trend).toBe('down');
    expect(rows[2].trend).toBeNull(); // sem anterior
  });

  it('trend nulo quando igual ou sem dados', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s2', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s3', []),
    ]);
    expect(rows[0].trend).toBeNull(); // igual
    expect(rows[1].trend).toBeNull(); // anterior sem dados
  });

  it('marca apenas a primeira sessao como isLatest', () => {
    const rows = buildSessionTableRows([
      sessao('s1', [{ cargaKg: 80, repeticoes: 10 }]),
      sessao('s2', [{ cargaKg: 80, repeticoes: 10 }]),
    ]);
    expect(rows.map((r) => r.isLatest)).toEqual([true, false]);
  });

  it('propaga subLabel quando presente', () => {
    const rows = buildSessionTableRows([
      { id: 's1', dateLabel: '28/06', subLabel: 'Substituiu: Supino reto', sets: [] },
    ]);
    expect(rows[0].subLabel).toBe('Substituiu: Supino reto');
  });
});
