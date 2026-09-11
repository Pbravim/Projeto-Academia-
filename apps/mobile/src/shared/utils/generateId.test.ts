import { describe, expect, it } from 'vitest';

import { generateId } from './generateId';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateId', () => {
  it('returns a valid UUIDv7', () => {
    expect(generateId()).toMatch(UUID_V7);
  });

  it('is unique across many calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
    expect(ids.size).toBe(1000);
  });

  it('is time-ordered (monotonic): later ids sort after earlier ones', () => {
    const a = generateId();
    const b = generateId();
    expect(a < b).toBe(true);
    expect([b, a].sort()).toEqual([a, b]);
  });
});
