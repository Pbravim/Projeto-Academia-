import { parsePesoInput } from './usePesoController';

describe('parsePesoInput', () => {
  it('parses integer', () => expect(parsePesoInput('80')).toBe(80));
  it('parses decimal with dot', () => expect(parsePesoInput('80.5')).toBe(80.5));
  it('parses decimal with comma', () => expect(parsePesoInput('80,5')).toBe(80.5));
  it('returns NaN for empty', () => expect(parsePesoInput('')).toBeNaN());
});
