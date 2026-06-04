/** Canonical sync timestamp: ISO-8601 UTC, sorts lexicographically === chronologically. */
export function nowIso(): string {
  return new Date().toISOString();
}
