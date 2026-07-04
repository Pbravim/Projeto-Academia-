import { vi } from 'vitest';

// usePesoController now imports useLocale from shared/i18n, whose index.tsx pulls in
// the databaseClient singleton (expo-sqlite -> react-native, which uses Flow syntax
// vitest's transform can't parse). parsePesoInput never touches locale or the
// database, so stubbing both native modules is safe here.
vi.mock('expo-sqlite', () => ({}));
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));

import { parsePesoInput } from './usePesoController';

describe('parsePesoInput', () => {
  it('parses integer', () => expect(parsePesoInput('80')).toBe(80));
  it('parses decimal with dot', () => expect(parsePesoInput('80.5')).toBe(80.5));
  it('parses decimal with comma', () => expect(parsePesoInput('80,5')).toBe(80.5));
  it('returns NaN for empty', () => expect(parsePesoInput('')).toBeNaN());
});
