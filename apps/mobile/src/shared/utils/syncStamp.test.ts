import { describe, expect, it } from 'vitest';
import { nowIso } from './syncStamp';

describe('nowIso', () => {
  it('returns an ISO-8601 UTC string ending in Z', () => {
    const s = nowIso();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(s).toISOString()).toBe(s);
  });
});
