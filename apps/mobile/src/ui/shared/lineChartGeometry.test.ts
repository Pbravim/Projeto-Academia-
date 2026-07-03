import { describe, expect, it } from 'vitest';

import {
  CHART_PAD_V,
  buildChartGeometry,
  buildSmoothPath,
  lastMaxIndex,
  nearestDotIndex,
  selectXLabelIndexes,
} from './lineChartGeometry';

const fmt = (v: number) => `${v} kg`;

describe('buildChartGeometry', () => {
  it('retorna null com menos de 2 pontos', () => {
    expect(buildChartGeometry([], 300, 130, fmt)).toBeNull();
    expect(buildChartGeometry([{ value: 80, label: '01/06' }], 300, 130, fmt)).toBeNull();
  });

  it('posiciona pontos: menor valor embaixo, maior em cima, x distribuido', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 100, label: 'b' }],
      300, 130, fmt,
    )!;
    const plotH = 130 - CHART_PAD_V * 2;
    expect(geo.dots).toHaveLength(2);
    expect(geo.dots[0].x).toBe(0);
    expect(geo.dots[1].x).toBe(300);
    expect(geo.dots[0].y).toBeCloseTo(CHART_PAD_V + plotH); // min -> bottom
    expect(geo.dots[1].y).toBeCloseTo(CHART_PAD_V);          // max -> top
  });

  it('gera labels Y min/mid/max formatados', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 100, label: 'b' }],
      300, 130, fmt,
    )!;
    expect(geo.yLabels.map((l) => l.text)).toEqual(['100 kg', '90 kg', '80 kg']);
  });

  it('gera um unico label Y quando todos os valores sao iguais', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 80, label: 'b' }],
      300, 130, fmt,
    )!;
    expect(geo.yLabels).toHaveLength(1);
    expect(geo.yLabels[0].text).toBe('80 kg');
  });

  it('areaPath fecha o caminho ate a base (termina em Z)', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 100, label: 'b' }],
      300, 130, fmt,
    )!;
    expect(geo.areaPath.startsWith('M')).toBe(true);
    expect(geo.areaPath.trim().endsWith('Z')).toBe(true);
  });

  it('gridYs tem 3 linhas dentro da area de plot', () => {
    const geo = buildChartGeometry(
      [{ value: 80, label: 'a' }, { value: 100, label: 'b' }],
      300, 130, fmt,
    )!;
    expect(geo.gridYs).toHaveLength(3);
    for (const y of geo.gridYs) {
      expect(y).toBeGreaterThanOrEqual(CHART_PAD_V);
      expect(y).toBeLessThanOrEqual(130 - CHART_PAD_V);
    }
  });

  it('maxIndex aponta para o ponto de maior valor (mais recente em empate)', () => {
    const geo = buildChartGeometry(
      [{ value: 100, label: 'a' }, { value: 90, label: 'b' }, { value: 100, label: 'c' }],
      300, 130, fmt,
    )!;
    expect(geo.maxIndex).toBe(2);
  });
});

describe('selectXLabelIndexes', () => {
  const pts = (n: number) => Array.from({ length: n }, (_, i) => ({ value: i, label: `p${i}` }));

  it('ate 5 pontos: todos os indices', () => {
    expect(selectXLabelIndexes(pts(3))).toEqual([0, 1, 2]);
    expect(selectXLabelIndexes(pts(5))).toEqual([0, 1, 2, 3, 4]);
  });

  it('mais de 5 pontos: primeiro, meio e ultimo', () => {
    expect(selectXLabelIndexes(pts(6))).toEqual([0, 2, 5]);
    expect(selectXLabelIndexes(pts(10))).toEqual([0, 4, 9]);
  });
});

describe('lastMaxIndex', () => {
  it('retorna o indice do maior valor', () => {
    expect(lastMaxIndex([1, 5, 3])).toBe(1);
  });
  it('em empate retorna o mais recente (maior indice)', () => {
    expect(lastMaxIndex([5, 3, 5])).toBe(2);
  });
});

describe('nearestDotIndex', () => {
  const dots = [{ x: 0 }, { x: 100 }, { x: 200 }];
  it('retorna o ponto mais proximo do x informado', () => {
    expect(nearestDotIndex(dots, 10)).toBe(0);
    expect(nearestDotIndex(dots, 140)).toBe(1);
    expect(nearestDotIndex(dots, 199)).toBe(2);
  });
});

describe('buildSmoothPath', () => {
  it('comeca com M no primeiro ponto e tem um comando C por segmento', () => {
    const d = buildSmoothPath([{ x: 0, y: 100 }, { x: 100, y: 50 }, { x: 200, y: 80 }]);
    expect(d.startsWith('M 0 100')).toBe(true);
    expect(d.match(/C /g)).toHaveLength(2);
  });

  it('termina exatamente no ultimo ponto', () => {
    const d = buildSmoothPath([{ x: 0, y: 100 }, { x: 100, y: 50 }]);
    expect(d.trim().endsWith('100 50')).toBe(true);
  });

  it('nao ultrapassa os limites Y de cada segmento (sem overshoot)', () => {
    // dados estritamente decrescentes em y (subida no grafico)
    const d = buildSmoothPath([{ x: 0, y: 90 }, { x: 100, y: 60 }, { x: 200, y: 30 }]);
    // extrai todos os numeros dos comandos C: [c1x, c1y, c2x, c2y, x, y] por segmento
    const nums = d
      .split('C ')
      .slice(1)
      .map((seg) => seg.replace(/,/g, '').trim().split(/\s+/).map(Number));
    // segmento 1: y entre 60 e 90; segmento 2: y entre 30 e 60
    const [s1, s2] = nums;
    expect(s1[1]).toBeGreaterThanOrEqual(60);
    expect(s1[1]).toBeLessThanOrEqual(90);
    expect(s1[3]).toBeGreaterThanOrEqual(60);
    expect(s1[3]).toBeLessThanOrEqual(90);
    expect(s2[1]).toBeGreaterThanOrEqual(30);
    expect(s2[1]).toBeLessThanOrEqual(60);
    expect(s2[3]).toBeGreaterThanOrEqual(30);
    expect(s2[3]).toBeLessThanOrEqual(60);
  });
});
