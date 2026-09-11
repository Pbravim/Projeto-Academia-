import { describe, expect, it, vi } from 'vitest';

import { translate } from './index';

vi.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'pt-BR' }],
}));

// index.tsx imports the databaseClient singleton, which pulls in expo-sqlite.
// expo-sqlite's implementation imports react-native (Flow syntax) which vitest's
// esbuild/rolldown transform can't parse under the node test environment.
// translate() never touches the database, so a stub is safe here.
vi.mock('expo-sqlite', () => ({}));

describe('i18n translate', () => {
  it('resolve chave em pt-BR', () => {
    expect(translate('pt-BR', 'common.cancel')).toBe('Cancelar');
  });
  it('resolve chave em en-US', () => {
    expect(translate('en-US', 'common.cancel')).toBe('Cancel');
  });
  it('interpola variáveis', () => {
    expect(translate('pt-BR', 'common.seriesCount', { count: 3 })).toBe('3 séries');
    expect(translate('pt-BR', 'common.seriesCount', { count: 1 })).toBe('1 série');
  });
  it('en-US cai para pt-BR quando a chave não existe', () => {
    expect(translate('en-US', 'common.onlyInPt')).toBe('só em pt');
  });
});
