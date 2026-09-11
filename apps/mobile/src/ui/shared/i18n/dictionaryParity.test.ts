import { describe, expect, it } from 'vitest';

import { enUS } from './translations/en-US';
import { ptBR } from './translations/pt-BR';

function isPluralObject(value: object): boolean {
  return 'one' in value || 'other' in value;
}

function keyPaths(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' && !isPluralObject(v as object)
      ? keyPaths(v as object, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}

describe('paridade de dicionários', () => {
  it('toda chave en-US existe em pt-BR (pt-BR é a fonte da verdade)', () => {
    const pt = new Set(keyPaths(ptBR));
    const orphans = keyPaths(enUS).filter((k) => !pt.has(k));
    expect(orphans).toEqual([]);
  });

  it('reporta chaves pt-BR sem tradução en-US (cobertas por fallback)', () => {
    const en = new Set(keyPaths(enUS));
    const missing = keyPaths(ptBR).filter((k) => !en.has(k) && k !== 'common.onlyInPt');
    expect(missing).toEqual([]);
  });
});
